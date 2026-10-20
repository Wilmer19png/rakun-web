-- =============================================================================
-- RAKÜN · fase 13 · Métricas que se explican solas
-- · meta_insights guarda también los clics en el enlace, las reproducciones de
--   3 s (gancho) y los ThruPlay (retención), que trae la función meta-sync.
-- · metrics_ads los suma por anuncio para calcular CPM, gancho, retención, CTR,
--   CPC y frecuencia, con su semáforo en 11 · Métricas.
-- · Los rangos (bien / alerta) se guardan en app_settings id 'metas' desde el
--   glosario del gestor (fase 9: solo el admin los cambia).
-- Se corre una vez en Supabase → SQL Editor, después de la fase 12.
-- =============================================================================

alter table public.meta_insights add column if not exists link_clicks int not null default 0;
alter table public.meta_insights add column if not exists video_3s int not null default 0;
alter table public.meta_insights add column if not exists thruplay int not null default 0;

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
         m as (select i.campaign_name as campaign, i.ad_name as ad, sum(i.spend) as spend, sum(i.impressions) as impressions,
                      sum(i.reach) as reach, sum(i.clicks) as clicks, sum(i.link_clicks) as link_clicks, sum(i.video_3s) as video_3s, sum(i.thruplay) as thruplay, sum(i.leads) as meta_leads, sum(i.messages) as messages
               from meta_insights i join meta_accounts a on a.id = i.account_id
               where a.client_id is null and i.day >= since::date group by 1, 2)
    select coalesce(v.campaign, l.campaign, m.campaign) as campaign, coalesce(v.ad, l.ad, m.ad) as ad,
           coalesce(v.visitors, 0) as visitors, coalesce(v.views, 0) as views,
           coalesce(l.leads, 0) as leads, coalesce(l.won, 0) as won, coalesce(l.sold, 0) as sold,
           m.spend, coalesce(m.impressions, 0) as impressions, coalesce(m.reach, 0) as reach, coalesce(m.clicks, 0) as clicks, coalesce(m.link_clicks, 0) as link_clicks, coalesce(m.video_3s, 0) as video_3s, coalesce(m.thruplay, 0) as thruplay,
           coalesce(m.meta_leads, 0) as meta_leads, coalesce(m.messages, 0) as messages
    from v full join l on l.campaign = v.campaign and l.ad is not distinct from v.ad
           full join m on m.campaign = coalesce(v.campaign, l.campaign) and m.ad is not distinct from coalesce(v.ad, l.ad)
    limit 60) x;
  return r;
end $$;
revoke all on function public.metrics_ads(int) from public, anon;
grant execute on function public.metrics_ads(int) to authenticated;
