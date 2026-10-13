-- =============================================================================
-- RAKÜN · base de datos · fase 7: cotizador y entregables
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → Run.
-- Se puede volver a correr sin perder datos.
--   · quotes          las cotizaciones (con sus bloques: Redes, Web, Producción)
--   · quote_payments  los pagos de cada cotización (anticipo, saldo…)
--   · deliverables    los entregables de cada proyecto (quién, para cuándo, dónde se entrega)
--   · carpeta privada «entregas» (archivos entregados y comprobantes de pago)
-- El cliente ve su cotización con un enlace secreto (cotizacion.html?c=…), sin cuenta.
-- =============================================================================

-- ---------- Cotizaciones ----------
create sequence if not exists public.quote_seq;

create table if not exists public.quotes (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  number       text not null unique default ('COT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.quote_seq')::text, 3, '0')),
  token        uuid not null unique default gen_random_uuid(),        -- el enlace secreto del cliente
  client_id    uuid not null references public.clients (id) on delete cascade,
  lead_id      uuid references public.leads (id) on delete set null,
  title        text not null check (char_length(title) between 1 and 160),
  status       text not null default 'borrador'
               check (status in ('borrador', 'enviada', 'aceptada', 'anticipo', 'pagada', 'rechazada')),
  valid_days   int not null default 15 check (valid_days between 1 and 365),
  blocks       jsonb not null default '[]'::jsonb,   -- [{ world, title, lines: [{ name, detail, source, qty, unit, price }], meta }]
  discount     numeric not null default 0 check (discount >= 0),
  iva          boolean not null default false,
  split        int[] not null default '{50,50}',   -- cuotas en %: 50/50, 40/30/30…
  note         text check (char_length(note) <= 2000),
  total        numeric not null default 0,          -- se guarda al editar (para listas y el enlace)
  owner_id     uuid references public.profiles (id) on delete set null,
  sent_at      timestamptz,
  viewed_at    timestamptz,
  accepted_at  timestamptz
);
alter table public.quotes enable row level security;

drop policy if exists "el equipo maneja cotizaciones" on public.quotes;
create policy "el equipo maneja cotizaciones" on public.quotes
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create table if not exists public.quote_payments (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  quote_id    uuid not null references public.quotes (id) on delete cascade,
  amount      numeric not null check (amount > 0),
  method      text not null default 'Transferencia',
  paid_on     date not null default current_date,
  proof_path  text,            -- archivo en la carpeta «entregas»
  proof_url   text,            -- o un enlace
  note        text,
  created_by  uuid references public.profiles (id) on delete set null
);
alter table public.quote_payments enable row level security;

drop policy if exists "el equipo maneja pagos" on public.quote_payments;
create policy "el equipo maneja pagos" on public.quote_payments
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- los proyectos recuerdan de qué cotización salieron
alter table public.projects add column if not exists quote_id uuid references public.quotes (id) on delete set null;

-- ---------- Lo que ve el cliente con su enlace ----------
-- Devuelve la cotización (sin datos internos) y anota la primera vez que la abrió.
create or replace function public.quote_public(t uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q public.quotes; r jsonb;
begin
  select * into q from public.quotes where token = t;
  if q.id is null then return null; end if;
  if q.status = 'borrador' and not public.is_staff() then return null; end if;
  if q.status = 'enviada' and q.viewed_at is null and not public.is_staff() then
    update public.quotes set viewed_at = now() where id = q.id;
  end if;
  select jsonb_build_object(
    'number', q.number, 'title', q.title, 'status', q.status, 'created_at', q.created_at, 'sent_at', q.sent_at,
    'valid_days', q.valid_days, 'blocks', q.blocks, 'discount', q.discount, 'iva', q.iva, 'split', q.split,
    'note', q.note, 'total', q.total, 'accepted_at', q.accepted_at,
    'client', (select jsonb_build_object('name', c.name, 'company', c.company, 'email', c.email) from public.clients c where c.id = q.client_id),
    'owner', (select jsonb_build_object('name', p.full_name, 'email', p.email) from public.profiles p where p.id = q.owner_id),
    'paid', coalesce((select sum(amount) from public.quote_payments where quote_id = q.id), 0),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('amount', amount, 'paid_on', paid_on, 'method', method) order by paid_on)
                          from public.quote_payments where quote_id = q.id), '[]'::jsonb)
  ) into r;
  return r;
end $$;

-- El cliente acepta (solo si está enviada y no ha vencido).
create or replace function public.quote_accept(t uuid)
returns text language plpgsql security definer set search_path = public as $$
declare q public.quotes;
begin
  select * into q from public.quotes where token = t;
  if q.id is null then return 'no existe'; end if;
  if q.status <> 'enviada' then return q.status; end if;
  if coalesce(q.sent_at, q.created_at) + make_interval(days => q.valid_days) < now() then return 'vencida'; end if;
  update public.quotes set status = 'aceptada', accepted_at = now() where id = q.id;
  return 'aceptada';
end $$;

revoke all on function public.quote_public(uuid) from public;
revoke all on function public.quote_accept(uuid) from public;
grant execute on function public.quote_public(uuid) to anon, authenticated;
grant execute on function public.quote_accept(uuid) to anon, authenticated;

-- ---------- Entregables ----------
create table if not exists public.deliverables (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  title          text not null check (char_length(title) between 1 and 200),
  kind           text not null default 'otro'
                 check (kind in ('estrategia', 'guion', 'grabacion', 'edicion', 'diseno', 'desarrollo', 'revision', 'otro')),
  assignee_id    uuid references public.profiles (id) on delete set null,
  reviewer_id    uuid references public.profiles (id) on delete set null,
  due_at         timestamptz,
  status         text not null default 'por_hacer' check (status in ('por_hacer', 'en_curso', 'en_revision', 'aprobado')),
  brief_url      text,
  delivery_url   text,          -- enlace (Drive, Frame.io…) o «storage:ruta» si subieron el archivo
  delivery_note  text,
  delivered_at   timestamptz,
  sort           int not null default 0
);
alter table public.deliverables enable row level security;
create index if not exists deliverables_assignee on public.deliverables (assignee_id, status);
create index if not exists deliverables_project on public.deliverables (project_id);

drop policy if exists "el equipo maneja entregables" on public.deliverables;
create policy "el equipo maneja entregables" on public.deliverables
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- Carpeta privada para entregas y comprobantes ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('entregas', 'entregas', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists "rakun equipo entregas" on storage.objects;
create policy "rakun equipo entregas" on storage.objects
  for all to authenticated
  using (bucket_id = 'entregas' and public.is_staff())
  with check (bucket_id = 'entregas' and public.is_staff());

-- ---------- Datos del recibo y tarifas de producción (en el catálogo) ----------
alter table public.plan_catalog drop constraint if exists plan_catalog_id_check;
alter table public.plan_catalog add constraint plan_catalog_id_check check (id in ('marca', 'web', 'produccion', 'recibo'));
