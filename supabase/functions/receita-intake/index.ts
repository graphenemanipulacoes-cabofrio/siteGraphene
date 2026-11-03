import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, json } from '../_shared/http.ts';
import { clientIp, takeRateLimit } from '../_shared/counter-security.ts';

// Envio público de receitas e solicitações (página /receita, sem login).
// O navegador não grava mais direto no banco nem no Storage: esta função aplica os limites,
// entrega links de envio de uso único e registra a solicitação.
const contentTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };
const intakePathPattern = /^intake\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|jpeg|png|pdf)$/;
const MAX_FILES = 15;
const HOUR = 3600;
const DAY = 86400;
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);

  try {
    const raw = await req.text();
    if (raw.length > 30_000) return json({ error: 'invalid_request' }, 400, origin);
    const body = JSON.parse(raw);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const ip = clientIp(req);

    if (body?.action === 'prepare') {
      const extensions = Array.isArray(body.extensions) ? body.extensions.map((value: unknown) => clean(value, 5).toLowerCase()) : [];
      if (!extensions.length || extensions.length > MAX_FILES || extensions.some((value: string) => !contentTypes[value])) return json({ error: 'invalid_files' }, 400, origin);
      // Primeiro o limite por endereço, para um único abusador não gastar o limite geral do dia.
      const perIp = await takeRateLimit(admin, 'receita-envio-ip', ip, 6, HOUR);
      if (perIp === null) return json({ error: 'intake_unavailable' }, 503, origin);
      if (!perIp) return json({ error: 'too_many_requests' }, 429, origin);
      const daily = await takeRateLimit(admin, 'receita-arquivos-dia', 'geral', 60, DAY, extensions.length);
      if (daily === null) return json({ error: 'intake_unavailable' }, 503, origin);
      if (!daily) return json({ error: 'too_many_requests' }, 429, origin);

      const uploads = [];
      for (const extension of extensions) {
        const { data, error } = await admin.storage.from('receitas-privadas').createSignedUploadUrl(`intake/${crypto.randomUUID()}.${extension}`);
        if (error || !data?.token) return json({ error: 'intake_unavailable' }, 503, origin);
        uploads.push({ path: data.path, token: data.token, contentType: contentTypes[extension] });
      }
      return json({ uploads }, 200, origin);
    }

    if (body?.action === 'submit') {
      const name = clean(body.name, 160);
      const phone = clean(body.phone, 30);
      const notes = clean(body.notes, 5000);
      const paths = Array.isArray(body.paths) ? [...new Set(body.paths.filter((value: unknown): value is string => typeof value === 'string'))] : [];
      const phoneDigits = phone.replace(/\D/g, '').length;
      if (name.length < 3 || phoneDigits < 10 || phoneDigits > 13 || paths.length > MAX_FILES || paths.some(path => !intakePathPattern.test(path)) || (!paths.length && !notes)) {
        return json({ error: 'invalid_request' }, 400, origin);
      }
      const perIp = await takeRateLimit(admin, 'receita-pedido-ip', ip, 6, HOUR);
      if (perIp === null) return json({ error: 'intake_unavailable' }, 503, origin);
      if (!perIp) return json({ error: 'too_many_requests' }, 429, origin);
      const daily = await takeRateLimit(admin, 'receita-pedidos-dia', 'geral', 60, DAY);
      if (daily === null) return json({ error: 'intake_unavailable' }, 503, origin);
      if (!daily) return json({ error: 'too_many_requests' }, 429, origin);

      const { error } = await admin.from('solicitacoes').insert({ nome_cliente: name, whatsapp: phone, arquivo_url: JSON.stringify(paths), observacoes: notes || null });
      if (error) return json({ error: 'intake_unavailable' }, 503, origin);
      return json({ ok: true }, 201, origin);
    }

    return json({ error: 'invalid_request' }, 400, origin);
  } catch {
    return json({ error: 'invalid_request' }, 400, origin);
  }
});
