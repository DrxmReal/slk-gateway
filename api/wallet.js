import {
  corsHeaders,
  checkAuth,
  extractVerifiedDiscordUserId,
  isAllowedAdminDiscordId,
  checkAdminSecret,
} from './_utils.js';
import {
  getWalletInfo,
  formatVnd,
  MODEL_REQUEST_FEE_VND,
  DEFAULT_USER_BALANCE_VND,
} from './_wallet.js';

export const config = {
  runtime: 'edge',
};

// GET /api/wallet                 -> Ví của chính user đang đăng nhập
// GET /api/wallet?discordUserId=X -> Ví của user X (chỉ Admin)
export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
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
  const verifiedUid = await extractVerifiedDiscordUserId(bearerToken);

  const url = new URL(request.url);
  const headerSecret = request.headers.get('x-admin-secret') || url.searchParams.get('secret') || '';
  const targetUserId = (url.searchParams.get('discordUserId') || verifiedUid || '').trim();

  if (!targetUserId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Thiếu Discord User ID.' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Xem ví của người khác -> bắt buộc quyền Admin
  if (verifiedUid && targetUserId !== verifiedUid) {
    const isAdmin = isAllowedAdminDiscordId(verifiedUid) || checkAdminSecret(headerSecret, verifiedUid);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Chỉ Admin mới được xem ví của user khác.' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  }

  const info = await getWalletInfo(targetUserId);

  return new Response(
    JSON.stringify({
      success: true,
      discordUserId: targetUserId,
      balanceVnd: info.balanceVnd,
      balanceLabel: formatVnd(info.balanceVnd),
      transactions: info.transactions,
      pricing: MODEL_REQUEST_FEE_VND,
      defaultBalanceVnd: DEFAULT_USER_BALANCE_VND,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}
