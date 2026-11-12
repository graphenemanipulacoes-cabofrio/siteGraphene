-- Códigos impressos embaixo do QR code dos rótulos (página /qrcode).
-- Produtos da loja não precisam de linha aqui: o código deles é G + número do produto (G14 = produto 14),
-- então todo produto novo já nasce com código. Esta tabela guarda fórmulas que não estão na loja
-- (ex.: HFC01, Hair Fiber Complex) e, se um dia for preciso, um código especial ligado a um produto.
-- Leitura pública só dos códigos ativos (o código já vem impresso no rótulo); gravação só pelo servidor.

create table if not exists public.codigos_qr (
    codigo text primary key
        check (codigo ~ '^[A-Z0-9]{2,12}$' and codigo !~ '^G[0-9]+$'),
    nome text not null check (char_length(nome) between 2 and 120),
    produto_id bigint references public.produtos(id) on delete set null,
    ativo boolean not null default true,
    created_at timestamptz not null default now()
);

comment on table public.codigos_qr is
    'Códigos do rótulo lidos na página /qrcode. Produtos da loja usam G + id e não entram aqui.';

alter table public.codigos_qr enable row level security;

revoke all on public.codigos_qr from anon, authenticated;
grant select on public.codigos_qr to anon, authenticated;

drop policy if exists "codigos_qr_leitura_publica" on public.codigos_qr;
create policy "codigos_qr_leitura_publica" on public.codigos_qr
    for select to anon, authenticated
    using (ativo);

insert into public.codigos_qr (codigo, nome)
values ('HFC01', 'Hair Fiber Complex')
on conflict (codigo) do nothing;
