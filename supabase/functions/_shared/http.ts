export const json = (body: unknown, status = 200, origin?: string) => new Response(status === 204 ? null : JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': origin || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
  },
});

export const allowedOrigin = (requestOrigin: string | null) => {
  const siteUrl = Deno.env.get('SITE_URL') || '';
  // Testes no computador: localhost em qualquer porta (npm run dev / preview).
  const local = /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(requestOrigin || '');
  return requestOrigin && (requestOrigin === siteUrl || local) ? requestOrigin : null;
};
