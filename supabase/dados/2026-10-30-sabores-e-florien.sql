-- Pedido do dono (30/10/2026). Já aplicado no banco.
-- 1) Frutas vermelhas sai de todos os produtos e vira uva (difícil de obter).
-- 2) Whey isolado sem baunilha, provisoriamente, até achar um bom fornecedor.
-- 3) Florien/Fagron fora do site por enquanto (Drenow C® e Akkermat®).
-- Os sabores "frutas-vermelhas" e "baunilha" continuam na tabela sabores para voltar pelo admin.

update public.produtos set options = jsonb_set(options, '{flavors}', '["laranja", "morango", "uva"]'::jsonb)
where id = 15 and options -> 'flavors' = '["laranja", "morango", "uva", "frutas-vermelhas"]'::jsonb;

update public.produtos set options = jsonb_set(options, '{flavors}', '["uva", "limao", "laranja", "abacaxi", "maracuja"]'::jsonb)
where id = 9 and options -> 'flavors' = '["frutas-vermelhas", "limao", "laranja", "abacaxi", "maracuja"]'::jsonb;

update public.produtos set options = jsonb_set(options, '{flavors}', '["morango", "uva", "laranja"]'::jsonb)
where id = 22 and options -> 'flavors' = '["morango", "frutas-vermelhas", "uva", "laranja"]'::jsonb;

update public.produtos set options = jsonb_set(options, '{flavors}', '["chocolate", "morango"]'::jsonb)
where id = 16 and options -> 'flavors' = '["chocolate", "baunilha", "morango"]'::jsonb;

delete from public.materias_primas where id in (8, 9) and lab = 'Florien';

-- Para recolocar a Florien quando o dono pedir (sem imagem cadastrada na época):
-- insert into public.materias_primas (name, lab, category, headline, description, tags, display_order) values
-- ('Drenow C®', 'Florien', 'Compostos bioativos', 'Composição com vitamina C e bioflavonoides', 'Matéria-prima apresentada pela Florien. Peça informações sobre composição, documentação e disponibilidade.', ARRAY['Vitamina C', 'Bioflavonoides', 'Florien']::text[], 7),
-- ('Akkermat®', 'Florien', 'Compostos bioativos', 'Matéria-prima em apresentação beadlets', 'Ingrediente apresentado pela Florien. Nossa equipe pode esclarecer as especificações técnicas fornecidas pelo fabricante.', ARRAY['Beadlets', 'Florien', 'Documentação técnica']::text[], 8);
-- E voltar 'Florien' na lista de fornecedores de src/components/AuthenticityRibbon.jsx.
