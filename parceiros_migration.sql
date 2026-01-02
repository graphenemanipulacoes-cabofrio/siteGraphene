create table public.parceiros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  nome_completo text not null,
  documento text not null,
  email text not null,
  whatsapp text not null,
  chave_pix text not null,
  banco text not null,
  agencia text not null,
  conta text not null,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado'))
);

-- Enable RLS
alter table public.parceiros enable row level security;

-- Policies
create policy "Permitir inserção pública" on public.parceiros for insert with check (true);
create policy "Permitir leitura e atualização total" on public.parceiros for all using (true) with check (true);
