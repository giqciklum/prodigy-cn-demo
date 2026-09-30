/*
 * Escena «cuestionario» · Cuestionario técnico de un retailer del Reino Unido (SPEC-v2 §4.6,
 * SPEC-v2-wow W3 «Hoy / Con Prodigy» y W4 documento controlado).
 *  - 15 preguntas en inglés. Prodigy redacta cada respuesta (inglés para el cliente + traducción de revisión)
 *    solo con fragmentos de las fuentes indexadas y marca con [n] la fuente de cada afirmación.
 *  - Cada cita se comprueba aquí, en código: el fragmento tiene que aparecer literalmente en su fuente.
 *  - Las preguntas sin evidencia suficiente no se responden: quedan para Calidad («Requiere revisión de Calidad»).
 *  - Revisión humana por respuesta (editar, descartar con motivo, aprobar); en bloque solo las de confianza alta.
 *  - Exporta Excel (.csv) y un documento controlado imprimible (App.printableReport).
 *  - Termina con la comparativa «Hoy / Con Prodigy» y la revisión medida en la sesión.
 * Los datos de planta salen de window.CN_DATA. Las cifras de la memoria (108 auditorías, 143 jornadas,
 * 900 agricultores, 27.000 ha, FSA plata) y las certificaciones de Fustiñana son las publicadas por la empresa.
 */
(function () {
  'use strict';

  const { html, raw, esc, icon, fmt, chip, sys } = App;
  const D = window.CN_DATA;
  const ROLE = D.roles;
  const AGENT = 'Cuestionarios de cliente';
  const AGENT_ACTOR = `Prodigy · agente ${AGENT}`;
  const DEFAULT_SEL = 'B1';

  // Hoja de estilo de la escena (enlazada en index.html; si faltase el enlace, se añade aquí).
  if (!document.querySelector('link[href*="scene-cuestionario.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/css/scene-cuestionario.css';
    document.head.appendChild(link);
  }

  /* ---------------------------------------------------------------- Datos derivados de CN_DATA */

  const P = D.procedures;
  const P012 = P['PNT-CAL-012'];
  const complaint = D.complaint;
  const ukLots = Object.values(D.lots).filter((l) => /retailer UK/i.test((l.info && l.info.brand) || ''));
  const GUI = ukLots.find((l) => l.info.sku === 'UK-GUI-1000') || D.lots[complaint.lot];
  const MIX = ukLots.find((l) => l.info.sku === 'UK-MIX-600');
  const OG = GUI.info.origin;
  const FWD = GUI.forward;
  const mixC07 = D.lots_in_c07.find((l) => l.lot === MIX.info.code);
  const chamber = D.chamber_c07;
  const exc = D.excursion_c07;
  const byCode = Object.fromEntries(D.machines.map((m) => [m.code, m]));
  const LAV = byCode['LAV-1'];
  const DM1 = byCode['DM-1'];
  const FUS = D.plants.find((p) => p.code === 'FUS');
  const dpOrder = (GUI.back.maintenance || []).find((m) => m.equipment === 'DP-2');
  const dpDays = dpOrder ? fmt.days(dpOrder.date, D.meta.today) : null;
  const closedHist = (D.complaint_history || []).filter((h) => /cerrada/.test(h.status || '') && h.nc && h.root_cause);
  const fwfShipments = Object.entries(D.shipments)
    .filter(([, s]) => s.customer === complaint.customer && s.status === 'expedida')
    .map(([id, s]) => Object.assign({ id }, s))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(-3);
  const camp = D.campaign;
  const DM1_CROP = ((D.lines[DM1.line] && D.lines[DM1.line].name.match(/\(([^)]+)\)/)) || [])[1] || '';
  const DM1_OUTSIDE = [GUI, MIX].every((l) => (l.info.route || []).indexOf('DM-1') < 0);

  const T25 = fmt.temp(-25);
  const T18 = fmt.temp(P012.limit_c);
  const T15 = fmt.temp(P012.critical_c);
  const MEM = { audits: 108, days: 143, growers: 900, ha: 27000 };
  const ASSIGN_DUE = '2026-10-07';

  /* Cuestionario recibido */
  const QN = {
    code: 'CUE-2026-041',
    title: 'Supplier Technical Questionnaire 2026',
    customer: complaint.on_behalf_of,
    via: 'Freeworld Foods Ltd',
    received: '2026-09-28T16:20',
    due: '2026-10-09',
    file: 'Supplier_Technical_Questionnaire_2026.xlsx',
    products: [GUI, MIX].map((l) => ({ sku: l.info.sku, name: l.info.product_name }))
  };
  const EMAIL = {
    headers: {
      From: 'Technical Team, Freeworld Foods Ltd <technical@freeworld-foods.example>',
      To: 'Calidad, Congelados de Navarra <calidad@cn-demo.example>',
      Date: 'Mon, 28 Sep 2026 15:20 (UK time)',
      Subject: 'Supplier Technical Questionnaire 2026 - own-label frozen vegetables - response due 9 October'
    },
    text: 'Dear Quality Team,\n\nAs part of the annual supplier review, our UK retail customer has issued its Supplier Technical Questionnaire 2026 for the own-label frozen vegetables you supply:\n- Garden Peas 1kg (UK-GUI-1000)\n- Chargrilled vegetable mix 600g (UK-MIX-600)\n\nThe questionnaire has 15 questions in five sections: certification and audits, food safety controls, temperature and product control, traceability and incidents, and raw materials and sustainability.\n\nPlease answer every question in English and reference the procedure, record or certificate that supports each answer. We need the completed questionnaire by Friday 9 October 2026.\n\nKind regards,\n\nTechnical Team\nFreeworld Foods Ltd',
    highlights: [
      { text: 'Garden Peas 1kg (UK-GUI-1000)', label: 'Producto', tone: 'brand' },
      { text: 'Chargrilled vegetable mix 600g (UK-MIX-600)', label: 'Producto', tone: 'brand' },
      { text: '15 questions', label: 'Preguntas', tone: 'brand' },
      { text: 'reference the procedure, record or certificate that supports each answer', label: 'Requisito' },
      { text: 'Friday 9 October 2026', label: 'Plazo' }
    ]
  };
  const SECS = [
    { id: 'A', es: 'Certificación y auditorías', en: 'Certification and audits' },
    { id: 'B', es: 'Controles de seguridad alimentaria', en: 'Food safety controls' },
    { id: 'C', es: 'Temperatura y control de producto', en: 'Temperature and product control' },
    { id: 'D', es: 'Trazabilidad e incidencias', en: 'Traceability and incidents' },
    { id: 'E', es: 'Materia prima y sostenibilidad', en: 'Raw materials and sustainability' }
  ];
  const SEC = Object.fromEntries(SECS.map((s) => [s.id, s]));

  /* ---------------------------------------------------------------- Fuentes indexadas */

  function procSource(code) {
    const p = P[code];
    const sections = [
      { id: 'obj', heading: 'Objeto', text: p.title },
      { id: 'crit', heading: 'Criterio', text: fmt.text(p.summary) }
    ];
    if (p.evaluation && p.evaluation.length) sections.push({ id: 'eval', heading: 'Evaluación', list: p.evaluation.map((x) => fmt.text(x)) });
    return { type: 'doc', kind: code.indexOf('IT-') === 0 ? 'Instrucción técnica' : 'Procedimiento', code, title: p.title, system: 'Procedimientos', sections };
  }
  const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const GUI_INGR = `Ingredientes: guisante (${fmt.pct(100)})`;
  const MIX_RECIPE = `Receta: ${fmt.list(MIX.back.components.map((c) => `${lowerFirst(c.name)} (${fmt.pct(c.share_pct)})`))}`;
  const ALLERGENS = 'Alérgenos (Reglamento (UE) 1169/2011 y UK FIC): ninguno; sin etiquetado preventivo de alérgenos';
  const SHELF = `Conservar a ${T18} o menos. Consumo preferente: 24 meses desde la fabricación.`;
  const MEM_AUD = `Auditorías, visitas de cliente e inspecciones en 2025: ${MEM.audits} (${MEM.days} jornadas), sin sanciones`;
  const MEM_AGR = `Agricultores: unos ${fmt.num(MEM.growers)}, con ${fmt.num(MEM.ha)} ha; el ${fmt.pct(100)} con verificación FSA de nivel plata`;
  const LAV_Q = `${LAV.metric_label} · referencia ${fmt.num(LAV.baseline)} ppm`;
  const APS_RULE = `Del campo al túnel: ${camp.rule_field_to_tunnel_max_min} min como máximo`;
  const TENDER_Q = (GUI.info.qc || []).find((s) => /tenderómetro/.test(s)) || '';
  const STONE_Q = (GUI.info.qc || []).find((s) => /piedras/.test(s)) || '';
  const ELARA_Q = `${closedHist.length} cerradas con no conformidad y causa raíz registradas`;
  const shipLine = (s) => `${s.id} · ${fmt.date(s.date, s.time)} · ${fmt.minus(s.transport)} · registro de temperatura ${s.temp_record}`;

  const SOURCES = {
    'PNT-CAL-012': procSource('PNT-CAL-012'),
    'PNT-CAL-015': procSource('PNT-CAL-015'),
    'PNT-CAL-020': procSource('PNT-CAL-020'),
    'PNT-CAL-031': procSource('PNT-CAL-031'),
    'IT-MAN-DP-02': procSource('IT-MAN-DP-02'),
    'FT-GUI': {
      type: 'doc', kind: 'Ficha técnica', code: `FT-${GUI.info.sku}`, title: `Ficha técnica · ${GUI.info.product_name}`, system: 'Procedimientos',
      org: 'Congelados de Navarra · Especificaciones de producto',
      sections: [
        { id: '1', heading: '1. Producto', text: `${GUI.info.product_name} · guisante congelado IQF · ${GUI.info.brand}.` },
        { id: '2', heading: '2. Ingredientes', text: `${GUI_INGR}.` },
        { id: '3', heading: '3. Alérgenos', text: `${ALLERGENS}.` },
        { id: '4', heading: '4. Conservación y vida útil', text: SHELF },
        { id: '5', heading: '5. Fabricación', text: `${GUI.info.line_name}, Fustiñana.` }
      ]
    },
    'FT-MIX': {
      type: 'doc', kind: 'Ficha técnica', code: `FT-${MIX.info.sku}`, title: `Ficha técnica · ${MIX.info.product_name}`, system: 'Procedimientos',
      org: 'Congelados de Navarra · Especificaciones de producto',
      sections: [
        { id: '1', heading: '1. Producto', text: `${MIX.info.product_name} · verduras asadas y a la plancha, congeladas IQF · ${MIX.info.brand}.` },
        { id: '2', heading: '2. Receta', text: `${MIX_RECIPE}.` },
        { id: '3', heading: '3. Alérgenos', text: `${ALLERGENS}.` },
        { id: '4', heading: '4. Conservación y vida útil', text: SHELF },
        { id: '5', heading: '5. Fabricación', text: `Asado y plancha en Arguedas (grill continuo GRL-1); mezcla y envasado en Fustiñana (${MIX.info.line_name}). Etiquetado en inglés según la especificación del cliente.` }
      ]
    },
    'WEB-CERT': {
      type: 'doc', kind: 'Certificaciones', code: null, label: 'Web corporativa', title: 'Calidad y seguridad alimentaria · certificados por planta', system: 'Procedimientos',
      org: 'Web corporativa de Congelados de Navarra · consultada el 29/09/2026',
      sections: [
        { id: 'fus', heading: 'Fustiñana', text: 'Fustiñana: IFS Food (nivel superior), BRCGS Food Safety (grado AA+) y FSSC 22000.' },
        { id: 'nota', heading: 'Nota de indexación', text: 'La página no indica la entidad de certificación ni la fecha de caducidad de cada certificado.' }
      ]
    },
    'MEM-2025': {
      type: 'doc', kind: 'Memoria anual', code: null, label: 'Memoria 2025', title: 'Memoria de Sostenibilidad 2025', system: 'Procedimientos',
      org: 'Grupo Congelados de Navarra · publicada el 01/07/2026',
      sections: [
        { id: 'aud', heading: 'Auditorías e inspecciones', text: `${MEM_AUD}.` },
        { id: 'agr', heading: 'Agricultura', text: `${MEM_AGR}.` }
      ]
    },
    'SAP-GUI': {
      type: 'record', kind: 'Registro de lote', code: GUI.info.code, title: `Lote ${GUI.info.code} · origen y controles de calidad`, system: 'SAP',
      org: 'SAP · registro de lote',
      sections: [
        { id: 'origen', heading: 'Origen y recepción', text: fmt.text(GUI.back.summary) },
        { id: 'qc', heading: 'Controles de calidad', list: (GUI.info.qc || []).map((x) => fmt.text(x)) }
      ]
    },
    'WMS-GUI': {
      type: 'record', kind: 'Traza hacia delante', code: GUI.info.code, title: `Lote ${GUI.info.code} · palés y expediciones`, system: 'Mecalux Easy WMS',
      org: 'Mecalux Easy WMS · palés (SSCC) y expediciones',
      sections: [{ id: 'fwd', heading: 'Palés y expediciones', text: fmt.text(FWD.summary) }]
    },
    'MAPEX-L2': {
      type: 'record', kind: 'Ruta de proceso', code: GUI.info.line, title: `${GUI.info.line_name} · ruta del lote ${GUI.info.code}`, system: 'MES Mapex',
      org: 'MES Mapex · orden de fabricación',
      sections: [{ id: 'ruta', heading: 'Ruta registrada', text: GUI.back.route_text }]
    },
    'MAPEX-LAV1': {
      type: 'record', kind: 'Control de proceso', code: LAV.code, title: `${LAV.name} · ${LAV.metric_label}`, system: 'MES Mapex',
      org: 'MES Mapex · lecturas de proceso',
      sections: [
        { id: 'ctl', heading: 'Control registrado', text: `${LAV.name} · ${LAV_Q}` },
        { id: 'lect', heading: 'Última lectura', text: `${fmt.num(LAV.reading)} ppm en el parte de las 06:00 del ${fmt.date(D.meta.today)}.` }
      ]
    },
    'SAP-MIX': {
      type: 'record', kind: 'Registro de lote', code: MIX.info.code, title: `Lote ${MIX.info.code} · controles de calidad`, system: 'SAP QM',
      org: 'SAP QM · registro de lote',
      sections: [{ id: 'qc', heading: 'Controles de calidad', list: (MIX.info.qc || []).map((x) => fmt.text(x)) }]
    },
    'WMS-EXP': {
      type: 'record', kind: 'Expediciones', code: 'EXP · Freeworld Foods', title: 'Expediciones a Freeworld Foods Ltd · registro de temperatura', system: 'Mecalux Easy WMS',
      org: 'Mecalux Easy WMS · expediciones',
      sections: [{ id: 'exp', heading: 'Últimas expediciones', list: fwfShipments.map(shipLine) }]
    },
    'WMS-FUS': {
      type: 'record', kind: 'Almacén', code: FUS.code, title: 'Fustiñana · almacenamiento de producto terminado', system: 'Mecalux Easy WMS',
      org: 'Mecalux Easy WMS · datos maestros de almacén',
      sections: [{ id: 'alm', heading: 'Almacenamiento', text: fmt.text(FUS.storage) }]
    },
    'APS-CAMP': {
      type: 'record', kind: 'Regla de planificación', code: 'Campaña 2026', title: 'Plan de recepción de campaña · reglas', system: 'Siemens Opcenter APS',
      org: 'Siemens Opcenter APS · plan de recepción',
      sections: [{ id: 'reglas', heading: 'Reglas de planificación', list: [APS_RULE, `Carga en campo: ${camp.load_min} min`, `Franjas de recepción de ${camp.slot_minutes} min, de ${camp.operating_hours.start} a ${camp.operating_hours.end}`] }]
    },
    'ELARA-RCL': {
      type: 'record', kind: 'Registro de reclamaciones', code: 'Reclamaciones', title: 'Reclamaciones de cliente registradas', system: 'Elara',
      org: 'Elara · reclamaciones y no conformidades',
      sections: [
        { id: 'res', heading: 'Resumen', text: `${ELARA_Q}; 1 abierta (${complaint.code}).` },
        { id: 'det', heading: 'Reclamaciones cerradas', list: closedHist.map((h) => `${h.id} · ${fmt.date(h.date)} · ${h.description} · ${h.nc} · causa: ${h.root_cause}`) }
      ]
    }
  };
  const DOC_COUNT = Object.values(SOURCES).filter((s) => s.type === 'doc').length;

  /* ---------------------------------------------------------------- Preguntas y borradores */

  const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const EN_NUM = ['no', 'one', 'two', 'three', 'four', 'five'];
  const ES_NUM = ['ninguna', 'una', 'dos', 'tres', 'cuatro', 'cinco'];
  function enList(a) { return a.length < 2 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`; }
  function enDay(iso) { const p = String(iso).split('-').map(Number); return `${p[2]} ${EN_MONTHS[p[1] - 1]}`; }
  const nShip = fwfShipments.length;
  const shipMarks = fwfShipments.map((s, i) => `[${i + 1}]`).join('');
  const shipEn = enList(fwfShipments.map((s, i) => enDay(s.date) + (i === nShip - 1 ? ` ${s.date.slice(0, 4)}` : '')));
  const shipEs = fmt.list(fwfShipments.map((s, i) => (i === nShip - 1 ? fmt.date(s.date) : fmt.dayMonth(s.date))));
  const tenderSpec = String((OG.maturity && OG.maturity.spec) || '').replace('-', '–');
  const tr = OG.maturity && OG.maturity.tenderometer_tr;

  const QS = [
    {
      id: 'A1', sec: 'A', topic: 'Certificaciones GFSI', conf: 'media',
      qEn: 'Please list the GFSI-recognised certifications held by the supplying site, with grade, certification body and expiry date.',
      qEs: 'Indique las certificaciones reconocidas por GFSI del centro que suministra, con grado, entidad de certificación y fecha de caducidad.',
      en: 'Both products are packed and dispatched at our Fustiñana site, which is certified to IFS Food (higher level), BRCGS Food Safety (grade AA+) and FSSC 22000 [1]. Copies of the current certificates, showing the certification body and expiry date of each, will be attached to this questionnaire.',
      es: 'Los dos productos se envasan y se expiden en Fustiñana, centro certificado en IFS Food (nivel superior), BRCGS Food Safety (grado AA+) y FSSC 22000 [1]. Se adjuntarán las copias de los certificados vigentes, con la entidad de certificación y la fecha de caducidad de cada uno.',
      cites: [{ src: 'WEB-CERT', q: 'Fustiñana: IFS Food (nivel superior), BRCGS Food Safety (grado AA+) y FSSC 22000' }],
      gap: 'La entidad de certificación y la fecha de caducidad de cada certificado no aparecen en las fuentes indexadas. Adjunta los certificados vigentes antes de enviar.'
    },
    {
      id: 'A2', sec: 'A', topic: 'Auditorías del último año', conf: 'alta',
      qEn: 'How many audits (customer, certification and official) did your company receive in the last year, and were there any sanctions or enforcement actions?',
      qEs: '¿Cuántas auditorías (de cliente, de certificación y oficiales) recibió la empresa el último año? ¿Hubo sanciones o actuaciones de la autoridad?',
      en: `In 2025 the Congelados de Navarra group received ${MEM.audits} audits, customer visits and official inspections, totalling ${MEM.days} audit days, with no sanctions [1].`,
      es: `En 2025 el grupo Congelados de Navarra recibió ${MEM.audits} auditorías, visitas de cliente e inspecciones oficiales, con un total de ${MEM.days} jornadas y sin sanciones [1].`,
      cites: [{ src: 'MEM-2025', q: MEM_AUD }],
      note: () => ({ tone: 'brand', icon: 'info', title: 'Dato de grupo', text: 'La memoria publica la cifra del grupo, sin desglose por planta. Si el cliente la pide solo para Fustiñana, la completa Calidad.' })
    },
    {
      id: 'B1', sec: 'B', topic: 'Piedras y cuerpos extraños de campo', conf: 'alta',
      qEn: 'Describe the controls in place to remove stones and other field foreign bodies from raw material, and how their effectiveness is maintained.',
      qEs: 'Describa los controles para eliminar piedras y otros cuerpos extraños de campo de la materia prima y cómo se mantiene su eficacia.',
      en: 'Raw material is sampled at intake and checked for stones and clods [1]. On the pea line, product passes through a cleaner-aspirator, a destoner and, after freezing, an optical sorter [2], under our foreign body control procedure [3]. Destoner meshes are inspected weekly; if wear is found, replacement is scheduled and inspection is reinforced until the mesh has been replaced [4].',
      es: 'La materia prima se muestrea en recepción para detectar piedras y terrones [1]. En la línea de guisante, el producto pasa por limpiadora-aventadora, despedregadora y, tras la congelación, selectora óptica [2], según el procedimiento de control de cuerpos extraños [3]. Las mallas de las despedregadoras se inspeccionan cada semana; si hay desgaste, se programa la sustitución y se refuerza la inspección hasta cambiarla [4].',
      cites: [
        { src: 'SAP-GUI', q: STONE_Q },
        { src: 'MAPEX-L2', q: GUI.back.route_text },
        { src: 'PNT-CAL-031', q: P['PNT-CAL-031'].title },
        { src: 'IT-MAN-DP-02', q: 'Inspección semanal de la malla; si hay desgaste, sustitución programada e inspección reforzada hasta cambiarla' }
      ],
      note: () => {
        const out = App.outcome('reclamacion');
        return {
          tone: 'warn', icon: 'link', title: `Reclamación abierta de este cliente · ${complaint.code}`,
          text: html`Freeworld Foods tiene abierta la reclamación ${complaint.code} (piedra de unos ${complaint.defect.size_mm} mm en el lote ${App.lotTag(complaint.lot)}) y la malla de DP-2 sigue pendiente de repuesto (<span class="nowrap">${dpOrder.work_order}</span>, abierta desde el ${fmt.date(dpOrder.date)}, ${dpDays} días). Revisad que esta respuesta sea coherente con el informe 8D antes de enviarla.${out ? ` Estado de la reclamación: ${out.label}.` : ''}`,
          go: 'reclamacion', goLabel: 'Abrir la reclamación'
        };
      }
    },
    {
      id: 'B2', sec: 'B', topic: 'Detección de metales (PCC)', conf: 'alta',
      qEn: 'Is metal detection a critical control point? How often are detectors verified, and what happens to product if a verification is missed or fails?',
      qEs: '¿La detección de metales es un punto de control crítico? ¿Con qué frecuencia se verifican los detectores y qué pasa con el producto si una verificación no se hace o no es conforme?',
      en: `Yes. Metal detection is a critical control point in our HACCP plan, and detectors are verified with test pieces every 2 hours [1]. If a verification is not passed within that interval, all product packed since the last correct verification is held for a Quality decision [2]. Verification records for lot ${MIX.info.code} of ${MIX.info.sku} are compliant [3].`,
      es: `Sí. La detección de metales es un punto de control crítico de nuestro plan APPCC y los detectores se verifican con probetas cada 2 horas [1]. Si la verificación no se supera en ese intervalo, se retiene todo el producto envasado desde la última verificación correcta hasta que decida Calidad [2]. Las verificaciones del lote ${MIX.info.code} de ${MIX.info.sku} son conformes [3].`,
      cites: [
        { src: 'PNT-CAL-031', q: 'El detector de metales es un PCC: verificación con probetas cada 2 h' },
        { src: 'PNT-CAL-031', q: 'se retiene el producto envasado desde la última verificación correcta' },
        { src: 'SAP-MIX', q: 'Detector de metales DM-4: verificaciones conformes' }
      ],
      note: () => (DM1.status === 'critical' && DM1_OUTSIDE ? {
        tone: 'brand', icon: 'activity', title: 'Estado de hoy en planta',
        text: `El parte de las 06:00 marca ${DM1.code} con la verificación vencida (${fmt.num(DM1.reading)} h; máximo ${fmt.num(DM1.baseline)} h). ${DM1.code} está en la línea ${DM1.line}${DM1_CROP ? ` (${DM1_CROP})` : ''} y no interviene en los productos de este cliente, así que la respuesta no cambia.`
      } : null)
    },
    {
      id: 'B3', sec: 'B', topic: 'Alérgenos', conf: 'alta',
      qEn: 'Do the products supplied contain any of the 14 regulated allergens, or carry precautionary allergen labelling?',
      qEs: '¿Los productos suministrados contienen alguno de los 14 alérgenos regulados o llevan etiquetado preventivo de alérgenos?',
      en: 'No. According to the approved specifications, Garden Peas 1kg (UK-GUI-1000) is 100% peas [1], and the chargrilled vegetable mix 600g (UK-MIX-600) contains roasted red pepper strips, chargrilled courgette, chargrilled aubergine and roasted onion [2]. Neither product contains any of the 14 regulated allergens or carries precautionary allergen labelling [3][4].',
      es: `No. Según las fichas técnicas aprobadas, el guisante 1 kg (UK-GUI-1000) es ${fmt.pct(100)} guisante [1] y el salteado de verduras a la plancha 600 g (UK-MIX-600) lleva pimiento rojo asado en tiras, calabacín a la plancha, berenjena a la plancha y cebolla asada [2]. Ninguno de los dos contiene alérgenos regulados ni lleva etiquetado preventivo de alérgenos [3][4].`,
      cites: [
        { src: 'FT-GUI', q: GUI_INGR },
        { src: 'FT-MIX', q: MIX_RECIPE },
        { src: 'FT-GUI', q: ALLERGENS },
        { src: 'FT-MIX', q: ALLERGENS }
      ]
    },
    {
      id: 'B4', sec: 'B', topic: 'Listeria ambiental', conf: 'none',
      qEn: 'Describe your environmental monitoring programme for Listeria in post-blanching and packing areas: sampling zones, frequency, trend analysis and corrective actions.',
      qEs: 'Describa el programa de muestreo ambiental de Listeria en las zonas posteriores al escaldado y de envasado: zonas de muestreo, frecuencia, análisis de tendencias y acciones correctoras.',
      flag: {
        reason: `Ninguno de los ${DOC_COUNT} documentos indexados trata el muestreo ambiental de Listeria y no hay resultados analíticos entre los registros consultados.`,
        partial: [],
        missing: ['Plan de muestreo ambiental de Listeria: zonas, puntos y frecuencias', 'Resultados de los últimos meses y análisis de tendencias', 'Acciones correctoras ante un positivo']
      }
    },
    {
      id: 'B5', sec: 'B', topic: 'Residuos de plaguicidas y clorato', conf: 'none',
      qEn: 'Do you operate a risk-based testing plan for pesticide residues and chlorate? Please give the testing frequency, the scope and the accreditation of the laboratory used.',
      qEs: '¿Tienen un plan analítico basado en el riesgo para residuos de plaguicidas y clorato? Indique la frecuencia, el alcance y la acreditación del laboratorio.',
      flag: {
        reason: 'Solo hay evidencia indirecta: ningún documento indexado describe un plan analítico de residuos de plaguicidas ni de clorato.',
        partial: [
          { src: 'MAPEX-LAV1', q: LAV_Q, why: 'Controlar el cloro del agua de lavado limita la formación de clorato, pero no es un análisis de residuos.' },
          { src: 'MEM-2025', q: 'el 100 % con verificación FSA de nivel plata', why: 'La verificación FSA de los agricultores no sustituye al plan analítico.' }
        ],
        missing: ['Plan analítico de residuos de plaguicidas y de clorato', 'Frecuencia y alcance de los análisis', 'Laboratorio y acreditación (por ejemplo, ISO/IEC 17025)', 'Resultados de los últimos análisis']
      }
    },
    {
      id: 'C1', sec: 'C', topic: 'Temperatura de almacenamiento', conf: 'alta',
      qEn: 'What are your storage temperature limits for frozen finished product, and what action is taken if a storage temperature deviation occurs?',
      qEs: '¿Qué límites de temperatura aplican al almacenamiento de producto congelado y qué se hace ante una desviación de temperatura?',
      en: `Finished product is stored at ${T25} in four automated cold stores and in dispatch chambers [1]. If air temperature stays above ${T18} for more than ${P012.min_minutes_for_hold} minutes, the exposed pallets are placed on quality hold and evaluated for product temperature and sensory quality [2], and a disposition decision is taken for each lot: release, reclassify or destroy [3]. An excursion above ${T15} is classed as critical [4].`,
      es: `El producto terminado se almacena a ${T25} en cuatro silos automáticos y en cámaras de expedición [1]. Si la temperatura de aire supera ${T18} durante más de ${P012.min_minutes_for_hold} minutos, los palés expuestos quedan con bloqueo de calidad y se evalúan la temperatura de producto y el análisis sensorial [2], y se decide el destino de cada lote: liberar, reclasificar o destruir [3]. Por encima de ${T15} la excursión se considera crítica [4].`,
      cites: [
        { src: 'WMS-FUS', q: fmt.text(FUS.storage) },
        { src: 'PNT-CAL-012', q: 'Temperatura de aire por encima de -18 °C durante más de 15 min: bloqueo de calidad de los palés expuestos y evaluación (temperatura de producto, análisis sensorial, decisión de destino)' },
        { src: 'PNT-CAL-012', q: 'Decisión de destino por lote: liberar, reclasificar o destruir' },
        { src: 'PNT-CAL-012', q: 'Por encima de -15 °C: excursión crítica' }
      ],
      note: () => {
        if (!mixC07) return null;
        const out = App.outcome('alarma');
        const tail = out
          ? (out.status === 'approved' ? ` En «Alarma C-07»: ${out.label}.` : ' En «Alarma C-07» se ha rechazado la propuesta de bloqueo.')
          : ' La decisión sobre esos palés se toma en «Alarma C-07».';
        return {
          tone: 'warn', icon: 'thermometer', title: `Stock de este cliente en la excursión de ${chamber.code}`,
          text: html`${mixC07.pallets} palés de ${MIX.info.sku} (lote ${App.lotTag(MIX.info.code)}) estaban en ${chamber.code} durante la excursión de hoy (${exc.start}–${exc.end}, pico de ${fmt.temp(exc.peak)}) y tienen salida planificada a este cliente (<span class="nowrap">${mixC07.planned_shipment}</span>, ${mixC07.planned_time}). La respuesta describe el procedimiento, no el caso de hoy.${tail}`,
          go: 'alarma', goLabel: 'Abrir la alarma'
        };
      }
    },
    {
      id: 'C2', sec: 'C', topic: 'Cadena de frío en el transporte', conf: 'alta',
      qEn: 'How is the cold chain maintained and recorded during transport to the UK?',
      qEs: '¿Cómo se mantiene y se registra la cadena de frío durante el transporte al Reino Unido?',
      en: `Product leaves Fustiñana in refrigerated trucks at ${T25}, and the temperature record of each shipment is kept in our warehouse management system. The ${EN_NUM[nShip] || nShip} most recent shipments to Freeworld Foods, on ${shipEn}, all have compliant temperature records ${shipMarks}.`,
      es: `El producto sale de Fustiñana en camiones frigoríficos a ${T25} y el registro de temperatura de cada expedición queda en el sistema de gestión de almacén. Las ${ES_NUM[nShip] || nShip} últimas expediciones a Freeworld Foods (${shipEs}) tienen el registro de temperatura conforme ${shipMarks}.`,
      cites: fwfShipments.map((s) => ({ src: 'WMS-EXP', q: shipLine(s) }))
    },
    {
      id: 'C3', sec: 'C', topic: 'Retención y liberación de producto', conf: 'alta',
      qEn: 'How is non-conforming or suspect product placed on hold, and who is authorised to release it?',
      qEs: '¿Cómo se retiene el producto no conforme o sospechoso y quién está autorizado a liberarlo?',
      en: 'Every hold is recorded in SAP QM, where the lot is blocked, and in our warehouse management system, where the pallets are immobilised and any planned shipments are retained [1]. Only the Quality Manager can release held product [2].',
      es: 'Todo bloqueo se registra en SAP QM, donde el lote queda bloqueado, y en el sistema de gestión de almacén, donde los palés quedan inmovilizados y se retienen las expediciones planificadas [1]. Solo el Responsable de Calidad puede liberar el producto retenido [2].',
      cites: [
        { src: 'PNT-CAL-015', q: 'Todo bloqueo se registra en SAP QM (lote bloqueado) y en Easy WMS (palés inmovilizados, expediciones retenidas)' },
        { src: 'PNT-CAL-015', q: 'Solo el Responsable de Calidad libera' }
      ],
      note: () => {
        const out = App.outcome('alarma');
        return out && out.status === 'approved'
          ? { tone: 'ok', icon: 'check-circle', title: 'Aplicado hoy', text: `Este procedimiento se ha aplicado esta mañana en «Alarma C-07»: ${out.label}.` }
          : null;
      }
    },
    {
      id: 'D1', sec: 'D', topic: 'Trazabilidad y simulacro de retirada', conf: 'media',
      qEn: 'Can you trace a finished lot back to the grower and field, and forward to customers? State your target time for a full trace and the date and result of your last mock recall.',
      qEs: '¿Pueden trazar un lote terminado hacia atrás hasta el agricultor y la parcela, y hacia delante hasta los clientes? Indique el objetivo de tiempo de una traza completa y la fecha y el resultado del último simulacro de retirada.',
      en: `Yes. Each lot is linked in SAP, MES Mapex and Mecalux Easy WMS to its intake, grower and fields, processing line, and to every pallet (SSCC) and shipment. For example, lot ${GUI.info.code} traces back to grower ${OG.grower}, fields ${enList(OG.parcels)} and intake ${OG.intake.ticket} [1], and forward to ${FWD.produced_pallets} pallets: ${FWD.shipped_pallets} shipped to Freeworld Foods and ${FWD.stock_pallets} in stock at Fustiñana [2].`,
      es: `Sí. Cada lote queda vinculado en SAP, MES Mapex y Mecalux Easy WMS a su recepción, agricultor y parcelas, a la línea de proceso y a cada palé (SSCC) y expedición. Por ejemplo, el lote ${GUI.info.code} se traza hacia atrás hasta el agricultor ${OG.grower}, las parcelas ${fmt.list(OG.parcels)} y la recepción ${OG.intake.ticket} [1], y hacia delante hasta ${FWD.produced_pallets} palés: ${FWD.shipped_pallets} expedidos a Freeworld Foods y ${FWD.stock_pallets} en stock en Fustiñana [2].`,
      cites: [
        { src: 'SAP-GUI', q: fmt.text(GUI.back.summary) },
        { src: 'WMS-GUI', q: fmt.text(FWD.summary) }
      ],
      gap: 'El objetivo de tiempo de una traza completa y la fecha y el resultado del último simulacro de retirada no están en las fuentes indexadas.',
      gapGo: 'retirada', gapGoLabel: 'Hacer un simulacro ahora', gapOutcome: 'retirada'
    },
    {
      id: 'D2', sec: 'D', topic: 'Gestión de reclamaciones', conf: 'alta',
      qEn: 'Describe your customer complaint handling process, including response times and the root cause analysis method.',
      qEs: 'Describa el proceso de gestión de reclamaciones de cliente, con los plazos de respuesta y el método de análisis de causa raíz.',
      en: 'Complaints are handled under a documented procedure: acknowledgement within 24 hours, containment within 48 hours and an 8D report within the timescale agreed with the customer, 5 working days by default [1]. Each complaint is registered in our quality management system, and closed complaints are recorded with their non-conformity and root cause [2].',
      es: 'Las reclamaciones se gestionan según un procedimiento documentado: acuse de recibo en 24 horas, contención en 48 horas e informe 8D en el plazo pactado con el cliente, 5 días hábiles por defecto [1]. Cada reclamación se registra en el sistema de gestión de calidad y las cerradas quedan con su no conformidad y su causa raíz [2].',
      cites: [
        { src: 'PNT-CAL-020', q: 'Acuse de recibo en 24 h, contención en 48 h e informe 8D en el plazo pactado con el cliente (por defecto, 5 días hábiles)' },
        { src: 'ELARA-RCL', q: ELARA_Q }
      ],
      note: () => {
        const out = App.outcome('reclamacion');
        return {
          tone: out ? 'brand' : 'warn', icon: 'mail', title: `Reclamación de este cliente · ${complaint.code}`,
          text: out
            ? `La reclamación ${complaint.code} de este mismo cliente se ha gestionado en esta sesión: ${out.label}.`
            : `Esta respuesta llegará con la reclamación ${complaint.code} de este mismo cliente todavía abierta: el informe vence el ${fmt.date(complaint.response_due)}.`,
          go: 'reclamacion', goLabel: 'Abrir la reclamación'
        };
      }
    },
    {
      id: 'D3', sec: 'D', topic: 'Defensa alimentaria y fraude', conf: 'none',
      qEn: 'Do you have a documented food defence plan and a food fraud vulnerability assessment? When were they last reviewed?',
      qEs: '¿Tienen documentados un plan de defensa alimentaria y una evaluación de vulnerabilidad frente al fraude alimentario? ¿Cuándo se revisaron por última vez?',
      flag: {
        reason: 'El plan de defensa alimentaria y la evaluación de vulnerabilidad frente al fraude no están entre los documentos indexados.',
        context: 'Fustiñana está certificada en IFS Food y BRCGS, que exigen ambos documentos: deberían existir en Calidad de planta. Prodigy no describe su contenido ni supone una fecha de revisión.',
        partial: [],
        missing: ['Plan de defensa alimentaria', 'Evaluación de vulnerabilidad frente al fraude alimentario', 'Fecha de la última revisión de cada documento']
      }
    },
    {
      id: 'E1', sec: 'E', topic: 'Agricultura sostenible (FSA)', conf: 'alta',
      qEn: 'What proportion of your growers are verified against a recognised sustainable agriculture standard, such as the SAI Platform FSA, and at what level?',
      qEs: '¿Qué proporción de sus agricultores está verificada con un estándar reconocido de agricultura sostenible, como la FSA de SAI Platform, y con qué nivel?',
      en: `All of our growers are verified against the SAI Platform Farm Sustainability Assessment (FSA) at Silver level: around ${MEM.growers} growers farming some 27,000 hectares [1].`,
      es: `El ${fmt.pct(100)} de nuestros agricultores está verificado con la Farm Sustainability Assessment (FSA) de SAI Platform en nivel plata: unos ${fmt.num(MEM.growers)} agricultores y unas ${fmt.num(MEM.ha)} ha [1].`,
      cites: [{ src: 'MEM-2025', q: MEM_AGR }]
    },
    {
      id: 'E2', sec: 'E', topic: 'Del campo al túnel y madurez', conf: 'alta',
      qEn: 'For peas, what is the maximum time from harvest to freezing, and how is maturity checked at intake?',
      qEs: 'Para el guisante, ¿cuál es el tiempo máximo desde la cosecha hasta la congelación y cómo se comprueba la madurez en recepción?',
      en: `Harvesting and intake are planned so that raw material reaches the IQF tunnel no more than ${camp.rule_field_to_tunnel_max_min} minutes after leaving the field [1]. Pea maturity is checked at intake with a tenderometer against a specification of ${tenderSpec}; for example, intake ${OG.intake.ticket} measured ${tr} TR [2].`,
      es: `La cosecha y la recepción se planifican para que la materia prima llegue al túnel IQF como máximo ${camp.rule_field_to_tunnel_max_min} minutos después de salir del campo [1]. La madurez del guisante se mide en recepción con tenderómetro frente a una especificación de ${tenderSpec}; por ejemplo, la recepción ${OG.intake.ticket} dio ${tr} TR [2].`,
      cites: [{ src: 'APS-CAMP', q: APS_RULE }, { src: 'SAP-GUI', q: TENDER_Q }]
    }
  ];
  const QBY = Object.fromEntries(QS.map((q) => [q.id, q]));

  /* ---------------------------------------------------------------- Verificación de citas (en código) */

  // Solo se normalizan caracteres 1 a 1 (signo menos y espacio duro) para poder recuperar el fragmento original.
  function norm(s) { return String(s == null ? '' : s).replace(/\u2212/g, '-').replace(/\u00a0/g, ' '); }
  function locate(c) {
    const src = SOURCES[c.src];
    const needle = norm(c.q);
    if (!src || !needle) return { ok: false };
    for (const s of src.sections) {
      const parts = [s.text || ''].concat(s.list || []);
      for (const part of parts) {
        const i = norm(part).indexOf(needle);
        if (i >= 0) return { ok: true, sec: s.id, frag: part.slice(i, i + needle.length) };
      }
    }
    return { ok: false };
  }
  QS.forEach((q) => {
    (q.cites || []).forEach((c) => Object.assign(c, locate(c)));
    if (q.flag) (q.flag.partial || []).forEach((c) => Object.assign(c, locate(c)));
  });
  const CITES_TOTAL = QS.reduce((n, q) => n + (q.cites || []).length, 0);
  const CITES_OK = QS.reduce((n, q) => n + (q.cites || []).filter((c) => c.ok).length, 0);
  const DRAFTED = QS.filter((q) => !q.flag).length;
  const FLAGGED = QS.filter((q) => q.flag);

  /* ---------------------------------------------------------------- Estado de las respuestas */

  const CONF = {
    alta: { tone: 'ok', label: 'Alta', long: 'Confianza alta' },
    media: { tone: 'warn', label: 'Media', long: 'Confianza media' },
    none: { tone: 'neutral', label: 'Sin evidencia', long: 'Sin evidencia suficiente' }
  };
  const ST_LABEL = {
    pending: 'Sin responder', draft: 'Borrador pendiente de aprobación', approved: 'Aprobada', discarded: 'Descartada',
    flagged: 'Requiere revisión de Calidad', assigned: 'Asignada a Calidad de planta'
  };
  const UNDECIDED = { draft: true, flagged: true };

  function ansOf(L, id) { return (L && L.ans && L.ans[id]) || { st: 'pending' }; }
  function textOf(q, a, lang) {
    if (a && a[lang] != null) return a[lang];
    return q.flag ? '' : q[lang];
  }
  function counts(L) {
    const c = { total: QS.length, cited: DRAFTED, alta: 0, media: 0, none: 0, pending: 0, draft: 0, approved: 0, discarded: 0, flagged: 0, assigned: 0, edited: 0, manual: 0, bulk: 0, single: 0 };
    QS.forEach((q) => {
      c[q.conf] += 1;
      const a = ansOf(L, q.id);
      c[a.st] = (c[a.st] || 0) + 1;
      if (a.edited) c.edited += 1;
      if (a.manual) c.manual += 1;
      if (a.st === 'approved') { if (a.via === 'bulk') c.bulk += 1; else c.single += 1; }
    });
    c.undecided = c.draft + c.flagged;
    c.decided = c.total - c.undecided - c.pending;
    return c;
  }
  function nextPending(L, current) {
    const i = QS.findIndex((q) => q.id === current);
    for (let k = 1; k <= QS.length; k++) {
      const q = QS[(i + k) % QS.length];
      if (q.id !== current && UNDECIDED[ansOf(L, q.id).st]) return q.id;
    }
    return null;
  }
  function isoMs(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(s || ''));
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) : NaN;
  }
  function secsBetween(a, b) { const d = (isoMs(b) - isoMs(a)) / 1000; return isFinite(d) ? Math.max(0, Math.round(d)) : 0; }

  /* ---------------------------------------------------------------- Registro del agente */

  const INTERNAL = { Prodigy: true, Procedimientos: true, 'Modelo de lenguaje': true };
  function streamSteps() {
    const skus = QN.products.map((p) => p.sku);
    const alta = QS.filter((q) => q.conf === 'alta').length;
    const media = QS.filter((q) => q.conf === 'media').length;
    return [
      { agent: AGENT, system: 'Outlook', action: `Lee el correo de ${QN.via} y el adjunto ${QN.file}`, result: `${QS.length} preguntas en ${SECS.length} bloques · plazo ${fmt.date(QN.due)}`, ms: 420 },
      { agent: AGENT, system: 'Prodigy', action: 'Identifica el cliente y los productos del cuestionario', result: `${QN.customer} vía Freeworld Foods · ${skus.join(' y ')}`, ms: 180 },
      { agent: AGENT, system: 'Procedimientos', action: `Busca en los ${DOC_COUNT} documentos indexados de Calidad: procedimientos, fichas técnicas, certificaciones y memoria`, result: `Fragmentos citables para ${DRAFTED} de ${QS.length} preguntas`, ms: 860 },
      { agent: AGENT, system: 'SAP', action: `Consulta recepción y controles de calidad de los lotes de ${skus.join(' y ')}`, result: `${GUI.info.code}: ${OG.intake.ticket}, ${tr} TR · ${MIX.info.code}: DM-4 conforme`, ms: 520 },
      { agent: AGENT, system: 'MES Mapex', action: 'Lee la ruta de línea y los controles de proceso registrados', result: `${GUI.info.line}: despedregadora DP-2 y óptica OPT-2 · cloro libre del agua de lavado en ${LAV.code}`, ms: 480 },
      { agent: AGENT, system: 'Mecalux Easy WMS', action: 'Revisa el almacenamiento y las expediciones a Freeworld Foods', result: `${nShip} expediciones en camión a ${T25} con registro de temperatura conforme`, ms: 410 },
      { agent: AGENT, system: 'Siemens Opcenter APS', action: 'Lee las reglas del plan de recepción de campaña', result: APS_RULE, ms: 300 },
      { agent: AGENT, system: 'Elara', action: 'Busca reclamaciones abiertas y cerradas de este cliente', result: `${complaint.code} abierta: piedra de ${complaint.defect.size_mm} mm en ${complaint.lot}`, ms: 350, tone: 'warn' },
      { agent: AGENT, system: 'SCADA Galileo', action: 'Cruza el stock de este cliente con las alarmas de hoy', result: mixC07 ? `${mixC07.pallets} palés de ${MIX.info.sku} estaban en ${chamber.code} durante la excursión (${exc.start}–${exc.end})` : 'Sin stock de este cliente afectado', ms: 390, tone: mixC07 ? 'warn' : undefined },
      { agent: AGENT, system: 'Modelo de lenguaje', action: `Redacta en inglés, con traducción, solo con los fragmentos encontrados (${DRAFTED} llamadas)`, result: `${DRAFTED} borradores con referencias a sus fuentes`, ms: 11200 },
      { agent: AGENT, system: 'Prodigy', action: 'Comprueba que cada cita aparece literalmente en su fuente', result: `${CITES_OK} de ${CITES_TOTAL} citas verificadas`, ms: 140, tone: CITES_OK === CITES_TOTAL ? 'ok' : 'crit' },
      { agent: AGENT, system: 'Prodigy', action: 'Asigna el nivel de confianza de cada respuesta', result: `${alta} de confianza alta · ${media} de confianza media: falta un dato que pide el cliente`, ms: 90 },
      { agent: AGENT, system: 'Prodigy', action: 'Marca las preguntas sin evidencia suficiente', result: `${fmt.list(FLAGGED.map((q) => q.id))}: requieren revisión de Calidad; no se redacta respuesta`, ms: 70, tone: 'warn' },
      { agent: AGENT, system: 'Elara', action: `Guarda el borrador ${QN.code} para su revisión`, result: `Pendiente de ${ROLE.quality_shift}`, ms: 260, tone: 'ok' }
    ];
  }
  const SYSTEMS = Array.from(new Set(streamSteps().map((s) => s.system).filter((s) => !INTERNAL[s])));

  /* ---------------------------------------------------------------- Piezas de la vista */

  function confChip(q, long) { const c = CONF[q.conf]; return chip({ tone: c.tone, label: long ? c.long : c.label }); }
  function stChip(a) {
    switch (a.st) {
      case 'draft': return chip('draft', a.manual ? 'Borrador de Calidad' : 'Borrador');
      case 'approved': return chip('approved', 'Aprobada');
      case 'discarded': return chip('rejected', 'Descartada');
      case 'flagged': return chip('review', 'Requiere revisión');
      case 'assigned': return chip('pending', 'Asignada a Calidad');
      default: return chip('draft', 'Sin responder');
    }
  }
  function rowTone(a) {
    if (a.st === 'approved') return 'tone-ok';
    if (a.st === 'flagged' || a.st === 'assigned') return 'tone-warn';
    if (a.st === 'discarded') return 'is-muted';
    return '';
  }
  function srcRef(s) { return s.code || s.label || ''; }
  /** Resumen de fuentes de una pregunta para la tabla (códigos sin cortar por el guion). */
  function srcSummary(q) {
    if (q.flag) return q.flag.partial && q.flag.partial.length ? 'Solo evidencia parcial' : 'Sin fuente indexada';
    const ids = Array.from(new Set(q.cites.map((c) => c.src)));
    const docs = ids.filter((id) => SOURCES[id].type === 'doc').map((id) => srcRef(SOURCES[id]));
    const recs = ids.filter((id) => SOURCES[id].type === 'record').length;
    const parts = docs.map((d) => html`<span class="nowrap">${d}</span>`);
    if (recs) parts.push(html`<span class="nowrap">${fmt.plural(recs, 'registro', 'registros')}</span>`);
    return parts.map((x, i) => html`${i ? ' · ' : ''}${x}`);
  }
  function matchFilter(q, L, f) {
    const st = ansOf(L, q.id).st;
    if (f === 'pending') return !!UNDECIDED[st];
    if (f === 'approved') return st === 'approved';
    if (f === 'quality') return !!q.flag;
    return true;
  }
  /** Texto de respuesta con las referencias [n] convertidas en botones de cita; los códigos (P-0412-07, REC-26-18233…) no se cortan. */
  const CODE_RE = /\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+\b/g;
  function answerHTML(text, ncites) {
    return raw(String(text || '').split(/(\[\d+\])/).map((part) => {
      const m = /^\[(\d+)\]$/.exec(part);
      const n = m ? Number(m[1]) : 0;
      if (n >= 1 && n <= ncites) return `<button type="button" class="cite" data-cite="${n}" title="Ver la fuente ${n}">${n}</button>`;
      return esc(part).replace(CODE_RE, (code) => `<span class="nowrap">${code}</span>`);
    }).join(''));
  }

  function kpis(L, ran) {
    const c = counts(L);
    return html`<div class="kpis">
      ${App.kpi({ label: 'Auditorías y visitas en 2025', value: MEM.audits, sub: `Incluye inspecciones oficiales · ${MEM.days} jornadas · Memoria de Sostenibilidad 2025`, icon: 'shield-check' })}
      ${App.kpi({ label: 'Preguntas del cuestionario', value: QS.length, sub: ran ? `${DRAFTED} con borrador citado · ${FLAGGED.length} para Calidad` : `${SECS.length} bloques · en inglés · plazo ${fmt.date(QN.due)}`, icon: 'list-checks' })}
      ${App.kpi({ label: 'Fuentes indexadas', value: DOC_COUNT, unit: 'documentos', sub: `Procedimientos, fichas, certificados y memoria · registros de ${SYSTEMS.length} sistemas`, icon: 'book-open' })}
      ${App.kpi({ label: 'Respuestas aprobadas', value: `${c.approved} de ${QS.length}`, sub: ran ? (L.completedAt ? `Revisión completada a las ${fmt.time(L.completedAt)}` : `Decide: ${ROLE.quality_shift}`) : 'Nada se envía sin la aprobación de Calidad', icon: 'user-check', tone: L.completedAt ? 'ok' : undefined })}
    </div>`;
  }

  function questionsCard(L, ran) {
    const c = counts(L);
    const filter = ran ? (L.filter || 'all') : 'all';
    const confTone = { alta: 't-ok', media: 't-warn', none: '' };
    const cols = [
      { label: 'Nº', width: '52px', render: (q) => html`<span class="code strong">${q.id}</span>` },
      { label: 'Pregunta', render: (q) => html`<span class="strong">${q.topic}</span><span class="sub">${ran ? srcSummary(q) : SEC[q.sec].es}</span>` },
      { label: 'Estado y confianza', width: '156px', stackLabel: 'Estado', render: (q) => html`${stChip(ansOf(L, q.id))}${ran ? html`<span class="sub ${confTone[q.conf]}">${q.conf === 'none' ? CONF.none.label : CONF[q.conf].long}</span>` : ''}` }
    ];
    const visible = QS.filter((q) => matchFilter(q, L, filter)).length;
    return App.card({
      id: 'cq-questions',
      title: 'Preguntas del cuestionario',
      sub: ran ? `${c.decided} de ${QS.length} decididas · ${c.approved} aprobadas` : `${QS.length} preguntas en ${SECS.length} bloques · ${QN.file}`,
      icon: 'list-checks',
      flush: true,
      actions: ran ? App.segmented({ name: 'cq-filter', label: 'Filtrar preguntas', value: filter, options: [
        { value: 'all', label: 'Todas', count: QS.length },
        { value: 'pending', label: 'Por decidir', count: c.undecided, tone: 'warn' },
        { value: 'approved', label: 'Aprobadas', count: c.approved, tone: 'ok' },
        { value: 'quality', label: 'Para Calidad', count: FLAGGED.length }
      ] }) : '',
      body: html`${App.table({
        class: 'cq-table',
        dense: true,
        clickable: ran,
        cols,
        rows: QS,
        rowClass: (q) => [ran && q.id === L.sel ? 'is-selected' : '', ran ? rowTone(ansOf(L, q.id)) : ''].filter(Boolean).join(' '),
        rowAttrs: (q) => ({ 'data-q': q.id, 'data-st': ansOf(L, q.id).st, hidden: ran && !matchFilter(q, L, filter) ? true : null })
      })}<p class="cq-empty muted small" ${visible ? raw('hidden') : ''}>Ninguna pregunta con este filtro.</p>`,
      footer: ran
        ? html`<span class="muted small">Confianza <strong>alta</strong>: respaldada literalmente por un documento o un registro · <strong>media</strong>: falta un dato que pide el cliente · <strong>sin evidencia suficiente</strong>: no se redacta.</span>`
        : html`<span class="muted small">${SECS.map((s) => `${s.id} · ${s.es}`).join(' · ')}</span>`
    });
  }

  function emailCard() {
    return App.card({
      id: 'cq-detail',
      class: 'cq-panel',
      title: `Correo recibido · ${QN.via}`,
      sub: `${fmt.cap(fmt.dateLong(QN.received))} · ${fmt.time(QN.received)} · buzón de Calidad`,
      icon: 'mail',
      body: App.emailView({ headers: EMAIL.headers, text: EMAIL.text, highlights: EMAIL.highlights, attachments: [QN.file] }),
      footer: html`${sys('Outlook')}<span class="muted small">${QS.length} preguntas en inglés · ${QN.products.length} productos de marca blanca</span><span class="spacer"></span><button type="button" class="btn btn-primary btn-sm" data-action="prepare">${icon('play', 15)}<span>Preparar respuestas</span></button>`
    });
  }

  function questionBlock(q, lang) {
    const main = lang === 'en' ? q.qEn : q.qEs;
    const other = lang === 'en' ? q.qEs : q.qEn;
    return html`<div class="cq-block">
      <div class="cq-label"><span>Pregunta del cliente</span>${App.segmented({ name: 'cq-lang', label: 'Idioma de la vista', value: lang, options: [{ value: 'es', label: 'Español' }, { value: 'en', label: 'Inglés (envío)' }] })}</div>
      <p class="cq-question">${main}</p>
      <p class="cq-orig"><b>${lang === 'en' ? 'Traducción' : 'Original en inglés'}:</b> ${other}</p>
    </div>`;
  }

  function answerBlock(q, a, lang) {
    let text = textOf(q, a, lang);
    let fallback = false;
    if (!text && lang === 'es') { text = textOf(q, a, 'en'); fallback = true; }
    const label = a.st === 'approved' ? 'Respuesta aprobada' : a.st === 'discarded' ? 'Borrador descartado' : a.manual ? 'Respuesta redactada por Calidad' : 'Respuesta propuesta';
    const tags = [a.edited ? chip('info', 'Editada por Calidad') : '', a.manual ? chip('neutral', 'Sin fuente indexada', { dot: false }) : ''];
    const cls = `cq-answer${a.st === 'approved' ? ' is-approved' : ''}${a.st === 'discarded' ? ' is-discarded' : ''}`;
    return html`<div class="cq-block">
      <div class="cq-label"><span>${label} · ${lang === 'en' ? 'texto para el cliente' : 'traducción de revisión'}</span><span class="lbl">${tags}</span></div>
      <div class="${cls}" data-answer lang="${lang}">${answerHTML(text, a.manual ? 0 : (q.cites || []).length)}</div>
      ${fallback ? html`<p class="xs muted mt-1">Sin traducción de revisión: se muestra el texto en inglés.</p>` : ''}
      ${a.st === 'discarded' && a.reason ? html`<p class="small slate mt-2">Motivo del descarte: ${a.reason}</p>` : ''}
    </div>`;
  }

  function editBlock(q, a) {
    return html`<div class="cq-block cq-edit">
      <div class="cq-label"><span>${q.flag ? 'Redactar respuesta (Calidad)' : 'Editar respuesta'}</span></div>
      <div class="field"><label class="label" for="cq-en">Respuesta para el cliente (inglés)</label><textarea id="cq-en" class="textarea" rows="6">${textOf(q, a, 'en')}</textarea></div>
      <div class="field mt-3"><label class="label" for="cq-es">Traducción de revisión (español)</label><textarea id="cq-es" class="textarea" rows="6">${textOf(q, a, 'es')}</textarea>
        <span class="hint" id="cq-edit-hint">${q.flag ? 'Sin fuente indexada: la respuesta quedará marcada como redactada por Calidad, sin citas.' : 'Las referencias [1], [2]… enlazan con las fuentes citadas. Si cambias el contenido, comprueba que la fuente lo siga respaldando.'}</span></div>
    </div>`;
  }

  function srcItem(c, n, key, why) {
    const src = SOURCES[c.src];
    return html`<li class="cq-src" data-src-item="${key}">
      <span class="cq-src-n">${n}</span>
      <div class="cq-src-main">
        <div class="cq-src-head">${src.code ? html`<span class="code">${src.code}</span>` : ''}<span class="cq-src-title">${src.title}</span></div>
        <div class="cq-src-meta">${src.type === 'record' ? sys(src.system) : ''}${chip('neutral', src.kind, { dot: false })}${c.ok ? chip({ tone: 'ok', icon: 'check', label: 'Cita verificada', size: 'sm' }) : chip({ tone: 'crit', icon: 'x', label: 'Cita no encontrada', size: 'sm' })}</div>
        <p class="cq-quote">«${c.ok ? html`<mark class="hl hl-brand">${c.frag}</mark>` : c.q}»</p>
        ${why ? html`<p class="cq-why">${why}</p>` : ''}
        <div><button type="button" class="link-btn small" data-src="${key}">Ver en la fuente</button></div>
      </div>
    </li>`;
  }

  function sourcesBlock(q) {
    const cites = q.cites || [];
    const ok = cites.filter((c) => c.ok).length;
    return html`<div class="cq-block">
      <div class="cq-label"><span>Fuentes citadas · ${cites.length}</span><span class="${ok === cites.length ? 't-ok' : 't-crit'}">${ok} de ${cites.length} verificadas en su fuente</span></div>
      <ol class="cq-srcs">${cites.map((c, i) => srcItem(c, i + 1, `c${i + 1}`))}</ol>
    </div>`;
  }

  function gapBlock(q) {
    const out = q.gapOutcome ? App.outcome(q.gapOutcome) : null;
    return App.callout({
      tone: 'warn',
      icon: 'alert-triangle',
      title: 'Confianza media: falta un dato que pide el cliente',
      body: html`<p>${q.gap}</p>${out ? html`<p class="mt-2">En esta sesión ya hay un simulacro: ${out.label}. Añádelo a la respuesta si procede.</p>` : ''}`,
      actions: q.gapGo ? html`<button type="button" class="btn btn-secondary btn-sm" data-go="${q.gapGo}">${q.gapGoLabel}${icon('arrow-right', 15)}</button>` : ''
    });
  }

  function flagBlocks(q) {
    const f = q.flag;
    return html`${App.callout({ tone: 'warn', icon: 'search', title: 'No hay evidencia suficiente en los procedimientos indexados', body: html`<p>${f.reason}</p><p class="mt-1">Prodigy no redacta una respuesta sin fuente.</p>` })}
      ${f.partial && f.partial.length ? html`<div class="cq-block"><div class="cq-label"><span>Evidencia parcial encontrada · ${f.partial.length}</span><span>No basta para responder</span></div><ol class="cq-srcs">${f.partial.map((c, i) => srcItem(c, i + 1, `p${i + 1}`, c.why))}</ol></div>` : ''}
      ${f.context ? App.callout({ tone: 'brand', icon: 'info', title: 'Contexto', body: f.context }) : ''}
      <div class="cq-block"><div class="cq-label"><span>Qué falta para responder</span></div><ul class="cq-missing">${f.missing.map((m) => html`<li>${m}</li>`)}</ul></div>`;
  }

  function noteBlock(n) {
    return App.callout({
      tone: n.tone || 'brand',
      icon: n.icon,
      title: n.title,
      attrs: { 'data-note': '' },
      body: html`<p>${n.text}</p><p class="xs muted mt-1">Nota interna: no forma parte de la respuesta al cliente.</p>`,
      actions: n.go ? html`<button type="button" class="btn btn-secondary btn-sm" data-go="${n.go}">${n.goLabel}${icon('arrow-right', 15)}</button>` : ''
    });
  }

  function footerFor(L, q, a, editing) {
    if (editing) {
      return html`<span class="spacer"></span><button type="button" class="btn btn-ghost btn-sm" data-action="cancel-edit">Cancelar</button><button type="button" class="btn btn-primary btn-sm" data-action="save-edit">${icon('save', 15)}<span>Guardar cambios</span></button>`;
    }
    const nxt = nextPending(L, q.id);
    const nextBtn = nxt ? html`<button type="button" class="btn btn-ghost btn-sm" data-action="next" data-next="${nxt}">${icon('arrow-right', 15)}<span>Siguiente por decidir · ${nxt}</span></button>` : '';
    switch (a.st) {
      case 'draft':
        return html`${nextBtn}<span class="spacer"></span>
          <button type="button" class="btn btn-ghost btn-sm" data-action="edit">${icon('edit', 15)}<span>Editar</span></button>
          ${a.manual ? '' : html`<button type="button" class="btn btn-secondary btn-sm" data-action="discard">${icon('x', 15)}<span>Descartar</span></button>`}
          <button type="button" class="btn btn-primary btn-sm" data-action="approve">${icon('check', 15)}<span>Aprobar respuesta</span></button>`;
      case 'approved':
        return html`<span class="cq-foot-status">${icon('check-circle', 16)}<span>Aprobada por ${a.by} · ${fmt.time(a.at)}${a.via === 'bulk' ? ' · en bloque' : ''}</span></span><span class="spacer"></span>${nextBtn}<button type="button" class="btn btn-ghost btn-sm" data-action="reopen">${icon('rotate-ccw', 15)}<span>Reabrir</span></button>`;
      case 'discarded':
        return html`<span class="cq-foot-status tone-muted">${icon('x-circle', 16)}<span>Descartada · no se exporta como respuesta</span></span><span class="spacer"></span>${nextBtn}<button type="button" class="btn btn-secondary btn-sm" data-action="restore">${icon('rotate-ccw', 15)}<span>Recuperar borrador</span></button>`;
      case 'flagged':
        return html`${nextBtn}<span class="spacer"></span>
          <button type="button" class="btn btn-secondary btn-sm" data-action="assign">${icon('user-check', 15)}<span>Asignar a Calidad de planta</span></button>
          <button type="button" class="btn btn-primary btn-sm" data-action="edit">${icon('edit', 15)}<span>Redactar respuesta</span></button>`;
      case 'assigned':
        return html`<span class="cq-foot-status tone-warn">${icon('user-check', 16)}<span>Asignada a ${a.to} · ${fmt.time(a.at)}</span></span><span class="spacer"></span>${nextBtn}<button type="button" class="btn btn-secondary btn-sm" data-action="edit">${icon('edit', 15)}<span>Redactar respuesta</span></button>`;
      default:
        return '';
    }
  }

  function detailPanel(ctx, L) {
    const q = QBY[L.sel] || QBY[DEFAULT_SEL];
    const a = ansOf(L, q.id);
    const lang = L.lang === 'en' ? 'en' : 'es';
    const editing = ctx.vars.editing === q.id;
    const blocks = [questionBlock(q, lang)];
    if (q.flag) {
      if (editing) blocks.push(editBlock(q, a));
      else if (a.manual) blocks.push(answerBlock(q, a, lang));
      blocks.push(flagBlocks(q));
    } else {
      blocks.push(editing ? editBlock(q, a) : answerBlock(q, a, lang));
      const note = q.note ? q.note() : null;
      if (note) blocks.push(noteBlock(note));
      if (q.gap) blocks.push(gapBlock(q));
      blocks.push(sourcesBlock(q));
    }
    return App.card({
      id: 'cq-detail',
      class: 'cq-panel',
      attrs: { 'data-q': q.id, 'data-st': a.st },
      title: `${q.id} · ${q.topic}`,
      sub: `Bloque ${q.sec} · ${SEC[q.sec].es}`,
      icon: q.flag ? 'alert-triangle' : 'message-square',
      iconTone: q.flag ? 'warn' : undefined,
      actions: html`${confChip(q, true)}${stChip(a)}`,
      body: html`<div class="cq-body">${blocks}</div>`,
      footer: footerFor(L, q, a, editing)
    });
  }

  function resultCard(L) {
    const c = counts(L);
    const altaPending = QS.filter((q) => q.conf === 'alta' && ansOf(L, q.id).st === 'draft').length;
    const flagPending = FLAGGED.filter((q) => ansOf(L, q.id).st === 'flagged').length;
    const buttons = [
      altaPending ? html`<button type="button" class="btn btn-primary" data-action="approve-high">${icon('check')}<span>Aprobar las ${altaPending} de confianza alta</span></button>` : '',
      flagPending ? html`<button type="button" class="btn btn-secondary" data-action="assign-all">${icon('user-check')}<span>Asignar ${flagPending === 1 ? 'la pregunta sin fuente' : `las ${flagPending} sin fuente`} a Calidad de planta</span></button>` : ''
    ].filter(Boolean);
    return App.card({
      id: 'cq-result',
      title: `Borradores preparados a las ${fmt.time(L.run.at)} en ${fmt.ms(L.run.ms)}`,
      sub: `${DRAFTED} de ${QS.length} preguntas con borrador y cita verificada · ${FLAGGED.length} sin evidencia suficiente, marcadas para Calidad`,
      icon: 'list-checks',
      actions: html`${L.completedAt ? chip('done', `Revisión completada · ${fmt.time(L.completedAt)}`) : chip('pending', `${c.undecided} por decidir`)}<button type="button" class="btn btn-ghost btn-sm" data-action="email">${icon('mail', 15)}<span>Ver el correo</span></button>`,
      body: html`<div class="stack">
        ${App.stats([
          { label: 'Con borrador y cita', value: DRAFTED },
          { label: 'Confianza alta', value: c.alta, tone: 'ok' },
          { label: 'Confianza media', value: c.media, tone: 'warn' },
          { label: 'Sin evidencia suficiente', value: c.none, tone: 'warn' },
          { label: 'Citas verificadas en su fuente', value: `${CITES_OK} de ${CITES_TOTAL}`, tone: CITES_OK === CITES_TOTAL ? 'ok' : 'crit' },
          { label: 'Respuestas aprobadas', value: `${c.approved} de ${QS.length}` }
        ])}
        ${buttons.length ? html`<div class="row">${buttons}</div>` : ''}
        <div class="row row-nowrap muted small" style="align-items:flex-start">${icon('shield-check', 16)}<span>Política aplicada: nada se envía al cliente sin la aprobación de ${ROLE.quality_shift}; la aprobación en bloque solo incluye respuestas de confianza alta y las preguntas sin fuente indexada no se responden.</span></div>
        <details class="run-log">
          <summary>${icon('chevron-right', 16)}<span>Registro de ejecución · ${L.run.steps} pasos · ${fmt.ms(L.run.ms)}</span></summary>
          <div class="mt-2" id="cq-log"></div>
        </details>
      </div>`
    });
  }

  function compareCard(L) {
    const c = counts(L);
    const run = L.run;
    const done = !!L.completedAt;
    const review = done ? secsBetween(run.at, L.completedAt) : 0;
    const appr = [];
    if (c.bulk) appr.push(`1 aprobación en bloque (${c.bulk} respuestas)`);
    if (c.single) appr.push(`${c.single} ${c.single === 1 ? 'aprobación individual' : 'aprobaciones individuales'}`);
    if (c.assigned) appr.push(`${c.assigned} ${c.assigned === 1 ? 'pregunta asignada' : 'preguntas asignadas'} a Calidad de planta`);
    const rows = [
      { k: 'Personas', hoy: '2–3: Calidad de planta, Calidad de cliente y, según la pregunta, Agronomía o Mantenimiento', con: `1 revisor (${ROLE.quality_shift}); ${ROLE.quality_plant} completa las ${FLAGGED.length} preguntas sin fuente` },
      { k: 'Sistemas y documentos abiertos', hoy: '6–8: correo, Excel del cliente, Elara, SAP, carpeta de certificados, procedimientos y memoria de sostenibilidad', con: `Ninguno por parte del revisor: Prodigy consultó ${DOC_COUNT} documentos y ${SYSTEMS.length} sistemas, y cada respuesta enlaza su fuente` },
      { k: 'Pasos', hoy: 'Buscar la fuente de cada pregunta, copiar y adaptar respuestas de otros años, pedir datos a otros departamentos y montar el Excel', con: `${run.steps} pasos automáticos${appr.length ? ` · ${fmt.list(appr)}` : ' · aprobación de Calidad pendiente'}` },
      { k: 'Tiempo', hoy: '2–4 h de trabajo de Calidad, repartidas en 2–3 días', con: done ? `Borrador del agente en ${fmt.ms(run.ms)} · revisión de Calidad de ${fmt.dur(review)}, medida en esta sesión` : `Borrador del agente en ${fmt.ms(run.ms)} · revisión en curso (${c.decided} de ${QS.length} decididas)`, time: true }
    ];
    return App.card({
      id: 'cq-compare',
      title: 'Hoy y con Prodigy · este cuestionario',
      sub: '«Hoy»: estimación prudente, a validar con vuestra línea base en el piloto · «Con Prodigy»: lo medido en esta sesión',
      icon: 'bar-chart',
      flush: true,
      body: App.table({
        cols: [
          { label: '', width: '20%', render: (r) => html`<span class="strong">${r.k}</span>` },
          { label: 'Hoy (estimación)', width: '38%', render: (r) => (r.time ? html`<span class="strong">${r.hoy}</span>` : r.hoy) },
          { label: 'Con Prodigy (esta sesión)', render: (r) => (r.time ? html`<span class="strong${done ? ' t-ok' : ''}">${r.con}</span>` : r.con) }
        ],
        rows,
        rowAttrs: (r) => ({ 'data-row': r.k })
      }),
      footer: html`<span class="muted small">«Hoy» se sustituye por la línea base medida en las semanas 1–2 del piloto. «Con Prodigy» incluye la revisión humana, no solo el agente.</span><span class="spacer"></span>${done ? html`<button type="button" class="btn btn-primary btn-sm" data-action="pdf">${icon('printer', 15)}<span>Descargar cuestionario (PDF)</span></button>` : ''}`
    });
  }

  /* ---------------------------------------------------------------- Acciones */

  function setAns(ctx, patchById) {
    const ans = Object.assign({}, ctx.local.ans);
    Object.keys(patchById).forEach((id) => { ans[id] = Object.assign({}, ans[id], patchById[id]); });
    ctx.setLocal({ ans });
  }

  function checkComplete(ctx) {
    const L = ctx.local;
    if (!L.run || !L.ans) return;
    const c = counts(L);
    if (!c.undecided && !L.completedAt) {
      const at = App.nowISO();
      ctx.setLocal({ completedAt: at });
      const label = `${c.approved} de ${c.total} respuestas aprobadas${c.assigned ? ` · ${c.assigned} asignadas a Calidad de planta` : ''}`;
      App.outcome('cuestionario', { status: 'done', label });
      App.audit('Revisión del cuestionario completada', `${QN.code} · ${label} · revisión de ${fmt.dur(secsBetween(L.run.at, at))}`);
      App.toast(`Revisión completada · ${label}`, { tone: 'ok' });
    } else if (c.undecided && L.completedAt) {
      ctx.setLocal({ completedAt: null });
      App.outcome('cuestionario', null);
    }
  }
  function decided(ctx) { checkComplete(ctx); ctx.rerender(); }

  /** Desplaza la ventana (no solo la vista visual en móvil) para dejar el elemento bajo la barra superior. */
  function scrollToEl(el) {
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 68;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function select(ctx, id) {
    if (!QBY[id]) return;
    ctx.vars.editing = null;
    ctx.setLocal({ sel: id });
    ctx.rerender();
    requestAnimationFrame(() => {
      const panel = ctx.$('#cq-detail');
      if (!panel) return;
      const r = panel.getBoundingClientRect();
      const narrow = window.matchMedia('(max-width: 1023px)').matches;
      if (narrow || r.top < 0 || r.top > window.innerHeight - 160) scrollToEl(panel);
    });
  }

  async function prepare(ctx) {
    if ((ctx.local.run && ctx.local.ans) || ctx.vars.busy) return;
    ctx.vars.busy = true;
    const startedAt = App.nowISO();
    App.audit('Preparación de respuestas solicitada', `${QN.code} · ${QS.length} preguntas · ${QN.customer} vía ${QN.via}`);
    ctx.$$('[data-action="prepare"]').forEach((b) => {
      b.disabled = true;
      b.classList.add('is-busy');
      b.innerHTML = String(html`<span class="spinner"></span><span>Preparando respuestas…</span>`);
    });
    const host = ctx.$('#cq-run');
    host.hidden = false;
    scrollToEl(host);
    ctx.presenter({ next: 'Mientras corre: «Fijaos en qué sistema toca cada paso; el modelo solo redacta con los fragmentos encontrados y cada cita se comprueba». Si hace falta, pulsa «Acelerar».' });
    const run = App.reasoningStream(host, streamSteps(), { title: `Agente ${AGENT} · ${QN.code}`, signal: ctx.signal, maxHeight: 400, start: startedAt });
    const res = await run.done;
    if (!ctx.alive()) return;
    ctx.vars.busy = false;
    const ans = {};
    QS.forEach((q) => { ans[q.id] = { st: q.flag ? 'flagged' : 'draft' }; });
    ctx.setLocal({ run: { startedAt, at: App.nowISO(), ms: res.ms, steps: res.steps }, ans, sel: DEFAULT_SEL, filter: 'all', completedAt: null });
    App.audit('Borradores de respuesta preparados', `${QN.code} · ${DRAFTED} con cita verificada (${CITES_OK} de ${CITES_TOTAL} citas) · ${FLAGGED.length} sin evidencia suficiente · ${fmt.ms(res.ms)}`, AGENT_ACTOR);
    FLAGGED.forEach((q) => App.audit('Pregunta marcada para revisión de Calidad', `${QN.code} · ${q.id} · ${q.topic} · sin evidencia suficiente en los documentos indexados`, AGENT_ACTOR));
    App.toast(`${DRAFTED} respuestas preparadas en ${fmt.ms(res.ms)} · ${FLAGGED.length} quedan para Calidad`, { tone: 'ok' });
    ctx.presenter(null);
    ctx.rerender();
    requestAnimationFrame(() => scrollToEl(ctx.$('#cq-result')));
  }

  async function approveOne(ctx, id) {
    const q = QBY[id];
    const a = ansOf(ctx.local, id);
    if (!q || a.st !== 'draft') return;
    if (q.conf === 'media' && !a.edited && !a.manual) {
      const ok = await App.confirm({
        title: `Aprobar ${q.id} con confianza media`,
        body: html`<p class="slate">${q.gap}</p><p class="slate mt-2">¿Apruebas la respuesta tal como está? Queda en el registro de auditoría.</p>`,
        confirmLabel: 'Aprobar respuesta',
        icon: 'check'
      });
      if (!ok || !ctx.alive()) return;
    }
    setAns(ctx, { [id]: { st: 'approved', by: ROLE.quality_shift, at: App.nowISO(), via: 'single' } });
    App.audit('Respuesta aprobada', `${QN.code} · ${q.id} · ${q.topic} · ${CONF[q.conf].long.toLowerCase()}${a.edited ? ' · editada' : ''}${a.manual ? ' · redactada por Calidad, sin fuente indexada' : ''}`);
    App.toast(`${q.id} aprobada`, { tone: 'ok' });
    decided(ctx);
  }

  async function approveHigh(ctx) {
    const ids = QS.filter((q) => q.conf === 'alta' && ansOf(ctx.local, q.id).st === 'draft').map((q) => q.id);
    if (!ids.length) return;
    const ok = await App.confirm({
      title: `Aprobar ${ids.length} respuestas de confianza alta`,
      body: html`<p class="slate">Se aprueban las respuestas respaldadas literalmente por un documento o un registro: ${fmt.list(ids)}.</p><p class="slate mt-2">Las de confianza media y las preguntas sin fuente no se incluyen.</p>`,
      confirmLabel: `Aprobar ${ids.length} respuestas`,
      icon: 'check'
    });
    if (!ok || !ctx.alive()) return;
    const at = App.nowISO();
    const patch = {};
    ids.forEach((id) => { patch[id] = { st: 'approved', by: ROLE.quality_shift, at, via: 'bulk' }; });
    setAns(ctx, patch);
    App.audit('Aprobación en bloque', `${QN.code} · ${ids.length} respuestas de confianza alta: ${ids.join(', ')}`);
    App.toast(`${ids.length} respuestas aprobadas`, { tone: 'ok' });
    decided(ctx);
  }

  function assign(ctx, ids) {
    const list = ids.filter((id) => QBY[id] && QBY[id].flag && ansOf(ctx.local, id).st === 'flagged');
    if (!list.length) return;
    const at = App.nowISO();
    const patch = {};
    list.forEach((id) => { patch[id] = { st: 'assigned', to: ROLE.quality_plant, at }; });
    setAns(ctx, patch);
    App.audit('Preguntas asignadas a Calidad de planta', `${QN.code} · ${list.join(', ')} · ${ROLE.quality_plant} · completar antes del ${fmt.date(ASSIGN_DUE)}`);
    App.audit('Aviso enviado por Microsoft Teams', `${ROLE.quality_plant} · ${fmt.plural(list.length, 'pregunta', 'preguntas')} del cuestionario ${QN.code} sin evidencia suficiente`, AGENT_ACTOR);
    App.toast(`${fmt.plural(list.length, 'pregunta asignada', 'preguntas asignadas')} a ${ROLE.quality_plant}`, { tone: 'ok', icon: 'user-check' });
    decided(ctx);
  }

  async function discard(ctx, id) {
    const q = QBY[id];
    if (!q || ansOf(ctx.local, id).st !== 'draft') return;
    const reason = await App.promptText({
      title: `Descartar el borrador de ${q.id}`,
      text: 'El borrador no se incluirá en la respuesta ni en la exportación. Queda en el registro de auditoría con su motivo.',
      label: 'Motivo',
      placeholder: 'Por ejemplo: esta pregunta se responde con el certificado adjunto',
      required: true,
      confirmLabel: 'Descartar borrador'
    });
    if (reason == null || !ctx.alive()) return;
    setAns(ctx, { [id]: { st: 'discarded', by: ROLE.quality_shift, at: App.nowISO(), reason, via: null } });
    App.audit('Borrador descartado', `${QN.code} · ${q.id} · ${q.topic} · motivo: ${reason}`);
    decided(ctx);
  }

  function reopen(ctx, id, restore) {
    const q = QBY[id];
    const a = ansOf(ctx.local, id);
    if (!q || (restore ? a.st !== 'discarded' : a.st !== 'approved')) return;
    setAns(ctx, { [id]: { st: 'draft', by: null, at: null, via: null, reason: null } });
    App.audit(restore ? 'Borrador recuperado' : 'Respuesta reabierta', `${QN.code} · ${q.id} · ${q.topic}`);
    decided(ctx);
  }

  function saveEdit(ctx, id) {
    const q = QBY[id];
    const a = ansOf(ctx.local, id);
    const enEl = ctx.$('#cq-en');
    const esEl = ctx.$('#cq-es');
    if (!q || !enEl || !esEl) return;
    const en = enEl.value.trim();
    const es = esEl.value.trim();
    if (!en) {
      const hint = ctx.$('#cq-edit-hint');
      if (hint) { hint.textContent = 'Escribe la respuesta en inglés para guardarla.'; hint.classList.add('t-crit'); }
      enEl.focus();
      return;
    }
    ctx.vars.editing = null;
    if (en === textOf(q, a, 'en') && es === textOf(q, a, 'es')) { ctx.rerender(); return; }
    if (q.flag) {
      setAns(ctx, { [id]: { st: 'draft', en, es, manual: true, edited: false, by: null, at: null, via: null } });
      App.audit('Respuesta redactada por Calidad', `${QN.code} · ${q.id} · ${q.topic} · sin fuente indexada`);
    } else {
      setAns(ctx, { [id]: { st: 'draft', en, es, edited: true, by: null, at: null, via: null } });
      App.audit('Respuesta editada', `${QN.code} · ${q.id} · ${q.topic}`);
    }
    App.toast(`${q.id}: cambios guardados, pendiente de aprobación`, { tone: 'info', icon: 'edit' });
    decided(ctx);
  }

  function openSource(q, c, label) {
    if (!c) return;
    const src = SOURCES[c.src];
    App.modal({
      title: src.title,
      kicker: `${label} · ${src.kind}${src.type === 'record' ? ` · ${src.system}` : ''}`,
      size: 'md',
      body: html`${App.docPreview({ code: src.code, title: src.title, org: src.org, sections: src.sections, highlight: c.ok ? { section: c.sec, text: c.frag, tone: 'brand' } : null })}
        <p class="row row-nowrap small mt-4 ${c.ok ? 't-ok' : 't-crit'}" style="align-items:flex-start">${icon(c.ok ? 'check-circle' : 'alert-circle', 16)}<span>${c.ok ? 'El fragmento citado aparece literalmente en esta fuente.' : 'El fragmento no aparece en esta fuente: la cita no se usa.'}</span></p>`,
      actions: [{ label: 'Cerrar', variant: 'primary' }]
    });
  }

  function openEmail() {
    App.modal({
      title: EMAIL.headers.Subject,
      kicker: `Correo recibido · ${fmt.date(QN.received)} · ${QN.via}`,
      size: 'lg',
      body: App.emailView({ headers: EMAIL.headers, text: EMAIL.text, highlights: EMAIL.highlights, attachments: [QN.file] }),
      actions: [{ label: 'Cerrar', variant: 'primary' }]
    });
  }

  function applyFilter(ctx, value) {
    ctx.setLocal({ filter: value });
    let n = 0;
    ctx.$$('.cq-table tbody tr[data-q]').forEach((tr) => {
      const show = matchFilter(QBY[tr.getAttribute('data-q')], ctx.local, value);
      tr.hidden = !show;
      if (show) n += 1;
    });
    const empty = ctx.$('.cq-empty');
    if (empty) empty.hidden = n > 0;
  }

  /* ---------------------------------------------------------------- Exportación */

  function evidenceText(q, a) {
    if (a.manual) return 'Redactada por Calidad · sin fuente indexada';
    if (q.flag) return 'No hay evidencia suficiente en los procedimientos indexados';
    return q.cites.map((c, i) => `[${i + 1}] ${srcRef(SOURCES[c.src])} · ${SOURCES[c.src].title}`).join(' | ');
  }
  function hasAnswer(q, a) { return a.st !== 'discarded' && (!q.flag || !!a.manual); }

  function exportCsv(ctx) {
    const L = ctx.local;
    if (!L.run || !L.ans) return;
    const rows = QS.map((q) => {
      const a = ansOf(L, q.id);
      const has = hasAnswer(q, a);
      return {
        id: q.id,
        sec: `${q.sec}. ${SEC[q.sec].en}`,
        qEn: q.qEn,
        qEs: q.qEs,
        aEn: has ? textOf(q, a, 'en') : '',
        aEs: has ? textOf(q, a, 'es') : '',
        ev: evidenceText(q, a),
        conf: CONF[q.conf].long,
        st: ST_LABEL[a.st] + (a.st === 'discarded' && a.reason ? ` (motivo: ${a.reason})` : '') + (a.edited ? ' · editada por Calidad' : ''),
        by: a.st === 'approved' || a.st === 'discarded' ? a.by : a.st === 'assigned' ? a.to : '',
        at: a.at ? fmt.date(a.at, { time: true }) : ''
      };
    });
    const content = App.csv({
      cols: [
        { label: 'Nº', key: 'id' }, { label: 'Bloque', key: 'sec' }, { label: 'Question (EN)', key: 'qEn' }, { label: 'Pregunta (ES)', key: 'qEs' },
        { label: 'Answer (EN)', key: 'aEn' }, { label: 'Respuesta (ES)', key: 'aEs' }, { label: 'Evidencia', key: 'ev' }, { label: 'Confianza', key: 'conf' },
        { label: 'Estado', key: 'st' }, { label: 'Decidido por', key: 'by' }, { label: 'Fecha y hora', key: 'at' }
      ],
      rows
    });
    App.downloadFile(`cuestionario-${QN.code}.csv`, 'text/csv', content);
  }

  function cssString(s) { return `"${String(s).replace(/["\\]/g, '\\$&')}"`; }
  function pageStyle(rev, status) {
    const box = 'font:500 8pt Inter,system-ui,sans-serif;color:var(--muted,#6E7777)';
    return `<style>
.cq-q{border:1px solid var(--line);border-radius:6px;padding:9px 12px;margin:0 0 9px}
.cq-q p,.cq-q li,.cq-qh{break-inside:avoid}
.cq-qh,.cq-ql,.cq-qen{break-after:avoid}
.cq-qh{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:4px}
.cq-qen{font-style:italic;margin:4px 0 2px}
.cq-ql{margin-top:8px;font-size:10.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.cq-qs{margin-top:6px;font-size:11.5px}
@page{
@top-left{content:${cssString('Congelados de Navarra · Planta de Fustiñana')};${box}}
@top-right{content:${cssString(`${QN.code} · revisión ${rev} · ${status}`)};${box}}
@bottom-left{content:${cssString('Documento generado por Prodigy · demostración con datos sintéticos')};${box}}
@bottom-right{content:"Página " counter(page) " de " counter(pages);${box}}
}
</style>`;
  }
  function pdfBlock(q, a) {
    const st = a.st || 'pending';
    const tone = st === 'approved' ? 'ok' : (st === 'flagged' || st === 'assigned') ? 'warn' : '';
    const has = hasAnswer(q, a);
    const en = has ? textOf(q, a, 'en') : '';
    const es = has ? textOf(q, a, 'es') : '';
    let decision = 'Borrador pendiente de aprobación';
    if (st === 'approved') decision = `Aprobada por ${a.by} · ${fmt.date(a.at, { time: true })}${a.via === 'bulk' ? ' · aprobación en bloque' : ''}`;
    else if (st === 'assigned') decision = `Asignada a ${a.to} · ${fmt.date(a.at, { time: true })} · completar antes del ${fmt.date(ASSIGN_DUE)}`;
    else if (st === 'discarded') decision = `Descartada por ${a.by} · ${fmt.date(a.at, { time: true })} · motivo: ${a.reason}`;
    else if (st === 'flagged') decision = 'Sin decisión: requiere revisión de Calidad';
    const flagNote = q.flag && !a.manual ? `No hay evidencia suficiente en los procedimientos indexados. ${q.flag.reason} Falta: ${q.flag.missing.join('; ')}.` : '';
    const ev = !q.flag && has && !a.manual
      ? `<div class="cq-ql">Evidencia</div><ul>${q.cites.map((c, i) => (c.ok ? `<li>[${i + 1}] <span class="code">${esc(srcRef(SOURCES[c.src]))}</span> ${esc(SOURCES[c.src].title)} · «${esc(c.frag)}»</li>` : '')).join('')}</ul>`
      : '';
    const extra = [a.edited ? 'editada por Calidad' : '', a.manual ? 'redactada por Calidad, sin fuente indexada' : ''].filter(Boolean).join(' · ');
    return `<div class="cq-q">
<div class="cq-qh"><span class="code">${esc(q.id)}</span><strong>${esc(q.topic)}</strong><span class="tag ${tone}">${esc(ST_LABEL[st])}</span><span class="tag">${esc(CONF[q.conf].long)}</span></div>
<p class="cq-qen">${esc(q.qEn)}</p>
<p class="muted">${esc(q.qEs)}</p>
${en ? `<div class="cq-ql">Respuesta para el cliente (inglés)${extra ? ` · ${esc(extra)}` : ''}</div><p>${esc(en)}</p>${es ? `<div class="cq-ql">Traducción de revisión</div><p class="muted">${esc(es)}</p>` : ''}` : ''}
${flagNote ? `<div class="note">${esc(flagNote)}</div>` : ''}
${st === 'discarded' ? '<div class="note">Borrador descartado: no se incluye en la respuesta.</div>' : ''}
${ev}
<p class="cq-qs muted">${esc(decision)}</p>
</div>`;
  }

  function openPdf(ctx) {
    const L = ctx.local;
    if (!L.run || !L.ans) return;
    const c = counts(L);
    const all = c.approved === QS.length;
    const rev = L.completedAt ? '1' : '0';
    const statusShort = all ? 'Aprobado' : 'Borrador';
    const statusLong = all ? 'Aprobado' : `Borrador · ${c.approved} de ${QS.length} respuestas aprobadas`;
    const used = Array.from(new Set(QS.reduce((acc, q) => acc.concat((q.cites || []).map((x) => x.src)), []))).map((id) => SOURCES[id]);
    const pendFlag = FLAGGED.filter((q) => ['flagged', 'assigned'].includes(ansOf(L, q.id).st));
    const pendDraft = QS.filter((q) => ansOf(L, q.id).st === 'draft');
    const lastApproval = QS.map((q) => ansOf(L, q.id)).filter((a) => a.st === 'approved' && a.at).map((a) => a.at).sort().pop();
    const history = [{ rev: '0', date: fmt.date(L.run.at, { time: true }), desc: `Borrador preparado: ${DRAFTED} respuestas con cita verificada y ${FLAGGED.length} preguntas sin evidencia suficiente`, by: AGENT_ACTOR }];
    if (L.completedAt) {
      const bits = [`${c.approved} aprobadas`, c.edited ? `${c.edited} editadas` : '', c.discarded ? `${c.discarded} descartadas` : '', c.assigned ? `${c.assigned} asignadas a Calidad de planta` : ''].filter(Boolean);
      history.push({ rev: '1', date: fmt.date(L.completedAt, { time: true }), desc: `Revisión de Calidad: ${fmt.list(bits)}`, by: ROLE.quality_shift });
    }
    const pendingItems = pendFlag.map((q) => `${q.id} · ${q.topic}: ${ansOf(L, q.id).st === 'assigned' ? `asignada a ${ROLE.quality_plant}, completar antes del ${fmt.date(ASSIGN_DUE)}` : 'sin asignar'}`)
      .concat(pendDraft.map((q) => `${q.id} · ${q.topic}: borrador pendiente de aprobación`));
    // Bloque de aprobaciones en la primera página (rol, estado y fecha y hora de la sesión).
    const approvals = [
      { fn: 'Elaboración del borrador', who: AGENT_ACTOR, st: `${DRAFTED} respuestas con cita verificada · ${FLAGGED.length} sin evidencia suficiente`, at: fmt.date(L.run.at, { time: true }) },
      { fn: 'Revisión y aprobación de respuestas', who: ROLE.quality_shift, st: c.approved ? `${c.approved} de ${QS.length} aprobadas${c.discarded ? ` · ${c.discarded} descartadas` : ''}` : 'Pendiente de revisión', at: lastApproval ? fmt.date(lastApproval, { time: true }) : '—' }
    ];
    if (pendFlag.length) approvals.push({ fn: 'Preguntas sin evidencia suficiente', who: ROLE.quality_plant, st: `Pendiente: ${fmt.list(pendFlag.map((q) => q.id))}`, at: `Antes del ${fmt.date(ASSIGN_DUE)}` });
    const sections = [
      {
        heading: '1. Aprobaciones',
        table: { cols: [{ label: 'Función', key: 'fn' }, { label: 'Responsable', key: 'who' }, { label: 'Estado', key: 'st' }, { label: 'Fecha y hora', key: 'at' }], rows: approvals },
        html: raw(pageStyle(rev, statusShort))
      },
      {
        heading: '2. Objeto y alcance',
        text: `Respuesta de Congelados de Navarra (planta de Fustiñana) al ${QN.title} de ${QN.customer}, recibido de ${QN.via} el ${fmt.date(QN.received)}. Productos: ${QN.products.map((p) => `${p.sku} · ${p.name}`).join(' y ')}. ${QS.length} preguntas en ${SECS.length} bloques.\n\nCada respuesta cita la fuente que la respalda y cada cita se ha comprobado literalmente en su fuente (${CITES_OK} de ${CITES_TOTAL}). Las preguntas sin evidencia suficiente en los procedimientos indexados no se responden y quedan para Calidad de planta.`
      },
      {
        heading: '3. Resumen de respuestas',
        table: { cols: [{ label: 'Nº', key: 'id' }, { label: 'Pregunta', key: 'topic' }, { label: 'Confianza', render: (q) => CONF[q.conf].long }, { label: 'Estado', render: (q) => ST_LABEL[ansOf(L, q.id).st] }], rows: QS }
      },
      { heading: '4. Respuestas', html: raw(QS.map((q) => pdfBlock(q, ansOf(L, q.id))).join('')) },
      {
        heading: '5. Fuentes consultadas',
        table: { cols: [{ label: 'Código', render: (s) => raw(`<span class="code">${esc(srcRef(s))}</span>`) }, { label: 'Fuente', key: 'title' }, { label: 'Tipo', key: 'kind' }, { label: 'Sistema', render: (s) => (s.type === 'record' ? s.system : 'Documentos indexados') }], rows: used }
      }
    ];
    if (pendingItems.length) sections.push({ heading: '6. Pendiente', list: pendingItems });
    sections.push({
      heading: `${pendingItems.length ? 7 : 6}. Historial de revisiones`,
      table: { cols: [{ label: 'Revisión', key: 'rev' }, { label: 'Fecha', key: 'date' }, { label: 'Descripción', key: 'desc' }, { label: 'Responsable', key: 'by' }], rows: history }
    });
    App.printableReport({
      title: 'Respuesta a cuestionario técnico de proveedor',
      subtitle: `${QN.title} · ${QN.customer} · recibido de ${QN.via}`,
      code: QN.code,
      filename: `cuestionario-${QN.code}`,
      meta: [
        ['Revisión', rev], ['Estado', statusLong], ['Planta', 'Fustiñana (FUS)'],
        ['Cliente', `${QN.customer} · vía ${QN.via}`], ['Productos', QN.products.map((p) => p.sku).join(' · ')], ['Recibido', fmt.date(QN.received)],
        ['Plazo de respuesta', fmt.date(QN.due)], ['Idioma de respuesta', 'Inglés, con traducción de revisión']
      ],
      sections,
      footer: `Documento generado por Prodigy · demostración con datos sintéticos · ${QN.code} · revisión ${rev}`
    });
  }

  /* ---------------------------------------------------------------- Presentador */

  function sayFor(state) {
    const L = (state.scenes && state.scenes.cuestionario) || {};
    const ran = !!(L.run && L.ans);
    if (!ran) {
      return [
        `Cada cliente de marca blanca trae su cuestionario técnico. En 2025 el grupo recibió ${MEM.audits} auditorías, visitas de cliente e inspecciones: ${MEM.days} jornadas. Es trabajo de fondo que se come horas de Calidad.`,
        `Este llega de Freeworld Foods para el retailer del Reino Unido: ${QS.length} preguntas en inglés sobre el guisante 1 kg y el salteado de 600 g. Vuestros procedimientos están en español; da igual.`,
        'Al pulsar, Prodigy busca en procedimientos, fichas técnicas, certificaciones y en los registros de SAP, Mapex, Easy WMS, Opcenter y Elara, y redacta cada respuesta con su fuente.'
      ];
    }
    if (!L.completedAt) {
      return [
        `${DRAFTED} de ${QS.length} con borrador y cita; cada cita se comprueba contra el texto de la fuente. ${FLAGGED.length} quedan para Calidad: Listeria, residuos y clorato, y defensa alimentaria. Sin documento que lo respalde, no se inventa nada.`,
        `B1: además de responder, avisa de que este mismo cliente tiene abierta la reclamación ${complaint.code} por una piedra y de que la malla de DP-2 sigue pendiente. Hoy eso depende de que alguien se acuerde.`,
        mixC07 ? `C1: ${mixC07.pallets} palés del salteado para este cliente estaban en ${chamber.code} durante la excursión de esta mañana. El cuestionario no vive aislado del resto de la planta.` : 'C1: la respuesta cita el procedimiento de excursiones de temperatura.',
        'Nada sale sin aprobación: en bloque solo las de confianza alta; las de confianza media se revisan una a una.'
      ];
    }
    return [
      'Revisión cerrada y registrada en la auditoría: cada aprobación, edición y asignación tiene hora y responsable.',
      'Excel para devolver el cuestionario al cliente y PDF como documento controlado: código, revisión, estado, aprobaciones y fuentes.',
      'Comparativa del final: hoy, 2–4 horas repartidas en varios días (a validar en el piloto); aquí, el borrador en segundos más la revisión que acabamos de medir.'
    ];
  }
  function nextFor(state) {
    const L = (state.scenes && state.scenes.cuestionario) || {};
    if (!(L.run && L.ans)) return 'Pulsar «Preparar respuestas» y comentar el registro mientras se ejecuta.';
    if (!L.completedAt) {
      const alta = QS.filter((q) => q.conf === 'alta').length;
      const media = QS.filter((q) => q.conf === 'media').map((q) => q.id);
      return `Enseñar B1 (cita y aviso de la reclamación) y B4 (sin evidencia). Después «Aprobar las ${alta} de confianza alta», aprobar ${fmt.list(media)} una a una y «Asignar las ${FLAGGED.length} sin fuente a Calidad de planta».`;
    }
    return 'Pulsar «Descargar cuestionario (PDF)», enseñar la comparativa y pasar a «Procedimientos» con la flecha derecha.';
  }

  /* ---------------------------------------------------------------- Registro de la escena */

  App.scene({
    id: 'cuestionario',
    order: 60,
    section: 'Calidad',
    nav: 'Cuestionario de cliente',
    title: 'Cuestionario de cliente',
    icon: 'list-checks',
    badge: (state) => {
      const L = state.scenes && state.scenes.cuestionario;
      if (!L || !L.run || !L.ans) return null;
      const n = QS.filter((q) => UNDECIDED[ansOf(L, q.id).st]).length;
      return n ? { text: String(n), tone: 'warn' } : null;
    },
    presenter: { say: sayFor, next: nextFor },
    render(root, ctx) {
      let L = ctx.local;
      const ran = !!(L.run && L.ans);
      if (ran && !ctx.vars.paramDone) {
        ctx.vars.paramDone = true;
        const p = String(ctx.params[0] || '').toUpperCase();
        if (QBY[p] && p !== L.sel) { ctx.setLocal({ sel: p }); L = ctx.local; }
      }
      const actions = ran
        ? html`<button type="button" class="btn btn-secondary" data-action="csv">${icon('download')}<span>Exportar Excel (.csv)</span></button><button type="button" class="btn btn-secondary" data-action="pdf">${icon('printer')}<span>Descargar cuestionario (PDF)</span></button>`
        : html`<button type="button" class="btn btn-primary" data-action="prepare">${icon('play')}<span>Preparar respuestas</span></button>`;
      root.innerHTML = String(html`
        ${App.pageHead({
          title: `Cuestionario técnico · ${QN.customer}`,
          meta: [
            { icon: 'mail', text: `Recibido el ${fmt.date(QN.received)} · ${QN.via}` },
            { icon: 'calendar', text: `Plazo: ${fmt.weekday(QN.due)} ${fmt.date(QN.due)}` },
            { icon: 'hash', text: QN.code }
          ],
          actions
        })}
        ${kpis(L, ran)}
        <div class="section" id="cq-run" ${ran ? '' : raw('hidden')}>${ran ? resultCard(L) : ''}</div>
        <div class="grid cols-5-7 section cq-grid">${questionsCard(L, ran)}${ran ? detailPanel(ctx, L) : emailCard()}</div>
        ${ran ? html`<div class="section">${compareCard(L)}</div>` : ''}
      `);

      if (ran) {
        const log = ctx.$('#cq-log');
        if (log) App.reasoningStream(log, streamSteps(), { title: `Agente ${AGENT} · ${QN.code}`, instant: true, start: L.run.startedAt, maxHeight: 420 });
        if (ctx.vars.editing) {
          const ta = ctx.$('#cq-en');
          if (ta) requestAnimationFrame(() => ta.focus());
        }
      }

      ctx.on('click', '[data-action="prepare"]', () => prepare(ctx));
      ctx.on('click', 'tr[data-q]', (e, el) => { if (ctx.local.run && ctx.local.ans) select(ctx, el.getAttribute('data-q')); });
      ctx.on('click', '[data-action="next"]', (e, el) => select(ctx, el.getAttribute('data-next')));
      ctx.on('segchange', '[data-seg="cq-lang"]', (e) => { ctx.setLocal({ lang: e.detail.value === 'en' ? 'en' : 'es' }); ctx.rerender(); });
      ctx.on('segchange', '[data-seg="cq-filter"]', (e) => applyFilter(ctx, e.detail.value));
      ctx.on('click', '[data-cite]', (e, el) => {
        const q = QBY[ctx.local.sel];
        const n = Number(el.getAttribute('data-cite'));
        if (q && q.cites) openSource(q, q.cites[n - 1], `Fuente [${n}] de ${q.id}`);
      });
      ctx.on('click', '[data-src]', (e, el) => {
        const q = QBY[ctx.local.sel];
        const key = el.getAttribute('data-src') || '';
        const n = Number(key.slice(1));
        if (!q) return;
        if (key.charAt(0) === 'p' && q.flag) openSource(q, q.flag.partial[n - 1], `Evidencia parcial ${n} de ${q.id}`);
        else if (q.cites) openSource(q, q.cites[n - 1], `Fuente [${n}] de ${q.id}`);
      });
      ctx.on('click', '[data-action="approve"]', () => approveOne(ctx, ctx.local.sel));
      ctx.on('click', '[data-action="approve-high"]', () => approveHigh(ctx));
      ctx.on('click', '[data-action="discard"]', () => discard(ctx, ctx.local.sel));
      ctx.on('click', '[data-action="reopen"]', () => reopen(ctx, ctx.local.sel, false));
      ctx.on('click', '[data-action="restore"]', () => reopen(ctx, ctx.local.sel, true));
      ctx.on('click', '[data-action="assign"]', () => assign(ctx, [ctx.local.sel]));
      ctx.on('click', '[data-action="assign-all"]', () => assign(ctx, FLAGGED.map((q) => q.id)));
      ctx.on('click', '[data-action="edit"]', () => { ctx.vars.editing = ctx.local.sel; ctx.rerender(); });
      ctx.on('click', '[data-action="cancel-edit"]', () => { ctx.vars.editing = null; ctx.rerender(); });
      ctx.on('click', '[data-action="save-edit"]', () => saveEdit(ctx, ctx.local.sel));
      ctx.on('click', '[data-action="email"]', () => openEmail());
      ctx.on('click', '[data-action="csv"]', () => exportCsv(ctx));
      ctx.on('click', '[data-action="pdf"]', () => openPdf(ctx));
    }
  });
})();
