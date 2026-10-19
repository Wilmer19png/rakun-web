-- =============================================================================
-- RAKÜN · base de datos · fase 10: permisos por persona, mensajes al equipo,
-- lo que gana cada quien por tarea y las comisiones del manager
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → Run.
-- Se puede volver a correr sin perder datos.
--
-- PERMISOS: cada persona del equipo tiene en profiles.perms qué secciones ve
-- y cuáles edita, p. ej. {"proyectos":"editar","equipo":"ver","dinero":"ver"}.
--   · el admin siempre ve y edita todo
--   · si perms está vacío (null), la persona ve todo como hasta ahora
-- Las reglas de la base de datos usan estos permisos: lo que no tiene marcado,
-- la base de datos no se lo entrega aunque escriba la dirección.
-- =============================================================================

alter table public.profiles add column if not exists perms jsonb;

-- ¿la persona con sesión puede ver (o editar) esta sección?
create or replace function public.can(section text, edit boolean default false)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p.role = 'admin' then true
    when p.role <> 'equipo' or p.role is null then false
    when p.perms is null then true
    when edit then p.perms->>section = 'editar'
    else p.perms->>section in ('ver', 'editar')
  end
  from public.profiles p where p.id = auth.uid()
$$;
-- ¿ve plata (precios de cotizaciones, pagos, % y comisiones)?
create or replace function public.sees_money()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.role = 'admin' or (p.role = 'equipo' and (p.perms is null or p.perms->>'dinero' = 'ver'))
                   from public.profiles p where p.id = auth.uid()), false)
$$;
revoke all on function public.can(text, boolean) from public, anon;
revoke all on function public.sees_money() from public, anon;
grant execute on function public.can(text, boolean) to authenticated;
grant execute on function public.sees_money() to authenticated;

-- ---------- Las reglas de cada sección ----------
-- 01 Solicitudes
drop policy if exists "el equipo ve solicitudes" on public.leads;
create policy "el equipo ve solicitudes" on public.leads for select to authenticated using (public.can('solicitudes'));
drop policy if exists "el equipo actualiza solicitudes" on public.leads;
create policy "el equipo actualiza solicitudes" on public.leads for update to authenticated using (public.can('solicitudes', true)) with check (public.can('solicitudes', true));

-- 02 Clientes (el nombre del cliente también lo necesitan proyectos, parrillas, agenda y documentos)
drop policy if exists "el equipo maneja clientes" on public.clients;
create policy "el equipo maneja clientes" on public.clients for all to authenticated using (public.can('clientes', true)) with check (public.can('clientes', true));
drop policy if exists "el equipo ve clientes" on public.clients;
create policy "el equipo ve clientes" on public.clients for select to authenticated
  using (public.can('clientes') or public.can('proyectos') or public.can('parrillas') or public.can('grabaciones') or public.can('reuniones') or public.can('documentos') or public.can('pendientes'));

-- 03 Proyectos (quien tiene un entregable en un proyecto también lo ve)
drop policy if exists "el equipo maneja proyectos" on public.projects;
create policy "el equipo maneja proyectos" on public.projects for all to authenticated using (public.can('proyectos', true)) with check (public.can('proyectos', true));
drop policy if exists "el equipo ve proyectos" on public.projects;
create policy "el equipo ve proyectos" on public.projects for select to authenticated
  using (public.can('proyectos') or public.can('parrillas') or public.can('grabaciones') or public.can('reuniones') or public.can('documentos')
         or exists (select 1 from public.deliverables d where d.project_id = projects.id and (d.assignee_id = auth.uid() or d.reviewer_id = auth.uid())));

drop policy if exists "el equipo maneja cotizaciones" on public.quotes;
create policy "el equipo maneja cotizaciones" on public.quotes for all to authenticated
  using (public.can('proyectos', true) and public.sees_money()) with check (public.can('proyectos', true) and public.sees_money());
drop policy if exists "el equipo maneja pagos" on public.quote_payments;
create policy "el equipo maneja pagos" on public.quote_payments for all to authenticated
  using (public.can('proyectos', true) and public.sees_money()) with check (public.can('proyectos', true) and public.sees_money());

-- Entregables: quien lo hace o lo revisa siempre lo ve y lo puede entregar/aprobar
drop policy if exists "el equipo maneja entregables" on public.deliverables;
create policy "el equipo maneja entregables" on public.deliverables for all to authenticated using (public.can('proyectos', true)) with check (public.can('proyectos', true));
drop policy if exists "cada quien ve sus entregables" on public.deliverables;
create policy "cada quien ve sus entregables" on public.deliverables for select to authenticated
  using (public.can('proyectos') or assignee_id = auth.uid() or reviewer_id = auth.uid());
drop policy if exists "cada quien entrega o revisa lo suyo" on public.deliverables;
create policy "cada quien entrega o revisa lo suyo" on public.deliverables for update to authenticated
  using (assignee_id = auth.uid() or reviewer_id = auth.uid()) with check (assignee_id = auth.uid() or reviewer_id = auth.uid());

-- 04 Parrillas · 05 Grabaciones · 06 Reuniones · 07 Documentos · 08 Nuestro trabajo
drop policy if exists "el equipo maneja la parrilla" on public.posts;
create policy "el equipo maneja la parrilla" on public.posts for all to authenticated using (public.can('parrillas', true)) with check (public.can('parrillas', true));
drop policy if exists "el equipo ve la parrilla" on public.posts;
create policy "el equipo ve la parrilla" on public.posts for select to authenticated using (public.can('parrillas'));

drop policy if exists "el equipo maneja grabaciones" on public.shoots;
create policy "el equipo maneja grabaciones" on public.shoots for all to authenticated using (public.can('grabaciones', true)) with check (public.can('grabaciones', true));
drop policy if exists "el equipo ve grabaciones" on public.shoots;
create policy "el equipo ve grabaciones" on public.shoots for select to authenticated using (public.can('grabaciones') or auth.uid() = any(crew));

drop policy if exists "el equipo maneja reuniones" on public.meetings;
create policy "el equipo maneja reuniones" on public.meetings for all to authenticated using (public.can('reuniones', true)) with check (public.can('reuniones', true));
drop policy if exists "el equipo ve reuniones" on public.meetings;
create policy "el equipo ve reuniones" on public.meetings for select to authenticated using (public.can('reuniones'));

drop policy if exists "el equipo maneja documentos" on public.documents;
create policy "el equipo maneja documentos" on public.documents for all to authenticated using (public.can('documentos', true)) with check (public.can('documentos', true));
drop policy if exists "el equipo ve documentos" on public.documents;
create policy "el equipo ve documentos" on public.documents for select to authenticated using (public.can('documentos'));
drop policy if exists "rakun equipo archivos" on storage.objects;
create policy "rakun equipo archivos" on storage.objects for all to authenticated
  using (bucket_id = 'documentos' and public.can('documentos')) with check (bucket_id = 'documentos' and public.can('documentos', true));

drop policy if exists "rakun trabajo equipo" on public.works;
create policy "rakun trabajo equipo" on public.works for all to authenticated using (public.can('trabajo', true)) with check (public.can('trabajo', true));
drop policy if exists "rakun trabajo archivos" on storage.objects;
create policy "rakun trabajo archivos" on storage.objects for all to authenticated
  using (bucket_id = 'trabajo' and public.can('trabajo', true)) with check (bucket_id = 'trabajo' and public.can('trabajo', true));

-- 09 Planes y precios (editar el catálogo público)
drop policy if exists "el equipo edita el catálogo" on public.plan_catalog;
create policy "el equipo edita el catálogo" on public.plan_catalog for all to authenticated using (public.can('planes', true)) with check (public.can('planes', true));

-- 11 Métricas
drop policy if exists "el equipo lee los eventos" on public.page_events;
create policy "el equipo lee los eventos" on public.page_events for select to authenticated using (public.can('metricas'));

-- los % de pago por rol: solo quien ve plata (cada quien ve su columna en pantalla)
drop policy if exists "el equipo lee los ajustes" on public.app_settings;
create policy "el equipo lee los ajustes" on public.app_settings for select to authenticated using (public.sees_money() or public.can('tarifario'));

-- ---------- Mensajes al equipo ----------
create table if not exists public.team_messages (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  author_id   uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  to_kind     text not null default 'todos' check (to_kind in ('todos', 'persona', 'proyecto')),
  to_user     uuid references public.profiles (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  pinned      boolean not null default false,
  email       boolean not null default false
);
alter table public.team_messages enable row level security;
create index if not exists team_messages_created on public.team_messages (created_at desc);

-- ¿este mensaje es para la persona con sesión?
create or replace function public.message_for_me(author uuid, kind text, target uuid, project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or author = auth.uid() or kind = 'todos'
      or (kind = 'persona' and target = auth.uid())
      or (kind = 'proyecto' and exists (
            select 1 from public.projects p where p.id = project and p.owner_id = auth.uid()
            union all select 1 from public.deliverables d where d.project_id = project and (d.assignee_id = auth.uid() or d.reviewer_id = auth.uid())))
$$;

drop policy if exists "el equipo lee sus mensajes" on public.team_messages;
create policy "el equipo lee sus mensajes" on public.team_messages for select to authenticated using (public.is_staff() and public.message_for_me(author_id, to_kind, to_user, project_id));
drop policy if exists "el equipo escribe mensajes" on public.team_messages;
create policy "el equipo escribe mensajes" on public.team_messages for insert to authenticated with check (public.is_staff() and author_id = auth.uid());
drop policy if exists "quien escribió edita o borra" on public.team_messages;
create policy "quien escribió edita o borra" on public.team_messages for update to authenticated using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
drop policy if exists "quien escribió borra" on public.team_messages;
create policy "quien escribió borra" on public.team_messages for delete to authenticated using (author_id = auth.uid() or public.is_admin());

create table if not exists public.message_reads (
  message_id  uuid not null references public.team_messages (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  read_at     timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.message_reads enable row level security;
drop policy if exists "marco lo que leí" on public.message_reads;
create policy "marco lo que leí" on public.message_reads for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "veo quién leyó" on public.message_reads;
create policy "veo quién leyó" on public.message_reads for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or exists (select 1 from public.team_messages m where m.id = message_id and m.author_id = auth.uid()));

-- ---------- Lo que gana cada quien por tarea ----------
alter table public.deliverables add column if not exists pay_amount numeric check (pay_amount is null or pay_amount >= 0);
alter table public.deliverables add column if not exists pay_note text check (char_length(pay_note) <= 120);
alter table public.deliverables add column if not exists paid_at date;

-- quien solo entrega o revisa no puede cambiarse el pago, ni el responsable, ni el proyecto
create or replace function public.deliverables_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.can('proyectos', true) then
    new.project_id := old.project_id; new.assignee_id := old.assignee_id; new.reviewer_id := old.reviewer_id;
    new.title := old.title; new.due_at := old.due_at;
  end if;
  if not (public.can('proyectos', true) and public.sees_money()) then
    new.pay_amount := old.pay_amount; new.pay_note := old.pay_note; new.paid_at := old.paid_at;
  end if;
  return new;
end $$;
drop trigger if exists deliverables_guard on public.deliverables;
create trigger deliverables_guard before update on public.deliverables for each row execute function public.deliverables_guard();

-- ---------- Comisiones del manager ----------
-- Una fila por comisión: mensual (planes de Redes, una por mes pagado) o única (ventas sueltas).
create table if not exists public.commissions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  manager_id  uuid not null references public.profiles (id) on delete cascade,
  quote_id    uuid references public.quotes (id) on delete cascade,
  payment_id  uuid references public.quote_payments (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete set null,
  kind        text not null check (kind in ('mensual', 'unica')),
  period      date,                          -- el mes que se pagó (mensuales)
  concept     text not null check (char_length(concept) <= 200),
  base        numeric not null default 0,
  pct         numeric not null default 0,
  amount      numeric not null default 0,
  status      text not null default 'por_pagar' check (status in ('por_pagar', 'pagada')),
  paid_at     date
);
alter table public.commissions enable row level security;
create index if not exists commissions_manager on public.commissions (manager_id, status);

drop policy if exists "el manager ve sus comisiones" on public.commissions;
create policy "el manager ve sus comisiones" on public.commissions for select to authenticated using (manager_id = auth.uid() or public.is_admin());
drop policy if exists "se anotan al registrar pagos" on public.commissions;
create policy "se anotan al registrar pagos" on public.commissions for insert to authenticated with check (public.can('proyectos', true) and public.sees_money());
drop policy if exists "el admin las marca pagadas" on public.commissions;
create policy "el admin las marca pagadas" on public.commissions for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "el admin las borra" on public.commissions;
create policy "el admin las borra" on public.commissions for delete to authenticated using (public.is_admin());

-- el resumen de métricas (fase 9) ahora respeta el permiso de «11 Métricas»
create or replace function public.metrics_allowed() returns boolean language sql stable security definer set search_path = public as $$ select coalesce(public.can('metricas'), false) $$;
