-- =============================================================================
-- RAKÜN · fase 16 · Clics en WhatsApp
-- · El contador de la página anota también 'whatsapp' (cada vez que alguien
--   abre WhatsApp desde la página: desde qué página y qué botón) y 'click'
--   (por ejemplo, abrir la ventana «Ver los planes»).
-- · metrics_whatsapp(days): total, por página, por botón y por anuncio.
-- · metrics_ads trae también los clics en WhatsApp de cada anuncio.
-- Se corre una vez en Supabase → SQL Editor, después de la fase 15.
-- =============================================================================

alter table public.page_events drop constraint if exists page_events_type_check;
alter table public.page_events add constraint page_events_type_check check (type in ('view', 'pick', 'lead', 'whatsapp', 'click'));

create or replace function public.metrics_whatsapp(days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - greatest(1, least(days, 3650)) * interval '1 day';
  r jsonb;
begin
  if not public.metrics_allowed() then raise exception 'Solo el equipo puede ver las métricas'; end if;
  select jsonb_build_object(
    'total', (select count(*) from page_events where type = 'whatsapp' and created_at >= since),
    'people', (select count(distinct session) from page_events where type = 'whatsapp' and created_at >= since),
    'from_ads', (select count(*) from page_events where type = 'whatsapp' and created_at >= since and utm_source is not null),
    'pages', coalesce((select jsonb_agg(x order by x.n desc) from (
        select path, count(*) as n from page_events where type = 'whatsapp' and created_at >= since group by 1 order by 2 desc limit 12) x), '[]'::jsonb),
    'buttons', coalesce((select jsonb_agg(x order by x.n desc) from (
        select coalesce(label, 'Botón') as label, count(*) as n from page_events where type = 'whatsapp' and created_at >= since group by 1 order by 2 desc limit 12) x), '[]'::jsonb),
    'ads', coalesce((select jsonb_agg(x order by x.n desc) from (
        select utm_campaign as campaign, utm_content as ad, count(*) as n from page_events
        where type = 'whatsapp' and created_at >= since and utm_campaign is not null group by 1, 2 order by 3 desc limit 20) x), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select created_at, path, label, utm_content as ad from page_events where type = 'whatsapp' and created_at >= since order by created_at desc limit 15) x), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.metrics_whatsapp(int) from public, anon;
grant execute on function public.metrics_whatsapp(int) to authenticated;

-- ---------- por anuncio, con los clics en WhatsApp ----------
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
           coalesce(m.meta_leads, 0) as meta_leads, coalesce(m.messages, 0) as messages,
           (select count(*) from page_events w where w.type = 'whatsapp' and w.created_at >= since
             and w.utm_campaign is not distinct from coalesce(v.campaign, l.campaign, m.campaign)
             and w.utm_content is not distinct from coalesce(v.ad, l.ad, m.ad)) as whatsapp
    from v full join l on l.campaign = v.campaign and l.ad is not distinct from v.ad
           full join m on m.campaign = coalesce(v.campaign, l.campaign) and m.ad is not distinct from coalesce(v.ad, l.ad)
           left join c on c.campaign = coalesce(v.campaign, l.campaign, m.campaign)
           left join s on s.ad = coalesce(v.ad, l.ad, m.ad)
    limit 300) x;
  return r;
end $$;
revoke all on function public.metrics_ads(int) from public, anon;
grant execute on function public.metrics_ads(int) to authenticated;
