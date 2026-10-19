-- =============================================================================
-- RAKÜN · base de datos · fase 9: métricas propias y tarifas del equipo
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → Run.
-- Se puede volver a correr sin perder datos.
--   · page_events   el contador propio de la página: visitas, qué eligen en
--                   «¿Qué buscas?» y solicitudes. Cualquiera puede ANOTAR un
--                   evento (anónimo, sin datos personales); solo el equipo lo LEE.
--   · app_settings  ajustes privados del gestor (p. ej. los % de pago por rol).
--                   Solo el equipo lee; solo el admin cambia.
-- =============================================================================

-- ---------- Contador propio de la página ----------
create table if not exists public.page_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  session     text check (char_length(session) <= 40),   -- id al azar por pestaña, no identifica a nadie
  type        text not null check (type in ('view', 'pick', 'lead')),
  path        text check (char_length(path) <= 160),      -- página: index.html, marca.html…
  label       text check (char_length(label) <= 160),     -- mundo elegido o plan pedido
  ref         text check (char_length(ref) <= 200)        -- de dónde llegó (dominio)
);
alter table public.page_events enable row level security;
create index if not exists page_events_created on public.page_events (created_at);

drop policy if exists "cualquiera anota un evento" on public.page_events;
create policy "cualquiera anota un evento" on public.page_events
  for insert to anon, authenticated with check (true);

drop policy if exists "el equipo lee los eventos" on public.page_events;
create policy "el equipo lee los eventos" on public.page_events
  for select to authenticated using (public.is_staff());

-- ---------- Ajustes privados del gestor ----------
create table if not exists public.app_settings (
  id          text primary key check (char_length(id) between 1 and 40),
  content     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);
alter table public.app_settings enable row level security;

drop policy if exists "el equipo lee los ajustes" on public.app_settings;
create policy "el equipo lee los ajustes" on public.app_settings
  for select to authenticated using (public.is_staff());

drop policy if exists "el admin cambia los ajustes" on public.app_settings;
create policy "el admin cambia los ajustes" on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Resumen para 11 · Métricas (solo el equipo) ----------
-- (la fase 10 cambia metrics_allowed para que respete el permiso de «11 Métricas»)
create or replace function public.metrics_allowed() returns boolean language sql stable security definer set search_path = public as $$ select public.is_staff() $$;
-- Devuelve todo ya contado: visitas por página, «¿Qué buscas?», de dónde llegan,
-- solicitudes y planes pedidos, cotizaciones, lo vendido y lo cobrado.
create or replace function public.metrics_summary(days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - greatest(1, least(days, 3650)) * interval '1 day';
  r jsonb;
begin
  if not public.metrics_allowed() then raise exception 'Solo el equipo puede ver las métricas'; end if;
  select jsonb_build_object(
    'views',    (select count(*) from page_events where type = 'view' and created_at >= since),
    'visitors', (select count(distinct session) from page_events where type = 'view' and created_at >= since),
    'pages',    coalesce((select jsonb_agg(x) from (select path, count(*) as n from page_events where type = 'view' and created_at >= since group by path order by n desc limit 12) x), '[]'::jsonb),
    'picks',    coalesce((select jsonb_agg(x) from (select label, count(*) as n from page_events where type = 'pick' and created_at >= since group by label order by n desc) x), '[]'::jsonb),
    'refs',     coalesce((select jsonb_agg(x) from (select ref, count(*) as n from page_events where type = 'view' and ref is not null and created_at >= since group by ref order by n desc limit 6) x), '[]'::jsonb),
    'leads',    (select count(*) from leads where created_at >= since),
    'lead_plans', coalesce((select jsonb_agg(x) from (select coalesce(plan, world) as plan, count(*) as n from leads where created_at >= since group by 1 order by n desc limit 8) x), '[]'::jsonb),
    'quotes_sent', (select count(*) from quotes where status <> 'borrador' and coalesce(sent_at, created_at) >= since),
    'quotes_won',  (select count(*) from quotes where status in ('aceptada', 'anticipo', 'pagada') and accepted_at >= since),
    'sold_total',  coalesce((select sum(total) from quotes where status in ('anticipo', 'pagada') and accepted_at >= since), 0),
    'paid',        coalesce((select sum(amount) from quote_payments where paid_on >= since::date), 0),
    'sold_plans',  coalesce((select jsonb_agg(x) from (
        select l->>'name' as plan, count(*) as n, sum(coalesce((l->>'qty')::numeric, 1) * coalesce((l->>'price')::numeric, 0)) as total
        from quotes q, jsonb_array_elements(q.blocks) b, jsonb_array_elements(b->'lines') l
        where q.status in ('anticipo', 'pagada') and q.accepted_at >= since and l->>'source' = 'plan'
        group by 1 order by n desc limit 8) x), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.metrics_summary(int) from public, anon;
grant execute on function public.metrics_summary(int) to authenticated;
