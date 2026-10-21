# Conectar RAKÜN con Supabase (fase 1)

Esta fase activa:
- el formulario **"Quiero este plan"** (Marca personal y Web) y el **guion** de Producción, que guardan cada solicitud;
- **Iniciar sesión** (`login.html`), **Crea tu contraseña** (`cuenta.html`), el **gestor** (`admin.html`) y el **portal** (`portal.html`).

Mientras no termines estos pasos, la página sigue funcionando: las solicitudes se envían por correo.

---

## 1 · Crear las tablas

1. En Supabase, abre tu proyecto → **SQL Editor** → **New query**.
2. Pega todo el contenido de `supabase/schema.sql` y dale **Run**.
3. Debe decir *Success*. Se puede volver a correr sin perder datos.

## 2 · Ajustes de acceso (Authentication)

1. **Authentication → Sign In / Providers → Email**
   - Desactiva **Allow new users to sign up**. Así nadie se crea una cuenta solo: los accesos los creas tú desde el gestor.
   - En **Email OTP Expiration** pon `86400` (24 horas), para que el enlace de acceso no venza en 1 hora.
2. **Authentication → URL Configuration**
   - **Site URL**: la dirección donde esté la página. Mientras pruebas en tu computador, la de tu servidor local (por ejemplo `http://127.0.0.1:5500`). Cuando la publiques en Netlify, cámbiala por la de Netlify o tu dominio.
   - **Redirect URLs**: agrega la página de contraseña, por ejemplo `http://127.0.0.1:5500/cuenta.html` y, cuando exista, `https://tu-sitio.netlify.app/cuenta.html`.

## 3 · Tu usuario de administrador

1. **Authentication → Users → Add user → Create new user**: tu correo, una contraseña y marca **Auto Confirm User**.
2. En **SQL Editor**, corre esto (con tu correo):

```sql
update public.profiles
set role = 'admin',
    full_name = 'Wilmer Alejandro Buriticá Alvira',
    area = 'Dirección creativa',
    color = '#FF2C68'
where email = 'rakundesigns@gmail.com';
```

Al resto del equipo lo invitas después desde el gestor → **Equipo → Invitar al equipo**.

## 4 · La función que crea los accesos

1. **Edge Functions → Deploy a new function → Via Editor**.
2. Nombre: `invitar` (exacto, en minúsculas).
3. Borra el ejemplo, pega todo `supabase/functions/invitar/index.ts` y dale **Deploy**.
4. Deja activado **Verify JWT** (solo alguien con sesión puede usarla).

La clave secreta (`service_role`) la pone Supabase solo dentro de la función. **Nunca** la pegues en la página ni la compartas.

## 5 · Conectar la página

En **Project Settings → API** copia:
- **Project URL**
- **anon public** (o *publishable key*)

y pégalos en `app/config.js`:

```js
export const SUPABASE_URL = 'https://xxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi…';
```

Estas dos sí pueden ir en la página: la seguridad la ponen las reglas de la base de datos.

## 6 · (Recomendado) Correos desde tu Gmail

El correo que trae Supabase por defecto solo le escribe a tu propio equipo y manda muy pocos por hora. Para que "¿Olvidaste tu contraseña?" e "Invitar por correo" les lleguen a los clientes:

1. En tu cuenta de Google: **Seguridad → Verificación en 2 pasos** (actívala) → **Contraseñas de aplicaciones** → crea una para "RAKÜN".
2. En Supabase: **Authentication → Emails → SMTP Settings** → activa *Custom SMTP*:
   - Host `smtp.gmail.com` · Port `465`
   - User: tu Gmail · Password: la contraseña de aplicación
   - Sender name: `RAKÜN Visual Design`

Mientras no lo hagas, usa **Generar enlace** en el gestor y mándalo por WhatsApp: no necesita correo.

## 7 · Probar

La página tiene que abrirse desde un servidor (no con doble clic en el archivo). En VS Code, la extensión **Live Server** sirve. Prueba:

1. `login.html` → entra con tu usuario → te lleva al gestor.
2. En `marca.html`, toca **Quiero este plan**, llena el formulario → aparece en **Solicitudes**.
3. **Convertir en cliente → Crear acceso → Generar enlace** → abre el enlace en una ventana privada → crea la contraseña → entras al portal.

---

# Fase 2 · Proyectos, parrillas y planes

1. **SQL Editor → New query** → pega todo `supabase/fase2.sql` → **Run**. Crea:
   - `projects`: los proyectos de cada cliente (marca, producción, web) con su etapa.
   - `posts`: la parrilla de contenido. El cliente solo ve lo que se le envía ("Por aprobar" en adelante) y solo puede aprobar o pedir cambios.
   - `plan_catalog`: los planes y precios que se publican desde el gestor.
2. Nada más. No hay que tocar la función `invitar` ni `app/config.js`.

Cómo se usa:
- **Proyectos → Nuevo proyecto**: elige el cliente y el tipo. La etapa que marques es la que ve el cliente en su portal.
- **Parrillas**: elige el proyecto, toca un día para crear una pieza, márcala como "Lista" y luego **Enviar al cliente para aprobar**. El cliente la ve en su portal → pestaña **Parrilla**, y puede aprobar o pedir un cambio.
- **Planes y precios**: edita, y cuando esté listo toca **Publicar en la página**. Mientras no publiques, la página sigue mostrando los precios base del Excel.

---

# Fase 3 · Documentos

1. **SQL Editor → New query** → pega todo `supabase/fase3.sql` → **Run**. Crea:
   - la tabla `documents` (contratos, recibos, estrategias, guiones, briefs, entregables, reportes y material del cliente);
   - la carpeta privada de archivos `documentos` en **Storage** (máximo 25 MB por archivo), con una subcarpeta por cliente.
2. Puedes comprobarlo en **Storage**: debe aparecer el bucket `documentos` marcado como privado.

Cómo se usa:
- **Gestor → Documentos → Subir documento**: elige cliente, proyecto, carpeta y estado, y sube un archivo o pega un link. Desmarca "Lo ve el cliente" si es solo para el equipo.
- **Portal → Documentos**: el cliente ve sus documentos por carpeta, los abre o descarga y puede **subir su material** (archivo o link), que te aparece en "Material del cliente".
- Los archivos se abren con un enlace temporal de 5 minutos: nadie puede compartirlos por fuera de la cuenta.

---

# Fase 4 · Grabaciones y reuniones

1. **SQL Editor → New query** → pega todo `supabase/fase4.sql` → **Run**. Crea:
   - `shoots` (grabaciones): fecha, duración, lugar, dirección, quién va del equipo y qué debe preparar el cliente;
   - `meetings` (reuniones): tema, tipo, fecha, link de Meet, con quién y los acuerdos;
   - `team_members()`: deja que el cliente vea solo el nombre y el área de quienes trabajan en lo suyo.

Cómo se usa:
- **Gestor → Grabaciones → Programar grabación**. El cliente la ve en su portal, marca su lista de "para ese día" y toca **Confirmo** o **Necesito otra fecha** (con los días que le sirven). Su respuesta te aparece en la grabación.
- **Gestor → Reuniones → Agendar reunión**, con el link de Google Meet. El cliente también puede **pedir una reunión** desde su portal: te aparece arriba en rojo, con el número en el menú, y la confirmas poniéndole fecha y link.
- Después de cada reunión, escribe los **acuerdos**: el cliente los ve en su historial.

---

# Fase 5 · Eliminar clientes y solicitudes, buscador de lugares

1. **SQL Editor → New query** → pega todo `supabase/fase5.sql` → **Run**. Crea `delete_client()`, que solo puede usar el administrador.

Cómo se usa:
- **Gestor → Clientes → ✕**: muestra cuánto se va a borrar (proyectos, parrilla, documentos, grabaciones, reuniones) y pide escribir el nombre del cliente para confirmar. Borra todo lo suyo, sus archivos y su acceso al portal. **No se puede deshacer.**
- **Gestor → Solicitudes → abrir una → Eliminar solicitud** (solo administrador).
- **Gestor → Grabaciones → Programar grabación**: al escribir en "Lugar" o "Dirección" aparecen sugerencias (buscador gratuito de OpenStreetMap, sin clave). También salen los **lugares anteriores** como atajos y un enlace "Ver en el mapa". La dirección siempre se puede corregir a mano.

---

# Correo propio (para "¿Olvidaste tu contraseña?")

El correo gratis de Supabase solo le escribe a tu equipo y muy pocas veces por hora. Se conecta el Gmail de RAKÜN:

1. **Cuenta de Google de rakundesigns@gmail.com → Seguridad →** activa la **Verificación en 2 pasos** (si no está).
2. Entra a **https://myaccount.google.com/apppasswords**, crea una contraseña de aplicación con el nombre `Supabase RAKÜN` y copia las 16 letras. (No es tu contraseña de Gmail; nunca la pongas en la página.)
3. **Supabase → Authentication → Emails → SMTP Settings → Enable custom SMTP**:
   - Sender email: `rakundesigns@gmail.com` · Sender name: `RAKÜN`
   - Host: `smtp.gmail.com` · Port: `465`
   - Username: `rakundesigns@gmail.com` · Password: las 16 letras del paso 2
   - Guardar.
4. **Authentication → Rate Limits →** "Rate limit for sending emails": súbelo a **30 por hora**.
5. **Authentication → Emails → Templates → Reset password**: asunto `Crea tu nueva contraseña · RAKÜN` y en el cuerpo pega todo `supabase/correos/recuperar-contrasena.html`.

Gmail permite hasta unos 500 correos al día: de sobra para recuperar contraseñas. Si algún día tienen dominio propio (rakun.co), se cambia a un servicio como Resend.

## Fase 6 · «Nuestro trabajo» (los proyectos de la página)

1. **SQL Editor → New query** → pega todo `supabase/fase6.sql` → **Run**. Crea:
   - la tabla `works` (los proyectos que se ven en la página; los publicados los puede leer cualquiera, solo el equipo los cambia),
   - la carpeta pública `trabajo` en Storage (fragmentos, imágenes y páginas de manuales; máximo 50 MB por archivo),
   - y carga los proyectos que ya estaban: los 6 videos de la videoteca, los reels de Doc Mariana Hoyos y la identidad de Eduardo López Jaramillo.
2. Listo: en el gestor aparece **08 · Nuestro trabajo**. Desde ahí se agregan, publican y ordenan los proyectos.

Mientras no corras este archivo, la página muestra los mismos proyectos desde una copia de respaldo (`trabajo/seed.js`), así que nada se ve vacío.

Recomendaciones para los archivos:
- **Fragmentos:** 8 a 12 segundos, sin sonido, MP4 (H.264) a 1920 px de ancho. Lo ideal es que pesen menos de 4 MB.
- **Imágenes:** se achican solas a WebP al subirlas.
- **Manual de marca:** sube el PDF y cada página se convierte en imagen ahí mismo (tarda más o menos un minuto).
- **Video completo:** va como enlace de YouTube; no ocupa espacio.

## Fase 7 · Cotizador y entregables

1. **SQL Editor → New query** → pega todo `supabase/fase7.sql` → **Run**. Crea:
   - las tablas `quotes` (cotizaciones), `quote_payments` (pagos) y `deliverables` (entregables), que solo maneja el equipo,
   - dos funciones para que el cliente vea y acepte su cotización con el enlace secreto, sin cuenta,
   - la carpeta privada `entregas` en Storage (archivos entregados y comprobantes de pago; máximo 50 MB),
   - y permite guardar los datos del recibo en el catálogo.
2. En el gestor:
   - **00 · Mis pendientes** es lo primero que ve cada persona: sus entregables por fecha y lo que le toca revisar.
   - **03 · Proyectos → Cotizaciones**: armar, enviar (enlace para WhatsApp o correo) y registrar pagos. Con el primer pago se crean los proyectos, uno por bloque, con sus entregables.
   - **09 · Planes y precios → Producción**: las tarifas base que salen al cotizar producción. **→ Recibo**: NIT, ciudad, WhatsApp, cómo pagar y condiciones.
   - **10 · Equipo → Carga de trabajo**: lo pendiente de cada persona; se arrastra para reasignar.
3. El cliente abre `cotizacion.html?c=…`, la acepta y la descarga en PDF (el botón imprime la hoja; en el diálogo elige «Guardar como PDF»).

La factura electrónica y el pago en línea (Wompi) quedan para otra fase.

## Fase 8 · Escena 3 y ajustes del Inicio

**SQL Editor → New query** → pega todo `supabase/fase8.sql` → **Run**. Agrega la escena 3 de los proyectos y deja guardar el interruptor de «Lo que dicen» (09 → Inicio).

## Fase 9 · Métricas propias y tarifas del equipo

1. **SQL Editor → New query** → pega todo `supabase/fase9.sql` → **Run**. Crea:
   - `page_events`: el contador propio de la página (visitas, «¿Qué buscas?», solicitudes). Sin cookies ni datos personales; cualquiera anota, solo el equipo lee.
   - `app_settings`: ajustes privados del gestor (los % de pago por rol). Solo el equipo lee, solo el admin cambia.
   - la función `metrics_summary`, que entrega el resumen de **11 · Métricas** ya contado.
2. En el gestor:
   - **11 · Métricas**: visitas, páginas más vistas, «¿Qué buscas?», de dónde llegan, solicitudes, planes pedidos y vendidos, cotizaciones y cobros. Las visitas empiezan a contar desde que se suba la página (las pruebas en tu computador no cuentan).
   - **12 · Tarifario**: todo lo que se vende con su precio y «Tu pago» según los %.
   - **09 · Planes y precios → Tarifas y pagos 🔒**: los % de cada rol por producto y quién cubre cada rol.

## Fase 10 · Permisos, mensajes, pagos por tarea y comisiones

1. **SQL Editor → New query** → pega todo `supabase/fase10.sql` → **Run** (después de las fases 7, 8 y 9).
2. **Permisos** (10 · Equipo → Personas y permisos → «Permisos» en cada persona): eliges un rol listo (Directora, Manager, Editor/a, Cámara) o marcas sección por sección qué ve y qué edita, y si **ve plata**. Lo que no tiene marcado no le aparece en el menú y la base de datos tampoco se lo entrega. Quien no tiene permisos guardados sigue viendo todo, como hasta ahora.
3. **Mensajes** (10 · Equipo → Mensajes): a todo el equipo, a una persona o al equipo de un proyecto. Salen arriba en *Mis pendientes* hasta que se marcan como vistos.
4. **Pagos por tarea** (03 · Proyectos → abrir un proyecto → Dinero del proyecto): el valor de cada entregable. Cada persona ve en *Mis pendientes* lo que lleva por cobrar.
5. **Comisiones del manager**: se anotan solas al registrar pagos de cotizaciones que están a su nombre, si él cubre el rol «Manager» en 09 → Tarifas y pagos. Planes de Redes → una comisión por cada mes pagado (desde el mes 2, con «Registrar pago del mes» en Dinero del proyecto). Ventas sueltas → una sola vez.
6. **Pagos y comisiones** (10 · Equipo, solo admin): lo que se le debe a cada quien, con «Marcar pagado».

## Fase 11 · Seguimiento por anuncio y conexión con Meta

**A · Base de datos:** SQL Editor → pega todo `supabase/fase11.sql` → Run (después de las fases 9 y 10).

**B · Seguimiento por anuncio (funciona ya, sin token):** en el Administrador de anuncios, en cada anuncio → *Parámetros de URL*, pega:
```
utm_source=meta&utm_medium=pauta&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
```
Cada visita y cada solicitud quedan marcadas con su campaña y anuncio. En 11 · Métricas → «Por anuncio» ves personas, solicitudes, ventas y lo vendido de cada anuncio; en cada solicitud, «Vino de un anuncio».

**C · Traer el gasto y los resultados de Meta (una sola vez):**
1. **Crear la app:** developers.facebook.com → Mis apps → Crear app → tipo *Empresa*, conectada al Business Manager de RAKÜN. Agrega el producto **Marketing API**.
2. **Usuario del sistema:** Configuración del negocio → Usuarios → *Usuarios del sistema* → Agregar (rol *Administrador*). Asígnale la cuenta publicitaria de RAKÜN (y la app) con permiso de ver rendimiento.
3. **Token:** en ese usuario del sistema → *Generar token* → elige la app → marca **ads_read** (y *read_insights*) → vencimiento *Nunca*. Cópialo (no lo pegues en el chat ni en la página).
4. **Guardar el token en Supabase:** Edge Functions → *Secrets* → nuevo secreto `META_TOKEN` = el token.
5. **Subir la función:** Edge Functions → *Deploy a new function* → nombre `meta-sync` → pega `supabase/functions/meta-sync/index.ts` → Deploy (o `supabase functions deploy meta-sync`).
6. En el gestor: 11 · Métricas → **Conectar cuenta de RAKÜN** → el ID de la cuenta (act_…) → Guardar. Trae los últimos 30 días.
7. **Cada noche, solo (opcional):** crea el secreto `CRON_SECRET` con una clave cualquiera y en SQL Editor programa la llamada:
```sql
select cron.schedule('meta-sync-noche', '0 6 * * *', $$
  select net.http_post(url := 'https://TU-PROYECTO.supabase.co/functions/v1/meta-sync',
    headers := '{"Content-Type":"application/json","x-cron-secret":"TU_CLAVE"}'::jsonb, body := '{"days":7}'::jsonb) $$);
```
(necesita las extensiones *pg_cron* y *pg_net* activas en Database → Extensions).

**D · Clientes:** el cliente agrega a RAKÜN como **socio** en su Business Manager (Configuración del negocio → Socios → Agregar socio → ID del negocio de RAKÜN) y le comparte su cuenta publicitaria. Luego en 11 · Métricas → Clientes → «Conectar un cliente» → su act_…. El token de RAKÜN lee su cuenta. Si no se puede, la opción B guarda un token propio del cliente (nadie lo vuelve a ver).

## Fase 12 · Métricas por anuncio, más completas
Corre `supabase/fase12.sql` en el SQL Editor (después de la fase 11). Hace tres cosas:
- decodifica los nombres de campaña y anuncio que llegaban como `RAK%C3%9CN+%7C+Leads…` (los que ya estaban y los nuevos);
- agrega `metrics_ads(days)`: por anuncio, gasto, alcance, impresiones, clics y CTR de Meta junto a las personas, formularios y ventas del gestor;
- en 11 · Métricas → Por anuncio, cada anuncio se abre y muestra quién llenó el formulario (y abre su solicitud).

## Fase 13 · Métricas que se explican solas
Corre `supabase/fase13.sql` en el SQL Editor (después de la fase 12) y vuelve a subir la función `meta-sync`
(Edge Functions → meta-sync → pega `supabase/functions/meta-sync/index.ts` → Deploy). Con eso:
- meta-sync trae también los clics en el enlace, las reproducciones de 3 s (gancho) y los ThruPlay (retención);
- 11 · Métricas → Por anuncio muestra CPM, gancho, retención, CTR, CPC, leads ÷ visitas, costo por lead y frecuencia, cada uno con su semáforo (bien / en medio / alerta) y una «i» que explica qué es y cuál es el ideal;
- el botón «¿Qué significa cada métrica?» abre el glosario; el admin cambia ahí los rangos (se guardan en `app_settings` id `metas`).
Después de desplegar, dale a «Actualizar ahora» para que se vuelvan a traer los 30 días con los datos nuevos.

## Fase 14 · Métricas por campaña con su seguimiento
Corre `supabase/fase14.sql` en el SQL Editor (después de la fase 13). Con eso:
- 11 · Métricas → «Por campaña»: campaña → conjunto de anuncios → anuncio, cada uno con su semáforo;
- cada campaña tiene su pestaña «Seguimiento»: tareas, revisiones del día N de la campaña (se cuentan desde el primer día con gasto en Meta), reglas como «responder cada lead en menos de 15 min» y configuraciones; la plantilla «Lanzamiento de campaña» crea las del día 0, 3, 7, 14 y la regla de una vez;
- lo asignado a cada persona le sale en 00 · Mis pendientes, con la cuenta regresiva.
Lo ve y lo edita quien tenga el permiso de 11 · Métricas; la persona asignada puede marcarlo como hecho.

## Aviso por WhatsApp cuando entra un lead (función `aviso-lead`)
Envía con el **WhatsApp oficial de Meta** (Cloud API). Si algún día se usa CallMeBot, basta con sus secretos (`CALLMEBOT_APIKEY`, `CALLMEBOT_PHONE`).
1. **Agrega WhatsApp a la app:** developers.facebook.com → tu app → Agregar producto (o Casos de uso) → **WhatsApp** → Configurar, con el negocio de RAKÜN. Meta crea una cuenta de WhatsApp Business y un **número de prueba** que envía.
2. **El número que recibe:** WhatsApp → Configuración de la API → «Para» → agrega **+57 350 446 1460** y confírmalo con el código que te llega.
3. **Copia el «Identificador del número de teléfono»** (del número de prueba) → secreto `WA_PHONE_ID`.
4. **El token:** Business Manager → Usuarios del sistema → tu usuario → Asignar activos → **Cuentas de WhatsApp** (control total) → Generar nuevo token con **whatsapp_business_messaging** y **whatsapp_business_management**, caducidad «Nunca» → secreto `WA_TOKEN`.
5. **La plantilla:** WhatsApp Manager → Plantillas de mensajes → Crear → categoría **Utilidad** · nombre `aviso_lead` · idioma **Español** · cuerpo:
   `Nuevo lead en RAKÜN: {{1}}. Plan: {{2}}. Vino de: {{3}}. Escríbele: {{4}}. Responde en menos de 15 minutos.`
   (ejemplos para la revisión: «Laura Gómez · Redes», «Gestión completa · Equilibrio», «H1-Agenda», «wa.me/573001234567»). Mientras la aprueban, prueba con `WA_TEMPLATE` = `hello_world` y `WA_LANG` = `en_US`.
6. **Secretos** (Edge Functions → Secrets): `WA_TOKEN` · `WA_PHONE_ID` · `WA_TO` = `573504461460` · `WEBHOOK_SECRET` = una clave larga que inventes.
7. **Sube la función:** Edge Functions → Deploy a new function → nombre `aviso-lead` → pega `supabase/functions/aviso-lead/index.ts` → Deploy.
8. **El webhook:** Database → Webhooks → Create a new hook → nombre `aviso-lead` · tabla `leads` · evento **Insert** · tipo **Supabase Edge Functions** → `aviso-lead` · POST · activa «Add auth header with service key» · encabezado `x-webhook-secret` con la clave de `WEBHOOK_SECRET`.
9. Llena el formulario de la página para probar.

## Fase 15 · Tarifas y pagos nuevos (ronda extra de edición)
Corre `supabase/fase15.sql` en el SQL Editor (después de la fase 14). Agrega a cada tarea lo que vale una ronda extra (`round_pay`) y cuántas lleva (`extra_rounds`), y la función `extra_round`: quien revisa, al devolver una tarea, puede marcarla como ronda extra y se le suma ese valor a quien la hizo.
Después, en el gestor: 09 · Planes y precios → **Tarifas y pagos 🔒** → revisa los % y los pagos y dale **Guardar** (la tabla vieja de % por rol queda reemplazada), y en **Quién cubre cada rol** elige a quien hace la venta y la operación.
