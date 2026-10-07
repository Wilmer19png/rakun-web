-- =============================================================================
-- RAKÜN · base de datos · fase 3: documentos (archivos privados o links)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → Run.
-- Requiere schema.sql y fase2.sql. Se puede volver a correr.
-- =============================================================================

create table if not exists public.documents (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  client_id      uuid not null references public.clients (id) on delete cascade,
  project_id     uuid references public.projects (id) on delete set null,
  category       text not null check (category in ('estrategia', 'contrato', 'recibo', 'guion', 'brief', 'entregable', 'reporte', 'material')),
  title          text not null check (char_length(title) between 1 and 200),
  kind           text not null check (kind in ('file', 'link')),
  url            text check (url is null or url ~* '^https?://'),
  storage_path   text,
  file_name      text,
  file_size      bigint,
  status         text check (status in ('por_firmar', 'firmado', 'pagado', 'por_aprobar', 'aprobado', 'entregado', 'recibido')),
  visible        boolean not null default true,         -- false = solo lo ve el equipo
  uploaded_by    uuid references public.profiles (id) on delete set null,
  check ((kind = 'file' and storage_path is not null) or (kind = 'link' and url is not null))
);
alter table public.documents enable row level security;
create index if not exists documents_client_idx on public.documents (client_id, created_at desc);

drop policy if exists "el equipo maneja documentos" on public.documents;
create policy "el equipo maneja documentos" on public.documents
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "el cliente ve sus documentos" on public.documents;
create policy "el cliente ve sus documentos" on public.documents
  for select to authenticated using (public.owns_client(client_id) and visible);

-- El cliente solo puede SUBIR material propio (fotos, textos, logos)
drop policy if exists "el cliente sube su material" on public.documents;
create policy "el cliente sube su material" on public.documents
  for insert to authenticated
  with check (public.owns_client(client_id) and category = 'material' and visible and uploaded_by = auth.uid()
              and (status is null or status = 'recibido'));

-- ---------- Almacenamiento privado: carpeta por cliente ----------
-- Ruta de cada archivo: <id del cliente>/<código>-<nombre>.pdf  ·  máximo 25 MB
insert into storage.buckets (id, name, public, file_size_limit)
values ('documentos', 'documentos', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;

drop policy if exists "rakun equipo archivos" on storage.objects;
create policy "rakun equipo archivos" on storage.objects
  for all to authenticated
  using (bucket_id = 'documentos' and public.is_staff())
  with check (bucket_id = 'documentos' and public.is_staff());

-- El cliente lee archivos de su carpeta, pero solo si el documento está visible para él
drop policy if exists "rakun cliente lee sus archivos" on storage.objects;
create policy "rakun cliente lee sus archivos" on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos' and exists (
    select 1 from public.documents d
    where d.storage_path = storage.objects.name and d.visible and public.owns_client(d.client_id)));

drop policy if exists "rakun cliente sube a su carpeta" on storage.objects;
create policy "rakun cliente sube a su carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documentos' and public.owns_client(((storage.foldername(name))[1])::uuid));
