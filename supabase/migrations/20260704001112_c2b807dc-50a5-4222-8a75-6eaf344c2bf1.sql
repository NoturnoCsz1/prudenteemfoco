
-- Fixa search_path também em role_rank (linter: function_search_path_mutable)
create or replace function public.role_rank(_role public.member_role)
returns int
language sql
immutable
set search_path = public
as $$
  select case _role
    when 'owner'    then 50
    when 'admin'    then 40
    when 'manager'  then 30
    when 'operator' then 20
    when 'viewer'   then 10
  end;
$$;

-- Trigger de perfil: revoga execução para papéis do cliente.
-- É chamada apenas pelo trigger em auth.users; não deve ser exposta.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- role_rank: função pura utilitária; revoga anon.
revoke all on function public.role_rank(public.member_role) from public, anon;
grant execute on function public.role_rank(public.member_role) to authenticated, service_role;

-- Helpers de RLS: precisam ser executáveis por authenticated para que as
-- policies funcionem. Revoga anon e concede apenas authenticated/service_role.
revoke all on function public.is_active_org_member(uuid, uuid) from public, anon;
grant execute on function public.is_active_org_member(uuid, uuid) to authenticated, service_role;

revoke all on function public.has_org_role_at_least(uuid, uuid, public.member_role) from public, anon;
grant execute on function public.has_org_role_at_least(uuid, uuid, public.member_role) to authenticated, service_role;

-- set_updated_at é usada apenas via triggers; revoga do cliente.
revoke all on function public.set_updated_at() from public, anon, authenticated;
