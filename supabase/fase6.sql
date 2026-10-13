-- =============================================================================
-- RAKÜN · base de datos · fase 6: «Nuestro trabajo» (el portafolio)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → Run.
-- Crea la tabla de proyectos que se ven en la página, la carpeta pública de
-- archivos (fragmentos, imágenes, páginas de manuales) y carga los proyectos
-- que ya estaban en la videoteca.
-- =============================================================================

create table if not exists public.works (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  kind          text not null default 'video' check (kind in ('video', 'reel', 'identidad', 'web')),
  category      text check (char_length(category) <= 40),       -- videoclip, corto, documental, magazine, podcast, comercial…
  title         text not null check (char_length(title) between 1 and 160),
  client        text check (char_length(client) <= 160),
  year          int check (year between 1990 and 2100),
  did           text check (char_length(did) <= 200),            -- «Dirección · Foto · Post»
  summary       text check (char_length(summary) <= 300),        -- la línea corta de la franja
  description   text,                                            -- la sección del ojo
  exp_title     text check (char_length(exp_title) <= 160),
  exp_text      text,
  quote         text check (char_length(quote) <= 400),
  quote_by      text check (char_length(quote_by) <= 160),
  cover_url     text,                                            -- foto fija (también el póster de los fragmentos)
  frag_url      text,                                            -- fragmento que arranca solo
  frag_v_url    text,                                            -- su versión vertical para celular
  frag2_url     text,                                            -- el fragmento de «La experiencia»
  youtube_id    text check (youtube_id is null or youtube_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  pieces        jsonb not null default '[]'::jsonb,              -- [{ "url": "…", "label": "…" }]
  bts           jsonb not null default '[]'::jsonb,              -- detrás de cámaras y spinoffs
  pages         jsonb not null default '[]'::jsonb,              -- identidad: una imagen por página del manual
  pdf_url       text,
  palette       text[] not null default '{}',
  site_url      text check (site_url is null or site_url ~* '^https?://'),
  reels         jsonb not null default '[]'::jsonb,              -- reel: [{ "yt": "…", "video_url": "…", "poster": "…", "label": "…" }]
  status        text not null default 'borrador' check (status in ('borrador', 'publicado')),
  featured      boolean not null default false,                  -- ★ en el Inicio
  in_videoteca  boolean not null default false,                  -- botón «Ver el proyecto» en la videoteca
  sort          int not null default 0
);
alter table public.works enable row level security;

drop policy if exists "rakun trabajo publico" on public.works;
create policy "rakun trabajo publico" on public.works
  for select to anon, authenticated using (status = 'publicado' or public.is_staff());

drop policy if exists "rakun trabajo equipo" on public.works;
create policy "rakun trabajo equipo" on public.works
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- Carpeta pública de archivos del portafolio (máximo 50 MB por archivo) ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('trabajo', 'trabajo', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "rakun trabajo archivos" on storage.objects;
create policy "rakun trabajo archivos" on storage.objects
  for all to authenticated
  using (bucket_id = 'trabajo' and public.is_staff())
  with check (bucket_id = 'trabajo' and public.is_staff());

-- ---------- Lo que ya estaba en la página ----------
insert into public.works (slug, kind, category, title, client, year, did, summary, description, cover_url, youtube_id, pieces, status, featured, in_videoteca, sort) values
('amor-de-calle', 'video', 'videoclip', 'Amor de calle', 'Apostol', 2026, 'Dirección · Foto · Post', 'La crudeza urbana contada sin filtros.', '"Amor de calle" es un videoclip que nace de plasmar la crudeza urbana como una narrativa visual directa y sin filtros. En RAKÜN asumimos el control absoluto del proyecto: la dirección creativa, la coescritura del guion, la fotografía y la postproducción, cuidando cada detalle técnico, desde la iluminación en set hasta un montaje dinámico con color grading cinematográfico.', 'https://i.ytimg.com/vi/4RtfGuRQXYw/maxresdefault.jpg', '4RtfGuRQXYw', '[]'::jsonb, 'publicado', true, true, 1),
('el-pregon-de-la-plaza', 'video', 'documental', 'El pregón de la plaza', 'Proyecto transmedia', 2026, 'Dirección · Cámara · Post', 'El «caos con sentido» de los mercados de Pereira, como patrimonio vivo.', '“El pregón de la plaza” analiza la dinámica de los mercados populares Mercasa e Impala en la ciudad de Pereira (Risaralda). La obra aborda la tensión sociológica entre el estigma sonoro que aleja a las nuevas generaciones y la urgencia de reivindicar la “estética vernácula acústica” de la plaza como un patrimonio vivo, profundamente arraigado en los principios fundacionales de la región. Lejos de ser un desorden aleatorio, el “caos con sentido” del mercado, marcado por el pregón incesante, el descargue logístico y el regateo, constituye un sistema identitario de ruidos funcionales que responden a necesidades operativas, vitales y humanas.', 'https://i.ytimg.com/vi/9jISh5-TYGk/maxresdefault.jpg', '9jISh5-TYGk', '[]'::jsonb, 'publicado', true, true, 2),
('otro-amanecer', 'video', 'videoclip', 'Otro amanecer', 'Apostol', 2026, 'Dirección · Foto · Post', 'El paso de la oscuridad a la luz como un despertar visceral.', '"Otro amanecer" es un videoclip que nace de explorar el paso de la oscuridad a la luz como un despertar visceral y lleno de contrastes. En RAKÜN asumimos el control absoluto del proyecto: la dirección creativa, la fotografía y la postproducción, cuidando cada detalle técnico, desde la iluminación en set hasta un montaje dinámico con color grading cinematográfico.', 'https://i.ytimg.com/vi/Yv687H7gZnk/maxresdefault.jpg', 'Yv687H7gZnk', '[]'::jsonb, 'publicado', true, true, 3),
('nos-fui-pues-mijo', 'video', 'magazine', 'Nos fui ¡Pues mijo!', 'Universidad Cooperativa de Colombia, Pereira', 2025, 'Dirección · Cámara · Post', 'Un magazine sobre la vida del campo con una historia que lo une.', 'Una propuesta audiovisual que reestructura el concepto clásico del magazine. El objetivo fue crear una pieza sobre la vida del campo que no se sintiera episódica, sino cohesiva, gracias a una historia central que conecta las temáticas. Asumimos la dirección, la cámara y la edición, para que la transición entre la ficción y el contenido documental mantuviera una estética visual unificada y atractiva.', 'https://i.ytimg.com/vi/pH4I3-CPcwU/maxresdefault.jpg', 'pH4I3-CPcwU', '[]'::jsonb, 'publicado', false, true, 4),
('creative-mornings', 'video', 'podcast', 'Creative Mornings', 'CreativeMornings Pereira', 2025, 'Cámara · Sonido · Post', 'Un episodio especial del podcast, grabado en sitio.', 'Colaboración técnica para el capítulo local de la comunidad global CreativeMornings, un espacio mensual de desayunos, charlas y conexiones. Producimos un episodio especial del podcast: grabamos el audio en sitio y nos encargamos de la edición y la postproducción, para que el mensaje de la charla llegara con la máxima claridad y calidad sonora a la audiencia digital.', 'https://i.ytimg.com/vi/x8bgyfs9UeE/maxresdefault.jpg', 'x8bgyfs9UeE', '[]'::jsonb, 'publicado', false, true, 5),
('donde-la-musica-muere', 'video', 'corto', 'Donde la música muere', 'Proyecto de semestre', 2024, 'Dirección · Foto · Cámara · Post', 'Una reinterpretación del universo de ¡Que viva la música!', 'Una reinterpretación visual inspirada en el universo frenético de ¡Que viva la música! de Andrés Caicedo. Este cortometraje explora la decadencia y la euforia urbana a través de una narrativa experimental. Asumimos un rol multidisciplinario (dirección, cámara y edición) para que la visión estética y el ritmo del montaje transmitieran fielmente la atmósfera caicediana, desde el rodaje hasta el corte final.', 'https://i.ytimg.com/vi/dAaUGrENSRQ/sddefault.jpg', 'dAaUGrENSRQ', '[]'::jsonb, 'publicado', false, true, 6)
on conflict (slug) do nothing;

insert into public.works (slug, kind, category, title, client, summary, cover_url, reels, status, sort) values
('doc-mariana-hoyos', 'reel', 'reel', 'Doc Mariana Hoyos', 'Veterinaria', 'Estrategia, grabación y edición para redes.',
 'https://i.ytimg.com/vi/u6wRut-pz0s/oardefault.jpg',
 '[{"yt":"u6wRut-pz0s","poster":"https://i.ytimg.com/vi/u6wRut-pz0s/oardefault.jpg","label":"Reel 01"},
   {"yt":"rlkpU8R4dfY","poster":"https://i.ytimg.com/vi/rlkpU8R4dfY/oardefault.jpg","label":"Reel 02"},
   {"yt":"Dr49vCa60ug","poster":"https://i.ytimg.com/vi/Dr49vCa60ug/oardefault.jpg","label":"Reel 03"}]'::jsonb,
 'publicado', 7)
on conflict (slug) do nothing;

insert into public.works (slug, kind, category, title, client, did, summary, description, palette, status, sort) values
('eduardo-lopez-jaramillo', 'identidad', 'identidad', 'Eduardo López Jaramillo', 'ELJ', 'Concepto · Isologo · Manual · Aplicaciones',
 'El ojo que observa y el estallido que rompe la contención.',
 'La identidad de ELJ se construye sobre la tensión entre el intelectual reservado y el poeta transgresor. El ojo representa su intelecto y su rol de observador; el estallido es la ruptura de esa contención: su «yo» interior, la energía creativa que emerge desde el centro mismo de su percepción.',
 '{"#FF2C68","#272727","#FFF4C8"}', 'publicado', 8)
on conflict (slug) do nothing;
