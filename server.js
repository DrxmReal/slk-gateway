import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually if exists without needing dotenv package
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const PORT = process.env.PORT || 3000;
const UPSTREAM_BASE_URL = (process.env.UPSTREAM_BASE_URL || 'https://api.hcnsec.cn/v1').replace(/\/+$/, '');
const UPSTREAM_API_KEY = (process.env.UPSTREAM_API_KEY || 'sk-y0tm0bCPJLL3STHqIDxPGkh6Fk8QWKab7piSmbE5KRiS4MGl').trim();
const CUSTOM_ACCESS_KEY = (process.env.CUSTOM_ACCESS_KEY || '').trim();

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

function checkAuth(req) {
  if (!CUSTOM_ACCESS_KEY) return true;
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const customHeader = (req.headers['x-custom-key'] || '').trim();
  return token === CUSTOM_ACCESS_KEY || customHeader === CUSTOM_ACCESS_KEY;
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
      service: 'AI API Gateway (Local)',
      upstream: UPSTREAM_BASE_URL,
      auth_required: Boolean(CUSTOM_ACCESS_KEY),
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // API Proxy matching: /v1/* or /api/v1/*
  const isApiRoute = pathname.startsWith('/v1/') || pathname.startsWith('/api/v1/');

  if (isApiRoute) {
    if (!checkAuth(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({
        error: {
          message: 'Unauthorized: Invalid or missing API key. Provide the correct Bearer token.',
          type: 'authentication_error',
          code: 'invalid_api_key'
        }
      }));
      return;
    }

    // Extract subpath
    let subpath = pathname.replace(/^\/api\/v1\/?/, '').replace(/^\/v1\/?/, '');
    const targetUrl = `${UPSTREAM_BASE_URL}/${subpath}${parsedUrl.search}`;

    // Read body if POST/PUT
    let bodyBuffer = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      bodyBuffer = Buffer.concat(chunks);
    }

    try {
      const upstreamRes = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Authorization': `Bearer ${UPSTREAM_API_KEY}`,
          'Content-Type': req.headers['content-type'] || 'application/json',
          'Accept': req.headers['accept'] || 'application/json',
        },
        body: bodyBuffer,
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
  console.log(`🚀 AI API Gateway running at: http://localhost:${PORT}`);
  console.log(`🌐 Base API URL: http://localhost:${PORT}/v1`);
  console.log(`🔗 Upstream URL: ${UPSTREAM_BASE_URL}`);
  console.log(`🔑 Auth Protection: ${CUSTOM_ACCESS_KEY ? 'Enabled' : 'Disabled (Public)'}`);
  console.log(`====================================================`);
});
