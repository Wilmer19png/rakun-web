/* ==========================================================================
   RAKÜN · configuración de la conexión con Supabase
   Supabase → Project Settings → API:
     - SUPABASE_URL      = "Project URL"
     - SUPABASE_ANON_KEY = "anon public" (o "publishable key")
   Estas dos SÍ pueden ir en la página. NUNCA pongas aquí la service_role/secret key.
   Mientras estén vacías, el formulario de planes manda la solicitud por correo.
   ========================================================================== */
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

// Enlace de Cal.com para agendar la reunión (p. ej. 'https://cal.com/rakun/20min'). Vacío = se oculta.
export const CALCOM_URL = '';

// Correo de respaldo cuando Supabase aún no está conectado
export const CONTACT_EMAIL = 'rakundesigns@gmail.com';
