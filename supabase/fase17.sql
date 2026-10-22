-- =============================================================================
-- RAKÜN · fase 17 · Métodos de pago en la cotización
-- Los datos de pago (llave Bre-B, Nequi, cuenta de Bancolombia) se guardan en
-- app_settings id 'cobro' (privado: el admin los escribe en 09 → Recibo) y
-- solo salen dentro de quote_public, o sea, para quien tiene el enlace de una
-- cotización. No quedan en el catálogo público de la página.
-- Se corre una vez en Supabase → SQL Editor, después de la fase 16.
-- =============================================================================

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
                          from public.quote_payments where quote_id = q.id), '[]'::jsonb),
    'cobro', (select content from public.app_settings where id = 'cobro')
  ) into r;
  return r;
end $$;
