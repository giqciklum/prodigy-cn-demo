/*
 * Escena «reclamacion» · Reclamación UKC-44718 (SPEC §4.4, con W3 «Hoy / Con Prodigy» y W4 documento controlado).
 *  - El correo es CN_DATA.complaint.email_text tal cual: cabeceras y cuerpo se separan del propio texto.
 *  - Traza, histórico, 8D y respuesta salen de CN_DATA; la relación con DP-2 se presenta siempre como hipótesis.
 *  - Nada se envía ni se retiene sin aprobación de Calidad; rechazar no aplica nada y queda en auditoría.
 *  - Un lote que no está en SAP/Mapex no genera datos: se dice y no se cambia nada.
 *  - render() es idempotente: todo se reconstruye desde ctx.local (analysis, reply).
 */
(function () {
  'use strict';

  const { html, icon, fmt, chip } = App;
  const D = window.CN_DATA;
  const ROLE = D.roles;
  const C = D.complaint;
  const AGENT = 'Reclamaciones de cliente';
  const AGENT_ACTOR = 'Prodigy · agente Reclamaciones de cliente';
  const NC = 'NC-2026-0419';
  const FORM = { code: 'REG-CAL-020-02', rev: '3' };

  /* ---------------------------------------------------------------- Correo (texto original) */

  function parseEmail(raw) {
    const s = String(raw || '').replace(/\r\n/g, '\n');
    const cut = s.indexOf('\n\n');
    const headers = {};
    (cut >= 0 ? s.slice(0, cut) : '').split('\n').forEach((line) => {
      const m = /^([A-Za-z-]+):\s?(.*)$/.exec(line);
      if (m) headers[m[1]] = m[2];
    });
    return { headers, body: (cut >= 0 ? s.slice(cut + 2) : s).replace(/\s+$/, '') };
  }
  const MAIL = parseEmail(C.email_text);
  const HDR = Object.keys(MAIL.headers).length ? MAIL.headers : (C.headers || {});
  const BODY = MAIL.body || C.body || '';
  const addrOf = (s) => { const m = /<([^>]+)>/.exec(String(s || '')); return m ? m[1] : String(s || '').trim(); };
  const nameOf = (s) => String(s || '').replace(/\s*<[^>]*>\s*$/, '').trim();
  const CN_ADDR = addrOf(HDR.To) || 'calidad@cn-demo.example';
  const CN_NAME = nameOf(HDR.To) || 'Calidad, Congelados de Navarra';
  const CUST_ADDR = C.from_address || addrOf(HDR.From);
  const CUST_NAME = nameOf(HDR.From) || C.from_label;
  const RETAILER_DATE = ((/Complaint received by the retailer:\s*(\d{2}\/\d{2}\/\d{4})/.exec(BODY) || [])[1]) || null;
  const REQ_EN = BODY.split('\n').filter((l) => /^- /.test(l)).map((l) => l.slice(2).replace(/[;.]\s*$/, ''));
  const CONFIRM_EN = ((/Please confirm receipt[^\n]*/.exec(BODY) || [])[0] || '').replace(/\.\s*$/, '');
  const DEADLINE_EN = ((/within \d+ working days/.exec(BODY) || [])[0]) || '';
  const ATTACHMENTS = Array.from({ length: (C.evidence && C.evidence.photos) || 0 }, (_, i) => `${C.code}_photo_${i + 1}.jpg`);

  /* ---------------------------------------------------------------- Datos del lote (SAP · Mapex · Easy WMS · GMAO) */

  const LOT = App.lot(C.lot);
  const I = LOT ? LOT.info : {};
  const B = LOT ? LOT.back : {};
  const F = LOT ? LOT.forward : {};
  const byCode = Object.fromEntries(D.machines.map((m) => [m.code, m]));
  const OPT2 = byCode['OPT-2'] || {};
  const DP = ((B.maintenance || I.maintenance || []).find((m) => m.equipment === 'DP-2')) || null;
  const DP_DAYS = DP ? fmt.days(DP.date, D.meta.today) : null;
  const QC = I.qc || B.qc || [];
  const OPT_QC = QC.find((q) => /OPT-2/.test(q)) || '';
  const OPT_M = /rechazo del ([\d,]+)\s*%.*referencia ([\d,]+)\s*%/.exec(OPT_QC);
  const OPT_DAY = OPT_M ? { rate: `${OPT_M[1]} %`, ref: `${OPT_M[2]} %` } : null;
  const SAMPLE_OK = QC.some((q) => /sin piedras/.test(q));
  const PARCELS = (B.parcels || []).map((p) => p.code);
  const SHIPS = F.shipments || [];
  const STOCK = (F.pallets || []).filter((p) => p.status !== 'expedido');
  const STOCK_KG = STOCK.reduce((s, p) => s + (Number(p.kg) || 0), 0);
  const STOCK_LOC = (F.by_location || []).map((l) => l.location).join(', ') || 'SIL-3';
  const HISTORY = (D.complaint_history || []).slice().sort((a, b) => (Number(b.similar) - Number(a.similar)) || String(b.date).localeCompare(String(a.date)));
  const SIMILAR = HISTORY.filter((h) => h.similar);
  const SIM = SIMILAR[0] || null;
  const CAT = { cuerpo_extrano: 'Cuerpo extraño', calidad: 'Calidad', envase: 'Envase' };
  const SHORT_LINE = String(I.line_name || '').replace(/\s*\(.*\)\s*$/, '');
  const ROUTE = (B.route || []).map((r) => r.code);
  const SAME_DAY = B.harvest_date === I.production_date && B.intake && B.intake.date === I.production_date;

  function workingDays(fromIso, toIso) {
    const a = Date.parse(`${fromIso}T00:00:00Z`);
    const b = Date.parse(`${toIso}T00:00:00Z`);
    if (isNaN(a) || isNaN(b)) return null;
    let n = 0;
    for (let t = a; t <= b; t += 86400000) { const w = new Date(t).getUTCDay(); if (w !== 0 && w !== 6) n += 1; }
    return n;
  }
  const DUE_LEFT = workingDays(D.meta.today, C.response_due);
  function isoMs(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(s || ''));
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) : NaN;
  }

  /* El marco pierde el contenedor de avisos (#toasts) al cerrar un modal (core.js lo mueve dentro del
     <dialog> y luego vacía el diálogo). Hasta que se corrija allí, se repone antes de avisar o descargar. */
  function ensureToastHost() {
    if (document.getElementById('toasts')) return;
    const box = document.createElement('div');
    box.className = 'toasts';
    box.id = 'toasts';
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  function toast(msg, opts) { ensureToastHost(); return App.toast(msg, opts); }
  function download(name, mime, content) { ensureToastHost(); return App.downloadFile(name, mime, content); }

  /* ---------------------------------------------------------------- Workflow: grafo y registro */

  const NODES = [
    { id: 'correo', kind: 'trigger', label: 'Correo de cliente', sub: 'Buzón de Calidad', systems: ['Outlook'], icon: 'mail' },
    { id: 'extraccion', label: 'Extracción y validación', systems: ['Modelo de lenguaje', 'SAP'], icon: 'search' },
    { id: 'traza', label: 'Traza del lote', systems: ['SAP', 'MES Mapex', 'Easy WMS', 'GMAO'], icon: 'git-branch' },
    { id: 'historico', label: 'Histórico, 8D y respuesta', systems: ['Elara', 'Procedimientos'], icon: 'clipboard' },
    { id: 'aprobacion', kind: 'approval', label: 'Aprobación de Calidad', sub: ROLE.quality_shift },
    { id: 'salida', kind: 'output', label: 'Respuesta y contención', systems: ['Outlook', 'SAP QM', 'Elara'], icon: 'send' }
  ];
  const EDGES = [['correo', 'extraccion'], ['extraccion', 'traza'], ['traza', 'historico'], ['historico', 'aprobacion'], { from: 'aprobacion', to: 'salida', label: 'aprobado' }];
  /* Estado del grafo cuando termina el paso i del registro. */
  const GRAPH_AT = { 0: { correo: 'done', extraccion: 'active' }, 2: { extraccion: 'done', traza: 'active' }, 8: { traza: 'done', historico: 'active' }, 13: { historico: 'done', aprobacion: 'waiting' } };

  function streamSteps() {
    const recv = fmt.date(C.received_date, C.received_time);
    const ships = SHIPS.map((s) => `${s.id} (${fmt.plural(s.pallets, 'palé', 'palés')}, ${fmt.dayMonth(s.date)})`);
    const temps = SHIPS.map((s) => (D.shipments[s.id] || {}).temp_record).filter(Boolean);
    return [
      { agent: AGENT, system: 'Outlook', action: `Lee el correo de ${CUST_ADDR} en el buzón ${CN_ADDR} (${recv})`, result: `Reclamación de cliente en inglés · ${fmt.plural(ATTACHMENTS.length, 'foto adjunta', 'fotos adjuntas')}`, ms: 320 },
      { agent: AGENT, system: 'Modelo de lenguaje', action: 'Extrae los datos de la reclamación', result: `Lote ${C.lot} · ${C.product_en} · ${C.defect.type} de unos ${C.defect.size_mm} mm · sin lesiones · ref. ${C.code} · informe en 5 días hábiles`, ms: 2900 },
      { agent: AGENT, system: 'SAP', action: 'Valida el lote y el producto extraídos', result: `El lote existe: ${I.product_name}, SKU ${I.sku}, consumo preferente ${I.best_before}. Coincide con el correo`, ms: 410, tone: 'ok' },
      { agent: AGENT, system: 'SAP', action: 'Origen de la materia prima', result: `${B.grower.code} (${B.grower.municipality}) · parcelas ${fmt.list(PARCELS)} · cosecha del ${fmt.date(B.harvest_date)}`, ms: 380 },
      { agent: AGENT, system: 'SAP', action: `Recepción ${B.intake.ticket}`, result: `${fmt.date(B.intake.date)} ${B.intake.time} · ${fmt.t(B.intake.net_t)} · tenderómetro ${B.maturity.tenderometer_tr} TR${SAMPLE_OK ? ' · muestra de 2 kg sin piedras' : ''}`, ms: 350 },
      { agent: AGENT, system: 'MES Mapex', action: `Ruta y controles de proceso del ${fmt.date(I.production_date)}`, result: `${SHORT_LINE}, turno de ${I.shift}: ${fmt.list(ROUTE)}${OPT_DAY ? ` · OPT-2 rechazó el ${OPT_DAY.rate} (referencia ${OPT_DAY.ref})` : ''}`, ms: 520 },
      { agent: AGENT, system: 'GMAO', action: 'Busca órdenes abiertas en los equipos de la ruta', result: DP ? `${DP.work_order} · DP-2: ${String(DP.text).split(';')[0]} (${fmt.date(DP.date)}) · ${DP.status}` : 'Sin órdenes abiertas', ms: 430, tone: DP ? 'warn' : 'ok' },
      { agent: AGENT, system: 'Mecalux Easy WMS', action: 'Localiza los palés del lote', result: `${F.produced_pallets} palés · ${fmt.kg(F.kg_total)}: ${F.shipped_pallets} expedidos y ${F.stock_pallets} en ${STOCK_LOC}`, ms: 460 },
      { agent: AGENT, system: 'SAP', action: 'Expediciones del lote', result: `${fmt.list(ships)} a Freeworld Foods Ltd${temps.length && temps.every((t) => t === 'conforme') ? ' · registro de temperatura conforme' : ''}`, ms: 390 },
      { agent: AGENT, system: 'Elara', action: 'Busca reclamaciones parecidas en los últimos 12 meses', result: SIM ? `${HISTORY.length} reclamaciones con NC · 1 parecida: ${SIM.id} (${String(SIM.description).toLowerCase()})` : `${HISTORY.length} reclamaciones con NC · ninguna parecida`, ms: 540, tone: SIM ? 'warn' : undefined },
      { agent: AGENT, system: 'Procedimientos', action: 'Consulta PNT-CAL-020, PNT-CAL-031 e IT-MAN-DP-02', result: `Informe 8D en 5 días hábiles: antes del ${fmt.date(C.response_due)} · IT-MAN-DP-02 pide inspección reforzada de la malla hasta sustituirla`, ms: 380 },
      { agent: AGENT, system: 'Modelo de lenguaje', action: 'Redacta el borrador 8D (D1–D8) con responsables por rol y fechas', result: 'Borrador completo · la relación con DP-2 queda como hipótesis por confirmar', ms: 5200 },
      { agent: AGENT, system: 'Elara', action: 'Registra la no conformidad y la vincula a la reclamación', result: `${NC} abierta en borrador · vinculada a ${C.code}`, ms: 300, tone: 'ok' },
      { agent: AGENT, system: 'Modelo de lenguaje', action: 'Redacta la respuesta en inglés y su traducción de control', result: `Borrador listo: acuse de recibo, referencia ${NC}, contención y fecha del informe · pendiente de aprobación`, ms: 3100, tone: 'warn' }
    ];
  }
  const STEP_SYSTEMS = Array.from(new Set(streamSteps().map((s) => s.system)));
  const EXTERNAL_SYSTEMS = STEP_SYSTEMS.filter((s) => !['Prodigy', 'Modelo de lenguaje', 'Procedimientos'].includes(s));
  const LLM_CALLS = streamSteps().filter((s) => s.system === 'Modelo de lenguaje').length;

  function graphStatus(st) {
    if (!st.analysis) return {};
    const r = st.reply || {};
    const base = { correo: 'done', extraccion: 'done', traza: 'done', historico: 'done' };
    if (r.status === 'approved') return Object.assign(base, { aprobacion: 'done', salida: 'done' });
    if (r.status === 'rejected') return Object.assign(base, { aprobacion: 'rejected', salida: 'skipped' });
    return Object.assign(base, { aprobacion: 'waiting' });
  }

  /* Workflow publicado en «De palabras a workflow» (contrato App.state.workflows), si lo hay. */
  function complaintWorkflow() {
    const list = (App.state.workflows || []).slice().reverse();
    return list.find((w) => w && w.status !== 'draft'
      && (w.template === 'reclamacion' || /reclamaci|complaint/i.test([w.name, w.trigger && (w.trigger.type || w.trigger.label)].filter(Boolean).join(' ')))) || null;
  }

  /* ---------------------------------------------------------------- Textos: traducción y respuesta */

  const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const ES_MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function longDate(iso, months) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso)); return m ? `${Number(m[3])} ${months === ES_MONTHS ? 'de ' : ''}${months[Number(m[2]) - 1]}${months === ES_MONTHS ? ' de' : ''} ${m[1]}` : String(iso); }
  const enNum = (n) => Number(n).toLocaleString('en-GB');
  const lowerFirst = (t) => { const x = String(t || ''); return x.charAt(0).toLowerCase() + x.slice(1); };
  const EN_SHIFT = { mañana: 'morning', tarde: 'afternoon', noche: 'night' };

  function translationES() {
    return [
      'Estimado equipo de Calidad:',
      '',
      'Hemos recibido una reclamación de un consumidor a través de nuestro cliente minorista del Reino Unido (gama de congelados de marca propia) sobre el producto indicado abajo, y necesitamos vuestro apoyo para investigarla con prioridad.',
      '',
      `Producto: ${C.product_en} (marca propia del minorista)`,
      `Código de lote: ${C.lot}`,
      `Consumo preferente: ${C.best_before}`,
      `Referencia del consumidor: ${C.code}`,
      `Reclamación recibida por el minorista: ${RETAILER_DATE || '—'}`,
      '',
      `El consumidor indica que, al servir el producto, encontró un cuerpo extraño pequeño y duro que parece una piedra de unos ${C.defect.size_mm} mm. No se han comunicado lesiones. El consumidor conserva el objeto y el minorista ha compartido dos fotografías (adjuntas). La muestra física está de camino a nuestra oficina del Reino Unido y os la enviaremos en cuanto la recibamos.`,
      '',
      'Al tratarse de una reclamación por contaminación física en un producto de marca propia del minorista, nuestro cliente pide un informe de investigación completo en un plazo de 5 días hábiles, que incluya:',
      '- la trazabilidad del lote (materia prima, cosecha, recepción y línea de proceso);',
      '- los controles de eliminación de piedras y de cuerpos extraños de la línea (despedregadora, selección óptica) y sus registros de la fecha de producción;',
      '- la causa raíz y las acciones correctivas y preventivas;',
      '- la confirmación de si hay otro stock del mismo lote afectado.',
      '',
      'Os pedimos que confirméis la recepción y nos indiquéis vuestra referencia de investigación.',
      '',
      'Un saludo,',
      '',
      'Equipo de Quality Assurance',
      'Freeworld Foods Ltd'
    ].join('\n');
  }

  function replyDraftEN() {
    const ships = SHIPS.map((s) => `${s.id} on ${fmt.date(s.date)}`).join(' and ');
    const origin = SAME_DAY
      ? `from peas harvested and received on the same day (grower ${B.grower.code}, intake ${B.intake.ticket})`
      : `from peas harvested on ${fmt.date(B.harvest_date)} and received on ${fmt.date(B.intake.date)} (grower ${B.grower.code}, intake ${B.intake.ticket})`;
    return [
      'Dear Quality Assurance Team,',
      '',
      `Thank you for your email of ${longDate(C.received_date, EN_MONTHS)}. We confirm receipt of consumer complaint ${C.code} (foreign body: a ${C.defect.type_en} of approximately ${C.defect.size_mm} mm) concerning ${C.product_en}, lot ${C.lot}, best before ${C.best_before}. We are sorry for the concern caused to the consumer and note that no injury has been reported.`,
      '',
      `Our investigation reference is ${NC}. The complaint is being handled under our customer complaint procedure and will be documented in an 8D report.`,
      '',
      'Initial findings from our records:',
      `- Traceability: the lot was produced at our Fustiñana plant on ${fmt.date(I.production_date)} (line ${I.line}, ${EN_SHIFT[I.shift] || I.shift} shift) ${origin}.`,
      `- Distribution: ${F.produced_pallets} pallets (${enNum(F.kg_total)} kg) were produced. ${F.shipped_pallets} pallets were dispatched to Freeworld Foods Ltd (${ships}). The remaining ${F.stock_pallets} pallets at our warehouse have been placed on quality hold.`,
      `- Foreign-body controls: we are reviewing the destoner and optical sorting records for the production date, together with the maintenance records of line ${I.line}.`,
      '',
      'Next steps:',
      `- We will examine the physical sample as soon as it arrives. Please send it for the attention of our Quality department in Fustiñana, quoting ${NC}.`,
      `- We will send you the investigation report, including root cause and corrective and preventive actions, by ${longDate(C.response_due, EN_MONTHS)}.`,
      `- To confirm whether any other stock is affected, could you please let us know the quantity of lot ${C.lot} still held by Freeworld Foods and by the retailer?`,
      '',
      'Kind regards,',
      '',
      'Quality Department',
      'Congelados de Navarra · Fustiñana plant',
      CN_ADDR
    ].join('\n');
  }

  function replyControlES() {
    const ships = SHIPS.map((s) => `${s.id} el ${fmt.date(s.date)}`).join(' y ');
    const origin = SAME_DAY
      ? `con guisante cosechado y recibido el mismo día (agricultor ${B.grower.code}, recepción ${B.intake.ticket})`
      : `con guisante cosechado el ${fmt.date(B.harvest_date)} y recibido el ${fmt.date(B.intake.date)} (agricultor ${B.grower.code}, recepción ${B.intake.ticket})`;
    return [
      'Estimado equipo de Quality Assurance:',
      '',
      `Gracias por su correo del ${longDate(C.received_date, ES_MONTHS)}. Confirmamos la recepción de la reclamación del consumidor ${C.code} (cuerpo extraño: una piedra de unos ${C.defect.size_mm} mm) sobre ${C.product_en}, lote ${C.lot}, consumo preferente ${C.best_before}. Lamentamos la preocupación causada al consumidor y tomamos nota de que no se han comunicado lesiones.`,
      '',
      `Nuestra referencia de investigación es ${NC}. La reclamación se gestiona según nuestro procedimiento de reclamaciones de cliente y se documentará en un informe 8D.`,
      '',
      'Primeros datos de nuestros registros:',
      `- Trazabilidad: el lote se fabricó en nuestra planta de Fustiñana el ${fmt.date(I.production_date)} (línea ${I.line}, turno de ${I.shift}) ${origin}.`,
      `- Distribución: se fabricaron ${F.produced_pallets} palés (${fmt.kg(F.kg_total)}). ${F.shipped_pallets} palés se expidieron a Freeworld Foods Ltd (${ships}). Los ${F.stock_pallets} palés que quedan en nuestro almacén se han retenido por Calidad.`,
      `- Controles de cuerpos extraños: estamos revisando los registros de la despedregadora y de la selección óptica de la fecha de producción, junto con los registros de mantenimiento de la línea ${I.line}.`,
      '',
      'Próximos pasos:',
      `- Examinaremos la muestra física en cuanto llegue. Les rogamos que la envíen a la atención de nuestro departamento de Calidad en Fustiñana, indicando ${NC}.`,
      `- Les enviaremos el informe de investigación, con la causa raíz y las acciones correctivas y preventivas, a más tardar el ${longDate(C.response_due, ES_MONTHS)}.`,
      `- Para confirmar si hay otro stock afectado, ¿pueden indicarnos la cantidad del lote ${C.lot} que conservan Freeworld Foods y el minorista?`,
      '',
      'Un saludo,',
      '',
      'Departamento de Calidad',
      'Congelados de Navarra · planta de Fustiñana',
      CN_ADDR
    ].join('\n');
  }

  function replyText(st) { const r = st.reply || {}; return r.text || replyDraftEN(); }
  const REPLY_SUBJECT = `RE: ${HDR.Subject || `Complaint ${C.code}`} - CN ref. ${NC}`;

  /* ---------------------------------------------------------------- Borrador 8D (datos neutros: se pintan en la vista y en el informe) */

  function d3Status(st) {
    const r = st.reply || {};
    if (r.status === 'approved') return { text: 'Aplicada', tone: 'ok' };
    if (r.status === 'rejected') return { text: 'No aplicada', tone: 'neutral' };
    return { text: 'Pendiente de aprobación', tone: 'warn' };
  }

  function eightD(st) {
    const today = D.meta.today;
    const sscc = STOCK.map((p) => p.sscc);
    return [
      { d: 'D1', title: 'Equipo', owner: [ROLE.quality_plant], date: today, status: { text: 'Propuesto', tone: 'draft' },
        lead: `Líder: ${ROLE.quality_plant}.`,
        items: [
          `${ROLE.quality_shift}: investigación y contacto con el cliente`,
          `${ROLE.line_maintenance}: DP-2 y OPT-2 (línea ${I.line})`,
          `${ROLE.campaign_manager}: materia prima de ${B.grower.code}`,
          `${ROLE.dispatch_shift}: stock en ${STOCK_LOC} y expediciones`
        ],
        note: `Contacto externo: ${CUST_NAME}.` },
      { d: 'D2', title: 'Descripción del problema', owner: [ROLE.quality_shift], date: today, status: { text: 'Completo', tone: 'ok' },
        lead: `Un consumidor del Reino Unido encontró una ${C.defect.type} de unos ${C.defect.size_mm} mm al servir ${C.product_en} (marca blanca de un retailer, vía Freeworld Foods Ltd). Sin lesiones.`,
        items: [
          `Lote ${C.lot}, consumo preferente ${C.best_before}, fabricado el ${fmt.date(I.production_date)} en ${SHORT_LINE}, turno de ${I.shift}: ${F.produced_pallets} palés, ${fmt.kg(F.kg_total)}`,
          `Reclamación en el retailer el ${RETAILER_DATE || '—'}; en Calidad, el ${fmt.date(C.received_date, C.received_time)}`,
          `${fmt.cap(C.defect.hazard)}`,
          `Evidencias: ${fmt.plural(ATTACHMENTS.length, 'foto', 'fotos')}; muestra física en camino`
        ] },
      { d: 'D3', title: 'Contención', owner: [ROLE.quality_shift, ROLE.line_maintenance], date: today, status: d3Status(st),
        items: [
          `Retener los ${F.stock_pallets} palés del lote en ${STOCK_LOC} (SSCC ${fmt.list(sscc)}) en SAP QM y Easy WMS. Requiere aprobación (PNT-CAL-015)`,
          `Pedir a Freeworld Foods el stock que queda de ${fmt.list(SHIPS.map((s) => `${s.id} (${fmt.plural(s.pallets, 'palé', 'palés')})`))}`,
          'Inspección reforzada de la malla de DP-2 hasta sustituirla (IT-MAN-DP-02)',
          `Revisar en SAP y Mapex los lotes procesados en ${I.line} desde el ${DP ? fmt.date(DP.date) : '—'}, fecha del desgaste anotado`
        ] },
      { d: 'D4', title: 'Causa raíz', owner: [ROLE.quality_plant, ROLE.line_maintenance], date: '2026-10-01', status: { text: 'Hipótesis', tone: 'warn' },
        lead: DP ? `Hipótesis principal, a confirmar: el desgaste de la malla de la despedregadora DP-2 (anotado el ${fmt.date(DP.date)}; ${DP.work_order} ${DP.status}) dejó pasar la piedra en la fabricación del ${fmt.date(I.production_date)}.` : 'Sin hipótesis: pendiente de la muestra.',
        items: [
          `A favor: el lote pasó por DP-2 un día después de anotarse el desgaste${SIM ? `; ${SIM.id} tuvo una causa del mismo tipo (Alcorioja)` : ''}`,
          `Por aclarar: ${SAMPLE_OK ? 'la muestra de recepción de 2 kg salió sin piedras' : 'la muestra de recepción'}${OPT_DAY ? ` y OPT-2 rechazó el ${OPT_DAY.rate} ese turno (referencia ${OPT_DAY.ref})` : ''}`,
          `Verificación: examen de la muestra del cliente, inspección de la malla, registros de OPT-2 del ${fmt.date(I.production_date)} y análisis de 5 porqués`
        ] },
      { d: 'D5', title: 'Acciones correctivas', owner: [ROLE.line_maintenance], date: '2026-10-02', status: { text: 'Planificado', tone: 'info' },
        items: [
          `Sustituir la malla de DP-2 y cerrar ${DP ? DP.work_order : 'la orden abierta'}`,
          'Verificar el ajuste de OPT-2 para piedras con muestras de referencia'
        ] },
      { d: 'D6', title: 'Implantación y eficacia', owner: [ROLE.quality_shift], date: '2026-10-09', status: { text: 'Planificado', tone: 'info' },
        items: [
          `Tras el cambio de malla, rechazo de OPT-2 en su referencia (${fmt.pct(OPT2.baseline)}) durante 5 turnos; hoy está en el ${fmt.pct(OPT2.reading)}`,
          `Inspección reforzada del producto terminado de ${I.line} sin piedras`
        ] },
      { d: 'D7', title: 'Prevención de la recurrencia', owner: [ROLE.quality_plant], date: '2026-10-16', status: { text: 'Planificado', tone: 'info' },
        items: [
          'Revisar IT-MAN-DP-02: plazo máximo para trabajar con una malla desgastada y stock mínimo de mallas de repuesto',
          `Extender la revisión de mallas a las despedregadoras de todas las plantas${SIM ? ` (causa del mismo tipo que ${SIM.nc}, Alcorioja)` : ''}`,
          'Aviso automático cuando el rechazo de una selectora óptica duplique su referencia'
        ] },
      { d: 'D8', title: 'Cierre y reconocimiento', owner: [ROLE.quality_plant], date: '2026-10-23', status: { text: 'Planificado', tone: 'info' },
        items: [
          `Informe final a Freeworld Foods y cierre de ${NC} en Elara con la evidencia de eficacia`,
          'Reconocimiento al equipo'
        ] }
    ];
  }

  /* ---------------------------------------------------------------- Comprobación de lotes (nunca inventa) */

  function lotCheck(raw) {
    const code = String(raw || '').trim().toUpperCase();
    if (!code) return { kind: 'empty', code };
    if (code === C.lot) return { kind: 'same', code };
    const other = App.lot(code);
    if (!other) return { kind: 'unknown', code };
    if (other.info.sku === C.sku) return { kind: 'same-product', code, lot: other };
    return { kind: 'mismatch', code, lot: other };
  }
  function lotCheckCallout(res) {
    if (res.kind === 'empty') return App.callout({ tone: 'warn', icon: 'search', title: 'Escribe un código de lote', body: `Formato ${C.lot}.` });
    if (res.kind === 'same') return App.callout({ tone: 'ok', icon: 'check-circle', title: `${res.code} es el lote de la ficha`, body: `Existe en SAP/Mapex y corresponde a ${I.product_name} (SKU ${I.sku}). Sin cambios.` });
    if (res.kind === 'unknown') return App.callout({ tone: 'warn', icon: 'search', title: `No encuentro el lote «${res.code}» en SAP/Mapex`, body: 'No se cambia la ficha ni se muestra ninguna traza: Prodigy no genera datos que no estén en los sistemas. Si el código del cliente es dudoso, pide una foto de la etiqueta del envase.' });
    const o = res.lot.info;
    if (res.kind === 'mismatch') return App.callout({ tone: 'warn', icon: 'alert-triangle', title: `El lote ${res.code} no corresponde a esta reclamación`, body: `Existe en SAP, pero es ${o.product_name} (SKU ${o.sku}), fabricado el ${fmt.date(o.production_date)} en ${o.line_name}. La reclamación es de ${C.product_en} (SKU ${C.sku}): no se cambia la ficha.` });
    return App.callout({ tone: 'warn', icon: 'alert-triangle', title: `${res.code} es del mismo producto`, body: 'Para cambiar el lote de una reclamación abierta, confírmalo con el cliente (foto de la etiqueta). No se cambia la ficha.' });
  }

  /* ---------------------------------------------------------------- Piezas de la vista */

  function statusChip(st) {
    const r = st.reply || {};
    if (!st.analysis) return chip('open', 'Abierta · sin analizar');
    if (r.status === 'approved') return chip('sent', 'Respuesta enviada · 8D en curso');
    if (r.status === 'rejected') return chip('rejected', 'Respuesta rechazada');
    return chip('waiting', 'Esperando aprobación');
  }

  function analyzeButton(size) {
    return html`<button type="button" class="btn btn-primary${size ? ' btn-' + size : ''}" data-action="analyze">${icon('play')}<span>Analizar reclamación</span></button>`;
  }

  function head(st) {
    const r = st.reply || {};
    const actions = !st.analysis
      ? analyzeButton()
      : html`<button type="button" class="btn btn-secondary" data-action="report">${icon('printer')}<span>Descargar informe 8D</span></button>
        ${r.status === 'pending' ? html`<button type="button" class="btn btn-primary" data-action="scroll-reply">${icon('user-check')}<span>Revisar y aprobar</span></button>` : ''}`;
    return App.pageHead({
      title: `Reclamación ${C.code}`,
      meta: [
        { icon: 'mail', text: `Recibida el ${fmt.date(C.received_date, C.received_time)}` },
        { icon: 'building', text: `${C.customer_label} · ${C.on_behalf_of}` },
        { icon: 'calendar', text: `Informe antes del ${fmt.date(C.response_due)}` },
        statusChip(st)
      ],
      actions
    });
  }

  function runCard(st) {
    const a = st.analysis;
    const wf = complaintWorkflow();
    const wfChip = wf ? chip({ tone: 'brand', icon: 'workflow', label: `«${wf.name}» ${wf.version || 'v1'} publicado` }) : '';
    const graph = App.planGraph({ id: 'rc-graph', title: 'Workflow de reclamación de cliente', nodes: NODES, edges: EDGES, status: graphStatus(st) });
    if (!a) {
      return App.card({
        id: 'rc-run',
        title: 'Workflow «Reclamación de cliente»',
        sub: 'Se lanza al entrar una reclamación en el buzón de Calidad · PNT-CAL-020',
        icon: 'workflow',
        actions: wfChip,
        body: html`<div class="rc-run-grid" id="rc-run-grid"><div class="rc-run-main">${graph}</div><div class="rc-run-side"><div id="rc-stream" hidden></div></div></div>`,
        footer: html`<span class="muted small">Lee el correo, extrae y valida los datos, traza el lote y prepara el 8D y la respuesta. Nada sale sin la aprobación de Calidad.</span><span class="spacer"></span>${analyzeButton('sm')}`
      });
    }
    return App.card({
      id: 'rc-run',
      title: `Análisis completado en ${fmt.ms(a.ms)}`,
      sub: `${streamSteps().length} pasos · ${EXTERNAL_SYSTEMS.length} sistemas consultados · ${LLM_CALLS} llamadas al modelo de lenguaje · ${fmt.time(a.at)}`,
      icon: 'workflow',
      actions: wfChip,
      body: html`<div class="rc-run-grid has-side" id="rc-run-grid"><div class="rc-run-main">${graph}</div><div class="rc-run-side stack">
        ${App.stats([
          { label: `Palés del lote · ${F.shipped_pallets} expedidos y ${F.stock_pallets} en ${STOCK_LOC}`, value: F.produced_pallets },
          { label: `Orden abierta en DP-2 · ${DP ? `${DP_DAYS} días` : '—'}`, value: DP ? DP.work_order : '—', tone: DP ? 'warn' : undefined },
          { label: SIM ? `Reclamación parecida · ${SIM.id}` : 'Reclamaciones parecidas', value: SIMILAR.length, tone: SIMILAR.length ? 'warn' : undefined },
          { label: `Días hábiles para el informe · vence el ${fmt.date(C.response_due)}`, value: DUE_LEFT, tone: 'warn' }
        ])}
        <details class="run-log">
          <summary>${icon('chevron-right', 16)}<span>Registro de ejecución · ${streamSteps().length} pasos · ${fmt.ms(a.ms)}</span></summary>
          <div class="mt-2" id="rc-log"></div>
        </details>
      </div></div>`
    });
  }

  const MAIL_HIGHLIGHTS = [
    { text: C.product_en, label: 'Producto', tone: 'brand' },
    { text: C.lot, label: 'Lote', tone: 'brand' },
    { text: C.best_before, label: 'Consumo pref.', tone: 'brand' },
    { text: C.code, label: 'Ref.' },
    { text: `stone of approximately ${C.defect.size_mm} mm`, label: 'Defecto', tone: 'crit' },
    { text: 'No injury has been reported', label: 'Sin lesiones', tone: 'ok' },
    { text: 'two photographs (attached)', label: 'Evidencia' },
    { text: 'The physical sample is on its way', label: 'Muestra' },
    { text: DEADLINE_EN, label: 'Plazo' }
  ].filter((h) => h.text && BODY.includes(h.text));

  function mailCard(st) {
    const headers = { From: HDR.From, To: HDR.To, Date: HDR.Date, Subject: HDR.Subject };
    const original = App.emailView({ headers, text: BODY, attachments: ATTACHMENTS, highlights: st.analysis ? MAIL_HIGHLIGHTS : [] });
    const body = st.analysis
      ? App.tabs({ id: 'rc-mail', flush: true, label: 'Correo del cliente', tabs: [
        { id: 'en', label: 'Correo (inglés)', body: html`<p class="muted small mb-2">Resaltado: lo que Prodigy ha extraído (${MAIL_HIGHLIGHTS.length} datos). El texto no se modifica.</p>${original}` },
        { id: 'es', label: 'Traducción al español', body: html`<p class="muted small mb-2">Traducción de control para la revisión; el original en inglés es el que vale.</p>${App.emailView({ headers: { Subject: 'Reclamación de cliente · cuerpo extraño (piedra) · Garden Peas 1kg · lote ' + C.lot + ' · ref. ' + C.code }, text: translationES() })}` }
      ] })
      : html`<div class="card-body">${original}</div>`;
    return App.card({
      id: 'rc-mail-card',
      title: 'Correo del cliente',
      sub: `${CUST_ADDR} · buzón ${CN_ADDR} · inglés`,
      icon: 'mail',
      flush: true,
      actions: html`<button type="button" class="btn btn-ghost btn-sm" data-action="eml-original" title="Correo tal como se recibió">${icon('download', 15)}<span>Original (.eml)</span></button>`,
      body
    });
  }

  function sheetRows() {
    const ok = (t) => html`<span class="sub"><span class="t-ok">${icon('check', 13)}</span> ${t}</span>`;
    const sub = (t) => html`<span class="sub">${t}</span>`;
    return [
      { k: 'Referencia', v: html`<span class="code strong">${C.code}</span>${sub('Referencia del consumidor en el retailer')}` },
      { k: 'Cliente', v: html`${C.customer_label}${sub(`${C.customer} · cliente final: ${C.on_behalf_of}`)}` },
      { k: 'Producto', v: html`${I.product_name}${ok(`SKU ${I.sku} · coincide con el lote en SAP`)}` },
      { k: 'Lote', v: html`<span class="row" style="gap:4px 10px">${App.lotTag(C.lot)}<button type="button" class="link-btn small" data-action="fix-lot">Corregir</button></span>${ok(`Existe en SAP/Mapex · fabricado el ${fmt.date(I.production_date)} en ${SHORT_LINE}`)}` },
      { k: 'Consumo preferente', v: html`${C.best_before}${ok('Coincide con SAP')}` },
      { k: 'Defecto', v: html`Cuerpo extraño: ${C.defect.type} de unos ${C.defect.size_mm} mm${sub(fmt.cap(C.defect.hazard))}` },
      { k: 'Lesiones', v: html`No${sub('«No injury has been reported»')}` },
      { k: 'Evidencias', v: html`${fmt.plural(ATTACHMENTS.length, 'foto adjunta', 'fotos adjuntas')} · muestra física en camino` },
      { k: 'Fechas', v: html`Retailer: ${RETAILER_DATE || '—'} · Calidad: ${fmt.date(C.received_date, C.received_time)}` },
      { k: 'Plazo', v: html`<span class="row" style="gap:4px 8px"><span>Informe antes del ${fmt.date(C.response_due)}</span>${chip('pending', `${DUE_LEFT} días hábiles`)}</span>${sub('5 días hábiles desde la recepción · PNT-CAL-020')}` },
      { k: 'Registro', v: html`<span class="code strong">${NC}</span>${sub('No conformidad en Elara, vinculada a la reclamación')}` }
    ];
  }

  function sheetCard(st) {
    if (!st.analysis) {
      return App.card({
        id: 'rc-sheet',
        title: 'Ficha de la reclamación',
        sub: 'Se rellena al analizar el correo',
        icon: 'clipboard',
        body: App.empty({ icon: 'search', title: 'Pendiente de análisis', text: 'Prodigy extraerá del correo el lote, el producto, el defecto, la referencia y el plazo, y los comprobará en SAP antes de preparar el 8D y la respuesta.' })
      });
    }
    return App.card({
      id: 'rc-sheet',
      title: 'Ficha de la reclamación',
      sub: 'Datos extraídos del correo y comprobados en SAP y Elara',
      icon: 'clipboard',
      flush: true,
      body: App.table({ hideHead: true, dense: true, rows: sheetRows(), cols: [
        { label: 'Dato', width: '30%', render: (r) => html`<span class="muted">${r.k}</span>` },
        { label: '', render: (r) => r.v }
      ] })
    });
  }

  function paramNote(ctx) {
    const p = ctx.params && ctx.params[0];
    if (!p) return '';
    const res = lotCheck(p);
    if (res.kind === 'same') return '';
    return html`<div class="mb-4">${lotCheckCallout(res)}</div>`;
  }

  function traceCard(st) {
    const sent = st.reply && st.reply.status === 'approved';
    const route = html`${ROUTE.map((c, i) => html`${i ? html`<span class="muted">${icon('chevron-right', 12)}</span>` : ''}<span class="${c === 'DP-2' ? 'strong t-warn' : 'code'}">${c}</span>`)}`;
    const items = [];
    if (DP) items.push({ time: fmt.dayMonth(DP.date), title: 'Mantenimiento · despedregadora DP-2', text: `${fmt.cap(String(DP.text))}.`, tone: 'warn', meta: html`<span class="code">${DP.work_order}</span>${chip('open', fmt.cap(DP.status))}` });
    items.push({ time: fmt.dayMonth(B.harvest_date), title: 'Campo · cosecha', text: `${B.grower.code} (${B.grower.municipality}, ${B.grower.zone}) · parcelas ${fmt.list(PARCELS)} · guisante`, tone: 'brand' });
    items.push({ time: fmt.dayMonth(B.intake.date), timeSub: B.intake.time, title: `Recepción ${B.intake.ticket}`, text: `${fmt.t(B.intake.net_t)} · tenderómetro ${B.maturity.tenderometer_tr} TR (especificación ${String(B.maturity.spec).replace('-', '–')})${SAMPLE_OK ? ' · muestra de 2 kg sin piedras ni terrones' : ''}`, tone: 'ok' });
    items.push({ time: fmt.dayMonth(I.production_date), title: `Proceso · ${SHORT_LINE}, turno de ${I.shift}`, text: route, tone: 'brand' });
    items.push({ time: fmt.dayMonth(I.production_date), title: 'Controles del turno', text: `${OPT_DAY ? `OPT-2: rechazo del ${OPT_DAY.rate} (referencia ${OPT_DAY.ref})` : 'OPT-2 sin registro'} · ENV-4: peso y sellado conformes`, tone: 'ok' });
    const fwdRows = SHIPS.map((s) => ({ id: s.id, dest: String(s.customer).replace(/\s*\(.*\)\s*$/, ''), sub: s.end_customer || '', pallets: s.pallets, when: fmt.date(s.date, s.time), status: chip('shipped', 'Expedida') }))
      .concat((F.by_location || []).map((l) => ({ id: l.location, dest: l.label, sub: `SSCC ${fmt.list(STOCK.filter((p) => p.location === l.location).map((p) => p.sscc))}`, pallets: l.pallets, when: 'En stock', status: sent ? chip('hold', 'Retenido') : chip('pending', 'Retención propuesta') })));
    const transport = SHIPS.length ? fmt.minus((D.shipments[SHIPS[0].id] || {}).transport || '') : '';
    return App.card({
      id: 'rc-trace',
      title: `Traza del lote ${C.lot}`,
      sub: `${fmt.list(['SAP', 'MES Mapex', 'Mecalux Easy WMS', 'GMAO'])} · hacia atrás y hacia delante`,
      icon: 'git-branch',
      actions: html`<button type="button" class="btn btn-secondary btn-sm" data-lot="${C.lot}">${icon('barcode', 15)}<span>Traza completa · ${F.produced_pallets} SSCC</span></button>`,
      body: html`<div class="grid cols-2">
          <div>
            <div class="h3 mb-4">Hacia atrás</div>
            ${App.timeline({ items })}
          </div>
          <div>
            <div class="h3 mb-4">Hacia delante</div>
            <div class="card flat">${App.table({ dense: true, rows: fwdRows, cols: [
              { label: 'Destino', render: (r) => html`<span class="code strong">${r.id}</span><span class="sub">${r.dest}${r.sub ? html` · ${r.sub}` : ''}</span>` },
              { label: 'Palés', key: 'pallets', num: true },
              { label: 'Fecha', render: (r) => html`<span class="nowrap">${r.when}</span>` },
              { label: 'Estado', render: (r) => r.status }
            ] })}</div>
            <p class="muted small mt-2">${F.produced_pallets} palés · ${fmt.kg(F.kg_total)}${transport ? ` · ${transport}` : ''} · registro de temperatura conforme en las ${SHIPS.length} expediciones.</p>
          </div>
        </div>
        <div class="mt-4">${hypothesisCallout()}</div>`
    });
  }

  function hypothesisCallout() {
    if (!DP) return App.callout({ tone: 'brand', icon: 'info', title: 'Sin hipótesis de causa', body: 'No hay órdenes abiertas en los equipos de la ruta. La causa se investiga con la muestra.' });
    return App.callout({
      tone: 'warn',
      icon: 'wrench',
      title: 'Hipótesis de causa probable · a confirmar por Calidad',
      body: html`<p>La malla de la despedregadora DP-2 tenía desgaste anotado el ${fmt.date(DP.date)} (${DP.work_order}, ${DP.status}) y este lote pasó por DP-2 el ${fmt.date(I.production_date)}, un día después.</p>
        <p class="mt-2">Por aclarar: ${SAMPLE_OK ? 'la muestra de recepción de 2 kg salió sin piedras' : 'la muestra de recepción'}${OPT_DAY ? ` y OPT-2 rechazó el ${OPT_DAY.rate} ese turno (referencia ${OPT_DAY.ref})` : ''}. Hoy OPT-2 rechaza el ${fmt.pct(OPT2.reading)} (referencia ${fmt.pct(OPT2.baseline)}) y la orden sigue abierta (${DP_DAYS} días).</p>
        <p class="mt-2">Se confirma con la muestra del cliente, la inspección de la malla y los registros de OPT-2. Hasta entonces no se comunica al cliente.</p>`
    });
  }

  function requestsCard(st) {
    const r = st.reply || {};
    const replyChip = r.status === 'approved' ? chip('sent', 'Enviado') : r.status === 'rejected' ? chip('rejected', 'No enviado') : chip('waiting', 'Pendiente de aprobación');
    const q = (i) => (REQ_EN[i] ? html`<span class="muted">«${REQ_EN[i]}»</span>` : '');
    const items = [
      { icon: r.status === 'approved' ? 'check-circle' : 'clock', tone: r.status === 'approved' ? 'ok' : 'warn', title: 'Acuse de recibo y referencia de investigación', meta: [`Respuesta al cliente · ${NC}`], body: CONFIRM_EN ? html`<span class="muted">«${CONFIRM_EN}»</span>` : '', side: replyChip },
      { icon: 'check-circle', tone: 'ok', title: 'Trazabilidad del lote: materia prima, cosecha, recepción y línea', meta: ['D2 y anexo A del 8D'], body: q(0), side: chip('ok', 'Reunida') },
      { icon: 'clock', tone: 'warn', title: `Controles de despedregado y cuerpos extraños, con sus registros del ${fmt.date(I.production_date)}`, meta: [`D4 · DP-2, OPT-2 y ${DP ? DP.work_order : '—'}`], body: q(1), side: chip('review', 'Falta valorarlos') },
      { icon: 'clock', tone: 'warn', title: 'Causa raíz y acciones correctivas y preventivas', meta: ['D4, D5 y D7 del 8D'], body: q(2), side: chip('review', 'Hipótesis') },
      { icon: 'check-circle', tone: 'ok', title: '¿Hay más stock afectado del mismo lote?', meta: [`D3 · ${F.shipped_pallets} palés expedidos y ${F.stock_pallets} en ${STOCK_LOC}`], body: q(3), side: r.status === 'approved' ? chip('hold', `${F.stock_pallets} palés retenidos`) : chip('ok', 'Localizado') },
      { icon: 'calendar', tone: 'warn', title: 'Informe completo en 5 días hábiles', meta: ['Envío del 8D (D1–D5)'], body: DEADLINE_EN ? html`<span class="muted">«${DEADLINE_EN}»</span>` : '', side: chip('pending', `Antes del ${fmt.dayMonth(C.response_due)}`) }
    ];
    return App.card({
      id: 'rc-requests',
      title: 'Lo que pide el cliente',
      sub: `${items.length} peticiones del correo y dónde se responden`,
      icon: 'list-checks',
      flush: true,
      body: App.list(items)
    });
  }

  function historyCard() {
    const table = App.table({
      dense: true,
      rows: HISTORY,
      rowClass: (h) => (h.similar ? 'tone-warn' : ''),
      cols: [
        { label: 'Reclamación', render: (h) => html`<span class="code strong">${h.id}</span><span class="sub">${fmt.date(h.date)}</span>` },
        { label: 'Producto y lote', render: (h) => html`${h.product}<span class="sub code">${h.lot}</span>` },
        { label: 'Motivo', render: (h) => html`${h.description}<span class="sub">${CAT[h.category] || fmt.cap(h.category)} · ${h.customer_label}</span>` },
        { label: 'Causa raíz', render: (h) => html`${h.root_cause}<span class="sub">${h.nc} · ${fmt.text(h.status)}</span>` },
        { label: 'Relación', render: (h) => (h.similar ? chip('warn', 'Parecida') : chip('neutral', 'Distinta')) }
      ]
    });
    const note = SIM ? App.callout({
      tone: 'brand',
      icon: 'history',
      title: `Mismo tipo de causa que ${SIM.id}`,
      body: `${SIM.description} (${fmt.date(SIM.date)}): ${lowerFirst(SIM.root_cause)}; ${SIM.nc} ${fmt.text(SIM.status)}. Si se confirma la hipótesis de DP-2, sería la segunda piedra por una malla desgastada en menos de un año: el 8D propone en D7 revisar las mallas de todas las plantas.`
    }) : '';
    return App.card({
      id: 'rc-history',
      title: 'Reclamaciones anteriores',
      sub: `Elara · últimos 12 meses · ${HISTORY.length} con no conformidad · ${SIMILAR.length} parecida`,
      icon: 'history',
      flush: true,
      body: html`${table}${note ? html`<div class="card-body">${note}</div>` : ''}`
    });
  }

  function eightDCard(st) {
    const tone = (t) => (t === 'draft' ? 'draft' : t);
    return App.card({
      id: 'rc-8d',
      title: `Borrador 8D · ${NC}`,
      sub: `PNT-CAL-020 · al cliente antes del ${fmt.date(C.response_due)} con D1–D5; D6–D8 en seguimiento`,
      icon: 'clipboard',
      flush: true,
      actions: html`<button type="button" class="btn btn-secondary btn-sm" data-action="report">${icon('printer', 15)}<span>Descargar informe 8D</span></button>`,
      body: App.table({
        rows: eightD(st),
        rowClass: (x) => (x.status.tone === 'warn' ? 'tone-warn' : x.status.tone === 'ok' ? 'tone-ok' : ''),
        cols: [
          { label: 'Disciplina', width: '15%', render: (x) => html`<span class="strong">${x.d} · ${x.title}</span>` },
          { label: 'Borrador', render: (x) => html`<div class="prose">${x.lead ? html`<p>${x.lead}</p>` : ''}${x.items && x.items.length ? html`<ul>${x.items.map((t) => html`<li>${t}</li>`)}</ul>` : ''}${x.note ? html`<p class="muted">${x.note}</p>` : ''}</div>` },
          { label: 'Responsable', width: '19%', render: (x) => html`${x.owner[0]}${x.owner.slice(1).map((o) => html`<span class="sub">${o}</span>`)}` },
          { label: 'Fecha', width: '10%', render: (x) => html`<span class="nowrap">${fmt.date(x.date)}</span>` },
          { label: 'Estado', width: '13%', render: (x) => chip(tone(x.status.tone), x.status.text) }
        ]
      })
    });
  }

  const REPLY_HIGHLIGHTS = [
    { text: NC, label: 'Referencia', tone: 'brand' },
    { text: 'have been placed on quality hold', label: 'Contención', tone: 'brand' },
    { text: `by ${longDate(C.response_due, EN_MONTHS)}`, label: 'Compromiso', tone: 'brand' }
  ];

  function replyCard(st) {
    const r = st.reply || {};
    const sent = r.status === 'approved';
    const text = replyText(st);
    const headers = { From: `${CN_NAME} <${CN_ADDR}>`, To: `${CUST_NAME} <${CUST_ADDR}>`, Date: sent && r.decidedAt ? fmt.date(r.decidedAt, { time: true }) : null, Subject: REPLY_SUBJECT };
    const edited = !!r.text;
    const esNote = edited
      ? html`<p class="small mb-2 t-warn">La traducción corresponde al borrador de Prodigy; la versión ${r.version} incluye cambios de Calidad en el texto en inglés.</p>`
      : html`<p class="muted small mb-2">Traducción de control para quien aprueba; no se envía.</p>`;
    const title = sent ? `Respuesta enviada · ${fmt.time(r.decidedAt)}` : r.status === 'rejected' ? `Respuesta rechazada · versión ${r.version}` : `Respuesta al cliente · borrador v${r.version || 1}`;
    return App.card({
      id: 'rc-reply-card',
      title,
      sub: `Para ${CUST_ADDR} · en inglés${edited ? ' · editada por Calidad' : ''}`,
      icon: 'send',
      iconTone: sent ? 'ok' : undefined,
      flush: true,
      body: App.tabs({ id: 'rc-reply-tabs', flush: true, label: 'Respuesta al cliente', tabs: [
        { id: 'en', label: sent ? 'Enviada (inglés)' : 'Inglés · se envía', body: App.emailView({ headers, text, highlights: REPLY_HIGHLIGHTS }) },
        { id: 'es', label: 'Traducción de control', body: html`${esNote}${App.emailView({ headers: { Subject: `RE: Reclamación de cliente · ref. ${C.code} · ref. CN ${NC}` }, text: replyControlES() })}` }
      ] }),
      footer: html`<span class="row row-nowrap muted small" style="align-items:flex-start">${icon('shield-check', 16)}<span>Criterio de redacción: confirma hechos de SAP y Easy WMS y compromete fechas; no adelanta la causa (la hipótesis de DP-2 no está confirmada) ni habla de retirada.</span></span>
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost btn-sm" data-action="eml">${icon('download', 15)}<span>${sent ? 'Respuesta enviada (.eml)' : 'Borrador (.eml)'}</span></button>`
    });
  }

  function approvalBlock(st) {
    const r = st.reply || { status: 'pending', version: 1 };
    const st0 = r.status || 'pending';
    const sent = st0 === 'approved';
    const scope = [
      { label: 'Respuesta en inglés', value: `v${r.version || 1}${r.text ? ' · editada' : ''}`, status: sent ? 'sent' : 'pending', chip: sent ? 'Enviada' : 'Enviar' },
      { label: `Palés en ${STOCK_LOC}`, value: `${fmt.plural(F.stock_pallets, 'palé', 'palés')} · ${fmt.kg(STOCK_KG)}`, status: sent ? 'hold' : 'pending', chip: sent ? 'Retenidos' : 'Retener' },
      { label: 'Palés expedidos', value: fmt.plural(F.shipped_pallets, 'palé', 'palés'), status: 'evaluate', chip: 'Consultar al cliente' }
    ];
    const doneActions = sent
      ? html`<button type="button" class="btn btn-secondary btn-sm" data-action="eml">${icon('download', 15)}<span>Respuesta (.eml)</span></button><button type="button" class="btn btn-primary btn-sm" data-action="report">${icon('printer', 15)}<span>Descargar informe 8D</span></button>`
      : st0 === 'rejected' ? html`<button type="button" class="btn btn-primary btn-sm" data-action="new-version">${icon('edit', 15)}<span>Preparar nueva versión</span></button>` : '';
    const comment = sent
      ? `Siguiente paso: confirmar la causa con la muestra (D4) y enviar el informe 8D antes del ${fmt.date(C.response_due)}.`
      : st0 === 'rejected' ? `Motivo: ${r.reason || '—'}` : null;
    const summary = sent
      ? `Calidad ha aprobado la respuesta y la contención. Prodigy ha enviado el correo a ${CUST_ADDR}, ha retenido el stock del lote y ha actualizado ${NC}.`
      : st0 === 'rejected'
        ? 'Calidad ha rechazado la propuesta: no se ha enviado la respuesta ni se ha retenido ningún palé.'
        : `Prodigy ha preparado la respuesta en inglés para ${CUST_ADDR} y la retención del stock que queda del lote. No se envía ni se retiene nada hasta que Calidad lo apruebe.`;
    return html`<div class="stack" id="rc-approval" style="position:sticky;top:calc(var(--topbar-h) + 16px);align-self:start">${App.approvalCard({
      id: 'rc-reply',
      status: st0,
      title: 'Respuesta a Freeworld Foods Ltd y contención',
      summary,
      approver: ROLE.quality_shift,
      policy: 'PNT-CAL-020 · PNT-CAL-015',
      scope,
      effects: [
        `Outlook: respuesta enviada desde ${CN_ADDR}`,
        `SAP QM y Easy WMS: bloqueo de calidad del lote y ${fmt.plural(F.stock_pallets, 'palé inmovilizado', 'palés inmovilizados')} en ${STOCK_LOC}`,
        `Elara: ${NC} pasa a «En curso» con la respuesta adjunta`
      ],
      editable: true,
      editLabel: 'Editar respuesta',
      approveLabel: 'Aprobar y enviar',
      rejectLabel: 'Rechazar',
      decidedBy: r.decidedBy,
      decidedAt: r.decidedAt,
      comment,
      doneActions
    })}</div>`;
  }

  function measuredSeconds(st) {
    const a = st.analysis;
    const r = st.reply || {};
    if (!a || r.status !== 'approved' || !r.decidedAt) return null;
    const review = (isoMs(r.decidedAt) - isoMs(a.at)) / 1000;
    return Math.max(0, Math.round((a.ms || 0) / 1000 + (isNaN(review) ? 0 : review)));
  }

  function compareCard(st) {
    const a = st.analysis;
    const sec = measuredSeconds(st);
    const timeCell = sec != null
      ? html`<span class="strong t-ok">${fmt.dur(sec)}</span> medidos en esta sesión<span class="sub">Análisis automático de ${fmt.ms(a.ms)}; el resto, revisión y aprobación de Calidad</span>`
      : html`<span class="strong">${fmt.ms(a.ms)}</span> de análisis automático<span class="sub">El total se mide al aprobar la respuesta</span>`;
    const rows = [
      { k: 'Personas que intervienen', hoy: '3–4: Calidad, Producción, Mantenimiento y Expedición', pro: html`<span class="strong">1</span>: Calidad revisa, corrige si hace falta y aprueba` },
      { k: 'Sistemas que hay que abrir', hoy: `${EXTERNAL_SYSTEMS.length}: Outlook, SAP, Mapex, Easy WMS, GMAO y Elara`, pro: html`<span class="strong">1</span>: esta consola; Prodigy consulta los ${EXTERNAL_SYSTEMS.length}` },
      { k: 'Pasos', hoy: '12–15 búsquedas, cruces y redacciones a mano', pro: html`<span class="strong">${streamSteps().length}</span> automáticos y <span class="strong">1</span> aprobación` },
      { k: 'Traza, 8D en borrador y respuesta', hoy: '2–5 h de trabajo, repartidas en 1–2 días', pro: timeCell }
    ];
    return App.card({
      id: 'rc-compare',
      title: 'Esta reclamación: hoy y con Prodigy',
      sub: '«Hoy»: supuesto ilustrativo que se valida con la línea base del piloto · «Con Prodigy»: duración de la simulación, no rendimiento de producción',
      icon: 'bar-chart',
      flush: true,
      body: App.table({
        rows,
        rowClass: (r) => (r.k.startsWith('Traza') ? 'tone-ok' : ''),
        cols: [
          { label: '', width: '26%', render: (r) => html`<span class="strong">${r.k}</span>` },
          { label: 'Hoy · estimación', width: '37%', render: (r) => html`<span class="slate">${r.hoy}</span>` },
          { label: 'Con Prodigy · simulación', render: (r) => r.pro }
        ]
      }),
      footer: html`<span class="row row-nowrap muted small" style="align-items:flex-start">${icon('list-checks', 16)}<span>Criterio de aceptación propuesto para el piloto: traza y borrador en menos de 15 minutos, y Calidad acepta el borrador con ediciones menores en al menos el 70 % de los casos.</span></span>`
    });
  }

  /* ---------------------------------------------------------------- Acciones */

  async function analyze(ctx) {
    if (ctx.local.analysis || ctx.vars.busy) return;
    ctx.vars.busy = true;
    App.audit('Análisis de reclamación solicitado', `${C.code} · correo de ${CUST_ADDR} del ${fmt.date(C.received_date, C.received_time)}`);
    ctx.$$('[data-action="analyze"]').forEach((b) => {
      b.disabled = true;
      b.classList.add('is-busy');
      b.innerHTML = String(html`<span class="spinner"></span><span>Analizando…</span>`);
    });
    const host = ctx.$('#rc-stream');
    host.hidden = false;
    const grid = ctx.$('#rc-run-grid');
    if (grid) grid.classList.add('has-side', 'is-running');
    const card = ctx.$('#rc-run');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    ctx.presenter({ next: 'Mientras corre: señalar la línea de GMAO (la orden de la malla de DP-2 abierta desde el 18/08) y la de Elara (reclamación parecida). Si hace falta, «Acelerar».' });
    const startedAt = App.nowISO();
    App.planGraph.set(ctx.root, { correo: 'active' });
    const run = App.reasoningStream(host, streamSteps(), {
      title: `Agente ${AGENT}`,
      signal: ctx.signal,
      maxHeight: 380,
      start: startedAt,
      onStep: (s, i) => { if (GRAPH_AT[i]) App.planGraph.set(ctx.root, GRAPH_AT[i]); }
    });
    const res = await run.done;
    if (!ctx.alive()) return;
    ctx.vars.busy = false;
    ctx.setLocal({ analysis: { startedAt, at: App.nowISO(), ms: res.ms, steps: res.steps }, reply: { status: 'pending', version: 1 } });
    App.audit('Reclamación analizada', `${C.code} · lote ${C.lot} · ${res.steps} pasos · ${fmt.ms(res.ms)}`, AGENT_ACTOR);
    App.audit('No conformidad registrada en borrador', `${NC} · Elara · vinculada a ${C.code}`, AGENT_ACTOR);
    App.audit('Borrador 8D preparado', `${NC} · D1–D8 · causa de DP-2 como hipótesis`, AGENT_ACTOR);
    App.audit('Respuesta al cliente redactada', `${C.code} · inglés · versión 1 · pendiente de aprobación`, AGENT_ACTOR);
    toast(`Reclamación analizada en ${fmt.ms(res.ms)} · 8D y respuesta en borrador`, { tone: 'ok' });
    ctx.presenter(null);
    ctx.rerender();
    requestAnimationFrame(() => { const el = ctx.$('#rc-extract'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }

  async function approve(ctx) {
    const r = ctx.local.reply || {};
    if (!ctx.local.analysis || r.status !== 'pending' || ctx.vars.sending) return;
    ctx.vars.sending = true;
    const btn = ctx.$('[data-approval="approve"]');
    if (btn) { btn.disabled = true; btn.classList.add('is-busy'); btn.innerHTML = String(html`<span class="spinner"></span><span>Enviando…</span>`); }
    await ctx.sleep(600);
    if (!ctx.alive()) return;
    ctx.vars.sending = false;
    const at = App.nowISO();
    ctx.setLocal({ reply: Object.assign({}, r, { status: 'approved', decidedAt: at, decidedBy: ROLE.quality_shift }) });
    App.audit('Respuesta aprobada y enviada', `${C.code} · versión ${r.version || 1} · a ${CUST_ADDR} · ${NC}`);
    App.audit('Correo enviado', `Outlook · de ${CN_ADDR} a ${CUST_ADDR} · «${REPLY_SUBJECT}»`, AGENT_ACTOR);
    App.audit('Retención de calidad aplicada', `SAP QM y Easy WMS · lote ${C.lot} · ${fmt.plural(F.stock_pallets, 'palé', 'palés')} en ${STOCK_LOC}`, AGENT_ACTOR);
    App.audit('No conformidad actualizada', `${NC} · En curso · respuesta adjunta`, AGENT_ACTOR);
    App.outcome('reclamacion', { status: 'sent', label: `Respuesta enviada · ${NC} en curso` });
    toast(`Respuesta enviada a Freeworld Foods Ltd · ${fmt.plural(F.stock_pallets, 'palé retenido', 'palés retenidos')} en ${STOCK_LOC}`, { tone: 'ok', icon: 'send' });
    ctx.rerender();
    requestAnimationFrame(() => { const el = ctx.$('#rc-compare'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  }

  async function reject(ctx) {
    const r = ctx.local.reply || {};
    if (!ctx.local.analysis || r.status !== 'pending') return;
    const reason = await App.promptText({
      title: 'Rechazar la respuesta',
      kicker: `Reclamación ${C.code}`,
      text: 'No se envía la respuesta ni se retiene ningún palé. El motivo queda en el registro de auditoría.',
      label: 'Motivo',
      placeholder: 'Por ejemplo: esperar a la muestra antes de responder',
      required: true,
      confirmLabel: 'Rechazar'
    });
    if (reason == null || !ctx.alive()) return;
    const cur = ctx.local.reply || {};
    if (cur.status !== 'pending') return;
    ctx.setLocal({ reply: Object.assign({}, cur, { status: 'rejected', decidedAt: App.nowISO(), decidedBy: ROLE.quality_shift, reason }) });
    App.audit('Respuesta rechazada', `${C.code} · versión ${cur.version || 1} · motivo: ${reason} · no se envía ni se retiene nada`);
    toast('Respuesta rechazada: no se ha enviado nada ni se ha retenido ningún palé', { tone: 'info' });
    ctx.rerender();
  }

  function newVersion(ctx) {
    const r = ctx.local.reply || {};
    if (r.status !== 'rejected') return;
    const version = (r.version || 1) + 1;
    ctx.setLocal({ reply: { status: 'pending', version, text: r.text || null, previous: { version: r.version, reason: r.reason } } });
    App.audit('Nueva versión de la respuesta', `${C.code} · versión ${version} · pendiente de aprobación`);
    ctx.rerender();
    requestAnimationFrame(() => { const el = ctx.$('#rc-reply'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }

  function editReply(ctx) {
    const r = ctx.local.reply || {};
    if (r.status !== 'pending') return;
    const current = replyText(ctx.local);
    const fid = App.uid('rc-edit');
    const m = App.modal({
      title: 'Editar la respuesta al cliente',
      kicker: `Reclamación ${C.code} · versión ${r.version || 1}`,
      size: 'lg',
      body: html`<div class="field"><label class="label" for="${fid}">Texto en inglés (se envía tal cual)</label><textarea id="${fid}" class="textarea" rows="18" style="min-height:360px" spellcheck="true">${current}</textarea><span class="hint">Los cambios crean una versión nueva y quedan en el registro de auditoría.</span></div>`,
      actions: [
        { label: 'Cancelar', variant: 'secondary' },
        {
          label: 'Guardar versión',
          icon: 'save',
          variant: 'primary',
          onClick: (api) => {
            const ta = api.body.querySelector('textarea');
            const t = String(ta.value || '').replace(/\s+$/, '');
            if (!t.trim()) { ta.focus(); return false; }
            if (t === current) return undefined;
            const version = (r.version || 1) + 1;
            ctx.setLocal({ reply: Object.assign({}, r, { text: t, version }) });
            App.audit('Respuesta editada', `${C.code} · versión ${version} · ${t.length - current.length >= 0 ? '+' : '−'}${Math.abs(t.length - current.length)} caracteres`);
            toast(`Versión ${version} guardada · pendiente de aprobación`, { tone: 'ok', icon: 'save' });
            setTimeout(() => ctx.rerender(), 0);
            return undefined;
          }
        }
      ]
    });
    setTimeout(() => { const ta = m && m.body.querySelector('textarea'); if (ta) ta.focus(); }, 40);
  }

  function openLotFix(ctx) {
    const fid = App.uid('rc-lot');
    const m = App.modal({
      title: 'Corregir el lote de la reclamación',
      kicker: `Reclamación ${C.code}`,
      size: 'sm',
      body: html`<p class="slate mb-4">Si el cliente ha copiado mal el código, escribe el lote correcto. Prodigy lo busca en SAP/Mapex y comprueba que corresponde al producto reclamado antes de cambiar nada.</p>
        <div class="field"><label class="label" for="${fid}">Código de lote</label><input id="${fid}" class="input mono" value="${C.lot}" autocomplete="off" spellcheck="false" data-lotfix-input><span class="hint">Formato ${C.lot}</span></div>
        <div class="mt-4" data-lotfix-result></div>`,
      actions: [
        { label: 'Cerrar', variant: 'secondary' },
        { label: 'Comprobar en SAP/Mapex', icon: 'search', variant: 'primary', close: false, onClick: (api) => { runCheck(api); return false; } }
      ]
    });
    if (!m) return;
    function runCheck(api) {
      const input = api.body.querySelector('[data-lotfix-input]');
      const res = lotCheck(input.value);
      api.body.querySelector('[data-lotfix-result]').innerHTML = String(lotCheckCallout(res));
      if (res.kind === 'unknown') App.audit('Corrección de lote no aplicada', `${res.code} no existe en SAP/Mapex · ${C.code}`);
      else if (res.kind === 'mismatch' || res.kind === 'same-product') App.audit('Corrección de lote no aplicada', `${res.code} · ${res.lot.info.product_name} (SKU ${res.lot.info.sku}) · ${C.code}`);
      else if (res.kind === 'same') App.audit('Lote de la reclamación comprobado', `${res.code} · sin cambios`);
    }
    const input = m.body.querySelector('[data-lotfix-input]');
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); runCheck(m); } });
    setTimeout(() => { input.focus(); input.select(); }, 40);
  }

  /* ---------------------------------------------------------------- Descargas */

  const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad2 = (n) => String(n).padStart(2, '0');
  function rfcDate(iso) {
    const t = isoMs(iso);
    const d = new Date(isNaN(t) ? Date.UTC(2026, 8, 29, 7, 5) : t);
    return `${WD_EN[d.getUTCDay()]}, ${d.getUTCDate()} ${MON_EN[d.getUTCMonth()]} ${d.getUTCFullYear()} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} +0200`;
  }

  function downloadReply(ctx) {
    const st = ctx.local;
    if (!st.analysis) return;
    const r = st.reply || {};
    const sent = r.status === 'approved';
    const when = sent && r.decidedAt ? r.decidedAt : App.nowISO();
    const stamp = String(when).replace(/\D/g, '');
    const lines = [
      `From: "${CN_NAME}" <${CN_ADDR}>`,
      `To: "${CUST_NAME}" <${CUST_ADDR}>`,
      `Subject: ${REPLY_SUBJECT}`,
      `Date: ${rfcDate(when)}`,
      `Message-ID: <${NC}.${stamp}@cn-demo.example>`,
      sent ? null : 'X-Unsent: 1',
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      sent ? `X-Prodigy-Approval: ${ROLE.quality_shift}; ${fmt.date(when, { time: true })}` : `X-Prodigy-Status: draft v${r.version || 1}, pending approval`,
      '',
      replyText(st)
    ].filter((x) => x != null);
    download(sent ? `respuesta-${C.code}.eml` : `borrador-respuesta-${C.code}.eml`, 'message/rfc822', lines.join('\r\n').replace(/\r?\n/g, '\r\n') + '\r\n');
  }

  function downloadOriginal() {
    download(`${C.code}-correo-original.eml`, 'message/rfc822', String(C.email_text).replace(/\r?\n/g, '\r\n'));
  }

  function openReport(ctx) {
    const st = ctx.local;
    if (!st.analysis) return;
    const r = st.reply || {};
    const approved = r.status === 'approved';
    const rejected = r.status === 'rejected';
    const esc = App.esc;
    const tag = (s) => App.raw(`<span class="tag ${s.tone === 'warn' ? 'warn' : s.tone === 'ok' ? 'ok' : s.tone === 'crit' ? 'crit' : ''}">${esc(s.text)}</span>`);
    const stateText = approved ? 'Aprobado para envío · D4 abierta' : rejected ? 'Borrador · respuesta rechazada' : 'Borrador · pendiente de aprobación';
    const pageCss = `<style>@page{@bottom-left{content:"${FORM.code} rev. ${FORM.rev} · ${NC}";font:8.5px Inter,system-ui,sans-serif;color:var(--muted)}@bottom-center{content:"Documento generado por Prodigy · demostración con datos sintéticos";font:8.5px Inter,system-ui,sans-serif;color:var(--muted)}@bottom-right{content:"Página " counter(page) " de " counter(pages);font:8.5px Inter,system-ui,sans-serif;color:var(--muted)}}</style>`;
    const dSections = eightD(st).map((x) => ({
      heading: `${x.d} · ${x.title}`,
      html: App.raw(`${x.lead ? `<p>${esc(x.lead)}</p>` : ''}${x.items && x.items.length ? `<ul>${x.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}${x.note ? `<p class="muted">${esc(x.note)}</p>` : ''}<p class="muted" style="margin-top:6px">Responsable: ${esc(x.owner.join(' · '))} · Fecha objetivo: ${esc(fmt.date(x.date))} · Estado: ${String(tag(x.status))}</p>`)
    }));
    const traceRows = (B.steps || []).map((s) => ({ etapa: s.stage, fecha: fmt.text(s.when), detalle: fmt.text(s.detail).replace(/\s*\u2192\s*/g, ', '), ref: s.ref || '—' }))
      .concat(SHIPS.map((s) => ({ etapa: 'Expedición', fecha: fmt.date(s.date, s.time), detalle: `${fmt.plural(s.pallets, 'palé', 'palés')} a ${s.customer}${s.end_customer ? ` · ${s.end_customer}` : ''} · ${fmt.minus(s.transport || '')}`, ref: s.id })))
      .concat((F.by_location || []).map((l) => ({ etapa: 'Stock', fecha: fmt.date(D.meta.today), detalle: `${fmt.plural(l.pallets, 'palé', 'palés')} en ${l.label}${approved ? ' · retenidos por Calidad' : ''}`, ref: l.location })));
    const approvals = [
      { paso: 'Borradores 8D y respuesta', rol: AGENT_ACTOR, fecha: fmt.date(st.analysis.at, { time: true }), estado: { text: 'Completado', tone: 'ok' } },
      { paso: 'Respuesta al cliente y contención (D3)', rol: ROLE.quality_shift, fecha: r.decidedAt ? fmt.date(r.decidedAt, { time: true }) : '—', estado: approved ? { text: 'Aprobado', tone: 'ok' } : rejected ? { text: 'Rechazado', tone: 'neutral' } : { text: 'Pendiente', tone: 'warn' } },
      { paso: 'Confirmación de la causa raíz (D4)', rol: ROLE.quality_plant, fecha: '—', estado: { text: 'Pendiente', tone: 'warn' } },
      { paso: 'Cierre del 8D (D8)', rol: ROLE.quality_plant, fecha: '—', estado: { text: 'Pendiente', tone: 'warn' } }
    ];
    ensureToastHost();
    App.printableReport({
      title: `Informe 8D · reclamación ${C.code}`,
      subtitle: `Cuerpo extraño (${C.defect.type} de unos ${C.defect.size_mm} mm) en ${C.product_en} · lote ${C.lot} · ${C.customer_label}, ${C.on_behalf_of}`,
      kicker: 'Documento controlado · vista previa',
      code: FORM.code,
      filename: `informe-8D-${NC}-${C.code}`,
      meta: [['Revisión', FORM.rev], ['Registro', NC], ['Planta', 'Fustiñana (FUS)'], ['Estado', stateText], ['Reclamación', `${C.code} · ${fmt.date(C.received_date)}`], ['Lote', C.lot], ['Informe al cliente', `antes del ${fmt.date(C.response_due)}`]],
      sections: [
        { heading: 'Resumen', html: App.raw(`${pageCss}<p>${esc(`Reclamación de ${C.customer_label} por un retailer del Reino Unido (marca blanca): ${C.defect.type} de unos ${C.defect.size_mm} mm en ${C.product_en}, lote ${C.lot}. Sin lesiones. El lote se fabricó el ${fmt.date(I.production_date)} en ${SHORT_LINE}; ${F.shipped_pallets} de sus ${F.produced_pallets} palés están expedidos y ${F.stock_pallets} siguen en ${STOCK_LOC}.`)}</p><p>${esc(DP ? `Hipótesis de causa, pendiente de confirmar con la muestra: desgaste de la malla de la despedregadora DP-2 (${DP.work_order}, abierta desde el ${fmt.date(DP.date)}).` : 'Causa pendiente de la muestra.')}</p>`) },
        ...dSections,
        { heading: 'Anexo A · Traza del lote', table: { cols: [{ label: 'Etapa', key: 'etapa' }, { label: 'Fecha', key: 'fecha' }, { label: 'Detalle', key: 'detalle' }, { label: 'Referencia', render: (x) => App.raw(`<span class="code" style="white-space:nowrap">${esc(x.ref)}</span>`) }], rows: traceRows } },
        { heading: `Anexo B · Palés del lote (${(F.pallets || []).length} SSCC)`, table: { cols: [{ label: 'Palé', render: (p) => `${p.n}/${p.of}`, num: true }, { label: 'SSCC', render: (p) => App.raw(`<span class="code">${esc(p.sscc)}</span>`) }, { label: 'Kg', render: (p) => fmt.num(p.kg), num: true }, { label: 'Ubicación', key: 'location_label' }, { label: 'Estado', render: (p) => (p.status === 'expedido' ? 'Expedido' : approved ? 'Retenido' : 'En stock') }, { label: 'Expedición', render: (p) => p.shipment || '—' }], rows: F.pallets || [] } },
        { heading: 'Anexo C · Reclamaciones anteriores (12 meses)', table: { cols: [{ label: 'Reclamación', render: (h) => App.raw(`<span class="code" style="white-space:nowrap">${esc(h.id)}</span><br><span class="muted">${esc(fmt.date(h.date))}</span>`) }, { label: 'Producto y lote', render: (h) => App.raw(`${esc(h.product)}<br><span class="code muted" style="white-space:nowrap">${esc(h.lot)}</span>`) }, { label: 'Motivo', key: 'description' }, { label: 'Causa raíz', key: 'root_cause' }, { label: 'NC', render: (h) => `${h.nc} · ${fmt.text(h.status)}` }, { label: 'Relación', render: (h) => (h.similar ? App.raw('<span class="tag warn">Parecida</span>') : 'Distinta') }], rows: HISTORY } },
        { heading: 'Aprobaciones', table: { cols: [{ label: 'Paso', key: 'paso' }, { label: 'Rol', key: 'rol' }, { label: 'Fecha y hora', key: 'fecha' }, { label: 'Estado', render: (x) => tag(x.estado) }], rows: approvals } }
      ],
      signatures: [
        { role: ROLE.quality_shift, note: approved ? `Aprobado el ${fmt.date(r.decidedAt, { time: true })}` : rejected ? `Rechazado el ${fmt.date(r.decidedAt, { time: true })}` : 'Pendiente de aprobación' },
        { role: ROLE.quality_plant, note: 'Confirmación de causa (D4) y cierre (D8) · pendiente' }
      ],
      footer: `Documento generado por Prodigy el ${fmt.date(App.nowISO(), { time: true })} · demostración con datos sintéticos · preparado por Ciklum`
    });
  }

  /* ---------------------------------------------------------------- Registro de la escena */

  function sceneState(state) { return (state.scenes && state.scenes.reclamacion) || {}; }

  App.scene({
    id: 'reclamacion',
    order: 40,
    section: 'Calidad',
    nav: `Reclamación ${C.code}`,
    title: `Reclamación ${C.code}`,
    icon: 'mail',
    presenter: {
      say: (state) => {
        const st = sceneState(state);
        const r = st.reply || {};
        if (!st.analysis) {
          return [
            `Correo de Freeworld Foods, la filial de Congelados de Navarra en el Reino Unido, por un retailer de marca blanca: una piedra de unos ${C.defect.size_mm} mm en guisante de 1 kg. Llegó el sábado ${fmt.dayMonth(C.received_date)} a las ${C.received_time}, en inglés y con plazo.`,
            'En producción, Prodigy lo analiza en cuanto entra en el buzón de Calidad. Aquí lo lanzamos a mano para ver qué hace y qué sistemas consulta.'
          ];
        }
        if (r.status === 'approved') {
          return [
            `Aprobada: respuesta enviada, ${F.stock_pallets} palés retenidos en ${STOCK_LOC} y la ${NC} en curso en Elara. Todo queda en el registro de auditoría.`,
            'La comparación de abajo: hoy, 3–4 personas y 6 sistemas durante horas; aquí, una revisión y una aprobación. La cifra de «hoy» la medimos en el piloto, no la inventamos.',
            'El informe 8D se descarga como documento controlado: código, revisión, estado, aprobaciones y número de página.'
          ];
        }
        if (r.status === 'rejected') {
          return ['Rechazada: no se ha enviado nada ni se ha retenido ningún palé. El motivo queda en auditoría.', 'Se puede preparar otra versión, editarla y volver a aprobar.'];
        }
        return [
          'Lo resaltado en el correo es lo que Prodigy ha extraído. Cada dato se comprueba en SAP: el lote existe y el producto coincide.',
          `La traza: cosecha del ${fmt.dayMonth(B.harvest_date)} de ${B.grower.code}, recepción ${B.intake.ticket} a las ${B.intake.time} y línea ${I.line}. ${F.shipped_pallets} palés ya están en el Reino Unido y ${F.stock_pallets} siguen en ${STOCK_LOC}.`,
          `El dato que cambia la investigación: la malla de DP-2 tenía una orden abierta desde el ${fmt.dayMonth(DP ? DP.date : B.harvest_date)}, un día antes de fabricar el lote. Es una hipótesis, no la causa: la confirma Calidad con la muestra.`,
          SIM ? `Histórico: en noviembre de 2025 hubo una piedra en espinaca con una causa del mismo tipo en Alcorioja (${SIM.id}). El 8D lo recoge en la prevención (D7).` : 'Sin reclamaciones parecidas en el histórico.',
          'La respuesta en inglés confirma hechos y fechas y no adelanta la causa. No sale hasta que Calidad la aprueba.'
        ];
      },
      next: (state) => {
        const st = sceneState(state);
        const r = st.reply || {};
        if (!st.analysis) return 'Pulsar «Analizar reclamación» y leer en voz alta dos líneas del registro: el sistema consultado y lo que encuentra.';
        if (r.status === 'approved') return 'Pulsar «Descargar informe 8D» y enseñar la cabecera del documento. Después, pasar a «Procedimientos» en la barra lateral.';
        if (r.status === 'rejected') return 'Pulsar «Preparar nueva versión» y después «Aprobar y enviar».';
        return 'Pulsar «Revisar y aprobar» (arriba) o bajar hasta la respuesta y pulsar «Aprobar y enviar». Opcional: «Corregir» el lote con uno inexistente para enseñar que no inventa datos.';
      }
    },
    render(root, ctx) {
      const st = ctx.local;
      if (!LOT) {
        root.innerHTML = String(html`${App.pageHead({ title: `Reclamación ${C.code}` })}
          ${App.card({ body: App.callout({ tone: 'warn', icon: 'search', title: `No encuentro el lote «${C.lot}» en SAP/Mapex`, body: 'No se muestra traza ni se prepara el 8D: Prodigy no genera datos que no estén en los sistemas.' }) })}`);
        return;
      }
      root.innerHTML = String(html`<div class="rc-wrap">
        ${head(st)}
        ${paramNote(ctx)}
        ${runCard(st)}
        ${st.analysis
          ? html`<div class="grid cols-7-5 rc-split section" id="rc-extract"><div class="stack">${mailCard(st)}</div><div class="stack">${sheetCard(st)}${requestsCard(st)}</div></div>
          <div class="section">${traceCard(st)}</div>
          <div class="section">${historyCard()}</div>
          <div class="section">${eightDCard(st)}</div>
          <div class="grid cols-7-5 rc-split section" id="rc-reply"><div class="stack">${replyCard(st)}</div>${approvalBlock(st)}</div>
          <div class="section">${compareCard(st)}</div>`
          : html`<div class="grid cols-7-5 rc-split section" id="rc-extract">${mailCard(st)}${sheetCard(st)}</div>`}
      </div>`);
      const log = ctx.$('#rc-log');
      if (log && st.analysis) App.reasoningStream(log, streamSteps(), { title: `Agente ${AGENT}`, instant: true, start: st.analysis.startedAt || st.analysis.at, maxHeight: 420 });
      ctx.on('click', '[data-action="analyze"]', () => analyze(ctx));
      ctx.on('click', '[data-action="report"]', () => openReport(ctx));
      ctx.on('click', '[data-action="eml"]', () => downloadReply(ctx));
      ctx.on('click', '[data-action="eml-original"]', () => downloadOriginal());
      ctx.on('click', '[data-action="fix-lot"]', () => openLotFix(ctx));
      ctx.on('click', '[data-action="new-version"]', () => newVersion(ctx));
      ctx.on('click', '[data-action="scroll-reply"]', () => { const el = ctx.$('#rc-approval') || ctx.$('#rc-reply'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      ctx.on('click', '[data-approval="approve"]', () => approve(ctx));
      ctx.on('click', '[data-approval="reject"]', () => reject(ctx));
      ctx.on('click', '[data-approval="edit"]', () => editReply(ctx));
    }
  });
})();
