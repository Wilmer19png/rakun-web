-- =============================================================================
-- RAKÜN · base de datos · fase 2: proyectos, parrilla de contenido y catálogo de planes
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → Run.
-- Requiere haber corrido antes supabase/schema.sql. Se puede volver a correr.
-- =============================================================================

-- ---------- Proyectos: cada cliente puede tener varios (marca, producción, web) ----------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  world       text not null check (world in ('marca', 'produccion', 'web')),
  name        text not null check (char_length(name) between 2 and 160),
  plan        text,
  stage       text,
  status      text not null default 'activo' check (status in ('activo', 'pausado', 'terminado')),
  start_date  date,
  end_date    date,
  owner_id    uuid references public.profiles (id) on delete set null
);
alter table public.projects enable row level security;

-- ¿este proyecto es del cliente con sesión?
create or replace function public.owns_client(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clients c where c.id = cid and c.user_id = auth.uid())
$$;

drop policy if exists "el equipo maneja proyectos" on public.projects;
create policy "el equipo maneja proyectos" on public.projects
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "el cliente ve sus proyectos" on public.projects;
create policy "el cliente ve sus proyectos" on public.projects
  for select to authenticated using (public.owns_client(client_id));

-- ---------- Parrilla de contenido: una fila por pieza ----------
create table if not exists public.posts (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  client_id      uuid not null references public.clients (id) on delete cascade,
  publish_at     timestamptz not null,
  format         text not null default 'reel' check (format in ('reel', 'carrusel', 'historias', 'anuncio', 'video_largo', 'post')),
  title          text not null check (char_length(title) between 1 and 160),
  networks       text[] not null default '{}',
  copy           text,
  copy_variants  jsonb not null default '{}'::jsonb,          -- texto distinto por red: {"TT": "…", "YT": "…"}
  media_url      text,
  script_url     text,
  assigned_to    uuid references public.profiles (id) on delete set null,
  has_ads        boolean not null default false,
  status         text not null default 'borrador'
                 check (status in ('borrador', 'lista', 'por_aprobar', 'cambios', 'aprobada', 'programada', 'publicada')),
  client_note    text,
  published_url  text
);
alter table public.posts enable row level security;
create index if not exists posts_project_date_idx on public.posts (project_id, publish_at);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists posts_touch on public.posts;
create trigger posts_touch before update on public.posts for each row execute function public.touch_updated_at();

drop policy if exists "el equipo maneja la parrilla" on public.posts;
create policy "el equipo maneja la parrilla" on public.posts
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- El cliente solo ve lo que el equipo ya le envió (nunca borradores)
drop policy if exists "el cliente ve su parrilla" on public.posts;
create policy "el cliente ve su parrilla" on public.posts
  for select to authenticated
  using (public.owns_client(client_id) and status not in ('borrador', 'lista'));

-- El cliente aprueba o pide cambios SOLO a través de esta función (no puede editar nada más)
create or replace function public.review_post(post_id uuid, decision text, note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p public.posts;
begin
  select * into p from public.posts where id = post_id;
  if p.id is null or not public.owns_client(p.client_id) then
    raise exception 'No tienes acceso a esta pieza.';
  end if;
  if p.status not in ('por_aprobar', 'cambios', 'aprobada') then
    raise exception 'Esta pieza ya no se puede cambiar.';
  end if;
  if decision not in ('aprobada', 'cambios') then
    raise exception 'Decisión no válida.';
  end if;
  update public.posts
     set status = decision,
         client_note = case when decision = 'cambios' then left(coalesce(note, ''), 2000) else client_note end
   where id = post_id;
end $$;
revoke all on function public.review_post(uuid, text, text) from public, anon;
grant execute on function public.review_post(uuid, text, text) to authenticated;

-- ---------- Catálogo de planes (lo que muestra la página pública) ----------
create table if not exists public.plan_catalog (
  id          text primary key check (id in ('marca', 'web', 'produccion')),
  content     jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);
alter table public.plan_catalog enable row level security;

-- Los precios son públicos: cualquiera los puede LEER; solo el equipo los cambia
drop policy if exists "todos leen el catálogo" on public.plan_catalog;
create policy "todos leen el catálogo" on public.plan_catalog
  for select to anon, authenticated using (true);

drop policy if exists "el equipo edita el catálogo" on public.plan_catalog;
create policy "el equipo edita el catálogo" on public.plan_catalog
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
