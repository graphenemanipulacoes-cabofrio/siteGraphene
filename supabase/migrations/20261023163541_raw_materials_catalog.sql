-- Preserve the existing public catalogue; changes are made only by the
-- authenticated staff Edge Function, never with a browser database grant.
create table public.materias_primas (
  id bigint generated always as identity primary key,
  name text not null check (length(trim(name)) between 1 and 180),
  lab text not null default '' check (length(lab) <= 180),
  category text not null check (length(trim(category)) between 1 and 100),
  headline text not null default '' check (length(headline) <= 300),
  description text not null default '' check (length(description) <= 4000),
  tags text[] not null default '{}' check (cardinality(tags) <= 8 and array_position(tags, null) is null),
  image_url text check (image_url is null or (length(image_url) <= 1200 and image_url ~ '^https://')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index materias_primas_display_idx on public.materias_primas(display_order, name);
alter table public.materias_primas enable row level security;
revoke all on public.materias_primas from public, anon, authenticated;
grant select on public.materias_primas to anon, authenticated;
grant select, insert, update, delete on public.materias_primas to service_role;
grant usage, select on sequence public.materias_primas_id_seq to service_role;
create policy "Public catalogue read only" on public.materias_primas for select to anon, authenticated using (true);

insert into public.materias_primas (name, lab, category, headline, description, tags, display_order) values
('Ormona®', 'Ages Bioactive Compounds', 'Compostos bioativos', 'Matéria-prima da Ages Bioactive Compounds', 'Conheça as informações técnicas disponibilizadas pelo fornecedor. A adequação a uma fórmula individualizada depende de avaliação profissional.', ARRAY['Ages Bioactive', 'Informações técnicas', 'Uso individualizado']::text[], 0),
('Terasen®', 'Ages Bioactive Compounds', 'Extratos vegetais', 'Bioativos de origem vegetal', 'Matéria-prima apresentada pela Ages Bioactive Compounds. Nossa equipe pode orientar sobre documentação, composição e disponibilidade.', ARRAY['Origem vegetal', 'Ages Bioactive', 'Documentação técnica']::text[], 1),
('Chronic®', 'Ages Bioactive Compounds', 'Extratos vegetais', 'Extrato vegetal padronizado', 'Matéria-prima derivada de Bixa orellana. Consulte nossa equipe sobre suas características técnicas e critérios de utilização.', ARRAY['Bixa orellana', 'Extrato vegetal', 'Ages Bioactive']::text[], 2),
('GliSODin®', 'Lemma Supply', 'Compostos bioativos', 'Composição à base de SOD e gliadina', 'Conheça a composição e a documentação técnica dessa matéria-prima apresentada pela Lemma Supply.', ARRAY['SOD', 'Gliadina', 'Lemma Supply']::text[], 3),
('Mitburn®', 'Biodiversité', 'Extratos vegetais', 'Matéria-prima de origem vegetal', 'Ingrediente apresentado pela Biodiversité. Nossa equipe pode informar características, documentação e disponibilidade.', ARRAY['Origem vegetal', 'Biodiversité', 'Consulta técnica']::text[], 4),
('Zembrin®', 'Lemma Supply', 'Extratos vegetais', 'Extrato botânico padronizado', 'Matéria-prima de Sceletium tortuosum apresentada pela Lemma Supply. Consulte a equipe farmacêutica sobre informações técnicas.', ARRAY['Sceletium tortuosum', 'Extrato botânico', 'Lemma Supply']::text[], 5),
('Exsynutriment®', 'AQIA • Biotec', 'Compostos bioativos', 'Composto de silício orgânico', 'Conheça a apresentação e a documentação técnica dessa matéria-prima fornecida pela AQIA Biotec.', ARRAY['Silício orgânico', 'AQIA Biotec', 'Consulta técnica']::text[], 6),
('Drenow C®', 'Florien', 'Compostos bioativos', 'Composição com vitamina C e bioflavonoides', 'Matéria-prima apresentada pela Florien. Peça informações sobre composição, documentação e disponibilidade.', ARRAY['Vitamina C', 'Bioflavonoides', 'Florien']::text[], 7),
('Akkermat®', 'Florien', 'Compostos bioativos', 'Matéria-prima em apresentação beadlets', 'Ingrediente apresentado pela Florien. Nossa equipe pode esclarecer as especificações técnicas fornecidas pelo fabricante.', ARRAY['Beadlets', 'Florien', 'Documentação técnica']::text[], 8),
('Bio-Arct®', 'AQIA • Biotec', 'Compostos bioativos', 'Matéria-prima de origem marinha', 'Conheça a composição e as informações técnicas desse ingrediente apresentado pela AQIA Biotec.', ARRAY['Origem marinha', 'AQIA Biotec', 'Consulta técnica']::text[], 9),
('Glycoxil®', 'AQIA • Biotec', 'Compostos bioativos', 'Ingrediente com documentação do fornecedor', 'Matéria-prima apresentada pela AQIA Biotec. Consulte a equipe para informações sobre composição e critérios de uso.', ARRAY['AQIA Biotec', 'Informações técnicas', 'Uso individualizado']::text[], 10),
('PhyTgen®', 'Lemma Supply', 'Compostos bioativos', 'Associação de fucoxantina e óleo de romã', 'Conheça as características técnicas dessa matéria-prima apresentada pela Lemma Supply. Uso em fórmula sujeito à avaliação profissional.', ARRAY['Fucoxantina', 'Óleo de romã', 'Lemma Supply']::text[], 11);
