-- =============================================================================
-- RAKÜN · base de datos (fase 1: usuarios, solicitudes y clientes)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → Run.
-- Se puede volver a correr: no borra datos.
-- =============================================================================

-- ---------- Perfiles: uno por cada usuario que puede iniciar sesión ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text not null default '',
  role        text not null default 'cliente' check (role in ('admin', 'equipo', 'cliente')),
  area        text,
  color       text not null default '#C3C0DD',
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Al crear un usuario se crea su perfil. El rol sale de app_metadata, que solo
-- puede escribir el servidor (nunca el propio usuario).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_app_meta_data ->> 'role', 'cliente')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ayudantes para las reglas de acceso
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin', 'equipo'), false)
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

drop policy if exists "ver mi perfil o el equipo ve todos" on public.profiles;
create policy "ver mi perfil o el equipo ve todos" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists "solo admin edita perfiles" on public.profiles;
create policy "solo admin edita perfiles" on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Solicitudes: lo que llega desde "Quiero este plan" ----------
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  world         text not null check (world in ('marca', 'produccion', 'web')),
  plan          text check (char_length(plan) <= 160),
  plan_detail   text check (char_length(plan_detail) <= 400),
  price_label   text check (char_length(price_label) <= 80),
  name          text not null check (char_length(name) between 2 and 120),
  email         text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 160),
  phone         text not null check (char_length(phone) between 7 and 30),
  city          text check (char_length(city) <= 120),
  occupation    text check (char_length(occupation) <= 200),
  links         text[] not null default '{}' check (coalesce(array_length(links, 1), 0) <= 6),
  goal          text check (char_length(goal) <= 3000),
  contact_via   text check (char_length(contact_via) <= 40),
  contact_time  text check (char_length(contact_time) <= 40),
  consent       boolean not null check (consent),
  status        text not null default 'nueva'
                check (status in ('nueva', 'contactado', 'reunion', 'propuesta', 'ganado', 'perdido')),
  assigned_to   uuid references public.profiles (id) on delete set null,
  notes         text,
  page          text check (char_length(page) <= 200)
);
alter table public.leads enable row level security;

-- Cualquier visitante puede ENVIAR una solicitud nueva, pero nunca leer ninguna.
drop policy if exists "el público envía solicitudes" on public.leads;
create policy "el público envía solicitudes" on public.leads
  for insert to anon, authenticated
  with check (status = 'nueva' and assigned_to is null and notes is null);

drop policy if exists "el equipo ve solicitudes" on public.leads;
create policy "el equipo ve solicitudes" on public.leads
  for select to authenticated using (public.is_staff());

drop policy if exists "el equipo actualiza solicitudes" on public.leads;
create policy "el equipo actualiza solicitudes" on public.leads
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "admin borra solicitudes" on public.leads;
create policy "admin borra solicitudes" on public.leads
  for delete to authenticated using (public.is_admin());

-- ---------- Clientes ----------
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 2 and 160),
  company     text,
  email       text not null unique,
  phone       text,
  city        text,
  user_id     uuid references public.profiles (id) on delete set null,
  lead_id     uuid references public.leads (id) on delete set null,
  notes       text
);
alter table public.clients enable row level security;

drop policy if exists "el equipo maneja clientes" on public.clients;
create policy "el equipo maneja clientes" on public.clients
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "el cliente ve su ficha" on public.clients;
create policy "el cliente ve su ficha" on public.clients
  for select to authenticated using (user_id = auth.uid());

-- ---------- Índices ----------
create index if not exists leads_status_idx on public.leads (status, created_at desc);
create index if not exists clients_user_idx on public.clients (user_id);
