import { corsHeaders, FREE_MODELS, MODELS_CATALOG, getMergedModelsCatalog, getAllAllowedModels, getRawPoolList } from './_utils.js';

export const config = {
  runtime: 'edge',
};

export default function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const upstreamBase = process.env.UPSTREAM_BASE_URL || 'https://api.hcnsec.cn/v1';
  const pool = getRawPoolList();
  const activeGates = pool.filter(g => g.enabled !== false).length || 1;
  const mergedCatalog = getMergedModelsCatalog();
  const allowedModels = getAllAllowedModels();

  return new Response(
    JSON.stringify({
      status: 'healthy',
      service: 'SLK Gateway',
      upstream: upstreamBase,
      total_models: mergedCatalog.length,
      free_models: allowedModels,
      active_gates: activeGates,
      total_gates: pool.length || 1,
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

