// Visual QA only. This separate localhost server never contacts Supabase.
// Neither this plugin nor its synthetic session is used by the app/build config.
import { createServer } from 'vite';

const order = {
  id: '11111111-1111-4111-8111-111111111111', customer_email: 'cliente@example.invalid',
  customer_document: null, shipping_address: { name: 'Cliente de demonstração', phone: '', address: 'Rua de demonstração', number: '10', neighborhood: 'Bairro exemplo', city: 'Cabo Frio', state: 'RJ', zip: '00000-000', complement: 'Dados fictícios para teste visual' },
  subtotal: 180, shipping_amount: 20, total: 182, discount_code: 'DEMO10', discount_amount: 18,
  status: 'processing', payment_status: 'paid', payment_reference: 'DEMONSTRAÇÃO', payment_method: 'Pix',
  created_at: '2026-10-08T13:00:00Z', updated_at: '2026-10-08T14:00:00Z', paid_at: '2026-10-08T13:02:00Z',
  carrier: null, tracking_code: null, invoice_number: null, invoice_url: null,
  admin_notes: 'Ficha fictícia para conferir legibilidade e impressão. Não enviar e não emitir nota fiscal.',
  order_items: [{ id: 'demo-item', product_id: 1, product_name: 'Produto de demonstração · 60 cápsulas', unit_price: 90, quantity: 2 }],
};
const request = { id: 1, nome_cliente: 'Solicitação fictícia', whatsapp: '', status: 'active', created_at: '2026-10-08T15:00:00Z', observacoes: 'Conteúdo de demonstração. Nenhum documento de saúde real foi utilizado.' };
const source = `
const order = ${JSON.stringify(order)};
const request = ${JSON.stringify(request)};
export async function counterRequest(body) {
  if (body.action === 'summary') return {preparation:1, shipped:0, requests:1};
  if (body.action === 'list_orders') return {rows:[order],total:1};
  if (body.action === 'order_detail') return {order,products:[{id:1,name:'Produto de demonstração',description:'Descrição fictícia para consulta visual.'}]};
  if (body.action === 'list_requests') return {rows:[request],total:1};
  if (body.action === 'request_detail') return {request,files:[]};
  if (body.action === 'logout') return {ok:true};
  throw new Error('Servidor de demonstração; autenticação real não disponível aqui.');
}`;
const server = await createServer({
  configLoader: 'native',
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
  plugins: [{
    name: 'counter-isolated-visual-qa',
    transform(code, id) {
      const path = id.replaceAll('\\', '/').split('?')[0];
      if (path.endsWith('/src/lib/counterApi.js')) return { code: source, map: null };
      if (path.endsWith('/src/utils/counter.js')) return { code: code.replace(/export function readCounterSession\(\)[\s\S]*?export function clearCounterSession/, `export function readCounterSession() { return {token:'${'a'.repeat(64)}',user:{username:'demo',displayName:'Equipe · demonstração'}}; }\nexport function clearCounterSession`), map: null };
    },
    transformIndexHtml(html) { return html.replace('<body>', '<body><div style="position:sticky;top:0;z-index:9999;padding:5px;text-align:center;background:#fbe6aa;color:#684b0c;font:12px Arial">DEMONSTRAÇÃO LOCAL · DADOS FICTÍCIOS · NÃO É UM PEDIDO REAL</div>'); },
  }],
});
await server.listen();
console.log('Visual QA: http://127.0.0.1:5174/balcaographene (isolated synthetic data)');
process.on('SIGINT', async () => { await server.close(); process.exit(0); });
