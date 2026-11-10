-- Decisão do dono em 10/11/2026: a divulgação passa a ser por influenciadoras e pelo Meta,
-- e não pelo Google. Voltam ao site os 10 produtos que a migração catalogo_para_anuncios
-- tirou em 05/11/2026. Nenhum outro produto estava fora do site e não havia ação
-- "product_active" no registro de ações, então a lista é a mesma daquela migração.
-- Os textos sem promessa de resultado continuam; os anteriores seguem guardados em
-- produtos_textos_anteriores.
update public.produtos set is_active = true where id in (
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
