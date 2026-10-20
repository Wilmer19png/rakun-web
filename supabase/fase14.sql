-- =============================================================================
-- RAKÜN · fase 14 · Métricas por campaña con su seguimiento
-- · followups: las tareas de seguimiento de cada campaña (RAKÜN o un cliente):
--   tareas, revisiones del día N de la campaña, reglas que no se acaban
--   (p. ej. responder cada lead en menos de 15 min) y configuraciones.
--   Las ve quien tiene 11 · Métricas y la persona a la que se le asignó
--   (le salen en 00 · Mis pendientes).
-- · metrics_ads trae también el conjunto de anuncios y, de cada campaña, el
--   primer y el último día con gasto (para saber en qué día va).
-- Se corre una vez en Supabase → SQL Editor, después de la fase 13.
-- =============================================================================

create table if not exists public.followups (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  client_id    uuid references public.clients (id) on delete cascade,          -- null = RAKÜN
  campaign     text check (char_length(campaign) <= 200),                     -- nombre de la campaña en Meta
  kind         text not null default 'tarea' check (kind in ('tarea', 'revision', 'regla', 'config')),
  title        text not null check (char_length(title) between 2 and 300),
  note         text check (char_length(note) <= 2000),
  assignee_id  uuid references public.profiles (id) on delete set null,
  due_at       timestamptz,
  camp_day     int check (camp_day between 0 and 365),                        -- «día N de la campaña»
  steps        jsonb not null default '[]'::jsonb,                            -- [{ "t": "texto", "done": false }]
  rule         jsonb,                                                         -- reglas: { "sla": 15, "from": 8, "to": 19, "days": [1,2,3,4,5,6] }
  done_at      timestamptz,
  done_by      uuid references public.profiles (id) on delete set null,
  done_note    text check (char_length(done_note) <= 1000)
);
create index if not exists followups_open on public.followups (assignee_id) where done_at is null;
create index if not exists followups_campaign on public.followups (client_id, campaign);
alter table public.followups enable row level security;

drop policy if exists "seguimiento: lo ve métricas y el responsable" on public.followups;
create policy "seguimiento: lo ve métricas y el responsable" on public.followups
  for select to authenticated using (public.can('metricas') or assignee_id = auth.uid());
drop policy if exists "seguimiento: lo crea métricas" on public.followups;
create policy "seguimiento: lo crea métricas" on public.followups
  for insert to authenticated with check (public.can('metricas'));
drop policy if exists "seguimiento: lo cambia métricas o el responsable" on public.followups;
create policy "seguimiento: lo cambia métricas o el responsable" on public.followups
  for update to authenticated using (public.can('metricas') or assignee_id = auth.uid()) with check (public.can('metricas') or assignee_id = auth.uid());
drop policy if exists "seguimiento: lo borra métricas" on public.followups;
create policy "seguimiento: lo borra métricas" on public.followups
  for delete to authenticated using (public.can('metricas'));

-- ---------- por anuncio, con conjunto y fechas de la campaña ----------
create or replace function public.metrics_ads(days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - greatest(1, least(days, 3650)) * interval '1 day';
  r jsonb;
begin
  if not public.metrics_allowed() then raise exception 'Solo el equipo puede ver las métricas'; end if;
  select coalesce(jsonb_agg(x order by x.spend desc nulls last, x.leads desc, x.visitors desc), '[]'::jsonb) into r from (
    with v as (select utm_campaign as campaign, utm_content as ad, count(distinct session) as visitors, count(*) as views
               from page_events where type = 'view' and utm_campaign is not null and created_at >= since group by 1, 2),
         l as (select utm_campaign as campaign, utm_content as ad, count(*) as leads,
                      count(*) filter (where exists (select 1 from quotes q where q.lead_id = leads.id and q.status in ('anticipo', 'pagada'))) as won,
                      coalesce(sum((select sum(q.total) from quotes q where q.lead_id = leads.id and q.status in ('anticipo', 'pagada'))), 0) as sold
               from leads where utm_campaign is not null and created_at >= since group by 1, 2),
         m as (select i.campaign_name as campaign, i.ad_name as ad, max(i.adset_name) as adset, sum(i.spend) as spend, sum(i.impressions) as impressions,
                      sum(i.reach) as reach, sum(i.clicks) as clicks, sum(i.link_clicks) as link_clicks, sum(i.video_3s) as video_3s, sum(i.thruplay) as thruplay, sum(i.leads) as meta_leads, sum(i.messages) as messages
               from meta_insights i join meta_accounts a on a.id = i.account_id
               where a.client_id is null and i.day >= since::date group by 1, 2),
         -- de toda la historia: el primer y el último día con gasto de cada campaña
         c as (select i.campaign_name as campaign, min(i.day) filter (where i.spend > 0) as first_day, max(i.day) filter (where i.spend > 0) as last_day
               from meta_insights i join meta_accounts a on a.id = i.account_id
               where a.client_id is null group by 1),
         -- el conjunto de un anuncio que llegó solo por la página (visitas o formularios)
         s as (select distinct on (i.ad_name) i.ad_name as ad, i.adset_name as adset
               from meta_insights i join meta_accounts a on a.id = i.account_id
               where a.client_id is null order by i.ad_name, i.day desc)
    select coalesce(v.campaign, l.campaign, m.campaign) as campaign, coalesce(v.ad, l.ad, m.ad) as ad,
           coalesce(m.adset, s.adset) as adset, c.first_day, c.last_day,
           coalesce(v.visitors, 0) as visitors, coalesce(v.views, 0) as views,
           coalesce(l.leads, 0) as leads, coalesce(l.won, 0) as won, coalesce(l.sold, 0) as sold,
           m.spend, coalesce(m.impressions, 0) as impressions, coalesce(m.reach, 0) as reach, coalesce(m.clicks, 0) as clicks, coalesce(m.link_clicks, 0) as link_clicks, coalesce(m.video_3s, 0) as video_3s, coalesce(m.thruplay, 0) as thruplay,
           coalesce(m.meta_leads, 0) as meta_leads, coalesce(m.messages, 0) as messages
    from v full join l on l.campaign = v.campaign and l.ad is not distinct from v.ad
           full join m on m.campaign = coalesce(v.campaign, l.campaign) and m.ad is not distinct from coalesce(v.ad, l.ad)
           left join c on c.campaign = coalesce(v.campaign, l.campaign, m.campaign)
           left join s on s.ad = coalesce(v.ad, l.ad, m.ad)
    limit 300) x;
  return r;
end $$;
revoke all on function public.metrics_ads(int) from public, anon;
grant execute on function public.metrics_ads(int) to authenticated;
