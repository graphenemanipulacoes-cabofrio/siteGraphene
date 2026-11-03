-- O limite de cadastro passou para a função customer-signup. O hook nunca foi ligado no painel.
drop function if exists public.hook_limit_signups(jsonb);
