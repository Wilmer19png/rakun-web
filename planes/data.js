/* ==========================================================================
   RAKÜN · datos base de Redes (mundo 01) y de Web y apps
   Son los datos "de fábrica". Si en el gestor (09 · Planes y precios) se
   publican cambios, la página los toma de Supabase (tabla plan_catalog, id
   'marca') y estos quedan de respaldo. Precios en COP antes de IVA.
   ========================================================================== */

/** Los tipos de edición: nombre, color y qué incluye. 'tier' es el nivel de «Tipos de edición · 3 niveles». */
export const LEVELS = {
  agil: { name: 'Ágil', color: 'var(--blue)', desc: 'Cortes, subtítulos, gancho y música en tendencia.', tier: 0 },
  pro: { name: 'Pro', color: 'var(--yellow)', desc: 'Lo del Ágil + gráficos, zooms y efectos de sonido.', tier: 1 },
  premium: { name: 'Premium', color: 'var(--pink)', desc: 'Motion graphics, diseño sonoro y color.', tier: 2 },
};

/** Tipos de pieza de la librería: con qué servicio de la carta se cobran (el precio sale de la carta). */
export const PIECES = {
  agil: { name: 'Ágil', color: 'var(--blue)', item: 'Video ágil', level: 'agil' },
  pro: { name: 'Pro', color: 'var(--yellow)', item: 'Video Pro', level: 'pro' },
  premium: { name: 'Premium', color: 'var(--pink)', item: 'Video Premium', level: 'premium' },
  recorte: { name: 'Recorte', color: 'var(--mist)', item: 'Recorte vertical' },
  carrusel: { name: 'Carrusel', color: 'var(--mist)', item: 'Carrusel' },
  anuncio: { name: 'Anuncio', color: 'var(--pink)', item: 'Anuncio para pauta' },
  horizontal: { name: 'Horizontal Pro', color: 'var(--yellow)', item: 'Video horizontal Pro' },
};

export const REDES = {
  v: 2,
  quarterlyPct: 10,                                   // descuento por pago trimestral anticipado
  duration: '20 a 35 s',
  note: 'La inversión en pauta va aparte: la pagas directo a Meta.',
  cats: [
    {
      key: 'contenido', name: 'Solo contenido', color: 'var(--yellow)',
      desc: 'Para los que solo necesitan el contenido. Tú pones la idea; nosotros lo grabamos y lo editamos.',
      plans: [
        { name: 'Ritmo', ideal: 'Para creadores que necesitan publicar seguido y rápido.', ed: 509000, rec: 1190000,
          recText: '1 sesión de hasta 3 h', levels: ['agil'],
          rows: [['Videos verticales', '16 al mes'], ['Publicación', 'La haces tú']] },
        { name: 'Equilibrio', hot: true, ideal: 'Para quienes quieren constancia, pero con piezas que se vean más producidas.', ed: 1290000, rec: 1990000,
          recText: '1 sesión de hasta 3 h', levels: ['pro', 'premium'],
          rows: [['Videos verticales', '14 al mes (12 Pro + 2 Premium)'], ['Publicación', 'La haces tú']] },
        { name: 'Impacto', ideal: 'Para marcas personales que necesitan piezas de alto nivel y presencia en YouTube.', ed: 1990000, rec: 3390000,
          recText: '1 jornada de hasta 6 h con asistente', levels: ['pro', 'premium'],
          rows: [['Videos verticales', '12 al mes (8 Pro + 4 Premium)'], ['Horizontales', '2 videos (hasta 10 min)'], ['Recortes', '6 verticales'], ['Publicación', 'La haces tú']] },
      ],
    },
    {
      key: 'gestion', name: 'Gestión completa', color: 'var(--pink)',
      desc: 'Para los que necesitan todo. Pensamos, escribimos, grabamos, editamos, publicamos y movemos tu pauta.',
      plans: [
        { name: 'Ritmo', ideal: 'Para creadores que quieren crecer con estrategia sin pensar qué publicar.', ed: 2490000, rec: 3090000,
          recText: '1 sesión de hasta 3 h', levels: ['agil'], ads: 500000,
          rows: [['Videos verticales', '16 al mes'], ['Carruseles', '4'], ['Estrategia', 'Estrategia y parrilla'], ['Guiones', '16'], ['Publicación', 'La hacemos nosotros'], ['Pauta', 'Impulso de alcance'], ['Seguimiento', 'Reporte mensual']] },
        { name: 'Equilibrio', hot: true, ideal: 'Para profesionales que quieren empezar a conseguir clientes desde redes.', ed: 3790000, rec: 4490000,
          recText: '1 sesión de hasta 3 h', levels: ['pro', 'premium'], ads: 1000000,
          rows: [['Videos verticales', '14 al mes (12 Pro + 2 Premium)'], ['Carruseles', '4'], ['Estrategia', 'Estrategia y parrilla'], ['Guiones', '14'], ['Publicación', 'La hacemos nosotros'], ['Pauta', '1 campaña'], ['WhatsApp', 'Sistema de captación'], ['Seguimiento', 'Reporte + 1 reunión al mes']] },
        { name: 'Impacto', ideal: 'Para médicos, odontólogos, mentores e influencers consolidados.', ed: 5890000, rec: 7190000,
          recText: '1 jornada de hasta 6 h', levels: ['pro', 'premium'], ads: 2000000,
          rows: [['Videos verticales', '12 al mes (8 Pro + 4 Premium)'], ['Horizontales', '2 + 6 recortes'], ['Carruseles', '6'], ['Anuncios', '2 para pauta'], ['Estrategia', 'Estrategia y parrilla'], ['Guiones', '14'], ['Publicación', 'La hacemos nosotros'], ['Pauta', '1 campaña + 2 de retargeting'], ['WhatsApp', 'Sistema de captación'], ['Seguimiento', 'Reporte + 2 reuniones al mes']] },
      ],
    },
  ],
  // la carta del club: cada servicio es [nombre, unidad, precio, descripción, agotado]
  carta: [
    { name: 'Pauta', items: [
      ['Impulso de alcance', 'Mensual', 489000, 'Ponemos pauta a tus mejores videos para llegar a más gente. Inversión sugerida aparte: desde $500.000 al mes.'],
      ['Pauta Clientes · 1 campaña', 'Mensual', 890000, 'Una campaña pensada para que te escriban y te compren. Inversión sugerida aparte: desde $1.000.000 al mes.'],
      ['Pauta Clientes Pro', 'Mensual', 1887000, '3 campañas y conexión con WhatsApp para atender a los interesados. Inversión sugerida aparte: desde $2.000.000 al mes.'],
      ['Campaña extra', 'Por campaña', 300000, 'Una campaña más para tu plan (otro objetivo, otro público o un lanzamiento). La inversión en pauta va aparte.'],
      ['Configuración inicial de cuentas', 'Una sola vez', 990000, 'Cuentas de Meta, píxel y WhatsApp Business listos para pautar.'],
    ] },
    { name: 'Videos y piezas', items: [
      ['Video ágil', 'Por video', 35000, 'Cortes, subtítulos, gancho y música en tendencia.'],
      ['Video Pro', 'Por video', 90000, 'Lo del ágil más gráficos, zooms y efectos de sonido.'],
      ['Video Premium', 'Por video', 180000, 'Motion graphics, diseño sonoro y color.'],
      ['Recorte vertical', 'Por video', 35000, 'Un momento de tu video largo convertido en vertical.'],
      ['Video horizontal Pro', 'Por minuto', 29900, 'Para YouTube: edición Pro de tu video largo.'],
      ['Video institucional vertical', 'Por proyecto', 1490000, '1 a 2 minutos en vertical mostrando tus instalaciones, tu equipo y cómo atiendes.'],
      ['Carrusel', 'Por carrusel', 99000, 'Láminas diseñadas que se guardan y se comparten.'],
      ['Anuncio para pauta', 'Por video', 179000, 'Un video hecho para vender: un mensaje, una acción.'],
    ] },
    { name: 'Estrategia y gestión', items: [
      ['Estrategia y parrilla', 'Mensual', 509000, 'Qué publicar, cuándo y para qué, organizado en tu calendario del mes.'],
      ['Guion', 'Por guion', 39900, 'Lo que dices en el video, escrito para enganchar desde el primer segundo.'],
      ['Publicación y copys', 'Por pieza', 8900, 'Subimos la pieza con su texto, hashtags y portada.'],
      ['Reporte mensual', 'Mensual', 149000, 'Tus números del mes y lo que vamos a ajustar.'],
      ['Reunión de resultados', 'Por reunión', 199000, 'Revisamos juntos el reporte y decidimos el siguiente paso.'],
      ['Sistema de captación por WhatsApp', 'Mensual', 199000, 'Mensajes y seguimiento para que los interesados que llegan de redes no se pierdan.'],
      ['Automatización de WhatsApp', 'Único', 890000, 'Respuestas automáticas, catálogo, etiquetas y mensajes de seguimiento.'],
    ] },
    { name: 'Grabación y fotos', items: [
      ['Sesión de grabación', 'Hasta 3 h', 769000, 'Grabamos el contenido con equipo profesional.'],
      ['Jornada de grabación', 'Hasta 6 h', 1490000, 'Una jornada completa con asistente para grabar mucho en un día.'],
      ['Sesión de fotos profesional', 'Por sesión', 689000, 'Retratos tuyos, de tu equipo y de tu espacio (20 fotos editadas).'],
      ['Sesión de fotos lifestyle', 'Por sesión', 589000, 'Fotos naturales para tu perfil, portadas y contenido.'],
    ] },
    { name: 'Para tu perfil', items: [
      ['Optimización de perfil', 'Único', 189000, 'Bio, foto, historias destacadas, link en bio y portadas.'],
      ['Kit visual de marca', 'Único', 890000, 'Plantillas de motion, tipografías, colores, portadas y subtítulos con tu estilo.'],
      ['Media kit', 'Único', 389000, 'Tus números, audiencia y tarifas en un documento profesional para enviar a marcas.'],
      ['Página para agendar citas', 'Único + hosting', 1890000, 'Tus servicios, testimonios y un botón de WhatsApp o formulario para agendar.'],
      ['Entrega exprés 24 h', 'Por pieza', '+30%', 'Para tendencias que hay que subir ya.'],
    ] },
  ],
  // la librería de formatos: grupos de perfiles; cada formato es [nombre, descripción, tipo de pieza]
  library: [
    { key: 'creador', title: 'Creadores e influencers', color: 'var(--yellow)',
      profiles: ['Creadores de contenido', 'Influencers', 'Artistas y músicos', 'Emprendedores', 'Deportistas'],
      formats: [
        ['Reacción comentada', 'Reaccionas a un video, noticia o tendencia y das tu opinión en pantalla.', 'agil'],
        ['Sketch de humor', 'Mini escena actuada y graciosa, pensada para compartirse.', 'pro'],
        ['Formato POV', 'Grabado como si quien mira viviera la escena en primera persona.', 'pro'],
        ['Tú vs. tú', 'Apareces dos veces en el mismo video conversando contigo.', 'pro'],
        ['Clips de tu contenido largo', 'Cortamos los mejores momentos de tu podcast o live.', 'recorte'],
        ['Carrusel animado', 'Varias láminas que se deslizan, con elementos en movimiento.', 'carrusel'],
        ['Reel animado', 'Video 100% animado con gráficos y textos. Sin grabación.', 'premium'],
        ['Aftermovie', 'Resumen rápido y emocionante de un evento o lanzamiento.', 'premium'],
      ] },
    { key: 'medico', title: 'Salud y estética', color: 'var(--blue)',
      profiles: ['Médicos', 'Odontólogos', 'Veterinarios', 'Esteticistas', 'Psicólogos', 'Nutricionistas'],
      formats: [
        ['Preguntas y respuestas', 'Respondes las dudas que más te hacen tus pacientes.', 'agil'],
        ['Video publicitario', 'Anuncio para pauta: un mensaje, una acción.', 'anuncio'],
        ['POV de consulta', 'Quien mira vive la consulta en primera persona: cero miedo.', 'pro'],
        ['Carrusel educativo', 'Información clara en láminas que se guardan y se comparten.', 'carrusel'],
        ['Historia con voz en off', 'Contamos un caso con tu voz y video de apoyo, sin que salgas a cámara.', 'pro'],
        ['El paciente vs. el experto', 'Te interpretas a ti y al paciente para resolver un mito.', 'pro'],
        ['Clips de tu charla', 'Los mejores minutos de tu conferencia o live, en vertical.', 'recorte'],
        ['Reel animado', 'Explicamos un procedimiento con animación, sin grabarte.', 'premium'],
      ] },
    { key: 'mentor', title: 'Mentores y empresas', color: 'var(--pink)',
      profiles: ['Mentores', 'Coaches', 'Consultores', 'Empresas', 'Marcas y negocios locales'],
      formats: [
        ['Video de ventas (VSL)', 'Video largo que explica tu oferta paso a paso y lleva a comprar.', 'horizontal'],
        ['Podcast en video', 'Edición entre cámaras, audio limpio, nombres y gráficos.', 'horizontal'],
        ['Video publicitario', 'Anuncio con guion de ventas para llenar tu programa.', 'anuncio'],
        ['Clips del podcast', 'Del episodio de una hora salen diez videos cortos.', 'recorte'],
        ['Carrusel de método', 'Tu método en láminas: paso a paso, guardable.', 'carrusel'],
        ['Preguntas y respuestas', 'Resuelves objeciones antes de que lleguen a ventas.', 'agil'],
        ['Webinar recortado', 'Tu clase en vivo convertida en piezas cortas que venden.', 'recorte'],
        ['Reel animado', 'Tu método explicado con animación, sin grabarte.', 'premium'],
      ] },
  ],
};

/** El precio de un servicio de la carta por su nombre (para la librería). */
export const priceInCarta = (data, itemName) => {
  for (const g of data.carta || []) {
    const it = g.items.find((x) => x[0] === itemName);
    if (it) return { price: it[2], unit: it[1] };
  }
  return null;
};

/** Un catálogo publicado sirve si ya tiene la estructura nueva (v: 2); si es el viejo, se usa REDES. */
export const isRedes = (c) => c && c.v === 2 && Array.isArray(c.cats);

// Planes de Web y apps (web.html). price es texto libre: "desde $3.500.000", "A cotizar"…
export const WEB = {
  plans: [
    { name: 'Landing', for: 'Para lanzar algo ya: un producto, un curso, una campaña.', price: '[precio]', color: 'var(--yellow)',
      list: ['Una página, un objetivo', 'Diseño a medida (cero plantillas)', 'Formulario o WhatsApp', 'Lista para Google y redes'] },
    { name: 'Sitio web', for: 'Para tener tu casa en internet, completa y fácil de editar.', price: '[precio]', color: 'var(--pink)', hot: true,
      list: ['Varias páginas y blog', 'Diseño a medida en todas las pantallas', 'Editable por ti', 'SEO base y analítica'] },
    { name: 'Tienda o app', for: 'Para vender en línea o darle a tus clientes una herramienta propia.', price: '[precio]', color: 'var(--blue)',
      list: ['Tienda online o app a medida', 'Pagos y cuentas de usuario', 'Panel para administrar', 'Soporte después del lanzamiento'] },
  ],
};
