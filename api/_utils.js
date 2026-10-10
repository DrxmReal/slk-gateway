export const DEFAULT_UPSTREAM_URL = 'https://api.hcnsec.cn/v1';
export const DEFAULT_UPSTREAM_KEY = 'sk-y0tm0bCPJLL3STHqIDxPGkh6Fk8QWKab7piSmbE5KRiS4MGl';

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

export function checkAuth(request) {
  const customKey = (process.env.CUSTOM_ACCESS_KEY || '').trim();
  if (!customKey) return true; // Open access if no custom key configured

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const customHeader = request.headers.get('x-custom-key') || '';

  return token === customKey || customHeader === customKey;
}

export async function proxyRequest(request, targetPath) {
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }

  if (!checkAuth(request)) {
    return new Response(
      JSON.stringify({
        error: {
          message: 'Unauthorized: Invalid or missing API key. Please check your authorization bearer token.',
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

  const upstreamBase = (process.env.UPSTREAM_BASE_URL || DEFAULT_UPSTREAM_URL).replace(/\/+$/, '');
  const upstreamKey = (process.env.UPSTREAM_API_KEY || DEFAULT_UPSTREAM_KEY).trim();

  // Strip leading slash
  const cleanPath = (targetPath || '').replace(/^\/+/, '');
  
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
      fetchOptions.body = await request.text();
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
