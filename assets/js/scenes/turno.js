/*
 * Escena «turno» · Resumen del turno (SPEC §4.1). Escena de referencia para el resto:
 *  - todas las cifras salen de window.CN_DATA (nada escrito a mano que pueda contradecirlo);
 *  - render() es idempotente y reconstruye la vista desde App.state (ctx.local);
 *  - el flujo animado actualiza solo su contenedor y, al terminar, guarda estado y llama a ctx.rerender();
 *  - cada acción del usuario y de los agentes queda en App.audit().
 */
(function () {
  'use strict';

  const { html, icon, fmt, chip, sys } = App;
  const D = window.CN_DATA;
  const ROLE = D.roles;
  const AGENT = 'Parte diario de planta';
  const AGENT_ACTOR = 'Prodigy · agente Parte diario de planta';

  /* ---------------------------------------------------------------- Datos derivados */

  const exc = D.excursion_c07;
  const chamber = D.chamber_c07;
  const lotsC07 = D.lots_in_c07;
  const palletsC07 = lotsC07.reduce((s, l) => s + l.pallets, 0);
  const kgC07 = lotsC07.reduce((s, l) => s + l.kg, 0);
  const shipments = Array.from(new Set(lotsC07.map((l) => l.planned_shipment)))
    .map((id) => Object.assign({ id }, D.shipments[id]))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const firstShipment = shipments[0];
  const complaint = D.complaint;
  const complaintLot = D.lots[complaint.lot];
  const dpOrder = (complaintLot.back.maintenance || []).find((m) => m.equipment === 'DP-2');
  const daysOpen = fmt.days(dpOrder.date, D.meta.today);
  const byCode = Object.fromEntries(D.machines.map((m) => [m.code, m]));
  const SEV = { critical: 0, warning: 1 };
  const machines = D.machines.slice().sort((a, b) => {
    const sa = SEV[a.status] != null ? SEV[a.status] : 2;
    const sb = SEV[b.status] != null ? SEV[b.status] : 2;
    if (sa !== sb) return sa - sb;
    return a.ccp === b.ccp ? 0 : (a.ccp ? -1 : 1);
  });
  const crit = machines.filter((m) => m.status === 'critical');
  const warn = machines.filter((m) => m.status === 'warning');
  const okm = machines.filter((m) => !m.status);
  const metrics = new Set(D.machines.map((m) => m.metric)).size;

  const statusKey = (m) => (m.status === 'critical' ? 'critical' : m.status === 'warning' ? 'warning' : 'ok');
  const unitShort = (u) => String(u || '').replace(/ (aire|agua|rechazo|RMS)$/, '');
  function valueWithUnit(v, unit) { return `${fmt.num(v)} ${unit}`; }
  function limitsText(m) {
    const t = D.thresholds[m.metric];
    if (!t) return '';
    const u = unitShort(m.unit);
    if (t.direction === 'high') return `aviso > ${fmt.num(t.warning_abs)} · crítico > ${fmt.num(t.critical_abs)} ${u}`;
    if (t.direction === 'both') return `aviso ±${fmt.num(t.warning_abs_delta)} · crítico ±${fmt.num(t.critical_abs_delta)} ${u}`;
    if (t.direction === 'low') return `aviso < ${fmt.num(m.baseline * t.warning)} · crítico < ${fmt.num(m.baseline * t.critical)} ${u}`;
    return '';
  }

  /* Tickets y órdenes que propone el agente: todo se deriva de las lecturas y notas de CN_DATA. */
  function buildPlan() {
    const dm1 = byCode['DM-1'];
    const nh3 = byCode['NH3-C2'];
    const esc3 = byCode['ESC-3'];
    const tun1 = byCode['TUN-1'];
    const ev = byCode['EV-SIL3'];
    const env5 = byCode['ENV-5'];
    const cal = byCode['CAL-B1'];
    const opt2 = byCode['OPT-2'];
    const lastOk = ((dm1.note || '').match(/\((\d{2}:\d{2})\)/) || [])[1] || '';
    const siloTemp = ((ev.note || '').match(/(-?\d+,\d+) °C/) || [])[1];
    const news = [
      { equipment: 'DM-1', priority: 'Urgente · PCC', tone: 'crit', owner: `${ROLE.line_maintenance} y Calidad de turno`,
        action: `Verificar DM-1 con probetas ahora (${fmt.num(dm1.reading)} h sin verificar; máximo ${fmt.num(dm1.baseline)} h). Calidad decide la retención del producto envasado desde las ${lastOk} (PNT-CAL-031).` },
      { equipment: 'NH3-C2', priority: 'Alta', tone: 'crit', owner: ROLE.refrigeration_maintenance,
        action: `Inspeccionar el compresor: ${fmt.num(nh3.reading)} mm/s RMS (referencia ${fmt.num(nh3.baseline)}). Valorar el relevo con NH3-C1, que está en rango.` },
      { equipment: 'ESC-3', priority: 'Alta', tone: 'crit', owner: ROLE.line_maintenance,
        action: `Agua de escaldado a ${fmt.temp(esc3.reading)} (consigna ${fmt.temp(esc3.baseline)}): revisar el aporte de vapor y verificar con ensayo de peroxidasa. La caldera CAL-B1 está en rango (${fmt.num(cal.reading)} bar), así que la causa probable es local.` },
      { equipment: 'TUN-1', priority: 'Media', tone: 'warn', owner: ROLE.refrigeration_maintenance,
        action: `Aire del túnel a ${fmt.temp(tun1.reading)} (consigna ${fmt.temp(tun1.baseline)}): revisar desescarche y carga antes de la entrada de maíz de fin de campaña del ${fmt.dayMonth(D.meta.tomorrow)}.` },
      { equipment: 'EV-SIL3', priority: 'Media', tone: 'warn', owner: ROLE.refrigeration_maintenance,
        action: `Programar el desescarche de EV-SIL3 (${fmt.num(ev.reading)} h desde el último).${siloTemp ? ` El silo 3 sigue dentro de límites (${fmt.minus(siloTemp)} °C).` : ''}` }
    ].map((t, i) => Object.assign(t, { id: `MNT-2026-${1184 + i}`, kind: 'new' }));
    const updates = [
      { id: dpOrder.work_order, equipment: 'OPT-2', target: 'DP-2', priority: 'Alta (propuesta)', tone: 'crit', owner: ROLE.line_maintenance,
        action: `Se añade la evidencia de OPT-2 (rechazo ${fmt.pct(opt2.reading)}, referencia ${fmt.pct(opt2.baseline)}) a la orden de la malla de DP-2, abierta desde el ${fmt.date(dpOrder.date)} y ${dpOrder.status.replace(/^abierta, /, '')}.`, kind: 'update' },
      { id: env5.open_work_order, equipment: 'ENV-5', target: 'ENV-5', priority: 'Sin cambios', tone: 'warn', owner: ROLE.line_maintenance,
        action: `Se añade la lectura de hoy (${fmt.num(env5.reading)} paradas/h) a la orden abierta por atascos de film. No se crea un ticket duplicado.`, kind: 'update' }
    ];
    return { news, updates, byEquipment: Object.fromEntries(news.concat(updates).map((t) => [t.equipment, t])) };
  }

  function streamSteps(plan) {
    const ev = byCode['EV-SIL3'];
    const nh3 = byCode['NH3-C2'];
    const dm1 = byCode['DM-1'];
    const env5 = byCode['ENV-5'];
    const drafts = crit.length + warn.length;
    return [
      { agent: AGENT, system: 'MES Mapex', action: `Lee las lecturas de las 06:00 de ${D.machines.length} equipos (líneas L1, L2, L3 y L5, frío y servicios)`, result: `${D.machines.length} lecturas recibidas, sin huecos`, ms: 640 },
      { agent: AGENT, system: 'SCADA Galileo', action: 'Consulta túneles, evaporadores y compresores de amoniaco', result: `EV-SIL3 lleva ${fmt.num(ev.reading)} h sin desescarche; NH3-C2 vibra a ${fmt.num(nh3.reading)} mm/s`, ms: 520 },
      { agent: AGENT, system: 'Prodigy', action: `Compara cada lectura con sus umbrales de planta (${metrics} indicadores)`, result: `${crit.length} críticos · ${warn.length} avisos · ${okm.length} sin incidencias`, ms: 60, tone: 'crit' },
      { agent: AGENT, system: 'Elara', action: 'Comprueba los PCC y sus registros de verificación', result: `DM-1 es PCC: verificación vencida (${fmt.num(dm1.reading)} h; máximo ${fmt.num(dm1.baseline)} h)`, ms: 380, tone: 'crit' },
      { agent: AGENT, system: 'GMAO', action: 'Busca órdenes abiertas de los equipos con alerta y de su línea', result: `${env5.open_work_order} (ENV-5) y ${dpOrder.work_order} (DP-2, antes de OPT-2 en L2)`, ms: 470 },
      { agent: AGENT, system: 'Elara', action: 'Cruza las alertas con las reclamaciones abiertas', result: `${complaint.code}: piedra de ${complaint.defect.size_mm} mm en un lote de L2 del ${fmt.dayMonth(complaintLot.info.production_date)}`, ms: 350, tone: 'warn' },
      { agent: AGENT, system: 'Modelo de lenguaje', action: `Redacta la acción recomendada de cada alerta (${drafts} llamadas)`, result: `${drafts} borradores, cada uno con su procedimiento de referencia`, ms: 6100 },
      ...plan.news.map((t) => ({ agent: AGENT, system: 'GMAO', action: `Crea ${t.id} para ${t.equipment} · prioridad ${t.priority.toLowerCase()}`, result: `Creado y asignado a ${t.owner}`, ms: 240, tone: 'ok' })),
      ...plan.updates.map((u) => ({ agent: AGENT, system: 'GMAO', action: `Actualiza ${u.id} (${u.target === 'DP-2' ? 'malla de DP-2' : u.target}) con la lectura de hoy`, result: u.target === 'DP-2' ? 'Evidencia añadida · prioridad alta propuesta · sin ticket duplicado' : 'Lectura añadida · sin ticket duplicado', ms: 220 })),
      { agent: AGENT, system: 'Microsoft Teams', action: 'Publica el resumen en el canal «Mantenimiento · Fustiñana»', result: `Enviado: ${crit.length} críticos, ${warn.length} avisos y ${plan.news.length} tickets`, ms: 410, tone: 'ok' }
    ];
  }

  /* Workflow de cadena de frío publicado en «De palabras a workflow» (contrato App.state.workflows). */
  function coldWorkflow() {
    const list = (App.state.workflows || []).slice().reverse();
    return list.find((w) => w && w.status !== 'draft'
      && /fr[ií]o|temperatura|c[aá]mara|excursi/i.test([w.name, w.template, w.trigger && (w.trigger.type || w.trigger.label || w.trigger.text)].filter(Boolean).join(' '))) || null;
  }

  function pendingCount(state) {
    const s = state || App.state;
    const parte = s.scenes && s.scenes.turno && s.scenes.turno.parte;
    return (s.outcomes.alarma ? 0 : 1) + (s.outcomes.reclamacion ? 0 : 1) + (parte ? 0 : 1);
  }

  /* ---------------------------------------------------------------- Piezas de la vista */

  function kpis() {
    return html`<div class="kpis">
      ${App.kpi({ label: `Palés en ${chamber.code} durante la excursión`, value: palletsC07, sub: `${lotsC07.length} lotes · ${fmt.kg(kgC07)}`, icon: 'pallet', tone: 'crit', href: '#alarma' })}
      ${App.kpi({ label: 'Lotes afectados', value: lotsC07.length, sub: `${shipments.length} expediciones planificadas · la primera a las ${firstShipment.time}`, icon: 'box', href: '#alarma' })}
      ${App.kpi({ label: 'Reclamaciones abiertas', value: 1, sub: `${complaint.code} · respuesta antes del ${fmt.date(complaint.response_due)}`, icon: 'mail', href: '#reclamacion' })}
      ${App.kpi({ label: 'Equipos con alerta', value: `${crit.length + warn.length} de ${D.machines.length}`, sub: `${crit.length} críticos · ${warn.length} avisos · lecturas de las 06:00`, icon: 'activity', action: 'scroll-parte' })}
    </div>`;
  }

  function alarmItem() {
    const wf = coldWorkflow();
    const out = App.outcome('alarma');
    const wfLine = wf
      ? html`<div class="row mt-2">${chip({ tone: 'brand', icon: 'workflow', label: `Workflow «${wf.name}» ${wf.version || 'v1'} publicado` })}</div>`
      : html`<div class="row mt-2"><span class="muted small">Sin workflow de respuesta publicado.</span><button type="button" class="link-btn small" data-go="workflow">Crear workflow</button></div>`;
    return {
      icon: 'thermometer',
      tone: out ? (out.status === 'approved' ? 'ok' : '') : 'crit',
      done: !!out,
      title: `Cámara ${chamber.code} · excursión de temperatura`,
      meta: [`Alarma ${exc.start} · ${chamber.alarm_id}`, sys('SCADA Galileo')],
      body: html`Pico de ${fmt.temp(exc.peak)} a las ${exc.peak_time}; ${exc.minutes_above_limit} min por encima de ${fmt.temp(exc.limit)}. ${palletsC07} palés de ${lotsC07.length} lotes expuestos. La primera expedición afectada, ${firstShipment.id}, sale a las ${firstShipment.time} (${firstShipment.dock}).
        ${out ? html`<div class="row mt-2">${chip(out.status === 'approved' ? 'approved' : 'rejected', out.label || undefined)}</div>` : wfLine}`,
      side: html`${out ? '' : chip('critical')}<button type="button" class="btn btn-${wf && !out ? 'primary' : 'secondary'} btn-sm" data-go="alarma">${wf && !out ? 'Ejecutar workflow' : out ? 'Ver ejecución' : 'Revisar alarma'}${icon('arrow-right', 15)}</button>`
    };
  }

  function complaintItem() {
    const out = App.outcome('reclamacion');
    return {
      icon: 'mail',
      tone: out ? 'ok' : 'warn',
      done: !!out,
      title: `Reclamación ${complaint.code} · ${complaint.defect.type} en guisante 1 kg`,
      meta: [`${fmt.dayMonth(complaint.received_date)} ${complaint.received_time}`, 'Freeworld Foods Ltd', complaint.on_behalf_of],
      body: html`${fmt.cap(complaint.defect.type)} de unos ${complaint.defect.size_mm} mm, sin lesiones. Lote ${App.lotTag(complaint.lot)}. El cliente pide informe de investigación en 5 días hábiles.${out ? html`<div class="row mt-2">${chip('resolved', out.label || undefined)}</div>` : ''}`,
      side: html`${out ? '' : chip('pending', `Vence el ${fmt.dayMonth(complaint.response_due)}`)}<button type="button" class="btn btn-secondary btn-sm" data-go="reclamacion">Abrir reclamación${icon('arrow-right', 15)}</button>`
    };
  }

  function parteItem(parte, plan) {
    return {
      icon: 'activity',
      tone: parte ? 'ok' : 'crit',
      done: !!parte,
      title: 'Parte diario de equipos · lecturas de las 06:00',
      meta: [`${D.machines.length} equipos`, sys('MES Mapex'), sys('SCADA Galileo')],
      body: parte
        ? `Generado a las ${fmt.time(parte.at)} en ${fmt.ms(parte.ms)}: ${plan.news.length} tickets creados y ${plan.updates.length} órdenes existentes actualizadas.`
        : `${crit.length} críticos, uno de ellos un PCC (DM-1), y ${warn.length} avisos pendientes de revisar.`,
      side: parte
        ? html`${chip('done', 'Generado')}<button type="button" class="btn btn-secondary btn-sm" data-action="scroll-parte">Ver parte${icon('arrow-right', 15)}</button>`
        : html`${chip('critical', `${crit.length} críticos`)}<button type="button" class="btn btn-secondary btn-sm" data-action="generate">Generar parte</button>`
    };
  }

  function inboxCard(parte, plan) {
    const n = pendingCount();
    return App.card({
      title: 'Pendiente de decisión',
      sub: n ? `${n} ${n === 1 ? 'asunto requiere' : 'asuntos requieren'} una decisión de Calidad` : 'Sin asuntos pendientes en este turno',
      icon: 'inbox',
      flush: true,
      body: App.list([alarmItem(), complaintItem(), parteItem(parte, plan)])
    });
  }

  /* Plano de planta en vivo (App.plantMap, assets/js/plantmap.js): selección y filtro se guardan en ctx.local. */
  function plantCard() {
    return App.card({
      id: 'planta',
      title: 'Plano de planta · Fustiñana',
      sub: `Lecturas del parte de las 06:00 y de las cámaras a las ${chamber.current_time} · pulsa un elemento para ver su detalle`,
      icon: 'factory',
      actions: chip({ tone: 'neutral', icon: 'eye', label: 'Solo lectura', title: 'Prodigy lee SCADA Galileo, MES Mapex y Easy WMS; no actúa sobre el control de planta' }),
      flush: true,
      body: html`<div id="plant-map-host"></div>`
    });
  }
  function mountPlant(ctx, parte, plan) {
    const host = ctx.$('#plant-map-host');
    if (!host || typeof App.plantMap !== 'function') return;
    host.replaceChildren(App.plantMap({
      selected: ctx.local.plantSel || null,
      filter: ctx.local.plantFilter || 'all',
      tickets: parte ? plan.byEquipment : null,
      onSelect: (code) => ctx.setLocal({ plantSel: code || null }),
      onFilter: (value) => ctx.setLocal({ plantFilter: value }),
      panelActions: (item) => (item.kind === 'machine' && byCode[item.code]
        ? html`<button type="button" class="btn btn-secondary btn-sm" data-action="scroll-parte">${icon('list-checks', 15)}<span>Ver en el parte diario</span></button>`
        : '')
    }));
  }

  function eventTone(e) { return e.type === 'alarma' ? 'crit' : e.type === 'recuperación' ? 'ok' : e.type === 'puerta' ? 'warn' : 'brand'; }
  function chamberCard() {
    const bands = chamber.events.filter((e) => e.end && e.type !== 'pre-desescarche').map((e) => ({
      from: e.time, to: e.end, tone: e.type === 'puerta' ? 'warn' : undefined,
      label: e.type === 'puerta' ? `Puerta ${e.equipment} abierta` : `Desescarche ${e.equipment}`
    }));
    const chart = App.lineChart({
      series: D.chamber_c07_series,
      threshold: { value: exc.limit, label: `Límite ${fmt.temp(exc.limit)}`, legend: `Límite ${fmt.temp(exc.limit)} · ${exc.minutes_above_limit} min por encima` },
      critical: { value: exc.critical, label: `Crítico ${fmt.temp(exc.critical)}`, legend: `Crítico ${fmt.temp(exc.critical)} · ${exc.minutes_above_critical} min por encima` },
      peak: { x: exc.peak_time, y: exc.peak },
      last: true,
      yTicks: [-24, -21, -18, -15, -12],
      xTicks: ['05:00', '05:30', '06:00', '06:30', '07:00'],
      annotations: [{ x: exc.start, label: `Alarma ${exc.start}` }],
      bands,
      height: 240,
      seriesLabel: `Aire (${chamber.sensor})`,
      shadeLabel: `Excursión ${exc.start}–${exc.end}`
    });
    const events = App.timeline({ compact: true, items: chamber.events.map((e) => ({
      time: e.time,
      timeSub: e.end ? `a ${e.end}` : '',
      title: fmt.text(e.text),
      tone: eventTone(e),
      meta: e.equipment ? chip('neutral', e.equipment, { dot: false }) : (e.ref ? chip('neutral', e.ref, { dot: false }) : '')
    })) });
    return App.card({
      title: `Cámara ${chamber.code} · temperatura de aire`,
      sub: `${chamber.name} · consigna ${fmt.temp(chamber.setpoint_c)} · ahora ${fmt.temp(chamber.current_c)} (${chamber.current_time})`,
      icon: 'thermometer',
      iconTone: 'crit',
      flush: true,
      body: App.tabs({
        id: 'c07',
        flush: true,
        label: `Cámara ${chamber.code}`,
        tabs: [
          { id: 'temp', label: 'Temperatura', body: chart },
          { id: 'eventos', label: 'Eventos', count: chamber.events.length, body: html`${events}<div class="mt-4">${App.callout({ tone: 'warn', icon: 'wrench', title: 'Hipótesis de causa', body: fmt.text(chamber.probable_cause) })}</div>` }
        ]
      }),
      footer: html`<span class="muted small row">${sys('SCADA Galileo')}<span>Lectura cada ${exc.interval_min} min</span></span><span class="spacer"></span><button type="button" class="btn btn-secondary btn-sm" data-go="alarma">Abrir alarma${icon('arrow-right', 15)}</button>`
    });
  }

  function equipmentTable(parte, plan, filter) {
    const cols = [
      { label: 'Equipo', width: '21%', render: (m) => html`<span class="strong">${m.name}</span>${m.ccp ? html` ${chip('pcc')}` : ''}<span class="sub">${m.area}</span>` },
      { label: 'Indicador', width: '14%', render: (m) => fmt.cap(m.metric_label) },
      { label: 'Lectura', width: '10%', render: (m) => html`<span class="strong nowrap ${m.status === 'critical' ? 't-crit' : m.status === 'warning' ? 't-warn' : ''}">${fmt.minus(valueWithUnit(m.reading, m.unit))}</span>` },
      { label: 'Referencia', width: '17%', render: (m) => html`<span class="nowrap">${fmt.minus(valueWithUnit(m.baseline, m.unit))}</span><span class="sub">${fmt.minus(limitsText(m))}</span>` },
      { label: 'Estado', width: '8%', render: (m) => chip(statusKey(m)) },
      { label: 'Observación', render: (m) => (m.note ? fmt.text(m.note) : html`<span class="muted">Sin incidencias</span>`) }
    ];
    if (parte) {
      cols.push({ label: 'Ticket', width: '11%', render: (m) => {
        const t = plan.byEquipment[m.code];
        if (!t) return html`<span class="muted">—</span>`;
        return html`<span class="code">${t.id}</span><span class="sub">${t.kind === 'new' ? 'Creado' : 'Actualizada'}</span>`;
      } });
    }
    return App.table({
      cols,
      rows: machines,
      rowClass: (m) => (m.status === 'critical' ? 'tone-crit' : m.status === 'warning' ? 'tone-warn' : ''),
      rowAttrs: (m) => ({ 'data-status': statusKey(m), hidden: filter && filter !== 'all' && filter !== statusKey(m) ? true : null })
    });
  }

  function relationCallout() {
    const opt2 = byCode['OPT-2'];
    return App.callout({
      tone: 'warn',
      icon: 'link',
      title: `Posible relación con la reclamación ${complaint.code}`,
      body: html`<p>${opt2.name} (L2) rechaza el ${fmt.pct(opt2.reading)} de producto (referencia ${fmt.pct(opt2.baseline)}) y la malla de la despedregadora DP-2 sigue pendiente de repuesto: ${dpOrder.work_order}, abierta desde el ${fmt.date(dpOrder.date)} (${daysOpen} días). La reclamación ${complaint.code} (piedra de ${complaint.defect.size_mm} mm) es del lote ${App.lotTag(complaint.lot)}, procesado en L2 el ${fmt.date(complaintLot.info.production_date)}, un día después de anotarse el desgaste.</p>
        <p class="mt-2">IT-MAN-DP-02 pide inspección reforzada de la malla hasta sustituirla. A confirmar por Calidad.</p>`,
      actions: html`<button type="button" class="btn btn-secondary btn-sm" data-go="reclamacion">Abrir la reclamación${icon('arrow-right', 15)}</button>`
    });
  }

  function parteResult(parte, plan) {
    const ticketCols = [
      { label: 'Ticket u orden', width: '14%', render: (t) => html`<span class="code strong">${t.id}</span><span class="sub">${t.kind === 'new' ? 'Nuevo' : 'Orden existente'}</span>` },
      { label: 'Equipo', width: '9%', render: (t) => html`<span class="code">${t.equipment}</span>` },
      { label: 'Prioridad', width: '13%', render: (t) => chip(t.tone === 'crit' ? 'critical' : 'warning', t.priority) },
      { label: 'Asignado a', width: '18%', render: (t) => t.owner },
      { label: 'Acción propuesta', render: (t) => fmt.minus(t.action) },
      { label: 'Estado', width: '10%', render: (t) => (t.kind === 'new' ? chip('created') : chip('updated')) }
    ];
    return html`<div class="card-body stack" id="parte-result">
      <div class="row between">
        <div>
          <div class="h3">Parte generado a las ${fmt.time(parte.at)} en ${fmt.ms(parte.ms)}</div>
          <div class="muted small mt-1">${plan.news.length} tickets creados en la GMAO, ${plan.updates.length} órdenes existentes actualizadas y resumen publicado en Microsoft Teams.</div>
        </div>
        <div class="row">
          <button type="button" class="btn btn-secondary btn-sm" data-open-audit>${icon('history', 15)}<span>Ver en auditoría</span></button>
          <button type="button" class="btn btn-primary btn-sm" data-action="report">${icon('printer', 15)}<span>Descargar parte (PDF)</span></button>
        </div>
      </div>
      ${App.stats([
        { label: 'Equipos revisados', value: D.machines.length },
        { label: 'Tickets creados', value: plan.news.length, tone: 'ok' },
        { label: 'Órdenes actualizadas, sin duplicar', value: plan.updates.length },
        { label: 'PCC con verificación vencida', value: machines.filter((m) => m.ccp && m.status === 'critical').length, tone: 'crit' }
      ])}
      ${relationCallout()}
      <div class="card flat">${App.table({ cols: ticketCols, rows: plan.news.concat(plan.updates), rowClass: (t) => (t.tone === 'crit' ? 'tone-crit' : 'tone-warn') })}</div>
      <div class="row row-nowrap muted small" style="align-items:flex-start">${icon('shield-check', 16)}<span>Política aplicada: los tickets de mantenimiento se crean sin aprobación previa; retener o bloquear producto requiere la aprobación de Calidad (PNT-CAL-015).</span></div>
      <details class="run-log">
        <summary>${icon('chevron-right', 16)}<span>Registro de ejecución · ${streamSteps(plan).length} pasos · ${fmt.ms(parte.ms)}</span></summary>
        <div class="mt-2" id="parte-log"></div>
      </details>
    </div>`;
  }

  function parteCard(parte, plan, filter) {
    const counts = { all: machines.length, critical: crit.length, warning: warn.length, ok: okm.length };
    return App.card({
      id: 'parte',
      title: 'Parte diario de equipos',
      sub: `Lecturas de las 06:00 · ${D.machines.length} equipos de Fustiñana · umbrales de planta`,
      icon: 'activity',
      flush: true,
      actions: App.segmented({ name: 'parte-filtro', label: 'Filtrar equipos por estado', value: filter || 'all', options: [
        { value: 'all', label: 'Todos', count: counts.all },
        { value: 'critical', label: 'Críticos', count: counts.critical, tone: 'crit' },
        { value: 'warning', label: 'Avisos', count: counts.warning, tone: 'warn' },
        { value: 'ok', label: 'OK', count: counts.ok, tone: 'ok' }
      ] }),
      body: html`<div class="card-body parte-run" id="parte-run" hidden></div>
        ${parte ? parteResult(parte, plan) : ''}
        <div class="parte-table">${equipmentTable(parte, plan, filter)}</div>`
    });
  }

  /* ---------------------------------------------------------------- Acciones */

  async function generate(ctx) {
    if (ctx.local.parte || ctx.vars.busy) return;
    ctx.vars.busy = true;
    App.audit('Parte diario solicitado', `Fustiñana · lecturas de las 06:00 · ${D.machines.length} equipos`);
    ctx.$$('[data-action="generate"]').forEach((b) => {
      b.disabled = true;
      b.classList.add('is-busy');
      b.innerHTML = String(html`<span class="spinner"></span><span>Generando parte…</span>`);
    });
    const plan = buildPlan();
    const host = ctx.$('#parte-run');
    host.hidden = false;
    host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    ctx.presenter({ next: 'Mientras corre: «Mirad qué sistema toca cada paso y cuánto tarda». Si hace falta, pulsa «Acelerar».' });
    const startedAt = App.nowISO();
    const run = App.reasoningStream(host, streamSteps(plan), { title: `Agente ${AGENT}`, signal: ctx.signal, maxHeight: 380, start: startedAt });
    const res = await run.done;
    if (!ctx.alive()) return;
    ctx.vars.busy = false;
    ctx.setLocal({ parte: { at: App.nowISO(), startedAt, ms: res.ms } });
    App.audit('Parte diario generado', `${D.machines.length} equipos · ${crit.length} críticos · ${warn.length} avisos · ${fmt.ms(res.ms)}`, AGENT_ACTOR);
    plan.news.forEach((t) => App.audit('Ticket de mantenimiento creado', `${t.id} · ${t.equipment} · ${t.priority} · ${t.owner}`, AGENT_ACTOR));
    plan.updates.forEach((u) => App.audit('Orden de mantenimiento actualizada', `${u.id} · ${u.target} · ${u.priority}`, AGENT_ACTOR));
    App.audit('Resumen publicado en Microsoft Teams', 'Canal «Mantenimiento · Fustiñana»', AGENT_ACTOR);
    App.outcome('parte', { status: 'done', label: `${plan.news.length} tickets creados · ${plan.updates.length} órdenes actualizadas` });
    App.toast(`Parte diario generado en ${fmt.ms(res.ms)} · ${plan.news.length} tickets creados`, { tone: 'ok' });
    ctx.presenter(null);
    ctx.rerender();
    requestAnimationFrame(() => { const el = ctx.$('#parte-result'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }

  function openReport(ctx) {
    const parte = ctx.local.parte;
    if (!parte) return;
    const plan = buildPlan();
    const eqRow = (m) => ({ equipo: `${m.name}${m.ccp ? ' (PCC)' : ''}`, area: m.area, lectura: fmt.minus(valueWithUnit(m.reading, m.unit)), ref: fmt.minus(valueWithUnit(m.baseline, m.unit)), nota: fmt.text(m.note || 'Sin incidencias') });
    const eqCols = [{ label: 'Equipo', key: 'equipo' }, { label: 'Área', key: 'area' }, { label: 'Lectura', key: 'lectura', num: true }, { label: 'Referencia', key: 'ref', num: true }, { label: 'Observación', key: 'nota' }];
    App.printableReport({
      title: 'Parte diario de equipos · Fustiñana',
      subtitle: `Lecturas de las 06:00 del ${fmt.dateLong(D.meta.today)} · agente ${AGENT}`,
      code: `PD-FUS-${D.meta.today.replace(/-/g, '')}`,
      filename: `parte-diario-fustinana-${D.meta.today}`,
      meta: [['Planta', 'Fustiñana (FUS)'], ['Turno', 'Mañana'], ['Equipos revisados', String(D.machines.length)], ['Críticos · avisos', `${crit.length} · ${warn.length}`], ['Tickets creados', String(plan.news.length)], ['Tiempo de generación', fmt.ms(parte.ms)]],
      sections: [
        { heading: '1. Resumen', text: `De ${D.machines.length} equipos revisados, ${crit.length} están en estado crítico y ${warn.length} en aviso. El detector de metales DM-1 es un PCC con la verificación vencida. Se han creado ${plan.news.length} tickets de mantenimiento y se han actualizado ${plan.updates.length} órdenes existentes, sin duplicarlas.` },
        { heading: '2. Alertas críticas', table: { cols: eqCols, rows: crit.map(eqRow) } },
        { heading: '3. Avisos', table: { cols: eqCols, rows: warn.map(eqRow) } },
        { heading: '4. Equipos sin incidencias', list: okm.map((m) => `${m.name} · ${fmt.minus(valueWithUnit(m.reading, m.unit))} (referencia ${fmt.minus(valueWithUnit(m.baseline, m.unit))})`) },
        { heading: '5. Tickets y órdenes', table: { cols: [{ label: 'Ticket u orden', key: 'id' }, { label: 'Equipo', key: 'equipment' }, { label: 'Prioridad', key: 'priority' }, { label: 'Asignado a', key: 'owner' }, { label: 'Acción propuesta', render: (t) => fmt.minus(t.action) }], rows: plan.news.concat(plan.updates) } },
        { heading: `6. Posible relación con la reclamación ${complaint.code}`, text: `OPT-2 (L2) rechaza el ${fmt.pct(byCode['OPT-2'].reading)} (referencia ${fmt.pct(byCode['OPT-2'].baseline)}) y la malla de DP-2 sigue pendiente de repuesto (${dpOrder.work_order}, abierta desde el ${fmt.date(dpOrder.date)}, ${daysOpen} días). La reclamación ${complaint.code} (piedra de ${complaint.defect.size_mm} mm) corresponde al lote ${complaint.lot}, procesado en L2 el ${fmt.date(complaintLot.info.production_date)}. IT-MAN-DP-02 pide inspección reforzada hasta sustituir la malla. A confirmar por Calidad.` },
        { heading: '7. Política aplicada', text: `Los tickets de mantenimiento se crean sin aprobación previa. Retener o bloquear producto (por ejemplo, el envasado desde la última verificación correcta de DM-1) requiere la aprobación de Calidad según PNT-CAL-015.` }
      ],
      signatures: [{ role: ROLE.quality_shift, note: 'Revisado' }, { role: ROLE.line_maintenance, note: 'Recibido' }]
    });
  }

  function applyFilter(ctx, value) {
    ctx.setLocal({ filter: value });
    ctx.$$('.parte-table tbody tr[data-status]').forEach((tr) => { tr.hidden = value !== 'all' && tr.getAttribute('data-status') !== value; });
  }

  /* ---------------------------------------------------------------- Registro de la escena */

  App.scene({
    id: 'turno',
    order: 10,
    section: 'Operación',
    nav: 'Resumen del turno',
    title: 'Resumen del turno',
    icon: 'activity',
    badge: (state) => { const n = pendingCount(state); return n ? { text: String(n), tone: 'warn' } : null; },
    presenter: {
      say: (state) => {
        const parte = state.scenes.turno && state.scenes.turno.parte;
        const base = [
          'Así empieza el turno el Responsable de Calidad en Fustiñana: lo que pide una decisión, en una sola bandeja.',
          'Los datos llegan de sus sistemas: temperaturas de Galileo/SCADA, lotes de SAP, palés de Easy WMS y lecturas de Mapex. Aquí son sintéticos, pero coherentes entre sí.',
          `El plano de Fustiñana resume la planta de un vistazo: gris lo normal, color lo que pide atención. ${chamber.code} late en rojo; al pulsarla se ven sus palés en los silos y los muelles de las expediciones afectadas.`,
          `Tres asuntos: la alarma de ${chamber.code} de las ${exc.start} (${palletsC07} palés; la primera expedición sale a las ${firstShipment.time}), la reclamación ${complaint.code} del Reino Unido y el parte con ${crit.length} críticos, uno de ellos un PCC.`
        ];
        return parte
          ? base.concat([`Relación que encuentra Prodigy: OPT-2 rechaza el triple, la malla de DP-2 lleva ${daysOpen} días pendiente y la piedra de la reclamación es de un lote de L2. Nadie ha tenido que cruzar tres sistemas.`, 'Y no duplica: dos órdenes ya abiertas se actualizan en lugar de abrir tickets nuevos.'])
          : base.concat(['Generar parte diario: revisa 11 equipos, no duplica órdenes abiertas y crea los tickets. Fijaos en el tiempo.']);
      },
      next: (state) => (state.scenes.turno && state.scenes.turno.parte
        ? 'Ir a «De palabras a workflow» (flecha derecha) para crear la respuesta a la alarma de C-07 a partir del procedimiento escrito.'
        : 'Pulsar «Generar parte diario» y comentar el registro mientras se ejecuta.')
    },
    render(root, ctx) {
      const parte = ctx.local.parte || null;
      const plan = buildPlan();
      const filter = ctx.local.filter || 'all';
      const actions = parte
        ? html`<button type="button" class="btn btn-secondary" data-action="report">${icon('printer')}<span>Descargar parte (PDF)</span></button>`
        : html`<button type="button" class="btn btn-primary" data-action="generate">${icon('play')}<span>Generar parte diario</span></button>`;
      root.innerHTML = String(html`
        ${App.pageHead({
          title: 'Fustiñana · turno de mañana',
          meta: [
            { icon: 'calendar', text: `${fmt.cap(D.meta.weekday)} ${fmt.date(D.meta.today)}` },
            { icon: 'clock', text: `Hora de planta ${App.clock()}` },
            { icon: 'user', text: ROLE.quality_shift }
          ],
          actions
        })}
        ${kpis()}
        <div class="section">${plantCard()}</div>
        <div class="grid cols-7-5 section">${inboxCard(parte, plan)}${chamberCard()}</div>
        <div class="section">${parteCard(parte, plan, filter)}</div>
      `);
      mountPlant(ctx, parte, plan);
      const log = ctx.$('#parte-log');
      if (log && parte) App.reasoningStream(log, streamSteps(plan), { title: `Agente ${AGENT}`, instant: true, start: parte.startedAt || parte.at, maxHeight: 420 });
      ctx.on('click', '[data-action="generate"]', () => generate(ctx));
      ctx.on('click', '[data-action="report"]', () => openReport(ctx));
      ctx.on('click', '[data-action="scroll-parte"]', () => { const el = ctx.$('#parte'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      ctx.on('segchange', '[data-seg="parte-filtro"]', (e) => applyFilter(ctx, e.detail.value));
    }
  });
})();
