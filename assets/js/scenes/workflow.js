/*
 * Escena «workflow» · De palabras a workflow (SPEC §4.2) · pieza central A.
 *
 * El Responsable de Calidad escribe su procedimiento en castellano y Prodigy lo convierte en un workflow de
 * la plataforma (una Routine del Orchestrator: frases que lo activan + agentes en orden fijo + aprobación).
 *  - La interpretación es determinista y usa las mismas reglas en español que el generador de workflows del
 *    paquete de Prodigy para CN (orden de aparición, negaciones «sin …», verbos de bloqueo). Cada disparador,
 *    paso, aprobación y parámetro sale de una frase concreta del texto, que se resalta.
 *  - Umbrales y plazos se contrastan con PNT-CAL-012, PNT-CAL-015, PNT-CAL-020 y PNT-CAL-031 (CN_DATA.procedures).
 *  - «Publicar workflow» escribe en App.state.workflows (contrato con «alarma» y «turno») y en auditoría.
 *  - Texto fuera de alcance (operaciones financieras, evaluar personas, actuar sobre el control de planta) o sin
 *    disparador ni pasos: se explica el motivo y no se crea nada.
 */
(function () {
  'use strict';

  const { html, raw, esc, icon, fmt, chip, sys } = App;
  const D = window.CN_DATA;
  const ROLE = D.roles;
  const EXC = D.excursion_c07;
  const CH = D.chamber_c07;
  const COMPLAINT = D.complaint;
  const P012 = D.procedures['PNT-CAL-012'];
  const P020 = D.procedures['PNT-CAL-020'];
  const P031 = D.procedures['PNT-CAL-031'];

  const AGENT = 'Generador de workflows';
  const AGENT_ACTOR = `Prodigy · agente ${AGENT}`;
  const SPACE = 'Calidad · Fustiñana';
  const MIN_MATCH = 0.6;      // routines.min_match_confidence de Prodigy
  const ENFORCE_MIN = 0.8;    // routines.enforce_min_confidence de Prodigy

  const numIn = (s, re, dflt) => { const m = re.exec(String(s || '')); return m ? Number(m[1]) : dflt; };
  const LIMIT = P012.limit_c;                     // −18 °C
  const CRITICAL = P012.critical_c;               // −15 °C
  const HOLD_MIN = P012.min_minutes_for_hold;     // 15 min
  const ACK_H = numIn(P020.summary, /(\d+)\s*h\b/, 24);
  const REPORT_DAYS = numIn(P020.summary, /(\d+)\s*días hábiles/, 5);
  const PCC_H = numIn(P031.summary, /cada (\d+)\s*h\b/, 2);
  const HISTORY_MONTHS = 12;
  const REPORT_TIME = '06:00';
  const METRICS = new Set(D.machines.map((m) => m.metric)).size;
  const TEST_TEMP = -14;

  /* ================================================================ Plantillas (texto de Calidad) */

  const TEMPLATES = {
    'cadena-frio': {
      label: 'Cadena de frío',
      icon: 'thermometer',
      refs: 'PNT-CAL-012 y PNT-CAL-015',
      text: `Cuando la temperatura de aire de una cámara de producto congelado de Fustiñana supere ${fmt.temp(LIMIT)} durante más de ${HOLD_MIN} minutos, localizar los palés y lotes que estaban en la cámara durante la excursión y sus expediciones planificadas. Proponer el bloqueo de calidad de esos palés en SAP QM y en Easy WMS, que debe aprobar el ${ROLE.quality_shift} antes de aplicarse. Si la temperatura supera ${fmt.temp(CRITICAL)}, tratarla como excursión crítica. Una vez aprobado el bloqueo, abrir una no conformidad en Elara con el borrador del 8D y avisar por Teams al ${ROLE.dispatch_shift} para retener las expediciones afectadas.`
    },
    reclamacion: {
      label: 'Reclamación',
      icon: 'mail',
      refs: 'PNT-CAL-020',
      text: `Cuando llegue al buzón de Calidad una reclamación de cliente por cuerpo extraño, registrarla en Elara (lote, producto, defecto y plazo de respuesta) y enviar el acuse de recibo en ${ACK_H} h. Trazar el lote hacia atrás (agricultor, recepción, línea y controles de cuerpos extraños) y hacia delante (palés y expediciones). Preparar el borrador del informe 8D según PNT-CAL-020, con las reclamaciones similares de los últimos ${HISTORY_MONTHS} meses, y la respuesta al cliente en su idioma. La respuesta la aprueba el ${ROLE.quality_plant} antes de enviarla; el informe 8D se entrega en ${REPORT_DAYS} días hábiles.`
    },
    'parte-diario': {
      label: 'Parte diario',
      icon: 'activity',
      refs: 'PNT-CAL-015 y PNT-CAL-031',
      text: `Cada día a las ${REPORT_TIME}, revisar las lecturas de los equipos de Fustiñana en Mapex y Galileo (túneles IQF, escaldadores, selectoras ópticas, compresores de amoniaco, evaporadores, envasadoras y detectores de metales) y compararlas con los umbrales de planta. Para cada equipo en aviso o crítico, abrir un ticket de mantenimiento con la acción recomendada, sin duplicar las órdenes que ya estén abiertas. Si un detector de metales (PCC) tiene la verificación vencida, proponer la retención del producto envasado desde la última verificación correcta, que debe aprobar el ${ROLE.quality_shift}. Publicar el resumen del parte en el canal de Teams de Mantenimiento.`
    }
  };
  if (window.CN_I18N && CN_I18N.english) {
    const quality = CN_I18N.text(ROLE.quality_shift);
    const plantQuality = CN_I18N.text(ROLE.quality_plant);
    const dispatch = CN_I18N.text(ROLE.dispatch_shift);
    TEMPLATES['cadena-frio'].text = `When the air temperature in a frozen-product cold room at Fustiñana exceeds ${fmt.temp(LIMIT)} for more than ${HOLD_MIN} minutes, locate the pallets and lots present during the excursion and their planned shipments. Propose a quality hold on those pallets in SAP QM and Easy WMS, which the ${quality} must approve before it is applied. If the temperature exceeds ${fmt.temp(CRITICAL)}, classify the excursion as critical. Once the hold is approved, open a non-conformity in Elara with a draft 8D report and notify the ${dispatch} via Teams to hold the affected shipments.`;
    TEMPLATES.reclamacion.text = `When a customer complaint about a foreign body arrives in the Quality inbox, register it in Elara (lot, product, defect and response deadline) and send an acknowledgement within ${ACK_H} h. Trace the lot backwards (grower, intake, line and foreign-body controls) and forwards (pallets and shipments). Prepare a draft 8D report under PNT-CAL-020, including similar complaints from the last ${HISTORY_MONTHS} months, and the customer response in their language. The ${plantQuality} must approve the customer response before it is sent; deliver the 8D report within ${REPORT_DAYS} working days.`;
    TEMPLATES['parte-diario'].text = `Every day at ${REPORT_TIME}, review the readings from Fustiñana equipment in Mapex and Galileo (IQF tunnels, blanchers, optical sorters, ammonia compressors, evaporators, packing machines and metal detectors) and compare them with plant thresholds. For each machine in warning or critical state, open a maintenance ticket with the recommended action, without duplicating existing work orders. If a metal detector (CCP) has an overdue check, propose a hold on product packed since the last successful check, which the ${quality} must approve. Publish the daily report summary in the Maintenance Teams channel.`;
  }
  const TEMPLATE_IDS = Object.keys(TEMPLATES);

  /* ================================================================ Catálogo de agentes del espacio */

  const CATALOG = {
    cold_chain_monitor: { agent: 'Monitor de cadena de frío', icon: 'thermometer', systems: ['SCADA Galileo'], what: 'Lee la serie de temperatura de la cámara, confirma la excursión y la clasifica' },
    lot_traceability: { agent: 'Trazabilidad', icon: 'git-branch', systems: ['SAP', 'MES Mapex', 'Mecalux Easy WMS'], what: 'Localiza palés, lotes y expediciones, hacia atrás y hacia delante' },
    quality_hold: { agent: 'Bloqueo de calidad', icon: 'lock', systems: ['SAP QM', 'Mecalux Easy WMS'], hitl: true, what: 'Propone el bloqueo o la retención y solo lo aplica tras la aprobación' },
    quality_incident: { agent: 'Incidencias', icon: 'clipboard', systems: ['Elara', 'Microsoft Teams'], what: 'Abre la no conformidad con el borrador del 8D y envía los avisos' },
    complaint_intake: { agent: 'Entrada de reclamaciones', icon: 'mail', systems: ['Outlook', 'Elara'], what: 'Registra la reclamación y extrae lote, producto, defecto y plazo' },
    notifier: { agent: 'Respuesta al cliente', icon: 'send', systems: ['Outlook'], hitl: true, what: 'Redacta la respuesta en el idioma del cliente y la envía tras aprobarla' },
    cn_plant_monitor: { agent: 'Parte diario de planta', icon: 'activity', systems: ['MES Mapex', 'SCADA Galileo', 'GMAO'], what: 'Compara las lecturas con los umbrales de planta y abre tickets sin duplicar órdenes' },
    campaign_planner: { agent: 'Plan de campaña', icon: 'calendar', systems: ['Siemens Opcenter APS', 'SAP'], what: 'Compara la recepción de campo prevista con la capacidad de los túneles' }
  };
  const CATALOG_N = Object.keys(CATALOG).length;

  /* Nombre, verbo y token de slug de cada agente (workflows que no son de las tres plantillas). */
  const STEP_WORDS = {
    cold_chain_monitor: ['Rotura de cadena de frío', 'revisar la cámara', 'cadena-frio'],
    lot_traceability: ['Trazabilidad de lotes', 'trazar lotes', 'traza'],
    quality_hold: ['Bloqueo de calidad', 'bloquear', 'bloqueo'],
    quality_incident: ['Incidencia de calidad', 'abrir incidencia', 'incidencia'],
    complaint_intake: ['Reclamación de cliente', 'registrar la reclamación', 'reclamacion'],
    notifier: ['Respuesta al cliente', 'responder al cliente', 'respuesta'],
    cn_plant_monitor: ['Parte diario de planta', 'hacer el parte de planta', 'parte-planta'],
    campaign_planner: ['Campaña de recepción de campo', 'planificar la campaña', 'campana']
  };

  const DOMAINS = {
    'cadena-frio': { first: 'cold_chain_monitor', slug: 'wf-cadena-frio-camaras', name: 'Excursión de temperatura en cámara', approver: 'quality_shift', policy: 'PNT-CAL-015', go: 'alarma', goLabel: `Probarlo con la alarma de ${CH.code}` },
    reclamacion: { first: 'complaint_intake', slug: 'wf-reclamacion-cliente', name: 'Reclamación de cliente', approver: 'quality_plant', policy: 'PNT-CAL-020', go: 'reclamacion', goLabel: `Probarlo con la reclamación ${COMPLAINT.code}` },
    'parte-diario': { first: 'cn_plant_monitor', slug: 'wf-parte-diario-planta', name: 'Parte diario de equipos · Fustiñana', approver: 'quality_shift', policy: 'PNT-CAL-015', go: 'turno', goLabel: 'Ver el parte diario del turno' }
  };
  const DOMAIN_BY_FIRST = { cold_chain_monitor: 'cadena-frio', complaint_intake: 'reclamacion', cn_plant_monitor: 'parte-diario' };

  /* ================================================================ Reglas en español (sobre texto plegado) */

  // Negación en los 25 caracteres anteriores: «sin bloquear», «no abras…». «no conformidad» es un sustantivo.
  const NEG_BEFORE = /\b(?:without|never|not|do not|sin|nunca|tampoco|ni|no)\s+(?!conformidad)(?:\w+\s+){0,2}$/;
  // «bloquea el lote»: el lote es el objeto del bloqueo, no una petición de trazar.
  const HOLD_BEFORE = /\b(?:block\w*|hold|quarantin\w*|bloque\w*|reten\w*|retien\w*|inmoviliz\w*)\s+(?:\w+\s+){0,2}$/;

  const STEP_RULES = [
    ['cold_chain_monitor', [[/cadena de frio/], [/\bcamaras?\b/], [/\btemperaturas?\b/], [/\bgrados\b/], [/\bexcursion(?:es)?\b/], [/\brotura de(?:l)? frio\b/], [/\b(?:pierd|perd)\w*\s+(?:el\s+|de\s+)?frio\b/]]],
    ['complaint_intake', [[/\breclam\w*/], [/\bquej\w*/], [/\bcomplaint\b/], [/\bcuerpo extrano\b/]]],
    ['cn_plant_monitor', [[/\bparte diario\b/], [/\blecturas de (?:los |las )?(?:equipos|maquinas)\b/], [/\btunel(?:es)? iqf\b/], [/\bescaldador\w*/], [/\bcompresor\w*/], [/\bdetector(?:es)? de metales\b/], [/\btickets? de mantenimiento\b/]]],
    ['campaign_planner', [[/\bcampana\b/], [/\brecepcion de campo\b/], [/\bcosecha\w*/], [/\bparcelas?\b/]]],
    ['lot_traceability', [[/\btrazab\w*/], [/\btraz(?:a|ar|alo|ala|alos|alas|ado|ados|ada|adas)\b/], [/\blotes?\b/, HOLD_BEFORE], [/\b(?:localiz|identific)\w*\s+(?:los\s+|las\s+)?(?:pales|lotes|expediciones)\b/], [/\bhacia (?:atras|delante)\b/], [/\bde donde viene\b/]]],
    ['quality_hold', [[/\bbloque\w*/], [/\breten\w*/], [/\bretien\w*/], [/\bcuarentena\b/], [/\binmoviliz\w*/]]],
    ['quality_incident', [[/\bincidencias?\b/], [/\bno conformidad(?:es)?\b/], [/\b8d\b/], [/\binforme\b/], [/\bavis(?:ar|e|a|en)\b/], [/\bnotific(?:ar|a|e|en)\b/], [/\bpublic\w* el resumen\b/]]],
    ['notifier', [[/\brespuesta al cliente\b/], [/\bresponder al cliente\b/], [/\bcontestar al cliente\b/]]]
  ];
  // Frases de acción que se resaltan para cada paso (fuera de la frase del disparador).
  const STRONG = {
    cold_chain_monitor: [/\bconfirm\w*/, /\bclasific\w*/, /\bmedir\b/, /\bvigil\w*/],
    complaint_intake: [/\bregistr\w*/, /\bextraer\b/, /\bdar de alta\b/],
    cn_plant_monitor: [/\brevis(?:ar|a|e)\b/, /\blecturas\b/, /\btickets? de mantenimiento\b/],
    campaign_planner: [/\bplanific\w*/],
    lot_traceability: [/\btraz(?:a|ar|alo|ala|alos|alas)\b/, /\btrazab\w*/, /\blocaliz\w*/, /\bidentific\w*/],
    quality_hold: [/\bbloque\w*/, /\breten\w*/, /\bretien\w*/, /\binmoviliz\w*/, /\bcuarentena\b/],
    quality_incident: [/\bno conformidad\b/, /\b8d\b/, /\bincidencias?\b/, /\bpublic\w* el resumen\b/, /\bavis(?:ar|e|a|en)\b/],
    notifier: [/\brespuesta al cliente\b/, /\bresponder al cliente\b/, /\bcontestar al cliente\b/]
  };
  // English rules are additive: saved Spanish workflows remain usable in either language.
  const EN_STEPS = {
    cold_chain_monitor: /\bcold (?:chain|rooms?)\b|\btemperatures?\b|\bexcursions?\b/,
    complaint_intake: /\bcomplaints?\b|\bforeign[- ]bod(?:y|ies)\b/,
    cn_plant_monitor: /\bdaily report\b|\bequipment\b|\biqf tunnels?\b|\bmetal detectors?\b|\bmaintenance tickets?\b/,
    campaign_planner: /\bcampaign\b|\bharvest\b|\bfield intake\b/,
    lot_traceability: /\btrace(?:ability)?\b|\blocate\b|\bbackwards?\b|\bforwards?\b/,
    quality_hold: /\b(?:quality hold|hold on|hold the|block(?:ing)?|quarantine)\b/,
    quality_incident: /\bnon[- ]conformit(?:y|ies)\b|\b8d\b|\bnotify\b|\bpublish\b/,
    notifier: /\bcustomer response\b|\brespond to the customer\b|\breply to the customer\b/
  };
  STEP_RULES.forEach(([id,rules])=>rules.push([EN_STEPS[id]]));
  const EN_STRONG = {
    cold_chain_monitor: /\bconfirm\b|\bclassify\b|\bmonitor\b/,
    complaint_intake: /\bregister\b|\bextract\b/,
    cn_plant_monitor: /\breview\b|\breadings\b|\bmaintenance ticket\b/,
    campaign_planner: /\bplan\b/,
    lot_traceability: /\btrace\b|\blocate\b|\bidentify\b/,
    quality_hold: /\bquality hold\b|\bhold on\b|\bblock\b|\bquarantine\b/,
    quality_incident: /\bnon[- ]conformity\b|\b8d\b|\bnotify\b|\bpublish\b/,
    notifier: /\bcustomer response\b|\brespond to the customer\b/
  };
  Object.entries(EN_STRONG).forEach(([id,re])=>STRONG[id].push(re));
  const MULTI = { cn_plant_monitor: 2 };

  const OUT_OF_SCOPE = [
    {
      id: 'finanzas',
      re: /\b(?:compr(?:a|ar|e|en|as)|vend(?:e|er|a|an)|invert(?:ir)?|inviert(?:e|a|an))\b[^.;]{0,50}\b(?:acciones (?:de|en)\b|bolsa|bitcoins?|criptomonedas?|divisas|fondos de inversion)|\btransferencias? bancarias?\b|\btransferir dinero\b/,
      title: 'Operación financiera',
      body: `El texto pide comprar o vender acciones o mover dinero. Ningún agente del espacio ${SPACE} opera en mercados ni hace pagos, y Prodigy no crea pasos que no correspondan a un agente habilitado.`
    },
    {
      id: 'personas',
      re: /\b(?:evalu\w*|puntu\w*|vigil\w*|control\w*|medir|mida|sancion\w*|despid\w*|rank\w*)\b[^.;]{0,40}\b(?:trabajador\w*|operari\w*|emplead\w*|plantilla|personal|personas)\b/,
      title: 'Evaluación de personas',
      body: 'El texto pide evaluar, vigilar o puntuar a personas. Los workflows de este espacio trabajan sobre equipos, lotes, palés y documentos de calidad; no valoran el desempeño de nadie.'
    },
    {
      id: 'control',
      re: /\b(?:cambi\w*|modific\w*|ajust\w*|baj(?:ar|e|a)|sub(?:ir|e|a))\b[^.;]{0,30}\b(?:consignas?|setpoints?)\b|\b(?:parar|pare|paren|arrancar|arranque|apagar|apague|encender|encienda)\b[^.;]{0,25}\b(?:compresor\w*|evaporador\w*|tunel\w*|ventilador\w*|escaldador\w*)\b/,
      title: 'Actuación sobre el control de planta',
      body: 'El texto pide cambiar consignas o arrancar y parar equipos. Prodigy lee Galileo/SCADA y Mapex, pero no escribe en el control de planta: esos cambios los hace el personal de planta desde su sistema.'
    }
  ];
  const EN_SCOPE = [
    /\b(?:buy|sell|trade|invest)\b[^.;]{0,60}\b(?:stocks?|shares?|bitcoin|crypto|currencies)\b|\b(?:bank transfer|transfer money)\b/,
    /\b(?:evaluate|score|rank|monitor|dismiss|fire)\b[^.;]{0,45}\b(?:workers?|employees?|staff|people|operators?)\b/,
    /\b(?:change|adjust|lower|raise)\b[^.;]{0,35}\bsetpoints?\b|\b(?:start|stop|turn off|switch off)\b[^.;]{0,30}\b(?:compressors?|evaporators?|tunnels?|fans?|blanchers?)\b/
  ];
  OUT_OF_SCOPE.forEach((rule,i)=>{rule.re=new RegExp(rule.re.source+'|'+EN_SCOPE[i].source);});
  const NOT_BUILT = {
    'sin-disparador': { title: 'Falta el disparador', body: 'Reconozco pasos, pero no cuándo debe activarse el workflow. Indica el disparador, por ejemplo «Cuando la temperatura de una cámara supere…» o «Cada día a las 06:00…».' },
    'sin-pasos': { title: 'Sin pasos reconocibles', body: `Entiendo cuándo debe activarse, pero ningún paso corresponde a un agente del espacio ${SPACE}.` },
    'no-reconocido': { title: 'No es un procedimiento', body: 'No encuentro un disparador ni pasos que pueda hacer un agente del espacio.' }
  };

  const ROLE_PATTERNS = [
    ['quality_shift', /\bresponsable de calidad de turno\b|\bcalidad de turno\b/],
    ['quality_plant', /\bresponsable de calidad de planta\b|\bcalidad de planta\b/],
    ['dispatch_shift', /\bjefe de turno de expedicion\b|\bjefe de expedicion\b/],
    ['refrigeration_maintenance', /\bmantenimiento frigorifico\b/],
    ['line_maintenance', /\bmantenimiento de linea\b/],
    ['campaign_manager', /\bjefe de campana\b/]
  ];
  const EN_ROLES = {
    quality_shift: /\bshift quality (?:manager|lead)\b/,
    quality_plant: /\bplant quality (?:manager|lead)\b/,
    dispatch_shift: /\bdispatch shift (?:manager|lead)\b/,
    refrigeration_maintenance: /\brefrigeration maintenance\b/,
    line_maintenance: /\bline maintenance\b/,
    campaign_manager: /\bcampaign manager\b/
  };
  ROLE_PATTERNS.forEach(row=>{row[1]=new RegExp(row[1].source+'|'+EN_ROLES[row[0]].source);});
  const QUALITY_ROLES = ['quality_shift', 'quality_plant'];

  /* Prueba de activación: grupos de palabras por plantilla (mismo reparto que las frases del workflow). */
  const MATCH_GROUPS = {
    'cadena-frio': [
      { re: /\bcamaras?\b|\bc-\d{2}\b|\bsilos?\b/, w: 0.3, label: 'cámara' },
      { re: /\btemperatura\w*|\bgrados\b|\d\s*c\b|\bfrio\b/, w: 0.3, label: 'temperatura' },
      { re: /\balarma\w*|\bexcursion\w*|\bsupera\w*|\bmarca\b|\bpierd\w*|\bsube\b|\bsubido\b/, w: 0.25, label: 'alarma' },
      { re: /\bfustinana\b/, w: 0.07, label: 'Fustiñana' }
    ],
    reclamacion: [
      { re: /\breclam\w*|\bquej\w*|\bcomplaint\b/, w: 0.35, label: 'reclamación' },
      { re: /\bclientes?\b|\bcustomer\b|\bretailer\b/, w: 0.2, label: 'cliente' },
      { re: /\bforeign[- ]bod|\bcuerpos? extran\w*|\bpiedras?\b|\bstone\b|\bmetal\w*|\bplastico\w*|\bdefecto\w*/, w: 0.25, label: 'defecto' },
      { re: /\blotes?\b|\bl\d{2}-\d{3}/, w: 0.12, label: 'lote' }
    ],
    'parte-diario': [
      { re: /\bparte\b/, w: 0.35, label: 'parte' },
      { re: /\bequipos?\b|\bplanta\b|\bmaquinas?\b|\blineas?\b/, w: 0.3, label: 'equipos' },
      { re: /\bdiario\b|\bhoy\b|\bturno\b/, w: 0.15, label: 'diario' },
      { re: /\bfustinana\b/, w: 0.1, label: 'Fustiñana' }
    ]
  };

  const EN_MATCH = {
    'cadena-frio': [/\bcold rooms?\b/, /\btemperature\b|\bcold\b|\bdegrees\b/, /\balarm\b|\bexcursion\b|\bexceeds?\b|\breads?\b|\brising\b|\brises?\b|\brose\b/, /\bfustinana\b/],
    reclamacion: [/\bcomplaints?\b/, /\bcustomer\b/, /\bforeign[- ]bod(?:y|ies)\b|\bstone\b|\bplastic\b|\bdefect\b/, /\blots?\b|\bbatch\b/],
    'parte-diario': [/\breport\b/, /\bequipment\b|\bplant\b|\bmachines?\b/, /\bdaily\b|\btoday\b|\bshift\b/, /\bfustinana\b/]
  };
  Object.entries(EN_MATCH).forEach(([id,list])=>MATCH_GROUPS[id].forEach((g,i)=>{g.re=new RegExp(g.re.source+'|'+list[i].source);}));
  /* ================================================================ Texto: plegado, cláusulas y frases */

  const DASHES = /[‐-―−]/;
  /** Minúsculas y sin tildes, con UN carácter de salida por cada carácter de entrada (las posiciones valen para el original). */
  function fold(s) {
    const t = String(s == null ? '' : s);
    let out = '';
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      const code = t.charCodeAt(i);
      if (DASHES.test(ch)) { out += '-'; continue; }
      if (ch === '°' || ch === 'º' || /\s/.test(ch)) { out += ' '; continue; }
      if (code >= 0xd800 && code <= 0xdfff) { out += ' '; continue; }
      const base = ch.normalize('NFD')[0] || ch;
      const low = base.toLowerCase();
      out += low.length ? low[0] : ch;
    }
    return out;
  }
  const isDigit = (c) => c >= '0' && c <= '9';
  /** Separadores de cláusula: . ; : ! ? salto de línea y comas (no dentro de paréntesis ni entre cifras). */
  function boundaries(src) {
    const b = new Uint8Array(src.length);
    let depth = 0;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (c === '(') { depth += 1; continue; }
      if (c === ')') { depth = Math.max(0, depth - 1); continue; }
      const between = isDigit(src[i - 1] || '') && isDigit(src[i + 1] || '');
      if (c === '\n' || c === ';' || c === '!' || c === '?') b[i] = 1;
      else if ((c === '.' || c === ':') && !between) b[i] = 1;
      else if (c === ',' && depth === 0 && !between) b[i] = 1;
    }
    return b;
  }
  function sentenceBounds(src) {
    const b = new Uint8Array(src.length);
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      const between = isDigit(src[i - 1] || '') && isDigit(src[i + 1] || '');
      if (c === '\n' || c === ';' || c === '!' || c === '?' || (c === '.' && !between)) b[i] = 1;
    }
    return b;
  }
  function spanAt(src, b, pos) {
    let s = pos;
    while (s > 0 && !b[s - 1]) s -= 1;
    let e = pos;
    while (e < src.length && !b[e]) e += 1;
    while (s < e && /\s/.test(src[s])) s += 1;
    const bullet = /^[-–•*]\s+/.exec(src.slice(s, e));
    if (bullet) s += bullet[0].length;
    const conj = /^(?:y|e|o|u|luego|después|despues)\s+(?=\S)/i.exec(src.slice(s, e));
    if (conj && e - s - conj[0].length > 12) s += conj[0].length;
    while (e > s && /\s/.test(src[e - 1])) e -= 1;
    return { start: s, end: e };
  }
  function clip(s, n) {
    const t = String(s || '').replace(/\s+/g, ' ').trim();
    return t.length <= n ? t : `${t.slice(0, Math.max(1, n - 1)).replace(/[\s,;:.]+$/, '')}…`;
  }
  const lowerFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  const upperFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  function wordCount(s) { const t = String(s || '').trim(); return t ? t.split(/\s+/).length : 0; }
  function sentenceCount(s) { return String(s || '').split(/[.;!?]+(?:\s|$)|\n+/).map((x) => x.trim()).filter((x) => x.length > 2).length; }
  const pad2 = (n) => String(n).padStart(2, '0');

  function firstMatch(re, f, from, to, test) {
    const g = new RegExp(re.source, 'g');
    g.lastIndex = from || 0;
    let m;
    while ((m = g.exec(f)) && (to == null || m.index < to)) {
      if (!test || test(m.index, m)) return m;
      if (m[0].length === 0) g.lastIndex += 1;
    }
    return null;
  }
  const negatedAt = (f, pos) => NEG_BEFORE.test(f.slice(Math.max(0, pos - 25), pos));

  /* ================================================================ Interpretación del texto */

  function findSteps(f) {
    const hits = [];
    STEP_RULES.forEach(([name, rules], order) => {
      let first = null;
      rules.forEach(([re, exclude]) => {
        const m = firstMatch(re, f, 0, null, (pos) => !negatedAt(f, pos) && !(exclude && exclude.test(f.slice(Math.max(0, pos - 25), pos))));
        if (m && (!first || m.index < first.pos)) first = { name, pos: m.index, end: m.index + m[0].length, order };
      });
      if (first) hits.push(first);
    });
    return hits.sort((a, z) => a.pos - z.pos || a.order - z.order);
  }

  const TRIGGER_WORDS = /\b(?:when|whenever|on receipt of|cuando|cada vez que|siempre que|en cuanto|ante (?:un|una|el|la|cualquier))\s/;
  const SCHEDULE_WORDS = /\b(?:every day|daily|every morning|every night|every shift|every week|every hour|every monday|cada dia|todos los dias|diariamente|cada manana|cada noche|cada turno|cada semana|cada hora|cada lunes)\b/;
  function findTrigger(src, f, b) {
    let m = TRIGGER_WORDS.exec(f);
    let type = 'evento';
    const s = SCHEDULE_WORDS.exec(f);
    if (s && (!m || s.index < m.index)) { m = s; type = 'programado'; }
    let start;
    if (m) start = m.index;
    else {
      const si = /(?:^|[.;:\n])\s*si\s/.exec(f);
      if (!si) return null;
      start = si.index + si[0].length - 3;
    }
    let end = start;
    while (end < src.length && !b[end]) end += 1;
    while (end > start && /\s/.test(src[end - 1])) end -= 1;
    if (end - start < 8) return null;
    const out = { start, end, text: src.slice(start, end), type };
    if (type === 'programado') {
      const seg = f.slice(start, end);
      const t = /\b(\d{1,2})[:.h](\d{2})\b/.exec(seg);
      const h = t ? null : /\ba las (\d{1,2})\b/.exec(seg);
      if (t && +t[1] < 24 && +t[2] < 60) out.time = `${pad2(t[1])}:${t[2]}`;
      else if (h && +h[1] < 24) out.time = `${pad2(h[1])}:00`;
    }
    return out;
  }

  function stepSpans(src, f, b, cap, hit, trig) {
    const inTrig = (pos) => !!trig && pos >= trig.start && pos < trig.end;
    const found = [];
    (STRONG[cap] || []).forEach((re) => {
      const g = new RegExp(re.source, 'g');
      let m;
      while ((m = g.exec(f))) {
        if (!inTrig(m.index) && !negatedAt(f, m.index)) found.push(m.index);
      }
    });
    found.sort((a, z) => a - z);
    const max = MULTI[cap] || 1;
    const out = [];
    const seen = new Set();
    for (const pos of found) {
      const c = spanAt(src, b, pos);
      const key = `${c.start}:${c.end}`;
      if (seen.has(key) || (trig && c.start < trig.end && c.end > trig.start)) continue;
      seen.add(key);
      out.push(c);
      if (out.length >= max) break;
    }
    if (!out.length) out.push(inTrig(hit.pos) ? { start: trig.start, end: trig.end, shared: true } : spanAt(src, b, hit.pos));
    return out;
  }

  const TEMP_RE = /(-\s?|menos\s)?(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:grados(?:\s+centigrados)?|c)\b(\s+bajo\s+cero)?/;
  function tempsIn(f, from, to) {
    const out = [];
    const g = new RegExp(TEMP_RE.source, 'g');
    g.lastIndex = from;
    let m;
    while ((m = g.exec(f)) && m.index < to) {
      let v = parseFloat(m[2].replace(',', '.'));
      if (m[1] || m[3]) v = -v;
      out.push({ value: v, start: m.index, end: m.index + m[0].length });
    }
    return out;
  }
  function minutesIn(f, from, to) {
    const seg = f.slice(from, to);
    let m = /(\d{1,3})\s*(?:minutes?|minutos|mins?)\b/.exec(seg);
    if (m) return Number(m[1]);
    m = /(\d{1,2})\s*(?:hours?|horas?|h)\b/.exec(seg);
    if (m) return Number(m[1]) * 60;
    if (/\bmedia hora\b/.test(seg)) return 30;
    if (/\bcuarto de hora\b/.test(seg)) return 15;
    return null;
  }
  function roleIn(f, from, to) {
    let best = null;
    ROLE_PATTERNS.forEach(([key, re]) => {
      const m = firstMatch(re, f, from, to);
      if (m && (!best || m.index < best.start)) best = { key, start: m.index, end: m.index + m[0].length };
    });
    return best;
  }

  const APPROVE_RE = /\b(?:approv\w*|authoris\w*|authoriz\w*|aprob\w*|aprueb\w*|autoriz\w*|valid(?:a|e|ar|ado|ada)\b)/;
  function findApproval(src, f, b) {
    const g = new RegExp(APPROVE_RE.source, 'g');
    let m;
    let neg = null;
    while ((m = g.exec(f))) {
      const pos = m.index;
      const before = f.slice(Math.max(0, pos - 32), pos);
      if (/\b(?:once|after|una vez|tras|despues de)\s+$/.test(before)) continue;
      if (/\b(?:without|never|not|sin|nunca|ni|no(?!\s+conformidad))\s+(?:\w+\s+){0,3}$/.test(before)) { if (!neg) neg = { pos, span: spanAt(src, b, pos) }; continue; }
      return { pos, span: spanAt(src, b, pos), negated: neg };
    }
    return neg ? { pos: neg.pos, span: neg.span, negatedOnly: true, negated: neg } : null;
  }

  /** Interpretación pura del texto: sin parámetros editados. Devuelve {ok:false, category} o el borrador base. */
  function interpretRaw(text) {
    const src = String(text || '');
    const f = fold(src);
    if (wordCount(src) < 3) return { ok: false, category: 'no-reconocido', text: src };
    for (const o of OUT_OF_SCOPE) {
      const m = o.re.exec(f);
      if (m) return { ok: false, category: o.id, text: src, span: { start: m.index, end: m.index + m[0].length } };
    }
    const b = boundaries(src);
    const sb = sentenceBounds(src);
    const trig = findTrigger(src, f, b);
    const hits = findSteps(f);
    if (!hits.length) return { ok: false, category: trig ? 'sin-pasos' : 'no-reconocido', text: src, trigger: trig };
    if (!trig) return { ok: false, category: 'sin-disparador', text: src, steps: hits.map((h) => h.name) };

    const names = hits.map((h) => h.name);
    let domain = DOMAIN_BY_FIRST[names[0]];
    if (!domain) domain = names.includes('cold_chain_monitor') ? 'cadena-frio' : names.includes('complaint_intake') ? 'reclamacion' : names.includes('cn_plant_monitor') ? 'parte-diario' : 'generico';
    const steps = hits.map((h) => ({ cap: h.name, pos: h.pos, spans: stepSpans(src, f, b, h.name, h, trig) }));
    const approval = findApproval(src, f, b);

    const values = {};
    const sources = {};
    const spans = {};
    const notes = [];
    const setV = (k, v, source, span) => { values[k] = v; sources[k] = source; if (span) spans[k] = span; };
    const dom = DOMAINS[domain];

    // Aprobador: el rol nombrado en la frase de aprobación (o justo después); si no, el de la política.
    let approverKey = null;
    let approverSource = 'politica';
    if (approval && !approval.negatedOnly) {
      const r = roleIn(f, approval.span.start, approval.span.end) || roleIn(f, approval.pos, Math.min(f.length, approval.pos + 120));
      if (r) { approverKey = r.key; approverSource = 'texto'; } else if (/\bresponsable de calidad\b/.test(f.slice(approval.span.start, approval.span.end))) { approverSource = 'texto'; }
    }
    const hasHitl = steps.some((s) => CATALOG[s.cap].hitl);
    const defaultApprover = dom ? dom.approver : 'quality_shift';
    if (!approverKey) approverKey = defaultApprover;
    if (steps.some((s) => s.cap === 'quality_hold') && !QUALITY_ROLES.includes(approverKey)) {
      notes.push({ id: 'aprobador', from: approverKey });
      approverKey = 'quality_shift';
      approverSource = 'politica';
    }
    setV('approver', approverKey, approverSource, approval && !approval.negatedOnly ? approval.span : null);

    if (domain === 'cadena-frio') {
      const T = tempsIn(f, trig.start, trig.end);
      const th = T[0];
      if (th && th.value >= -30 && th.value <= -5) setV('threshold', th.value, 'texto');
      else { setV('threshold', LIMIT, 'procedimiento'); if (th) notes.push({ id: 'umbral-invalido', value: th.value }); }
      const mins = minutesIn(f, trig.start, trig.end);
      if (mins != null && mins >= 1 && mins <= 240) setV('minutes', mins, 'texto'); else setV('minutes', HOLD_MIN, 'procedimiento');
      let crit = null;
      const cg = /\bcritic\w*/g;
      let cm;
      while (!crit && (cm = cg.exec(f))) {
        const sp = spanAt(src, sb, cm.index);
        const t = tempsIn(f, sp.start, sp.end).find((x) => x.value > values.threshold && x.value <= 0);
        if (t) crit = { value: t.value, span: sp };
      }
      if (crit) setV('critical', crit.value, 'texto', crit.span); else setV('critical', Math.max(CRITICAL, values.threshold + 1), 'procedimiento');
      const inc = steps.find((s) => s.cap === 'quality_incident');
      let notify = null;
      if (inc) inc.spans.forEach((sp) => { const r = roleIn(f, sp.start, sp.end); if (!notify && r && r.key !== approverKey) notify = r.key; });
      setV('notify', notify || 'dispatch_shift', notify ? 'texto' : 'politica');
      const chanSeg = inc ? f.slice(inc.spans[0].start, inc.spans[0].end) : '';
      setV('channel', /\b(?:correo|email|outlook)\b/.test(chanSeg) && !/\bteams\b/.test(chanSeg) ? 'Outlook' : 'Microsoft Teams', /\bteams\b|\bcorreo\b|\bemail\b|\boutlook\b/.test(chanSeg) ? 'texto' : 'politica');
      const scoped = /\b(c-\d{2})\b/.exec(f.slice(trig.start, trig.end));
      values.scope = scoped ? `Cámara ${scoped[1].toUpperCase()}` : 'Cámaras de producto congelado de Fustiñana';
      values.scopeOne = scoped ? `la cámara ${scoped[1].toUpperCase()}` : 'una cámara de producto congelado de Fustiñana';
    } else if (domain === 'reclamacion') {
      const ack = /\b(?:acknowledg(?:e)?ment|acuse de recibo)\b[^.;]{0,40}?(\d{1,3})\s*(?:h|horas)\b/.exec(f);
      if (ack) setV('ack', Number(ack[1]), 'texto'); else setV('ack', ACK_H, 'procedimiento');
      const days = /(\d{1,2})\s*(?:working days|business days|dias habiles)\b/.exec(f);
      if (days) setV('days', Number(days[1]), 'texto', spanAt(src, b, days.index)); else setV('days', REPORT_DAYS, 'procedimiento');
      const months = /(\d{1,2})\s*(?:months|meses)\b/.exec(f);
      if (months) setV('months', Number(months[1]), 'texto', spanAt(src, b, months.index)); else setV('months', HISTORY_MONTHS, 'politica');
      values.defect = /\bforeign[- ]bod|\bcuerpos? extran/.test(f.slice(trig.start, trig.end)) ? 'cuerpo extraño' : null;
    } else if (domain === 'parte-diario') {
      if (trig.time) setV('time', trig.time, 'texto'); else setV('time', REPORT_TIME, 'politica');
      const nd = /\b(?:without duplicating|avoid duplicates|sin duplicar)\b/.exec(f);
      values.noDuplicate = !!nd;
      if (nd) spans.noDuplicate = spanAt(src, b, nd.index);
      const chan = /\bcanal de teams(?: de)?\s+([a-z]+)/.exec(f);
      values.channel = chan ? (chan[1] === 'mantenimiento' ? 'Mantenimiento · Fustiñana' : upperFirst(chan[1])) : 'Mantenimiento · Fustiñana';
    }

    return {
      ok: true, text: src, domain, trigger: trig, steps, approval, hasHitl, values, sources, spans, notes,
      approvalNegated: !!(approval && approval.negated), approvalMissing: !approval || !!approval.negatedOnly
    };
  }
  const cacheRaw = new Map();
  function interpret(text) {
    const k = String(text || '');
    if (!cacheRaw.has(k)) {
      if (cacheRaw.size > 24) cacheRaw.clear();
      cacheRaw.set(k, interpretRaw(k));
    }
    return cacheRaw.get(k);
  }

  /* ================================================================ Modelo del workflow (interpretación + parámetros) */

  const roleLabel = (k) => ROLE[k] || k;
  function stepContext(cap, domain, p) {
    const c = {};
    if (domain === 'cadena-frio') {
      if (cap === 'cold_chain_monitor') Object.assign(c, { sub: `Crítica > ${fmt.temp(p.critical)}`, what: `Lee la serie de temperatura de aire, confirma la excursión y la clasifica (crítica por encima de ${fmt.temp(p.critical)})` });
      if (cap === 'lot_traceability') Object.assign(c, { sub: 'Lotes y expediciones', what: 'Palés y lotes que estaban en la cámara durante la excursión y sus expediciones planificadas' });
      if (cap === 'quality_hold') Object.assign(c, { sub: 'Tras aprobar', what: 'Propone el bloqueo de calidad de los palés expuestos; se aplica en SAP QM y Easy WMS solo tras la aprobación', outputs: [{ icon: 'lock', text: 'Bloqueo de calidad en SAP QM y palés inmovilizados en Easy WMS, tras aprobar' }] });
      if (cap === 'quality_incident') {
        const via = p.channel === 'Outlook' ? 'correo' : 'Teams';
        Object.assign(c, { sub: `NC, 8D y aviso${via === 'correo' ? ' por correo' : ''}`, systems: ['Elara', p.channel], what: `Abre la no conformidad en Elara con el borrador del 8D y avisa al ${roleLabel(p.notify)} para retener las expediciones afectadas`, outputs: [{ icon: 'clipboard', text: 'No conformidad en Elara con el borrador del 8D' }, { icon: p.channel === 'Outlook' ? 'mail' : 'message-square', text: `Aviso por ${p.channel === 'Outlook' ? 'correo' : 'Teams'} al ${roleLabel(p.notify)}` }] });
      }
    } else if (domain === 'reclamacion') {
      if (cap === 'complaint_intake') Object.assign(c, { sub: `Acuse en ${p.ack} h`, what: `Registra la reclamación en Elara, extrae lote, producto, defecto y plazo, y envía el acuse de recibo en ${p.ack} h`, outputs: [{ icon: 'clipboard', text: 'Reclamación registrada en Elara con sus datos extraídos' }] });
      if (cap === 'lot_traceability') Object.assign(c, { sub: 'Traza completa', what: 'Traza el lote: agricultor, recepción, línea y controles de cuerpos extraños; palés, SSCC y expediciones', outputs: [{ icon: 'git-branch', text: 'Traza del lote con palés y SSCC' }] });
      if (cap === 'quality_incident') Object.assign(c, { sub: `8D en ${p.days} días`, systems: ['Elara', 'Procedimientos'], what: `Prepara el borrador del informe 8D (PNT-CAL-020) con las reclamaciones similares de los últimos ${p.months} meses`, outputs: [{ icon: 'file-text', text: `Borrador del informe 8D (PNT-CAL-020), a entregar en ${p.days} días hábiles` }] });
      if (cap === 'notifier') Object.assign(c, { sub: 'Tras aprobar', what: 'Redacta la respuesta en el idioma del cliente; se envía por Outlook solo después de aprobarla', outputs: [{ icon: 'send', text: 'Respuesta al cliente, enviada tras la aprobación' }] });
    } else if (domain === 'parte-diario') {
      if (cap === 'cn_plant_monitor') Object.assign(c, { sub: `${D.machines.length} equipos`, what: `Lee ${D.machines.length} equipos en Mapex y Galileo, los compara con ${METRICS} indicadores de planta y abre tickets en la GMAO sin duplicar órdenes abiertas`, outputs: [{ icon: 'ticket', text: 'Tickets de mantenimiento en la GMAO, sin duplicar órdenes abiertas' }] });
      if (cap === 'quality_hold') Object.assign(c, { sub: 'Si falla un PCC', what: `Si un detector de metales (PCC) supera ${PCC_H} h sin verificar, propone retener el producto envasado desde la última verificación correcta (PNT-CAL-031)`, outputs: [{ icon: 'lock', text: 'Retención del producto envasado si falla un PCC, tras aprobar' }] });
      if (cap === 'quality_incident') Object.assign(c, { sub: 'Resumen en Teams', systems: ['Microsoft Teams'], what: `Publica el resumen del parte en el canal «${p.channel}»`, outputs: [{ icon: 'message-square', text: `Resumen en el canal de Teams «${p.channel}»` }] });
    }
    return c;
  }

  function paramFields(domain, p, src) {
    const F = [];
    const S = (k) => src[k] || 'procedimiento';
    if (domain === 'cadena-frio') {
      F.push({ key: 'threshold', label: 'Umbral de aire', name: 'Umbral de aire', type: 'number', unit: '°C', min: -25, max: -10, step: 0.5, value: p.threshold, src: S('threshold'), ref: 'PNT-CAL-012', hint: `PNT-CAL-012: ${fmt.temp(LIMIT)}`, fmtv: (v) => fmt.temp(v) });
      F.push({ key: 'minutes', label: 'Durante más de', name: 'Tiempo por encima del umbral', type: 'number', unit: 'min', min: 1, max: 120, step: 1, value: p.minutes, src: S('minutes'), ref: 'PNT-CAL-012', hint: `PNT-CAL-012: ${HOLD_MIN} min`, fmtv: (v) => `${fmt.num(v)} min` });
      F.push({ key: 'critical', label: 'Excursión crítica', name: 'Excursión crítica', type: 'number', unit: '°C', min: -20, max: -5, step: 0.5, value: p.critical, src: S('critical'), ref: 'PNT-CAL-012', hint: `PNT-CAL-012: ${fmt.temp(CRITICAL)}`, fmtv: (v) => fmt.temp(v) });
      F.push({ key: 'approver', label: 'Aprueba el bloqueo', name: 'Aprobador', type: 'select', value: p.approver, src: S('approver'), ref: 'PNT-CAL-015', hint: 'PNT-CAL-015: solo Calidad bloquea y libera', options: QUALITY_ROLES.map((k) => ({ value: k, label: roleLabel(k) })), fmtv: roleLabel });
      F.push({ key: 'notify', label: 'Aviso a', name: 'Aviso', type: 'select', value: p.notify, src: S('notify'), ref: 'Política', hint: `Por ${p.channel === 'Outlook' ? 'correo' : 'Microsoft Teams'}, para retener expediciones`, options: ['dispatch_shift', 'refrigeration_maintenance', 'quality_plant'].map((k) => ({ value: k, label: roleLabel(k) })), fmtv: roleLabel });
    } else if (domain === 'reclamacion') {
      F.push({ key: 'ack', label: 'Acuse de recibo', name: 'Acuse de recibo', type: 'number', unit: 'h', min: 1, max: 72, step: 1, value: p.ack, src: S('ack'), ref: 'PNT-CAL-020', hint: `PNT-CAL-020: ${ACK_H} h`, fmtv: (v) => `${fmt.num(v)} h` });
      F.push({ key: 'days', label: 'Informe 8D', name: 'Plazo del 8D', type: 'number', unit: 'días', min: 1, max: 30, step: 1, value: p.days, src: S('days'), ref: 'PNT-CAL-020', hint: `PNT-CAL-020: ${REPORT_DAYS} días hábiles`, fmtv: (v) => `${fmt.num(v)} días hábiles` });
      F.push({ key: 'months', label: 'Histórico de reclamaciones', name: 'Histórico de reclamaciones', type: 'number', unit: 'meses', min: 1, max: 36, step: 1, value: p.months, src: S('months'), ref: 'Política', hint: 'Histórico de Elara', fmtv: (v) => `${fmt.num(v)} meses` });
      F.push({ key: 'approver', label: 'Aprueba la respuesta', name: 'Aprobador', type: 'select', value: p.approver, src: S('approver'), ref: 'PNT-CAL-020', hint: 'Antes de enviar nada al cliente', options: QUALITY_ROLES.map((k) => ({ value: k, label: roleLabel(k) })), fmtv: roleLabel });
    } else if (domain === 'parte-diario') {
      F.push({ key: 'time', label: 'Hora del parte', name: 'Hora del parte', type: 'time', value: p.time, src: S('time'), ref: 'Política', hint: 'Lecturas de Mapex y Galileo', fmtv: (v) => v });
      F.push({ key: 'approver', label: 'Aprueba la retención', name: 'Aprobador', type: 'select', value: p.approver, src: S('approver'), ref: 'PNT-CAL-015', hint: 'PNT-CAL-015 · PNT-CAL-031', options: QUALITY_ROLES.map((k) => ({ value: k, label: roleLabel(k) })), fmtv: roleLabel });
    } else {
      F.push({ key: 'approver', label: 'Aprobación', name: 'Aprobador', type: 'select', value: p.approver, src: S('approver'), ref: 'PNT-CAL-015', hint: 'Antes de bloquear, retener o enviar', options: QUALITY_ROLES.map((k) => ({ value: k, label: roleLabel(k) })), fmtv: roleLabel });
    }
    return F;
  }

  function scoreFor(domain, phrase, triggerText) {
    const f = fold(phrase);
    const groups = MATCH_GROUPS[domain];
    let s = 0.05;
    const hits = [];
    if (groups) {
      groups.forEach((g) => { if (g.re.test(f)) { s += g.w; hits.push(g.label); } });
    } else {
      const STOP = new Set(['cuando', 'desde', 'hasta', 'durante', 'sobre', 'entre', 'para', 'como', 'este', 'esta', 'porque']);
      const words = (t) => (String(t || '').match(/\p{L}{4,}/gu) || []).filter((w) => !STOP.has(fold(w)));
      const a = new Set(words(triggerText).map((w) => fold(w).slice(0, 5)));
      const common = [];
      words(phrase).forEach((w) => { const k = fold(w).slice(0, 5); if (a.has(k) && !common.some((c) => fold(c).slice(0, 5) === k)) common.push(w.toLowerCase()); });
      s += Math.min(0.9, common.length * 0.3);
      common.slice(0, 4).forEach((w) => hits.push(w));
    }
    s = Math.min(0.97, Math.round(s * 100) / 100);
    return { phrase, score: s, hits, lane: s >= ENFORCE_MIN ? 'enforced' : s >= MIN_MATCH ? 'hint' : 'none' };
  }

  /** Modelo completo: nodos del grafo, filas de la interpretación, comprobaciones, frases y firma de versión. */
  function compose(I, overrides) {
    const domain = I.domain;
    const dom = DOMAINS[domain] || null;
    const p = Object.assign({}, I.values);
    const src = Object.assign({}, I.sources);
    Object.keys(overrides || {}).forEach((k) => { if (overrides[k] != null && overrides[k] !== '') { p[k] = overrides[k]; src[k] = 'edicion'; } });
    const approverName = roleLabel(p.approver);

    // Pasos numerados en orden de aparición; la aprobación va justo antes del primer paso que la necesita.
    const steps = I.steps.map((s, i) => {
      const base = CATALOG[s.cap];
      const c = stepContext(s.cap, domain, p);
      return {
        cap: s.cap, n: i + 1, agent: base.agent, icon: base.icon, hitl: !!base.hitl,
        systems: c.systems || base.systems.slice(), sub: c.sub || '', what: c.what || base.what,
        outputs: c.outputs || [], spans: s.spans, shared: !!(s.spans[0] && s.spans[0].shared), pos: s.pos
      };
    });
    const needsApproval = steps.some((s) => s.hitl) || !!(I.approval && !I.approval.negatedOnly);
    let gateIndex = -1;
    if (needsApproval) {
      gateIndex = steps.findIndex((s) => s.hitl);
      if (gateIndex < 0 && I.approval) gateIndex = steps.findIndex((s) => s.pos > I.approval.pos);
      if (gateIndex < 0) gateIndex = steps.length;
    }
    const policy = dom ? dom.policy : 'PNT-CAL-015';
    const gateCapName = steps[gateIndex] ? steps[gateIndex].cap : null;
    const gateVerb = gateCapName === 'notifier' ? 'enviar la respuesta' : gateCapName === 'quality_hold' ? (domain === 'parte-diario' ? 'retener producto' : 'aplicar el bloqueo') : 'continuar';
    const approval = needsApproval ? {
      role: approverName, key: p.approver, policy,
      source: I.approvalMissing ? 'politica' : 'texto',
      negated: I.approvalNegated,
      reassigned: I.notes.some((n) => n.id === 'aprobador'),
      span: I.approval && !I.approval.negatedOnly ? I.approval.span : null,
      negSpan: I.approval && I.approval.negated ? I.approval.negated.span : null,
      gateCap: gateCapName,
      gateVerb
    } : null;

    // Disparador
    let trigger;
    if (domain === 'cadena-frio') {
      trigger = { system: 'Galileo/SCADA', type: 'temperatura', icon: 'thermometer', badges: ['SCADA Galileo'], label: `Temperatura de aire > ${fmt.temp(p.threshold)}`, sub: `más de ${fmt.num(p.minutes)} min`, entry: 'Alarma de Galileo/SCADA recibida por webhook', scope: I.values.scope };
    } else if (domain === 'reclamacion') {
      trigger = { system: 'Outlook', type: 'correo', icon: 'mail', badges: ['Outlook'], label: 'Reclamación en el buzón de Calidad', sub: I.values.defect ? `por ${I.values.defect}` : 'correo de cliente', entry: 'Buzón de Calidad en Outlook' };
    } else if (domain === 'parte-diario') {
      trigger = { system: 'Programado', type: 'programado', icon: 'clock', badges: [], label: `Cada día a las ${p.time}`, sub: 'Programado', entry: `Programación diaria del servidor · ${p.time}` };
    } else {
      trigger = { system: I.trigger.type === 'programado' ? 'Programado' : 'Prodigy', type: I.trigger.type, icon: I.trigger.type === 'programado' ? 'clock' : 'bell', badges: [], label: clip(upperFirst(I.trigger.text), 64), sub: '', entry: I.trigger.type === 'programado' ? 'Programación del servidor' : 'Evento o petición en el chat de Prodigy' };
    }
    trigger.fullLabel = domain === 'cadena-frio' ? `${trigger.label} durante más de ${fmt.num(p.minutes)} min`
      : domain === 'reclamacion' ? `Reclamación de cliente en el buzón de Calidad${I.values.defect ? ` por ${I.values.defect}` : ''}`
        : trigger.label;
    trigger.text = I.trigger.text;

    // Grafo
    const nodes = [{ id: 'trigger', kind: 'trigger', label: trigger.label, sub: trigger.sub, systems: trigger.badges, icon: trigger.icon }];
    const edges = [];
    let prev = 'trigger';
    const push = (n) => { nodes.push(n); edges.push([prev, n.id]); prev = n.id; };
    steps.forEach((s, i) => {
      if (approval && i === gateIndex) push({ id: 'approval', kind: 'approval', label: approval.role, sub: approval.policy, icon: 'user-check' });
      push({ id: s.cap, kind: 'agent', kindLabel: `Paso ${s.n}`, label: s.agent, sub: s.sub, systems: s.systems, icon: s.icon });
    });
    if (approval && gateIndex >= steps.length) push({ id: 'approval', kind: 'approval', label: approval.role, sub: approval.policy, icon: 'user-check' });

    // Resaltado del texto
    const hl = [];
    const addSpan = (sp, label, tone, ref) => {
      if (!sp || sp.end <= sp.start) return false;
      const same = hl.find((h) => h.start === sp.start && h.end === sp.end);
      if (same) { if (!same.labels.includes(label)) same.labels.push(label); if (!same.refs.includes(ref)) same.refs.push(ref); return true; }
      if (hl.some((h) => sp.start < h.end && sp.end > h.start)) return false;
      hl.push({ start: sp.start, end: sp.end, labels: [label], tone, refs: [ref] });
      return true;
    };
    addSpan({ start: I.trigger.start, end: I.trigger.end }, 'Disparador', 'brand', 'trigger');
    steps.forEach((s) => s.spans.forEach((sp) => addSpan(sp, `Paso ${s.n}`, 'step', s.cap)));
    if (approval) {
      if (approval.span) addSpan(approval.span, 'Aprobación', '', 'approval');
      if (approval.negSpan && !approval.span) addSpan(approval.negSpan, 'Aprobación: se mantiene', '', 'approval');
    }
    const paramSpan = (k, label) => { if (I.spans[k] && src[k] !== 'edicion') addSpan(I.spans[k], label, 'param', `param-${k}`); };
    if (domain === 'cadena-frio') paramSpan('critical', 'Crítico');
    if (domain === 'reclamacion') { paramSpan('months', 'Histórico'); paramSpan('days', 'Plazo del 8D'); }
    if (domain === 'parte-diario' && I.spans.noDuplicate) addSpan(I.spans.noDuplicate, 'Regla', 'param', 'param-noDuplicate');

    const quote = (sp) => `«${clip(I.text.slice(sp.start, sp.end), 170)}»`;

    // Filas de la interpretación (mismo orden que el grafo)
    const rows = [{
      ref: 'trigger', kind: 'trigger', icon: trigger.icon,
      title: `Disparador · ${trigger.fullLabel}`,
      quote: quote({ start: I.trigger.start, end: I.trigger.end }),
      meta: html`<span>${trigger.entry}</span>${trigger.badges.length ? sys(trigger.badges[0]) : ''}`
    }];
    steps.forEach((s, i) => {
      if (approval && i === gateIndex) rows.push(approvalRow(approval, I.text));
      rows.push({
        ref: s.cap, kind: 'step', num: s.n,
        title: `Paso ${s.n} · ${s.agent}`,
        quote: s.shared ? 'Sale de la frase del disparador' : s.spans.map(quote).join(' · '),
        quoteNote: s.shared,
        meta: html`<span class="wf-cap">${s.cap}</span>${App.sysList(s.systems)}`
      });
    });
    if (approval && gateIndex >= steps.length) rows.push(approvalRow(approval, I.text));

    // Salidas
    const outputs = [];
    steps.forEach((s) => s.outputs.forEach((o) => outputs.push(o)));
    if (domain === 'cadena-frio') outputs.push({ icon: 'file-text', text: 'Informe de incidencia (PDF) con el registro de auditoría' });
    if (domain === 'parte-diario') outputs.push({ icon: 'file-text', text: 'Parte diario de equipos (PDF)' });
    if (!outputs.length) steps.forEach((s) => outputs.push({ icon: s.icon, text: s.what }));

    // Frases que lo activan y prueba de activación
    let scenarios;
    let testUtterance;
    if (domain === 'cadena-frio') {
      scenarios = [
        `${I.values.scopeOne} supera ${fmt.temp(p.threshold)} durante más de ${fmt.num(p.minutes)} min`,
        `salta una alarma de temperatura en una cámara de frío o de expedición (p. ej. la ${CH.code} de Fustiñana)`,
        'el usuario informa de que una cámara pierde frío',
        'hay que evaluar los lotes y palés expuestos a una rotura de la cadena de frío'
      ];
      testUtterance = `Alarma: la cámara ${CH.code} de Fustiñana marca ${fmt.temp(TEST_TEMP)} desde hace 40 minutos`;
    } else if (domain === 'reclamacion') {
      scenarios = [
        'llega al buzón de Calidad la reclamación de un cliente por un defecto o un cuerpo extraño en un lote',
        'un cliente internacional se queja de un producto congelado y hay que investigar el lote',
        'hay que registrar una reclamación de cliente como no conformidad'
      ];
      testUtterance = `Nos ha llegado una reclamación de un cliente del Reino Unido por una piedra en el lote ${COMPLAINT.lot}`;
    } else if (domain === 'parte-diario') {
      scenarios = [
        `son las ${p.time} y toca el parte diario de los equipos de Fustiñana`,
        'el usuario pide el parte diario de los equipos de la planta',
        'el usuario pregunta qué equipos de la planta están dando problemas hoy'
      ];
      testUtterance = 'Haz el parte diario de la planta de Fustiñana';
    } else {
      scenarios = [lowerFirst(clip(I.trigger.text, 140)), `el usuario pide: ${lowerFirst(steps[0].agent)}`];
      testUtterance = upperFirst(clip(I.trigger.text.replace(/^(cuando|si|cada vez que|siempre que|en cuanto)\s+/i, ''), 120));
    }
    const test = scoreFor(domain, testUtterance, I.trigger.text);

    // Nombre, slug y descripción
    let name;
    let slug;
    if (dom) {
      name = domain === 'reclamacion' && I.values.defect ? `${dom.name} por ${I.values.defect}` : dom.name;
      slug = dom.slug;
    } else {
      const w = steps.map((s) => STEP_WORDS[s.cap]);
      const rest = w.slice(1).map((x) => x[1]);
      name = rest.length ? `${w[0][0]}: ${fmt.list(rest)}` : w[0][0];
      slug = `wf-${w.map((x) => x[2]).join('-')}`.slice(0, 64);
    }
    const description = `Disparador: ${lowerFirst(trigger.fullLabel)}. Pasos: ${steps.map((s) => s.agent).join(', ')}.${approval ? ` Aprueba: ${approval.role}.` : ''}`;

    // Comprobaciones
    const checks = [];
    const pre = [];
    const post = [];
    nodes.slice(1).forEach((n) => {
      if (n.id === 'approval') return;
      const afterGate = approval && nodes.findIndex((x) => x.id === 'approval') < nodes.findIndex((x) => x.id === n.id);
      (n.systems || []).forEach((sname) => { const list = afterGate ? post : pre; if (!list.includes(sname) && sname !== 'Procedimientos') list.push(sname); });
    });
    if (domain === 'cadena-frio') {
      const same = p.threshold === LIMIT && p.minutes === HOLD_MIN;
      const stricter = p.threshold <= LIMIT && p.minutes <= HOLD_MIN;
      const bad = I.notes.find((n) => n.id === 'umbral-invalido');
      let tone = 'ok';
      let text;
      let shortText = null;
      if (same) text = `Umbral y tiempo como PNT-CAL-012: ${fmt.temp(LIMIT)} durante más de ${HOLD_MIN} min`;
      else if (stricter) text = `Más estricto que PNT-CAL-012 (${fmt.temp(LIMIT)} durante más de ${HOLD_MIN} min)`;
      else {
        tone = 'warn';
        const parts = [];
        if (p.threshold > LIMIT) parts.push(`umbral de ${fmt.temp(p.threshold)} frente a ${fmt.temp(LIMIT)}`);
        if (p.minutes > HOLD_MIN) parts.push(`${fmt.num(p.minutes)} min frente a ${HOLD_MIN} min`);
        text = `Menos estricto que PNT-CAL-012 (${fmt.list(parts)}): al publicar se pide el motivo`;
        shortText = `Menos estricto que PNT-CAL-012: ${fmt.list(parts)}.`;
      }
      if (bad && src.threshold !== 'edicion') { tone = 'warn'; text = `El umbral del texto (${fmt.temp(bad.value)}) no es válido para producto congelado: se usa el de PNT-CAL-012 (${fmt.temp(LIMIT)})`; }
      const critText = p.critical === CRITICAL ? `crítica por encima de ${fmt.temp(CRITICAL)}` : `crítica por encima de ${fmt.temp(p.critical)} (PNT-CAL-012: ${fmt.temp(CRITICAL)})`;
      checks.push({ id: 'umbral', tone, text, short: shortText, deviation: tone === 'warn' && !same && !stricter, stream: { system: 'Procedimientos', action: 'Contrasta los umbrales con PNT-CAL-012', result: `${same ? 'Coinciden' : stricter ? 'Más estrictos' : 'Menos estrictos'}: ${fmt.temp(p.threshold)} durante más de ${fmt.num(p.minutes)} min · ${critText}`, ms: 360 } });
    } else if (domain === 'reclamacion') {
      const ok = p.ack <= ACK_H && p.days <= REPORT_DAYS;
      checks.push({ id: 'plazos', tone: ok ? 'ok' : 'warn', deviation: !ok, short: `Plazos más largos que PNT-CAL-020: acuse en ${fmt.num(p.ack)} h frente a ${ACK_H} h e informe 8D en ${fmt.num(p.days)} frente a ${REPORT_DAYS} días hábiles.`, text: ok ? `Plazos dentro de PNT-CAL-020: acuse en ${fmt.num(p.ack)} h e informe 8D en ${fmt.num(p.days)} días hábiles` : `Plazos más largos que PNT-CAL-020 (acuse en ${ACK_H} h, 8D en ${REPORT_DAYS} días hábiles): al publicar se pide el motivo`, stream: { system: 'Procedimientos', action: 'Contrasta los plazos con PNT-CAL-020', result: `Acuse en ${fmt.num(p.ack)} h · informe 8D en ${fmt.num(p.days)} días hábiles${ok ? ' · dentro de plazo' : ' · fuera de plazo'}`, ms: 340 } });
    } else if (domain === 'parte-diario') {
      checks.push({ id: 'pcc', tone: 'ok', text: `Detectores de metales como PCC: verificación cada ${PCC_H} h (PNT-CAL-031)`, stream: { system: 'Procedimientos', action: 'Contrasta el parte con PNT-CAL-031', result: `DM-1 es PCC: verificación con probetas cada ${PCC_H} h`, ms: 320 } });
      if (I.values.noDuplicate) checks.push({ id: 'duplicados', tone: 'ok', text: 'Tickets sin duplicar las órdenes abiertas de la GMAO' });
    }
    if (approval) {
      let tone = 'ok';
      let text = `Aprobación del ${approval.role} antes de ${approval.gateVerb} (${approval.policy})`;
      if (approval.negated) { tone = 'warn'; text = `El texto pide actuar sin aprobación: ${approval.policy} no lo permite y se mantiene la aprobación del ${approval.role}`; } else if (approval.reassigned) { tone = 'warn'; text = `PNT-CAL-015: solo Calidad aprueba bloqueos; aprueba el ${approval.role}`; } else if (approval.source === 'politica') { tone = 'warn'; text = `El texto no dice quién aprueba: se aplica ${approval.policy} (${approval.role})`; }
      checks.push({ id: 'aprobacion', tone, text, stream: { system: 'Procedimientos', action: `Comprueba la política de aprobación (${approval.policy})`, result: tone === 'ok' ? `Requiere aprobación: ${approval.role} · incluida` : text, ms: 220 } });
    } else {
      checks.push({ id: 'aprobacion', tone: 'ok', text: 'No bloquea, retiene ni envía nada: no necesita aprobación' });
    }
    checks.push({ id: 'catalogo', tone: 'ok', text: `${steps.length} de ${steps.length} pasos con agente activo en el espacio ${SPACE}`, stream: { system: 'Prodigy', action: 'Comprueba los conectores del espacio', result: approval ? `Antes de aprobar: ${fmt.list(pre)} · tras aprobar: ${fmt.list(post)}` : `Sistemas: ${fmt.list(pre)}`, ms: 90 } });
    checks.push({ id: 'activacion', tone: test.lane === 'enforced' ? 'ok' : 'warn', text: `Frase de prueba: confianza ${fmt.num(test.score, 2)} · ${test.lane === 'enforced' ? 'lo ejecuta en orden fijo' : test.lane === 'hint' ? 'solo como sugerencia' : 'no lo activa'}` });

    // Configuración de cada agente (definición exportable)
    const config = [];
    const has = (cap) => steps.some((s) => s.cap === cap);
    if (domain === 'cadena-frio') {
      if (has('cold_chain_monitor')) config.push(['cold_chain_monitor', [['limite_aire_c', p.threshold], ['minutos_por_encima', p.minutes], ['critico_aire_c', p.critical], ['ambito', I.values.scope]]]);
      if (has('quality_hold')) config.push(['quality_hold', [['aprobador', approverName], ['politica', 'PNT-CAL-015']]]);
      if (has('quality_incident')) config.push(['quality_incident', [['plantilla', '8D'], ['aviso_a', roleLabel(p.notify)], ['canal', p.channel]]]);
    } else if (domain === 'reclamacion') {
      if (has('complaint_intake')) config.push(['complaint_intake', [['acuse_horas', p.ack]]]);
      if (has('quality_incident')) config.push(['quality_incident', [['plantilla', '8D · PNT-CAL-020'], ['plazo_dias_habiles', p.days], ['historico_meses', p.months]]]);
      if (has('notifier')) config.push(['notifier', [['idioma', 'el del cliente'], ['aprobador', approverName]]]);
    } else if (domain === 'parte-diario') {
      if (has('cn_plant_monitor')) config.push(['cn_plant_monitor', [['hora', p.time], ['equipos', D.machines.length], ['indicadores', METRICS], ['tickets', 'GMAO, sin duplicar órdenes abiertas']]]);
      if (has('quality_hold')) config.push(['quality_hold', [['aprobador', approverName], ['politica', 'PNT-CAL-015 · PNT-CAL-031']]]);
      if (has('quality_incident')) config.push(['quality_incident', [['canal', `Microsoft Teams · ${p.channel}`]]]);
    } else if (approval) {
      config.push([approval.gateCap || steps[0].cap, [['aprobador', approverName]]]);
    }

    const contractParams = {};
    paramFields(domain, p, src).forEach((fd) => { contractParams[fd.key] = fd.type === 'select' ? roleLabel(fd.value) : fd.value; });
    if (domain === 'cadena-frio') contractParams.channel = p.channel;
    const sig = JSON.stringify({ t: I.text.replace(/\s+/g, ' ').trim(), s: steps.map((s) => s.cap), p: contractParams });

    return {
      ok: true, text: I.text, domain, dom, name, slug, description, trigger, steps, approval, nodes, edges, rows, hl, outputs,
      scenarios, testUtterance, test, checks, config, p, src, fields: paramFields(domain, p, src), contractParams, sig,
      deviations: checks.filter((c) => c.deviation)
    };
  }
  function approvalRow(a, text) {
    const note = a.negated ? `${a.policy} no permite quitarla` : a.reassigned ? 'Reasignada: PNT-CAL-015 reserva los bloqueos a Calidad' : a.source === 'politica' ? `Añadida por política · ${a.policy}` : '';
    const sp = a.span || a.negSpan;
    return {
      ref: 'approval', kind: 'approval', icon: 'user-check',
      title: `Aprobación · ${a.role}`,
      quote: sp ? `«${clip(text.slice(sp.start, sp.end), 170)}»` : null,
      meta: html`<span>${a.policy} · antes de ${a.gateVerb}</span>${note ? chip('warning', note, { dot: false }) : ''}`
    };
  }

  const modelCache = new Map();
  function modelFor(text, overrides) {
    const key = `${text}\u0000${JSON.stringify(overrides || {})}`;
    if (!modelCache.has(key)) {
      if (modelCache.size > 24) modelCache.clear();
      const I = interpret(text);
      modelCache.set(key, I.ok ? compose(I, overrides) : I);
    }
    return modelCache.get(key);
  }

  /* ================================================================ Estado de la escena y versiones */

  const tabOf = (L) => (TEMPLATES[L && L.tab] ? L.tab : TEMPLATE_IDS[0]);
  function textFor(L, tab) {
    const t = L && L.texts && L.texts[tab];
    return t != null ? t : TEMPLATES[tab].text;
  }
  function publishedFor(slug, state) {
    return ((state || App.state).workflows || []).find((w) => w && (w.slug === slug || w.id === slug)) || null;
  }
  function versionState(m, pub) {
    if (!pub) return { n: 1, published: false, changes: [] };
    const pn = pub.versionNumber || Number(String(pub.version || 'v1').replace(/\D/g, '')) || 1;
    if (pub.sig === m.sig) return { n: pn, published: true, changes: [] };
    return { n: pn + 1, published: false, prev: pn, changes: diffWithPublished(m, pub) };
  }
  function diffWithPublished(m, pub) {
    const out = [];
    const before = pub.params || {};
    m.fields.forEach((fd) => {
      const a = before[fd.key];
      const bv = m.contractParams[fd.key];
      if (a != null && String(a) !== String(bv)) out.push(`${fd.name || fd.label}: de ${fd.type === 'select' ? a : fd.fmtv(a)} a ${fd.type === 'select' ? bv : fd.fmtv(bv)}`);
    });
    const ps = (pub.steps || []).filter((s) => s.kind !== 'approval').map((s) => s.capability || s.id);
    const ms = m.steps.map((s) => s.cap);
    ms.filter((c) => !ps.includes(c)).forEach((c) => out.push(`Paso añadido: ${CATALOG[c].agent}`));
    ps.filter((c) => !ms.includes(c)).forEach((c) => out.push(`Paso quitado: ${CATALOG[c] ? CATALOG[c].agent : c}`));
    if ((pub.sourceText || '').replace(/\s+/g, ' ').trim() !== m.text.replace(/\s+/g, ' ').trim()) out.push('Texto del procedimiento modificado');
    return out;
  }
  /** Situación de la pestaña activa (también para el panel del presentador). */
  function status(state) {
    const L = (state.scenes && state.scenes.workflow) || {};
    const tab = tabOf(L);
    const res = (L.results || {})[tab] || null;
    if (!res) return { phase: 'idle', tab, L };
    if (res.kind === 'rejected') return { phase: 'rejected', tab, L, res };
    const m = modelFor(res.text, res.params);
    if (!m.ok) return { phase: 'idle', tab, L };
    const pub = publishedFor(m.slug, state);
    const vs = versionState(m, pub);
    return { phase: vs.published ? 'published' : 'draft', tab, L, res, m, pub, vs, editing: !!(L.editing || {})[tab] };
  }

  /* ================================================================ Piezas de la vista */

  /** ['Paso 2', 'Paso 3', 'Aprobación'] → 'Pasos 2 y 3 · Aprobación' */
  function tagText(labels) {
    const nums = labels.map((l) => /^Paso (\d+)$/.exec(l)).filter(Boolean).map((m) => m[1]);
    if (nums.length < 2) return labels.join(' · ');
    const out = [];
    let done = false;
    labels.forEach((l) => {
      if (/^Paso \d+$/.test(l)) { if (!done) { out.push(`Pasos ${fmt.list(nums)}`); done = true; } } else out.push(l);
    });
    return out.join(' · ');
  }
  function markedText(src, spans) {
    const sorted = spans.slice().sort((a, z) => a.start - z.start);
    let out = '';
    let pos = 0;
    sorted.forEach((s) => {
      if (s.start < pos) return;
      out += esc(src.slice(pos, s.start));
      out += `<mark class="hl${s.tone ? ' hl-' + esc(s.tone) : ''}" data-ref="${esc(s.refs.join(' '))}" tabindex="0">${esc(src.slice(s.start, s.end))}<span class="hl-tag">${esc(tagText(s.labels))}</span></mark>`;
      pos = s.end;
    });
    out += esc(src.slice(pos));
    return raw(out);
  }

  function legend() {
    return html`<div class="wf-legend-row">
      <span><i class="wf-sw sw-brand"></i>Disparador</span>
      <span><i class="wf-sw sw-step"></i>Paso de un agente</span>
      <span><i class="wf-sw sw-appr"></i>Aprobación</span>
      <span><i class="wf-sw sw-param"></i>Parámetro o regla</span>
    </div>`;
  }

  /** Texto con los códigos de procedimiento sin partir (PNT-CAL-012, IT-MAN-DP-02). */
  function codes(text) {
    const visible = window.CN_I18N ? CN_I18N.text(text) : text;
    return raw(esc(visible).replace(/\b(PNT-CAL-\d{3}|IT-MAN-DP-\d{2})\b/g, '<span class="nowrap">$1</span>'));
  }
  function checksList(checks) {
    return html`<ul class="wf-checks">${checks.map((c) => html`<li class="is-${c.tone}" data-check="${c.id}">${icon(c.tone === 'ok' ? 'check-circle' : 'alert-triangle', 16)}<span>${codes(c.text)}</span></li>`)}</ul>`;
  }

  /** Resumen en vivo de lo que se reconoce en el texto (misma interpretación que «Crear workflow»). */
  function previewText(text, tab) {
    const words = wordCount(text);
    const I = interpret(text);
    let what;
    if (I.ok) {
      const needs = I.steps.some((x) => CATALOG[x.cap].hitl) || !!(I.approval && !I.approval.negatedOnly);
      what = `disparador, ${fmt.plural(I.steps.length, 'paso', 'pasos')}${needs ? ' y aprobación' : ''}`;
    } else if (words < 3) what = 'escribe cuándo se activa y qué pasos da';
    else if (OUT_OF_SCOPE.some((o) => o.id === I.category)) what = 'fuera del alcance del espacio';
    else what = I.category === 'sin-disparador' ? 'falta el disparador' : I.category === 'sin-pasos' ? 'sin pasos reconocibles' : 'sin disparador ni pasos';
    return `${fmt.plural(words, 'palabra', 'palabras')} · vista previa: ${what} · se contrasta con ${TEMPLATES[tab].refs}`;
  }
  function editorCard(tab, L, st) {
    const seg = App.segmented({ name: 'wf-plantilla', label: 'Plantilla del procedimiento', value: tab, options: TEMPLATE_IDS.map((k) => ({ value: k, label: TEMPLATES[k].label, icon: TEMPLATES[k].icon })) });
    const showMarked = (st.phase === 'draft' || st.phase === 'published') && !st.editing;
    let body;
    let footer;
    if (showMarked) {
      body = html`<div class="wf-text" id="wf-marked">${markedText(st.res.text, st.m.hl)}</div>
        ${legend()}
        <div class="wf-subhead">Comprobaciones</div>
        ${checksList(st.m.checks)}`;
      footer = html`<button type="button" class="btn btn-secondary btn-sm" data-action="edit">${icon('edit', 15)}<span>Editar texto</span></button>
        <button type="button" class="btn btn-ghost btn-sm" data-action="restore">${icon('rotate-ccw', 15)}<span>Restaurar plantilla</span></button>
        <span class="spacer"></span><span class="muted small">${wordCount(st.res.text)} palabras · interpretado a las ${fmt.time(st.res.createdAt)}</span>`;
    } else {
      const text = textFor(L, tab);
      const updating = st.phase === 'draft' || st.phase === 'published';
      body = html`<div class="field wf-editor">
          <label class="label" for="wf-input">Procedimiento, tal como lo escribe Calidad</label>
          <textarea id="wf-input" class="textarea" rows="10" spellcheck="false">${text}</textarea>
          <span class="hint" id="wf-count">${previewText(text, tab)}</span>
        </div>`;
      footer = html`<button type="button" class="btn btn-primary" data-action="create">${icon('play')}<span>${updating ? 'Actualizar workflow' : 'Crear workflow'}</span></button>
        ${st.editing ? html`<button type="button" class="btn btn-secondary" data-action="cancel-edit"><span>Cancelar</span></button>` : ''}
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost btn-sm" data-action="restore">${icon('rotate-ccw', 15)}<span>Restaurar plantilla</span></button>`;
    }
    return App.card({ id: 'wf-editor-card', title: 'Procedimiento escrito', sub: `Plantilla «${TEMPLATES[tab].label}» · texto libre en castellano`, icon: 'file-text', actions: seg, body, footer });
  }

  function idleBody() {
    const items = [
      ['bell', 'brand', 'Disparador', 'Una alarma de Galileo/SCADA, un correo en el buzón de Calidad o una hora fija.'],
      ['cpu', '', 'Pasos y sistemas', 'Qué agente hace cada paso y qué sistema consulta o actualiza: SAP, Mapex, Easy WMS, Elara o Teams.'],
      ['user-check', 'warn', 'Aprobación humana', 'Quién decide antes de bloquear, retener o enviar, según PNT-CAL-015.'],
      ['file-text', '', 'Salidas', 'Bloqueos, no conformidades, avisos e informes que deja el workflow.']
    ];
    return html`<div class="card-body">
      <ul class="wf-legend">${items.map(([ic, tone, t, d]) => html`<li><span class="li-icon${tone ? ' tone-' + tone : ''}">${icon(ic, 18)}</span><div><div class="strong">${t}</div><div class="slate small mt-1">${d}</div></div></li>`)}</ul>
      <p class="muted small mt-4">Cada elemento queda enlazado con la frase del texto de la que sale y se contrasta con los procedimientos de Calidad antes de guardar el borrador.</p>
    </div>`;
  }

  function rejectedBody(res) {
    const cat = OUT_OF_SCOPE.find((o) => o.id === res.category) || NOT_BUILT[res.category] || NOT_BUILT['no-reconocido'];
    return html`<div class="card-body stack stack-sm" id="wf-rejected">
      ${App.callout({ tone: 'warn', icon: 'alert-triangle', title: `No se ha creado ningún workflow · ${cat.title}`, body: html`<p>${cat.body}</p><p class="mt-2">No se ha guardado nada. La petición queda en el registro de auditoría.</p>` })}
      <div class="wf-subhead">Agentes del espacio ${SPACE}</div>
      <div class="wf-agents">${Object.keys(CATALOG).map((k) => html`<span class="wf-agent">${icon(CATALOG[k].icon, 14)}${CATALOG[k].agent}</span>`)}</div>
      <p class="muted small">Corrige el texto o restaura la plantilla para volver a empezar.</p>
    </div>`;
  }

  function mapList(m) {
    return html`<ol class="wf-map">${m.rows.map((r) => html`<li class="wf-map-item" data-ref="${r.ref}" tabindex="0">
        <span class="wf-map-num kind-${r.kind}">${r.num != null ? r.num : icon(r.icon, 14)}</span>
        <div class="wf-map-main">
          <div class="wf-map-title">${r.title}</div>
          ${r.quote ? html`<div class="wf-quote${r.quoteNote ? ' is-note' : ''}">${r.quote}</div>` : ''}
          <div class="wf-map-meta">${r.meta}</div>
        </div>
      </li>`)}</ol>`;
  }

  function interpCard(st) {
    let sub = 'Qué entiende Prodigy del texto';
    let body = idleBody();
    if (st.phase === 'rejected') { sub = 'Resultado de la interpretación'; body = rejectedBody(st.res); }
    if (st.phase === 'draft' || st.phase === 'published') {
      const n = st.m.steps.length;
      sub = `${fmt.plural(n, 'paso', 'pasos')} · ${st.m.approval ? '1 aprobación' : 'sin aprobación'} · cada uno con su frase del texto`;
      body = html`${mapList(st.m)}<div class="card-body"><details class="run-log"><summary>${icon('chevron-right', 16)}<span>Registro de interpretación · ${streamSteps(st.m, st.vs).length} pasos · ${fmt.ms(st.res.ms)}</span></summary><div class="mt-2 wf-stream" id="wf-log"></div></details></div>`;
    }
    return App.card({ id: 'wf-interp-card', title: 'Interpretación', sub, icon: 'cpu', flush: true, body: html`<div id="wf-interp">${body}</div>` });
  }

  function yamlText(m, vs) {
    const q = (s) => JSON.stringify(String(s));
    const L = [];
    L.push(`# Routine de Prodigy · espacio ${SPACE}`);
    L.push(`# ${vs.published ? `v${vs.n} · publicada` : `v${vs.n} · borrador sin publicar`}`);
    L.push(`slug: ${m.slug}`);
    L.push(`name: ${q(m.name)}`);
    L.push(`description: ${q(m.description)}`);
    L.push('scenarios:');
    m.scenarios.forEach((s) => L.push(`  - ${q(s)}`));
    L.push('steps:');
    m.steps.forEach((s) => L.push(`  - ${s.cap}${m.approval && m.approval.gateCap === s.cap ? `   # antes, aprobación: ${m.approval.role}` : ''}`));
    L.push('ordered: true');
    L.push('enforce: true');
    L.push(`enabled: ${vs.published ? 'true' : 'false'}`);
    if (m.config.length) {
      L.push('');
      L.push('# Configuración de los agentes en este workflow');
      L.push('config:');
      m.config.forEach(([cap, kv]) => {
        L.push(`  ${cap}:`);
        kv.forEach(([k, v]) => L.push(`    ${k}: ${typeof v === 'number' ? String(v) : q(v)}`));
      });
    }
    return L.join('\n');
  }
  function yamlHTML(text) {
    return raw(text.split('\n').map((line) => {
      if (/^\s*#/.test(line)) return `<span class="y-c">${esc(line)}</span>`;
      const m = /^(\s*(?:-\s+)?)([a-z_]+)(:)(.*)$/.exec(line);
      if (m && !/^\s*-\s+[a-z_]+$/.test(line)) return `${esc(m[1])}<span class="y-k">${esc(m[2])}</span>${esc(m[3])}${m[4].includes('#') ? `${esc(m[4].slice(0, m[4].indexOf('#')))}<span class="y-c">${esc(m[4].slice(m[4].indexOf('#')))}</span>` : esc(m[4])}`;
      const c = line.indexOf('#');
      return c > 0 ? `${esc(line.slice(0, c))}<span class="y-c">${esc(line.slice(c))}</span>` : esc(line);
    }).join('\n'));
  }

  function versionChip(vs) {
    return vs.published
      ? chip({ tone: 'ok', icon: 'check', label: `v${vs.n} · publicado` })
      : chip({ tone: 'draft', icon: 'git-branch', label: `v${vs.n} · borrador` });
  }

  function publishedCallout(m, pub) {
    const dom = m.dom;
    const next = m.domain === 'cadena-frio'
      ? `La próxima alarma de temperatura de Galileo/SCADA lo ejecuta. La de ${CH.code} de las ${EXC.start} sigue abierta.`
      : m.domain === 'reclamacion'
        ? `El próximo correo de reclamación lo ejecuta. La reclamación ${COMPLAINT.code} está pendiente de respuesta.`
        : m.domain === 'parte-diario' ? `Se ejecuta cada día a las ${m.p.time}.` : 'Se ejecuta cuando se cumpla el disparador.';
    return App.callout({
      tone: 'ok',
      icon: 'check-circle',
      title: `Workflow publicado · ${pub.version} · ${fmt.time(pub.publishedAt)}`,
      body: html`Activo en el espacio ${SPACE} y registrado en auditoría. ${next}`,
      attrs: { id: 'wf-published' },
      actions: html`${dom ? html`<button type="button" class="btn btn-primary" data-go="${dom.go}">${icon('play')}<span>${dom.goLabel}</span></button>` : ''}<button type="button" class="btn btn-secondary" data-open-audit>${icon('history')}<span>Ver en auditoría</span></button>`
    });
  }

  function stepsTable(m) {
    const rows = m.nodes.slice(1);
    const byCap = Object.fromEntries(m.steps.map((s) => [s.cap, s]));
    return App.table({
      dense: true,
      rows,
      cols: [
        { label: 'Paso', width: '26%', render: (n) => (n.id === 'approval'
          ? html`<span class="strong">Aprobación</span><span class="sub">${n.label}</span>`
          : html`<span class="strong">${n.kindLabel} · ${n.label}</span><span class="sub">${n.sub}</span>`) },
        { label: 'Agente', width: '17%', render: (n) => (n.id === 'approval' ? html`<span class="muted">Persona</span>` : html`<span class="wf-cap">${n.id}</span>`) },
        { label: 'Sistemas', width: '20%', render: (n) => (n.systems && n.systems.length ? App.sysList(n.systems) : html`<span class="muted">—</span>`) },
        { label: 'Qué hace', render: (n) => (n.id === 'approval' ? `Revisa la propuesta y decide. Rechazar no aplica nada (${m.approval.policy}).` : byCap[n.id].what) }
      ],
      rowClass: (n) => (n.id === 'approval' ? 'tone-warn' : '')
    });
  }

  function workflowCard(st, view) {
    const m = st.m;
    const vs = st.vs;
    const top = vs.published
      ? publishedCallout(m, st.pub)
      : st.pub ? App.callout({ tone: 'brand', icon: 'git-branch', title: `Cambios respecto a la ${st.pub.version} publicada`, body: html`<ul class="wf-changes">${vs.changes.map((c) => html`<li>${c}</li>`)}</ul><p class="mt-2">Al publicar, la ${st.pub.version} queda en el historial y se activa la v${vs.n}.</p>` }) : '';
    const graph = App.planGraph({ id: 'wf-graph', nodes: m.nodes, edges: m.edges, gapX: 30, title: m.name });
    const yaml = yamlText(m, vs);
    const tabs = App.tabs({
      id: 'wf-tabs',
      flush: true,
      label: 'Vistas del workflow',
      active: view || 'diagrama',
      tabs: [
        { id: 'diagrama', label: 'Diagrama', icon: 'workflow', body: html`<div class="wf-graph">${graph}</div><div class="wf-subhead">Salidas</div><div class="wf-outputs">${m.outputs.map((o) => html`<div class="wf-output">${icon(o.icon, 16)}<span>${o.text}</span></div>`)}</div>` },
        { id: 'pasos', label: 'Pasos', count: m.steps.length + (m.approval ? 1 : 0), body: stepsTable(m) },
        { id: 'definicion', label: 'Definición', icon: 'file-text', body: html`<pre class="wf-yaml" id="wf-yaml">${yamlHTML(yaml)}</pre><div class="row mt-3"><button type="button" class="btn btn-secondary btn-sm" data-action="download-def">${icon('download', 15)}<span>Descargar definición (.yaml)</span></button><span class="muted small">Formato de las Routines de Prodigy: frases que lo activan y agentes en orden fijo.</span></div>` }
      ]
    });
    const actions = html`${versionChip(vs)}${vs.published ? '' : html`<button type="button" class="btn btn-primary btn-sm" data-action="publish">${icon('upload', 15)}<span>Publicar workflow</span></button>`}`;
    return App.card({
      id: 'wf-card',
      title: m.name,
      sub: html`<span class="wf-slug">${m.slug}</span> · ${fmt.plural(m.steps.length, 'agente', 'agentes')} en orden fijo${m.approval ? ' · 1 aprobación humana' : ''}`,
      icon: 'workflow',
      actions,
      flush: true,
      body: html`${top ? html`<div class="card-body">${top}</div>` : ''}${tabs}`,
      footer: html`<span class="muted small">Borrador creado por el ${AGENT} en ${fmt.ms(st.res.ms)} a partir del texto · 1 llamada al modelo</span>${vs.published && st.pub.versions && st.pub.versions.length > 1 ? html`<span class="muted small">· historial: ${st.pub.versions.map((v) => v.version).join(', ')}</span>` : ''}`
    });
  }

  function paramInput(fd) {
    const id = `wf-p-${fd.key}`;
    const srcChip = fd.src === 'texto' ? chip('brand', 'Del texto', { size: 'sm' }) : fd.src === 'edicion' ? chip('info', 'Modificado', { size: 'sm' }) : chip('neutral', fd.ref, { size: 'sm' });
    let control;
    if (fd.type === 'select') {
      control = html`<select id="${id}" class="select" data-param="${fd.key}">${fd.options.map((o) => html`<option value="${o.value}" ${o.value === fd.value ? raw('selected') : ''}>${o.label}</option>`)}</select>`;
    } else if (fd.type === 'time') {
      control = html`<input id="${id}" class="input" type="time" value="${fd.value}" data-param="${fd.key}">`;
    } else {
      control = html`<div class="input-group"><input id="${id}" class="input" type="number" inputmode="decimal" value="${String(fd.value)}" min="${fd.min}" max="${fd.max}" step="${fd.step}" data-param="${fd.key}"><span class="input-addon">${fd.unit}</span></div>`;
    }
    return html`<div class="field" data-field="${fd.key}"><div class="wf-field-head"><label class="label" for="${id}">${fd.label}</label>${srcChip}</div>${control}<span class="hint">${codes(fd.hint)}</span></div>`;
  }
  function paramsCard(st) {
    return App.card({
      id: 'wf-params-card',
      title: 'Parámetros',
      sub: 'Del texto o del procedimiento · los cambios se versionan al publicar',
      icon: 'sliders',
      body: html`<div class="wf-params">${st.m.fields.map(paramInput)}</div>`
    });
  }

  function testResult(t) {
    const tone = t.lane === 'enforced' ? 'ok' : t.lane === 'hint' ? 'warn' : 'neutral';
    const label = t.lane === 'enforced' ? 'Activa este workflow en orden fijo' : t.lane === 'hint' ? 'Lo sugiere al planificador, sin imponer el orden' : 'No activa este workflow';
    return html`<div class="row">${chip(tone, `Confianza ${fmt.num(t.score, 2)}`)}<span class="small strong">${label}</span></div>
      <div class="muted small mt-1">${t.hits.length ? `Coincide en: ${fmt.list(t.hits)}` : 'Sin coincidencias con las frases del workflow'}</div>`;
  }
  function phrasesCard(st) {
    const t = st.res.test || st.m.test;
    return App.card({
      id: 'wf-phrases-card',
      title: 'Frases que lo activan',
      sub: `Desde ${fmt.num(MIN_MATCH, 2)} de confianza lo sugiere; desde ${fmt.num(ENFORCE_MIN, 2)} lo ejecuta en orden fijo`,
      icon: 'message-square',
      body: html`<ul class="wf-scen">${st.m.scenarios.map((s) => html`<li>${icon('message-square', 15)}<span>${upperFirst(s)}</span></li>`)}</ul>
        <div class="wf-subhead">Probar una frase</div>
        <div class="wf-test"><input id="wf-test-input" class="input" type="text" value="${window.CN_I18N ? CN_I18N.text(t.phrase) : t.phrase}" aria-label="Frase de prueba" spellcheck="false"><button type="button" class="btn btn-secondary" data-action="test">${icon('search', 16)}<span>Probar</span></button></div>
        <div class="wf-test-result" id="wf-test-result">${testResult(t)}</div>`
    });
  }

  function publishedListCard() {
    const list = (App.state.workflows || []).slice().reverse();
    const goFor = (w) => (DOMAINS[w.template] ? DOMAINS[w.template] : null);
    return App.card({
      id: 'wf-list',
      title: `Workflows publicados en ${SPACE}`,
      sub: list.length ? `${fmt.plural(list.length, 'workflow activo', 'workflows activos')} en esta sesión` : 'Ninguno todavía en esta sesión',
      icon: 'layers',
      flush: true,
      body: list.length ? App.table({
        rows: list,
        dense: true,
        cols: [
          { label: 'Workflow', width: '28%', render: (w) => html`<span class="strong">${w.name}</span><span class="sub wf-slug">${w.slug || w.id}</span>` },
          { label: 'Versión', width: '10%', render: (w) => chip({ tone: 'ok', icon: 'check', label: w.version }) },
          { label: 'Disparador', render: (w) => (w.trigger && w.trigger.label) || '—' },
          { label: 'Aprobación', width: '20%', render: (w) => w.approver || html`<span class="muted">Sin aprobación</span>` },
          { label: 'Publicado', width: '10%', render: (w) => html`<span class="nowrap">${fmt.time(w.publishedAt)}</span><span class="sub">${fmt.dayMonth(w.publishedAt)}</span>` },
          { label: '', width: '12%', render: (w) => (goFor(w) ? html`<button type="button" class="btn btn-ghost btn-sm" data-go="${goFor(w).go}">Probar${icon('arrow-right', 15)}</button>` : '') }
        ]
      }) : html`<div class="card-body"><p class="muted small">Aún no hay workflows publicados. Crea uno a partir de un procedimiento y publícalo para que se ejecute solo cuando se cumpla su disparador.</p></div>`
    });
  }

  /* ================================================================ Registro de interpretación */

  function streamSteps(m, vs) {
    const words = wordCount(m.text);
    const sentences = sentenceCount(m.text);
    const chain = html`${m.steps.map((s, i) => html`${i ? icon('arrow-right', 12) : ''}<span class="wf-cap">${s.cap}</span>`)}`;
    const checkLines = m.checks.filter((c) => c.stream).map((c) => ({ agent: AGENT, system: c.stream.system, action: c.stream.action, result: c.stream.result, ms: c.stream.ms, tone: c.tone === 'warn' ? 'warn' : 'ok' }));
    const t = m.test;
    const lane = t.lane === 'enforced' ? 'orden fijo' : t.lane === 'hint' ? 'sugerencia' : 'no lo activa';
    return [
      { agent: AGENT, system: 'Prodigy', action: 'Lee el procedimiento escrito', result: `${fmt.plural(words, 'palabra', 'palabras')} · ${fmt.plural(sentences, 'frase', 'frases')} · castellano`, ms: 40 },
      { agent: AGENT, system: 'Modelo de lenguaje', action: 'Identifica disparador, pasos, aprobación y salidas (1 llamada)', result: `${m.trigger.fullLabel} · ${fmt.plural(m.steps.length, 'paso', 'pasos')} · ${m.approval ? '1 aprobación' : 'sin aprobación'}`, ms: 2350 },
      { agent: AGENT, system: 'Prodigy', action: `Asigna cada paso a un agente del espacio (${CATALOG_N} activos)`, result: chain, ms: 70 },
      ...checkLines,
      { agent: AGENT, system: 'Prodigy', action: 'Redacta las frases que lo activan y prueba la activación', result: `«${clip(t.phrase, 60)}» · confianza ${fmt.num(t.score, 2)} · ${lane}`, ms: 820, tone: t.lane === 'enforced' ? 'ok' : 'warn' },
      { agent: AGENT, system: 'Prodigy', action: 'Guarda el borrador, sin publicar', result: vs && vs.published ? `${m.slug} · sin cambios respecto a la v${vs.n} publicada` : `${m.slug} · v${vs ? vs.n : 1} · borrador`, ms: 110, tone: 'ok' }
    ];
  }
  function rejectSteps(I, text) {
    const cat = OUT_OF_SCOPE.find((o) => o.id === I.category) || NOT_BUILT[I.category] || NOT_BUILT['no-reconocido'];
    const words = wordCount(text);
    return [
      { agent: AGENT, system: 'Prodigy', action: 'Lee el procedimiento escrito', result: `${fmt.plural(words, 'palabra', 'palabras')} · castellano`, ms: 40 },
      { agent: AGENT, system: 'Modelo de lenguaje', action: 'Identifica disparador, pasos, aprobación y salidas (1 llamada)', result: cat.title, ms: 1900, tone: 'warn' },
      { agent: AGENT, system: 'Prodigy', action: `Busca agentes del espacio para esos pasos (${CATALOG_N} activos)`, result: 'Ninguno corresponde: no se crea ningún workflow', ms: 60, tone: 'warn' }
    ];
  }

  /* ================================================================ Acciones */

  function patchMap(ctx, key, tab, value) {
    const cur = Object.assign({}, ctx.local[key] || {});
    if (value === undefined) delete cur[tab]; else cur[tab] = value;
    ctx.setLocal({ [key]: cur });
  }

  async function create(ctx) {
    if (ctx.vars.busy) return;
    const tab = tabOf(ctx.local);
    const ta = ctx.$('#wf-input');
    const text = String(ta ? ta.value : textFor(ctx.local, tab)).replace(/\s+$/, '').replace(/^\s+/, '');
    if (wordCount(text) < 3) {
      App.toast('Escribe el procedimiento: cuándo se activa y qué pasos debe dar.', { tone: 'warn' });
      if (ta) ta.focus();
      return;
    }
    patchMap(ctx, 'texts', tab, text === TEMPLATES[tab].text ? undefined : text);
    ctx.vars.busy = true;
    const prevStatus = status(App.state);
    App.audit('Workflow solicitado', `Plantilla «${TEMPLATES[tab].label}» · ${fmt.plural(wordCount(text), 'palabra', 'palabras')}`);
    ctx.$$('[data-action="create"]').forEach((b) => { b.disabled = true; b.classList.add('is-busy'); b.innerHTML = String(html`<span class="spinner"></span><span>Interpretando…</span>`); });
    ctx.$$('[data-seg="wf-plantilla"] .seg-btn, [data-action="restore"], [data-action="cancel-edit"]').forEach((b) => { b.disabled = true; });
    if (ta) ta.readOnly = true;
    const I = interpret(text);
    const m = I.ok ? modelFor(text, {}) : null;
    const vs = m ? versionState(m, publishedFor(m.slug)) : null;
    const host = ctx.$('#wf-interp');
    host.innerHTML = '<div class="card-body"><div id="wf-stream" class="wf-stream"></div></div>';
    const card = ctx.$('#wf-interp-card');
    if (card && window.innerWidth < 1024) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    ctx.presenter({ next: 'Mientras interpreta: «lee el texto, asigna cada paso a un agente y lo contrasta con PNT-CAL-012 y PNT-CAL-015». «Acelerar» si hace falta.' });
    const startedAt = App.nowISO();
    const run = App.reasoningStream(ctx.$('#wf-stream'), m ? streamSteps(m, vs) : rejectSteps(I, text), { title: `${AGENT} · interpretación`, signal: ctx.signal, maxHeight: 420, start: startedAt });
    const res = await run.done;
    if (!ctx.alive()) return;
    ctx.vars.busy = false;
    patchMap(ctx, 'editing', tab, undefined);
    if (m) {
      patchMap(ctx, 'results', tab, { kind: 'draft', text, createdAt: App.nowISO(), startedAt, ms: res.ms, params: {}, test: null });
      if (vs.published) {
        App.audit('Workflow sin cambios', `${m.slug} · coincide con la v${vs.n} publicada`, AGENT_ACTOR);
        App.toast(`Sin cambios: coincide con la v${vs.n} publicada`, { tone: 'info' });
      } else {
        App.audit('Borrador de workflow creado', `${m.slug} · v${vs.n} · ${m.steps.map((s) => s.cap).join(', ')}${m.approval ? ` · aprueba ${m.approval.role}` : ''}`, AGENT_ACTOR);
        App.toast(`Borrador v${vs.n} creado en ${fmt.ms(res.ms)} · revísalo y publícalo`, { tone: 'ok' });
      }
    } else {
      const cat = OUT_OF_SCOPE.find((o) => o.id === I.category) || NOT_BUILT[I.category] || NOT_BUILT['no-reconocido'];
      patchMap(ctx, 'results', tab, { kind: 'rejected', text, category: I.category, at: App.nowISO(), ms: res.ms });
      patchMap(ctx, 'texts', tab, text);
      App.audit('Workflow no creado', `${cat.title} · «${clip(text, 90)}»`, AGENT_ACTOR);
      App.toast(`No se ha creado ningún workflow: ${lowerFirst(cat.title)}`, { tone: 'warn' });
    }
    ctx.presenter(null);
    ctx.rerender();
    if (prevStatus.phase === 'idle' || prevStatus.phase === 'rejected') {
      requestAnimationFrame(() => { const el = ctx.$('#wf-interp-card'); if (el && window.innerWidth < 1024) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    }
  }

  async function publish(ctx) {
    if (ctx.vars.busy) return;
    const st = status(App.state);
    if (st.phase !== 'draft') return;
    const m = st.m;
    const vs = st.vs;
    const summary = html`<div class="stack stack-sm">
      ${App.kv([
        ['Workflow', html`<strong>${m.name}</strong>`],
        ['Identificador', html`<span class="wf-slug">${m.slug}</span>`],
        ['Versión', `v${vs.n}${st.pub ? ` (sustituye a la ${st.pub.version})` : ''}`],
        ['Disparador', m.trigger.fullLabel],
        ['Pasos', m.steps.map((s) => s.agent).join(', ')],
        ['Aprobación', m.approval ? m.approval.role : 'No necesita'],
        ['Ejecución', `Orden fijo cuando la confianza es de ${fmt.num(ENFORCE_MIN, 2)} o más`]
      ])}
      ${vs.changes.length ? App.callout({ tone: 'brand', icon: 'git-branch', title: 'Cambios', body: html`<ul class="wf-changes">${vs.changes.map((c) => html`<li>${c}</li>`)}</ul>` }) : ''}
    </div>`;
    let reason = null;
    if (m.deviations.length) {
      reason = await App.promptText({
        title: `Publicar workflow · v${vs.n}`,
        kicker: 'Desviación respecto al procedimiento',
        text: `${m.deviations.map((d) => d.short || d.text).join(' ')} Indica el motivo: queda en el registro de auditoría junto a la versión publicada.`,
        label: 'Motivo de la desviación',
        required: true,
        confirmLabel: 'Publicar workflow'
      });
      if (reason == null) return;
    } else {
      const ok = await App.confirm({ title: `Publicar workflow · v${vs.n}`, kicker: `Espacio ${SPACE}`, body: summary, confirmLabel: 'Publicar workflow', icon: 'upload' });
      if (!ok) return;
    }
    if (!ctx.alive()) return;
    const at = App.nowISO();
    const nodes = m.nodes.slice(1);
    const entry = {
      id: m.slug,
      slug: m.slug,
      name: m.name,
      version: `v${vs.n}`,
      versionNumber: vs.n,
      status: 'published',
      template: m.domain,
      trigger: Object.assign({ system: m.trigger.system, type: m.trigger.type, label: m.trigger.fullLabel, text: m.trigger.text },
        m.domain === 'cadena-frio' ? { threshold: m.p.threshold, minutes: m.p.minutes, critical: m.p.critical, scope: m.trigger.scope } : {},
        m.domain === 'parte-diario' ? { time: m.p.time } : {}),
      steps: nodes.map((n) => (n.id === 'approval'
        ? { id: 'approval', label: `Aprobación · ${m.approval.role}`, kind: 'approval', systems: [], approver: m.approval.role, policy: m.approval.policy }
        : { id: n.id, capability: n.id, label: n.label, kind: 'agent', systems: n.systems.slice(), sub: n.sub })),
      approver: m.approval ? m.approval.role : null,
      params: Object.assign({}, m.contractParams),
      outputs: m.outputs.map((o) => o.text),
      scenarios: m.scenarios.slice(),
      ordered: true,
      enforce: true,
      enabled: true,
      publishedAt: at,
      publishedBy: ROLE.quality_shift,
      sourceText: m.text,
      sig: m.sig,
      versions: ((st.pub && st.pub.versions) || []).concat([{ version: `v${vs.n}`, publishedAt: at, changes: vs.changes.slice(), reason: reason || null }])
    };
    App.update((s) => {
      const i = s.workflows.findIndex((w) => w && (w.slug === m.slug || w.id === m.slug));
      if (i >= 0) s.workflows[i] = entry; else s.workflows.push(entry);
    });
    const detail = `${m.slug} · v${vs.n} · ${m.trigger.fullLabel} · ${m.steps.map((s) => s.cap).join(', ')}${m.approval ? ` · aprueba ${m.approval.role}` : ''}${reason ? ` · motivo de la desviación: ${reason}` : ''}`;
    App.audit(st.pub ? 'Workflow actualizado' : 'Workflow publicado', detail);
    App.toast(`Workflow publicado · v${vs.n}`, { tone: 'ok', icon: 'check-circle', action: m.dom ? { label: 'Probar', onClick: () => App.go(m.dom.go) } : undefined });
    ctx.rerender();
    requestAnimationFrame(() => { const el = ctx.$('#wf-card'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }

  function changeParam(ctx, el) {
    const st = status(App.state);
    if (!st.m || ctx.vars.busy) return;
    const key = el.getAttribute('data-param');
    const fd = st.m.fields.find((x) => x.key === key);
    if (!fd) return;
    let v = el.value;
    let problem = null;
    if (fd.type === 'number') {
      v = parseFloat(String(v).replace(',', '.'));
      if (!Number.isFinite(v)) problem = 'Escribe un número.';
      else if (v < fd.min || v > fd.max) problem = `Debe estar entre ${fmt.num(fd.min)} y ${fmt.num(fd.max)} ${fd.unit}.`;
      else if (key === 'minutes' || key === 'ack' || key === 'days' || key === 'months') v = Math.round(v);
      if (!problem && key === 'threshold' && v >= st.m.p.critical) problem = `Debe quedar por debajo de la excursión crítica (${fmt.temp(st.m.p.critical)}).`;
      if (!problem && key === 'critical' && v <= st.m.p.threshold) problem = `Debe quedar por encima del umbral (${fmt.temp(st.m.p.threshold)}).`;
    } else if (fd.type === 'time') {
      if (!/^\d{2}:\d{2}$/.test(v)) problem = 'Indica la hora con el formato hh:mm.';
    }
    if (problem) {
      App.toast(`${fd.name || fd.label}: ${problem}`, { tone: 'warn' });
      el.value = String(fd.value);
      return;
    }
    if (String(v) === String(fd.value)) return;
    const before = fd.fmtv(fd.value);
    const params = Object.assign({}, st.res.params, { [key]: v });
    const base = interpret(st.res.text);
    if (base.ok && String(base.values[key]) === String(v)) delete params[key];
    patchMap(ctx, 'results', st.tab, Object.assign({}, st.res, { params, test: null }));
    App.audit('Parámetro de workflow modificado', `${st.m.slug} · ${fd.name || fd.label}: de ${before} a ${fd.fmtv(v)}`);
    const y = window.scrollY;
    ctx.rerender();
    window.scrollTo(0, y);
  }

  function runTest(ctx) {
    const st = status(App.state);
    if (!st.m) return;
    const input = ctx.$('#wf-test-input');
    const phrase = input ? input.value.trim() : '';
    if (!phrase) return;
    const t = scoreFor(st.m.domain, phrase, st.m.trigger.text);
    patchMap(ctx, 'results', st.tab, Object.assign({}, st.res, { test: t }));
    App.audit('Prueba de activación', `${st.m.slug} · «${clip(phrase, 90)}» · confianza ${fmt.num(t.score, 2)} · ${t.lane === 'enforced' ? 'orden fijo' : t.lane === 'hint' ? 'sugerencia' : 'no lo activa'}`);
    const box = ctx.$('#wf-test-result');
    if (box) box.innerHTML = String(testResult(t));
  }

  function downloadDefinition(ctx) {
    const st = status(App.state);
    if (!st.m) return;
    App.downloadFile(`${st.m.slug}-v${st.vs.n}.yaml`, 'text/yaml', `${yamlText(st.m, st.vs)}\n`);
  }

  function focusRefs(ctx, refs) {
    const want = new Set(refs);
    ctx.$$('.wf-map-item[data-ref], .wf-text mark[data-ref]').forEach((el) => {
      const on = el.getAttribute('data-ref').split(' ').some((r) => want.has(r));
      el.classList.toggle('is-focus', on);
    });
    ctx.$$('#wf-graph [data-node]').forEach((g) => g.classList.toggle('is-focus', want.has(g.getAttribute('data-node'))));
  }

  /* ================================================================ Registro de la escena */

  App.scene({
    id: 'workflow',
    order: 20,
    section: 'Automatización',
    nav: 'De palabras a workflow',
    title: 'De palabras a workflow',
    icon: 'workflow',
    // Acceso de solo lectura para las pruebas (tests/workflow.cjs): App.scenes().find((s) => s.id === 'workflow').debug
    debug: { interpret, modelFor, scoreFor, templates: TEMPLATES },
    presenter: {
      say: (state) => {
        const st = status(state);
        if (st.phase === 'rejected') {
          return [
            'Si el texto pide algo fuera de su alcance, Prodigy no se inventa un workflow: explica por qué y no guarda nada.',
            'Solo encadena agentes habilitados en el espacio de Calidad; la petición queda igualmente en auditoría.'
          ];
        }
        if (st.phase === 'published') {
          const cold = st.m.domain === 'cadena-frio';
          return [
            `Publicado como ${st.pub.version} y registrado en auditoría: quién, cuándo y qué versión.`,
            cold ? `Desde ahora, una alarma de temperatura de Galileo/SCADA lo dispara sola. Lo vemos con la alarma real de esta mañana: ${CH.code}, ${EXC.start}.` : 'Desde ahora se ejecuta solo cuando se cumple el disparador.',
            'Si mañana Calidad cambia el procedimiento, se edita el texto o un parámetro y se publica la v2: la anterior queda en el historial.'
          ];
        }
        if (st.phase === 'draft') {
          const cold = st.m.domain === 'cadena-frio';
          return [
            cold ? `Cada frase está enlazada con lo que ha entendido: el disparador sale de «supere ${fmt.temp(st.m.p.threshold)} durante más de ${fmt.num(st.m.p.minutes)} minutos».` : 'Cada frase del texto está enlazada con lo que ha entendido: disparador, pasos y aprobación.',
            cold ? 'Cada paso dice qué sistema toca: Galileo para la temperatura; SAP, Mapex y Easy WMS para palés y lotes; SAP QM para el bloqueo; Elara y Teams para la incidencia.' : 'Cada paso dice qué agente lo hace y qué sistema toca.',
            'El bloqueo no se aplica sin la aprobación de Calidad: lo exige PNT-CAL-015 y el workflow lo respeta aunque el texto no lo dijera.',
            'Los parámetros se ajustan aquí y se contrastan con el procedimiento. Si preguntan por los límites: escribir «Compra acciones de una eléctrica cuando baje la luz» y pulsar «Crear workflow».'
          ];
        }
        return [
          'Así escribe Calidad un procedimiento: en castellano, como en su PNT. No hay que dibujar ni programar nada.',
          'Prodigy lo convierte en un workflow de la plataforma: disparador, agentes en orden, aprobación humana y salidas, cada uno enlazado a su frase.',
          'Honestidad: el generador desde texto se simula aquí y su integración en Prodigy se valida en el piloto; los workflows (Routines), el editor, la aprobación y la auditoría son de serie.'
        ];
      },
      next: (state) => {
        const st = status(state);
        if (st.phase === 'rejected') return 'Pulsar «Restaurar plantilla» y crear el workflow de cadena de frío.';
        if (st.phase === 'published') return st.m.dom ? `Pulsar «${st.m.dom.goLabel}».` : 'Pasar a la siguiente escena con la flecha derecha.';
        if (st.phase === 'draft') return 'Señalar una frase resaltada y su paso en el diagrama; después, «Publicar workflow».';
        return 'Pulsar «Crear workflow» con el texto de cadena de frío.';
      }
    },
    render(root, ctx) {
      const st = status(App.state);
      const tab = st.tab;
      const L = ctx.local;
      const published = (App.state.workflows || []).length;
      let actions = '';
      if (st.phase === 'draft') actions = html`<button type="button" class="btn btn-primary" data-action="publish">${icon('upload')}<span>Publicar workflow</span></button>`;
      if (st.phase === 'published' && st.m.dom) actions = html`<button type="button" class="btn btn-primary" data-go="${st.m.dom.go}">${icon('play')}<span>${st.m.dom.goLabel}</span></button>`;
      const ready = st.phase === 'draft' || st.phase === 'published';
      root.innerHTML = String(html`
        ${App.pageHead({
          title: 'Nuevo workflow a partir de un procedimiento',
          meta: [
            { icon: 'user', text: ROLE.quality_shift },
            { icon: 'layers', text: `Espacio ${SPACE}` },
            { icon: 'workflow', text: fmt.plural(published, 'workflow publicado', 'workflows publicados') }
          ],
          actions
        })}
        <div class="grid cols-2 wf-top">${editorCard(tab, L, st)}${interpCard(st)}</div>
        ${ready ? html`<div class="section">${workflowCard(st, L.view)}</div>
          <div class="grid cols-2 section">${paramsCard(st)}${phrasesCard(st)}</div>` : ''}
        <div class="section">${publishedListCard()}</div>
      `);

      const log = ctx.$('#wf-log');
      if (log && ready) App.reasoningStream(log, streamSteps(st.m, st.vs), { title: `${AGENT} · interpretación`, instant: true, start: st.res.startedAt || st.res.createdAt, maxHeight: 420 });

      ctx.on('segchange', '[data-seg="wf-plantilla"]', (e) => {
        if (ctx.vars.busy) return;
        const ta = ctx.$('#wf-input');
        if (ta && !ta.readOnly) patchMap(ctx, 'texts', tabOf(ctx.local), ta.value === TEMPLATES[tabOf(ctx.local)].text ? undefined : ta.value);
        ctx.setLocal({ tab: e.detail.value });
        ctx.rerender();
      });
      ctx.on('input', '#wf-input', (e, el) => {
        const t = tabOf(ctx.local);
        patchMap(ctx, 'texts', t, el.value);
        const c = ctx.$('#wf-count');
        if (c) c.textContent = previewText(el.value, t);
      });
      ctx.on('keydown', '#wf-input', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); create(ctx); } });
      ctx.on('click', '[data-action="create"]', () => create(ctx));
      ctx.on('click', '[data-action="publish"]', () => publish(ctx));
      ctx.on('click', '[data-action="edit"]', () => {
        const s = status(App.state);
        if (!s.res) return;
        patchMap(ctx, 'texts', s.tab, s.res.text);
        patchMap(ctx, 'editing', s.tab, true);
        ctx.rerender();
        requestAnimationFrame(() => { const ta = ctx.$('#wf-input'); if (ta) ta.focus(); });
      });
      ctx.on('click', '[data-action="cancel-edit"]', () => {
        const s = status(App.state);
        if (s.res) patchMap(ctx, 'texts', s.tab, s.res.text);
        patchMap(ctx, 'editing', s.tab, undefined);
        ctx.rerender();
      });
      ctx.on('click', '[data-action="restore"]', () => {
        if (ctx.vars.busy) return;
        const t = tabOf(ctx.local);
        patchMap(ctx, 'texts', t, undefined);
        patchMap(ctx, 'results', t, undefined);
        patchMap(ctx, 'editing', t, undefined);
        App.audit('Plantilla restaurada', `«${TEMPLATES[t].label}»`);
        ctx.rerender();
      });
      ctx.on('click', '[data-action="test"]', () => runTest(ctx));
      ctx.on('keydown', '#wf-test-input', (e) => { if (e.key === 'Enter') { e.preventDefault(); runTest(ctx); } });
      ctx.on('click', '[data-action="download-def"]', () => downloadDefinition(ctx));
      ctx.on('change', '[data-param]', (e, el) => changeParam(ctx, el));
      ctx.on('tabchange', '[data-tabs="wf-tabs"]', (e) => ctx.setLocal({ view: e.detail.tab }));
      ctx.on('click', '.wf-map-item[data-ref]', (e, el) => focusRefs(ctx, el.getAttribute('data-ref').split(' ')));
      ctx.on('keydown', '.wf-map-item[data-ref]', (e, el) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focusRefs(ctx, el.getAttribute('data-ref').split(' ')); } });
      ctx.on('click', '.wf-text mark[data-ref]', (e, el) => focusRefs(ctx, el.getAttribute('data-ref').split(' ')));
      ctx.on('click', '#wf-graph [data-node]', (e, el) => focusRefs(ctx, [el.getAttribute('data-node')]));
    }
  });
})();
