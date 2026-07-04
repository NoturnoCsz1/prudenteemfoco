
-- =========================================================================
-- FASE 1 — Fundação de dados, identidade e segurança
-- Prudente em Foco 2026/2027
-- =========================================================================

-- Extensões utilitárias (idempotentes)
create extension if not exists "pgcrypto";

-- =========================================================================
-- ENUMS
-- =========================================================================

do $$ begin
  create type public.org_type as enum ('institutional', 'partner', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.org_status as enum ('active', 'inactive', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Papéis institucionais: hierarquia owner > admin > manager > operator > viewer
  create type public.member_role as enum ('owner', 'admin', 'manager', 'operator', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_status as enum ('active', 'invited', 'suspended', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_status as enum ('draft', 'scheduled', 'published', 'cancelled', 'archived');
exception when duplicate_object then null; end $$;

-- =========================================================================
-- FUNÇÕES AUXILIARES DE updated_at
-- =========================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- TABELA: profiles
-- =========================================================================

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
-- SEM grant para anon: perfis não são dados públicos nesta fase.

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Sem policy de DELETE: apagar é feito por cascade em auth.users.

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- =========================================================================
-- TABELA: organizations
-- =========================================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  type public.org_type not null default 'institutional',
  status public.org_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.organizations to authenticated;
grant all on public.organizations to service_role;
-- SEM grant para anon.

alter table public.organizations enable row level security;

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- =========================================================================
-- TABELA: organization_members
-- =========================================================================

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'viewer',
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists idx_org_members_user on public.organization_members(user_id);
create index if not exists idx_org_members_org on public.organization_members(organization_id);

grant select, insert, update, delete on public.organization_members to authenticated;
grant all on public.organization_members to service_role;

alter table public.organization_members enable row level security;

drop trigger if exists trg_org_members_updated_at on public.organization_members;
create trigger trg_org_members_updated_at
  before update on public.organization_members
  for each row execute function public.set_updated_at();

-- =========================================================================
-- FUNÇÕES DE PERMISSÃO (SECURITY DEFINER)
--
-- Motivo do SECURITY DEFINER: as policies de organizations e events precisam
-- consultar organization_members para decidir se o usuário atual é membro
-- ativo. Fazer isso via subquery direta em uma policy da própria tabela
-- organization_members causa "infinite recursion". Encapsular a checagem em
-- funções SECURITY DEFINER + STABLE, com search_path fixado em public,
-- resolve o problema de forma segura.
-- =========================================================================

create or replace function public.is_active_org_member(_user_id uuid, _org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.user_id = _user_id
      and m.organization_id = _org_id
      and m.status = 'active'
  );
$$;

-- Retorna o "rank" numérico de um papel. Ranks maiores = mais poder.
create or replace function public.role_rank(_role public.member_role)
returns int
language sql
immutable
as $$
  select case _role
    when 'owner'    then 50
    when 'admin'    then 40
    when 'manager'  then 30
    when 'operator' then 20
    when 'viewer'   then 10
  end;
$$;

-- Verifica se o usuário tem papel >= _min_role naquela organização, e está ativo.
create or replace function public.has_org_role_at_least(_user_id uuid, _org_id uuid, _min_role public.member_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.user_id = _user_id
      and m.organization_id = _org_id
      and m.status = 'active'
      and public.role_rank(m.role) >= public.role_rank(_min_role)
  );
$$;

-- =========================================================================
-- POLICIES: organizations
-- =========================================================================

drop policy if exists "orgs_select_if_member" on public.organizations;
create policy "orgs_select_if_member"
  on public.organizations for select
  to authenticated
  using (public.is_active_org_member(auth.uid(), id));

-- Escrita administrativa em organizations fica restrita a owner/admin.
drop policy if exists "orgs_update_if_admin" on public.organizations;
create policy "orgs_update_if_admin"
  on public.organizations for update
  to authenticated
  using (public.has_org_role_at_least(auth.uid(), id, 'admin'))
  with check (public.has_org_role_at_least(auth.uid(), id, 'admin'));

-- Sem policy de INSERT/DELETE no cliente nesta fase: novas organizações
-- são criadas via processo administrativo (server-side) em fase futura.

-- =========================================================================
-- POLICIES: organization_members
-- =========================================================================

-- O usuário pode ver seu próprio vínculo em qualquer organização.
drop policy if exists "org_members_select_self" on public.organization_members;
create policy "org_members_select_self"
  on public.organization_members for select
  to authenticated
  using (auth.uid() = user_id);

-- Owners/admins da organização podem ver todos os membros dela.
drop policy if exists "org_members_select_admins" on public.organization_members;
create policy "org_members_select_admins"
  on public.organization_members for select
  to authenticated
  using (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'));

-- Sem policies de INSERT/UPDATE/DELETE no cliente nesta fase:
-- gestão de membros será exposta em fase própria com fluxo server-side.

-- =========================================================================
-- TABELA: events
-- =========================================================================

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  slug text not null,
  status public.event_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  venue_name text,
  city text,
  short_description text,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists idx_events_org on public.events(organization_id);
create index if not exists idx_events_status on public.events(status);

grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
-- SEM grant para anon nesta fase: a exposição pública de eventos será
-- resolvida em fase própria com policy dedicada e projeção de colunas.

alter table public.events enable row level security;

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- Leitura: qualquer membro ativo da organização.
drop policy if exists "events_select_members" on public.events;
create policy "events_select_members"
  on public.events for select
  to authenticated
  using (public.is_active_org_member(auth.uid(), organization_id));

-- Criação: manager+ (owner, admin, manager).
drop policy if exists "events_insert_manager" on public.events;
create policy "events_insert_manager"
  on public.events for insert
  to authenticated
  with check (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'));

-- Edição: manager+.
drop policy if exists "events_update_manager" on public.events;
create policy "events_update_manager"
  on public.events for update
  to authenticated
  using (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'))
  with check (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'));

-- Exclusão: admin+ (proteção extra — operações destrutivas exigem papel maior).
drop policy if exists "events_delete_admin" on public.events;
create policy "events_delete_admin"
  on public.events for delete
  to authenticated
  using (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'));

-- =========================================================================
-- TABELA: audit_logs
-- =========================================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_org on public.audit_logs(organization_id);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_user_id);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);

-- audit_logs é somente-leitura para o cliente: nenhum INSERT/UPDATE/DELETE.
-- A escrita será feita exclusivamente por server functions confiáveis
-- (service_role) em fases futuras.
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;

alter table public.audit_logs enable row level security;

-- Leitura restrita: apenas owner/admin da organização.
drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin"
  on public.audit_logs for select
  to authenticated
  using (
    organization_id is not null
    and public.has_org_role_at_least(auth.uid(), organization_id, 'admin')
  );

-- Sem policies de INSERT/UPDATE/DELETE: negado por padrão para o cliente.

-- Função auxiliar para escrita de auditoria (uso futuro em server functions).
-- SECURITY DEFINER: precisa gravar em audit_logs contornando a ausência de
-- policies de INSERT para o cliente. Só deve ser chamada por caminhos de
-- confiança (server functions autenticadas / service_role).
create or replace function public.record_audit_event(
  _organization_id uuid,
  _actor_user_id uuid,
  _action text,
  _entity_type text,
  _entity_id uuid,
  _metadata jsonb default '{}'::jsonb,
  _ip inet default null,
  _user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.audit_logs(
    organization_id, actor_user_id, action, entity_type, entity_id,
    metadata, ip_address, user_agent
  ) values (
    _organization_id, _actor_user_id, _action, _entity_type, _entity_id,
    coalesce(_metadata, '{}'::jsonb), _ip, _user_agent
  )
  returning id into new_id;
  return new_id;
end;
$$;

-- Não expor a função de escrita a anon/authenticated no cliente.
revoke all on function public.record_audit_event(uuid, uuid, text, text, uuid, jsonb, inet, text) from public, anon, authenticated;
grant execute on function public.record_audit_event(uuid, uuid, text, text, uuid, jsonb, inet, text) to service_role;

-- =========================================================================
-- TRIGGER: cria profile automaticamente após signup em auth.users
--
-- SECURITY DEFINER: auth.users é um schema gerenciado; o trigger precisa
-- inserir em public.profiles em nome do sistema. Search_path fixado.
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
