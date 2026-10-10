import {
  corsHeaders,
  DEFAULT_DISCORD_CLIENT_ID,
  DEFAULT_DISCORD_CLIENT_SECRET,
  generateDiscordUserApiKey,
} from '../_utils.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    const body = await request.json();
    let accessToken = body.access_token || '';
    const code = body.code || '';
    const redirectUri = body.redirect_uri || '';

    // Nếu dùng Authorization Code Flow (có code + client_secret)
    if (!accessToken && code) {
      const clientId = (process.env.DISCORD_CLIENT_ID || body.client_id || DEFAULT_DISCORD_CLIENT_ID).trim();
      const clientSecret = (process.env.DISCORD_CLIENT_SECRET || DEFAULT_DISCORD_CLIENT_SECRET).trim();

      const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      });

      const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        return new Response(
          JSON.stringify({
            success: false,
            error: tokenData.error_description || 'Không thể đổi mã OAuth2 với Discord. Hãy kiểm tra Redirect URI trong Discord Developer Portal.'
          }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      accessToken = tokenData.access_token;
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu access_token từ Discord.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Xác thực token trực tiếp với Discord API /users/@me
    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userRes.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token Discord không hợp lệ hoặc đã hết hạn.' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const discordUser = await userRes.json();
    const apiKey = await generateDiscordUserApiKey(discordUser.id);

    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(discordUser.id) >> 22n) % 6}.png`;

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: discordUser.id,
          username: discordUser.username,
          global_name: discordUser.global_name || discordUser.username,
          avatar_url: avatarUrl,
        },
        apiKey: apiKey,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: `Lỗi xác thực Discord: ${err.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
