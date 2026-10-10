import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FREE_MODELS,
  MODELS_CATALOG,
  DEFAULT_DISCORD_CLIENT_ID,
  DEFAULT_DISCORD_CLIENT_SECRET,
  generateDiscordUserApiKey,
  generateCustomDiscordApiKey,
  verifyDiscordUserApiKey,
  initKeyPoolIfNeeded,
  getPublicPoolList,
  getRawPoolList,
  addGatesToPool,
  toggleGateInPool,
  removeGateFromPool,
  selectGatesForRequest,
  checkAdminSecret,
  isAllowedAdminDiscordId,
  extractVerifiedDiscordUserId,
} from './api/_utils.js';
import { probeSingleModel } from './api/model-status.js';
import { testGateHealth } from './api/admin/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually if exists
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
          if (val) process.env[key] = val;
        }
      }
    });
  }
}
loadEnvFile();

// Persistent Key Pool file for local / VPS runtime
const poolFilePath = path.join(__dirname, 'key-pool.json');
function loadSavedKeyPool() {
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
  initKeyPoolIfNeeded();
}

function saveKeyPoolToDisk() {
  try {
    const rawPool = getRawPoolList();
    fs.writeFileSync(poolFilePath, JSON.stringify(rawPool, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not save key-pool.json:', err.message);
  }
}

loadSavedKeyPool();

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

async function checkNodeAuth(req) {
  const customKey = (process.env.CUSTOM_ACCESS_KEY || '').trim();
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const customHeader = (req.headers['x-custom-key'] || '').trim();
  const candidate = token || customHeader;

  if (candidate && (candidate.startsWith('sk-dc-') || candidate.startsWith('sk-nx-'))) {
    const valid = await verifyDiscordUserApiKey(candidate);
    if (valid) return true;
  }

  if (customKey && candidate === customKey) {
    return true;
  }

  return false;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
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
    const pool = getPublicPoolList();
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'SLK Gateway',
      upstream: UPSTREAM_BASE_URL,
      total_models: FREE_MODELS.length,
      free_models: FREE_MODELS,
      active_gates: pool.filter(g => g.enabled).length,
      total_gates: pool.length,
      discord_auth_required: true,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Discord OAuth2 Config Endpoint
  if (pathname === '/api/auth/config') {
    const clientId = (process.env.DISCORD_CLIENT_ID || DEFAULT_DISCORD_CLIENT_ID).trim();
    const hasSecret = Boolean((process.env.DISCORD_CLIENT_SECRET || DEFAULT_DISCORD_CLIENT_SECRET).trim());
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({
      configured: Boolean(clientId),
      clientId,
      hasSecret,
    }));
    return;
  }

  // Admin Key Pool Management Endpoint (/api/admin/pool)
  if (pathname === '/api/admin/pool') {
    const authHeader = req.headers['authorization'] || '';
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    const verifiedDiscordId = await extractVerifiedDiscordUserId(bearerToken);
    const headerSecret = req.headers['x-admin-secret'] || parsedUrl.searchParams.get('secret') || '';

    const authorized =
      isAllowedAdminDiscordId(verifiedDiscordId) ||
      (headerSecret && checkAdminSecret(headerSecret, verifiedDiscordId)) ||
      (await checkNodeAuth(req));

    if (!authorized) {
      res.writeHead(401, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({ success: false, error: 'Unauthorized: Chỉ Admin Discord ID 1207080545159487498 mới có quyền truy cập.' }));
      return;
    }

    const buildPoolPayload = (extra = {}) => {
      const rawPool = getRawPoolList();
      const list = getPublicPoolList();
      return {
        success: true,
        pool: list,
        gates: list,
        total: list.length,
        active: list.filter(g => g.enabled !== false).length,
        envExport: rawPool.map(g => g.apiKey).join(','),
        ...extra,
      };
    };

    if (req.method === 'GET') {
      const discordUserId = verifiedDiscordId || parsedUrl.searchParams.get('discordUserId') || '';
      if (!checkAdminSecret(headerSecret, discordUserId)) {
        res.writeHead(403, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ success: false, error: 'Forbidden: Chỉ Admin Discord ID 1207080545159487498 mới được xem Admin Pool.' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify(buildPoolPayload()));
      return;
    }

    if (req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const secret = body.adminSecret || headerSecret;
        const discordUserId = verifiedDiscordId || body.discordUserId || '';

        if (!checkAdminSecret(secret, discordUserId)) {
          res.writeHead(403, { 'Content-Type': 'application/json', ...CORS_HEADERS });
          res.end(JSON.stringify({
            success: false,
            error: 'Forbidden: Chỉ tài khoản Discord ID 1207080545159487498 mới có quyền quản trị Admin Pool!',
          }));
          return;
        }

        const action = body.action || 'verify';
        const targetGateId = body.gateId || body.id;

        if (action === 'verify') {
          res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
          res.end(JSON.stringify(buildPoolPayload({ isAdmin: true })));
          return;
        }

        if (action === 'add') {
          const added = addGatesToPool(body.keys || '', (body.name || 'Gate').trim(), (body.baseUrl || '').trim());
          await Promise.allSettled(added.map(g => testGateHealth(g)));
          saveKeyPoolToDisk();

          res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
          res.end(JSON.stringify(buildPoolPayload({ addedCount: added.length })));
          return;
        }

        if (action === 'toggle') {
          toggleGateInPool(targetGateId, body.enabled);
          saveKeyPoolToDisk();
          res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
          res.end(JSON.stringify(buildPoolPayload()));
          return;
        }

        if (action === 'delete') {
          const removed = removeGateFromPool(targetGateId);
          if (removed === false) {
            res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
            res.end(JSON.stringify({ success: false, error: 'Phải giữ lại ít nhất 1 Gate hoạt động trong Pool.' }));
            return;
          }
          saveKeyPoolToDisk();
          res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
          res.end(JSON.stringify(buildPoolPayload()));
          return;
        }

        if (action === 'test') {
          const rawPool = getRawPoolList();
          const toTest = targetGateId ? rawPool.filter(g => g.id === targetGateId) : rawPool;
          const results = await Promise.all(toTest.map(g => testGateHealth(g)));
          saveKeyPoolToDisk();

          res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
          res.end(JSON.stringify(buildPoolPayload({ results, testResult: results[0] || null })));
          return;
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ success: false, error: err.message }));
        return;
      }
    }
  }

  // Real-time Model Status & Probe Endpoint
  if (pathname === '/api/model-status') {
    const authorized = await checkNodeAuth(req);
    if (!authorized) {
      res.writeHead(401, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      return;
    }

    const targetModel = parsedUrl.searchParams.get('model');
    if (targetModel) {
      const gates = selectGatesForRequest();
      const activeGate = gates[0] || { baseUrl: UPSTREAM_BASE_URL, apiKey: UPSTREAM_API_KEY };
      const probe = await probeSingleModel(targetModel, activeGate.baseUrl, activeGate.apiKey);
      res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({ success: true, probe, timestamp: new Date().toISOString() }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({
      success: true,
      models: MODELS_CATALOG,
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // Create New API Key in Dashboard
  if (pathname === '/api/keys' && req.method === 'POST') {
    const authorized = await checkNodeAuth(req);
    if (!authorized) {
      res.writeHead(401, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({ success: false, error: 'Unauthorized: Vui lòng đăng nhập Discord trước.' }));
      return;
    }

    try {
      const body = await readJsonBody(req);
      const discordUserId = String(body.discordUserId || '').trim();
      const keyName = String(body.name || 'API Key mới').trim();

      if (!discordUserId) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ success: false, error: 'Thiếu Discord User ID.' }));
        return;
      }

      const newKey = await generateCustomDiscordApiKey(discordUserId);
      res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({
        success: true,
        key: {
          id: `key_${Date.now()}`,
          name: keyName,
          token: newKey,
          createdAt: new Date().toISOString(),
        }
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Discord Verify Endpoint
  if (pathname === '/api/auth/verify' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      let accessToken = body.access_token || '';
      const code = body.code || '';
      const redirectUri = body.redirect_uri || '';

      if (!accessToken && code) {
        const clientId = (process.env.DISCORD_CLIENT_ID || body.client_id || DEFAULT_DISCORD_CLIENT_ID).trim();
        const clientSecret = (process.env.DISCORD_CLIENT_SECRET || DEFAULT_DISCORD_CLIENT_SECRET).trim();

        const tokenParams = new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        });

        const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenParams.toString(),
        });
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.access_token) {
          res.writeHead(401, { 'Content-Type': 'application/json', ...CORS_HEADERS });
          res.end(JSON.stringify({
            success: false,
            error: tokenData.error_description || 'Không thể đổi mã code với Discord. Hãy kiểm tra Redirect URI trong Discord Developer Portal.'
          }));
          return;
        }
        accessToken = tokenData.access_token;
      }

      if (!accessToken) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ success: false, error: 'Thiếu access_token từ Discord.' }));
        return;
      }

      const userRes = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userRes.ok) {
        res.writeHead(401, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ success: false, error: 'Token Discord không hợp lệ hoặc đã hết hạn.' }));
        return;
      }

      const discordUser = await userRes.json();
      const apiKey = await generateDiscordUserApiKey(discordUser.id);
      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(discordUser.id) >> 22n) % 6}.png`;

      res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({
        success: true,
        user: {
          id: discordUser.id,
          username: discordUser.username,
          global_name: discordUser.global_name || discordUser.username,
          avatar_url: avatarUrl,
        },
        apiKey,
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API Proxy matching: /v1/* or /api/v1/*
  const isApiRoute = pathname.startsWith('/v1/') || pathname.startsWith('/api/v1/');

  if (isApiRoute) {
    const authorized = await checkNodeAuth(req);
    if (!authorized) {
      res.writeHead(401, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({
        error: {
          message: 'Unauthorized: Bạn cần đăng nhập Discord tại Dashboard để tạo API Key sử dụng dịch vụ này.',
          type: 'authentication_error',
          code: 'discord_login_required'
        }
      }));
      return;
    }

    let subpath = pathname.replace(/^\/api\/v1\/?/, '').replace(/^\/v1\/?/, '');

    // Nếu gọi /v1/models -> chỉ trả về danh sách các model FREE kèm thông tin Status
    if (subpath === 'models' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({
        object: 'list',
        data: MODELS_CATALOG,
        free_only: true,
        success: true
      }));
      return;
    }

    // Read body if POST/PUT & ép buộc chỉ dùng model FREE
    let bodyPayload = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBuffer = Buffer.concat(chunks);
      const rawText = rawBuffer.toString('utf8');

      if (rawText && subpath.includes('chat/completions')) {
        try {
          const parsed = JSON.parse(rawText);
          if (!parsed.model || !FREE_MODELS.includes(parsed.model)) {
            parsed.model = 'DeepSeek-V4-Flash';
          }
          bodyPayload = JSON.stringify(parsed);
        } catch {
          bodyPayload = rawBuffer;
        }
      } else {
        bodyPayload = rawBuffer;
      }
    }

    // Lấy danh sách Gates theo Round-Robin và tự động Failover nếu Gate lỗi
    const candidateGates = selectGatesForRequest();
    let lastError = null;
    let lastUpstreamRes = null;

    for (const gate of candidateGates) {
      const startTime = Date.now();
      const targetUrl = `${gate.baseUrl}/${subpath}${parsedUrl.search}`;

      try {
        gate.requests += 1;
        gate.lastUsedAt = new Date().toISOString();

        const upstreamRes = await fetch(targetUrl, {
          method: req.method,
          headers: {
            'Authorization': `Bearer ${gate.apiKey}`,
            'Content-Type': req.headers['content-type'] || 'application/json',
            'Accept': req.headers['accept'] || 'application/json',
          },
          body: bodyPayload,
        });

        gate.lastLatencyMs = Date.now() - startTime;

        if ([401, 402, 403, 429, 500, 502, 503, 504].includes(upstreamRes.status) && candidateGates.length > 1) {
          gate.errors += 1;
          gate.status = upstreamRes.status === 429 ? 'rate_limited' : 'error';
          lastUpstreamRes = upstreamRes;
          continue;
        }

        gate.status = 'online';
        const responseHeaders = { ...CORS_HEADERS, 'X-SLK-Gate': gate.name };
        upstreamRes.headers.forEach((val, key) => {
          if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
            responseHeaders[key] = val;
          }
        });

        res.writeHead(upstreamRes.status, responseHeaders);

        if (upstreamRes.body) {
          const reader = upstreamRes.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        }
        res.end();
        return;
      } catch (err) {
        gate.errors += 1;
        gate.status = 'error';
        lastError = err;
      }
    }

    if (lastUpstreamRes) {
      const responseHeaders = { ...CORS_HEADERS };
      lastUpstreamRes.headers.forEach((val, key) => {
        if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
          responseHeaders[key] = val;
        }
      });
      res.writeHead(lastUpstreamRes.status, responseHeaders);
      if (lastUpstreamRes.body) {
        const reader = lastUpstreamRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
      return;
    }

    res.writeHead(502, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({
      error: {
        message: `Proxy Error: Tất cả các Gate trong Pool đều không phản hồi: ${lastError?.message || 'Unknown error'}`,
        type: 'upstream_error',
        code: 'gateway_error'
      }
    }));
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

server.listen(PORT, () => {
  const pool = getPublicPoolList();
  console.log(`====================================================`);
  console.log(`🚀 SLK Gateway (Free Models + Multi-Gate Pool) at: http://localhost:${PORT}`);
  console.log(`🌐 Base API URL: http://localhost:${PORT}/v1`);
  console.log(`🔑 Active Upstream Gates in Pool: ${pool.length}`);
  console.log(`🆓 Free Models (${FREE_MODELS.length}): ${FREE_MODELS.join(', ')}`);
  console.log(`====================================================`);
});
