export const DEFAULT_UPSTREAM_URL = 'https://api.hcnsec.cn/v1';
export const DEFAULT_UPSTREAM_KEY = 'sk-y0tm0bCPJLL3STHqIDxPGkh6Fk8QWKab7piSmbE5KRiS4MGl';

export const DEFAULT_DISCORD_CLIENT_ID = '1558375997416677426';
export const DEFAULT_DISCORD_CLIENT_SECRET = 'KYXTuhr666qbvi8OVKU-qyrZ-ZMpLbx0';

// Danh sách các model 100% FREE (cost = 0) đã được kiểm chứng trên upstream
export const FREE_MODELS = [
  'auto',
  'DeepSeek-V4-Flash',
  'glm-5.3-flash',
  'kimi-k3',
  'longcat-2.5',
  'sensenova-6.8-flash-lite',
];

export const FREE_MODELS_METADATA = [
  {
    id: 'auto',
    object: 'model',
    created: 1626777600,
    owned_by: 'free-tier',
    free: true,
    description: 'Tự động định tuyến tới model Free nhanh nhất (agnes-3.0-flash / sensenova)',
    supported_endpoint_types: ['openai']
  },
  {
    id: 'DeepSeek-V4-Flash',
    object: 'model',
    created: 1626777600,
    owned_by: 'deepseek-free',
    free: true,
    description: 'Mô hình chuyên lập trình & suy luận tốc độ cao (Miễn phí 100%)',
    supported_endpoint_types: ['openai']
  },
  {
    id: 'glm-5.3-flash',
    object: 'model',
    created: 1626777600,
    owned_by: 'zhipu-free',
    free: true,
    description: 'Mô hình GLM 5.3 Flash phản hồi tức thì (Miễn phí 100%)',
    supported_endpoint_types: ['openai']
  },
  {
    id: 'kimi-k3',
    object: 'model',
    created: 1626777600,
    owned_by: 'moonshot-free',
    free: true,
    description: 'Mô hình Kimi K3 hỗ trợ ngữ cảnh dài & đa ngôn ngữ (Miễn phí 100%)',
    supported_endpoint_types: ['openai']
  },
  {
    id: 'longcat-2.5',
    object: 'model',
    created: 1626777600,
    owned_by: 'longcat-free',
    free: true,
    description: 'Mô hình LongCat 2.5 Preview đa năng (Miễn phí 100%)',
    supported_endpoint_types: ['openai']
  },
  {
    id: 'sensenova-6.8-flash-lite',
    object: 'model',
    created: 1626777600,
    owned_by: 'sensenova-free',
    free: true,
    description: 'Mô hình SenseNova 6.8 Flash Lite siêu nhẹ, tốc độ cao (Miễn phí 100%)',
    supported_endpoint_types: ['openai']
  },
];

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

// Tạo API Key cá nhân dựa trên Discord User ID
export async function generateDiscordUserApiKey(discordUserId) {
  const secret = (process.env.UPSTREAM_API_KEY || DEFAULT_UPSTREAM_KEY).slice(0, 16);
  const raw = `${discordUserId}:${secret}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
  return `sk-dc-${discordUserId}-${hashHex}`;
}

export async function verifyDiscordUserApiKey(token) {
  if (!token || !token.startsWith('sk-dc-')) return false;
  const parts = token.split('-');
  if (parts.length < 4) return false;
  const discordUserId = parts[2];
  const expectedKey = await generateDiscordUserApiKey(discordUserId);
  return token === expectedKey;
}

export async function checkAuth(request) {
  const customKey = (process.env.CUSTOM_ACCESS_KEY || '').trim();
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const customHeader = (request.headers.get('x-custom-key') || '').trim();

  const candidate = token || customHeader;

  // Chấp nhận key sinh từ tài khoản Discord đã đăng nhập (sk-dc-...)
  if (candidate && candidate.startsWith('sk-dc-')) {
    const validDiscordKey = await verifyDiscordUserApiKey(candidate);
    if (validDiscordKey) return true;
  }

  // Nếu admin có đặt CUSTOM_ACCESS_KEY cố định
  if (customKey && candidate === customKey) {
    return true;
  }

  // Bắt buộc phải có key Discord hợp lệ (hoặc CUSTOM_ACCESS_KEY nếu được cấu hình)
  return false;
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
          message: 'Unauthorized: Bạn cần đăng nhập Discord trên website để lấy API Key sử dụng dịch vụ này.',
          type: 'authentication_error',
          code: 'discord_login_required'
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

  // Nếu gọi danh sách /v1/models -> Chỉ trả về các model FREE
  if (cleanPath === 'models' && request.method === 'GET') {
    return new Response(
      JSON.stringify({
        object: 'list',
        data: FREE_MODELS_METADATA,
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

  const upstreamBase = (process.env.UPSTREAM_BASE_URL || DEFAULT_UPSTREAM_URL).replace(/\/+$/, '');
  const upstreamKey = (process.env.UPSTREAM_API_KEY || DEFAULT_UPSTREAM_KEY).trim();

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
      if (rawBody && cleanPath.includes('chat/completions')) {
        try {
          const parsed = JSON.parse(rawBody);
          // Chặn các model trả phí: chỉ cho phép các model trong FREE_MODELS
          if (!parsed.model || !FREE_MODELS.includes(parsed.model)) {
            parsed.model = 'DeepSeek-V4-Flash';
          }
          fetchOptions.body = JSON.stringify(parsed);
        } catch {
          fetchOptions.body = rawBody;
        }
      } else {
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
