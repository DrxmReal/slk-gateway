import { chargeUserForRequest, getRequestFeeVnd } from './_wallet.js';

export const DEFAULT_UPSTREAM_URL = 'https://api.hcnsec.cn/v1';
export const DEFAULT_UPSTREAM_KEY = 'sk-y0tm0bCPJLL3STHqIDxPGkh6Fk8QWKab7piSmbE5KRiS4MGl';

// Cấu hình OpenCode Zen Gate
export const OPENCODE_BASE_URL = (process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/v1').replace(/\/+$/, '');
export const OPENCODE_API_KEY = (process.env.OPENCODE_API_KEY || 'oc_sk_443b200450ba_9p00yqJGk3YTJiQ_9BVsGJVhS2cKp3f6').trim();

// Cấu hình UnoRouter Gate (Step 5 Preview & Free Tier)
export const UNOROUTER_BASE_URL = (process.env.UNOROUTER_BASE_URL || 'https://api.unorouter.com/v1').replace(/\/+$/, '');
export const UNOROUTER_API_KEY = (process.env.UNOROUTER_API_KEY || 'sk-CjeXySzJR6H61RnHxW4bSx8tWH2q3DgsML26SNyXd3HrMkiD').trim();

export const DEFAULT_DISCORD_CLIENT_ID = '1558375997416677426';
export const DEFAULT_DISCORD_CLIENT_SECRET = 'KYXTuhr666qbvi8OVKU-qyrZ-ZMpLbx0';

// Mật khẩu Admin mặc định & Discord User ID duy nhất có quyền Admin Pool
export const DEFAULT_ADMIN_SECRET = 'slk-admin';
export const OWNER_ADMIN_DISCORD_ID = '1207080545159487498';

// Danh sách model định tuyến qua UnoRouter
export const UNOROUTER_MODELS = [
  'step-5-preview:free',
  'k2-horizon:free',
  'nemotron-3-super-120b-a12b:free',
  'agnes-3.0-flash:free',
];

// Danh sách model ĐƯỢC PHÉP sử dụng trên Gateway
export const FREE_MODELS = [
  'step-5-preview:free',
  'k2-horizon:free',
  'nemotron-3-super-120b-a12b:free',
  'agnes-3.0-flash:free',
  'space-bunny-free',
  'auto',
  'glm-5.3',
  'longcat-2.5',
  'sensenova-6.8-flash-lite',
];

export const ALL_MODELS = FREE_MODELS;

// Model mặc định khi client không chỉ định (hoặc chỉ định model không hợp lệ)
export const DEFAULT_MODEL = 'step-5-preview:free';

export const MODELS_CATALOG = [
  {
    id: 'nemotron-3-super-120b-a12b:free',
    object: 'model',
    created: 1791651200,
    owned_by: 'NVIDIA',
    provider: 'NVIDIA',
    provider_code: 'nvidia',
    free: false,
    price_type: 'request',
    price_label: '1.000 ₫ / yêu cầu',
    price_input: '1.000 ₫ / yêu cầu',
    price_output: '',
    tags: ['120B', 'MoE', 'Reasoning', 'NVIDIA'],
    description: 'Nemotron 3 Super 120B: mô hình siêu khủng 120 tỷ tham số kiến trúc MoE do NVIDIA phát triển, chất lượng suy luận chuyên sâu đẳng cấp thế giới.',
    supported_endpoint_types: ['openai'],
    status: {
      uptime: 99.10,
      latency: '2.50s',
      tps: '78.5t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    }
  },
  {
    id: 'step-5-preview:free',
    object: 'model',
    created: 1791651000,
    owned_by: 'StepFun',
    provider: 'StepFun',
    provider_code: 'stepfun',
    free: false,
    price_type: 'request',
    price_label: '1.000 ₫ / yêu cầu',
    price_input: '1.000 ₫ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', 'StepFun', '1m'],
    description: 'Step 5 Preview: mô hình ngôn ngữ lớn thế hệ mới do StepFun phát triển, tối ưu suy luận logic đa bước và xử lý tiếng Việt xuất sắc.',
    supported_endpoint_types: ['openai'],
    status: {
      uptime: 98.20,
      latency: '3.10s',
      tps: '64.5t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    }
  },
  {
    id: 'k2-horizon:free',
    object: 'model',
    created: 1791651100,
    owned_by: 'K2 AI',
    provider: 'K2 AI',
    provider_code: 'k2',
    free: false,
    price_type: 'request',
    price_label: '500 ₫ / yêu cầu',
    price_input: '500 ₫ / yêu cầu',
    price_output: '',
    tags: ['Fast', 'Reasoning', 'K2'],
    description: 'K2 Horizon: mô hình suy luận tốc độ cao, khả năng lập luận sắc bén và tối ưu hóa thời gian xử lý cho các tác vụ thời gian thực.',
    supported_endpoint_types: ['openai'],
    status: {
      uptime: 99.40,
      latency: '1.80s',
      tps: '92.0t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    }
  },
  {
    id: 'agnes-3.0-flash:free',
    object: 'model',
    created: 1791651300,
    owned_by: 'Agnes AI',
    provider: 'Agnes AI',
    provider_code: 'agnes',
    free: false,
    price_type: 'request',
    price_label: '500 ₫ / yêu cầu',
    price_input: '500 ₫ / yêu cầu',
    price_output: '',
    tags: ['Fast', 'Tools', 'Flash'],
    description: 'Agnes 3.0 Flash: mô hình phản hồi siêu tốc độ, hỗ trợ phân tích dữ liệu, xử lý công việc và tác vụ nhanh chóng.',
    supported_endpoint_types: ['openai'],
    status: {
      uptime: 97.80,
      latency: '1.50s',
      tps: '105.0t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    }
  },
  {
    id: 'space-bunny-free',
    object: 'model',
    created: 1791649661,
    owned_by: 'Space AI',
    provider: 'Space AI',
    provider_code: 'space',
    free: false,
    price_type: 'request',
    price_label: '500 ₫ / yêu cầu',
    price_input: '500 ₫ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', 'Smart'],
    description: 'Space Bunny: mô hình suy luận đa năng, tốc độ phản hồi nhanh, giải quyết các bài toán logic và lập trình thông minh.',
    supported_endpoint_types: ['openai'],
    status: {
      uptime: 99.85,
      latency: '2.35s',
      tps: '88.2t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    }
  },
  {
    id: 'auto',
    object: 'model',
    created: 1626777600,
    owned_by: 'TrustedRouter',
    provider: 'TrustedRouter',
    provider_code: 'router',
    free: false,
    price_type: 'request',
    price_label: '1.000 ₫ / yêu cầu',
    price_input: '1.000 ₫ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', 'vision', '1m'],
    description: 'Tự động định tuyến thông minh: hệ thống tự chọn model free chất lượng tốt nhất, nhanh nhất và ổn định nhất tại thời điểm gọi.',
    supported_endpoint_types: ['openai', 'anthropic', 'gemini'],
    status: {
      uptime: 96.55,
      latency: '29.61s',
      tps: '90.4t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    }
  },
  {
    id: 'glm-5.3',
    object: 'model',
    created: 1626777600,
    owned_by: 'Zhipu GLM',
    provider: 'Zhipu GLM',
    provider_code: 'zhipu',
    free: false,
    price_type: 'request',
    price_label: '1.000 ₫ / yêu cầu',
    price_input: '1.000 ₫ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', '1m'],
    description: 'GLM-5.3 là mô hình ngôn ngữ lớn do Zhipu AI (智谱) phát hành chính thức ngày 14/08/2026, kế thừa nền tảng GLM và được cải thiện mạnh nhờ huấn luyện Scaling, nâng cao khả năng lập trình.',
    supported_endpoint_types: ['openai', 'anthropic'],
    status: {
      uptime: 97.46,
      latency: '70.78s',
      tps: '23.9t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1]
    }
  },
  {
    id: 'longcat-2.5',
    object: 'model',
    created: 1626777600,
    owned_by: 'LongCat',
    provider: 'LongCat',
    provider_code: 'longcat',
    free: false,
    price_type: 'request',
    price_label: '500 ₫ / yêu cầu',
    price_input: '500 ₫ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools'],
    description: 'LongCat-2.5-Preview là bản xem trước của dòng LongCat do Meituan (美团) phát hành ngày 25/09/2026, tiếp nối kiến trúc MoE hỗn hợp với tổng 1,6 nghìn tỷ tham số, tốc độ cao.',
    supported_endpoint_types: ['openai', 'anthropic'],
    status: {
      uptime: 99.78,
      latency: '45.70s',
      tps: '70.6t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    }
  },
  {
    id: 'sensenova-6.8-flash-lite',
    object: 'model',
    created: 1626777600,
    owned_by: 'SenseNova',
    provider: 'SenseNova',
    provider_code: 'sensenova',
    free: false,
    price_type: 'request',
    price_label: '500 ₫ / yêu cầu',
    price_input: '500 ₫ / yêu cầu',
    price_output: '',
    tags: ['Tools'],
    description: 'sensenova-6.8-flash-lite là mô hình đa phương thức nhẹ, phản hồi cực nhanh do SenseTime (商汤) phát hành ngày 11/08/2026, theo triết lý "AI đặc nhiệm: chỉ cần đưa ra mục tiêu".',
    supported_endpoint_types: ['openai'],
    status: {
      uptime: 99.92,
      latency: '17.90s',
      tps: '80.5t/s',
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

export function isAllowedAdminDiscordId(discordUserId = '') {
  const cleanId = String(discordUserId || '').trim();
  if (!cleanId) return false;
  const adminIds = [
    OWNER_ADMIN_DISCORD_ID,
    ...(process.env.ADMIN_DISCORD_IDS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  ];
  return adminIds.includes(cleanId);
}

export function checkAdminSecret(candidateSecret = '', discordUserId = '') {
  if (isAllowedAdminDiscordId(discordUserId)) {
    return true;
  }
  // Nếu có truyền discordUserId nhưng không phải ID Admin 1207080545159487498 thì từ chối ngay
  if (discordUserId && !isAllowedAdminDiscordId(discordUserId)) {
    return false;
  }
  const expectedSecret = (process.env.ADMIN_SECRET || DEFAULT_ADMIN_SECRET).trim();
  const masterKey = (process.env.UPSTREAM_API_KEY || DEFAULT_UPSTREAM_KEY).trim();
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

export async function extractVerifiedDiscordUserId(token) {
  if (!token) return '';
  const valid = await verifyDiscordUserApiKey(token);
  if (!valid) return '';
  const parts = token.split('-');
  return parts[2] || '';
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

// Header HTTP chỉ nhận ký tự ByteString (latin1) -> mã hóa ký tự ngoài latin1
// (VD: tên Gate "Master Gate #1 (Mặc định)" có chữ "ậ" sẽ làm fetch/undici throw lỗi)
export function toHeaderSafeValue(value) {
  return String(value ?? '').replace(/[^\x00-\xff]/g, ch => encodeURIComponent(ch));
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

  // Xác định Discord User ID từ API Key (nếu là key của user -> sẽ bị trừ tiền ví)
  const authHeaderValue = request.headers.get('authorization') || '';
  const bearerToken = authHeaderValue.replace(/^Bearer\s+/i, '').trim();
  const customKeyHeader = (request.headers.get('x-custom-key') || '').trim();
  const verifiedUid = await extractVerifiedDiscordUserId(bearerToken || customKeyHeader);

  const cleanPath = (targetPath || '').replace(/^\/+/, '');

  // Nếu gọi danh sách /v1/models -> Chỉ trả về các model được phép kèm thông tin Status (miễn phí)
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

  // Đọc & kiểm tra body: chỉ cho phép các model trong FREE_MODELS
  let bodyPayload = null;
  let requestModel = '';
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const rawBody = await request.text();
      if (rawBody) {
        if (cleanPath.includes('chat/completions')) {
          let parsed;
          try {
            parsed = JSON.parse(rawBody);
          } catch {
            return new Response(
              JSON.stringify({
                error: {
                  message: 'Body JSON không hợp lệ cho endpoint chat/completions.',
                  type: 'invalid_request_error',
                  code: 'invalid_json'
                }
              }),
              { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }

          requestModel = String(parsed.model || '').trim();
          if (!FREE_MODELS.includes(requestModel)) {
            return new Response(
              JSON.stringify({
                error: {
                  message: 'Model "' + (requestModel || '(không có)') + '" không được hỗ trợ trên Gateway này. Các model hợp lệ: ' + FREE_MODELS.join(', ') + '.',
                  type: 'invalid_request_error',
                  code: 'model_not_allowed',
                  allowed_models: FREE_MODELS
                }
              }),
              { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }
          bodyPayload = JSON.stringify(parsed);
        } else {
          bodyPayload = rawBody;
          try {
            const parsed = JSON.parse(rawBody);
            requestModel = String(parsed?.model || '').trim();
          } catch {
            requestModel = '';
          }
        }
      }
    } catch {
      // Body empty or unreadable
    }
  }

  // TRỪ PHÍ VÍ trước khi proxy (chỉ áp dụng cho API Key của user Discord)
  let chargeInfo = null;
  if (verifiedUid) {
    const charge = await chargeUserForRequest(verifiedUid, requestModel || DEFAULT_MODEL);
    if (!charge.success) {
      return new Response(
        JSON.stringify({
          error: {
            message: charge.error,
            type: 'billing_error',
            code: charge.code || 'billing_error',
            balance_vnd: charge.balanceVnd ?? null,
            required_vnd: charge.feeVnd ?? null
          }
        }),
        { status: 402, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    chargeInfo = charge;
  }

  // Lấy danh sách Gates theo Round-Robin; nếu gọi model chuyên biệt thì điều hướng tới Gate tương ứng
  const isSpaceBunny = requestModel === 'space-bunny-free';
  const isUnoRouter = UNOROUTER_MODELS.includes(requestModel);

  const candidateGates = isSpaceBunny
    ? [{
        id: 'gate_opencode_zen',
        name: 'OpenCode Zen Gate',
        baseUrl: OPENCODE_BASE_URL,
        apiKey: OPENCODE_API_KEY,
        enabled: true,
        requests: 0,
        errors: 0,
      }]
    : isUnoRouter
    ? [{
        id: 'gate_unorouter',
        name: 'UnoRouter Gate',
        baseUrl: UNOROUTER_BASE_URL,
        apiKey: UNOROUTER_API_KEY,
        enabled: true,
        requests: 0,
        errors: 0,
      }]
    : selectGatesForRequest();
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
      resHeaders.set('X-SLK-Gate', toHeaderSafeValue(gate.name));
      if (chargeInfo) {
        resHeaders.set('X-SLK-Fee-Vnd', String(chargeInfo.feeVnd));
        resHeaders.set('X-SLK-Balance-Vnd', String(chargeInfo.balanceVnd));
      }

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
