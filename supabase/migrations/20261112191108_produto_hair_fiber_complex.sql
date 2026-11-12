-- Hair Fiber Complex (fórmula capilar com rótulo próprio, aprovada pelo dono em 12/11/2026).
-- Entra ESCONDIDO (is_active = false) e SEM PREÇO: o público não lê (RLS) e o checkout recusa.
-- O dono define o preço e usa "Colocar no site" no admin quando quiser publicar.
-- Composição por cápsula conferida pelo farmacêutico (Rodrigo Azevedo Medeiros, CRF-RJ 12-472).
-- Também liga o código HFC01 do rótulo (/qrcode) ao produto: enquanto estiver escondido,
-- a página continua oferecendo só o WhatsApp; depois de publicado, mostra "Ver na loja".

with novo as (
    insert into public.produtos (name, description, price, image_url, display_order, options, is_active, composition, warnings)
    select
        'Hair Fiber Complex',
        'Fórmula capilar manipulada com biotina, colágeno hidrolisado, silício orgânico, complexo B (B1, B2, B3, B6 e B12), zinco e ferro. Pote com 60 cápsulas.',
        null,
        '/assets/products/hair-fiber-complex.png',
        coalesce((select max(display_order) from public.produtos), 0) + 1,
        '{"sizes":[{"id":"60-capsulas","label":"60 cápsulas","price":null}],"flavors":[],"natural":false,"flavor_price":0}'::jsonb,
        false,
        E'Por cápsula:\nSilício orgânico: 100 mg\nBiotina: 5 mg\nColágeno hidrolisado: 500 mg\nVitamina B1: 25 mg\nVitamina B2: 25 mg\nVitamina B3: 50 mg\nVitamina B6: 25 mg\nVitamina B12: 500 mcg\nZinco quelado: 20 mg\nFerro quelado: 20 mg\nExcipiente q.s.p.: 1 cápsula',
        E'Modo de uso: tomar 2 cápsulas ao dia.\nConservar em local seco e fresco, ao abrigo da luz.\nManter fora do alcance de crianças.'
    where not exists (select 1 from public.produtos where name = 'Hair Fiber Complex')
    returning id
)
update public.codigos_qr
set produto_id = (select id from novo)
where codigo = 'HFC01' and exists (select 1 from novo);
