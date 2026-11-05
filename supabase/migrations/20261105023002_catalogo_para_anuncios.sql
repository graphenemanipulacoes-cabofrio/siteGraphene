-- Catálogo preparado para anunciar no Google. Sugestão técnica, sujeita à revisão da
-- responsável técnica. Nada é apagado: os produtos seguem no admin e os textos antigos
-- ficam guardados em produtos_textos_anteriores (sem acesso pelo navegador).
create table if not exists public.produtos_textos_anteriores (
  product_id bigint primary key references public.produtos(id) on delete cascade,
  name text not null,
  description text,
  saved_at timestamptz not null default now()
);
alter table public.produtos_textos_anteriores enable row level security;
revoke all on public.produtos_textos_anteriores from anon, authenticated;

insert into public.produtos_textos_anteriores (product_id, name, description)
select id, name, description from public.produtos
on conflict (product_id) do nothing;

-- Fora do site até a revisão: medicamento, venda sob prescrição, dose acima do limite de
-- suplemento, ingrediente com alerta recente da Anvisa ou venda baseada em emagrecimento.
update public.produtos set is_active = false where id in (
  1,  -- Melatonina 5mg
  2,  -- Ashwagandha 300mg
  3,  -- Laranja moro 500mg
  4,  -- Composto Termogênico
  5,  -- Maca Peruana
  27, -- Glucosamina + Condroitina + MSM
  28, -- Minoxidil 5% Loção
  32, -- N-Acetilcisteína (NAC) 600mg
  33, -- Berberina 500mg
  37  -- Ácido Azelaico 15% Gel
);

-- Textos sem promessa de tratamento ou resultado.
update public.produtos as p set description = t.description
from (values
  (8,  'Cúrcuma 500mg (Curcumina 95%). Converse com nossos farmacêuticos sobre o uso.'),
  (9,  'Colágeno Verisol® 2.5g por sachê, para incluir na rotina de cuidados com a pele.'),
  (11, 'Resveratrol 250mg (Trans-Resveratrol). Converse com nossos farmacêuticos sobre o uso.'),
  (12, 'Coenzima Q10 100mg. Converse com nossos farmacêuticos sobre o uso.'),
  (13, 'Ômega 3 1000mg. Óleo de peixe, fonte de EPA e DHA.'),
  (14, 'Zinco Quelado 30mg. Mineral que auxilia no funcionamento do sistema imune.'),
  (18, 'Vitamina B12 1mg na forma metilcobalamina. Contribui para o funcionamento do sistema nervoso e para a formação das células do sangue.'),
  (19, 'Magnésio L-Treonato 300mg. Converse com nossos farmacêuticos sobre o uso.'),
  (20, 'Cafeína 200mg. Converse com nossos farmacêuticos sobre o melhor horário de uso.'),
  (21, 'Lactobacillus acidophilus 1 bilhão UFC. Converse com nossos farmacêuticos sobre o uso.'),
  (23, 'Goma de Melatonina 0,21mg. Para adultos a partir de 19 anos. Não indicada para gestantes e lactantes.'),
  (24, 'Melatonina em gotas 0,21mg. Para adultos a partir de 19 anos. Não indicada para gestantes e lactantes.'),
  (25, 'L-Glutamina em pó. Aminoácido muito usado na rotina de treinos.'),
  (26, 'Colágeno Tipo II não desnaturado 40mg. Converse com nossos farmacêuticos sobre o uso.'),
  (29, 'Passiflora 200mg (extrato de maracujá). Converse com nossos farmacêuticos sobre o uso.'),
  (30, 'L-Teanina 200mg. Aminoácido presente no chá verde.'),
  (31, 'L-Triptofano 500mg. Converse com nossos farmacêuticos sobre o uso.'),
  (34, 'Picolinato de Cromo 200mcg. Mineral que contribui para o metabolismo dos carboidratos.'),
  (38, 'Gel de Arnica 10% para uso externo. Converse com nossos farmacêuticos sobre o uso.'),
  (39, 'Pomada de Dexpantenol 5%. Hidrata a pele ressecada.')
) as t(id, description)
where p.id = t.id;
