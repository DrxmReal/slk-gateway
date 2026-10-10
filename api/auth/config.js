import { corsHeaders } from '../_utils.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const clientId = (process.env.DISCORD_CLIENT_ID || '').trim();
  const hasSecret = Boolean((process.env.DISCORD_CLIENT_SECRET || '').trim());

  return new Response(
    JSON.stringify({
      configured: Boolean(clientId),
      clientId: clientId,
      hasSecret: hasSecret,
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
