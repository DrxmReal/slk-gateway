export const DEFAULT_UPSTREAM_URL = 'https://api.hcnsec.cn/v1';
export const DEFAULT_UPSTREAM_KEY = 'sk-y0tm0bCPJLL3STHqIDxPGkh6Fk8QWKab7piSmbE5KRiS4MGl';

export const DEFAULT_DISCORD_CLIENT_ID = '1558375997416677426';
export const DEFAULT_DISCORD_CLIENT_SECRET = 'KYXTuhr666qbvi8OVKU-qyrZ-ZMpLbx0';

// Mật khẩu Admin mặc định (có thể đổi qua biến môi trường ADMIN_SECRET trên Vercel)
export const DEFAULT_ADMIN_SECRET = 'slk-admin';

// Danh sách các model 100% FREE (0 ₫) được phép sử dụng trên SLK Gateway
export const FREE_MODELS = [
  'auto',
  'DeepSeek-V4-Flash',
  'glm-5.3-flash',
  'kimi-k3',
  'longcat-2.5',
  'MiMo-V2.6-Flash',
  'sensenova-6.8-flash-lite',
];

export const ALL_MODELS = FREE_MODELS;

export const MODELS_CATALOG = [
  {
    id: 'auto',
    object: 'model',
    created: 1626777600,
    owned_by: 'TrustedRouter',
    provider: 'TrustedRouter',
    provider_code: 'router',
    free: true,
    price_type: 'free',
    price_label: 'Miễn phí (0 ₫)',
    price_input: '0 ₫ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', 'vision', 'free', '1m'],
    description: 'Định tuyến thông minh tự động chọn mô hình Free có chất lượng tốt nhất, tốc độ nhanh nhất và ổn định nhất.',
    supported_endpoint_types: ['openai', 'image-generation', 'anthropic', 'gemini'],
    status: {
      uptime: 96.35,
      latency: '29.33s',
      tps: '88.8t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1]
    }
  },
  {
    id: 'DeepSeek-V4-Flash',
    object: 'model',
    created: 1626777600,
    owned_by: 'DeepSeek',
    provider: 'DeepSeek',
    provider_code: 'deepseek',
    free: true,
    price_type: 'free',
    price_label: 'Miễn phí (0 ₫)',
    price_input: '0 ₫ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', '1m', 'free'],
    description: 'DeepSeek-V4-Flash dựa trên kiến trúc MoE (284B tham số, kích hoạt 13B), hỗ trợ ngữ cảnh lên tới 1M token (Miễn phí 100%).',
    supported_endpoint_types: ['openai', 'anthropic'],
    status: {
      uptime: 98.87,
      latency: '46.66s',
      tps: '28.5t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1]
    }
  },
  {
    id: 'glm-5.3-flash',
    object: 'model',
    created: 1626777600,
    owned_by: 'Zhipu GLM',
    provider: 'Zhipu GLM',
    provider_code: 'zhipu',
    free: true,
    price_type: 'free',
    price_label: 'Miễn phí (0 ₫)',
    price_input: '0 ₫ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', '1m', 'free'],
    description: 'GLM-5.3-Flash (320B-A10B MoE) hỗ trợ đa phương thức, ngữ cảnh 1M token tốc độ cao (Miễn phí 100%).',
    supported_endpoint_types: ['openai', 'anthropic'],
    status: {
      uptime: 89.25,
      latency: '64.67s',
      tps: '35.6t/s',
      state: 'online',
      bars: [1,1,1,2,1,1,1,1,1,1,0,2,1,1,1,0,1,1,1,2,1,1,1,1]
    }
  },
  {
    id: 'kimi-k3',
    object: 'model',
    created: 1626777600,
    owned_by: 'Moonshot',
    provider: 'Moonshot',
    provider_code: 'moonshot',
    free: true,
    price_type: 'free',
    price_label: 'Miễn phí (0 ₫)',
    price_input: '0 ₫ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', 'vision', 'free'],
    description: 'Kimi K3 của Moonshot AI là mô hình đa phương thức 2.8T tham số sử dụng kiến trúc chú ý tuyến tính KDA (Miễn phí 100%).',
    supported_endpoint_types: ['openai', 'anthropic'],
    status: {
      uptime: 68.16,
      latency: '37.84s',
      tps: '47.1t/s',
      state: 'degraded',
      bars: [0,0,0,2,1,2,2,0,0,2,2,1,1,1,0,0,1,2,1,1,1,1,1,1]
    }
  },
  {
    id: 'longcat-2.5',
    object: 'model',
    created: 1626777600,
    owned_by: 'LongCat',
    provider: 'LongCat',
    provider_code: 'longcat',
    free: true,
    price_type: 'free',
    price_label: 'Miễn phí (0 ₫)',
    price_input: '0 ₫ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', 'free'],
    description: 'LongCat 2.5 Preview của Meituan tiếp tục kiến trúc MoE 1.6T tham số, tốc độ cao và hoàn toàn miễn phí (0 ₫ / yêu cầu).',
    supported_endpoint_types: ['openai', 'anthropic'],
    status: {
      uptime: 99.88,
      latency: '38.43s',
      tps: '71.2t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    }
  },
  {
    id: 'MiMo-V2.6-Flash',
    object: 'model',
    created: 1626777600,
    owned_by: 'Xiaomi MiMo',
    provider: 'Xiaomi MiMo',
    provider_code: 'mimo',
    free: true,
    price_type: 'free',
    price_label: 'Miễn phí (0 ₫)',
    price_input: '0 ₫ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', 'open', 'free'],
    description: 'MiMo V2.6 Flash của Xiaomi là mô hình suy luận đa phương thức mã nguồn mở MoE 309B tham số (0 ₫ / yêu cầu).',
    supported_endpoint_types: ['openai'],
    status: {
      uptime: 79.72,
      latency: '98.75s',
      tps: '18.6t/s',
      state: 'degraded',
      bars: [1,2,2,1,0,1,1,2,1,1,1,0,0,1,2,2,1,1,1,1,0,1,1,1]
    }
  },
  {
    id: 'sensenova-6.8-flash-lite',
    object: 'model',
    created: 1626777600,
    owned_by: 'SenseNova',
    provider: 'SenseNova',
    provider_code: 'sensenova',
    free: true,
    price_type: 'free',
    price_label: 'Miễn phí (0 ₫)',
    price_input: '0 ₫ / yêu cầu',
    price_output: '',
    tags: ['Tools', 'free'],
    description: 'SenseNova 6.8 Flash Lite của SenseTime phản hồi cực nhanh (~3.3s), ổn định cao và hoàn toàn miễn phí (0 ₫ / yêu cầu).',
    supported_endpoint_types: ['openai'],
    status: {
      uptime: 97.80,
      latency: '3.38s',
      tps: '65.4t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1]
    }
  },
];

export const FREE_MODELS_METADATA = MODELS_CATALOG;

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Custom-Key, X-Admin-Secret, Accept, User-Agent',
  'Access-Control-Max-Age': '86400',
};

export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// ==========================================================
// MULTI-GATE UPSTREAM API KEY POOL & SMART LOAD BALANCER
// ==========================================================
let keyPoolInitialized = false;
let roundRobinCounter = 0;
const upstreamKeyPool = [];

export function maskApiKey(key = '') {
  const clean = String(key).trim();
  if (clean.length <= 12) return clean.slice(0, 4) + '****';
  return `${clean.slice(0, 8)}...${clean.slice(-4)}`;
}

export function initKeyPoolIfNeeded(initialItems = null) {
  if (Array.isArray(initialItems) && initialItems.length > 0) {
    upstreamKeyPool.length = 0;
    initialItems.forEach((item, idx) => {
      if (item && item.apiKey) {
        upstreamKeyPool.push({
          id: item.id || `gate_${idx + 1}`,
          name: item.name || `Gate #${idx + 1}`,
          baseUrl: (item.baseUrl || process.env.UPSTREAM_BASE_URL || DEFAULT_UPSTREAM_URL).replace(/\/+$/, ''),
          apiKey: String(item.apiKey).trim(),
          maskedKey: maskApiKey(item.apiKey),
          enabled: item.enabled !== false,
          status: item.status || 'online',
          requests: Number(item.requests || 0),
          errors: Number(item.errors || 0),
          lastLatencyMs: item.lastLatencyMs || null,
          lastUsedAt: item.lastUsedAt || null,
          addedAt: item.addedAt || new Date().toISOString(),
        });
      }
    });
    keyPoolInitialized = true;
    return upstreamKeyPool;
  }

  if (keyPoolInitialized && upstreamKeyPool.length > 0) {
    return upstreamKeyPool;
  }

  const defaultBase = (process.env.UPSTREAM_BASE_URL || DEFAULT_UPSTREAM_URL).replace(/\/+$/, '');
  const rawEnvKeys = [
    process.env.UPSTREAM_API_KEYS || '',
    process.env.UPSTREAM_API_KEY || '',
    DEFAULT_UPSTREAM_KEY,
  ].join(',');

  const uniqueKeys = Array.from(
    new Set(
      rawEnvKeys
        .split(/[\n,;]+/)
        .map(k => k.trim())
        .filter(Boolean)
    )
  );

  upstreamKeyPool.length = 0;
  uniqueKeys.forEach((k, idx) => {
    upstreamKeyPool.push({
      id: `gate_${idx + 1}`,
      name: idx === 0 ? 'Master Gate #1 (Mặc định)' : `Gate #${idx + 1}`,
      baseUrl: defaultBase,
      apiKey: k,
      maskedKey: maskApiKey(k),
      enabled: true,
      status: 'online',
      requests: 0,
      errors: 0,
      lastLatencyMs: null,
      lastUsedAt: null,
      addedAt: new Date().toISOString(),
    });
  });

  keyPoolInitialized = true;
  return upstreamKeyPool;
}

export function getPublicPoolList() {
  initKeyPoolIfNeeded();
  return upstreamKeyPool.map((g, idx) => ({
    id: g.id,
    name: g.name,
    baseUrl: g.baseUrl,
    maskedKey: g.maskedKey,
    enabled: g.enabled,
    isPrimary: idx === 0,
    status: g.status,
    requests: g.requests,
    errors: g.errors,
    failures: g.errors,
    lastLatencyMs: g.lastLatencyMs,
    lastUsedAt: g.lastUsedAt,
    addedAt: g.addedAt,
  }));
}

export function getRawPoolList() {
  initKeyPoolIfNeeded();
  return upstreamKeyPool;
}

export function addGatesToPool(rawKeysInput, customNamePrefix = 'Gate', customBaseUrl = '') {
  initKeyPoolIfNeeded();
  const baseUrl = (customBaseUrl || process.env.UPSTREAM_BASE_URL || DEFAULT_UPSTREAM_URL).replace(/\/+$/, '');
  const keys = Array.isArray(rawKeysInput)
    ? rawKeysInput
    : String(rawKeysInput || '')
        .split(/[\n,;]+/)
        .map(s => s.trim())
        .filter(Boolean);

  const added = [];
  for (const k of keys) {
    const existing = upstreamKeyPool.find(g => g.apiKey === k && g.baseUrl === baseUrl);
    if (existing) {
      existing.enabled = true;
      continue;
    }
    const nextNum = upstreamKeyPool.length + 1;
    const newGate = {
      id: `gate_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: keys.length === 1 && customNamePrefix && customNamePrefix !== 'Gate' ? customNamePrefix : `${customNamePrefix || 'Gate'} #${nextNum}`,
      baseUrl,
      apiKey: k,
      maskedKey: maskApiKey(k),
      enabled: true,
      status: 'online',
      requests: 0,
      errors: 0,
      lastLatencyMs: null,
      lastUsedAt: null,
      addedAt: new Date().toISOString(),
    };
    upstreamKeyPool.push(newGate);
    added.push(newGate);
  }
  return added;
}

export function toggleGateInPool(gateId, enabled) {
  initKeyPoolIfNeeded();
  const gate = upstreamKeyPool.find(g => g.id === gateId);
  if (!gate) return null;
  gate.enabled = typeof enabled === 'boolean' ? enabled : !gate.enabled;
  return gate;
}

export function removeGateFromPool(gateId) {
  initKeyPoolIfNeeded();
  if (upstreamKeyPool.length <= 1) {
    throw new Error('Không thể xóa Gate cuối cùng trong Pool (cần tối thiểu 1 Gate hoạt động).');
  }
  const idx = upstreamKeyPool.findIndex(g => g.id === gateId);
  if (idx === -1) return false;
  upstreamKeyPool.splice(idx, 1);
  return true;
}

// Chọn danh sách Gate theo thuật toán Round-Robin để tự động cân bằng tải & Failover
export function selectGatesForRequest() {
  initKeyPoolIfNeeded();
  const active = upstreamKeyPool.filter(g => g.enabled);
  const poolToUse = active.length > 0 ? active : upstreamKeyPool;

  const startIdx = roundRobinCounter % poolToUse.length;
  roundRobinCounter = (roundRobinCounter + 1) % 1000000;

  const ordered = [];
  for (let i = 0; i < poolToUse.length; i++) {
    ordered.push(poolToUse[(startIdx + i) % poolToUse.length]);
  }
  return ordered;
}

export function checkAdminSecret(candidateSecret = '', discordUserId = '') {
  const expectedSecret = (process.env.ADMIN_SECRET || DEFAULT_ADMIN_SECRET).trim();
  const masterKey = (process.env.UPSTREAM_API_KEY || DEFAULT_UPSTREAM_KEY).trim();
  const adminIds = (process.env.ADMIN_DISCORD_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (discordUserId && adminIds.includes(discordUserId)) {
    return true;
  }
  const cleanCandidate = String(candidateSecret || '').trim();
  if (!cleanCandidate) return false;
  return cleanCandidate === expectedSecret || cleanCandidate === masterKey;
}

async function sha256Hex(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Tạo API Key mặc định dựa trên Discord User ID (sk-dc-<uid>-<sig>)
export async function generateDiscordUserApiKey(discordUserId) {
  const secret = (process.env.UPSTREAM_API_KEY || DEFAULT_UPSTREAM_KEY).slice(0, 16);
  const hashHex = await sha256Hex(`${discordUserId}:${secret}`);
  return `sk-dc-${discordUserId}-${hashHex.slice(0, 24)}`;
}

// Tạo API Key mới có salt ngẫu nhiên trong Dashboard (sk-nx-<uid>-<salt>-<sig>)
export async function generateCustomDiscordApiKey(discordUserId, customSalt = '') {
  const secret = (process.env.UPSTREAM_API_KEY || DEFAULT_UPSTREAM_KEY).slice(0, 16);
  const salt = customSalt || Math.random().toString(36).substring(2, 10);
  const hashHex = await sha256Hex(`${discordUserId}:${salt}:${secret}`);
  return `sk-nx-${discordUserId}-${salt}-${hashHex.slice(0, 20)}`;
}

export async function verifyDiscordUserApiKey(token) {
  if (!token) return false;

  if (token.startsWith('sk-dc-')) {
    const parts = token.split('-');
    if (parts.length < 4) return false;
    const discordUserId = parts[2];
    const expectedKey = await generateDiscordUserApiKey(discordUserId);
    return token === expectedKey;
  }

  if (token.startsWith('sk-nx-')) {
    const parts = token.split('-');
    if (parts.length < 5) return false;
    const discordUserId = parts[2];
    const salt = parts[3];
    const expectedKey = await generateCustomDiscordApiKey(discordUserId, salt);
    return token === expectedKey;
  }

  return false;
}

export async function checkAuth(request) {
  const customKey = (process.env.CUSTOM_ACCESS_KEY || '').trim();
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const customHeader = (request.headers.get('x-custom-key') || '').trim();

  const candidate = token || customHeader;

  if (candidate && (candidate.startsWith('sk-dc-') || candidate.startsWith('sk-nx-'))) {
    const validDiscordKey = await verifyDiscordUserApiKey(candidate);
    if (validDiscordKey) return true;
  }

  if (customKey && candidate === customKey) {
    return true;
  }

  return false;
}

export function mergeModelsWithCatalog() {
  return MODELS_CATALOG;
}

export async function proxyRequest(request, targetPath) {
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }

  const isAuthorized = await checkAuth(request);
  if (!isAuthorized) {
    return new Response(
      JSON.stringify({
        error: {
          message: 'Unauthorized: API Key không hợp lệ hoặc bị thiếu. Vui lòng đăng nhập Discord tại Dashboard để tạo API Key.',
          type: 'authentication_error',
          code: 'invalid_api_key'
        }
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        }
      }
    );
  }

  const cleanPath = (targetPath || '').replace(/^\/+/, '');

  // Nếu gọi danh sách /v1/models -> Chỉ trả về các model FREE kèm thông tin Status
  if (cleanPath === 'models' && request.method === 'GET') {
    return new Response(
      JSON.stringify({
        object: 'list',
        data: MODELS_CATALOG,
        free_only: true,
        success: true
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        }
      }
    );
  }

  // Extract query string
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.searchParams);
  searchParams.delete('path');
  const queryStr = searchParams.toString();

  let bodyPayload = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const rawBody = await request.text();
      if (rawBody && cleanPath.includes('chat/completions')) {
        try {
          const parsed = JSON.parse(rawBody);
          // Chặn các model trả phí: chỉ cho phép các model trong FREE_MODELS
          if (!parsed.model || !FREE_MODELS.includes(parsed.model)) {
            parsed.model = 'DeepSeek-V4-Flash';
          }
          bodyPayload = JSON.stringify(parsed);
        } catch {
          bodyPayload = rawBody;
        }
      } else {
        bodyPayload = rawBody;
      }
    } catch {
      // Body empty or unreadable
    }
  }

  // Lấy danh sách Gates theo Round-Robin và tự động Failover nếu Gate gặp lỗi 401/402/429/5xx
  const candidateGates = selectGatesForRequest();
  let lastError = null;
  let lastUpstreamRes = null;

  for (const gate of candidateGates) {
    const startTime = Date.now();
    const targetUrl = `${gate.baseUrl}/${cleanPath}${queryStr ? '?' + queryStr : ''}`;

    const forwardHeaders = new Headers();
    forwardHeaders.set('Authorization', `Bearer ${gate.apiKey}`);
    forwardHeaders.set('Content-Type', request.headers.get('content-type') || 'application/json');
    forwardHeaders.set('Accept', request.headers.get('accept') || 'application/json');

    try {
      gate.requests += 1;
      gate.lastUsedAt = new Date().toISOString();

      const upstreamRes = await fetch(targetUrl, {
        method: request.method,
        headers: forwardHeaders,
        body: bodyPayload,
      });

      gate.lastLatencyMs = Date.now() - startTime;

      // Nếu Gate hiện tại bị hết hạn/rate-limit/lỗi server và còn Gate dự phòng -> tự động chuyển Gate tiếp theo
      if ([401, 402, 403, 429, 500, 502, 503, 504].includes(upstreamRes.status) && candidateGates.length > 1) {
        gate.errors += 1;
        gate.status = upstreamRes.status === 429 ? 'rate_limited' : 'error';
        lastUpstreamRes = upstreamRes;
        continue;
      }

      gate.status = 'online';
      const resHeaders = new Headers(upstreamRes.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        resHeaders.set(key, value);
      }
      resHeaders.set('X-SLK-Gate', gate.name);

      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        statusText: upstreamRes.statusText,
        headers: resHeaders,
      });
    } catch (err) {
      gate.errors += 1;
      gate.status = 'error';
      lastError = err;
    }
  }

  if (lastUpstreamRes) {
    const resHeaders = new Headers(lastUpstreamRes.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      resHeaders.set(key, value);
    }
    return new Response(lastUpstreamRes.body, {
      status: lastUpstreamRes.status,
      statusText: lastUpstreamRes.statusText,
      headers: resHeaders,
    });
  }

  return new Response(
    JSON.stringify({
      error: {
        message: `Proxy Error: Tất cả các Gate trong Pool đều không phản hồi: ${lastError?.message || 'Unknown error'}`,
        type: 'upstream_error',
        code: 'gateway_error'
      }
    }),
    {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      }
    }
  );
}
