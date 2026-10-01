/*
 * Escena «plataforma» · Cómo encaja Prodigy en Congelados de Navarra (SPEC §4.8).
 *  - Diagrama de arquitectura en SVG propio, con dos disposiciones (ancha y vertical, según el ancho disponible), que
 *    cambia con el despliegue y el modelo de lenguaje elegidos: con un modelo local, el modelo entra en su infraestructura.
 *  - Decisiones de despliegue, modelo, acceso, aprobación y auditoría, coste por petición y límites; preguntas de Sistemas.
 *  - Tabla «Hoy en la demo · En un piloto» con el origen de cada pieza (de serie, construida para la demo, a construir).
 *  - Piloto de 6–8 semanas (casos A y B del brief): plan, criterios de aceptación, aportaciones y propuesta imprimible.
 *  - Calculadora de horas con supuestos editables (sin importes) y registro de auditoría completo (JSON y CSV).
 * Cada elección queda en App.state.scenes.plataforma y en el registro de auditoría.
 */
(function () {
  'use strict';

  const { html, icon, fmt, chip } = App;
  const D = window.CN_DATA;
  const ROLE = D.roles;
  const ACTOR = ROLE.quality_shift;

  const TAB_IDS = ['arquitectura', 'piloto', 'horas', 'registro'];
  const DEFAULTS = { tab: 'arquitectura', deploy: 'cpd', llm: 'azure', pilotCase: 'A', auditFilter: 'all' };
  const PROC_CODES = Object.keys(D.procedures);
  const SYSTEM_NAMES = ['SAP', D.meta.systems.mes, D.meta.systems.aps, D.meta.systems.wms, D.meta.systems.scada, 'Elara'];

  /* ---------------------------------------------------------------- Opciones de arquitectura */

  const DEPLOY = {
    cpd: {
      seg: 'CPD propio',
      label: 'CPD propio · máquina virtual con Docker Compose',
      zone: 'CPD de Congelados de Navarra · VM con Docker Compose',
      text: 'Una máquina virtual en su CPD con Docker Compose: aplicación, base de datos Postgres y almacén vectorial Qdrant.'
    },
    k8s: {
      seg: 'Kubernetes',
      label: 'Kubernetes · Helm',
      zone: 'Clúster Kubernetes de Congelados de Navarra · Helm',
      text: 'Despliegue con Helm en su clúster Kubernetes: aplicación, base de datos Postgres y almacén vectorial Qdrant.'
    },
    cloud: {
      seg: 'Nube propia',
      label: 'Nube de Congelados de Navarra (Azure, AWS o GCP)',
      zone: 'Suscripción en la nube de Congelados de Navarra (Azure, AWS o GCP)',
      text: 'La misma instalación en su suscripción de nube, en la región que elijan.'
    }
  };
  const LLM = {
    azure: {
      seg: 'Azure OpenAI',
      name: 'Azure OpenAI',
      local: false,
      place: 'Región UE, con el contrato de Congelados de Navarra',
      exit: 'Sale de su red solo el texto de cada petición',
      note: 'Conexión por la pasarela LiteLLM de Prodigy; se confirma en las semanas 1–2.'
    },
    gemini: {
      seg: 'Gemini',
      name: 'Google Gemini',
      local: false,
      place: 'Con la cuenta y la región que contrate Congelados de Navarra',
      exit: 'Sale de su red solo el texto de cada petición',
      note: 'Proveedor incluido de serie en el catálogo de modelos de Prodigy.'
    },
    local: {
      seg: 'Modelo local',
      name: 'Modelo local',
      local: true,
      place: 'Servidor con GPU en su CPD (Ollama, LM Studio o llama.cpp)',
      exit: 'La inferencia se ejecuta dentro de su red',
      note: 'La calidad y la velocidad se dimensionan con su servidor. Sistemas revisa también los flujos de conectores y telemetría.'
    }
  };

  const PEOPLE = [ROLE.quality_shift, ROLE.quality_plant, ROLE.dispatch_shift, ROLE.refrigeration_maintenance, ROLE.line_maintenance];
  const PEOPLE_SHORT = ['Calidad de turno', 'Calidad de planta', ROLE.dispatch_shift, ROLE.refrigeration_maintenance, ROLE.line_maintenance];

  const MODULES = [
    { icon: 'workflow', title: 'Workflows (Routines)', text: 'Editor visual, versiones y prueba en seco' },
    { icon: 'cpu', title: 'Agentes de planta', text: 'Cadena de frío, trazabilidad, bloqueo, reclamaciones y parte diario' },
    { icon: 'user-check', title: 'Aprobación humana', text: 'Nada se escribe en un sistema sin su responsable', approval: true },
    { icon: 'book-open', title: 'Procedimientos con citas', text: 'Cada respuesta enlaza su fuente; sin fuente, lo dice' },
    { icon: 'history', title: 'Registro de auditoría', text: 'De solo añadir y exportable' },
    { icon: 'key', title: 'Permisos por rol y realm', text: 'Cada planta o departamento ve lo suyo' },
    { icon: 'gauge', title: 'Coste por petición', text: 'Estimación en USD y presupuesto por realm' },
    { icon: 'shield', title: 'Pasarela de modelos', text: 'Enmascara datos personales antes del modelo', gateway: true }
  ];

  const TILES = [
    { name: 'SAP · SAP QM', icon: 'database', text: 'Lee lotes, pedidos y expediciones. Propone el bloqueo de calidad.', write: true },
    { name: D.meta.systems.mes, icon: 'factory', text: 'Lee la producción por línea y turno.', write: false },
    { name: D.meta.systems.aps, icon: 'calendar', text: 'Lee capacidades y el plan de campaña.', write: false },
    { name: D.meta.systems.wms, icon: 'warehouse', text: 'Lee palés, ubicaciones y expediciones. Propone inmovilizar palés.', write: true },
    { name: D.meta.systems.scada, icon: 'activity', text: 'Lee temperaturas y alarmas. No actúa sobre el control de planta.', write: false },
    { name: 'Elara', icon: 'clipboard', text: 'Lee NC, reclamaciones y documentos. Prepara borradores de NC y 8D.', write: true },
    { name: 'Microsoft 365', icon: 'mail', text: 'Avisos en Teams y borradores en Outlook. El envío al cliente se aprueba.', write: true }
  ];

  /* ---------------------------------------------------------------- Demo frente a piloto y plan */

  const ORIGIN = {
    serie: () => chip('ok', 'De serie en Prodigy'),
    demo: () => chip({ tone: 'brand', label: 'Construido para esta demo' }),
    piloto: () => chip('pending', 'Se construye en el piloto'),
    datos: () => chip('neutral', 'Datos de la demo')
  };
  const ORIGIN_TEXT = { serie: 'De serie en Prodigy', demo: 'Construido para esta demo', piloto: 'Se construye en el piloto', datos: 'Datos de la demo' };

  const HONESTY = [
    { aspect: 'Consola, workflows (Routines) y editor', demo: 'Esta consola, en el navegador, con los workflows publicados en la sesión', pilot: 'Prodigy instalado en su infraestructura; Routines con editor visual, versiones y prueba en seco', origin: 'serie' },
    { aspect: 'Workflow a partir de un procedimiento escrito', demo: 'Generador simulado en el navegador, con tres plantillas', pilot: 'Se integra en Prodigy y se valida con sus procedimientos; cada workflow se revisa antes de publicarlo', origin: 'demo' },
    { aspect: 'Agentes de Congelados de Navarra', demo: 'Cadena de frío, trazabilidad, bloqueo, incidencias, reclamaciones y parte diario, sobre datos sintéticos', pilot: 'Los del caso elegido, adaptados a sus datos y procedimientos', origin: 'demo' },
    { aspect: `Conectores (${fmt.list(SYSTEM_NAMES)})`, demo: 'Simulados en el navegador', pilot: 'Lectura de 1–2 sistemas por API o réplica de base de datos de solo lectura. No hay conectores de serie para SAP, MES ni SCADA', origin: 'piloto' },
    { aspect: 'Disparo por alarma', demo: `Al abrir la alarma de ${D.chamber_c07.code}`, pilot: 'Webhook desde Galileo/SCADA o consulta periódica (cron): Prodigy no tiene planificador propio de agentes', origin: 'piloto' },
    { aspect: 'Modelo de lenguaje', demo: 'Ninguna llamada: las respuestas están preparadas', pilot: 'El que elija Congelados de Navarra (Azure OpenAI, Gemini o local), a través de la pasarela de Prodigy', origin: 'serie' },
    { aspect: 'Aprobación humana', demo: 'Tarjetas de aprobación; rechazar no aplica nada', pilot: 'Igual, con SSO y permisos por rol. En el piloto no se escribe en SAP: borradores y tickets que aprueba una persona', origin: 'serie' },
    { aspect: 'Procedimientos con citas', demo: `${PROC_CODES.length} documentos sintéticos (${fmt.list(PROC_CODES)})`, pilot: `Sus procedimientos vigentes, con permisos por realm; objetivo ≥${fmt.pct(90)} de citas correctas`, origin: 'serie' },
    { aspect: 'Registro de auditoría', demo: 'De esta sesión, guardado en el navegador y exportable a JSON o CSV', pilot: 'En la base de datos de Prodigy, de solo añadir, con la identidad SSO de cada persona; exportable a CSV', origin: 'serie' },
    { aspect: 'Coste por petición', demo: 'Estimación mostrada al final de las ejecuciones', pilot: 'Medido por petición en USD, por realm y por caso, con presupuesto diario y mensual', origin: 'serie' },
    { aspect: 'Datos y acciones', demo: 'Sintéticos y coherentes entre sí, preparados por Ciklum; las acciones no salen del navegador', pilot: 'Sus datos en modo lectura y 20–30 casos históricos, anonimizados si hace falta', origin: 'datos' }
  ];

  const CASES = {
    A: {
      label: 'Caso A',
      short: 'Caso A · Reclamación de cliente',
      title: 'Reclamación de cliente: NC, 8D y respuesta',
      systems: ['Elara', 'SAP', 'MES Mapex'],
      systemsText: 'Elara y SAP/MES Mapex',
      trigger: 'Correo entrante en el buzón de Calidad (Outlook)',
      output: 'Ficha de la reclamación, traza del lote, borrador de NC y 8D y respuesta en el idioma del cliente, para aprobar',
      scene: 'reclamacion',
      sceneLabel: `Reclamación ${D.complaint.code}`,
      accuracy: `≥${fmt.pct(90)} de 30 reclamaciones históricas bien extraídas (lote, producto, defecto y plazo)`,
      accuracyHow: 'Comparación con el registro de Calidad en Elara'
    },
    B: {
      label: 'Caso B',
      short: 'Caso B · Excursión de temperatura',
      title: 'Excursión de temperatura: lotes, bloqueo con aprobación e incidencia',
      systems: [D.meta.systems.scada, D.meta.systems.wms],
      systemsText: 'temperaturas de Galileo/SCADA y Mecalux Easy WMS',
      trigger: 'Alarma de Galileo/SCADA por webhook o consulta periódica (cron)',
      output: 'Palés y lotes afectados, propuesta de bloqueo para aprobar, borrador de incidencia y aviso en Teams',
      scene: 'alarma',
      sceneLabel: `Alarma ${D.chamber_c07.code}`,
      accuracy: `${fmt.pct(100)} de palés y lotes afectados identificados en 20 escenarios`,
      accuracyHow: 'Comparación con los movimientos de Easy WMS de cada escenario'
    }
  };

  const PHASES = [
    { from: 1, to: 2, title: 'Accesos, instalación y línea base', detail: 'Accesos de lectura, instalación y medición del tiempo actual', result: 'Criterios firmados y línea base medida' },
    { from: 3, to: 5, title: 'Conectores, agentes y workflow', detail: 'Pruebas con 20–30 casos históricos', result: 'Exactitud medida con casos históricos' },
    { from: 6, to: 7, title: 'Uso en paralelo', detail: 'Casos reales, con el proceso actual como respaldo', result: 'Aceptación de los borradores por Calidad' },
    { from: 8, to: 8, title: 'Evaluación y decisión', detail: 'Criterios medidos e informe final', result: 'Informe final y decisión' }
  ];
  const weeksText = (p) => (p.from === p.to ? `Semana ${p.from}` : `Semanas ${p.from}–${p.to}`);

  function criteria(c) {
    return [
      { name: 'Exactitud', target: c.accuracy, how: c.accuracyHow },
      { name: 'Tiempo', target: 'Traza y borrador en menos de 15 min', how: 'Cronometrado frente a la línea base de las semanas 1–2' },
      { name: 'Utilidad', target: `Calidad acepta el borrador con ediciones menores en ≥${fmt.pct(70)} de los casos`, how: 'Revisión de cada borrador por Calidad' },
      { name: 'Citas', target: `≥${fmt.pct(90)} de 50 preguntas de referencia con la cita correcta`, how: 'Herramienta de evaluación incluida en Prodigy' },
      { name: 'Control', target: `Ninguna acción sin aprobación; el ${fmt.pct(100)} en el registro de auditoría`, how: 'Revisión del registro exportado' },
      { name: 'Coste', target: 'Coste del modelo por caso medido y dentro del presupuesto del realm', how: 'Informe de coste por realm (USD, estimación)' }
    ];
  }

  const CN_GIVES = ['Responsable en Calidad y contacto de Sistemas', 'Accesos de lectura a 1–2 sistemas', '20–30 casos históricos, anonimizados si hace falta', 'Procedimientos vigentes', '2–3 h a la semana de Calidad'];
  const CIKLUM_GIVES = ['Instalación en su infraestructura', 'Conectores de lectura', 'Agentes y workflow del caso', 'Formación de los usuarios', 'Informe final con los criterios medidos'];

  const FAQ = [
    ['¿Dónde se instala?', 'En una máquina virtual de su CPD con Docker Compose o en Kubernetes con Helm, o en su suscripción de nube. No depende de servicios de Ciklum en la nube.'],
    ['¿Cómo entran los usuarios?', 'Con SSO de Microsoft Entra ID (OIDC) o SAML 2.0. Los permisos van por rol y por realm (planta o departamento).'],
    ['¿Qué datos salen de nuestra red?', 'Con un modelo local, la inferencia se ejecuta en su red. Con uno externo, se revisa el contenido enviado y el contrato. Los flujos de conectores, telemetría y enmascarado se validan con Sistemas.'],
    ['¿Hay conectores de SAP, MES o SCADA?', 'No de serie. En el piloto se construyen para 1–2 sistemas, por API o réplica de base de datos de solo lectura; la lectura de bases de datos Postgres ya funciona.'],
    ['¿Cuántos usuarios soporta?', 'La concurrencia se dimensiona y se verifica con pruebas de carga. Cada realm tiene límites de peticiones por minuto, de tokens al día y de presupuesto.'],
    ['¿En qué idioma trabaja?', 'El chat y los agentes, en español; las respuestas al cliente, en su idioma. La consola de administración de Prodigy está en inglés.'],
    ['¿Licencia y precio?', 'Se concretan en la propuesta comercial (SOW).']
  ];

  /* ---------------------------------------------------------------- Calculadora de horas */

  const CALC = [
    { id: 'reclamacion', label: 'Reclamación de cliente: NC, 8D y respuesta', who: 'Calidad de planta', scene: 'reclamacion', seen: `Reclamación ${D.complaint.code}`, n: 4, before: 180, after: 45 },
    { id: 'excursion', label: 'Excursión de temperatura: lotes, bloqueo e incidencia', who: 'Calidad de turno', scene: 'alarma', seen: `Alarma ${D.chamber_c07.code}`, n: 2, before: 150, after: 15 },
    { id: 'cuestionario', label: 'Cuestionario o pliego de cliente', who: 'Calidad de planta', scene: 'cuestionario', seen: 'Cuestionario de cliente', n: 6, before: 180, after: 60 },
    { id: 'traza', label: 'Traza completa o simulacro de retirada', who: 'Calidad de planta', scene: 'retirada', seen: 'Simulacro de retirada', n: 1, before: 180, after: 20 },
    { id: 'consultas', label: 'Consultas a procedimientos', who: 'Calidad y jefes de turno', scene: 'procedimientos', seen: 'Procedimientos', n: 40, before: 10, after: 3 },
    { id: 'parte', label: 'Parte diario de equipos', who: 'Mantenimiento y jefes de turno', scene: 'turno', seen: 'Resumen del turno', n: 22, before: 30, after: 10 }
  ];
  const CALC_KEYS = { n: 'Casos al mes', before: 'Hoy (min)', after: 'Con Prodigy (min)' };
  const CALC_AUDIT = { n: 'casos al mes', before: 'minutos hoy', after: 'minutos con Prodigy' };
  const CALC_MAX = 10000;

  function calcValues(ctx) {
    const saved = ctx.local.calc || {};
    return CALC.map((d) => Object.assign({}, d, saved[d.id] || {}));
  }
  function validNum(v) {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= CALC_MAX ? n : null;
  }
  function rowResult(r) {
    const n = validNum(r.n);
    const b = validNum(r.before);
    const a = validNum(r.after);
    if (n == null || b == null || a == null) return { state: 'invalid', hours: 0 };
    if (a > b) return { state: 'slower', hours: 0 };
    return { state: 'ok', hours: Math.round((n * (b - a) / 60) * 10) / 10 };
  }
  function calcTotals(rows) {
    const res = rows.map(rowResult);
    const month = Math.round(res.reduce((s, r) => s + r.hours, 0) * 10) / 10;
    return { res, month, year: Math.round(month * 12), days: Math.round((month * 12) / 8), excluded: res.filter((r) => r.state !== 'ok').length };
  }

  /* ---------------------------------------------------------------- Registro de auditoría */

  const isAgent = (a) => /^Prodigy\b/.test(String(a.actor || ''));
  /** Decisiones de personas: aprobaciones, rechazos y publicaciones que otras vistas dejan en el registro. */
  const isDecision = (a) => !isAgent(a) && /aprob|rechaz|publicad/i.test(String(a.action || ''));
  function sceneNav(id) { const s = App.scenes().find((x) => x.id === id); return s ? s.nav : '—'; }
  function auditCounts() {
    const list = App.auditLog();
    const agents = list.filter(isAgent).length;
    return { total: list.length, agents, persons: list.length - agents, decisions: list.filter(isDecision).length };
  }
  /** Última ejecución con coste estimado registrada en la sesión (la escribe, por ejemplo, la alarma de C-07). */
  function sessionCost() {
    const list = App.auditLog();
    for (let i = list.length - 1; i >= 0; i--) if (/coste estimado/i.test(list[i].detail || '')) return list[i];
    return null;
  }
  const fold = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function auditEntries(filter, query) {
    const q = fold(query).trim();
    return App.auditLog().filter((a) => {
      if (filter === 'people' && isAgent(a)) return false;
      if (filter === 'agents' && !isAgent(a)) return false;
      if (filter === 'decisions' && !isDecision(a)) return false;
      if (!q) return true;
      return fold(`${a.action} ${a.detail} ${a.actor} ${sceneNav(a.scene)}`).includes(q);
    });
  }

  /* ---------------------------------------------------------------- Diagrama de arquitectura (SVG) */

  const r1 = (n) => Math.round(n * 10) / 10;
  const esc = App.esc;
  const tw = (t, size, weight) => App.textWidth(t, size, weight || 400);

  function wrapLines(text, maxW, size, weight, maxLines) {
    const words = (window.CN_I18N ? CN_I18N.text(String(text || '')) : String(text || '')).split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    words.forEach((w) => {
      const t = cur ? `${cur} ${w}` : w;
      if (!cur || tw(t, size, weight) <= maxW) cur = t;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      let last = lines.slice(maxLines - 1).join(' ');
      while (last.length > 1 && tw(`${last}…`, size, weight) > maxW) last = last.slice(0, -1);
      kept[maxLines - 1] = `${last.trimEnd()}…`;
      return kept;
    }
    return lines;
  }
  function packPills(items, maxW, size, weight, padX, gap) {
    const rows = [];
    let row = [];
    let x = 0;
    items.forEach((t) => {
      const w = Math.min(maxW, Math.ceil(tw(t, size, weight)) + padX * 2);
      if (row.length && x + w > maxW) { rows.push(row); row = []; x = 0; }
      row.push({ t, x, w });
      x += w + gap;
    });
    if (row.length) rows.push(row);
    return rows;
  }

  const svg = {
    rect(x, y, w, h, cls, rx) { return `<rect class="${cls}" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${rx == null ? 8 : rx}"/>`; },
    text(x, y, t, cls, anchor) { return `<text class="${cls}" x="${r1(x)}" y="${r1(y)}"${anchor ? ` text-anchor="${anchor}"` : ''}>${esc(t)}</text>`; },
    lines(x, y, arr, cls, lh, anchor) { return arr.map((t, i) => svg.text(x, y + i * lh, t, cls, anchor)).join(''); },
    icon(name, x, y, size, cls) { return `<g class="arch-ico${cls ? ` ${cls}` : ''}">${String(App.icon(name, size)).replace('<svg ', `<svg x="${r1(x)}" y="${r1(y)}" `)}</g>`; },
    vline(x, y1, y2, cls) { return `<path class="${cls}" d="M${r1(x)},${r1(y1)} L${r1(x)},${r1(y2)}"/>`; },
    hline(x1, x2, y, cls) { return `<path class="${cls}" d="M${r1(x1)},${r1(y)} L${r1(x2)},${r1(y)}"/>`; },
    head(x, y, dir, cls) {
      const k = { up: [[-4.5, 8], [4.5, 8]], down: [[-4.5, -8], [4.5, -8]], left: [[8, -4.5], [8, 4.5]], right: [[-8, -4.5], [-8, 4.5]] }[dir];
      return `<path class="${cls}" d="M${r1(x + k[0][0])},${r1(y + k[0][1])} L${r1(x)},${r1(y)} L${r1(x + k[1][0])},${r1(y + k[1][1])} Z"/>`;
    },
    mark(x, y, size) {
      return `<g class="arch-mark" transform="translate(${r1(x)},${r1(y)}) scale(${r1(size / 26 * 100) / 100})"><rect class="bm-bg" width="26" height="26" rx="6"/><path class="bm-line" d="M8.5 8.5 17.5 13 8.5 17.5"/><circle class="bm-dot" cx="8.5" cy="8.5" r="2.6"/><circle class="bm-dot" cx="17.5" cy="13" r="2.6"/><circle class="bm-dot" cx="8.5" cy="17.5" r="2.6"/></g>`;
    }
  };

  const tileTip = (t) => `${t.name} · conector de demostración · ${t.write ? 'lectura; escritura solo tras aprobación humana' : 'solo lectura'}`;
  const modTip = (m) => `${m.title}: ${m.text}`;

  function ariaText(st) {
    const llm = LLM[st.llm];
    const dep = DEPLOY[st.deploy];
    return `Arquitectura: las personas entran con SSO a Prodigy, instalado en ${dep.zone}. Módulos: ${MODULES.map((m) => m.title).join(', ')}. `
      + `Modelo de lenguaje: ${llm.name}, ${llm.local ? 'dentro de su infraestructura' : 'fuera de su infraestructura'}; ${llm.exit.toLowerCase()}. `
      + `Conectores de lectura con ${TILES.map((t) => t.name).join(', ')}; escritura solo tras aprobación en ${TILES.filter((t) => t.write).map((t) => t.name).join(', ')}.`;
  }

  /** Disposición ancha (proyector y escritorio): personas arriba, Prodigy en su infraestructura con el modelo a la derecha, sistemas abajo. */
  function archWide(st) {
    const llm = LLM[st.llm];
    const dep = DEPLOY[st.deploy];
    const W = 980;
    const P = 10;
    const back = [];
    const o = [];

    // Personas por rol
    const bx = P;
    const by = P;
    const bw = W - 2 * P;
    const labelW = 250;
    const pillRows = packPills(PEOPLE, bw - labelW - 16, 11.5, 600, 10, 6);
    const pillsH = pillRows.length * 24 + (pillRows.length - 1) * 6;
    const bh = Math.max(64, pillsH + 28);
    const bcy = by + bh / 2;
    o.push(svg.rect(bx, by, bw, bh, 'arch-band'));
    o.push(svg.icon('users', bx + 16, bcy - 13, 18));
    o.push(svg.text(bx + 44, bcy - 2, 'Personas por rol', 'arch-h'));
    o.push(svg.text(bx + 44, bcy + 15, 'Acceso con SSO · Microsoft Entra ID', 'arch-sub'));
    pillRows.forEach((row, ri) => row.forEach((p) => {
      const x = bx + labelW + p.x;
      const y = by + (bh - pillsH) / 2 + ri * 30;
      o.push(svg.rect(x, y, p.w, 24, 'arch-pill', 12));
      o.push(svg.text(x + p.w / 2, y + 16, p.t, 'arch-pill-t', 'middle'));
    }));

    // Prodigy (dentro de la infraestructura de CN) y modelo de lenguaje
    const lw = 190;
    const lx = W - P - 16 - lw;
    const px = P + 16;
    const pRight = lx - 44;
    const pw = pRight - px;
    const zoneY = by + bh + 44;
    const py = zoneY + 34;
    const pad = 14;
    const gap = 10;
    const colW = (pw - pad * 2 - gap * 3) / 4;
    const mods = MODULES.map((m) => {
      const tl = wrapLines(m.title, colW - 42, 12.5, 600, 2);
      const dl = wrapLines(m.text, colW - 20, 11, 400, 4);
      return { m, tl, dl, h: 10 + Math.max(16, tl.length * 15) + 6 + dl.length * 14 + 8 };
    });
    const headH = 46;
    const rowH = [0, 1].map((r) => Math.max.apply(null, mods.slice(r * 4, r * 4 + 4).map((x) => x.h)));
    const ph = headH + 12 + rowH[0] + gap + rowH[1] + pad;
    o.push(svg.rect(px, py, pw, ph, 'arch-prodigy', 10));
    o.push(svg.mark(px + 14, py + 12, 22));
    o.push(svg.text(px + 44, py + 28, 'Prodigy', 'arch-brand'));
    o.push(svg.text(px + 44 + tw('Prodigy', 15, 700) + 12, py + 28, 'Capa de agentes encima de sus sistemas · no sustituye ninguno', 'arch-sub'));
    o.push(svg.hline(px + 1, px + pw - 1, py + headH, 'arch-divider'));
    let gw = null;
    mods.forEach((x, i) => {
      const c = i % 4;
      const r = Math.floor(i / 4);
      const mx = px + pad + c * (colW + gap);
      const my = py + headH + 12 + (r ? rowH[0] + gap : 0);
      o.push(`<g><title>${esc(modTip(x.m))}</title>`);
      o.push(svg.rect(mx, my, colW, rowH[r], `arch-mod${x.m.approval ? ' is-approval' : ''}`, 6));
      o.push(svg.icon(x.m.icon, mx + 10, my + 10, 16, x.m.approval ? 'is-amber' : ''));
      o.push(svg.lines(mx + 32, my + 22, x.tl, 'arch-mt', 15));
      o.push(svg.lines(mx + 10, my + 10 + Math.max(16, x.tl.length * 15) + 16, x.dl, 'arch-md', 14));
      o.push('</g>');
      if (x.m.gateway) gw = { x: mx + colW, y: my + rowH[r] / 2 };
    });

    const lPlace = wrapLines(llm.place, lw - 24, 11, 400, 3);
    const lExit = wrapLines(llm.exit, lw - 24, 11, 600, 2);
    const lh = 70 + (lPlace.length + lExit.length) * 14;
    const ly = Math.max(py, gw.y - lh / 2);
    o.push(svg.rect(lx, ly, lw, lh, `arch-llm${llm.local ? ' is-local' : ''}`, 10));
    o.push(svg.icon('cpu', lx + 12, ly + 12, 14, llm.local ? 'is-ok' : 'is-muted'));
    o.push(svg.text(lx + 32, ly + 23, 'MODELO DE LENGUAJE', 'arch-kicker'));
    o.push(svg.text(lx + 12, ly + 46, llm.name, 'arch-llm-name'));
    o.push(svg.lines(lx + 12, ly + 64, lPlace, 'arch-md', 14));
    o.push(svg.lines(lx + 12, ly + 72 + lPlace.length * 14, lExit, `arch-exit${llm.local ? ' is-local' : ''}`, 14));
    o.push(svg.hline(gw.x + 1, lx - 1, gw.y, 'arch-read'));
    o.push(svg.head(lx - 1, gw.y, 'right', 'arch-head'));
    o.push(svg.head(gw.x + 1, gw.y, 'left', 'arch-head'));

    // Zona: infraestructura de Congelados de Navarra (con o sin el modelo)
    const zoneBottom = Math.max(py + ph, ly + lh) + 16;
    const zoneRight = llm.local ? W - P : pRight + 16;
    back.push(svg.rect(P, zoneY, zoneRight - P, zoneBottom - zoneY, 'arch-zone-box', 10));
    back.push(svg.icon('server', P + 14, zoneY + 10, 15));
    back.push(svg.text(P + 36, zoneY + 22, dep.zone, 'arch-zone-t'));

    // Personas ↔ Prodigy
    const ax = px + pw * 0.66;
    o.push(svg.vline(ax, by + bh + 1, py - 1, 'arch-read'));
    o.push(svg.head(ax, py - 1, 'down', 'arch-head'));
    o.push(svg.head(ax, by + bh + 1, 'up', 'arch-head'));
    o.push(svg.text(ax + 10, by + bh + 26, 'Consola web y avisos en Microsoft Teams', 'arch-note'));

    // Conectores y sistemas de CN
    const busY = zoneBottom + 34;
    const ty = busY + 26;
    const tileW = (W - 2 * P - 6 * 10) / 7;
    const tiles = TILES.map((t) => ({ t, nl: wrapLines(t.name, tileW - 40, 12, 600, 2), dl: wrapLines(t.text, tileW - 20, 11, 400, 5) }));
    const nameH = Math.max.apply(null, tiles.map((x) => Math.max(16, x.nl.length * 15)));
    const descH = Math.max.apply(null, tiles.map((x) => x.dl.length * 14));
    const th = 10 + nameH + 8 + descH + 12 + 14 + 10;
    const xs = [];
    tiles.forEach((x, i) => {
      const tx = P + i * (tileW + 10);
      const cx = tx + tileW / 2;
      if (x.t.write) {
        o.push(svg.vline(cx - 6, busY, ty, 'arch-read'));
        o.push(svg.vline(cx + 6, busY, ty - 1, 'arch-write'));
        o.push(svg.head(cx + 6, ty - 1, 'down', 'arch-head is-write'));
        xs.push(cx - 6, cx + 6);
      } else {
        o.push(svg.vline(cx, busY, ty, 'arch-read'));
        xs.push(cx);
      }
      o.push(`<g><title>${esc(tileTip(x.t))}</title>`);
      o.push(svg.rect(tx, ty, tileW, th, 'arch-tile', 8));
      o.push(svg.icon(x.t.icon, tx + 10, ty + 10, 15, 'is-muted'));
      o.push(svg.lines(tx + 30, ty + 21, x.nl, 'arch-tt', 15));
      o.push(svg.lines(tx + 10, ty + 10 + nameH + 18, x.dl, 'arch-md', 14));
      const my = ty + th - 12;
      o.push(svg.icon(x.t.write ? 'user-check' : 'eye', tx + 10, my - 10, 12, x.t.write ? 'is-amber' : 'is-muted'));
      o.push(svg.text(tx + 27, my, x.t.write ? 'Con aprobación' : 'Solo lectura', `arch-mode${x.t.write ? ' is-write' : ''}`));
      o.push('</g>');
    });
    const trunkX = px + pw / 2;
    o.push(svg.hline(Math.min.apply(null, xs), Math.max.apply(null, xs), busY, 'arch-read'));
    o.push(svg.vline(trunkX, py + ph + 1, busY, 'arch-read'));
    o.push(svg.head(trunkX, py + ph + 1, 'up', 'arch-head'));
    o.push(svg.text(P, busY - 10, 'Sistemas de Congelados de Navarra · siguen como hoy', 'arch-sys-t'));
    o.push(svg.text(trunkX + 10, busY - 10, 'Conectores · API o réplica de base de datos de solo lectura', 'arch-note'));

    const H = ty + th + P;
    return `<svg class="arch-svg is-wide" data-llm="${st.llm}" data-deploy="${st.deploy}" viewBox="0 0 ${W} ${r1(H)}" width="${W}" height="${r1(H)}" role="img" aria-label="${esc(ariaText(st))}">${back.join('')}${o.join('')}</svg>`;
  }

  /** Disposición vertical (móvil y columnas estrechas). */
  function archTall(st) {
    const llm = LLM[st.llm];
    const dep = DEPLOY[st.deploy];
    const W = 360;
    const P = 8;
    const back = [];
    const o = [];

    const bx = P;
    const by = P;
    const bw = W - 2 * P;
    const pillRows = packPills(PEOPLE_SHORT, bw - 24, 11.5, 600, 10, 6);
    const pillsH = pillRows.length * 24 + (pillRows.length - 1) * 6;
    const bh = 54 + pillsH + 12;
    o.push(svg.rect(bx, by, bw, bh, 'arch-band'));
    o.push(svg.icon('users', bx + 12, by + 11, 16));
    o.push(svg.text(bx + 34, by + 24, 'Personas por rol', 'arch-h'));
    o.push(svg.text(bx + 12, by + 43, 'Acceso con SSO · Microsoft Entra ID', 'arch-sub'));
    pillRows.forEach((row, ri) => row.forEach((p) => {
      const x = bx + 12 + p.x;
      const y = by + 54 + ri * 30;
      o.push(svg.rect(x, y, p.w, 24, 'arch-pill', 12));
      o.push(svg.text(x + p.w / 2, y + 16, p.t, 'arch-pill-t', 'middle'));
    }));

    const ax = W - P - 44;
    const zoneY = by + bh + 40;
    const zl = wrapLines(dep.zone, ax - 12 - (P + 30), 11.5, 600, 2);
    const px = P + 12;
    const pw = W - 2 * P - 24;
    const py = zoneY + 14 + zl.length * 15 + 8;
    const sub = wrapLines('Capa de agentes encima de sus sistemas · no sustituye ninguno', pw - 28, 11, 400, 2);
    const headH = 40 + sub.length * 14 + 4;
    const pad = 12;
    const gap = 8;
    const colW = (pw - pad * 2 - gap) / 2;
    const mods = MODULES.map((m) => ({ m, tl: wrapLines(m.title, colW - 38, 12, 600, 2) }));
    const rowH = Math.max.apply(null, mods.map((x) => 12 + x.tl.length * 15 + 10));
    const nRows = Math.ceil(mods.length / 2);
    const ph = headH + nRows * rowH + (nRows - 1) * gap + pad;
    o.push(svg.rect(px, py, pw, ph, 'arch-prodigy', 10));
    o.push(svg.mark(px + 12, py + 11, 20));
    o.push(svg.text(px + 40, py + 26, 'Prodigy', 'arch-brand'));
    o.push(svg.lines(px + 14, py + 46, sub, 'arch-sub', 14));
    o.push(svg.hline(px + 1, px + pw - 1, py + headH - 4, 'arch-divider'));
    mods.forEach((x, i) => {
      const c = i % 2;
      const r = Math.floor(i / 2);
      const mx = px + pad + c * (colW + gap);
      const my = py + headH + 4 + r * (rowH + gap);
      o.push(`<g><title>${esc(modTip(x.m))}</title>`);
      o.push(svg.rect(mx, my, colW, rowH, `arch-mod${x.m.approval ? ' is-approval' : ''}`, 6));
      o.push(svg.icon(x.m.icon, mx + 9, my + (rowH - 16) / 2, 16, x.m.approval ? 'is-amber' : ''));
      const ty0 = my + rowH / 2 - (x.tl.length * 15) / 2 + 11;
      o.push(svg.lines(mx + 31, ty0, x.tl, 'arch-mt is-sm', 15));
      o.push('</g>');
    });

    const lx = P + 48;
    const lw = W - P - 12 - lx;
    const lPlace = wrapLines(llm.place, lw - 24, 11, 400, 3);
    const lExit = wrapLines(llm.exit, lw - 24, 11, 600, 2);
    const lh = 70 + (lPlace.length + lExit.length) * 14;
    let ly;
    let zoneBottom;
    if (llm.local) { ly = py + ph + 30; zoneBottom = ly + lh + 14; } else { zoneBottom = py + ph + 14; ly = zoneBottom + 28; }
    o.push(svg.rect(lx, ly, lw, lh, `arch-llm${llm.local ? ' is-local' : ''}`, 10));
    o.push(svg.icon('cpu', lx + 12, ly + 12, 14, llm.local ? 'is-ok' : 'is-muted'));
    o.push(svg.text(lx + 32, ly + 23, 'MODELO DE LENGUAJE', 'arch-kicker'));
    o.push(svg.text(lx + 12, ly + 46, llm.name, 'arch-llm-name'));
    o.push(svg.lines(lx + 12, ly + 64, lPlace, 'arch-md', 14));
    o.push(svg.lines(lx + 12, ly + 72 + lPlace.length * 14, lExit, `arch-exit${llm.local ? ' is-local' : ''}`, 14));
    const lcx = lx + lw / 2;
    o.push(svg.vline(lcx, py + ph + 1, ly - 1, 'arch-read'));
    o.push(svg.head(lcx, ly - 1, 'down', 'arch-head'));
    o.push(svg.head(lcx, py + ph + 1, 'up', 'arch-head'));

    back.push(svg.rect(P, zoneY, W - 2 * P, zoneBottom - zoneY, 'arch-zone-box', 10));
    back.push(svg.icon('server', P + 10, zoneY + 9, 15));
    back.push(svg.lines(P + 30, zoneY + 21, zl, 'arch-zone-t is-sm', 15));

    o.push(svg.vline(ax, by + bh + 1, py - 1, 'arch-read'));
    o.push(svg.head(ax, py - 1, 'down', 'arch-head'));
    o.push(svg.head(ax, by + bh + 1, 'up', 'arch-head'));
    o.push(svg.text(ax - 10, by + bh + 25, 'Consola web y Teams', 'arch-note', 'end'));

    // Sistemas de CN
    const trunkX = P + 26;
    const gy = Math.max(zoneBottom, ly + lh) + 30;
    const gx = P;
    const gwid = W - 2 * P;
    const gTitle = wrapLines('Sistemas de Congelados de Navarra · siguen como hoy', gwid - 24, 11.5, 600, 2);
    const gSub = wrapLines('Conectores por API o réplica de base de datos de solo lectura', gwid - 24, 11, 400, 2);
    const gHead = 12 + gTitle.length * 15 + gSub.length * 14 + 8;
    const tileW = (gwid - 20 - 8) / 2;
    const tiles = TILES.map((t) => ({ t, nl: wrapLines(t.name, tileW - 38, 12, 600, 2), dl: wrapLines(t.text, tileW - 20, 11, 400, 4) }));
    const rows = [];
    for (let i = 0; i < tiles.length; i += 2) rows.push(tiles.slice(i, i + 2));
    const rowHs = rows.map((row) => {
      const nameH = Math.max.apply(null, row.map((x) => Math.max(16, x.nl.length * 15)));
      const descH = Math.max.apply(null, row.map((x) => x.dl.length * 14));
      return { nameH, h: 10 + nameH + 8 + descH + 12 + 14 + 10 };
    });
    const gh = gHead + rowHs.reduce((s, r) => s + r.h, 0) + (rows.length - 1) * 8 + 10;
    o.push(svg.rect(gx, gy, gwid, gh, 'arch-group', 10));
    o.push(svg.lines(gx + 12, gy + 21, gTitle, 'arch-sys-t', 15));
    o.push(svg.lines(gx + 12, gy + 21 + gTitle.length * 15, gSub, 'arch-md', 14));
    let yy = gy + gHead;
    rows.forEach((row, ri) => {
      const rh = rowHs[ri];
      row.forEach((x, ci) => {
        const tx = gx + 10 + ci * (tileW + 8);
        o.push(`<g><title>${esc(tileTip(x.t))}</title>`);
        o.push(svg.rect(tx, yy, tileW, rh.h, 'arch-tile', 8));
        o.push(svg.icon(x.t.icon, tx + 10, yy + 10, 15, 'is-muted'));
        o.push(svg.lines(tx + 30, yy + 21, x.nl, 'arch-tt', 15));
        o.push(svg.lines(tx + 10, yy + 10 + rh.nameH + 18, x.dl, 'arch-md', 14));
        const my = yy + rh.h - 12;
        o.push(svg.icon(x.t.write ? 'user-check' : 'eye', tx + 10, my - 10, 12, x.t.write ? 'is-amber' : 'is-muted'));
        o.push(svg.text(tx + 27, my, x.t.write ? 'Con aprobación' : 'Solo lectura', `arch-mode${x.t.write ? ' is-write' : ''}`));
        o.push('</g>');
      });
      yy += rh.h + 8;
    });
    o.push(svg.vline(trunkX, py + ph + 1, gy, 'arch-read'));
    o.push(svg.head(trunkX, py + ph + 1, 'up', 'arch-head'));

    const H = gy + gh + P;
    return `<svg class="arch-svg is-tall" data-llm="${st.llm}" data-deploy="${st.deploy}" viewBox="0 0 ${W} ${r1(H)}" width="${W}" height="${r1(H)}" role="img" aria-label="${esc(ariaText(st))}">${back.join('')}${o.join('')}</svg>`;
  }

  function diagram(st) { return App.raw(archWide(st) + archTall(st)); }

  /* ---------------------------------------------------------------- Piezas de la vista */

  function settings(ctx) { return Object.assign({}, DEFAULTS, ctx.local); }

  function kpis() {
    const c = auditCounts();
    return html`<div class="kpis">
      ${App.kpi({ label: 'Piloto propuesto', value: '6–8', unit: 'semanas', sub: '1 caso · Fustiñana · realm de Calidad', icon: 'calendar' })}
      ${App.kpi({ label: 'Sistemas conectados en el piloto', value: '1–2', unit: 'solo lectura', sub: 'Por API o réplica de base de datos', icon: 'database' })}
      ${App.kpi({ label: 'Usuarios del piloto', value: '5–10', sub: 'SSO con Microsoft Entra ID', icon: 'users' })}
      ${App.kpi({ id: 'plat-kpi-audit', label: 'Acciones en el registro de la sesión', value: c.total, sub: auditSub(c), icon: 'history', action: 'open-registro' })}
    </div>`;
  }
  function auditSub(c) {
    return c.total ? `${fmt.num(c.persons)} de personas · ${fmt.num(c.agents)} de agentes de Prodigy` : 'Aún sin acciones en esta sesión';
  }

  function decisionCards(st) {
    const llm = LLM[st.llm];
    const dep = DEPLOY[st.deploy];
    const cards = [
      { id: 'plat-dec-deploy', icon: 'server', title: `Despliegue · ${dep.seg}`, body: html`<p>${dep.text}</p><p>No depende de servicios de Ciklum en la nube. Lo opera su equipo de Sistemas o un servicio gestionado.</p>` },
      { id: 'plat-dec-llm', icon: 'cpu', title: `Modelo de lenguaje · ${llm.name}`, body: html`<p><strong class="${llm.local ? 't-ok' : 'strong'}">${llm.exit}.</strong> ${llm.place}.</p><p>${llm.note} Se cambia de modelo por configuración, sin tocar los workflows; también admite OpenAI o AWS Bedrock en la UE.</p>` },
      { id: 'plat-dec-access', icon: 'key', title: 'Acceso y permisos', body: html`<p>SSO con Microsoft Entra ID (OIDC) o SAML 2.0. Permisos por rol y por realm: el realm «Calidad · Fustiñana» solo ve sus procedimientos y sus datos.</p><p>La pasarela enmascara datos personales antes de llamar al modelo; los formatos DNI, NIE e IBAN se añaden en el piloto.</p>` },
      { id: 'plat-dec-hitl', icon: 'user-check', title: 'Aprobación humana y auditoría', body: html`<p>Bloquear en SAP QM, abrir una NC en Elara o enviar un correo al cliente requiere la aprobación de su responsable. Rechazar no aplica nada y queda registrado con el motivo.</p><p>Registro de solo añadir, exportable a CSV. <button type="button" class="link-btn" data-action="open-registro">Ver el registro de esta sesión</button></p>` },
      { id: 'plat-dec-cost', icon: 'gauge', title: 'Coste por petición', body: costBody() },
      { id: 'plat-dec-limits', icon: 'x-circle', title: 'Fuera del alcance de Prodigy', body: html`<ul class="plat-list is-limits">
          <li>${icon('minus', 16)}<span>No sustituye SAP, MES Mapex, Siemens Opcenter APS, Mecalux Easy WMS ni Elara.</span></li>
          <li>${icon('minus', 16)}<span>No actúa sobre el control de planta: Galileo/SCADA solo se lee.</span></li>
          <li>${icon('minus', 16)}<span>No libera producto: lo decide el Responsable de Calidad (PNT-CAL-015).</span></li>
          <li>${icon('minus', 16)}<span>No asigna tareas ni evalúa a personas: trabaja con lotes, equipos y documentos.</span></li>
        </ul>` }
    ];
    return html`${cards.map((c) => App.card({ id: c.id, title: c.title, icon: c.icon, class: 'plat-dec', body: c.body }))}`;
  }

  function costBody() {
    const e = sessionCost();
    return html`<p>Prodigy anota en cada petición los tokens, el modelo y el coste estimado en USD, y lo suma por realm, usuario, modelo y capacidad.</p>
      <p>Presupuesto diario y mensual por realm, con aviso al ${fmt.pct(80)}; el bloqueo al superarlo es opcional. Es una estimación (tarifa × tokens) que se concilia con la factura del proveedor.</p>
      ${e ? html`<p class="plat-session">${icon('history', 15)}<span>En esta sesión · ${e.action}: ${e.detail}</span></p>` : ''}`;
  }

  function legend() {
    return html`<div class="arch-legend">
      <span class="lg"><span class="arch-lg arch-lg-read"></span>Lectura</span>
      <span class="lg"><span class="arch-lg arch-lg-write"></span>Escritura solo tras aprobación humana</span>
      <span class="lg"><span class="arch-lg arch-lg-approval"></span>Punto de aprobación</span>
      <span class="lg"><span class="arch-lg arch-lg-zone"></span>Infraestructura de Congelados de Navarra</span>
    </div>`;
  }

  function archPanel(st) {
    const deployOpts = Object.keys(DEPLOY).map((k) => ({ value: k, label: DEPLOY[k].seg }));
    const llmOpts = Object.keys(LLM).map((k) => ({ value: k, label: LLM[k].seg }));
    return html`<div class="stack">
      ${App.card({
        id: 'plat-arch',
        title: 'Arquitectura de referencia en Fustiñana',
        sub: 'Prodigy lee de sus sistemas y prepara propuestas con sus procedimientos; antes de escribir en un sistema, aprueba una persona.',
        icon: 'layers',
        body: html`<div class="arch-tools">
            <div class="arch-tool"><span class="label">Despliegue</span>${App.segmented({ name: 'plat-deploy', label: 'Despliegue', value: st.deploy, options: deployOpts })}</div>
            <div class="arch-tool"><span class="label">Modelo de lenguaje</span>${App.segmented({ name: 'plat-llm', label: 'Modelo de lenguaje', value: st.llm, options: llmOpts })}</div>
          </div>
          <div class="arch" id="plat-arch-diagram">${diagram(st)}</div>
          ${legend()}`
      })}
      <div class="grid cols-3" id="plat-decisions">${decisionCards(st)}</div>
      ${App.card({
        title: 'Preguntas habituales de Sistemas',
        sub: 'Respuestas cortas para la conversación con el equipo técnico',
        icon: 'message-square',
        flush: true,
        body: html`<div class="faq">${FAQ.map(([q, a]) => html`<details class="faq-item"><summary>${icon('chevron-right', 16)}<span>${q}</span></summary><p>${a}</p></details>`)}</div>`
      })}
    </div>`;
  }

  function honestyTable() {
    return App.table({
      cols: [
        { label: 'Aspecto', width: '21%', render: (r) => html`<span class="strong">${r.aspect}</span>` },
        { label: 'Hoy en la demo', width: '29%', render: (r) => r.demo },
        { label: 'En un piloto', render: (r) => r.pilot },
        { label: 'Origen', width: '15%', render: (r) => ORIGIN[r.origin]() }
      ],
      rows: HONESTY,
      rowAttrs: (r) => ({ 'data-origin': r.origin })
    });
  }

  function caseDetail(c) {
    return App.kv([
      ['Caso', html`<span class="strong">${c.title}</span>`],
      ['Sistemas en lectura', App.sysList(c.systems)],
      ['Disparo', c.trigger],
      ['Qué prepara el agente', c.output],
      ['Escritura en sistemas', 'Ninguna en SAP durante el piloto: borradores y tickets que aprueba una persona'],
      ['Visto hoy en la demo', html`<button type="button" class="link-btn plat-go" data-go="${c.scene}">${c.sceneLabel}${icon('arrow-right', 14)}</button>`]
    ], { cols: 1 });
  }

  function gantt() {
    const weeks = [1, 2, 3, 4, 5, 6, 7, 8];
    return html`<div class="gantt" role="table" aria-label="Plan del piloto por semanas">
      <div class="gantt-row gantt-head" role="row">
        <div class="gantt-label" role="columnheader">Fase</div>
        <div class="gantt-track">${weeks.map((w) => html`<span class="gantt-cell" role="columnheader">S${w}</span>`)}</div>
      </div>
      ${PHASES.map((p, i) => html`<div class="gantt-row" role="row" data-phase="${i + 1}">
        <div class="gantt-label" role="rowheader"><span class="strong">${p.title}</span><span class="sub">${weeksText(p)} · ${p.detail}</span><span class="sub gantt-ms">${icon('circle-dot', 12)}Hito: ${p.result}</span></div>
        <div class="gantt-track" role="cell">${weeks.map(() => html`<span class="gantt-cell"></span>`)}<span class="gantt-bar${i === PHASES.length - 1 ? ' is-last' : ''}" style="grid-column:${p.from} / ${p.to + 1}"><span class="gantt-bar-t">${weeksText(p)}</span></span></div>
      </div>`)}
    </div>`;
  }

  function criteriaTable(c) {
    return App.table({
      cols: [
        { label: 'Criterio', width: '14%', render: (r) => html`<span class="strong">${r.name}</span>` },
        { label: 'Umbral para aceptar', render: (r) => r.target },
        { label: 'Cómo se mide', width: '34%', render: (r) => r.how }
      ],
      rows: criteria(c)
    });
  }

  function givesList(items) {
    return html`<ul class="plat-list">${items.map((t) => html`<li>${icon('check', 16)}<span>${t}</span></li>`)}</ul>`;
  }

  function pilotPanel(st) {
    const c = CASES[st.pilotCase] || CASES.A;
    return html`<div class="stack">
      ${App.card({ id: 'plat-honesty', title: 'Hoy en la demo · En un piloto', sub: 'Qué se ve en esta demo, qué es de serie en Prodigy y qué se construye en el piloto', icon: 'eye', flush: true, body: honestyTable() })}
      ${App.card({
        id: 'plat-pilot',
        title: 'Piloto de 6–8 semanas',
        sub: 'Un caso, una planta (Fustiñana), un realm (Calidad) y 5–10 usuarios, en su infraestructura y con su modelo',
        icon: 'calendar',
        actions: html`<div class="plat-case-seg">${App.segmented({ name: 'plat-case', label: 'Caso del piloto', value: st.pilotCase, options: [{ value: 'A', label: CASES.A.short }, { value: 'B', label: CASES.B.short }] })}</div>`,
        body: html`<div id="plat-case" class="plat-case">${caseDetail(c)}</div>
          <div class="mt-6">${gantt()}</div>
          <p class="muted small mt-3">Después del piloto: planificación de la recepción en campaña (medible en la campaña de guisante de 2027) o parte diario conectado al historian o al SCADA.</p>`
      })}
      ${App.card({ id: 'plat-criteria', title: 'Criterios de aceptación', sub: 'Se firman en la semana 1 y se miden en la semana 8', icon: 'list-checks', flush: true, body: html`<div id="plat-criteria-table">${criteriaTable(c)}</div>` })}
      <div class="grid cols-2">
        ${App.card({ title: 'Congelados de Navarra aporta', icon: 'building', body: givesList(CN_GIVES) })}
        ${App.card({ title: 'Ciklum aporta', icon: 'workflow', body: givesList(CIKLUM_GIVES) })}
      </div>
      ${App.callout({
        tone: 'brand',
        icon: 'users',
        title: 'Siguiente paso: taller de 2 horas con Calidad y Sistemas',
        body: 'Para elegir el caso, confirmar los accesos de lectura y fijar la línea base con la que se medirá el piloto.',
        actions: html`<button type="button" class="btn btn-primary btn-sm" data-action="proposal">${icon('printer', 15)}<span>Descargar propuesta de piloto (PDF)</span></button>`
      })}
    </div>`;
  }

  function calcOut(r, res, max) {
    if (res.state === 'invalid') return html`<span class="calc-msg t-crit">${icon('alert-circle', 15)}<span>Revisa el dato: de 0 a ${fmt.num(CALC_MAX)}</span></span>`;
    if (res.state === 'slower') return html`<span class="calc-msg t-warn">${icon('alert-triangle', 15)}<span>Con Prodigy tardaría más: no suma</span></span>`;
    const pct = max > 0 ? Math.max(2, Math.round((res.hours / max) * 100)) : 0;
    return html`<span class="calc-bar" aria-hidden="true"><span style="width:${res.hours > 0 ? pct : 0}%"></span></span><span class="calc-h">${fmt.num(res.hours)} h</span>`;
  }
  function calcField(r, key) {
    const id = `plat-calc-${r.id}-${key}`;
    const res = rowResult(r);
    const invalid = validNum(r[key]) == null;
    const slower = key === 'after' && res.state === 'slower';
    return html`<div class="calc-field"><label class="calc-lbl" for="${id}">${CALC_KEYS[key]}</label><input class="input calc-input" id="${id}" type="number" inputmode="numeric" min="0" max="${CALC_MAX}" step="1" value="${r[key]}" data-prev="${r[key]}" data-calc="${r.id}" data-key="${key}" aria-label="${r.label} · ${CALC_KEYS[key]}" ${App.attrs({ 'aria-invalid': invalid ? 'true' : null, 'data-warn': slower ? 'true' : null })}></div>`;
  }
  function calcTotalsHTML(rows) {
    const t = calcTotals(rows);
    return html`${App.stats([
      { label: 'Horas al mes', value: fmt.num(t.month), tone: 'ok' },
      { label: 'Horas al año', value: fmt.num(t.year) },
      { label: 'Jornadas de 8 h al año', value: fmt.num(t.days) }
    ])}
    <p class="calc-note">${t.excluded ? html`<span class="t-warn strong">${fmt.plural(t.excluded, 'caso no suma', 'casos no suman')} hasta corregir sus datos. </span>` : ''}Horas de trabajo repetitivo que Calidad, los jefes de turno y Mantenimiento pueden dedicar a otras tareas. «Con Prodigy» incluye la revisión y la aprobación humana. No incluye importes.</p>`;
  }
  function horasPanel(ctx) {
    const rows = calcValues(ctx);
    const t = calcTotals(rows);
    const max = Math.max.apply(null, t.res.map((r) => r.hours).concat([0]));
    return html`<div class="stack">
      ${App.card({
        id: 'plat-calc',
        title: 'Calculadora de horas',
        sub: 'Casos al mes × minutos liberados por caso. Son supuestos para conversar: la línea base real se mide en las semanas 1–2 del piloto.',
        icon: 'clock',
        flush: true,
        actions: html`<button type="button" class="btn btn-ghost btn-sm" data-action="calc-reset">${icon('rotate-ccw', 15)}<span>Restablecer supuestos</span></button>`,
        body: html`<div class="calc" role="group" aria-label="Supuestos de la calculadora de horas">
            <div class="calc-row calc-head" aria-hidden="true"><span>Caso</span><span class="right">Casos al mes</span><span class="right">Hoy (min)</span><span class="right">Con Prodigy (min)</span><span>Horas al mes</span></div>
            ${rows.map((r, i) => html`<div class="calc-row" data-calc-row="${r.id}">
              <div class="calc-case"><div class="strong">${r.label}</div><div class="calc-sub">${r.who} · <button type="button" class="link-btn" data-go="${r.scene}">${r.seen}</button></div></div>
              ${calcField(r, 'n')}${calcField(r, 'before')}${calcField(r, 'after')}
              <div class="calc-out" data-calc-out="${r.id}">${calcOut(r, t.res[i], max)}</div>
            </div>`)}
          </div>
          <div class="calc-foot" id="plat-calc-totals">${calcTotalsHTML(rows)}</div>`
      })}
    </div>`;
  }

  function auditStatsHTML() {
    const c = auditCounts();
    return App.stats([
      { label: 'Acciones registradas', value: c.total },
      { label: 'De personas', value: c.persons },
      { label: 'De agentes de Prodigy', value: c.agents },
      { label: 'Decisiones humanas', value: c.decisions }
    ]);
  }
  function auditSegHTML(filter) {
    const c = auditCounts();
    return App.segmented({ name: 'plat-audit-filter', label: 'Filtrar por actor', value: filter, options: [
      { value: 'all', label: 'Todas', count: c.total },
      { value: 'people', label: 'Personas', count: c.persons },
      { value: 'agents', label: 'Agentes de Prodigy', count: c.agents },
      { value: 'decisions', label: 'Decisiones', count: c.decisions }
    ] });
  }
  function auditTableHTML(filter, query) {
    if (!App.auditLog().length) {
      return App.empty({ icon: 'history', title: 'Aún no hay acciones en esta sesión', text: 'Genera el parte diario, publica un workflow o aprueba un bloqueo: cada paso aparecerá aquí con su hora, su actor y su vista.' });
    }
    const list = auditEntries(filter, query);
    if (!list.length) return html`<div class="tbl-empty">Ninguna entrada coincide con el filtro o la búsqueda.</div>`;
    return App.auditTable(list);
  }
  function registroPanel(ctx) {
    const st = settings(ctx);
    const q = ctx.vars.auditQuery || '';
    return html`<div class="stack">
      <div id="plat-audit-stats">${auditStatsHTML()}</div>
      ${App.card({
        id: 'plat-audit',
        title: 'Registro de auditoría de la sesión',
        sub: 'Solo se añaden entradas: la consola no permite editarlas ni borrarlas',
        icon: 'history',
        flush: true,
        actions: html`<button type="button" class="btn btn-secondary btn-sm" data-action="audit-csv">${icon('download', 15)}<span>Exportar CSV</span></button><button type="button" class="btn btn-secondary btn-sm" data-action="audit-json">${icon('download', 15)}<span>Exportar JSON</span></button>`,
        body: html`<div class="card-body audit-tools">
            <div id="plat-audit-seg">${auditSegHTML(st.auditFilter)}</div>
            <input class="input audit-search" type="search" placeholder="Buscar acción, detalle, actor o vista" value="${q}" aria-label="Buscar en el registro de auditoría">
          </div>
          <div id="plat-audit-table">${auditTableHTML(st.auditFilter, q)}</div>`
      })}
      ${App.callout({ tone: 'brand', icon: 'info', title: 'En un piloto', body: 'El registro vive en la base de datos de Prodigy, identifica a cada persona por su SSO, se filtra por persona, acción y fecha y se exporta a CSV. En esta demo vive en este navegador y se borra con «Reiniciar demo».' })}
    </div>`;
  }

  /* ---------------------------------------------------------------- Actualizaciones parciales */

  function redrawArch(ctx) {
    const st = settings(ctx);
    const d = ctx.$('#plat-arch-diagram');
    if (d) d.innerHTML = String(diagram(st));
    const dec = ctx.$('#plat-decisions');
    if (dec) dec.innerHTML = String(decisionCards(st));
  }

  function refreshCalc(ctx) {
    const rows = calcValues(ctx);
    const t = calcTotals(rows);
    const max = Math.max.apply(null, t.res.map((r) => r.hours).concat([0]));
    rows.forEach((r, i) => {
      const out = ctx.$(`[data-calc-out="${r.id}"]`);
      if (out) out.innerHTML = String(calcOut(r, t.res[i], max));
      ['n', 'before', 'after'].forEach((k) => {
        const el = ctx.$(`#plat-calc-${r.id}-${k}`);
        if (!el) return;
        if (validNum(r[k]) == null) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
        if (k === 'after' && t.res[i].state === 'slower') el.setAttribute('data-warn', 'true'); else el.removeAttribute('data-warn');
      });
    });
    const tot = ctx.$('#plat-calc-totals');
    if (tot) tot.innerHTML = String(calcTotalsHTML(rows));
  }

  function refreshAudit(ctx) {
    const c = auditCounts();
    const kpi = ctx.$('#plat-kpi-audit');
    if (kpi) {
      const num = kpi.querySelector('.kpi-num');
      const sub = kpi.querySelector('.kpi-sub');
      if (num) num.textContent = fmt.num(c.total);
      if (sub) sub.textContent = auditSub(c);
    }
    const count = ctx.$('#plat-tab-registro .count');
    if (count) count.textContent = String(c.total);
    const stats = ctx.$('#plat-audit-stats');
    if (stats) stats.innerHTML = String(auditStatsHTML());
    const seg = ctx.$('#plat-audit-seg');
    if (seg) seg.innerHTML = String(auditSegHTML(settings(ctx).auditFilter));
    const table = ctx.$('#plat-audit-table');
    if (table) table.innerHTML = String(auditTableHTML(settings(ctx).auditFilter, ctx.vars.auditQuery || ''));
    const cost = ctx.$('#plat-dec-cost .card-body');
    if (cost) cost.innerHTML = String(costBody());
    App.presenter.refresh();
  }

  function openTab(ctx, id) {
    const btn = ctx.$(`#plat-tab-${id}`);
    if (btn) btn.click();
    const tabs = ctx.$('#plat-tabs');
    if (tabs) tabs.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------------------------------------------------------- Descargas */

  function exportCSV() {
    const list = App.auditLog();
    const content = App.csv({ rows: list, cols: [
      { label: 'Entrada', key: 'id' },
      { label: 'Fecha y hora', value: (r) => fmt.date(r.at, { time: true, seconds: true }) },
      { label: 'Acción', key: 'action' },
      { label: 'Detalle', key: 'detail' },
      { label: 'Actor', key: 'actor' },
      { label: 'Vista', value: (r) => sceneNav(r.scene) }
    ] });
    App.downloadFile('registro-auditoria-prodigy-cn.csv', 'text/csv', content, { audit: false });
    App.audit('Registro de auditoría exportado', `${fmt.plural(list.length, 'entrada', 'entradas')} · CSV`);
  }

  function openProposal(ctx) {
    const st = settings(ctx);
    const c = CASES[st.pilotCase] || CASES.A;
    const llm = LLM[st.llm];
    const dep = DEPLOY[st.deploy];
    const rows = calcValues(ctx);
    const t = calcTotals(rows);
    App.printableReport({
      title: 'Propuesta de piloto · Prodigy en Congelados de Navarra',
      subtitle: `${c.label} · ${c.title} · planta de Fustiñana · 6–8 semanas`,
      kicker: 'Vista previa del documento',
      code: 'PIL-FUS-2026-01',
      filename: 'propuesta-piloto-prodigy-fustinana',
      meta: [['Revisión', '1'], ['Estado', 'Borrador para el taller'], ['Planta', 'Fustiñana (FUS)'], ['Realm', 'Calidad · Fustiñana'], ['Usuarios', '5–10'], ['Duración', '6–8 semanas']],
      sections: [
        { heading: '1. Objetivo', text: 'Medir, con un caso real y criterios firmados, cuánto tiempo de Calidad libera Prodigy y con qué exactitud, sin cambiar SAP, MES Mapex, Siemens Opcenter APS, Mecalux Easy WMS, Galileo/SCADA ni Elara. Prodigy lee de esos sistemas, razona con los procedimientos y propone; una persona aprueba antes de escribir.' },
        { heading: '2. Alcance', kv: [['Caso', `${c.label} · ${c.title}`], ['Planta y realm', 'Fustiñana · Calidad'], ['Usuarios', '5–10, con SSO de Microsoft Entra ID'], ['Sistemas en lectura', c.systemsText], ['Disparo', c.trigger], ['Qué prepara el agente', c.output], ['Escritura en sistemas', 'Ninguna en SAP durante el piloto: borradores y tickets que aprueba una persona']] },
        { heading: '3. Arquitectura y despliegue', kv: [['Despliegue', dep.label], ['Modelo de lenguaje', `${llm.name} · ${llm.place}`], ['Datos fuera de su red', llm.exit], ['Acceso', 'SSO con Microsoft Entra ID (OIDC) o SAML 2.0; permisos por rol y realm'], ['Auditoría', 'Registro de solo añadir, exportable a CSV'], ['Coste', 'Estimación por petición en USD; presupuesto diario y mensual del realm']] },
        { heading: '4. Plan de trabajo', table: { cols: [{ label: 'Semanas', render: (p) => html`<span style="white-space:nowrap">${weeksText(p)}</span>` }, { label: 'Trabajo', render: (p) => `${p.title}: ${p.detail.charAt(0).toLowerCase()}${p.detail.slice(1)}` }, { label: 'Resultado', key: 'result' }], rows: PHASES } },
        { heading: '5. Criterios de aceptación', table: { cols: [{ label: 'Criterio', key: 'name' }, { label: 'Umbral para aceptar', key: 'target' }, { label: 'Cómo se mide', key: 'how' }], rows: criteria(c) } },
        { heading: '6. Qué aporta cada parte', kv: [['Congelados de Navarra', CN_GIVES.join('; ')], ['Ciklum', CIKLUM_GIVES.join('; ')]] },
        { heading: '7. Qué es de serie y qué se construye', table: { cols: [{ label: 'Aspecto', key: 'aspect' }, { label: 'Hoy en la demo', key: 'demo' }, { label: 'En el piloto', key: 'pilot' }, { label: 'Origen', render: (r) => ORIGIN_TEXT[r.origin] }], rows: HONESTY } },
        { heading: '8. Supuestos de horas para validar', table: { cols: [{ label: 'Caso', key: 'label' }, { label: 'Casos al mes', render: (r) => String(r.n), num: true }, { label: 'Hoy (min)', render: (r) => String(r.before), num: true }, { label: 'Con Prodigy (min)', render: (r) => String(r.after), num: true }, { label: 'Horas al mes', render: (r) => { const x = rowResult(r); return x.state === 'ok' ? fmt.num(x.hours) : 'No suma'; }, num: true }], rows } },
        { heading: '', callout: `Total: ${fmt.num(t.month)} h al mes, ${fmt.num(t.year)} h al año (${fmt.num(t.days)} jornadas de 8 h). Son supuestos de la sesión, no mediciones: la línea base real se mide en las semanas 1–2 del piloto. «Con Prodigy» incluye la revisión y la aprobación humana.` },
        { heading: '9. Siguiente paso', text: 'Taller de 2 horas con Calidad y Sistemas para elegir el caso, confirmar los accesos de lectura y fijar la línea base.\n\nDespués del piloto: planificación de la recepción en campaña (medible en la campaña de guisante de 2027) o parte diario conectado al historian o al SCADA.' }
      ],
      signatures: [{ role: ROLE.quality_plant, note: 'Conforme con el alcance y los criterios' }, { role: 'Sistemas · Congelados de Navarra', note: 'Conforme con los accesos y el despliegue' }]
    });
  }

  /* ---------------------------------------------------------------- Presentador */

  function presenterSay(state) {
    const loc = (state.scenes && state.scenes.plataforma) || {};
    const tab = loc.tab || DEFAULTS.tab;
    const n = (state.audit || []).length;
    if (tab === 'piloto') {
      return [
        'Lo honesto: los datos de hoy son sintéticos y la demo no llama a ningún modelo. De serie en Prodigy: Routines, aprobación humana, auditoría, respuestas con citas y coste por petición.',
        'Construido para esta demo: el generador de workflows y los agentes de Congelados de Navarra. Los conectores de SAP, Mapex o SCADA no existen de serie: se construyen en el piloto, en modo lectura.',
        'Piloto de 6–8 semanas: un caso, Fustiñana, realm de Calidad, 5–10 usuarios. Los criterios de aceptación se firman en la semana 1 y se miden en la 8.'
      ];
    }
    if (tab === 'horas') {
      return [
        'Preguntad cuántas reclamaciones, cuestionarios o alarmas tienen al mes y escribidlo: la calculadora es suya.',
        '«Con Prodigy» incluye la revisión y la aprobación de una persona. Son horas de trabajo repetitivo que Calidad puede dedicar a otras tareas.',
        'Son supuestos para conversar: la línea base real se mide en las semanas 1–2 del piloto.'
      ];
    }
    if (tab === 'registro') {
      return [
        `Todo lo que hemos hecho hoy está aquí: ${fmt.plural(n, 'acción', 'acciones')}, de personas y de agentes, con hora, actor y vista.`,
        'Filtrad por «Decisiones»: cada aprobación y cada rechazo, con su motivo. Nada se edita ni se borra desde la consola; se exporta a JSON o CSV.',
        'Cierre: proponemos un taller de 2 horas con Calidad y Sistemas para elegir el caso y fijar la línea base.'
      ];
    }
    return [
      'Prodigy no sustituye nada: va encima de SAP, Mapex, Opcenter, Easy WMS, Galileo y Elara. Lee, razona con vuestros procedimientos y propone; antes de escribir en un sistema, aprueba una persona.',
      'Se instala en vuestra infraestructura, con vuestro SSO de Microsoft Entra ID y el modelo que elijáis. Con un modelo local, la inferencia queda en su red; Sistemas valida los demás flujos.',
      'Las líneas discontinuas en ámbar son las únicas escrituras, y siempre tras aprobación. Galileo/SCADA solo se lee: no se toca el control de planta.'
    ];
  }
  function presenterNext(state) {
    const loc = (state.scenes && state.scenes.plataforma) || {};
    const tab = loc.tab || DEFAULTS.tab;
    if (tab === 'piloto') return 'Elegir con ellos el caso A o B y abrir la pestaña «Calculadora de horas».';
    if (tab === 'horas') return 'Escribir sus casos al mes y abrir «Registro de auditoría» para cerrar.';
    if (tab === 'registro') return 'Pulsar «Descargar propuesta de piloto (PDF)» y proponer fecha para el taller de 2 horas.';
    return 'Pulsar «Modelo local» para enseñar que el modelo entra en su red; después, pestaña «Demo y piloto».';
  }

  /* ---------------------------------------------------------------- Recorrido automático (SPEC-v2-wow W5) */

  /* Pasos que usan acciones reales de la escena; si la escena no está pintada, no hacen nada. */
  const scope = () => document.querySelector('section.scene[data-scene="plataforma"]');
  const pause = (api, ms) => (api && typeof api.sleep === 'function' ? api.sleep(ms) : new Promise((r) => setTimeout(r, ms)));
  function tourTab(id) { const root = scope(); const b = root && root.querySelector(`#plat-tab-${id}`); if (b && b.getAttribute('aria-selected') !== 'true') b.click(); }
  function tourSeg(name, value) { const root = scope(); const b = root && root.querySelector(`[data-seg="${name}"] .seg-btn[data-value="${value}"]`); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }
  function tourShow(sel) { const root = scope(); const el = root && root.querySelector(sel); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  const TOUR = [
    { say: 'Prodigy va encima de SAP, Mapex, Opcenter, Easy WMS, Galileo y Elara: lee, prepara propuestas y una persona aprueba antes de escribir.', run: async (api) => { tourTab('arquitectura'); tourShow('#plat-arch'); await pause(api, 400); } },
    { say: 'Con un modelo local, la inferencia entra en su infraestructura; los demás flujos se validan con Sistemas.', run: async (api) => { tourSeg('plat-llm', 'local'); await pause(api, 400); } },
    { say: 'Qué es de serie en Prodigy, qué se ha construido para esta demo y qué se construye en el piloto.', run: async (api) => { tourTab('piloto'); tourShow('#plat-honesty'); await pause(api, 400); } },
    { say: 'Piloto de 6–8 semanas: un caso, Fustiñana, realm de Calidad y criterios de aceptación firmados en la semana 1.', run: async (api) => { tourShow('#plat-pilot'); await pause(api, 400); } },
    { say: 'Horas liberadas con supuestos editables; la línea base real se mide en el piloto.', run: async (api) => { tourTab('horas'); tourShow('#plat-tabs'); await pause(api, 400); } },
    { say: 'Todo lo hecho en la sesión queda en el registro de auditoría: decisiones humanas, pasos de los agentes y exportación.', run: async (api) => { tourTab('registro'); tourSeg('plat-audit-filter', 'decisions'); tourShow('#plat-tabs'); await pause(api, 400); } }
  ];

  /* ---------------------------------------------------------------- Registro de la escena */

  App.scene({
    id: 'plataforma',
    order: 80,
    section: 'Plataforma',
    nav: 'Cómo encaja en CN',
    title: 'Cómo encaja en Congelados de Navarra',
    icon: 'layers',
    presenter: { say: presenterSay, next: presenterNext },
    tour: TOUR,
    render(root, ctx) {
      if (!ctx.vars.paramApplied) {
        ctx.vars.paramApplied = true;
        const p = ctx.params[0];
        if (p && TAB_IDS.includes(p) && ctx.local.tab !== p) ctx.setLocal({ tab: p });
      }
      const st = settings(ctx);
      const counts = auditCounts();
      root.innerHTML = String(html`
        ${App.pageHead({
          title: 'Cómo encaja Prodigy en Congelados de Navarra',
          meta: [
            { icon: 'factory', text: 'Planta de Fustiñana' },
            { icon: 'server', text: 'Instalación en su infraestructura' },
            { icon: 'user-check', text: 'Aprobación humana antes de escribir' }
          ],
          actions: html`<button type="button" class="btn btn-secondary" data-action="audit-json">${icon('download')}<span>Exportar registro (JSON)</span></button>
            <button type="button" class="btn btn-primary" data-action="proposal">${icon('printer')}<span>Descargar propuesta de piloto (PDF)</span></button>`
        })}
        ${kpis()}
        <div class="section" id="plat-tabs">${App.tabs({
          id: 'plat',
          label: 'Cómo encaja Prodigy',
          active: TAB_IDS.includes(st.tab) ? st.tab : DEFAULTS.tab,
          tabs: [
            { id: 'arquitectura', label: 'Arquitectura', icon: 'layers', body: archPanel(st) },
            { id: 'piloto', label: 'Demo y piloto', icon: 'list-checks', body: pilotPanel(st) },
            { id: 'horas', label: 'Calculadora de horas', icon: 'clock', body: horasPanel(ctx) },
            { id: 'registro', label: 'Registro de auditoría', icon: 'history', count: counts.total, body: registroPanel(ctx) }
          ]
        })}</div>
      `);

      // Pestañas
      ctx.on('tabchange', '[data-tabs="plat"]', (e) => { if (e.detail && TAB_IDS.includes(e.detail.tab)) ctx.setLocal({ tab: e.detail.tab }); });
      ctx.on('click', '[data-action="open-registro"]', () => openTab(ctx, 'registro'));

      // Arquitectura: despliegue y modelo
      ctx.on('segchange', '[data-seg="plat-deploy"]', (e) => {
        const v = e.detail.value;
        if (!DEPLOY[v] || settings(ctx).deploy === v) return;
        ctx.setLocal({ deploy: v });
        App.audit('Opción de arquitectura seleccionada', `Despliegue: ${DEPLOY[v].label}`, ACTOR);
        redrawArch(ctx);
      });
      ctx.on('segchange', '[data-seg="plat-llm"]', (e) => {
        const v = e.detail.value;
        if (!LLM[v] || settings(ctx).llm === v) return;
        ctx.setLocal({ llm: v });
        App.audit('Opción de arquitectura seleccionada', `Modelo de lenguaje: ${LLM[v].name} · ${LLM[v].exit.toLowerCase()}`, ACTOR);
        redrawArch(ctx);
      });

      // Piloto: caso A o B
      ctx.on('segchange', '[data-seg="plat-case"]', (e) => {
        const v = e.detail.value;
        if (!CASES[v] || settings(ctx).pilotCase === v) return;
        ctx.setLocal({ pilotCase: v });
        App.audit('Caso de piloto seleccionado', `${CASES[v].label} · ${CASES[v].title}`, ACTOR);
        const cd = ctx.$('#plat-case');
        if (cd) cd.innerHTML = String(caseDetail(CASES[v]));
        const ct = ctx.$('#plat-criteria-table');
        if (ct) ct.innerHTML = String(criteriaTable(CASES[v]));
      });
      ctx.on('click', '[data-action="proposal"]', () => openProposal(ctx));

      // Calculadora
      ctx.on('focusin', '.calc-input', (e, el) => { el.dataset.prev = el.value; });
      ctx.on('input', '.calc-input', (e, el) => {
        const id = el.getAttribute('data-calc');
        const key = el.getAttribute('data-key');
        const calc = Object.assign({}, ctx.local.calc || {});
        calc[id] = Object.assign({}, calc[id] || {}, { [key]: el.value === '' ? '' : Number(el.value) });
        ctx.setLocal({ calc });
        refreshCalc(ctx);
      });
      ctx.on('change', '.calc-input', (e, el) => {
        const prev = el.dataset.prev;
        if (prev === el.value) return;
        el.dataset.prev = el.value;
        const row = CALC.find((d) => d.id === el.getAttribute('data-calc'));
        const key = el.getAttribute('data-key');
        const shown = (v) => (v === '' || v == null ? 'vacío' : fmt.minus(v));
        const cur = calcValues(ctx).find((d) => d.id === row.id);
        const state = rowResult(cur).state;
        const note = state === 'invalid' ? ' (dato no válido: no suma)' : state === 'slower' ? ' (más lento que hoy: no suma)' : '';
        App.audit('Supuesto de horas modificado', `${row.label} · ${CALC_AUDIT[key]}: de ${shown(prev)} a ${shown(el.value)}${note}`, ACTOR);
      });
      ctx.on('click', '[data-action="calc-reset"]', () => {
        if (!ctx.local.calc || !Object.keys(ctx.local.calc).length) { App.toast('Los supuestos ya son los de partida', { tone: 'info' }); return; }
        ctx.setLocal({ calc: {} });
        App.audit('Supuestos de horas restablecidos', `${CALC.length} casos con los valores de partida`, ACTOR);
        const body = ctx.$('[data-panel="horas"]');
        if (body) body.innerHTML = String(horasPanel(ctx));
        App.toast('Supuestos restablecidos', { tone: 'ok', icon: 'rotate-ccw' });
      });

      // Registro de auditoría
      ctx.on('segchange', '[data-seg="plat-audit-filter"]', (e) => {
        ctx.setLocal({ auditFilter: e.detail.value });
        const table = ctx.$('#plat-audit-table');
        if (table) table.innerHTML = String(auditTableHTML(e.detail.value, ctx.vars.auditQuery || ''));
      });
      ctx.on('input', '.audit-search', (e, el) => {
        ctx.vars.auditQuery = el.value;
        const table = ctx.$('#plat-audit-table');
        if (table) table.innerHTML = String(auditTableHTML(settings(ctx).auditFilter, el.value));
      });
      ctx.on('click', '[data-action="audit-json"]', () => App.exportAudit());
      ctx.on('click', '[data-action="audit-csv"]', () => exportCSV());

      // El registro se actualiza en vivo mientras la escena está abierta
      if (ctx.vars.unsub) ctx.vars.unsub();
      ctx.vars.unsub = App.on('audit', () => { if (ctx.alive()) refreshAudit(ctx); });
      if (!ctx.vars.abortHooked) {
        ctx.vars.abortHooked = true;
        ctx.signal.addEventListener('abort', () => { if (ctx.vars.unsub) { ctx.vars.unsub(); ctx.vars.unsub = null; } }, { once: true });
      }

      // Las medidas del diagrama dependen de la fuente: se repinta cuando termina de cargar
      if (document.fonts && document.fonts.status !== 'loaded' && !ctx.vars.fontHook) {
        ctx.vars.fontHook = true;
        document.fonts.ready.then(() => { if (ctx.alive()) redrawArch(ctx); }).catch(() => {});
      }
    },
    onLeave(ctx) {
      if (ctx.vars.unsub) { ctx.vars.unsub(); ctx.vars.unsub = null; }
    }
  });
})();
