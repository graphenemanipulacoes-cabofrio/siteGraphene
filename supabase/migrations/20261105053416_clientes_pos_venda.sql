-- Pós-venda: preferência de contato, próximo retorno e anotações da equipe.
-- Só o admin lê, pelas funções do servidor. A chave é o id da conta ou o telefone de quem só pediu orçamento.
create table if not exists public.customer_followups (
  customer_key text primary key check (customer_key ~* '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|tel:[0-9]{10,11})$'),
  contact_preference text not null default 'unknown' check (contact_preference in ('unknown', 'allowed', 'refused')),
  next_contact_on date,
  updated_by text,
  updated_at timestamptz not null default now()
);
comment on table public.customer_followups is 'Se a pessoa aceita contato e quando a equipe deve retornar. refused tira a pessoa da lista de contato e da planilha exportada.';

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_key text not null check (customer_key ~* '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|tel:[0-9]{10,11})$'),
  kind text not null default 'note' check (kind in ('note', 'contact')),
  note text not null check (char_length(note) between 2 and 1000),
  created_by text,
  created_at timestamptz not null default now()
);
comment on table public.customer_notes is 'Anotações do pós-venda. Não registrar dados de saúde: receitas e orçamentos ficam em solicitacoes.';
create index if not exists customer_notes_key_idx on public.customer_notes(customer_key, created_at desc);

alter table public.customer_followups enable row level security;
alter table public.customer_notes enable row level security;
revoke all on public.customer_followups, public.customer_notes from anon, authenticated;
