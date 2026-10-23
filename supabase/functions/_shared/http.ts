export const json = (body: unknown, status = 200, origin?: string) => new Response(status === 204 ? null : JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': origin || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token, x-region, x-retry-count, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, traceparent, tracestate, baggage',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
  },
});

export const allowedOrigin = (requestOrigin: string | null) => {
  const trusted = new Set(['https://www.graphenemanipulacoes.com.br', 'https://graphenemanipulacoes.com.br', 'https://site-graphene.vercel.app']);
  try { trusted.add(new URL(Deno.env.get('SITE_URL') || '').origin); } catch { /* Unknown origins stay blocked. */ }
  // Testes no computador: localhost em qualquer porta (npm run dev / preview).
  const local = /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(requestOrigin || '');
  return requestOrigin && (trusted.has(requestOrigin) || local) ? requestOrigin : null;
};
