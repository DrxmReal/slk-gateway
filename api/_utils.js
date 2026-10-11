import { chargeUserForRequest, getRequestFeeVnd, refundUserForFailedRequest } from './_wallet.js';

export const DEFAULT_UPSTREAM_URL = (process.env.UPSTREAM_BASE_URL || 'https://api.hcnsec.cn/v1').replace(/\/+$/, '');
export const DEFAULT_UPSTREAM_KEY = (process.env.UPSTREAM_API_KEY || '').trim();

// Cấu hình OpenCode Zen Gate
export const OPENCODE_BASE_URL = (process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/v1').replace(/\/+$/, '');
export const OPENCODE_API_KEY = (process.env.OPENCODE_API_KEY || '').trim();

// Cấu hình UnoRouter Gate (Step 5 Preview & Free Tier)
export const UNOROUTER_BASE_URL = (process.env.UNOROUTER_BASE_URL || 'https://api.unorouter.com/v1').replace(/\/+$/, '');
export const UNOROUTER_API_KEY = (process.env.UNOROUTER_API_KEY || '').trim();

export const DEFAULT_DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1558375997416677426';
export const DEFAULT_DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';

// Discord User ID duy nhất của Owner có toàn quyền Admin Gateway & Pool
export const OWNER_ADMIN_DISCORD_ID = '1207080545159487498';

// Danh sách model định tuyến qua UnoRouter
export const UNOROUTER_MODELS = [
  'step-5-preview:free',
  'k2-horizon:free',
  'nemotron-3-super-120b-a12b:free',
  'agnes-3.0-flash:free',
];

// Mapping alias hiển thị sạch -> tên model nội bộ trên Upstream (UnoRouter / OpenCode)
export const MODEL_ALIASES = {
  'nemotron-3-super-120b-a12b': 'nemotron-3-super-120b-a12b:free',
  'step-5-preview': 'step-5-preview:free',
  'k2-horizon': 'k2-horizon:free',
  'agnes-3.0-flash': 'agnes-3.0-flash:free',
  'space-bunny': 'space-bunny-free',
};

// Danh sách model ĐƯỢC PHÉP sử dụng trên Gateway (auto đứng đầu, tên model sạch không :free)
export const FREE_MODELS = [
  'auto',
  'nemotron-3-super-120b-a12b',
  'step-5-preview',
  'k2-horizon',
  'agnes-3.0-flash',
  'space-bunny',
  'glm-5.3',
  'longcat-2.5',
  'sensenova-6.8-flash-lite',
  // Tương thích ngược nếu client gọi có kèm :free / -free
  'nemotron-3-super-120b-a12b:free',
  'step-5-preview:free',
  'k2-horizon:free',
  'agnes-3.0-flash:free',
  'space-bunny-free',
];

export const ALL_MODELS = FREE_MODELS;

// Model mặc định khi client không chỉ định (hoặc chỉ định model không hợp lệ)
export const DEFAULT_MODEL = 'auto';

export const MODELS_CATALOG = [
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
    description: 'Tự động định tuyến thông minh: hệ thống tự chọn model AI chất lượng tốt nhất, nhanh nhất và ổn định nhất tại thời điểm gọi.',
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
    id: 'nemotron-3-super-120b-a12b',
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
    id: 'step-5-preview',
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
    id: 'k2-horizon',
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
    id: 'agnes-3.0-flash',
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
    id: 'space-bunny',
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

// Hàm phân tách tên Gate và danh sách Model được gán (lưu tương thích ngược qua tên trong Supabase)
export function parseGateNameAndModels(rawName = '') {
  const str = String(rawName || '').trim();
  const marker = '@@models:';
  const idx = str.indexOf(marker);
  if (idx !== -1) {
    const displayName = str.slice(0, idx).trim();
    const modelsStr = str.slice(idx + marker.length).trim();
    const models = modelsStr.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
    return { displayName: displayName || 'Gate', models };
  }
  return { displayName: str || 'Gate', models: [] };
}

// Hàm mã hóa tên Gate kèm danh sách Model để lưu vào cột name trong Supabase
export function encodeGateNameWithModels(displayName = '', models = []) {
  const cleanName = String(displayName || 'Gate').trim().replace(/@@models:.*$/i, '').trim();
  if (Array.isArray(models) && models.length > 0) {
    const cleanList = models.map(s => String(s).trim()).filter(Boolean);
    if (cleanList.length > 0) {
      return `${cleanName} @@models:${cleanList.join(',')}`;
    }
  }
  return cleanName;
}

export function initKeyPoolIfNeeded(initialItems = null) {
  if (Array.isArray(initialItems) && initialItems.length > 0) {
    upstreamKeyPool.length = 0;
    initialItems.forEach((item, idx) => {
      if (item && item.apiKey) {
        const parsed = parseGateNameAndModels(item.name || `Gate #${idx + 1}`);
        const assignedModels = Array.isArray(item.models) && item.models.length > 0
          ? item.models.map(m => String(m).trim()).filter(Boolean)
          : parsed.models;

        upstreamKeyPool.push({
          id: item.id || `gate_${idx + 1}`,
          name: parsed.displayName,
          models: assignedModels,
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
      models: [],
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
    models: Array.isArray(g.models) ? g.models : [],
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

export function addGatesToPool(rawKeysInput, customNamePrefix = 'Gate', customBaseUrl = '', customModels = []) {
  initKeyPoolIfNeeded();
  const baseUrl = (customBaseUrl || process.env.UPSTREAM_BASE_URL || DEFAULT_UPSTREAM_URL).replace(/\/+$/, '');
  const keys = Array.isArray(rawKeysInput)
    ? rawKeysInput
    : String(rawKeysInput || '')
        .split(/[\n,;]+/)
        .map(s => s.trim())
        .filter(Boolean);

  const assignedModels = Array.isArray(customModels)
    ? customModels.map(m => String(m).trim()).filter(Boolean)
    : String(customModels || '').split(/[\s,;]+/).map(m => m.trim()).filter(Boolean);

  const added = [];
  for (const k of keys) {
    const existing = upstreamKeyPool.find(g => g.apiKey === k && g.baseUrl === baseUrl);
    if (existing) {
      existing.enabled = true;
      if (assignedModels.length > 0) existing.models = assignedModels;
      continue;
    }
    const nextNum = upstreamKeyPool.length + 1;
    const newGate = {
      id: `gate_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: keys.length === 1 && customNamePrefix && customNamePrefix !== 'Gate' ? customNamePrefix : `${customNamePrefix || 'Gate'} #${nextNum}`,
      models: assignedModels,
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

export function updateGateInPool(gateId, updates = {}) {
  initKeyPoolIfNeeded();
  const gate = upstreamKeyPool.find(g => g.id === gateId);
  if (!gate) return null;

  if (typeof updates.name === 'string' && updates.name.trim()) {
    gate.name = updates.name.trim().replace(/@@models:.*$/i, '').trim();
  }
  if (typeof updates.baseUrl === 'string' && updates.baseUrl.trim()) {
    gate.baseUrl = updates.baseUrl.trim().replace(/\/+$/, '');
  }
  if (typeof updates.apiKey === 'string' && updates.apiKey.trim()) {
    gate.apiKey = updates.apiKey.trim();
    gate.maskedKey = maskApiKey(gate.apiKey);
  }
  if (Array.isArray(updates.models)) {
    gate.models = updates.models.map(m => String(m).trim()).filter(Boolean);
  }
  if (typeof updates.enabled === 'boolean') {
    gate.enabled = updates.enabled;
  }
  return gate;
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

// Chọn danh sách Gate theo model yêu cầu & thuật toán Round-Robin để cân bằng tải
export function selectGatesForRequest(requestModel = '') {
  initKeyPoolIfNeeded();
  const active = upstreamKeyPool.filter(g => g.enabled !== false);
  if (active.length === 0) return [];

  const routedModel = MODEL_ALIASES[requestModel] || requestModel;

  // 1. Nếu có Gate được gán cụ thể model này -> ưu tiên sử dụng nhóm Gate đó
  if (requestModel || routedModel) {
    const matched = active.filter(g => {
      if (!Array.isArray(g.models) || g.models.length === 0) return false;
      return (
        g.models.includes('*') ||
        g.models.includes(requestModel) ||
        g.models.includes(routedModel)
      );
    });

    if (matched.length > 0) {
      const startIdx = roundRobinCounter % matched.length;
      roundRobinCounter = (roundRobinCounter + 1) % 1000000;
      return matched.map((_, i) => matched[(startIdx + i) % matched.length]);
    }
  }

  // 2. Nếu model thuộc UnoRouter nhưng chưa có gate riêng trong pool -> kiểm tra pool có gate unorouter không, nếu không fallback env
  if (UNOROUTER_MODELS.includes(routedModel)) {
    const unoGates = active.filter(g => g.baseUrl && g.baseUrl.toLowerCase().includes('unorouter'));
    if (unoGates.length > 0) {
      const startIdx = roundRobinCounter % unoGates.length;
      roundRobinCounter = (roundRobinCounter + 1) % 1000000;
      return unoGates.map((_, i) => unoGates[(startIdx + i) % unoGates.length]);
    }
    const envUnoKey = (process.env.UNOROUTER_API_KEY || UNOROUTER_API_KEY || '').trim();
    return [{
      id: 'gate_unorouter_fallback',
      name: 'UnoRouter Gate',
      baseUrl: UNOROUTER_BASE_URL,
      apiKey: envUnoKey,
      enabled: true,
      requests: 0,
      errors: 0,
    }];
  }

  // 3. Nếu model thuộc OpenCode (space-bunny) -> tìm gate opencode trong pool hoặc fallback env
  if (routedModel === 'space-bunny-free') {
    const openCodeGates = active.filter(g => g.baseUrl && g.baseUrl.toLowerCase().includes('opencode'));
    if (openCodeGates.length > 0) {
      const startIdx = roundRobinCounter % openCodeGates.length;
      roundRobinCounter = (roundRobinCounter + 1) % 1000000;
      return openCodeGates.map((_, i) => openCodeGates[(startIdx + i) % openCodeGates.length]);
    }
    const envOpenCodeKey = (process.env.OPENCODE_API_KEY || OPENCODE_API_KEY || '').trim();
    return [{
      id: 'gate_opencode_zen_fallback',
      name: 'OpenCode Zen Gate',
      baseUrl: OPENCODE_BASE_URL,
      apiKey: envOpenCodeKey,
      enabled: true,
      requests: 0,
      errors: 0,
    }];
  }

  // 4. Các Gate chung (không gán model riêng biệt hoặc gán '*')
  const generalGates = active.filter(g => {
    if (!Array.isArray(g.models) || g.models.length === 0) return true;
    return g.models.includes('*');
  });

  const poolToUse = generalGates.length > 0 ? generalGates : active;
  const startIdx = roundRobinCounter % poolToUse.length;
  roundRobinCounter = (roundRobinCounter + 1) % 1000000;
  return poolToUse.map((_, i) => poolToUse[(startIdx + i) % poolToUse.length]);
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

export function checkAdminSecret(candidateSecret = '', verifiedDiscordId = '') {
  // 1. Chỉ chấp nhận ID nếu đã được xác thực chữ ký (từ Bearer token)
  if (verifiedDiscordId && isAllowedAdminDiscordId(verifiedDiscordId)) {
    return true;
  }
  const cleanCandidate = String(candidateSecret || '').trim();
  if (!cleanCandidate) return false;

  // 2. Chặn các mật khẩu mặc định hoặc quá yếu
  if (cleanCandidate.toLowerCase() === 'slk-admin' || cleanCandidate === 'admin' || cleanCandidate === '123456') {
    return false;
  }

  const envAdminSecret = (process.env.ADMIN_SECRET || '').trim();
  const masterKey = (process.env.UPSTREAM_API_KEY || '').trim();

  // 3. Khớp ADMIN_SECRET được cấu hình riêng trong biến môi trường
  if (envAdminSecret && cleanCandidate === envAdminSecret) {
    return true;
  }
  // 4. Khớp Master Upstream API Key (chỉ có Admin nắm giữ)
  if (masterKey && cleanCandidate === masterKey) {
    return true;
  }

  return false;
}

async function sha256Hex(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Lấy secret dùng để ký API Key (giữ tương thích 100% với các key đã cấp trước đó)
function getGatewaySigningSecret() {
  if (process.env.GATEWAY_SIGNING_SECRET) {
    return process.env.GATEWAY_SIGNING_SECRET.slice(0, 32);
  }
  return (
    process.env.UPSTREAM_API_KEY ||
    process.env.DISCORD_CLIENT_SECRET ||
    'slk-gateway-secret-salt-2026'
  ).slice(0, 16);
}

// Tạo API Key mặc định dựa trên Discord User ID (sk-dc-<uid>-<sig>)
export async function generateDiscordUserApiKey(discordUserId) {
  const secret = getGatewaySigningSecret();
  const hashHex = await sha256Hex(`${discordUserId}:${secret}`);
  return `sk-dc-${discordUserId}-${hashHex.slice(0, 24)}`;
}

// Tạo API Key mới có salt ngẫu nhiên trong Dashboard (sk-nx-<uid>-<salt>-<sig>)
export async function generateCustomDiscordApiKey(discordUserId, customSalt = '') {
  const secret = getGatewaySigningSecret();
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
    if (token === expectedKey) return true;

    // Tương thích ngược với các phiên bản token cũ đã lưu trong localStorage của người dùng
    const legacySecrets = [
      (process.env.UPSTREAM_API_KEY || process.env.DISCORD_CLIENT_SECRET || 'slk-gateway-secret-salt-2026').slice(0, 16),
      (process.env.DISCORD_CLIENT_SECRET || process.env.UPSTREAM_API_KEY || 'slk-gateway-secret-salt-2026').slice(0, 16),
      'slk-gateway-secret-salt-2026'.slice(0, 16),
      (process.env.DISCORD_CLIENT_SECRET || process.env.UPSTREAM_API_KEY || 'slk_gw_sec_2026_x89a1c').slice(0, 32),
      'slk_gw_sec_2026_x89a1c'.slice(0, 32),
    ];
    for (const sec of legacySecrets) {
      const hash = await sha256Hex(`${discordUserId}:${sec}`);
      if (token === `sk-dc-${discordUserId}-${hash.slice(0, 24)}`) return true;
    }

    return false;
  }

  if (token.startsWith('sk-nx-')) {
    const parts = token.split('-');
    if (parts.length < 5) return false;
    const discordUserId = parts[2];
    const salt = parts[3];
    const expectedKey = await generateCustomDiscordApiKey(discordUserId, salt);
    if (token === expectedKey) return true;

    const legacySecrets = [
      (process.env.UPSTREAM_API_KEY || process.env.DISCORD_CLIENT_SECRET || 'slk-gateway-secret-salt-2026').slice(0, 16),
      (process.env.DISCORD_CLIENT_SECRET || process.env.UPSTREAM_API_KEY || 'slk-gateway-secret-salt-2026').slice(0, 16),
      'slk-gateway-secret-salt-2026'.slice(0, 16),
      (process.env.DISCORD_CLIENT_SECRET || process.env.UPSTREAM_API_KEY || 'slk_gw_sec_2026_x89a1c').slice(0, 32),
      'slk_gw_sec_2026_x89a1c'.slice(0, 32),
    ];
    for (const sec of legacySecrets) {
      const hash = await sha256Hex(`${discordUserId}:${salt}:${sec}`);
      if (token === `sk-nx-${discordUserId}-${salt}-${hash.slice(0, 20)}`) return true;
    }

    return false;
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

// Hàm che giấu lỗi & ngăn rò rỉ link API gốc (Masking origin endpoints to Timeout/Overload error)
export function maskAndSanitizeErrorResponse(errOrStatus, rawBodyOrMsg = '', customHeaders = {}) {
  const status = typeof errOrStatus === 'number' ? errOrStatus : 504;
  let message = 'Yêu cầu xử lý mô hình AI quá thời gian chờ (Gateway Timeout). Vui lòng thử lại sau giây lát.';
  let type = 'gateway_timeout';
  let code = 'timeout';

  if (status === 429) {
    message = 'Mô hình AI đang bị giới hạn tần suất (Gói Free giới hạn 1 yêu cầu / 1 phút). Vui lòng đợi ~1 phút và gửi lại.';
    type = 'rate_limit_error';
    code = 'rate_limit';
  }

  const safeStatus = status === 429 ? 429 : 504;

  return new Response(
    JSON.stringify({
      error: {
        message,
        type,
        code
      }
    }),
    {
      status: safeStatus,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
        ...customHeaders,
      }
    }
  );
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
          // Chuẩn hóa tên model sang model upstream cần (VD: step-5-preview -> step-5-preview:free)
          const upstreamModel = MODEL_ALIASES[requestModel] || requestModel;
          parsed.model = upstreamModel;
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

  // Lấy danh sách Gates theo model yêu cầu; tự động điều hướng đúng Gate phục vụ model đó
  const candidateGates = selectGatesForRequest(requestModel);
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

      // Nếu Gate hiện tại bị lỗi/rate-limit và còn Gate dự phòng -> tự động failover sang Gate tiếp theo
      if ([401, 402, 403, 429, 500, 502, 503, 504].includes(upstreamRes.status) && candidateGates.length > 1) {
        gate.errors += 1;
        gate.status = upstreamRes.status === 429 ? 'rate_limited' : 'error';
        lastUpstreamRes = upstreamRes;
        continue;
      }

      if (!upstreamRes.ok) {
        gate.errors += 1;
        gate.status = upstreamRes.status === 429 ? 'rate_limited' : 'error';
        const errText = await upstreamRes.text().catch(() => '');
        // Hoàn lại tiền cho user nếu lỗi xuất phát từ hệ thống/nhà cung cấp
        if (verifiedUid && chargeInfo) {
          await refundUserForFailedRequest(verifiedUid, chargeInfo.feeVnd, requestModel).catch(() => {});
        }
        return maskAndSanitizeErrorResponse(upstreamRes.status, errText, corsHeaders);
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

  // Hoàn tiền cho user nếu tất cả các Gate đều timeout hoặc sập
  if (verifiedUid && chargeInfo) {
    await refundUserForFailedRequest(verifiedUid, chargeInfo.feeVnd, requestModel).catch(() => {});
  }

  if (lastUpstreamRes) {
    const errText = await lastUpstreamRes.text().catch(() => '');
    return maskAndSanitizeErrorResponse(lastUpstreamRes.status, errText, corsHeaders);
  }

  return maskAndSanitizeErrorResponse(504, lastError?.message || '', corsHeaders);
}
