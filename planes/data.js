/* ==========================================================================
   RAKÜN · datos base de los planes (Tarifas_RAKUN_2026.xlsx)
   Son los precios "de fábrica". Si en el gestor se publican cambios,
   la página los toma de Supabase (tabla plan_catalog) y estos quedan de respaldo.
   Precios en COP antes de IVA.
   ========================================================================== */

export const SESSION_PRICE = 649000;            // sesión de grabación (hasta 3 h) · Creadores - Costeo C32

export const DATA = {
  creador: {
    head: {
      kicker: 'Planes mensuales · Instagram, TikTok y Facebook',
      lede: 'Elige tu línea: FLUJO (mucho contenido) o IMPACTO (contenido elaborado). Todo se publica también en Facebook sin costo extra.',
    },
    color: 'var(--yellow)',
    lines: {
      flujo: [
        { tag: 'FLUJO', name: 'Inicio', ideal: 'Empezar a publicar con constancia.', ed: 649000, tri: 589000, sessions: 1,
          rows: [['Reels / TikToks', '12 al mes (3 por semana)'], ['Edición', 'Rápida: cortes, subtítulos, ganchos y tendencias'], ['Carruseles', '—'], ['Ideas y guiones', 'Calendario de ideas del mes'], ['Publicación', 'La haces tú (te entregamos copys)'], ['Comunidad', '—'], ['Seguimiento', 'Reporte mensual de vistas y seguidores']] },
        { tag: 'FLUJO', name: 'Ritmo', hot: true, ideal: 'Crecer rápido con 5 reels por semana.', ed: 1290000, tri: 1190000, sessions: 1,
          rows: [['Reels / TikToks', '20 al mes (5 por semana)'], ['Edición', 'Rápida: cortes, subtítulos, ganchos y tendencias'], ['Carruseles', '4'], ['Ideas y guiones', 'Ideas + guiones basados en tendencias'], ['Publicación', 'La hacemos nosotros'], ['Comunidad', '—'], ['Seguimiento', 'Reporte + ajustes al perfil']] },
        { tag: 'FLUJO', name: 'Diario', ideal: 'Volverte un referente: 1 reel diario.', ed: 2490000, tri: 2290000, sessions: 2,
          rows: [['Reels / TikToks', '30 al mes (1 diario)'], ['Edición', 'Rápida: cortes, subtítulos, ganchos y tendencias'], ['Carruseles', '8'], ['Ideas y guiones', 'Ideas + guiones + estrategia por formato'], ['Publicación', 'La hacemos nosotros'], ['Comunidad', 'Respondemos comentarios y mensajes'], ['Seguimiento', 'Reporte + reunión mensual']] },
      ],
      impacto: [
        { tag: 'IMPACTO', name: 'Inicio', ideal: 'Empezar con piezas que se ven de otro nivel.', ed: 1090000, tri: 979000, sessions: 1,
          rows: [['Reels / TikToks', '4 al mes (1 por semana)'], ['Edición', 'Elaborada: motion graphics, efectos de sonido y color'], ['Carruseles', '—'], ['Ideas y guiones', 'Calendario de ideas del mes'], ['Publicación', 'La haces tú (te entregamos copys)'], ['Comunidad', '—'], ['Seguimiento', 'Reporte mensual de vistas y seguidores']] },
        { tag: 'IMPACTO', name: 'Pro', hot: true, ideal: 'Construir una marca personal fuerte.', ed: 2290000, tri: 2090000, sessions: 1,
          rows: [['Reels / TikToks', '8 al mes (2 por semana)'], ['Edición', 'Elaborada: motion graphics, efectos de sonido y color'], ['Carruseles', '2 animados'], ['Ideas y guiones', 'Ideas + guiones'], ['Publicación', 'La hacemos nosotros'], ['Comunidad', '—'], ['Seguimiento', 'Reporte + ajustes al perfil']] },
        { tag: 'IMPACTO', name: 'Élite', ideal: 'Creadores que van por marcas y colaboraciones.', ed: 4890000, tri: 4390000, sessions: 2,
          rows: [['Reels / TikToks', '12 al mes (3 por semana)'], ['Edición', 'Elaborada + 2 reels 100% animados'], ['Carruseles', '4 animados'], ['Ideas y guiones', 'Ideas + guiones + estrategia de marca personal'], ['Publicación', 'La hacemos nosotros'], ['Comunidad', 'Respondemos comentarios y mensajes'], ['Seguimiento', 'Reporte + reunión mensual']] },
      ],
    },
    extras: [
      ['Impulso de alcance (pauta)', 'Mensual', 489000, 'Ponemos pauta a tus mejores reels para llegar a más gente. La inversión en pauta va aparte (desde $300.000 / mes).'],
      ['Kit visual de marca', 'Único', 890000, 'Plantillas de motion, tipografías, colores, portadas y subtítulos con tu estilo.'],
      ['Media kit para marcas', 'Único', 389000, 'Tus números, audiencia y tarifas en un documento profesional para enviar a marcas.'],
      ['Optimización de perfil', 'Único', 189000, 'Bio, foto, historias destacadas, link en bio y portadas.'],
      ['Sesión de fotos lifestyle', 'Por sesión', 589000, 'Fotos profesionales para perfil, portadas y contenido.'],
      ['Reel rápido adicional', 'Por video', 59900, 'Un reel extra de edición rápida.'],
      ['Reel elaborado adicional', 'Por video', 219000, 'Un reel extra con motion y diseño sonoro.'],
      ['Entrega exprés (24 h)', 'Por video', '+30%', 'Para tendencias que hay que subir ya.'],
      ['Sesión de grabación adicional', 'Por sesión', 649000, 'Hasta 3 h con equipo profesional.'],
    ],
  },

  medico: {
    head: {
      kicker: 'Planes mensuales · médicos, odontólogos, veterinarios, estéticas',
      lede: 'Grabamos en tu consultorio, editamos y movemos tu pauta. La inversión en pauta la pagas directamente a Meta.',
    },
    color: 'var(--blue)',
    plans: [
      { tag: 'Salud', name: 'Presencia', ideal: 'Consultorios que quieren empezar a recibir pacientes desde redes.', price: 3290000, ads: 1000000,
        rows: [['Grabación', '1 sesión al mes (hasta 3 horas)'], ['Videos cortos', '8 con subtítulos y gancho inicial'], ['Anuncios', 'Usamos tus mejores videos como anuncio'], ['Video largo', '—'], ['Carruseles', '4 educativos'], ['Guiones', 'Los escribimos: tú solo llegas y hablas'], ['Pauta en Meta', '1 campaña para recibir mensajes por WhatsApp'], ['Pacientes', 'Los mensajes llegan directo a tu WhatsApp'], ['Resultados', 'Reporte mensual: mensajes y costo por paciente potencial']] },
      { tag: 'Salud', name: 'Agenda llena', hot: true, ideal: 'Profesionales con consulta que quieren llenar la agenda de forma constante.', price: 5490000, ads: 2000000,
        rows: [['Grabación', '1 jornada al mes (hasta 5 h) con asistente de producción'], ['Videos cortos', '10 (7 Pro + 3 Premium, con testimonios de pacientes)'], ['Anuncios', '2 diseñados para vender, con varias versiones del gancho'], ['Video largo', '—'], ['Carruseles', '6 educativos'], ['Guiones', 'Incluidos'], ['Pauta en Meta', 'Hasta 3 campañas: pacientes nuevos + volver a impactar'], ['Pacientes', 'WhatsApp con respuestas automáticas, formulario de citas y etiquetas'], ['Resultados', 'Reporte + reunión mensual de resultados']] },
      { tag: 'Salud', name: 'Autoridad', ideal: 'Clínicas y especialistas que quieren ser el referente de su ciudad.', price: 10490000, ads: 4000000,
        rows: [['Grabación', '2 sesiones al mes con asistente de producción'], ['Videos cortos', '20 (12 Pro + 8 Premium)'], ['Anuncios', '4 con varias versiones del gancho'], ['Video largo', '1 al mes: YouTube, web o sala de espera'], ['Carruseles', '8 educativos'], ['Guiones', 'Incluidos'], ['Pauta en Meta', 'Campañas ilimitadas en todo el recorrido del paciente'], ['Pacientes', 'Todo lo anterior + seguimiento de cada paciente hasta que agenda'], ['Resultados', 'Reunión cada 15 días y entregas prioritarias en 48 h']] },
    ],
    gear: [
      ['Cámara Sony A7 IV', 'Tu consulta se ve como una clínica de primer nivel, no como un video de celular.'],
      ['Lente 50 mm', 'Fondo desenfocado y aspecto de cine: tú eres el protagonista.'],
      ['Lente zoom profesional', 'Mostramos consultorio, equipos y procedimientos sin interrumpir la consulta.'],
      ['Luces Godox de 300 W', 'Piel uniforme, sin sombras ni brillos, aunque tu consultorio sea oscuro.'],
      ['Estabilizador (gimbal)', 'Recorridos suaves por tu clínica, tipo comercial de televisión.'],
      ['Micrófonos RØDE Wireless GO II', 'Se te entiende perfecto: el mal audio es la razón #1 por la que dejan de ver.'],
    ],
    extras: [
      ['Configuración inicial', 'Único', 990000, 'Cuentas de Meta, píxel, WhatsApp Business, estrategia y guiones del primer mes.'],
      ['Video testimonio de paciente', 'Por video', 349000, 'Un paciente real contando su experiencia, con consentimiento firmado.'],
      ['Video institucional / tour', 'Por proyecto', 1490000, '1-2 min mostrando instalaciones, equipo y forma de atender.'],
      ['Sesión de fotos profesional', 'Por sesión', 689000, 'Retratos tuyos, de tu equipo y del consultorio (20 fotos editadas).'],
      ['Perfil de Google + reseñas', 'Único', 690000, 'Optimizamos tu ficha de Google Maps y montamos un sistema para pedir reseñas.'],
      ['Página para agendar citas', 'Único + hosting', 1890000, 'Servicios, testimonios y botón de WhatsApp o formulario.'],
      ['Automatización de WhatsApp', 'Único', 890000, 'Respuestas automáticas, catálogo, etiquetas y mensajes de seguimiento.'],
      ['Entrenamiento a recepción', 'Único (2 h)', 590000, 'Guion y capacitación para que tu recepción convierta mensajes en citas.'],
      ['Video para sala de espera', 'Por proyecto', 789000, 'Loop de 3-5 min con servicios y consejos para tus pantallas.'],
      ['Media jornada de grabación', 'Por sesión', 649000, 'Hasta 4 h de grabación con el equipo completo.'],
      ['Jornada completa de grabación', 'Por día', 889000, 'Hasta 8 h de grabación con el equipo completo.'],
    ],
  },

  mentor: {
    head: {
      kicker: 'Planes mensuales de contenido',
      lede: 'Investigación, ideas, plan de contenidos, guiones, edición y publicación. Tú enseñas; nosotros hacemos que te miren.',
    },
    color: 'var(--pink)',
    plans: [
      { tag: 'Contenido', name: 'Despega', ideal: 'Publicar todos los días con un plan detrás.', price: 1490000,
        rows: [['Publicaciones', '30 al mes (1 diaria)'], ['Contenido', '15 videos con texto en pantalla\n5 reacciones o clips\n5 videos a cámara o clips\n5 carruseles'], ['Bonus', '—']] },
      { tag: 'Contenido', name: 'Acelera', hot: true, ideal: 'El mejor valor por publicación: crecer en serio.', price: 2890000,
        rows: [['Publicaciones', '90 al mes (3 diarias)'], ['Contenido', '60 videos con texto en pantalla\n10 reacciones o clips\n10 videos a cámara o clips\n10 carruseles'], ['Bonus', 'Pack de historias (stories) de venta']] },
      { tag: 'Contenido', name: 'Élite', ideal: 'Dominar tu nicho con presencia en todo momento.', price: 5890000,
        rows: [['Publicaciones', '150 al mes (5 diarias)'], ['Contenido', '120 videos con texto en pantalla\n20 reacciones o clips\n20 videos a cámara o clips\n20 carruseles'], ['Bonus', 'Pack de historias (stories) de venta']] },
    ],
    extras: [
      ['Sistema para conseguir clientes', 'Mensual', 1390000, 'El camino desde que te ven en redes hasta que te escriben o compran: formularios, WhatsApp, landing.'],
      ['Pauta en Facebook e Instagram', 'Mensual', 1390000, 'Creamos, administramos y optimizamos tus anuncios. La inversión en pauta va aparte.'],
      ['Asesoría estratégica 1 a 1', 'Mensual', 1390000, 'Reuniones para revisar resultados, ajustar la estrategia y darte feedback.'],
      ['Equipo comercial', 'Mensual + 15% de ventas', 1390000, 'Una persona agenda a los interesados (setter) y otra cierra la venta (closer).'],
      ['Jornada de grabación presencial', 'Desde / día', 889000, 'Vamos a tu oficina o locación con equipo profesional y grabamos el contenido del mes.'],
    ],
  },
};

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
