-- =============================================================================
-- RAKÜN · base de datos · fase 8: la escena 3 de cada proyecto y los ajustes del Inicio
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → Run.
-- Se puede volver a correr sin perder datos.
-- La página de cada video ahora tiene tres escenas de lado a lado:
--   escena 1 = frag_url (fragmento principal), escena 2 = frag2_url,
--   escena 3 = frag3_url (nueva, después de «La experiencia»).
-- =============================================================================

alter table public.works add column if not exists frag3_url text;

-- Ajustes del Inicio (gestor 09 → Inicio): mostrar u ocultar «Lo que dicen»
alter table public.plan_catalog drop constraint if exists plan_catalog_id_check;
alter table public.plan_catalog add constraint plan_catalog_id_check check (id in ('marca', 'web', 'produccion', 'recibo', 'sitio'));
