-- =============================================================================
-- RAKÜN · base de datos · fase 5: eliminar clientes
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → Run.
-- =============================================================================

-- Borra un cliente y todo lo suyo (proyectos, parrilla, documentos, grabaciones,
-- reuniones) y también su acceso al portal. Solo el administrador puede hacerlo.
-- Los archivos guardados en Storage los borra el gestor antes de llamar a esta función.
create or replace function public.delete_client(target uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede eliminar clientes.';
  end if;
  select user_id into uid from public.clients where id = target;
  delete from public.clients where id = target;              -- lo demás se borra en cascada
  -- el acceso al portal: solo si esa cuenta es de cliente (nunca alguien del equipo)
  if uid is not null and exists (select 1 from public.profiles where id = uid and role = 'cliente')
     and not exists (select 1 from public.clients where user_id = uid) then
    delete from auth.users where id = uid;
  end if;
end $$;
revoke all on function public.delete_client(uuid) from public, anon;
grant execute on function public.delete_client(uuid) to authenticated;
