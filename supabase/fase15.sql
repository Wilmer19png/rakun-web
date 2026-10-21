-- =============================================================================
-- RAKÜN · fase 15 · Tarifas y pagos nuevos: la ronda extra de edición
-- · deliverables.round_pay: lo que vale una ronda extra de esa tarea (lo pone
--   quien ve plata; el gestor lo sugiere: 10 % del precio del video).
-- · deliverables.extra_rounds: cuántas rondas extra lleva.
-- · extra_round(id): quien revisa (o quien edita proyectos) marca una ronda
--   extra al devolver la tarea; se suma round_pay al pago de quien la hizo.
-- Se corre una vez en Supabase → SQL Editor, después de la fase 14.
-- =============================================================================

alter table public.deliverables add column if not exists round_pay numeric;
alter table public.deliverables add column if not exists extra_rounds int not null default 0;

-- el guardián de la fase 10, con las columnas nuevas: el pago y las rondas no se tocan
-- sin permiso (la ronda extra entra solo por extra_round, que avisa con rakun.round)
create or replace function public.deliverables_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('rakun.round', true), '') = '1' then return new; end if;
  if not public.can('proyectos', true) then
    new.project_id := old.project_id; new.assignee_id := old.assignee_id; new.reviewer_id := old.reviewer_id;
    new.title := old.title; new.due_at := old.due_at;
  end if;
  if not (public.can('proyectos', true) and public.sees_money()) then
    new.pay_amount := old.pay_amount; new.pay_note := old.pay_note; new.paid_at := old.paid_at;
    new.round_pay := old.round_pay; new.extra_rounds := old.extra_rounds;
  end if;
  return new;
end $$;

create or replace function public.extra_round(d uuid)
returns public.deliverables language plpgsql security definer set search_path = public as $$
declare
  t public.deliverables;
begin
  select * into t from public.deliverables where id = d;
  if t.id is null then raise exception 'No existe esa tarea'; end if;
  if not (t.reviewer_id = auth.uid() or public.can('proyectos', true)) then raise exception 'Solo quien revisa puede marcar una ronda extra'; end if;
  perform set_config('rakun.round', '1', true);
  update public.deliverables set
    extra_rounds = extra_rounds + 1,
    pay_amount = case when coalesce(round_pay, 0) > 0 then coalesce(pay_amount, 0) + round_pay else pay_amount end,
    pay_note = case when coalesce(round_pay, 0) > 0
      then left(trim(both ' ·' from coalesce(pay_note, '') || ' · ronda extra ' || (extra_rounds + 1) || ' +' || to_char(round_pay, 'FM999G999G999')), 120)
      else pay_note end
  where id = d returning * into t;
  perform set_config('rakun.round', '', true);
  return t;
end $$;
revoke all on function public.extra_round(uuid) from public, anon;
grant execute on function public.extra_round(uuid) to authenticated;
