-- =============================================================================
-- RAKÜN · fase 12 · Métricas por anuncio, más completas
-- · Los nombres de campaña y anuncio llegaban codificados (RAK%C3%9CN+%7C+Leads…):
--   Meta los manda así en los parámetros de URL. Se decodifican al guardar y se
--   arreglan los que ya estaban, para que también crucen con los datos de Meta.
-- · metrics_ads(days): por anuncio, lo de la página y el gestor (personas,
--   solicitudes, ventas) + lo de Meta (gasto, impresiones, alcance, clics,
--   leads y mensajes que cuenta Meta).
-- Se corre una vez en Supabase → SQL Editor, después de la fase 11.
-- =============================================================================

-- "RAK%C3%9CN+%7C+Leads" → "RAKÜN | Leads" (si no está codificado, lo deja igual)
create or replace function public.url_decode(t text)
returns text language plpgsql immutable as $$
declare
  r bytea := ''::bytea;
  i int := 1;
  c text;
begin
  if t is null or t !~ '%[0-9A-Fa-f]{2}' and position('+' in t) = 0 then return t; end if;
  t := replace(t, '+', ' ');
  while i <= length(t) loop
    c := substr(t, i, 1);
    if c = '%' and substr(t, i + 1, 2) ~ '^[0-9A-Fa-f]{2}$' then
      r := r || decode(substr(t, i + 1, 2), 'hex');
      i := i + 3;
    else
      r := r || convert_to(c, 'UTF8');
      i := i + 1;
    end if;
  end loop;
  return convert_from(r, 'UTF8');
exception when others then
  return t;
end $$;

-- al guardar una visita o una solicitud
create or replace function public.utm_clean()
returns trigger language plpgsql as $$
begin
  new.utm_campaign := public.url_decode(new.utm_campaign);
  new.utm_content := public.url_decode(new.utm_content);
  return new;
end $$;
drop trigger if exists utm_clean on public.page_events;
create trigger utm_clean before insert on public.page_events for each row execute function public.utm_clean();
drop trigger if exists utm_clean on public.leads;
create trigger utm_clean before insert on public.leads for each row execute function public.utm_clean();

-- las que ya llegaron codificadas
update public.page_events set utm_campaign = public.url_decode(utm_campaign), utm_content = public.url_decode(utm_content)
  where utm_campaign ~ '%[0-9A-Fa-f]{2}|\+' or utm_content ~ '%[0-9A-Fa-f]{2}|\+';
update public.leads set utm_campaign = public.url_decode(utm_campaign), utm_content = public.url_decode(utm_content)
  where utm_campaign ~ '%[0-9A-Fa-f]{2}|\+' or utm_content ~ '%[0-9A-Fa-f]{2}|\+';

-- ---------- por anuncio, completo ----------
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
                      sum(i.reach) as reach, sum(i.clicks) as clicks, sum(i.leads) as meta_leads, sum(i.messages) as messages
               from meta_insights i join meta_accounts a on a.id = i.account_id
               where a.client_id is null and i.day >= since::date group by 1, 2)
    select coalesce(v.campaign, l.campaign, m.campaign) as campaign, coalesce(v.ad, l.ad, m.ad) as ad,
           coalesce(v.visitors, 0) as visitors, coalesce(v.views, 0) as views,
           coalesce(l.leads, 0) as leads, coalesce(l.won, 0) as won, coalesce(l.sold, 0) as sold,
           m.spend, coalesce(m.impressions, 0) as impressions, coalesce(m.reach, 0) as reach, coalesce(m.clicks, 0) as clicks,
           coalesce(m.meta_leads, 0) as meta_leads, coalesce(m.messages, 0) as messages
    from v full join l on l.campaign = v.campaign and l.ad is not distinct from v.ad
           full join m on m.campaign = coalesce(v.campaign, l.campaign) and m.ad is not distinct from coalesce(v.ad, l.ad)
    limit 60) x;
  return r;
end $$;
revoke all on function public.metrics_ads(int) from public, anon;
grant execute on function public.metrics_ads(int) to authenticated;
