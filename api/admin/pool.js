import {
  corsHeaders,
  handleOptions,
  checkAuth,
  checkAdminSecret,
  isAllowedAdminDiscordId,
  extractVerifiedDiscordUserId,
  initKeyPoolIfNeeded,
  getPublicPoolList,
  getRawPoolList,
  addGatesToPool,
  updateGateInPool,
  toggleGateInPool,
  removeGateFromPool,
} from '../_utils.js';
import {
  getSupabaseConfig,
  setRuntimeSupabaseConfig,
  testSupabaseConnection,
  dbLoadGatePoolFromSupabase,
  dbSyncGatePoolToSupabase,
  dbDeleteGateFromSupabase,
} from '../_supabase.js';
import { topUpUserBalance, getWalletInfo, formatVnd } from '../_wallet.js';

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
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const verifiedDiscordId = await extractVerifiedDiscordUserId(bearerToken);
  const headerSecret = request.headers.get('x-admin-secret') || url.searchParams.get('secret') || '';

  // Chỉ cho phép:
  // 1. Tài khoản Discord của Owner (1207080545159487498) đã ký token hợp lệ
  // 2. Cung cấp Admin Secret / Master Key hợp lệ
  // Tuyệt đối không cho phép user thường (bỏ checkAuth)
  const isOwnerAdmin = isAllowedAdminDiscordId(verifiedDiscordId);
  const hasValidSecret = Boolean(headerSecret && checkAdminSecret(headerSecret, verifiedDiscordId));
  const authorized = isOwnerAdmin || hasValidSecret;

  if (!authorized) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized: Bạn không có quyền truy cập Admin Pool. Yêu cầu đăng nhập tài khoản Discord Admin hoặc cung cấp Admin Secret hợp lệ.',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const buildPoolPayload = (extra = {}) => {
    const rawPool = getRawPoolList();
    const list = getPublicPoolList();
    const sbCfg = getSupabaseConfig();
    return {
      success: true,
      pool: list,
      gates: list,
      total: list.length,
      active: list.filter(g => g.enabled !== false).length,
      envExport: rawPool.map(g => g.apiKey).join(','),
      supabase: {
        configured: sbCfg.configured,
        url: sbCfg.url,
      },
      ...extra,
    };
  };

  if (request.method === 'GET') {
    const sbGates = await dbLoadGatePoolFromSupabase();
    if (sbGates && sbGates.length > 0) {
      initKeyPoolIfNeeded(sbGates);
    }

    return new Response(
      JSON.stringify(buildPoolPayload()),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const postSecret = body.adminSecret || headerSecret;
      const isPostAuthorized = isOwnerAdmin || Boolean(postSecret && checkAdminSecret(postSecret, verifiedDiscordId));

      if (!isPostAuthorized) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Forbidden: Thao tác bị từ chối. Chỉ tài khoản Discord Admin hoặc Admin Secret hợp lệ mới có quyền thực hiện.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const action = body.action || 'verify';
      const targetGateId = body.gateId || body.id;

      if (action === 'verify') {
        const sbGates = await dbLoadGatePoolFromSupabase();
        if (sbGates && sbGates.length > 0) {
          initKeyPoolIfNeeded(sbGates);
        }
        return new Response(
          JSON.stringify(buildPoolPayload({ isAdmin: true })),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (action === 'save_supabase') {
        const sbUrl = (body.supabaseUrl || '').trim();
        const sbKey = (body.supabaseKey || '').trim();
        const testRes = await testSupabaseConnection(sbUrl, sbKey);
        if (testRes.connected) {
          setRuntimeSupabaseConfig(sbUrl, sbKey);
          await dbSyncGatePoolToSupabase(getRawPoolList());
        }
        return new Response(
          JSON.stringify(buildPoolPayload({ supabaseTest: testRes })),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (action === 'add') {
        const keys = body.keys || '';
        const name = (body.name || 'Gate').trim();
        const baseUrl = (body.baseUrl || '').trim();
        const models = body.models || [];

        const added = addGatesToPool(keys, name, baseUrl, models);
        await Promise.allSettled(added.map(g => testGateHealth(g)));
        await dbSyncGatePoolToSupabase(getRawPoolList());

        return new Response(
          JSON.stringify(buildPoolPayload({ addedCount: added.length })),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (action === 'update') {
        const updated = updateGateInPool(targetGateId, {
          name: body.name,
          baseUrl: body.baseUrl,
          apiKey: body.apiKey,
          apiKeys: body.apiKeys,
          models: body.models,
          enabled: body.enabled,
        });

        if (!updated) {
          return new Response(
            JSON.stringify({ success: false, error: 'Không tìm thấy Gate với ID này để cập nhật.' }),
            { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        await dbSyncGatePoolToSupabase(getRawPoolList());
        return new Response(
          JSON.stringify(buildPoolPayload({ updated: true })),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (action === 'toggle') {
        toggleGateInPool(targetGateId, body.enabled);
        await dbSyncGatePoolToSupabase(getRawPoolList());
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
        await dbDeleteGateFromSupabase(targetGateId);
        await dbSyncGatePoolToSupabase(getRawPoolList());
        return new Response(
          JSON.stringify(buildPoolPayload()),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (action === 'topup_balance') {
        const targetUid = String(body.discordUserId || body.targetDiscordId || '').trim();
        const amountVnd = Math.floor(Number(body.amountVnd || body.amount || 0));

        if (!targetUid) {
          return new Response(
            JSON.stringify({ success: false, error: 'Thiếu Discord User ID cần nạp tiền.' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        if (amountVnd <= 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Số tiền nạp không hợp lệ (phải lớn hơn 0).' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const topup = await topUpUserBalance(targetUid, amountVnd, body.note || 'Admin nạp tiền vào ví');
        if (!topup.success) {
          return new Response(
            JSON.stringify({ success: false, error: topup.error }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const wallet = await getWalletInfo(targetUid);
        return new Response(
          JSON.stringify(buildPoolPayload({
            topup: {
              ...topup,
              balanceLabel: formatVnd(topup.balanceVnd),
            },
            wallet: {
              discordUserId: targetUid,
              balanceVnd: wallet.balanceVnd,
              balanceLabel: formatVnd(wallet.balanceVnd),
              transactions: wallet.transactions.slice(0, 20),
            },
          })),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (action === 'test') {
        const rawPool = getRawPoolList();
        const toTest = targetGateId ? rawPool.filter(g => g.id === targetGateId) : rawPool;
        const results = await Promise.all(toTest.map(g => testGateHealth(g)));
        await dbSyncGatePoolToSupabase(getRawPoolList());

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
