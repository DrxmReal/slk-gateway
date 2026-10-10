import {
  corsHeaders,
  checkAuth,
  generateCustomDiscordApiKey,
} from './_utils.js';

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
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const authorized = await checkAuth(request);
  if (!authorized) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized: Vui lòng đăng nhập Discord trước.' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    const body = await request.json();
    const discordUserId = String(body.discordUserId || '').trim();
    const keyName = String(body.name || 'API Key mới').trim();

    if (!discordUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu Discord User ID.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const newKey = await generateCustomDiscordApiKey(discordUserId);

    return new Response(
      JSON.stringify({
        success: true,
        key: {
          id: `key_${Date.now()}`,
          name: keyName,
          token: newKey,
          createdAt: new Date().toISOString(),
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
