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
