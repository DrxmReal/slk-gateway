import { corsHeaders, FREE_MODELS } from './_utils.js';

export const config = {
  runtime: 'edge',
};

export default function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const upstreamBase = process.env.UPSTREAM_BASE_URL || 'https://api.hcnsec.cn/v1';

  return new Response(
    JSON.stringify({
      status: 'healthy',
      service: 'SLK Gateway',
      upstream: upstreamBase,
      free_models: FREE_MODELS,
      discord_auth_required: true,
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
