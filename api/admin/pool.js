import {
  corsHeaders,
  handleOptions,
  checkAuth,
  checkAdminSecret,
  getPublicPoolList,
  getRawPoolList,
  addGatesToPool,
  toggleGateInPool,
  removeGateFromPool,
} from '../_utils.js';

export const config = {
  runtime: 'edge',
};

export async function testGateHealth(gate) {
  const start = Date.now();
  try {
    const res = await fetch(`${gate.baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${gate.apiKey}`,
        'Accept': 'application/json',
      },
    });
    const ms = Date.now() - start;
    gate.lastLatencyMs = ms;
    gate.lastUsedAt = new Date().toISOString();

    if (res.ok) {
      gate.status = 'online';
      return { id: gate.id, online: true, status: res.status, latencyMs: ms };
    } else {
      gate.status = res.status === 429 ? 'rate_limited' : 'error';
      gate.errors += 1;
      return { id: gate.id, online: false, status: res.status, latencyMs: ms };
    }
  } catch (err) {
    const ms = Date.now() - start;
    gate.status = 'error';
    gate.errors += 1;
    return { id: gate.id, online: false, status: 502, latencyMs: ms, error: err.message };
  }
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }

  const url = new URL(request.url);
  const headerSecret = request.headers.get('x-admin-secret') || url.searchParams.get('secret') || '';
  const authorized = (headerSecret && checkAdminSecret(headerSecret)) || (await checkAuth(request));
  if (!authorized) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized: Vui lòng đăng nhập Discord hoặc nhập đúng mật khẩu Admin.' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const buildPoolPayload = (extra = {}) => {
    const rawPool = getRawPoolList();
    const list = getPublicPoolList();
    return {
      success: true,
      pool: list,
      gates: list,
      total: list.length,
      active: list.filter(g => g.enabled !== false).length,
      envExport: rawPool.map(g => g.apiKey).join(','),
      ...extra,
    };
  };

  if (request.method === 'GET') {
    const discordUserId = url.searchParams.get('discordUserId') || '';
    if (!checkAdminSecret(headerSecret, discordUserId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Sai mật khẩu Admin.' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify(buildPoolPayload()),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const secret = body.adminSecret || headerSecret;
      const discordUserId = body.discordUserId || '';

      if (!checkAdminSecret(secret, discordUserId)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Mật khẩu Admin không đúng! (Mặc định: slk-admin hoặc nhập Master API Key của bạn).',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const action = body.action || 'verify';
      const targetGateId = body.gateId || body.id;

      if (action === 'verify') {
        return new Response(
          JSON.stringify(buildPoolPayload({ isAdmin: true })),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (action === 'add') {
        const keys = body.keys || '';
        const name = (body.name || 'Gate').trim();
        const baseUrl = (body.baseUrl || '').trim();

        const added = addGatesToPool(keys, name, baseUrl);
        await Promise.allSettled(added.map(g => testGateHealth(g)));

        return new Response(
          JSON.stringify(buildPoolPayload({ addedCount: added.length })),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (action === 'toggle') {
        toggleGateInPool(targetGateId, body.enabled);
        return new Response(
          JSON.stringify(buildPoolPayload()),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (action === 'delete') {
        const removed = removeGateFromPool(targetGateId);
        if (removed === false) {
          return new Response(
            JSON.stringify({ success: false, error: 'Phải giữ lại ít nhất 1 Gate hoạt động trong Pool.' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        return new Response(
          JSON.stringify(buildPoolPayload()),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (action === 'test') {
        const rawPool = getRawPoolList();
        const toTest = targetGateId ? rawPool.filter(g => g.id === targetGateId) : rawPool;
        const results = await Promise.all(toTest.map(g => testGateHealth(g)));

        return new Response(
          JSON.stringify(buildPoolPayload({ results, testResult: results[0] || null })),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Action không hợp lệ.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, error: err.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  }

  return new Response(
    JSON.stringify({ success: false, error: 'Method Not Allowed' }),
    { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}
