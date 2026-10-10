import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FREE_MODELS,
  FREE_MODELS_METADATA,
  DEFAULT_DISCORD_CLIENT_ID,
  DEFAULT_DISCORD_CLIENT_SECRET,
  generateDiscordUserApiKey,
  generateCustomDiscordApiKey,
  verifyDiscordUserApiKey,
} from './api/_utils.js';

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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Custom-Key, Accept, User-Agent',
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
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Health check
  if (pathname === '/health' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'SLK Gateway',
      upstream: UPSTREAM_BASE_URL,
      free_models: FREE_MODELS,
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

    // Extract subpath
    let subpath = pathname.replace(/^\/api\/v1\/?/, '').replace(/^\/v1\/?/, '');

    // Nếu gọi /v1/models -> chỉ trả về danh sách các model FREE
    if (subpath === 'models' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({
        object: 'list',
        data: FREE_MODELS_METADATA,
        free_only: true,
        success: true
      }));
      return;
    }

    const targetUrl = `${UPSTREAM_BASE_URL}/${subpath}${parsedUrl.search}`;

    // Read body if POST/PUT
    let bodyPayload = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBuffer = Buffer.concat(chunks);
      const rawText = rawBuffer.toString('utf8');

      // Kiểm tra và ép buộc sử dụng model FREE nếu gọi chat/completions
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

    try {
      const upstreamRes = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Authorization': `Bearer ${UPSTREAM_API_KEY}`,
          'Content-Type': req.headers['content-type'] || 'application/json',
          'Accept': req.headers['accept'] || 'application/json',
        },
        body: bodyPayload,
      });

      // Prepare response headers
      const responseHeaders = { ...CORS_HEADERS };
      upstreamRes.headers.forEach((val, key) => {
        if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
          responseHeaders[key] = val;
        }
      });

      res.writeHead(upstreamRes.status, responseHeaders);

      // Stream body chunks to client
      if (upstreamRes.body) {
        const reader = upstreamRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch (err) {
      console.error('Proxy request error:', err);
      res.writeHead(502, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({
        error: {
          message: `Proxy Error: ${err.message}`,
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

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 AI API Gateway (Discord Auth + Free Models) at: http://localhost:${PORT}`);
  console.log(`🌐 Base API URL: http://localhost:${PORT}/v1`);
  console.log(`🆓 Free Models: ${FREE_MODELS.join(', ')}`);
  console.log(`🔒 Discord Client ID: ${process.env.DISCORD_CLIENT_ID || DEFAULT_DISCORD_CLIENT_ID}`);
  console.log(`====================================================`);
});
