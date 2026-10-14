-- =============================================================================
-- RAKÜN · base de datos · fase 8: la escena 3 de la página de cada proyecto
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → Run.
-- Se puede volver a correr sin perder datos.
-- La página de cada video ahora tiene tres escenas de lado a lado:
--   escena 1 = frag_url (fragmento principal), escena 2 = frag2_url,
--   escena 3 = frag3_url (nueva, después de «La experiencia»).
-- =============================================================================

alter table public.works add column if not exists frag3_url text;
