import { corsHeaders } from './_utils.js';

export const config = {
  runtime: 'edge',
};

export default function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const customKeySet = Boolean(process.env.CUSTOM_ACCESS_KEY);
  const upstreamBase = process.env.UPSTREAM_BASE_URL || 'https://api.hcnsec.cn/v1';

  return new Response(
    JSON.stringify({
      status: 'healthy',
      service: 'AI API Gateway',
      upstream: upstreamBase,
      auth_required: customKeySet,
      timestamp: new Date().toISOString()
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
