/*
 * Escena «alarma» · Alarma C-07 en ejecución (SPEC §4.3; SPEC-v2-wow W2, W3 y W4).
 * Pieza central B: el workflow de cadena de frío se ejecuta sobre la alarma ALM-C07-0550.
 *  - Usa el workflow publicado en «De palabras a workflow» (App.state.workflows). Si no hay ninguno,
 *    ejecuta el de respaldo y lo dice. La condición se evalúa de verdad con los parámetros del workflow.
 *  - Fase 1 (agentes), aprobación de Calidad y fase 2 (aplicar). Rechazar no aplica nada.
 *  - La ejecución sigue aunque se cambie de vista o se recargue: al volver se muestra terminada.
 *  - Todas las cifras salen de window.CN_DATA.
 */
(function () {
  'use strict';

  const { html, icon, fmt, chip, sys } = App;
  const D = window.CN_DATA;
  const ROLE = D.roles;

  /* Hoja de estilos propia (enlazada en index.html; si faltara, se añade aquí). */
  try {
    if (!document.querySelector('link[href$="scene-alarma.css"]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'assets/css/scene-alarma.css';
      document.head.appendChild(l);
    }
  } catch (e) { /* sin DOM */ }

  /* ---------------------------------------------------------------- Datos derivados */

  const chamber = D.chamber_c07;
  const exc = D.excursion_c07;
  const series = D.chamber_c07_series;
  const PNT012 = D.procedures['PNT-CAL-012'];
  const LIMIT = PNT012.limit_c;
  const CRIT = PNT012.critical_c;
  const MIN_HOLD = PNT012.min_minutes_for_hold;
  const evDefrost = chamber.events.find((e) => e.type === 'desescarche');
  const evDoor = chamber.events.find((e) => e.type === 'puerta' && e.end);
  const sum = (arr, k) => arr.reduce((s, x) => s + (Number(typeof k === 'function' ? k(x) : x[k]) || 0), 0);
  const uniq = (arr) => Array.from(new Set(arr));
  const byWhen = (a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
  const pad2 = (n) => String(n).padStart(2, '0');
  const iso = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`; };

  const LOTS = D.lots_in_c07.slice().sort((a, b) => a.lane - b.lane);
  const LOT = Object.fromEntries(LOTS.map((l) => [l.lot, l]));
  const trace = (code) => D.lots[code];
  const custLabel = (id) => (D.customers[id] ? D.customers[id].label : id);
  const SHIP = (id) => Object.assign({ id }, D.shipments[id], { customerLabel: custLabel(D.shipments[id].customer) });
  const shipWhen = (s) => (s.date === D.meta.today ? s.time : `${fmt.dayMonth(s.date)} ${s.time}`);
  const C07_PALLETS = LOTS.flatMap((l) => trace(l.lot).forward.pallets.filter((p) => p.location === chamber.code));
  const SILOS = LOTS.flatMap((l) => trace(l.lot).forward.by_location
    .filter((b) => b.location !== chamber.code)
    .map((b) => Object.assign({ lot: l.lot, product: l.product }, b)))
    .sort((a, b) => a.location.localeCompare(b.location));
  const SHIPPED = LOTS.flatMap((l) => trace(l.lot).forward.shipments
    .filter((s) => s.status === 'expedida')
    .map((s) => Object.assign({ lot: l.lot, product: l.product }, s)))
    .sort(byWhen);
  const SHIPPED_TOTAL = sum(SHIPPED, 'pallets');
  const evSil3 = D.machines.find((m) => m.code === 'EV-SIL3');
  const SIL3_TEMP = evSil3 && ((evSil3.note || '').match(/(-?\d+,\d+) °C/) || [])[1];
  const ANTECEDENT = D.complaint_history.find((h) => /fr[ií]o/i.test(h.root_cause || '') && LOTS.some((l) => l.product === h.product)) || null;
  const ANT_LOT = ANTECEDENT ? LOTS.find((l) => l.product === ANTECEDENT.product) : null;
  const TRANSFER = LOTS.map((l) => trace(l.lot).forward.transfer).find(Boolean) || null;
  const LLM_COST_USD = 0.04;
  const TEAMS_CHANNEL = 'Expedición · Fustiñana';
  const REPORT_CODE = 'REG-CAL-012-07';
  const REPORT_8D_CODE = 'REG-CAL-020-02';

  function scopeOf(excluded) {
    const ex = new Set(excluded || []);
    const lots = LOTS.filter((l) => !ex.has(l.lot));
    const out = LOTS.filter((l) => ex.has(l.lot));
    const ships = uniq(lots.map((l) => l.planned_shipment)).map(SHIP).sort(byWhen);
    const silos = SILOS.filter((s) => !ex.has(s.lot));
    return {
      lots, out, ships, silos,
      pallets: sum(lots, 'pallets'),
      kg: sum(lots, 'kg'),
      value: sum(lots, (l) => l.kg * l.std_cost_eur_kg),
      exPallets: sum(out, 'pallets'),
      silosTotal: sum(silos, 'pallets'),
      sscc: C07_PALLETS.filter((p) => !ex.has(p.lot))
    };
  }
  const ALL = scopeOf([]);
  const FIRST = ALL.ships[0];

  /* ---------------------------------------------------------------- Workflow y condición */

  const BACKUP = { id: 'wf-cadena-frio-respaldo', name: 'Excursión de temperatura en cámaras', version: 'v1', backup: true, threshold: LIMIT, minutes: MIN_HOLD, critical: CRIT, approver: ROLE.quality_shift, publishedAt: null };

  function coldWorkflow() {
    const list = (App.state.workflows || []).slice().reverse();
    return list.find((w) => w && w.status !== 'draft'
      && /fr[ií]o|temperatura|c[aá]mara|excursi/i.test([w.name, w.template, w.trigger && (w.trigger.type || w.trigger.label || w.trigger.text)].filter(Boolean).join(' '))) || null;
  }
  function num(v, d) {
    if (v == null || v === '') return d;
    const n = Number(String(v).replace('−', '-').replace(',', '.').replace(/[^\d.+-]/g, ''));
    return Number.isFinite(n) ? n : d;
  }
  function currentWorkflow() {
    const w = coldWorkflow();
    if (!w) return Object.assign({}, BACKUP);
    const tr = w.trigger || {};
    const p = w.params || {};
    const first = (...vals) => vals.find((v) => v != null && v !== '');
    const who = (a) => (a && typeof a === 'object' ? (a.role || a.label || a.name) : a);
    return {
      id: w.id || 'wf-cadena-frio',
      name: w.name || 'Workflow de cadena de frío',
      version: w.version || 'v1',
      backup: false,
      threshold: num(first(tr.threshold, tr.value, p.threshold, p.umbral), LIMIT),
      minutes: num(first(tr.minutes, tr.duration, p.minutes, p.minutos), MIN_HOLD),
      critical: num(first(tr.critical, p.critical), CRIT),
      approver: who(first(w.approver, p.approver, p.aprobador)) || ROLE.quality_shift,
      publishedAt: w.publishedAt || null
    };
  }
  /* Tramo continuo más largo con aire por encima de T (lecturas cada 5 min, como CN_DATA). */
  function evaluate(T, M) {
    let best = null;
    let cur = null;
    const longer = (a, b) => !b || (a.i1 - a.i0) > (b.i1 - b.i0);
    series.forEach((p, i) => {
      if (p.temp_c > T) { if (cur) cur.i1 = i; else cur = { i0: i, i1: i }; } else if (cur) { cur.end = p.time; if (longer(cur, best)) best = cur; cur = null; }
    });
    if (cur) { cur.end = null; if (longer(cur, best)) best = cur; }
    const above = best ? (best.i1 - best.i0 + 1) * exc.interval_min : 0;
    return { threshold: T, minutes: M, above, start: best ? series[best.i0].time : null, end: best ? (best.end || series[best.i1].time) : null, met: above > M };
  }
  const CRIT_MIN = evaluate(CRIT, 0).above;
  /* Condición del workflow sobre las lecturas + tramo por encima de su umbral crítico. */
  function condOf(wf) {
    const critical = wf.critical != null ? wf.critical : CRIT;
    return Object.assign(evaluate(wf.threshold, wf.minutes), { critical, critAbove: evaluate(critical, 0).above });
  }
  const critOf = (C) => (C && C.critical != null ? C.critical : CRIT);
  const critMinOf = (C) => (C && C.critAbove != null ? C.critAbove : CRIT_MIN);

  /* ---------------------------------------------------------------- Agentes, pasos y auditoría */

  const LANES = [
    { id: 'mon', name: 'Monitor de cadena de frío', icon: 'thermometer', systems: ['SCADA Galileo'], idle: 'Confirma la excursión con las lecturas de Galileo' },
    { id: 'traz', name: 'Trazabilidad', icon: 'git-branch', systems: ['Mecalux Easy WMS', 'SAP', 'MES Mapex'], idle: 'Localiza palés, lotes y expediciones' },
    { id: 'blq', name: 'Bloqueo de calidad', icon: 'lock', systems: ['SAP QM', 'Mecalux Easy WMS'], idle: 'Prepara el bloqueo y pide la aprobación de Calidad' },
    { id: 'inc', name: 'Incidencias', icon: 'clipboard', systems: ['Elara', 'Microsoft Teams'], idle: 'Abre la no conformidad y avisa a expedición' }
  ];
  const LANE_AGENT = { mon: 'Monitor de cadena de frío', traz: 'Trazabilidad', blq: 'Bloqueo de calidad', inc: 'Incidencias' };
  const ORCH = 'Orquestador';
  const ACTOR = {
    mon: 'Prodigy · agente Monitor de cadena de frío',
    traz: 'Prodigy · agente Trazabilidad',
    blq: 'Prodigy · agente Bloqueo de calidad',
    inc: 'Prodigy · agente Incidencias',
    orch: 'Prodigy · orquestador'
  };

  function p1Steps(run) {
    const W = run.wf;
    const C = run.cond;
    const fus = LOTS.filter((l) => trace(l.lot).info.plant === 'FUS');
    const fusLines = uniq(fus.map((l) => trace(l.lot).info.line)).sort();
    const others = LOTS.filter((l) => trace(l.lot).info.plant !== 'FUS');
    const otherPlants = uniq(others.map((l) => trace(l.lot).info.plant_name));
    const silosNames = uniq(SILOS.map((s) => s.location));
    return [
      { agent: ORCH, node: 't', system: 'Prodigy', action: `Recibe la alarma ${chamber.alarm_id} (cámara ${chamber.code}, ${exc.start}) y arranca el workflow «${W.name}» ${W.version}`, result: `Disparador: aire por encima de ${fmt.temp(W.threshold)} durante más de ${W.minutes} min · aprueba ${W.approver}`, ms: 180, wait: 1800 },
      { agent: LANE_AGENT.mon, lane: 'mon', node: 'mon', system: 'SCADA Galileo', verb: 'Consultando', action: `Lee la sonda ${chamber.sensor} de ${exc.series_start} a ${exc.series_end}, una lectura cada ${exc.interval_min} min`, result: `${series.length} lecturas, sin huecos · ahora ${fmt.temp(chamber.current_c)} (${chamber.current_time})`, ms: 1850, set: { volume: `${series.length} lecturas de temperatura` } },
      { agent: LANE_AGENT.mon, lane: 'mon', node: 'mon', system: 'Prodigy', verb: 'Evaluando', action: `Evalúa la condición del workflow: aire por encima de ${fmt.temp(W.threshold)} durante más de ${W.minutes} min`, result: `Se cumple: ${C.above} min por encima (${C.start}–${C.end}); ${critMinOf(C)} min por encima de ${fmt.temp(critOf(C))}; pico de ${fmt.temp(exc.peak)} a las ${exc.peak_time}`, tone: 'crit', ms: 90, wait: 2200, set: { result: `Excursión confirmada: ${C.above} min por encima de ${fmt.temp(W.threshold)}` }, milestone: 'mon' },
      { agent: LANE_AGENT.mon, lane: 'mon', node: 'mon', system: 'SCADA Galileo', verb: 'Consultando', action: `Cruza la excursión con los eventos del evaporador ${chamber.evaporator} y de la puerta ${chamber.door}`, result: `Desescarche ${evDefrost.time}–${evDefrost.end} y puerta abierta ${evDoor.time}–${evDoor.end}: hipótesis para ${ROLE.refrigeration_maintenance}`, tone: 'warn', ms: 1400, set: { volume: `${series.length} lecturas · ${chamber.events.length} eventos`, result: `Excursión confirmada: ${C.above} min por encima · pico ${fmt.temp(exc.peak)}` } },
      { agent: LANE_AGENT.traz, lane: 'traz', node: 'traz', system: 'Mecalux Easy WMS', verb: 'Consultando', action: `Lista los palés ubicados en ${chamber.code} entre ${C.start} y ${C.end}, por calle`, result: `${ALL.pallets} palés (${ALL.pallets} SSCC) en ${LOTS.length} calles`, ms: 2100, set: { volume: `${ALL.pallets} SSCC` } },
      { agent: LANE_AGENT.traz, lane: 'traz', node: 'traz', system: 'SAP', verb: 'Consultando', action: 'Resuelve lote, producto y cliente de cada SSCC', result: `${LOTS.length} lotes · ${fmt.kg(ALL.kg)} · ${fmt.eur(ALL.value)} a coste estándar`, ms: 2600, set: { volume: `${ALL.pallets} SSCC · ${LOTS.length} lotes` }, reveal: 'lots' },
      { agent: LANE_AGENT.traz, lane: 'traz', node: 'traz', system: 'MES Mapex', verb: 'Consultando', action: `Confirma línea, turno y fecha de fabricación de los ${LOTS.length} lotes`, result: `${fus.length} lotes de Fustiñana (${fmt.list(fusLines)})${others.length ? ` y ${others.length} de ${fmt.list(otherPlants)}${TRANSFER ? `, trasladado con ${TRANSFER.code}` : ''}` : ''}`, ms: 1900 },
      { agent: LANE_AGENT.traz, lane: 'traz', node: 'traz', system: 'Mecalux Easy WMS', verb: 'Consultando', action: `Busca palés de los mismos lotes fuera de ${chamber.code}`, result: `${ALL.silosTotal} palés en ${fmt.list(silosNames)}, a evaluar · ${SHIPPED_TOTAL} ya expedidos antes de la alarma`, ms: 1700, reveal: 'map' },
      { agent: LANE_AGENT.traz, lane: 'traz', node: 'traz', system: 'SAP', verb: 'Consultando', action: 'Consulta las expediciones planificadas de esos palés', result: `${ALL.ships.length} expediciones; la primera, ${FIRST.id}, a las ${FIRST.time} por el ${FIRST.dock}`, tone: 'warn', ms: 2200, set: { volume: `${ALL.pallets} SSCC · ${LOTS.length} lotes · ${ALL.ships.length} expediciones`, result: `Primera expedición afectada a las ${FIRST.time}` }, milestone: 'traz' },
      { agent: LANE_AGENT.blq, lane: 'blq', node: 'apr', system: 'Procedimientos', verb: 'Analizando', action: 'Aplica PNT-CAL-012 y PNT-CAL-015 a esta excursión', result: 'Bloquear los palés expuestos y evaluar el producto por lote; solo Calidad libera', ms: 1300 },
      { agent: LANE_AGENT.blq, lane: 'blq', node: 'apr', system: 'Modelo de lenguaje', verb: 'Redactando', action: 'Redacta la propuesta de bloqueo y su motivo con las evidencias', result: `Propuesta: ${ALL.pallets} palés de ${LOTS.length} lotes y ${ALL.ships.length} expediciones retenidas; ${ALL.silosTotal} palés en silos, a evaluar`, ms: 7000, set: { volume: `${ALL.pallets} palés · ${ALL.ships.length} expediciones` } },
      { agent: LANE_AGENT.blq, lane: 'blq', node: 'apr', system: 'Prodigy', verb: 'Evaluando', action: `Pide la aprobación de ${W.approver} antes de escribir en SAP QM y Easy WMS`, result: 'Esperando la decisión de Calidad', tone: 'warn', ms: 60, wait: 1500, set: { result: 'Propuesta enviada a Calidad' }, milestone: 'prop' }
    ];
  }

  function noTrigSteps(run) {
    const W = run.wf;
    const C = run.cond;
    const s = p1Steps(run);
    const why = C.above
      ? `No se cumple: ${C.above} min por encima de ${fmt.temp(W.threshold)} (${C.start}–${C.end}); el workflow pide más de ${W.minutes} min`
      : `No se cumple: el aire no supera ${fmt.temp(W.threshold)} (pico de ${fmt.temp(exc.peak)} a las ${exc.peak_time})`;
    return [
      s[0],
      s[1],
      Object.assign({}, s[2], { result: why, tone: 'warn', set: { result: 'Condición del workflow no cumplida' }, milestone: 'notrig' }),
      { agent: ORCH, system: 'Prodigy', action: 'Detiene la ejecución sin proponer bloqueo', result: 'Sin cambios en SAP QM, Easy WMS, Elara ni Teams', ms: 40, wait: 1400 }
    ];
  }

  function decisionSteps(run) {
    const d = run.decision;
    if (!d) return [];
    const sc = scopeOf(run.excluded);
    if (d.status === 'approved') {
      return [{ agent: d.by, human: true, system: 'Prodigy', action: `${run.excluded && run.excluded.length ? 'Aprueba el bloqueo con el alcance editado' : 'Aprueba el bloqueo'}: ${sc.pallets} palés de ${sc.lots.length} lotes`, result: `Aprobado a las ${fmt.time(d.at, true)}`, tone: 'ok', ms: d.waitMs }];
    }
    return [
      { agent: d.by, human: true, system: 'Prodigy', action: `Rechaza la propuesta · motivo: «${d.reason}»`, result: 'No se aplica ninguna acción', ms: d.waitMs },
      { agent: ORCH, system: 'Prodigy', action: 'Detiene la ejecución', result: 'Sin cambios en SAP QM, Easy WMS, Elara ni Teams', ms: 40 }
    ];
  }

  function p2Steps(run, calls) {
    const sc = scopeOf(run.excluded);
    const ant = ANTECEDENT && ANT_LOT && sc.lots.includes(ANT_LOT) ? ` · antecedente ${ANTECEDENT.id} enlazado` : '';
    return [
      { agent: LANE_AGENT.blq, lane: 'blq', node: 'blq', system: 'SAP QM', verb: 'Aplicando', action: `Registra el bloqueo de calidad de ${sc.lots.length} lotes en ${chamber.code}`, result: `${run.blq} · ${sc.pallets} palés en estado «bloqueado»`, tone: 'ok', ms: 2400, milestone: 'blq' },
      { agent: LANE_AGENT.blq, lane: 'blq', node: 'blq', system: 'Mecalux Easy WMS', verb: 'Aplicando', action: `Inmoviliza los ${sc.pallets} palés y retiene sus expediciones`, result: `${sc.pallets} SSCC inmovilizados · ${sc.ships.length} expediciones retenidas, la primera a las ${sc.ships[0].time}`, tone: 'ok', ms: 2100, set: { result: `${run.blq} aplicado · ${sc.ships.length} expediciones retenidas` }, milestone: 'wms' },
      { agent: LANE_AGENT.inc, lane: 'inc', node: 'inc', system: 'Elara', verb: 'Aplicando', action: 'Abre la no conformidad con la curva, los eventos y los SSCC', result: `${run.nc} abierta${ant}`, tone: 'ok', ms: 1900, set: { volume: '1 no conformidad' }, milestone: 'nc' },
      { agent: LANE_AGENT.inc, lane: 'inc', node: 'inc', system: 'Modelo de lenguaje', verb: 'Redactando', action: 'Redacta el borrador de 8D (D1–D8) con responsables por rol', result: 'Borrador de 8D listo para la revisión de Calidad', ms: 7800, set: { volume: '1 no conformidad · 8D en borrador' }, milestone: 'd8' },
      { agent: LANE_AGENT.inc, lane: 'inc', node: 'inc', system: 'Microsoft Teams', verb: 'Enviando', action: `Avisa a ${ROLE.dispatch_shift} y a ${ROLE.refrigeration_maintenance}`, result: `Aviso publicado en el canal «${TEAMS_CHANNEL}»`, tone: 'ok', ms: 900, wait: 1600, set: { volume: '1 no conformidad · 8D · 1 aviso', result: `${run.nc} abierta · expedición avisada` }, milestone: 'teams' },
      { agent: ORCH, system: 'Prodigy', action: 'Cierra la ejecución y guarda el informe de incidencia', result: `${calls != null ? calls : CALLS.total} llamadas a sistemas y al modelo de lenguaje · coste estimado ${fmt.usd(LLM_COST_USD)}`, ms: 120, wait: 1600, milestone: 'end' }
    ];
  }

  /* Pasos completos de una ejecución según su estado (para el registro persistido). */
  function stepsFor(run) {
    if (!run) return [];
    if (!run.cond.met) return noTrigSteps(run);
    const s = p1Steps(run);
    if (!run.decision) return s;
    const d = decisionSteps(run);
    return run.decision.status === 'approved' ? s.concat(d, p2Steps(run)) : s.concat(d);
  }
  const CALLS = (() => {
    const fake = { wf: BACKUP, cond: condOf(BACKUP), excluded: [], blq: 'x', nc: 'x' };
    const all = p1Steps(fake).concat(p2Steps(fake, 0));
    return { total: all.filter((s) => s.system !== 'Prodigy').length, llm: all.filter((s) => s.system === 'Modelo de lenguaje').length, auto: all.length };
  })();

  const MILESTONES = {
    mon: { actor: ACTOR.mon, action: 'Excursión confirmada', detail: (r) => `${chamber.code} · ${r.cond.above} min por encima de ${fmt.temp(r.cond.threshold)} (${r.cond.start}–${r.cond.end}) · pico de ${fmt.temp(exc.peak)} a las ${exc.peak_time}` },
    notrig: { actor: ACTOR.mon, action: 'Condición del workflow no cumplida', detail: (r) => `${r.cond.above} min por encima de ${fmt.temp(r.cond.threshold)}; el workflow pide más de ${r.cond.minutes} min · sin propuesta de bloqueo` },
    traz: { actor: ACTOR.traz, action: 'Palés y lotes identificados', detail: () => `${ALL.pallets} palés (SSCC) de ${LOTS.length} lotes en ${chamber.code} · ${ALL.ships.length} expediciones planificadas · ${ALL.silosTotal} palés de los mismos lotes en silos` },
    prop: { actor: ACTOR.blq, action: 'Propuesta de bloqueo enviada a aprobación', detail: (r) => `${ALL.pallets} palés de ${LOTS.length} lotes · aprueba ${r.wf.approver}` },
    blq: { actor: ACTOR.blq, action: 'Bloqueo de calidad aplicado', detail: (r) => { const sc = scopeOf(r.excluded); return `${r.blq} · SAP QM · ${sc.pallets} palés de ${sc.lots.length} lotes`; } },
    wms: { actor: ACTOR.blq, action: 'Palés inmovilizados y expediciones retenidas', detail: (r) => { const sc = scopeOf(r.excluded); return `Mecalux Easy WMS · ${sc.pallets} SSCC · ${sc.ships.map((s) => s.id).join(', ')}`; } },
    nc: { actor: ACTOR.inc, action: 'No conformidad abierta', detail: (r) => `${r.nc} · Elara · excursión de temperatura en ${chamber.code}` },
    d8: { actor: ACTOR.inc, action: 'Borrador de 8D redactado', detail: (r) => `${r.nc} · D1–D8 · pendiente de revisión de Calidad` },
    teams: { actor: ACTOR.inc, action: 'Aviso enviado por Microsoft Teams', detail: () => `${ROLE.dispatch_shift} y ${ROLE.refrigeration_maintenance} · canal «${TEAMS_CHANNEL}»` },
    end: { actor: ACTOR.orch, action: 'Ejecución del workflow completada', detail: (r) => `${r.id} · ${CALLS.total} llamadas · coste estimado ${fmt.usd(LLM_COST_USD)}` }
  };
  function logMilestone(ctx, key) {
    const run = ctx.local.run;
    const m = MILESTONES[key];
    if (!run || !m || (run.logged && run.logged[key])) return;
    App.audit(m.action, m.detail(run), m.actor);
    ctx.setLocal({ run: Object.assign({}, ctx.local.run, { logged: Object.assign({}, ctx.local.run.logged, { [key]: true }) }) });
  }

  /* ---------------------------------------------------------------- Progreso: carriles y grafo */

  function progressFor(run, steps) {
    if (!run) return { done: 0, running: -1 };
    return { done: steps.length, running: -1 };
  }

  function laneState(run, steps, done, running) {
    const waitingNow = run && run.cond.met && !run.decision && done >= p1Steps(run).length;
    return LANES.map((L) => {
      const idx = [];
      steps.forEach((s, i) => { if (s.lane === L.id) idx.push(i); });
      const completed = idx.filter((i) => i < done);
      const st = { id: L.id, lat: sum(completed.map((i) => steps[i]), 'ms'), count: completed.length, volume: null, result: null, system: null, status: 'idle' };
      completed.forEach((i) => { const set = steps[i].set || {}; if (set.volume) st.volume = set.volume; if (set.result) st.result = set.result; });
      if (idx.includes(running)) { st.status = 'active'; st.system = steps[running].system; st.verb = steps[running].verb || 'Consultando'; } else if (completed.length) st.status = completed.length === idx.length ? 'done' : 'active';
      if (!run) return st;
      if (L.id === 'blq' && waitingNow) st.status = 'waiting';
      if (run.decision && run.decision.status === 'rejected') { if (L.id === 'blq') st.status = 'stopped'; if (L.id === 'inc') st.status = 'skipped'; }
      if (!run.cond.met && L.id !== 'mon') st.status = 'skipped';
      return st;
    });
  }

  function graphStatus(run, steps, done, running) {
    const st = { t: run ? 'done' : 'done', mon: 'pending', traz: 'pending', apr: 'pending', blq: 'pending', inc: 'pending' };
    if (!run) return st;
    ['mon', 'traz', 'apr', 'blq', 'inc'].forEach((n) => {
      const idx = [];
      steps.forEach((s, i) => { if (s.node === n) idx.push(i); });
      if (!idx.length) return;
      if (idx.includes(running)) st[n] = 'active';
      else if (idx.every((i) => i < done)) st[n] = 'done';
      else if (idx.some((i) => i < done)) st[n] = 'active';
    });
    if (run.cond.met && !run.decision && done >= p1Steps(run).length) st.apr = 'waiting';
    if (run.decision && run.decision.status === 'approved') st.apr = 'done';
    if (run.decision && run.decision.status === 'rejected') { st.apr = 'rejected'; st.blq = 'skipped'; st.inc = 'skipped'; }
    if (!run.cond.met) { st.traz = 'skipped'; st.apr = 'skipped'; st.blq = 'skipped'; st.inc = 'skipped'; }
    if (run.status === 'running' && running === 0) st.mon = 'active';
    return st;
  }

  const LANE_CHIP = {
    idle: () => chip('neutral', 'En espera'),
    done: () => chip('ok', 'Listo'),
    waiting: () => chip('waiting', 'Esperando aprobación'),
    skipped: () => chip('neutral', 'No se ejecuta'),
    stopped: () => chip('neutral', 'Detenido')
  };

  function lanesHTML(run, steps, done, running) {
    const states = laneState(run, steps, done, running);
    return html`${LANES.map((L, i) => {
      const st = states[i];
      const used = uniq(L.systems.concat(steps.filter((s) => s.lane === L.id && s.system !== 'Prodigy').map((s) => s.system)));
      const status = st.status === 'active' ? chip('running', st.verb || 'Consultando') : LANE_CHIP[st.status]();
      let result = st.result || (st.status === 'idle' ? L.idle : '');
      if (st.status === 'skipped') result = run && !run.cond.met ? 'No se ejecuta: la condición del workflow no se cumple' : 'No se ejecuta tras el rechazo';
      if (st.status === 'stopped') result = 'Propuesta rechazada: no se aplica nada';
      return html`<li class="al-lane is-${st.status}" data-lane="${L.id}">
        <span class="al-lane-icon">${icon(L.icon, 18)}</span>
        <div class="al-lane-main">
          <div class="al-lane-top"><span class="al-lane-name">${L.name}</span>${status}</div>
          <div class="al-lane-sys">${used.map((n) => html`<span class="al-sysw${st.status === 'active' && st.system === n ? ' is-on' : ''}">${sys(n)}</span>`)}</div>
          ${st.count || st.volume ? html`<div class="al-lane-meta"><span>${st.volume || '—'}</span><span class="lat">${st.count ? `${fmt.plural(st.count, 'paso', 'pasos')} · latencia ${fmt.ms(st.lat)}` : ''}</span></div>` : ''}
          ${result ? html`<div class="al-lane-result">${icon(st.status === 'waiting' ? 'user-check' : 'arrow-right', 13)}<span>${result}</span></div>` : ''}
        </div>
      </li>`;
    })}`;
  }

  function execChip(run, steps, done) {
    if (!run) return chip('neutral', 'Sin ejecutar');
    if (run.status === 'running') return done >= steps.length && run.cond.met ? chip('waiting') : chip('running', 'En curso');
    if (run.status === 'waiting') return chip('waiting');
    if (run.status === 'applying') return chip('running', 'Aplicando');
    if (run.status === 'done') return chip('done', 'Completada');
    if (run.status === 'rejected') return chip('rejected', 'Detenida · propuesta rechazada');
    return chip('neutral', 'Detenida · condición no cumplida');
  }

  function paint(ctx, run, steps, done, running) {
    const lanes = ctx.$('#al-lanes');
    if (lanes) lanes.innerHTML = String(lanesHTML(run, steps, done, running));
    App.planGraph.set(ctx.root, graphStatus(run, steps, done, running));
    const st = ctx.$('#al-exec-state');
    if (st) st.innerHTML = String(execChip(run, steps, done));
  }

  /* ---------------------------------------------------------------- Piezas de la vista */

  function lotState(run, code) {
    if (!run || !run.decision) return (run && run.excluded && run.excluded.includes(code)) ? 'out' : 'exposed';
    if (run.excluded && run.excluded.includes(code)) return 'out';
    return run.decision.status === 'approved' ? 'blocked' : 'unblocked';
  }
  const LOT_CHIP = {
    exposed: () => chip('critical', 'Expuesto'),
    blocked: () => chip('blocked', 'Bloqueado'),
    out: () => chip('neutral', 'Fuera del alcance'),
    unblocked: () => chip('neutral', 'Sin bloqueo')
  };

  function head(run, wf) {
    const st = run ? run.status : 'idle';
    let actions;
    if (st === 'running' || st === 'applying') actions = html`<button type="button" class="btn btn-primary is-busy" disabled><span class="spinner"></span><span>${st === 'running' ? 'Ejecutando…' : 'Aplicando…'}</span></button>`;
    else if (st === 'waiting') actions = html`<button type="button" class="btn btn-primary" data-action="scroll-approval">${icon('user-check')}<span>Revisar la propuesta</span></button>`;
    else if (st === 'done') actions = html`<button type="button" class="btn btn-secondary" data-open-audit>${icon('history')}<span>Ver en auditoría</span></button><button type="button" class="btn btn-primary" data-action="report">${icon('printer')}<span>Descargar informe de incidencia</span></button>`;
    else actions = html`<button type="button" class="btn btn-primary" data-action="execute">${icon('play')}<span>${st === 'idle' ? (wf.backup ? 'Ejecutar workflow de respaldo' : 'Ejecutar workflow') : 'Volver a ejecutar'}</span></button>`;
    return App.pageHead({
      title: `Cámara ${chamber.code} · excursión de temperatura`,
      meta: [
        { icon: 'bell', text: `Alarma ${chamber.alarm_id} · ${fmt.date(D.meta.today, exc.start)}` },
        { icon: 'map-pin', text: `${chamber.plant_name} · ${chamber.name}` },
        { icon: 'user-check', text: `Aprueba: ${wf.approver}` }
      ],
      actions
    });
  }

  function kpis(wf, cond, run) {
    const held = run && run.decision && run.decision.status === 'approved' && scopeOf(run.excluded).ships.some((x) => x.id === FIRST.id);
    return html`<div class="kpis">
      ${App.kpi({ label: 'Pico de temperatura de aire', value: fmt.temp(exc.peak), sub: `A las ${exc.peak_time} · ${critMinOf(cond)} min por encima de ${fmt.temp(critOf(cond))}`, icon: 'thermometer', tone: 'crit' })}
      ${App.kpi({ label: `Tiempo por encima de ${fmt.temp(wf.threshold)}`, value: cond.above ? `${cond.above} min` : '0 min', sub: cond.above ? `${cond.start}–${cond.end} · el workflow actúa a partir de ${wf.minutes} min` : `El workflow actúa a partir de ${wf.minutes} min`, icon: 'clock', tone: cond.met ? 'warn' : undefined })}
      ${App.kpi({ label: `Palés en ${chamber.code} durante la excursión`, value: ALL.pallets, sub: `${LOTS.length} lotes · ${fmt.kg(ALL.kg)}`, icon: 'pallet' })}
      ${App.kpi({ label: 'Primera expedición afectada', value: FIRST.time, sub: `${FIRST.id} · ${FIRST.dock} · ${fmt.plural(sum(LOTS.filter((l) => l.planned_shipment === FIRST.id), 'pallets'), 'palé', 'palés')}${held ? ' · retenida' : ''}`, icon: 'truck' })}
    </div>`;
  }

  function workflowBlock(wf, run) {
    if (wf.backup) {
      return html`<div class="al-wf">
        <div class="al-wf-label">Workflow que responde</div>
        ${App.callout({
          tone: 'brand',
          icon: 'workflow',
          title: run ? `Se ha ejecutado el workflow de respaldo «${wf.name}» ${wf.version}` : `Se ejecutará el workflow de respaldo «${wf.name}» ${wf.version}`,
          body: html`No se ha publicado ningún workflow de cadena de frío en esta sesión, así que Prodigy usa el de respaldo, configurado con los parámetros de PNT-CAL-012: aire por encima de ${fmt.temp(LIMIT)} durante más de ${MIN_HOLD} min y aprobación de ${ROLE.quality_shift}.`,
          actions: html`<button type="button" class="btn btn-secondary btn-sm" data-go="workflow">${icon('workflow', 15)}<span>Crear el workflow desde el procedimiento</span></button>`
        })}
      </div>`;
    }
    return html`<div class="al-wf">
      <div class="al-wf-label">Workflow que responde</div>
      <div class="al-wf-head"><span class="al-wf-name">${wf.name}</span>${chip({ tone: 'brand', icon: 'git-branch', label: `${wf.version} · publicado` })}</div>
      ${App.kv([
        ['Origen', `«De palabras a workflow»${wf.publishedAt ? `, publicado a las ${fmt.time(wf.publishedAt)}` : ''}`],
        ['Disparador', `SCADA Galileo · aire por encima de ${fmt.temp(wf.threshold)} durante más de ${wf.minutes} min`],
        ['Agentes', '4 · Monitor, Trazabilidad, Bloqueo de calidad e Incidencias'],
        ['Aprobación', wf.approver]
      ])}
    </div>`;
  }

  function eventCard(wf, run) {
    return App.card({
      title: `Alarma ${chamber.alarm_id}`,
      sub: `Recibida de SCADA Galileo el ${fmt.date(D.meta.today)} a las ${exc.start}`,
      icon: 'bell',
      iconTone: 'crit',
      body: html`${App.kv([
        ['Cámara', `${chamber.code} · ${chamber.name} · capacidad ${chamber.capacity_pallets} palés`],
        ['Sonda', `${chamber.sensor} · aire · lectura cada ${exc.interval_min} min`],
        ['Consigna y límites', `${fmt.temp(chamber.setpoint_c)} · límite ${fmt.temp(LIMIT)} · crítico ${fmt.temp(CRIT)}`],
        ['Equipos', `${chamber.evaporator} (evaporador) · ${chamber.door} (puerta rápida)`],
        ['Ahora', `${fmt.temp(chamber.current_c)} a las ${chamber.current_time} · por debajo del límite desde las ${exc.end}`],
        ['Procedimientos', 'PNT-CAL-012 · PNT-CAL-015']
      ])}${workflowBlock(wf, run)}`
    });
  }

  function chartCard(wf, cond) {
    const bands = chamber.events.filter((e) => e.end && e.type !== 'pre-desescarche').map((e) => ({
      from: e.time, to: e.end, tone: e.type === 'puerta' ? 'warn' : undefined,
      label: e.type === 'puerta' ? `Puerta ${e.equipment} abierta` : `Desescarche ${e.equipment}`
    }));
    const T = wf.threshold;
    const K = critOf(cond);
    const chart = App.lineChart({
      series,
      threshold: { value: T, label: `Límite ${fmt.temp(T)}`, legend: `Límite del workflow ${fmt.temp(T)} · ${cond.above} min por encima` },
      critical: T !== K ? { value: K, label: `Crítico ${fmt.temp(K)}`, legend: `Crítico ${fmt.temp(K)} · ${critMinOf(cond)} min por encima` } : null,
      peak: { x: exc.peak_time, y: exc.peak },
      last: true,
      yTicks: [-24, -21, -18, -15, -12],
      xTicks: ['05:00', '05:30', '06:00', '06:30', '07:00'],
      annotations: [{ x: exc.start, label: `Alarma ${exc.start}` }],
      bands,
      height: 250,
      seriesLabel: `Aire (${chamber.sensor})`,
      shadeLabel: cond.above ? `Excursión ${cond.start}–${cond.end}` : 'Por encima del límite'
    });
    const toneOf = (e) => (e.type === 'alarma' ? 'crit' : e.type === 'recuperación' ? 'ok' : e.type === 'puerta' ? 'warn' : 'brand');
    const events = App.timeline({ compact: true, items: chamber.events.map((e) => ({
      time: e.time, timeSub: e.end ? `a ${e.end}` : '', title: fmt.text(e.text), tone: toneOf(e),
      meta: e.equipment ? chip('neutral', e.equipment, { dot: false }) : (e.ref ? chip('neutral', e.ref, { dot: false }) : '')
    })) });
    const readings = html`<div class="al-readings">${App.table({ dense: true, stack: false, rows: series, cols: [
      { label: 'Hora', render: (p) => html`<span class="code">${p.time}</span>` },
      { label: 'Aire', num: true, render: (p) => html`<span class="${p.temp_c > K ? 't-crit strong' : p.temp_c > T ? 't-warn strong' : ''}">${fmt.temp(p.temp_c)}</span>` },
      { label: 'Estado', render: (p) => (p.temp_c > K ? chip('critical', 'Crítico') : p.temp_c > T ? chip('warning', 'Excursión') : chip('ok', 'En rango')) }
    ] })}</div>`;
    return App.card({
      title: `Cámara ${chamber.code} · temperatura de aire`,
      sub: `Consigna ${fmt.temp(chamber.setpoint_c)} · ahora ${fmt.temp(chamber.current_c)} (${chamber.current_time})`,
      icon: 'thermometer',
      iconTone: 'crit',
      flush: true,
      body: App.tabs({ id: 'al-c07', flush: true, label: `Cámara ${chamber.code}`, tabs: [
        { id: 'temp', label: 'Temperatura', body: chart },
        { id: 'eventos', label: 'Eventos', count: chamber.events.length, body: html`${events}<div class="mt-4">${App.callout({ tone: 'warn', icon: 'wrench', title: 'Hipótesis de causa', body: fmt.text(chamber.probable_cause) })}</div>` },
        { id: 'lecturas', label: 'Lecturas', count: series.length, body: readings }
      ] }),
      footer: html`<span class="muted small row">${sys('SCADA Galileo')}<span>${series.length} lecturas de ${exc.series_start} a ${exc.series_end}</span></span>`
    });
  }

  function graphHTML(run, wf, steps, prog) {
    const nodes = [
      { id: 't', kind: 'trigger', label: `Aire > ${fmt.temp(wf.threshold)} más de ${wf.minutes} min`, sub: `Alarma ${chamber.alarm_id}`, systems: ['SCADA Galileo'], icon: 'bell' },
      { id: 'mon', label: 'Monitor de cadena de frío', sub: 'confirma la excursión', systems: ['SCADA Galileo'], icon: 'thermometer' },
      { id: 'traz', label: 'Trazabilidad', sub: 'palés, lotes y expediciones', systems: ['Easy WMS', 'SAP', 'MES Mapex'], icon: 'git-branch' },
      { id: 'apr', kind: 'approval', label: 'Aprobación de Calidad', sub: 'propuesta con motivo', icon: 'user-check' },
      { id: 'blq', label: 'Bloqueo de calidad', sub: 'bloquea y retiene', systems: ['SAP QM', 'Easy WMS'], icon: 'lock' },
      { id: 'inc', label: 'Incidencias', sub: 'NC, 8D y aviso', systems: ['Elara', 'Teams'], icon: 'clipboard' }
    ];
    const status = graphStatus(run, steps, prog.done, prog.running);
    const title = `Workflow ${wf.name}`;
    /* Pantallas anchas: tras la aprobación, Bloqueo e Incidencias en paralelo. Móvil: secuencia vertical legible. */
    return html`<div class="al-graph-wide">${App.planGraph({ id: 'al-graph', title, nodes, status, edges: [['t', 'mon'], ['mon', 'traz'], ['traz', 'apr'], ['apr', 'blq'], ['apr', 'inc']] })}</div>
      <div class="al-graph-narrow">${App.planGraph({ title, nodes, status, layout: 'tb', nodeWidthTB: 270, edges: [['t', 'mon'], ['mon', 'traz'], ['traz', 'apr'], ['apr', 'blq'], ['blq', 'inc']] })}</div>`;
  }

  function roomHTML(run, steps, prog) {
    return html`<div class="al-room" id="al-room">
      <div class="al-room-head"><span class="al-room-title">Sala de agentes</span><span class="al-room-sub">4 agentes · 7 sistemas</span></div>
      <ol class="al-lanes" id="al-lanes">${lanesHTML(run, steps, prog.done, prog.running)}</ol>
    </div>`;
  }

  function execCard(run, wf, steps, prog) {
    const idleLog = html`<div class="rs al-log-idle">
      <div class="rs-head"><span>${chip('neutral', 'Sin ejecutar')}</span><span class="rs-title">Registro de ejecución</span></div>
      <div class="al-idle">
        <p>Cada llamada de los agentes aparecerá aquí con su sistema, el resultado y la latencia. La ejecución se detiene en la aprobación: nada se escribe en SAP QM ni en Easy WMS sin la decisión de Calidad.</p>
        <button type="button" class="btn btn-primary" data-action="execute">${icon('play')}<span>${wf.backup ? 'Ejecutar workflow de respaldo' : 'Ejecutar workflow'}</span></button>
      </div>
    </div>`;
    return App.card({
      id: 'al-exec',
      title: `Ejecución · ${wf.name}`,
      sub: `${wf.version}${wf.backup ? ' · workflow de respaldo' : ' · publicado en esta sesión'} · disparador ${chamber.alarm_id}${run ? ` · ${run.id}` : ''}`,
      icon: 'workflow',
      actions: html`<span id="al-exec-state">${execChip(run, steps, prog.done)}</span>`,
      flush: true,
      body: html`<div class="card-body">${graphHTML(run, wf, steps, prog)}</div>
        <div class="card-body"><div class="grid cols-5-7 al-exec-grid">${roomHTML(run, steps, prog)}<div id="al-log">${run ? '' : idleLog}</div></div></div>`
    });
  }

  function lotsCard(run) {
    const sc = scopeOf(run.excluded);
    const cols = [
      { label: 'Lote', width: '30%', render: (l) => html`${App.lotTag(l.lot)}<span class="sub">${l.product} · ${l.brand}</span>` },
      { label: `En ${chamber.code}`, width: '15%', render: (l) => html`<span class="strong">${fmt.plural(l.pallets, 'palé', 'palés')}</span><span class="sub">calle ${l.lane} · ${fmt.kg(l.kg)}</span>` },
      { label: 'Expedición planificada', render: (l) => { const s = SHIP(l.planned_shipment); return html`<span class="code">${s.id}</span><span class="sub">${shipWhen(s)} · ${s.dock} · ${l.channel}</span>`; } },
      { label: `Fuera de ${chamber.code}`, width: '17%', render: (l) => {
        const sil = SILOS.filter((s) => s.lot === l.lot);
        const shp = SHIPPED.filter((s) => s.lot === l.lot);
        return html`${sil.length ? sil.map((s) => html`<span class="t-warn strong nowrap">${s.pallets} en ${s.location}</span> `) : html`<span class="muted">Sin stock</span>`}${shp.length ? html`<span class="sub">${shp.map((s) => `${s.pallets} expedidos el ${fmt.dayMonth(s.date)}`).join(' · ')}</span>` : ''}`;
      } },
      { label: 'Estado', width: '13%', render: (l) => LOT_CHIP[lotState(run, l.lot)]() }
    ];
    return App.card({
      id: 'al-lots',
      title: 'Lotes y palés afectados',
      sub: `Mecalux Easy WMS y SAP · ${chamber.code} entre ${run.cond.start} y ${run.cond.end}`,
      icon: 'pallet',
      iconTone: 'crit',
      flush: true,
      body: App.table({ cols, rows: LOTS, clickable: true, rowAttrs: (l) => ({ 'data-lot': l.lot, title: `Ver la traza del lote ${l.lot}` }), rowClass: (l) => { const st = lotState(run, l.lot); return st === 'out' ? 'is-muted' : st === 'unblocked' ? '' : 'tone-crit'; } }),
      footer: html`<span class="small slate">${ALL.pallets} palés · ${fmt.kg(ALL.kg)} · ${fmt.eur(ALL.value)} a coste estándar${sc.out.length ? ` · ${sc.exPallets} fuera del alcance` : ''}</span><span class="spacer"></span><button type="button" class="btn btn-secondary btn-sm" data-action="csv">${icon('download', 15)}<span>Descargar SSCC (CSV)</span></button>`
    });
  }

  function mapCard(run) {
    const pltClass = (code) => { const s = lotState(run, code); return s === 'blocked' ? ' is-blocked' : s === 'out' ? ' is-out' : ''; };
    const rows = LOTS.map((l) => {
      const s = SHIP(l.planned_shipment);
      const out = pltClass(l.lot) === ' is-out';
      return html`<button type="button" class="al-lrow${out ? ' is-out' : ''}" data-lot="${l.lot}" title="Ver la traza del lote ${l.lot}">
        <span class="al-lrow-name">Calle ${l.lane}</span>
        <span class="al-plts" role="img" aria-label="${fmt.plural(l.pallets, 'palé', 'palés')}">${Array.from({ length: l.pallets }, () => html`<i class="al-plt${pltClass(l.lot)}"></i>`)}</span>
        <span class="al-lrow-info"><span class="code">${l.lot}</span>${shipWhen(s)} · ${s.dock}</span>
      </button>`;
    });
    const silos = SILOS.map((s) => {
      const out = run.excluded && run.excluded.includes(s.lot);
      return html`<button type="button" class="al-silo${out ? ' is-out' : ''}" data-lot="${s.lot}" title="Ver la traza del lote ${s.lot}">
        <span class="al-silo-code">${s.location}</span>
        <span class="al-silo-num">${s.pallets}</span>
        <span class="al-silo-sub">${s.lot.split('-').slice(-2).join('-')}${s.location === 'SIL-3' && SIL3_TEMP ? ` · ${fmt.minus(SIL3_TEMP)} °C, en límites` : ''}</span>
      </button>`;
    });
    const blocked = run.decision && run.decision.status === 'approved';
    const rejected = run.decision && run.decision.status === 'rejected';
    return App.card({
      id: 'al-map',
      title: 'Ubicación de los palés',
      sub: 'Mecalux Easy WMS · Fustiñana',
      icon: 'map-pin',
      body: html`<div class="al-map">
        <div>
          <div class="al-zone-head"><span class="al-zone-title">${chamber.code} · ${chamber.name}</span><span class="al-zone-sub">${ALL.pallets} palés en ${LOTS.length} calles · ${chamber.capacity_pallets} huecos</span></div>
          <div class="al-c07">${rows}</div>
        </div>
        <div>
          <div class="al-zone-head"><span class="al-zone-title">Mismos lotes en silos automáticos</span><span class="al-zone-sub">${ALL.silosTotal} palés · no estuvieron en ${chamber.code} · a evaluar</span></div>
          <div class="al-silos">${silos}</div>
        </div>
        <div>
          <div class="al-zone-head"><span class="al-zone-title">Expedidos antes de la alarma</span><span class="al-zone-sub">${SHIPPED_TOTAL} palés · fuera del alcance</span></div>
          <ul class="al-shipped">${SHIPPED.map((s) => html`<li><span class="code">${s.id}</span><span class="al-sh-when">${fmt.date(s.date)} ${s.time}</span><span class="al-sh-what">${fmt.plural(s.pallets, 'palé', 'palés')} de <span class="code">${s.lot}</span><span class="sub">${s.customer}</span></span></li>`)}</ul>
        </div>
        <div class="al-legend"><span><i class="al-plt${blocked ? ' is-blocked' : ''}"></i>${blocked ? 'Bloqueado' : rejected ? 'Expuesto, sin bloqueo' : 'Expuesto a la excursión'}</span><span><i class="al-plt is-out"></i>Fuera del alcance</span><span><i class="al-plt is-silo"></i>A evaluar en silo</span></div>
      </div>`
    });
  }

  function approvalHTML(run) {
    const sc = scopeOf(run.excluded);
    const d = run.decision;
    const status = d ? d.status : 'pending';
    const applying = run.status === 'applying';
    const W = run.wf;
    const C = run.cond;
    const silosNames = uniq(sc.silos.map((s) => s.location));
    const scope = [
      { label: `Palés en ${chamber.code} durante la excursión`, value: `${sc.pallets} palés · ${sc.lots.length} lotes · ${fmt.kg(sc.kg)}`, status: 'blocked', chip: status === 'approved' ? 'Bloqueado' : 'Bloquear' },
      sc.out.length ? { label: `Retirado del alcance: ${sc.out.map((l) => l.lot).join(', ')}`, value: fmt.plural(sc.exPallets, 'palé', 'palés'), status: 'neutral', chip: 'Excluido' } : null,
      sc.silosTotal ? { label: `Mismos lotes en ${silosNames.join(', ')}`, value: `${sc.silosTotal} palés`, status: 'evaluate' } : null,
      { label: `Expediciones planificadas · la primera ${sc.ships[0].id} a las ${sc.ships[0].time}`, value: String(sc.ships.length), status: 'hold', chip: status === 'approved' ? 'Retenidas' : 'Retener' }
    ].filter(Boolean);
    const effects = status === 'approved' && !applying
      ? [`SAP QM: ${run.blq} · ${sc.lots.length} lotes (${sc.pallets} palés)`, `Mecalux Easy WMS: ${sc.pallets} palés inmovilizados y ${sc.ships.length} expediciones retenidas`, `Elara: ${run.nc} con borrador de 8D`, `Microsoft Teams: aviso a ${ROLE.dispatch_shift} y ${ROLE.refrigeration_maintenance}`]
      : status === 'approved' ? []
        : [`SAP QM: bloqueo de calidad de ${sc.lots.length} lotes (${sc.pallets} palés en ${chamber.code})`, `Mecalux Easy WMS: ${sc.pallets} palés inmovilizados y ${sc.ships.length} expediciones retenidas`, 'Elara: no conformidad con borrador de 8D', `Microsoft Teams: aviso a ${ROLE.dispatch_shift} y ${ROLE.refrigeration_maintenance}`];
    const comments = [];
    if (sc.out.length) comments.push(html`<div><strong>Alcance editado:</strong> se retira ${fmt.list(sc.out.map((l) => l.lot))}. Motivo: «${run.editReason}»</div>`);
    if (d && d.status === 'rejected') comments.push(html`<div${comments.length ? App.raw(' class="mt-1"') : ''}><strong>Motivo del rechazo:</strong> «${d.reason}»</div>`);
    const doneActions = status === 'rejected'
      ? html`<button type="button" class="btn btn-ghost" data-open-audit>${icon('history')}<span>Ver en auditoría</span></button><button type="button" class="btn btn-secondary" data-action="execute">${icon('rotate-ccw')}<span>Volver a ejecutar</span></button>`
      : html`<button type="button" class="btn btn-ghost" data-open-audit>${icon('history')}<span>Ver en auditoría</span></button>`;
    return App.approvalCard({
      id: 'blq-c07',
      status,
      title: `Bloqueo de calidad · ${sc.pallets} palés en ${chamber.code}`,
      summary: `Motivo: aire por encima de ${fmt.temp(C.threshold)} durante ${C.above} min (${C.start}–${C.end}), más de los ${C.minutes} min que fija ${W.backup ? 'PNT-CAL-012' : 'el workflow'}${critMinOf(C) ? `, y ${critMinOf(C)} min por encima de ${fmt.temp(critOf(C))}: excursión crítica` : ''}. Se bloquean los palés expuestos hasta medir la temperatura de producto y decidir el destino de cada lote.`,
      approver: W.approver,
      policy: 'PNT-CAL-012 · PNT-CAL-015 · solo Calidad libera',
      scope,
      effects,
      extra: applying ? html`<div class="al-wait mt-4"><span class="spinner"></span><span>Aplicando en SAP QM, Easy WMS, Elara y Teams…</span></div>` : '',
      editable: true,
      approveLabel: 'Aprobar bloqueo',
      rejectLabel: 'Rechazar',
      editLabel: 'Editar alcance',
      decidedBy: d ? d.by : null,
      decidedAt: d ? d.at : null,
      comment: comments.length ? html`${comments}` : null,
      doneActions
    });
  }

  function approvalPlaceholder() {
    return App.card({
      id: 'al-approval-wait',
      title: 'Propuesta de bloqueo',
      sub: `La prepara el agente ${LANE_AGENT.blq}`,
      icon: 'user-check',
      body: html`<div class="al-wait"><span class="spinner"></span><span>Aparecerá aquí para su aprobación. Nada se escribe en SAP QM ni en Easy WMS sin la decisión de Calidad.</span></div>`
    });
  }

  function decisionRow(run, opts) {
    const o = opts || {};
    return html`<div class="grid cols-7-5 al-dec-grid">
      <div class="stack">${lotsCard(run)}${o.map !== false ? mapCard(run) : ''}</div>
      <div class="al-side" id="al-approval">${o.approval === false ? approvalPlaceholder() : approvalHTML(run)}</div>
    </div>`;
  }

  /* ---------------------------------------------------------------- Resultado, 8D y comparación */

  function d8Items(run) {
    const sc = scopeOf(run.excluded);
    const ant = ANTECEDENT && ANT_LOT && sc.lots.includes(ANT_LOT)
      ? ` Antecedente en Elara: ${ANTECEDENT.id} (${fmt.date(ANTECEDENT.date)}), ${ANTECEDENT.product.toLowerCase()} para ${ANTECEDENT.customer_label}: ${ANTECEDENT.description.toLowerCase()} por ${ANTECEDENT.root_cause.toLowerCase()} (${ANTECEDENT.nc}, ${ANTECEDENT.status}); tenerlo en cuenta al decidir el destino de ${ANT_LOT.lot}.`
      : '';
    return [
      { d: 'D1', t: 'Equipo', text: `Líder: ${ROLE.quality_shift}. Equipo: ${ROLE.dispatch_shift}, ${ROLE.refrigeration_maintenance} y ${ROLE.quality_plant}.`, owner: ROLE.quality_shift, due: D.meta.today },
      { d: 'D2', t: 'Descripción del problema', text: `El ${fmt.date(exc.date)} el aire de la cámara ${chamber.code} superó ${fmt.temp(LIMIT)} durante ${exc.minutes_above_limit} min (${exc.start}–${exc.end}), con un pico de ${fmt.temp(exc.peak)} a las ${exc.peak_time} y ${CRIT_MIN} min por encima de ${fmt.temp(CRIT)}. Había ${ALL.pallets} palés de ${LOTS.length} lotes en la cámara.${ant}`, owner: ROLE.quality_shift, due: D.meta.today },
      { d: 'D3', t: 'Contención', text: `${run.blq}: ${sc.pallets} palés bloqueados en SAP QM e inmovilizados en Easy WMS; ${sc.ships.length} expediciones retenidas. Medir la temperatura de producto con sonda (capa exterior y centro) en los palés expuestos. ${sc.silosTotal ? `Evaluar los ${sc.silosTotal} palés de los mismos lotes en silos, que no estuvieron en ${chamber.code}.` : ''}`.trim(), owner: ROLE.quality_shift, due: D.meta.today },
      { d: 'D4', t: 'Causa raíz (hipótesis)', text: `${fmt.text(chamber.probable_cause)}`, owner: ROLE.refrigeration_maintenance, due: '2026-10-01' },
      { d: 'D5', t: 'Acciones correctivas propuestas', text: `Revisar el cierre de la puerta rápida ${chamber.door} y su sensor; revisar la programación del desescarche de ${chamber.evaporator} frente a la actividad del muelle; valorar un aviso de puerta abierta en Galileo.`, owner: ROLE.refrigeration_maintenance, due: '2026-10-06' },
      { d: 'D6', t: 'Implantación y verificación', text: `Verificar el cierre de ${chamber.door} y la recuperación de temperatura en el siguiente ciclo de desescarche. Decisión de destino por lote según PNT-CAL-012: liberar, reclasificar o destruir.`, owner: ROLE.quality_plant, due: '2026-10-09' },
      { d: 'D7', t: 'Prevención', text: 'Extender la revisión de puertas y desescarches al resto de cámaras de expedición de Fustiñana y actualizar la instrucción de desescarche si procede.', owner: ROLE.quality_plant, due: '2026-10-16' },
      { d: 'D8', t: 'Cierre', text: `Cerrar ${run.nc} tras verificar la eficacia y registrar la decisión de destino de los ${sc.lots.length} lotes.`, owner: ROLE.quality_plant, due: '2026-10-30' }
    ];
  }

  function teamsMessage(run) {
    const sc = scopeOf(run.excluded);
    const at = run.decision ? fmt.time(run.decision.at) : '';
    return html`<div class="al-msg">
      <div class="al-msg-head">${icon('message-square', 15)}<strong>Prodigy · agente Incidencias</strong><span>canal «${TEAMS_CHANNEL}»</span><span class="spacer"></span><span>${run.endAt ? fmt.time(run.endAt) : ''}</span></div>
      <div class="al-msg-body">
        <p><span class="al-mention">@${ROLE.dispatch_shift}</span> Bloqueo de calidad ${run.blq} en ${chamber.code}, aprobado por ${run.decision.by} a las ${at}. No cargar hasta nueva decisión de Calidad:</p>
        <ul>${sc.ships.map((s) => { const ls = sc.lots.filter((l) => l.planned_shipment === s.id); return html`<li><span class="code">${s.id}</span> · ${shipWhen(s)} · ${s.dock} · ${fmt.plural(sum(ls, 'pallets'), 'palé', 'palés')}</li>`; })}</ul>
        <p><span class="al-mention">@${ROLE.refrigeration_maintenance}</span> Revisar el cierre de la puerta ${chamber.door} y el desescarche de ${chamber.evaporator} (hipótesis de causa). Detalle en ${run.nc} (Elara).</p>
      </div>
    </div>`;
  }

  function resultCard(run) {
    const sc = scopeOf(run.excluded);
    const agentsMs = (run.p1Ms || 0) + (run.p2Ms || 0);
    const total = agentsMs + (run.decision ? run.decision.waitMs : 0);
    const d8 = d8Items(run);
    const blqTile = html`<div class="al-out-tile">
      <div class="al-out-head"><span class="card-icon tone-crit">${icon('lock', 18)}</span><div><div class="al-out-title">Bloqueo ${run.blq}</div><div class="al-out-sub">${sys('SAP QM')}${sys('Mecalux Easy WMS')}</div></div></div>
      ${App.kv([
        ['Estado', chip('blocked')],
        ['Alcance', `${sc.pallets} palés · ${sc.lots.length} lotes · ${fmt.kg(sc.kg)}`],
        ['Valor a coste estándar', fmt.eur(sc.value)],
        ['Expediciones retenidas', html`${sc.ships.map((s, i) => html`${i ? ', ' : ''}<span class="code">${s.id}</span>`)}`],
        ['Libera', `${ROLE.quality_shift} (PNT-CAL-015)`]
      ])}
      <div class="al-next">Siguiente paso según PNT-CAL-012: medir la temperatura de producto con sonda en los palés expuestos, capa exterior y centro.</div>
      <div class="al-out-foot"><button type="button" class="btn btn-secondary btn-sm" data-action="csv">${icon('download', 15)}<span>SSCC bloqueados (CSV)</span></button></div>
    </div>`;
    const ncTile = html`<div class="al-out-tile">
      <div class="al-out-head"><span class="card-icon">${icon('clipboard', 18)}</span><div><div class="al-out-title">No conformidad ${run.nc}</div><div class="al-out-sub">${sys('Elara')}${chip('draft', '8D en borrador')}</div></div></div>
      <ol class="al-8d">${d8.map((x) => html`<li><span class="d">${x.d}</span><span class="t">${x.t}<span class="o">${x.owner} · ${fmt.dayMonth(x.due)}</span></span></li>`)}</ol>
      <div class="al-out-foot"><button type="button" class="btn btn-secondary btn-sm" data-action="report-8d">${icon('printer', 15)}<span>Descargar borrador 8D (PDF)</span></button></div>
    </div>`;
    const teamsTile = html`<div class="al-out-tile">
      <div class="al-out-head"><span class="card-icon">${icon('send', 18)}</span><div><div class="al-out-title">Aviso a expedición</div><div class="al-out-sub">${sys('Microsoft Teams')}<span>enviado a las ${fmt.time(run.endAt)}</span></div></div></div>
      ${teamsMessage(run)}
    </div>`;
    return App.card({
      id: 'al-result',
      tone: 'ok',
      icon: 'check-circle',
      iconTone: 'ok',
      title: `Bloqueo ${run.blq} aplicado y no conformidad ${run.nc} abierta`,
      sub: `Workflow completado a las ${fmt.time(run.endAt, true)} · ${fmt.ms(total)} en total, con la decisión de Calidad`,
      actions: html`<button type="button" class="btn btn-secondary btn-sm" data-open-audit>${icon('history', 15)}<span>Ver en auditoría</span></button><button type="button" class="btn btn-primary btn-sm" data-action="report">${icon('printer', 15)}<span>Descargar informe de incidencia (PDF)</span></button>`,
      body: html`<div class="stack">
        ${App.stats([
          { label: 'Palés bloqueados', value: sc.pallets, tone: 'crit' },
          { label: 'Expediciones retenidas', value: sc.ships.length },
          { label: 'Lotes con bloqueo', value: sc.lots.length },
          { label: 'Palés en silos a evaluar', value: sc.silosTotal, tone: 'warn' },
          { label: 'Llamadas a sistemas y modelo', value: CALLS.total },
          { label: 'Coste estimado', value: fmt.usd(LLM_COST_USD) }
        ])}
        <div class="al-out">${blqTile}${ncTile}${teamsTile}</div>
        <div class="al-metrics">
          <span>${icon('gauge', 15)}Ejecución <strong>${run.id}</strong></span>
          <span>${CALLS.auto} pasos automáticos y 1 aprobación</span>
          <span>Agentes <strong>${fmt.ms(agentsMs)}</strong></span>
          <span>Decisión de Calidad <strong>${fmt.ms(run.decision.waitMs)}</strong></span>
          <span>${CALLS.total} llamadas, ${CALLS.llm} al modelo de lenguaje</span>
          <span>Coste estimado <strong>${fmt.usd(LLM_COST_USD)}</strong></span>
        </div>
      </div>`
    });
  }

  function comparisonCard(run) {
    const agentsMs = (run.p1Ms || 0) + (run.p2Ms || 0);
    const total = agentsMs + run.decision.waitMs;
    const rows = [
      { k: 'Personas que intervienen', today: `3–4: Calidad, expedición, almacén y ${ROLE.refrigeration_maintenance.toLowerCase()}`, now: 'Calidad revisa y decide; expedición y mantenimiento reciben el aviso con los datos' },
      { k: 'Sistemas que se consultan a mano', today: '5–6: Galileo, Easy WMS, SAP, SAP QM, Elara y correo o teléfono', now: 'Ninguno: los agentes consultan 7 sistemas y cada dato queda en el registro' },
      { k: 'Pasos', today: '10–12 pasos manuales, con esperas entre personas', now: `${CALLS.auto} pasos automáticos y 1 aprobación` },
      { k: 'Tiempo hasta el bloqueo y la NC', today: '1–3 h', now: html`${fmt.ms(total)}<span class="al-cmp-now">Medido en esta sesión: propuesta en ${fmt.ms(run.p1Ms)}, decisión de Calidad en ${fmt.ms(run.decision.waitMs)}</span>` },
      { k: 'Evidencia para la auditoría', today: 'Repartida entre correos, capturas y hojas de cálculo', now: `Informe ${REPORT_CODE} y registro de auditoría de la ejecución` }
    ];
    return App.card({
      id: 'al-compare',
      title: 'Comparación con el proceso actual',
      sub: 'La columna «Hoy» es una estimación prudente que se valida con la línea base del piloto',
      icon: 'scale',
      flush: true,
      class: 'al-cmp',
      body: App.table({ rows, cols: [
        { label: 'Aspecto', width: '22%', render: (r) => html`<span class="strong">${r.k}</span>` },
        { label: 'Hoy (estimación)', width: '36%', render: (r) => r.today },
        { label: 'Con Prodigy (esta sesión)', render: (r) => r.now }
      ] }),
      footer: html`<span class="al-cmp-foot">${icon('info', 15)}<span>Los valores de «Hoy» son orientativos y se sustituyen por la línea base que se mide en las semanas 1–2 del piloto.</span></span>`
    });
  }

  function rejectedCard(run) {
    const d = run.decision;
    return App.card({
      id: 'al-result',
      icon: 'x-circle',
      title: 'Propuesta rechazada · no se ha aplicado ninguna acción',
      sub: `Decisión de ${d.by} a las ${fmt.time(d.at)}`,
      actions: html`<button type="button" class="btn btn-secondary btn-sm" data-open-audit>${icon('history', 15)}<span>Ver en auditoría</span></button><button type="button" class="btn btn-primary btn-sm" data-action="execute">${icon('rotate-ccw', 15)}<span>Volver a ejecutar el workflow</span></button>`,
      body: html`<div class="stack">
        ${App.callout({ tone: 'neutral', icon: 'message-square', title: 'Motivo del rechazo', body: `«${d.reason}»` })}
        <ul class="al-notapplied">
          <li>${sys('SAP QM')}<span>Sin bloqueo de calidad</span><span>${chip('neutral', 'Sin cambios')}</span></li>
          <li>${sys('Mecalux Easy WMS')}<span>Ningún palé inmovilizado; las ${ALL.ships.length} expediciones siguen planificadas</span><span>${chip('neutral', 'Sin cambios')}</span></li>
          <li>${sys('Elara')}<span>Sin no conformidad</span><span>${chip('neutral', 'Sin cambios')}</span></li>
          <li>${sys('Microsoft Teams')}<span>Sin aviso a expedición</span><span>${chip('neutral', 'Sin cambios')}</span></li>
        </ul>
        <p class="small muted">La decisión y su motivo quedan en el registro de auditoría. La alarma sigue en el resumen del turno como decidida por Calidad.</p>
      </div>`
    });
  }

  function noTriggerCard(run) {
    const W = run.wf;
    const C = run.cond;
    return App.card({
      id: 'al-result',
      icon: 'alert-triangle',
      iconTone: 'warn',
      title: 'La condición del workflow no se cumple',
      sub: `«${W.name}» ${W.version} · ${run.id}`,
      actions: html`<button type="button" class="btn btn-secondary btn-sm" data-go="workflow">${icon('workflow', 15)}<span>Revisar el workflow</span></button><button type="button" class="btn btn-primary btn-sm" data-action="execute">${icon('rotate-ccw', 15)}<span>Volver a ejecutar</span></button>`,
      body: App.callout({
        tone: 'warn',
        icon: 'info',
        title: `${C.above} min por encima de ${fmt.temp(W.threshold)}; el workflow pide más de ${W.minutes} min`,
        body: html`<p>Con estos parámetros la alarma ${chamber.alarm_id} no activa el bloqueo: no se ha propuesto ni aplicado ninguna acción en SAP QM, Easy WMS, Elara ni Teams.</p><p class="mt-2">PNT-CAL-012 fija el bloqueo a partir de ${MIN_HOLD} min por encima de ${fmt.temp(LIMIT)}. Revisa los parámetros en «De palabras a workflow» y vuelve a ejecutarlo.</p>`
      })
    });
  }

  /* ---------------------------------------------------------------- Flujo */

  function scrollTo(ctx, sel, block) {
    requestAnimationFrame(() => { const el = ctx.$(sel); if (el) el.scrollIntoView({ behavior: 'smooth', block: block || 'start' }); });
  }

  function finalizePhase1(ctx) {
    const run = ctx.local.run;
    if (!run || run.status !== 'running') return;
    const steps = run.cond.met ? p1Steps(run) : noTrigSteps(run);
    steps.forEach((s) => { if (s.milestone) logMilestone(ctx, s.milestone); });
    const cur = ctx.local.run;
    ctx.setLocal({ run: Object.assign({}, cur, { status: run.cond.met ? 'waiting' : 'no-trigger', p1Ms: sum(steps, 'ms'), proposalWall: App.now().getTime(), endAt: run.cond.met ? null : iso(run.t0 + sum(steps, 'ms')) }) });
  }

  function finalizePhase2(ctx) {
    const run = ctx.local.run;
    if (!run || run.status !== 'applying') return;
    const steps = p2Steps(run);
    steps.forEach((s) => { if (s.milestone) logMilestone(ctx, s.milestone); });
    const cur = ctx.local.run;
    const p2Ms = sum(steps, 'ms');
    ctx.setLocal({ run: Object.assign({}, cur, { status: 'done', p2Ms, endAt: iso(run.t0 + run.p1Ms + run.decision.waitMs + p2Ms) }) });
  }

  function onStep(ctx, steps, s, k) {
    if (!ctx.alive()) return;
    if (s.milestone) logMilestone(ctx, s.milestone);
    const run = ctx.local.run;
    const done = k + 1;
    paint(ctx, run, steps, done, done < steps.length ? done : -1);
    if (s.reveal) {
      const host = ctx.$('#al-decision');
      if (host) host.innerHTML = String(decisionRow(run, { approval: false, map: s.reveal === 'map' }));
    }
  }

  async function execute(ctx) {
    if (ctx.vars.live) return;
    const prev = ctx.local.run;
    if (prev && !['rejected', 'no-trigger'].includes(prev.status)) return;
    const wf = currentWorkflow();
    const cond = condOf(wf);
    const history = (ctx.local.history || []).slice();
    if (prev) { history.push({ id: prev.id, status: prev.status, at: prev.endAt || null }); if (App.outcome('alarma')) App.outcome('alarma', null); }
    const run = { id: App.seq('EJE-2026-', 1), status: 'running', wf, cond, t0: App.now().getTime(), excluded: [], editReason: '', logged: {} };
    App.audit(wf.backup ? 'Workflow de respaldo ejecutado' : 'Workflow ejecutado', `«${wf.name}» ${wf.version} · alarma ${chamber.alarm_id} (${chamber.code}, ${exc.start}) · ${run.id}`);
    ctx.setLocal({ run, history });
    ctx.vars.live = true;
    ctx.rerender();
    scrollTo(ctx, '#al-exec');
    ctx.presenter({ next: cond.met
      ? 'Mientras corre: la sala de agentes resume y el registro detalla cada llamada con su sistema y latencia. Se detendrá en la aprobación. «Acelerar» si vamos justos.'
      : 'Mirar la condición: con estos parámetros el workflow no se activa.' });
    const steps = cond.met ? p1Steps(run) : noTrigSteps(run);
    paint(ctx, run, steps, 0, 0);
    const stream = App.reasoningStream(ctx.$('#al-log'), steps, {
      title: `Registro · ${run.id}`, signal: ctx.signal, maxHeight: 400, start: iso(run.t0),
      minDelay: 0, maxDelay: 9000, speed: ctx.vars.fast ? 4 : 1,
      onStep: (s, k) => onStep(ctx, steps, s, k)
    });
    await stream.done;
    if (!ctx.alive()) return;
    finalizePhase1(ctx);
    ctx.vars.live = false;
    ctx.presenter(null);
    ctx.rerender();
    if (ctx.local.run.status === 'waiting') {
      App.toast(`Propuesta de bloqueo lista: ${ALL.pallets} palés de ${LOTS.length} lotes. Pendiente de aprobación.`, { tone: 'warn', icon: 'user-check' });
      scrollTo(ctx, '#al-approval', 'center');
    } else scrollTo(ctx, '#al-result', 'center');
  }

  async function approve(ctx) {
    const run = ctx.local.run;
    if (!run || run.status !== 'waiting' || ctx.vars.live) return;
    const sc = scopeOf(run.excluded);
    const blq = App.seq('BLQ-2026-', 917);
    const nc = App.seq('NC-2026-', 418);
    const wall = App.now().getTime();
    const waitMs = Math.max(1000, wall - (run.proposalWall || wall));
    const decision = { status: 'approved', by: run.wf.approver, at: iso(run.t0 + run.p1Ms + waitMs), waitMs };
    App.audit('Bloqueo aprobado', `${blq} · ${sc.pallets} palés de ${sc.lots.length} lotes en ${chamber.code} · ${sc.ships.length} expediciones retenidas${sc.out.length ? ` · alcance editado (sin ${sc.out.map((l) => l.lot).join(', ')})` : ''}`, run.wf.approver);
    App.outcome('alarma', { status: 'approved', label: `Bloqueo ${blq} aprobado · ${sc.pallets} palés` });
    ctx.setLocal({ run: Object.assign({}, run, { status: 'applying', decision, blq, nc }) });
    ctx.vars.live = true;
    ctx.rerender();
    ctx.presenter({ next: 'Tras la aprobación: bloqueo en SAP QM, inmovilización en Easy WMS, no conformidad en Elara y aviso por Teams.' });
    const cur = ctx.local.run;
    const pre = p1Steps(cur).concat(decisionSteps(cur)).map((s) => Object.assign({}, s, { wait: 0 }));
    const steps = pre.concat(p2Steps(cur));
    paint(ctx, cur, steps, pre.length, pre.length);
    const stream = App.reasoningStream(ctx.$('#al-log'), steps, {
      title: `Registro · ${cur.id}`, signal: ctx.signal, maxHeight: 400, start: iso(cur.t0),
      minDelay: 0, maxDelay: 9000, speed: ctx.vars.fast ? 4 : 1,
      onStep: (s, k) => { if (k >= pre.length - 1) onStep(ctx, steps, s, k); }
    });
    scrollTo(ctx, '#al-exec');
    await stream.done;
    if (!ctx.alive()) return;
    finalizePhase2(ctx);
    ctx.vars.live = false;
    ctx.presenter(null);
    ctx.rerender();
    App.toast(`${blq} aplicado · ${nc} abierta · aviso enviado por Teams`, { tone: 'ok', icon: 'check-circle' });
    scrollTo(ctx, '#al-result');
  }

  async function reject(ctx) {
    const run = ctx.local.run;
    if (!run || run.status !== 'waiting' || ctx.vars.live) return;
    const reason = await App.promptText({
      title: 'Rechazar la propuesta de bloqueo',
      text: 'No se aplicará ninguna acción: ni bloqueo en SAP QM, ni inmovilización en Easy WMS, ni no conformidad en Elara, ni aviso por Teams. El motivo queda en el registro de auditoría.',
      label: 'Motivo del rechazo',
      required: true,
      confirmLabel: 'Rechazar propuesta'
    });
    if (reason == null || !ctx.alive()) return;
    const cur = ctx.local.run;
    if (!cur || cur.status !== 'waiting') return;
    const sc = scopeOf(cur.excluded);
    const wall = App.now().getTime();
    const waitMs = Math.max(1000, wall - (cur.proposalWall || wall));
    const decision = { status: 'rejected', by: cur.wf.approver, at: iso(cur.t0 + cur.p1Ms + waitMs), waitMs, reason };
    App.audit('Bloqueo rechazado', `Propuesta de ${sc.pallets} palés de ${sc.lots.length} lotes en ${chamber.code} · motivo: «${reason}» · no se aplica ninguna acción`, cur.wf.approver);
    App.outcome('alarma', { status: 'rejected', label: 'Bloqueo rechazado · sin acciones aplicadas' });
    ctx.setLocal({ run: Object.assign({}, cur, { status: 'rejected', decision, endAt: iso(cur.t0 + cur.p1Ms + waitMs + 40) }) });
    ctx.rerender();
    App.toast('Propuesta rechazada: no se ha aplicado ninguna acción', { tone: 'info', icon: 'x-circle' });
    scrollTo(ctx, '#al-result', 'center');
  }

  function editScope(ctx) {
    const run = ctx.local.run;
    if (!run || run.status !== 'waiting') return;
    const ex = new Set(run.excluded || []);
    const fid = App.uid('al-scope');
    App.modal({
      title: 'Editar alcance del bloqueo',
      kicker: `Bloqueo de calidad · cámara ${chamber.code}`,
      size: 'md',
      body: html`<p class="slate small mb-4">PNT-CAL-012 pide bloquear todos los palés expuestos. Si retiras un lote, indica el motivo: queda en el registro de auditoría y en el informe de incidencia.</p>
        <ul class="al-scope-edit">${LOTS.map((l) => html`<li>
          <label class="check"><input type="checkbox" data-scope-lot="${l.lot}" ${App.attrs({ checked: !ex.has(l.lot) })}><span class="code">${l.lot}</span></label>
          <span class="al-se-prod">${l.product}</span>
          <span class="al-se-num">${fmt.plural(l.pallets, 'palé', 'palés')} · calle ${l.lane}</span>
        </li>`)}</ul>
        <div class="field mt-4"><label class="label" for="${fid}">Motivo del cambio</label><textarea id="${fid}" class="textarea" rows="2" style="min-height:76px" placeholder="Explica por qué se retira el lote del bloqueo">${run.editReason || ''}</textarea><span class="hint" data-scope-hint>Obligatorio si retiras algún lote</span></div>`,
      actions: [
        { label: 'Cancelar', variant: 'secondary' },
        {
          label: 'Aplicar alcance',
          variant: 'primary',
          icon: 'check',
          onClick: (api) => {
            const excluded = Array.from(api.body.querySelectorAll('[data-scope-lot]')).filter((b) => !b.checked).map((b) => b.getAttribute('data-scope-lot'));
            const ta = api.body.querySelector('textarea');
            const reason = ta.value.trim();
            const hint = api.body.querySelector('[data-scope-hint]');
            const warn = (t) => { hint.textContent = t; hint.classList.add('t-crit'); };
            if (excluded.length === LOTS.length) { warn('Deja al menos un lote en el bloqueo o rechaza la propuesta.'); return false; }
            if (excluded.length && !reason) { warn('Escribe el motivo para retirar lotes del bloqueo.'); ta.focus(); return false; }
            applyScope(ctx, excluded, reason);
            return undefined;
          }
        }
      ]
    });
  }

  function applyScope(ctx, excluded, reason) {
    const run = ctx.local.run;
    if (!run || run.status !== 'waiting') return;
    const before = (run.excluded || []).slice().sort().join('|');
    const after = excluded.slice().sort().join('|');
    if (before === after && (!excluded.length || reason === run.editReason)) return;
    const sc = scopeOf(excluded);
    App.audit('Alcance del bloqueo editado', excluded.length
      ? `Se retira ${fmt.list(excluded)} (${fmt.plural(sc.exPallets, 'palé', 'palés')}) · nuevo alcance: ${sc.pallets} palés de ${sc.lots.length} lotes · motivo: «${reason}»`
      : `Alcance completo restaurado: ${sc.pallets} palés de ${sc.lots.length} lotes`, run.wf.approver);
    ctx.setLocal({ run: Object.assign({}, run, { excluded, editReason: excluded.length ? reason : '' }) });
    ctx.rerender();
    App.toast(`Alcance actualizado: ${sc.pallets} palés de ${sc.lots.length} lotes`, { tone: 'info', icon: 'edit' });
    scrollTo(ctx, '#al-approval', 'center');
  }

  function downloadCsv(ctx) {
    const run = ctx.local.run;
    if (!run) return;
    const stateLabel = { exposed: 'Expuesto', blocked: `Bloqueado (${run.blq || ''})`, out: 'Fuera del alcance', unblocked: 'Sin bloqueo' };
    App.downloadFile(`sscc-${chamber.code.toLowerCase()}-excursion-${D.meta.today}.csv`, 'text/csv', App.csv({
      rows: C07_PALLETS,
      cols: [
        { label: 'Lote', key: 'lot' },
        { label: 'Producto', value: (p) => LOT[p.lot].product },
        { label: 'Palé', value: (p) => `${p.n}/${p.of}` },
        { label: 'SSCC', value: (p) => `="${p.sscc}"` },
        { label: 'Kg', key: 'kg' },
        { label: 'Ubicación', value: (p) => `${chamber.code} · ${p.position}` },
        { label: 'Expedición planificada', key: 'planned_shipment' },
        { label: 'Estado', value: (p) => stateLabel[lotState(run, p.lot)] }
      ]
    }));
  }

  /* ---------------------------------------------------------------- Documentos controlados (W4) */

  const PRINT_STYLE = (code, rev) => App.raw(`<style>
@page{@top-right{content:"${code} · rev. ${rev}";font:500 8.5px Inter,system-ui,sans-serif;color:var(--muted)}@bottom-left{content:"Congelados de Navarra · Fustiñana · Documento generado por Prodigy · demostración con datos sintéticos";font:8.5px Inter,system-ui,sans-serif;color:var(--muted)}@bottom-right{content:"Página " counter(page) " de " counter(pages);font:600 8.5px Inter,system-ui,sans-serif;color:var(--muted)}}
.sec h2{break-after:avoid}
td .code{white-space:nowrap}
</style>`);

  function approvalsTable(rows) {
    return {
      cols: [{ label: 'Paso', key: 'step' }, { label: 'Rol', key: 'role' }, { label: 'Decisión', render: (r) => html`<span class="tag ${r.tone || ''}">${r.decision}</span>` }, { label: 'Fecha y hora', key: 'when' }],
      rows
    };
  }

  function openReport(ctx) {
    const run = ctx.local.run;
    if (!run || run.status !== 'done') return;
    const sc = scopeOf(run.excluded);
    const W = run.wf;
    const C = run.cond;
    const steps = stepsFor(run);
    const when = run.endAt;
    const propAt = iso(run.t0 + run.p1Ms);
    const ant = ANTECEDENT && ANT_LOT && sc.lots.includes(ANT_LOT);
    const sample = series.filter((p) => p.temp_c > C.threshold);
    let t = new Date(run.t0).getTime();
    const logRows = steps.map((s) => { const at = fmt.time(iso(t), true); t += Number(s.ms) || 0; return { at, agent: s.agent, system: s.system, action: s.action, result: s.result }; });
    App.printableReport({
      title: `Informe de incidencia · cámara ${chamber.code}`,
      subtitle: `Excursión de temperatura del ${fmt.dateLong(D.meta.today)} · workflow «${W.name}» ${W.version}${W.backup ? ' (respaldo)' : ''}`,
      code: REPORT_CODE,
      filename: `informe-incidencia-${chamber.code.toLowerCase()}-${D.meta.today}`,
      date: when,
      meta: [
        ['Revisión', '1'],
        ['Estado', html`<span class="tag ok">Aprobado</span>`],
        ['Planta', `${chamber.plant_name} (${chamber.plant})`],
        ['Bloqueo', run.blq],
        ['No conformidad', run.nc],
        ['Ejecución', run.id],
        ['Aprobado por', W.approver],
        ['Fecha de aprobación', fmt.date(run.decision.at, { time: true })]
      ],
      sections: [
        { html: PRINT_STYLE(REPORT_CODE, 1) },
        { heading: '1. Descripción del evento', text: `El ${fmt.date(exc.date)} a las ${exc.start}, SCADA Galileo emitió la alarma ${chamber.alarm_id} en la cámara ${chamber.code} (${chamber.name}, consigna ${fmt.temp(chamber.setpoint_c)}). La temperatura de aire (sonda ${chamber.sensor}) estuvo ${C.above} min por encima de ${fmt.temp(C.threshold)} (${C.start}–${C.end}), con un pico de ${fmt.temp(exc.peak)} a las ${exc.peak_time} y ${critMinOf(C)} min por encima de ${fmt.temp(critOf(C))}. A las ${chamber.current_time} la cámara estaba a ${fmt.temp(chamber.current_c)}.\n\nCriterio aplicado: PNT-CAL-012 (bloqueo de los palés expuestos si el aire supera ${fmt.temp(LIMIT)} durante más de ${MIN_HOLD} min) y PNT-CAL-015 (registro del bloqueo en SAP QM y Easy WMS; solo Calidad libera).` },
        { heading: '2. Lecturas por encima del límite', table: { cols: [{ label: 'Hora', key: 'time' }, { label: 'Aire', render: (p) => fmt.temp(p.temp_c), num: true }, { label: 'Estado', render: (p) => html`<span class="tag ${p.temp_c > critOf(C) ? 'crit' : 'warn'}">${p.temp_c > critOf(C) ? `Por encima de ${fmt.temp(critOf(C))}` : `Por encima de ${fmt.temp(C.threshold)}`}</span>` }], rows: sample } },
        { heading: '3. Eventos de la cámara', table: { cols: [{ label: 'Hora', render: (e) => `${e.time}${e.end ? `–${e.end}` : ''}` }, { label: 'Equipo o referencia', render: (e) => e.equipment || e.ref || '—' }, { label: 'Evento', render: (e) => fmt.text(e.text) }], rows: chamber.events } },
        { heading: '4. Alcance del bloqueo', table: { cols: [
          { label: 'Lote', render: (l) => html`<span class="code">${l.lot}</span>` },
          { label: 'Producto', key: 'product' },
          { label: 'Calle', key: 'lane', num: true },
          { label: 'Palés', key: 'pallets', num: true },
          { label: 'Kg', render: (l) => fmt.num(l.kg), num: true },
          { label: 'Expedición retenida', render: (l) => { const s = SHIP(l.planned_shipment); return `${s.id} · ${shipWhen(s)} · ${s.dock}`; } }
        ], rows: sc.lots } },
        sc.out.length ? { heading: '4 bis. Lotes retirados del alcance', text: `${fmt.list(sc.out.map((l) => `${l.lot} (${fmt.plural(l.pallets, 'palé', 'palés')})`))}. Motivo indicado por ${W.approver}: «${run.editReason}».` } : null,
        { heading: '5. Mismos lotes fuera de la cámara', table: { cols: [{ label: 'Ubicación', render: (s) => `${s.label}` }, { label: 'Lote', render: (s) => html`<span class="code">${s.lot}</span>` }, { label: 'Palés', key: 'pallets', num: true }, { label: 'Decisión', render: () => html`<span class="tag warn">A evaluar</span>` }], rows: sc.silos } },
        { heading: '6. Palés expedidos antes de la alarma (fuera del alcance)', table: { cols: [{ label: 'Expedición', render: (s) => html`<span class="code">${s.id}</span>` }, { label: 'Fecha', render: (s) => fmt.date(s.date, s.time) }, { label: 'Lote', render: (s) => html`<span class="code">${s.lot}</span>` }, { label: 'Palés', key: 'pallets', num: true }, { label: 'Cliente', key: 'customer' }], rows: SHIPPED } },
        { heading: '7. Acciones aplicadas tras la aprobación', list: [
          `SAP QM · ${run.blq}: bloqueo de calidad de ${sc.lots.length} lotes (${sc.pallets} palés, ${fmt.kg(sc.kg)}; ${fmt.eur(sc.value)} a coste estándar).`,
          `Mecalux Easy WMS: ${sc.pallets} SSCC inmovilizados; expediciones retenidas: ${sc.ships.map((s) => `${s.id} (${shipWhen(s)}, ${s.dock})`).join(', ')}.`,
          `Elara · ${run.nc}: no conformidad abierta con borrador de 8D (${REPORT_8D_CODE}).`,
          `Microsoft Teams: aviso a ${ROLE.dispatch_shift} y ${ROLE.refrigeration_maintenance} en el canal «${TEAMS_CHANNEL}».`
        ] },
        { heading: '8. Hipótesis de causa y acciones pendientes', text: `${fmt.text(chamber.probable_cause)}${ant ? `\n\nAntecedente en Elara: ${ANTECEDENT.id} (${fmt.date(ANTECEDENT.date)}), ${ANTECEDENT.description.toLowerCase()}; causa: ${ANTECEDENT.root_cause.toLowerCase()} (${ANTECEDENT.nc}, ${ANTECEDENT.status}). Relevante para decidir el destino de ${ANT_LOT.lot}.` : ''}`, list: PNT012.evaluation.concat([`Liberación o destino de cada lote: solo ${ROLE.quality_shift} o ${ROLE.quality_plant} (PNT-CAL-015).`]) },
        { heading: '9. Aprobaciones', table: approvalsTable([
          { step: 'Propuesta de bloqueo', role: 'Prodigy · agente Bloqueo de calidad', decision: 'Propuesto', tone: '', when: fmt.date(propAt, { time: true, seconds: true }) },
          { step: 'Aprobación del bloqueo', role: W.approver, decision: 'Aprobado', tone: 'ok', when: fmt.date(run.decision.at, { time: true, seconds: true }) },
          { step: 'Revisión del informe', role: ROLE.quality_plant, decision: 'Pendiente', tone: 'warn', when: '—' },
          { step: 'Destino de los lotes', role: ROLE.quality_shift, decision: 'Pendiente de evaluación', tone: 'warn', when: '—' }
        ]) },
        { heading: '10. Registro de la ejecución', table: { cols: [{ label: 'Hora', key: 'at' }, { label: 'Agente o rol', key: 'agent' }, { label: 'Sistema', key: 'system' }, { label: 'Acción', key: 'action' }, { label: 'Resultado', key: 'result' }], rows: logRows } },
        { heading: 'Nota', callout: `Ejecución ${run.id}: ${CALLS.auto} pasos automáticos y 1 aprobación, ${CALLS.total} llamadas (${CALLS.llm} al modelo de lenguaje), coste estimado ${fmt.usd(LLM_COST_USD)}. Documento sujeto a la revisión de Calidad; no sustituye la decisión de destino del producto.` }
      ].filter(Boolean),
      signatures: [{ role: W.approver, note: `Aprobado · ${fmt.date(run.decision.at, { time: true })}` }, { role: ROLE.quality_plant, note: 'Revisión pendiente' }],
      footer: `${REPORT_CODE} · revisión 1 · Documento generado por Prodigy el ${fmt.date(when, { time: true })} · demostración con datos sintéticos · preparado por Ciklum`
    });
  }

  function open8D(ctx) {
    const run = ctx.local.run;
    if (!run || run.status !== 'done') return;
    const items = d8Items(run);
    const drafted = run.endAt;
    App.printableReport({
      title: `Informe 8D · ${run.nc}`,
      subtitle: `No conformidad por excursión de temperatura en la cámara ${chamber.code} · borrador para revisión`,
      code: REPORT_8D_CODE,
      filename: `borrador-8d-${run.nc}`,
      date: drafted,
      meta: [
        ['Revisión', '0 (borrador)'],
        ['Estado', html`<span class="tag warn">Borrador</span>`],
        ['Planta', `${chamber.plant_name} (${chamber.plant})`],
        ['No conformidad', run.nc],
        ['Bloqueo asociado', run.blq],
        ['Informe de incidencia', REPORT_CODE],
        ['Origen', `Workflow «${run.wf.name}» ${run.wf.version}`],
        ['Redactado por', 'Prodigy · agente Incidencias']
      ],
      sections: [
        { html: PRINT_STYLE(REPORT_8D_CODE, 0) },
        { heading: 'Disciplinas D1–D8', table: { cols: [
          { label: 'D', render: (x) => html`<strong>${x.d}</strong>` },
          { label: 'Disciplina', key: 't' },
          { label: 'Contenido', key: 'text' },
          { label: 'Responsable', key: 'owner' },
          { label: 'Fecha objetivo', render: (x) => fmt.date(x.due) }
        ], rows: items } },
        { heading: 'Aprobaciones', table: approvalsTable([
          { step: 'Redacción del borrador', role: 'Prodigy · agente Incidencias', decision: 'Redactado', tone: '', when: fmt.date(drafted, { time: true, seconds: true }) },
          { step: 'Revisión', role: ROLE.quality_shift, decision: 'Pendiente', tone: 'warn', when: '—' },
          { step: 'Aprobación y cierre', role: ROLE.quality_plant, decision: 'Pendiente', tone: 'warn', when: '—' }
        ]) },
        { heading: 'Nota', callout: 'Borrador generado a partir de las evidencias de la ejecución. Las fechas objetivo son una propuesta: las confirma el equipo del 8D. La causa raíz es una hipótesis hasta que Mantenimiento frigorífico la confirme.' }
      ],
      signatures: [{ role: ROLE.quality_shift, note: 'Revisión' }, { role: ROLE.quality_plant, note: 'Aprobación' }],
      footer: `${REPORT_8D_CODE} · revisión 0 (borrador) · Documento generado por Prodigy el ${fmt.date(drafted, { time: true })} · demostración con datos sintéticos · preparado por Ciklum`
    });
  }

  /* ---------------------------------------------------------------- Presentador */

  function presenterSay(state) {
    const run = state.scenes && state.scenes.alarma && state.scenes.alarma.run;
    const wf = run ? run.wf : currentWorkflow();
    const base = [
      `Alarma de las ${exc.start} en la cámara ${chamber.code}: pico de ${fmt.temp(exc.peak)} a las ${exc.peak_time} y ${exc.minutes_above_limit} min por encima de ${fmt.temp(LIMIT)}. La primera expedición afectada sale a las ${FIRST.time}.`,
      wf.backup
        ? 'En esta sesión no se ha publicado el workflow, así que corre el de respaldo con los parámetros de PNT-CAL-012. La pantalla lo dice.'
        : `Ejecutamos el workflow «${wf.name}» que acabamos de publicar desde el procedimiento escrito: usa sus parámetros de verdad.`,
      'Cuatro agentes, cada uno con su sistema: Galileo para la temperatura; Easy WMS, SAP y Mapex para palés, lotes y expediciones; SAP QM para el bloqueo; Elara y Teams para la incidencia.'
    ];
    if (!run || run.status === 'running') return base;
    const sc = scopeOf(run.excluded);
    if (run.status === 'no-trigger') {
      return [`Con los parámetros del workflow (más de ${run.cond.minutes} min por encima de ${fmt.temp(run.cond.threshold)}), esta alarma no lo activa: ${run.cond.above} min. No se propone nada.`, 'Es la prueba de que el workflow usa sus parámetros de verdad.'];
    }
    if (run.status === 'waiting') {
      return [
        `Prodigy ha reunido la evidencia en ${fmt.ms(run.p1Ms)} y propone bloquear ${sc.pallets} palés de ${sc.lots.length} lotes y retener ${sc.ships.length} expediciones.`,
        `Los ${sc.silosTotal} palés de los mismos lotes en silos quedan «a evaluar»: no estuvieron en ${chamber.code}. Todavía no se ha escrito nada en SAP QM ni en Easy WMS.`,
        'Se puede editar el alcance (quitar un lote, con motivo) o rechazar: si se rechaza, no se aplica nada y queda en auditoría.'
      ];
    }
    if (run.status === 'rejected') {
      return ['Rechazado: no se ha bloqueado nada, ni en SAP QM ni en Easy WMS, y no hay no conformidad ni aviso. El motivo queda en el registro de auditoría.', 'La decisión es siempre de Calidad; se puede volver a ejecutar cuando se quiera.'];
    }
    if (run.status === 'applying') return [`Aprobado por ${run.decision.by}. Ahora los agentes escriben: SAP QM, Easy WMS, Elara y Teams.`];
    const total = (run.p1Ms || 0) + (run.p2Ms || 0) + run.decision.waitMs;
    return [
      `Aplicado tras la aprobación: ${run.blq} en SAP QM, ${sc.pallets} palés inmovilizados y ${sc.ships.length} expediciones retenidas en Easy WMS, ${run.nc} en Elara con el 8D en borrador y aviso por Teams.`,
      'El informe de incidencia sale como documento controlado: código, revisión, aprobaciones y registro de la ejecución, listo para una auditoría IFS o BRCGS.',
      `Comparación prudente: hoy entre 1 y 3 horas con varias personas; aquí ${fmt.ms(total)} medidos en la sesión. La línea base real se mide en el piloto.`
    ];
  }
  function presenterNext(state) {
    const run = state.scenes && state.scenes.alarma && state.scenes.alarma.run;
    if (!run) return 'Pulsar «Ejecutar workflow» y comentar la sala de agentes mientras corre.';
    switch (run.status) {
      case 'waiting': return 'Pulsar «Aprobar bloqueo». Opcional: «Editar alcance» para enseñar el control.';
      case 'applying': return 'Esperar a que termine la fase de aplicación.';
      case 'done': return 'Abrir «Descargar informe de incidencia» y después ir a «Reclamación UKC-44718» (flecha derecha).';
      case 'rejected': return '«Volver a ejecutar el workflow» para aprobarlo, o pasar a la reclamación (flecha derecha).';
      case 'no-trigger': return 'Ir a «De palabras a workflow», dejar 15 min y volver a ejecutar.';
      default: return 'Comentar la sala de agentes mientras corre; se detendrá en la aprobación.';
    }
  }

  /* ---------------------------------------------------------------- Registro de la escena */

  App.scene({
    id: 'alarma',
    order: 30,
    section: 'Automatización',
    nav: 'Alarma C-07',
    title: 'Alarma C-07 en ejecución',
    icon: 'thermometer',
    badge: (state) => {
      if (state.outcomes && state.outcomes.alarma) return null;
      const run = state.scenes && state.scenes.alarma && state.scenes.alarma.run;
      return run && run.status === 'waiting' ? { text: '1', tone: 'warn' } : { text: '1', tone: 'crit' };
    },
    presenter: { say: presenterSay, next: presenterNext },
    render(root, ctx) {
      if (ctx.local.run && ctx.local.run.status === 'running' && !ctx.vars.live) finalizePhase1(ctx);
      if (ctx.local.run && ctx.local.run.status === 'applying' && !ctx.vars.live) finalizePhase2(ctx);
      const run = ctx.local.run || null;
      const wf = run ? run.wf : currentWorkflow();
      const cond = run ? run.cond : condOf(wf);
      const live = !!ctx.vars.live;
      const steps = run && !live ? stepsFor(run) : [];
      const prog = live
        ? (run.status === 'applying' ? { done: p1Steps(run).length + decisionSteps(run).length, running: p1Steps(run).length + decisionSteps(run).length } : { done: 0, running: 0 })
        : progressFor(run, steps);
      const liveSteps = live ? (run.status === 'applying' ? p1Steps(run).concat(decisionSteps(run), p2Steps(run)) : (run.cond.met ? p1Steps(run) : noTrigSteps(run))) : steps;
      const traced = run && ['waiting', 'applying', 'done', 'rejected'].includes(run.status);
      root.innerHTML = String(html`
        ${head(run, wf)}
        ${kpis(wf, cond, run)}
        <div class="grid cols-5-7 section">${eventCard(wf, run)}${chartCard(wf, cond)}</div>
        <div class="section">${execCard(run, wf, liveSteps, prog)}</div>
        <div class="section" id="al-decision">${traced ? decisionRow(run) : ''}</div>
        ${run && run.status === 'done' ? html`<div class="section">${resultCard(run)}</div><div class="section">${comparisonCard(run)}</div>` : ''}
        ${run && run.status === 'rejected' ? html`<div class="section">${rejectedCard(run)}</div>` : ''}
        ${run && run.status === 'no-trigger' ? html`<div class="section">${noTriggerCard(run)}</div>` : ''}
      `);
      if (run && !live) {
        const log = ctx.$('#al-log');
        App.reasoningStream(log, steps, { title: `Registro · ${run.id}`, instant: true, start: iso(run.t0), maxHeight: 400 });
        const stateEl = log.querySelector('[data-rs-state]');
        const tweak = { waiting: chip('waiting'), rejected: chip('rejected', 'Detenido · rechazado'), 'no-trigger': chip('neutral', 'Detenido · sin disparo') }[run.status];
        if (stateEl && tweak) stateEl.innerHTML = String(tweak);
      }
      ctx.on('click', '[data-action="execute"]', () => execute(ctx));
      ctx.on('click', '[data-approval="approve"]', () => approve(ctx));
      ctx.on('click', '[data-approval="reject"]', () => reject(ctx));
      ctx.on('click', '[data-approval="edit"]', () => editScope(ctx));
      ctx.on('click', '[data-action="report"]', () => openReport(ctx));
      ctx.on('click', '[data-action="report-8d"]', () => open8D(ctx));
      ctx.on('click', '[data-action="csv"]', () => downloadCsv(ctx));
      ctx.on('click', '[data-action="scroll-approval"]', () => scrollTo(ctx, '#al-approval', 'center'));
      ctx.on('click', '[data-rs="fast"]', () => { ctx.vars.fast = true; });
    },
    onLeave(ctx) {
      const run = ctx.local.run;
      if (!run) return;
      if (run.status === 'running') finalizePhase1(ctx);
      else if (run.status === 'applying') finalizePhase2(ctx);
    }
  });
})();
