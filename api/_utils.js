export const DEFAULT_UPSTREAM_URL = 'https://api.hcnsec.cn/v1';
export const DEFAULT_UPSTREAM_KEY = 'sk-y0tm0bCPJLL3STHqIDxPGkh6Fk8QWKab7piSmbE5KRiS4MGl';

export const DEFAULT_DISCORD_CLIENT_ID = '1558375997416677426';
export const DEFAULT_DISCORD_CLIENT_SECRET = 'KYXTuhr666qbvi8OVKU-qyrZ-ZMpLbx0';

// Danh sách đầy đủ tất cả 15 Models từ upstream (bao gồm cả Free & Paid/Quota) kèm thông tin Model Status
export const ALL_MODELS = [
  'auto',
  'DeepSeek-V4-Flash',
  'DeepSeek-V4-Pro',
  'DeepSeek-V4.1-Flash',
  'glm-5.3',
  'glm-5.3-flash',
  'kimi-k3',
  'longcat-2.5',
  'MiMo-V2.6-Flash',
  'MiniMax-M3.1-Flash',
  'Qwen3.8-27B',
  'Qwen3.8-Flash-Next',
  'Qwen3-Embedding-8B',
  'sensenova-6.8-flash-lite',
  'sensenova-u1.5-lite',
];

export const MODELS_CATALOG = [
  {
    id: 'auto',
    object: 'model',
    created: 1626777600,
    owned_by: 'TrustedRouter',
    provider: 'TrustedRouter',
    provider_code: 'router',
    free: false,
    price_type: 'token',
    price_label: 'Dựa trên token',
    price_input: '0,76 ¥ / 1M',
    price_output: '0,76 ¥ / 1M',
    tags: ['Reasoning', 'Tools', 'vision', 'free', '1m'],
    description: 'Định tuyến thông minh tự động chọn mô hình có chất lượng tốt nhất, tốc độ nhanh nhất và ổn định nhất.',
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
    free: false,
    price_type: 'request',
    price_label: 'Theo yêu cầu',
    price_input: '3,285 ¥ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', '1m'],
    description: 'DeepSeek-V4-Flash dựa trên kiến trúc MoE (284B tham số, kích hoạt 13B), hỗ trợ ngữ cảnh lên tới 1M token.',
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
    id: 'DeepSeek-V4-Pro',
    object: 'model',
    created: 1626777600,
    owned_by: 'DeepSeek',
    provider: 'DeepSeek',
    provider_code: 'deepseek',
    free: false,
    price_type: 'request',
    price_label: 'Theo yêu cầu',
    price_input: '6,935 ¥ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', 'weights'],
    description: 'DeepSeek-V4-Pro bản chuyên sâu tối ưu cho lập trình phức tạp, suy luận toán học và giải quyết tác vụ khó.',
    supported_endpoint_types: ['openai', 'anthropic'],
    status: {
      uptime: 76.84,
      latency: '39.00s',
      tps: '28.9t/s',
      state: 'degraded',
      bars: [2,2,1,1,1,1,0,2,2,0,2,1,1,2,2,1,1,1,0,2,1,1,1,1]
    }
  },
  {
    id: 'DeepSeek-V4.1-Flash',
    object: 'model',
    created: 1626777600,
    owned_by: 'DeepSeek',
    provider: 'DeepSeek',
    provider_code: 'deepseek',
    free: false,
    price_type: 'request',
    price_label: 'Theo yêu cầu',
    price_input: '2,482 ¥ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', '1m'],
    description: 'DeepSeek V4.1 Flash thế hệ mới với kiến trúc MoE 552B tham số, nâng cấp tốc độ suy luận và độ chính xác.',
    supported_endpoint_types: ['openai', 'anthropic'],
    status: {
      uptime: 55.02,
      latency: '41.72s',
      tps: '33.3t/s',
      state: 'degraded',
      bars: [0,0,0,2,0,0,2,0,0,2,1,1,0,2,2,1,0,0,2,1,2,1,1,1]
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
    price_label: 'Theo yêu cầu',
    price_input: '10,95 ¥ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools'],
    description: 'GLM-5.3 là mô hình flagship của Zhipu AI với khả năng Scaling hậu huấn luyện vượt trội cho Agent & Coding.',
    supported_endpoint_types: ['openai', 'anthropic'],
    status: {
      uptime: 97.00,
      latency: '63.41s',
      tps: '23.7t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,0,1,1]
    }
  },
  {
    id: 'glm-5.3-flash',
    object: 'model',
    created: 1626777600,
    owned_by: 'Zhipu GLM',
    provider: 'Zhipu GLM',
    provider_code: 'zhipu',
    free: false,
    price_type: 'request',
    price_label: 'Theo yêu cầu',
    price_input: '3,2755 ¥ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', '1m'],
    description: 'GLM-5.3-Flash (320B-A10B MoE) hỗ trợ đa phương thức, ngữ cảnh 1M token với chi phí chỉ bằng 1/5 bản Pro.',
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
    free: false,
    price_type: 'request',
    price_label: 'Theo yêu cầu',
    price_input: '25,55 ¥ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', 'vision'],
    description: 'Kimi K3 của Moonshot AI là mô hình đa phương thức 2.8T tham số sử dụng kiến trúc chú ý tuyến tính KDA.',
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
    price_label: 'Miễn phí (0 ¥)',
    price_input: '0 ¥ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', 'free'],
    description: 'LongCat 2.5 Preview của Meituan tiếp tục kiến trúc MoE 1.6T tham số, tốc độ cao và hoàn toàn miễn phí.',
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
    price_label: 'Miễn phí (0 ¥)',
    price_input: '0 ¥ / yêu cầu',
    price_output: '',
    tags: ['Reasoning', 'Tools', 'open', 'free'],
    description: 'MiMo V2.6 Flash của Xiaomi là mô hình suy luận đa phương thức mã nguồn mở MoE 309B tham số (0 ¥ / yêu cầu).',
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
    id: 'MiniMax-M3.1-Flash',
    object: 'model',
    created: 1626777600,
    owned_by: 'MiniMax',
    provider: 'MiniMax',
    provider_code: 'minimax',
    free: false,
    price_type: 'token',
    price_label: 'Dựa trên token',
    price_input: '1,20 ¥ / 1M',
    price_output: '2,40 ¥ / 1M',
    tags: ['Reasoning', 'Tools'],
    description: 'MiniMax M3.1 Flash phản hồi siêu tốc (~1.3s), hỗ trợ đồng thời chuẩn giao thức OpenAI và Anthropic Claude.',
    supported_endpoint_types: ['anthropic', 'openai'],
    status: {
      uptime: 98.40,
      latency: '1.31s',
      tps: '92.4t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1]
    }
  },
  {
    id: 'Qwen3.8-27B',
    object: 'model',
    created: 1626777600,
    owned_by: 'Alibaba Qwen',
    provider: 'Alibaba Qwen',
    provider_code: 'qwen',
    free: false,
    price_type: 'token',
    price_label: 'Dựa trên token',
    price_input: '1,50 ¥ / 1M',
    price_output: '3,00 ¥ / 1M',
    tags: ['Reasoning', 'Tools', 'open'],
    description: 'Qwen 3.8 27B của Alibaba Cloud tối ưu hóa sâu cho suy luận logic, giải toán và viết code chuẩn xác.',
    supported_endpoint_types: ['openai'],
    status: {
      uptime: 91.20,
      latency: '24.50s',
      tps: '44.2t/s',
      state: 'online',
      bars: [1,1,1,1,2,1,1,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1,1,1]
    }
  },
  {
    id: 'Qwen3.8-Flash-Next',
    object: 'model',
    created: 1626777600,
    owned_by: 'Alibaba Qwen',
    provider: 'Alibaba Qwen',
    provider_code: 'qwen',
    free: false,
    price_type: 'token',
    price_label: 'Dựa trên token',
    price_input: '0,80 ¥ / 1M',
    price_output: '1,60 ¥ / 1M',
    tags: ['Reasoning', 'Tools', '1m'],
    description: 'Qwen 3.8 Flash Next thế hệ mới tốc độ cao, cân bằng hoàn hảo giữa tốc độ sinh token và chất lượng phản hồi.',
    supported_endpoint_types: ['openai'],
    status: {
      uptime: 94.60,
      latency: '18.20s',
      tps: '62.5t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1]
    }
  },
  {
    id: 'Qwen3-Embedding-8B',
    object: 'model',
    created: 1626777600,
    owned_by: 'Alibaba Qwen',
    provider: 'Alibaba Qwen',
    provider_code: 'qwen',
    free: false,
    price_type: 'token',
    price_label: 'Dựa trên token',
    price_input: '0,20 ¥ / 1M',
    price_output: '0,20 ¥ / 1M',
    tags: ['Embedding', 'open'],
    description: 'Mô hình Vector Embedding 8B tham số của Alibaba Qwen dùng cho RAG, tìm kiếm ngữ nghĩa và phân loại văn bản.',
    supported_endpoint_types: ['openai'],
    status: {
      uptime: 99.50,
      latency: '0.85s',
      tps: '120.0t/s',
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
    free: true,
    price_type: 'free',
    price_label: 'Miễn phí (0 ¥)',
    price_input: '0 ¥ / yêu cầu',
    price_output: '',
    tags: ['Tools', 'free'],
    description: 'SenseNova 6.8 Flash Lite của SenseTime phản hồi cực nhanh (~3s), ổn định cao và miễn phí.',
    supported_endpoint_types: ['openai'],
    status: {
      uptime: 97.80,
      latency: '3.38s',
      tps: '65.4t/s',
      state: 'online',
      bars: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1]
    }
  },
  {
    id: 'sensenova-u1.5-lite',
    object: 'model',
    created: 1626777600,
    owned_by: 'SenseNova',
    provider: 'SenseNova',
    provider_code: 'sensenova',
    free: false,
    price_type: 'request',
    price_label: 'Theo yêu cầu',
    price_input: '0,50 ¥ / yêu cầu',
    price_output: '',
    tags: ['Tools'],
    description: 'SenseNova U1.5 Lite của SenseTime là mô hình đa tác vụ nhẹ, tối ưu cho hội thoại tiếng Trung và đa ngôn ngữ.',
    supported_endpoint_types: ['openai'],
    status: {
      uptime: 64.20,
      latency: '12.40s',
      tps: '41.0t/s',
      state: 'degraded',
      bars: [1,2,0,1,1,0,2,1,0,1,2,1,1,0,1,1,2,0,1,1,2,1,1,0]
    }
  },
];

// Giữ alias tương thích ngược
export const FREE_MODELS = ALL_MODELS;
export const FREE_MODELS_METADATA = MODELS_CATALOG;

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Custom-Key, Accept, User-Agent',
  'Access-Control-Max-Age': '86400',
};

export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
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

  // Kiểm tra định dạng sk-dc-<uid>-<sig>
  if (token.startsWith('sk-dc-')) {
    const parts = token.split('-');
    if (parts.length < 4) return false;
    const discordUserId = parts[2];
    const expectedKey = await generateDiscordUserApiKey(discordUserId);
    return token === expectedKey;
  }

  // Kiểm tra định dạng key tạo thêm trong Dashboard: sk-nx-<uid>-<salt>-<sig>
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

  // Chấp nhận key sinh từ tài khoản Discord (sk-dc-... hoặc sk-nx-...)
  if (candidate && (candidate.startsWith('sk-dc-') || candidate.startsWith('sk-nx-'))) {
    const validDiscordKey = await verifyDiscordUserApiKey(candidate);
    if (validDiscordKey) return true;
  }

  // Nếu admin có đặt CUSTOM_ACCESS_KEY cố định
  if (customKey && candidate === customKey) {
    return true;
  }

  return false;
}

// Hợp nhất danh sách model từ upstream với MODELS_CATALOG để có đủ thông tin status & giá
export function mergeModelsWithCatalog(upstreamList = []) {
  const catalogMap = new Map(MODELS_CATALOG.map(m => [m.id, m]));
  const result = [...MODELS_CATALOG];

  for (const item of upstreamList) {
    if (item && item.id && !catalogMap.has(item.id)) {
      result.push({
        id: item.id,
        object: 'model',
        created: item.created || 1626777600,
        owned_by: item.owned_by || 'openai',
        provider: item.owned_by || 'OpenAI',
        provider_code: 'other',
        free: false,
        price_type: 'token',
        price_label: 'Dựa trên token',
        price_input: '1,00 ¥ / 1M',
        price_output: '1,00 ¥ / 1M',
        tags: ['Tools'],
        description: `Mô hình ${item.id} từ upstream gateway.`,
        supported_endpoint_types: item.supported_endpoint_types || ['openai'],
        status: {
          uptime: 95.0,
          latency: '15.00s',
          tps: '50.0t/s',
          state: 'online',
          bars: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        }
      });
    }
  }

  return result;
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
  const upstreamBase = (process.env.UPSTREAM_BASE_URL || DEFAULT_UPSTREAM_URL).replace(/\/+$/, '');
  const upstreamKey = (process.env.UPSTREAM_API_KEY || DEFAULT_UPSTREAM_KEY).trim();

  // Nếu gọi danh sách /v1/models -> Trả về đầy đủ 15+ models (cả Free & Paid) kèm thông tin Status
  if (cleanPath === 'models' && request.method === 'GET') {
    let merged = MODELS_CATALOG;
    try {
      const r = await fetch(`${upstreamBase}/models`, {
        headers: { Authorization: `Bearer ${upstreamKey}` },
      });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j.data)) {
          merged = mergeModelsWithCatalog(j.data);
        }
      }
    } catch {
      // Fallback sang MODELS_CATALOG nếu upstream chậm
    }

    return new Response(
      JSON.stringify({
        object: 'list',
        data: merged,
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

  // Extract query string (ignoring Vercel's rewrite param `path`)
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.searchParams);
  searchParams.delete('path');
  const queryStr = searchParams.toString();
  const targetUrl = `${upstreamBase}/${cleanPath}${queryStr ? '?' + queryStr : ''}`;

  const forwardHeaders = new Headers();
  forwardHeaders.set('Authorization', `Bearer ${upstreamKey}`);
  forwardHeaders.set('Content-Type', request.headers.get('content-type') || 'application/json');
  forwardHeaders.set('Accept', request.headers.get('accept') || 'application/json');

  const fetchOptions = {
    method: request.method,
    headers: forwardHeaders,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const rawBody = await request.text();
      if (rawBody) {
        fetchOptions.body = rawBody;
      }
    } catch {
      // Body empty or unreadable
    }
  }

  try {
    const upstreamRes = await fetch(targetUrl, fetchOptions);

    const resHeaders = new Headers(upstreamRes.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      resHeaders.set(key, value);
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: {
          message: `Proxy Error: Failed to reach upstream API: ${err.message}`,
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
}
