import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FREE_MODELS,
  MODELS_CATALOG,
  initKeyPoolIfNeeded,
  getRawPoolList,
  proxyRequest,
  toHeaderSafeValue,
} from './api/_utils.js';
import { dbLoadGatePoolFromSupabase } from './api/_supabase.js';

// Các handler dùng CHUNG với Vercel Edge Functions (không còn viết lại logic)
import healthHandler from './api/health.js';
import authConfigHandler from './api/auth/config.js';
import authVerifyHandler from './api/auth/verify.js';
import keysHandler from './api/keys.js';
import walletHandler from './api/wallet.js';
import modelStatusHandler from './api/model-status.js';
import adminPoolHandler from './api/admin/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually if exists (KHÔNG ghi đè biến môi trường đã có sẵn)
const envPath = path.join(__dirname, '.env');
function loadEnvFile() {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (val && !process.env[key]) process.env[key] = val;
        }
      }
    });
  }
}
loadEnvFile();

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
});
process.on('exit', (code) => {
  console.log('🛑 Server process exiting with code:', code);
});

const PORT = process.env.PORT || 3000;
const UPSTREAM_BASE_URL = (process.env.UPSTREAM_BASE_URL || 'https://api.hcnsec.cn/v1').replace(/\/+$/, '');
const UPSTREAM_API_KEY = (process.env.UPSTREAM_API_KEY || 'sk-y0tm0bCPJLL3STHqIDxPGkh6Fk8QWKab7piSmbE5KRiS4MGl').trim();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Custom-Key, X-Admin-Secret, Accept, User-Agent',
  'Access-Control-Max-Age': '86400',
};

// Persistent Key Pool file cho runtime local / VPS
const poolFilePath = path.join(__dirname, 'key-pool.json');

function saveKeyPoolToDisk() {
  try {
    const rawPool = getRawPoolList();
    fs.writeFileSync(poolFilePath, JSON.stringify(rawPool, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not save key-pool.json:', err.message);
  }
}

// Thứ tự ưu tiên: key-pool.json (local) -> Supabase -> biến môi trường
async function initializeKeyPool() {
  try {
    if (fs.existsSync(poolFilePath)) {
      const raw = JSON.parse(fs.readFileSync(poolFilePath, 'utf8'));
      if (Array.isArray(raw) && raw.length > 0) {
        initKeyPoolIfNeeded(raw);
        return;
      }
    }
  } catch (err) {
    console.warn('Could not load key-pool.json:', err.message);
  }

  try {
    const sbGates = await dbLoadGatePoolFromSupabase();
    if (sbGates && sbGates.length > 0) {
      initKeyPoolIfNeeded(sbGates);
      saveKeyPoolToDisk();
      console.log('☁️  Đã nạp Gate Pool từ Supabase.');
      return;
    }
  } catch (err) {
    console.warn('Could not load gate pool from Supabase:', err.message);
  }

  initKeyPoolIfNeeded();
}

// ---------- Chuyển đổi Node <-> Web Request/Response để dùng chung handler ----------
async function buildWebRequest(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined || value === null) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
  }

  const init = { method: req.method || 'GET', headers };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const bodyBuffer = Buffer.concat(chunks);
    if (bodyBuffer.length > 0) {
      init.body = bodyBuffer;
    }
  }

  return new Request(`http://${req.headers.host || 'localhost'}${req.url}`, init);
}

async function sendWebResponse(res, webResponse) {
  const headers = {};
  webResponse.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    // Bỏ qua các header hop-by-hop hoặc không còn đúng sau khi Node tự encode lại body:
    // - undici đã GIẢI NÉN body (gzip/br) nên phải bỏ content-encoding
    // - content-length/transfer-encoding do Node tự tính lại
    if (!['transfer-encoding', 'connection', 'keep-alive', 'content-encoding', 'content-length'].includes(lowerKey)) {
      headers[key] = toHeaderSafeValue(value);
    }
  });

  res.writeHead(webResponse.status, headers);

  if (webResponse.body) {
    const reader = webResponse.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) res.write(Buffer.from(value));
      }
    } catch {
      // Client ngắt kết nối giữa chừng -> bỏ qua
      try { reader.cancel(); } catch {}
    }
  }
  res.end();
}

async function runHandler(handler, req, res, { persistPool = false } = {}) {
  try {
    const webRequest = await buildWebRequest(req);
    const webResponse = await handler(webRequest);
    if (persistPool) saveKeyPoolToDisk();
    await sendWebResponse(res, webResponse);
  } catch (err) {
    console.error(`Handler error (${req.url}):`, err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    }
    res.end(JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }));
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Health check
  if (pathname === '/health' || pathname === '/api/health') {
    await runHandler(healthHandler, req, res);
    return;
  }

  // Discord OAuth2 Config
  if (pathname === '/api/auth/config') {
    await runHandler(authConfigHandler, req, res);
    return;
  }

  // Discord Verify
  if (pathname === '/api/auth/verify') {
    await runHandler(authVerifyHandler, req, res);
    return;
  }

  // Ví tiền người dùng (VND)
  if (pathname === '/api/wallet') {
    await runHandler(walletHandler, req, res);
    return;
  }

  // User API Keys (GET/POST/DELETE)
  if (pathname === '/api/keys') {
    await runHandler(keysHandler, req, res);
    return;
  }

  // Admin Pool & Nạp tiền ví
  if (pathname === '/api/admin/pool') {
    await runHandler(adminPoolHandler, req, res, { persistPool: true });
    return;
  }

  // Real-time Model Status & Probe
  if (pathname === '/api/model-status') {
    await runHandler(modelStatusHandler, req, res);
    return;
  }

  // Proxy route kiểu Vercel: /api/proxy?path=...
  if (pathname === '/api/proxy') {
    const proxyPath = parsedUrl.searchParams.get('path') || '';
    try {
      const webRequest = await buildWebRequest(req);
      const webResponse = await proxyRequest(webRequest, proxyPath);
      await sendWebResponse(res, webResponse);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({ error: { message: err.message, type: 'proxy_error', code: 'gateway_error' } }));
    }
    return;
  }

  // API Proxy: /v1/* hoặc /api/v1/*
  const isApiRoute = pathname.startsWith('/v1/') || pathname.startsWith('/api/v1/');
  if (isApiRoute) {
    const subpath = pathname.replace(/^\/api\/v1\/?/, '').replace(/^\/v1\/?/, '');
    try {
      const webRequest = await buildWebRequest(req);
      const webResponse = await proxyRequest(webRequest, subpath);
      await sendWebResponse(res, webResponse);
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({
        error: {
          message: `Proxy Error: ${err.message || 'Unknown error'}`,
          type: 'upstream_error',
          code: 'gateway_error'
        }
      }));
    }
    return;
  }

  // Serve static files from public directory
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, 'public', 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType, ...CORS_HEADERS });
      res.end(content);
    }
  });
});

await initializeKeyPool();

server.listen(PORT, () => {
  const pool = getRawPoolList();
  console.log(`====================================================`);
  console.log(`🚀 SLK Gateway (VND Wallet + Multi-Gate Pool) at: http://localhost:${PORT}`);
  console.log(`🌐 Base API URL: http://localhost:${PORT}/v1`);
  console.log(`🔑 Active Upstream Gates in Pool: ${pool.length}`);
  console.log(`💳 Models (${FREE_MODELS.length}): ${FREE_MODELS.join(', ')}`);
  console.log(`🆓 Số dư tặng mỗi user mới: 100.000 ₫ (trừ phí cố định theo mỗi request)`);
  console.log(`====================================================`);
});

// Giữ event loop luôn hoạt động kể cả khi chạy background daemon
if (process.stdin.isTTY === false) {
  try { process.stdin.resume(); } catch {}
}
setInterval(() => {}, 60000);

