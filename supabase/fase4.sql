-- =============================================================================
-- RAKÜN · base de datos · fase 4: grabaciones y reuniones
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → Run.
-- Requiere schema.sql, fase2.sql y fase3.sql. Se puede volver a correr.
-- =============================================================================

-- ---------- El equipo visible para los clientes (solo nombre, área y color) ----------
create or replace function public.team_members()
returns table (id uuid, full_name text, area text, color text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.area, p.color from public.profiles p
  where p.role in ('admin', 'equipo') and auth.uid() is not null
  order by p.full_name
$$;
revoke all on function public.team_members() from public, anon;
grant execute on function public.team_members() to authenticated;

-- ---------- Grabaciones ----------
create table if not exists public.shoots (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  client_id        uuid not null references public.clients (id) on delete cascade,
  project_id       uuid references public.projects (id) on delete set null,
  starts_at        timestamptz not null,
  duration_hours   numeric(4, 1) not null default 3 check (duration_hours > 0 and duration_hours <= 24),
  location         text check (char_length(location) <= 160),
  address          text check (char_length(address) <= 300),
  crew             uuid[] not null default '{}',             -- ids del equipo que va
  prep             text[] not null default '{}',             -- qué debe preparar el cliente
  status           text not null default 'programada' check (status in ('programada', 'realizada', 'cancelada')),
  client_response  text check (client_response in ('confirmada', 'reprogramar')),
  client_note      text
);
alter table public.shoots enable row level security;
create index if not exists shoots_client_date_idx on public.shoots (client_id, starts_at);

drop policy if exists "el equipo maneja grabaciones" on public.shoots;
create policy "el equipo maneja grabaciones" on public.shoots
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "el cliente ve sus grabaciones" on public.shoots;
create policy "el cliente ve sus grabaciones" on public.shoots
  for select to authenticated using (public.owns_client(client_id));

-- El cliente confirma o pide otra fecha (solo eso)
create or replace function public.respond_shoot(shoot_id uuid, response text, note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare s public.shoots;
begin
  select * into s from public.shoots where id = shoot_id;
  if s.id is null or not public.owns_client(s.client_id) then raise exception 'No tienes acceso a esta grabación.'; end if;
  if s.status <> 'programada' or s.starts_at < now() then raise exception 'Esta grabación ya no se puede cambiar.'; end if;
  if response not in ('confirmada', 'reprogramar') then raise exception 'Respuesta no válida.'; end if;
  update public.shoots
     set client_response = response,
         client_note = case when response = 'reprogramar' then left(coalesce(note, ''), 1000) else null end
   where id = shoot_id;
end $$;
revoke all on function public.respond_shoot(uuid, text, text) from public, anon;
grant execute on function public.respond_shoot(uuid, text, text) to authenticated;


-- ---------- Reuniones ----------
create table if not exists public.meetings (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  project_id    uuid references public.projects (id) on delete set null,
  title         text not null check (char_length(title) between 2 and 160),
  kind          text not null default 'dudas' check (kind in ('arranque', 'revision', 'dudas', 'entrega', 'reporte')),
  starts_at     timestamptz,                                  -- vacío mientras está "solicitada"
  duration_min  int not null default 20 check (duration_min between 5 and 480),
  link          text check (link is null or link ~* '^https?://'),
  status        text not null default 'confirmada' check (status in ('solicitada', 'confirmada', 'realizada', 'cancelada')),
  owner_id      uuid references public.profiles (id) on delete set null,
  requested_by  uuid references public.profiles (id) on delete set null,
  client_note   text check (char_length(client_note) <= 1000),
  summary       text                                          -- acuerdos de la reunión (los ve el cliente)
);
alter table public.meetings enable row level security;
create index if not exists meetings_client_idx on public.meetings (client_id, starts_at);

drop policy if exists "el equipo maneja reuniones" on public.meetings;
create policy "el equipo maneja reuniones" on public.meetings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "el cliente ve sus reuniones" on public.meetings;
create policy "el cliente ve sus reuniones" on public.meetings
  for select to authenticated using (public.owns_client(client_id));

-- El cliente solo puede PEDIR una reunión; el equipo la confirma con fecha y link
drop policy if exists "el cliente pide reuniones" on public.meetings;
create policy "el cliente pide reuniones" on public.meetings
  for insert to authenticated
  with check (public.owns_client(client_id) and status = 'solicitada' and requested_by = auth.uid()
              and starts_at is null and link is null and owner_id is null and summary is null);
