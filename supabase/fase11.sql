-- =============================================================================
-- RAKÜN · base de datos · fase 11: seguimiento por anuncio y conexión con Meta
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → Run
-- (después de las fases 9 y 10). Se puede volver a correr sin perder datos.
--   · cada visita y cada solicitud guardan de qué campaña y anuncio vinieron
--     (los parámetros utm_… que pones en los anuncios de Meta)
--   · meta_accounts: las cuentas publicitarias conectadas (la de RAKÜN y las de clientes)
--   · meta_insights: lo que trae la función «meta-sync» cada noche (gasto, clics, resultados)
-- =============================================================================

-- ---------- De dónde vino cada visita y cada solicitud ----------
alter table public.page_events add column if not exists utm_source   text check (char_length(utm_source) <= 80);
alter table public.page_events add column if not exists utm_campaign text check (char_length(utm_campaign) <= 160);
alter table public.page_events add column if not exists utm_content  text check (char_length(utm_content) <= 160);
alter table public.leads add column if not exists utm_source   text check (char_length(utm_source) <= 80);
alter table public.leads add column if not exists utm_campaign text check (char_length(utm_campaign) <= 160);
alter table public.leads add column if not exists utm_content  text check (char_length(utm_content) <= 160);

-- ---------- Cuentas de Meta conectadas ----------
create table if not exists public.meta_accounts (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  client_id       uuid references public.clients (id) on delete cascade,   -- null = la cuenta de RAKÜN
  name            text not null check (char_length(name) between 1 and 120),
  ad_account_id   text not null check (ad_account_id ~ '^act_[0-9]{5,25}$'),
  pixel_id        text check (pixel_id is null or pixel_id ~ '^[0-9]{6,25}$'),
  page_name       text check (char_length(page_name) <= 120),
  show_in_portal  boolean not null default false,
  last_sync       timestamptz,
  last_error      text
);
alter table public.meta_accounts enable row level security;
create unique index if not exists meta_accounts_act on public.meta_accounts (ad_account_id);

drop policy if exists "el equipo ve las cuentas de meta" on public.meta_accounts;
create policy "el equipo ve las cuentas de meta" on public.meta_accounts for select to authenticated
  using (public.can('metricas') or (show_in_portal and client_id is not null and public.owns_client(client_id)));
drop policy if exists "el admin conecta cuentas" on public.meta_accounts;
create policy "el admin conecta cuentas" on public.meta_accounts for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Un token propio del cliente (opcional, opción B): nadie lo puede LEER desde la página,
-- solo la función meta-sync (con la clave de servicio). El admin solo lo puede guardar.
create table if not exists public.meta_tokens (
  account_id  uuid primary key references public.meta_accounts (id) on delete cascade,
  token       text not null,
  updated_at  timestamptz not null default now()
);
alter table public.meta_tokens enable row level security;
drop policy if exists "el admin guarda tokens" on public.meta_tokens;
create policy "el admin guarda tokens" on public.meta_tokens for insert to authenticated with check (public.is_admin());
drop policy if exists "el admin cambia tokens" on public.meta_tokens;
create policy "el admin cambia tokens" on public.meta_tokens for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "el admin borra tokens" on public.meta_tokens;
create policy "el admin borra tokens" on public.meta_tokens for delete to authenticated using (public.is_admin());

-- ---------- Lo que trae Meta: un renglón por anuncio y por día ----------
create table if not exists public.meta_insights (
  account_id     uuid not null references public.meta_accounts (id) on delete cascade,
  day            date not null,
  ad_id          text not null,
  ad_name        text,
  adset_name     text,
  campaign_id    text,
  campaign_name  text,
  spend          numeric not null default 0,
  impressions    bigint not null default 0,
  reach          bigint not null default 0,
  clicks         bigint not null default 0,
  leads          bigint not null default 0,        -- clientes potenciales (píxel o formularios)
  messages       bigint not null default 0,        -- conversaciones iniciadas
  primary key (account_id, day, ad_id)
);
alter table public.meta_insights enable row level security;
drop policy if exists "el equipo ve los resultados de meta" on public.meta_insights;
create policy "el equipo ve los resultados de meta" on public.meta_insights for select to authenticated
  using (public.can('metricas') or exists (select 1 from public.meta_accounts a where a.id = account_id and a.show_in_portal and a.client_id is not null and public.owns_client(a.client_id)));

-- ---------- Resumen de métricas, ahora con «por anuncio» y Meta ----------
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
        group by 1 order by n desc limit 8) x), '[]'::jsonb),
    -- por anuncio: personas que llegaron, solicitudes y ventas (de la página y el gestor) + gasto de Meta
    'ads', coalesce((select jsonb_agg(x order by x.spend desc nulls last, x.visitors desc) from (
        with v as (select utm_campaign as campaign, utm_content as ad, count(distinct session) as visitors
                   from page_events where type = 'view' and utm_campaign is not null and created_at >= since group by 1, 2),
             l as (select utm_campaign as campaign, utm_content as ad, count(*) as leads,
                          count(*) filter (where exists (select 1 from quotes q where q.lead_id = leads.id and q.status in ('anticipo', 'pagada'))) as won,
                          coalesce(sum((select sum(q.total) from quotes q where q.lead_id = leads.id and q.status in ('anticipo', 'pagada'))), 0) as sold
                   from leads where utm_campaign is not null and created_at >= since group by 1, 2),
             m as (select i.campaign_name as campaign, i.ad_name as ad, sum(i.spend) as spend, sum(i.clicks) as clicks, sum(i.leads) as meta_leads
                   from meta_insights i join meta_accounts a on a.id = i.account_id
                   where a.client_id is null and i.day >= since::date group by 1, 2)
        select coalesce(v.campaign, l.campaign, m.campaign) as campaign, coalesce(v.ad, l.ad, m.ad) as ad,
               coalesce(v.visitors, 0) as visitors, coalesce(l.leads, 0) as leads, coalesce(l.won, 0) as won, coalesce(l.sold, 0) as sold,
               m.spend, coalesce(m.clicks, 0) as clicks, coalesce(m.meta_leads, 0) as meta_leads
        from v full join l on l.campaign = v.campaign and l.ad is not distinct from v.ad
               full join m on m.campaign = coalesce(v.campaign, l.campaign) and m.ad is not distinct from coalesce(v.ad, l.ad)
        limit 40) x), '[]'::jsonb),
    'meta_spend', coalesce((select sum(i.spend) from meta_insights i join meta_accounts a on a.id = i.account_id where a.client_id is null and i.day >= since::date), 0),
    'meta_synced', (select max(last_sync) from meta_accounts where client_id is null)
  ) into r;
  return r;
end $$;

-- Resultados de Meta de un cliente (para 11 · Métricas → Clientes y el portal)
create or replace function public.meta_client_summary(account uuid, days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  since date := (now() - greatest(1, least(days, 3650)) * interval '1 day')::date;
  ok boolean;
  r jsonb;
begin
  select public.can('metricas') or (a.show_in_portal and a.client_id is not null and public.owns_client(a.client_id)) into ok
    from meta_accounts a where a.id = account;
  if not coalesce(ok, false) then raise exception 'Sin acceso a esta cuenta'; end if;
  select jsonb_build_object(
    'spend', coalesce(sum(spend), 0), 'reach', coalesce(sum(reach), 0), 'impressions', coalesce(sum(impressions), 0),
    'clicks', coalesce(sum(clicks), 0), 'leads', coalesce(sum(leads), 0), 'messages', coalesce(sum(messages), 0),
    'weeks', coalesce((select jsonb_agg(w order by w.week) from (
        select date_trunc('week', day)::date as week, sum(leads + messages) as results, sum(spend) as spend
        from meta_insights where account_id = account and day >= since group by 1) w), '[]'::jsonb),
    'ads', coalesce((select jsonb_agg(a order by a.spend desc) from (
        select campaign_name, ad_name, sum(spend) as spend, sum(clicks) as clicks, sum(leads) as leads, sum(messages) as messages
        from meta_insights where account_id = account and day >= since group by 1, 2 limit 20) a), '[]'::jsonb)
  ) into r from meta_insights where account_id = account and day >= since;
  return r;
end $$;
revoke all on function public.meta_client_summary(uuid, int) from public, anon;
grant execute on function public.meta_client_summary(uuid, int) to authenticated;
