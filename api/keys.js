import {
  corsHeaders,
  checkAuth,
  extractVerifiedDiscordUserId,
  generateCustomDiscordApiKey,
  isAllowedAdminDiscordId,
  checkAdminSecret,
} from './_utils.js';
import {
  dbGetUserApiKeys,
  dbCreateUserApiKey,
  dbDeleteUserApiKey,
  getSupabaseConfig,
} from './_supabase.js';

export const config = {
  runtime: 'edge',
};

// Chỉ cho phép thao tác hộ user khác khi có quyền Admin
function canActOnBehalfOfUser(verifiedUid, targetUid, headerSecret = '') {
  if (!targetUid || !verifiedUid) return true;
  if (targetUid === verifiedUid) return true;
  return isAllowedAdminDiscordId(verifiedUid) || checkAdminSecret(headerSecret, verifiedUid);
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authorized = await checkAuth(request);
  if (!authorized) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized: Vui lòng đăng nhập Discord trước.' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const verifiedDiscordId = await extractVerifiedDiscordUserId(bearerToken);
  const headerSecret =
    request.headers.get('x-admin-secret') ||
    new URL(request.url).searchParams.get('secret') ||
    '';

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const requestedUserId = url.searchParams.get('discordUserId') || '';
    const targetUserId = verifiedDiscordId || requestedUserId;

    if (requestedUserId && !canActOnBehalfOfUser(verifiedDiscordId, requestedUserId, headerSecret)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Bạn chỉ được xem API Key của chính mình.' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu Discord User ID.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const keys = await dbGetUserApiKeys(targetUserId);
    return new Response(
      JSON.stringify({
        success: true,
        discordUserId: targetUserId,
        keys,
        supabaseConfigured: getSupabaseConfig().configured,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const requestedUserId = String(body.discordUserId || '').trim();
      const discordUserId = verifiedDiscordId || requestedUserId;
      const keyName = String(body.name || 'API Key mới').trim();

      if (requestedUserId && !canActOnBehalfOfUser(verifiedDiscordId, requestedUserId, headerSecret)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden: Bạn chỉ được tạo API Key cho chính mình.' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (!discordUserId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Thiếu Discord User ID.' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const newToken = await generateCustomDiscordApiKey(discordUserId);
      const createdKey = await dbCreateUserApiKey(discordUserId, {
        id: `key_${discordUserId}_${Date.now()}`,
        name: keyName,
        token: newToken,
        createdAt: new Date().toISOString(),
      });
      const allKeys = await dbGetUserApiKeys(discordUserId);

      return new Response(
        JSON.stringify({
          success: true,
          key: createdKey,
          keys: allKeys,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, error: err.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  }

  if (request.method === 'DELETE') {
    try {
      const url = new URL(request.url);
      let keyId = url.searchParams.get('id') || '';
      let discordUserId = verifiedDiscordId || url.searchParams.get('discordUserId') || '';

      if (!keyId) {
        try {
          const body = await request.json();
          keyId = body.id || '';
          discordUserId = discordUserId || body.discordUserId || '';
        } catch {}
      }

      const requestedUserId = url.searchParams.get('discordUserId') || '';
      if (requestedUserId && !canActOnBehalfOfUser(verifiedDiscordId, requestedUserId, headerSecret)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden: Bạn chỉ được xóa API Key của chính mình.' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (!discordUserId || !keyId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Thiếu thông tin cần xóa.' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      await dbDeleteUserApiKey(discordUserId, keyId);
      const allKeys = await dbGetUserApiKeys(discordUserId);

      return new Response(
        JSON.stringify({
          success: true,
          keys: allKeys,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, error: err.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

