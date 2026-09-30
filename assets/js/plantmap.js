/*
 * Plano de planta de Fustiñana · componente App.plantMap(opts)  (SPEC-v2-wow §W1)
 *
 * Esquema 2D tipo HMI, de izquierda a derecha: recepción de campo → líneas L1–L5 (columnas por etapa:
 * entrada, preparación, escaldado, túnel IQF, óptica, envasado, detector de metales) → almacén automático
 * Mecalux (SIL-1…SIL-4, −25 °C) → cámaras de expedición → muelles de carga. Aparte: laboratorio y
 * servicios (sala de máquinas NH3, calderas). Todo sale de window.CN_DATA:
 *   - estado de los 11 equipos del parte diario (CN_DATA.machines; DM-1 marcado como PCC);
 *   - resto de equipos de cada línea (CN_DATA.equipment) sin indicador; los compartidos entre líneas
 *     (TUN-2 y ENV-3 en L3) salen de las rutas de los lotes;
 *   - C-07 en crítico mientras la alarma de la excursión siga sin decisión (App.outcome('alarma'));
 *   - palés de los lotes de C-07 en silos y expediciones planificadas por muelle (CN_DATA.lots, shipments);
 *   - órdenes abiertas (open_work_order de machines y mantenimiento de las trazas).
 *   C-06, C-08 y los silos no están en data.js: sus lecturas vienen de _mfr/cn_demo/world.yaml (chambers).
 *
 * Uso:
 *   const el = App.plantMap({ variant: 'full' });       // HTMLElement autónomo (tooltip, panel y eventos propios)
 *   host.replaceChildren(el);
 *
 * Opciones:
 *   variant       'full' (plano completo, por defecto) | 'mini' (cadena de frío: producción → silos → cámaras → muelles)
 *   selected      código seleccionado al pintar ('C-07', 'DM-1', 'SIL-3', 'M2', 'L1', 'LAB'…)
 *   filter        'all' | 'alerts' | 'cold' | 'c07' (palés de los lotes de C-07)
 *   pallets       true: marca los palés de los lotes de C-07 (por defecto en 'mini')
 *   tickets       { 'DM-1': { id, kind: 'new'|'update', priority, owner } } (p. ej. plan.byEquipment del parte diario)
 *   alarm         'open' | 'approved' | 'rejected' (por defecto se deduce de App.outcome('alarma'))
 *   panel         true | false  (panel de detalle al pulsar; por defecto true en 'full', false en 'mini')
 *   toolbar       true | false  (leyenda y filtro; por defecto true)
 *   panelActions  (item) => html`…botones…`  (acciones extra en el pie del panel)
 *   onSelect      (code|null, item) => {}      onFilter (value) => {}
 *
 * API del elemento devuelto (el.plantMap): select(code|null), setFilter(value), update(opts), item(code),
 * items(), refresh(), destroy().
 * Eventos: 'plantselect' {code} y 'plantfilter' {value} (burbujean desde el elemento).
 */
(function () {
  'use strict';

  if (!window.App) return;
  const App = window.App;
  const { html, raw, esc, icon, fmt, chip, sys } = App;
  const D = window.CN_DATA || {};
  const NBSP = '\u00A0';
  const READ_TIME = '06:00'; // hora de las lecturas del parte diario (la misma que usa la escena «turno»)

  /* Cámaras y silos de Fustiñana que data.js no exporta (world.yaml → chambers). C-07 sale de CN_DATA.chamber_c07. */
  const WORLD_CHAMBERS = {
    'C-06': { name: 'Cámara de expedición 6', setpoint_c: -22, limit_c: -18, critical_c: -15, capacity_pallets: 240, current_c: -22.3 },
    'C-08': { name: 'Cámara de expedición 8', setpoint_c: -22, limit_c: -18, critical_c: -15, capacity_pallets: 240, current_c: -21.8 },
    'SIL-1': { name: 'Silo automático 1', setpoint_c: -25, limit_c: -18, critical_c: -15, capacity_pallets: 27000, current_c: -25.2 },
    'SIL-2': { name: 'Silo automático 2', setpoint_c: -25, limit_c: -18, critical_c: -15, capacity_pallets: 34000, current_c: -24.9 },
    'SIL-3': { name: 'Silo automático 3', setpoint_c: -25, limit_c: -18, critical_c: -15, capacity_pallets: 83000, current_c: -23.9, evaporator: 'EV-SIL3' },
    'SIL-4': { name: 'Silo automático 4', setpoint_c: -25, limit_c: -18, critical_c: -15, capacity_pallets: 16000, current_c: -25.1 }
  };
  const SILOS = ['SIL-1', 'SIL-2', 'SIL-3', 'SIL-4'];
  const CHAMBERS = ['C-06', 'C-07', 'C-08'];
  const DOCKS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];
  const LINES = ['L1', 'L2', 'L3', 'L4', 'L5'];
  const COLS = ['Entrada', 'Preparación', 'Escaldado', 'Túnel IQF', 'Óptica', 'Envasado', 'Det. metales'];
  const TYPE_COL = {
    desgranadora: 0, limpiadora: 0, volcador: 0, dosificadora: 0,
    lavadora: 1, despedregadora: 1, cortadora: 1, criba: 1, mezcladora: 1,
    escaldador: 2, tunel_iqf: 3, optica: 4, envasadora: 5, detector_metales: 6
  };
  const BOX_LABEL = {
    desgranadora: ['desgranadora', 'desgran.'], lavadora: ['lavadora', 'lavado'], limpiadora: ['limpieza'], despedregadora: ['despedregadora', 'despedreg.'],
    cortadora: ['cortadora', 'corte'], criba: ['criba'], volcador: ['volcador'], dosificadora: ['dosificación', 'dosific.'], mezcladora: ['mezcladora', 'mezcla'],
    escaldador: ['escaldador', 'escald.'], tunel_iqf: ['túnel IQF', 'túnel'], optica: ['óptica'], envasadora: ['envasado', 'envas.'], detector_metales: ['detector', 'det.'],
    compresor_nh3: ['compresor'], evaporador: ['evaporador'], puerta_rapida: ['puerta'], caldera: ['caldera']
  };
  const EVENT_SHORT = { desescarche: 'Desescarche', puerta: 'Puerta abierta' };
  const COLD_TYPES = new Set(['tunel_iqf', 'compresor_nh3', 'evaporador', 'puerta_rapida']);
  const STATUS_LABEL = { critical: 'Crítico', warning: 'Aviso', ok: 'En rango', none: 'Sin indicador', info: 'Planificada', blocked: 'Bloqueo de calidad' };
  const STATUS_TONE = { critical: 'crit', warning: 'warn', ok: 'ok', none: 'neutral', info: 'info', blocked: 'crit' };
  const FILTERS = [
    { value: 'all', label: 'Todo' },
    { value: 'alerts', label: 'Alertas', tone: 'crit' },
    { value: 'cold', label: 'Cadena de frío', icon: 'snowflake' },
    { value: 'c07', label: 'Palés de C-07', icon: 'pallet' }
  ];

  /* ================================================================ Utilidades */

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = (n) => Math.round(n * 10) / 10;
  const byCode = (arr) => Object.fromEntries((arr || []).map((m) => [m.code, m]));
  function textW(s, size, weight) { return App.textWidth ? App.textWidth(String(s), size, weight) : String(s).length * size * 0.56; }
  function monoW(s, size) { return String(s).length * size * 0.62; }
  function fit(candidates, maxW, size, weight, mono) {
    for (const c of candidates) {
      if (c == null || c === '') continue;
      if ((mono ? monoW(c, size) : textW(c, size, weight)) <= maxW) return c;
    }
    return '';
  }
  function unitShort(u) { return String(u || '').replace(/ (aire|agua|rechazo|RMS)$/, ''); }
  function valText(v, unit) {
    const u = unitShort(unit);
    return u === '%' ? fmt.pct(v) : `${fmt.num(v)}${NBSP}${u}`;
  }
  function dockCode(label) { const m = String(label || '').match(/(\d+)/); return m ? `M${m[1]}` : null; }
  function customerName(id) { const c = (D.customers || {})[id]; return c ? c.label : (id || '—'); }
  function alarmState() {
    const out = App.outcome ? App.outcome('alarma') : null;
    if (!out) return 'open';
    return out.status === 'approved' ? 'approved' : 'rejected';
  }
  function lineProduct(code) {
    const m = (D.machines || []).find((x) => x.line === code && /\(([^)]+)\)/.test(x.area || ''));
    const src = m ? m.area : ((D.lines || {})[code] || {}).name || '';
    const p = (String(src).match(/\(([^)]+)\)/) || [])[1] || '';
    return p.replace(/ desde granel$/, '').replace(/, salida de envasado$/, '');
  }

  /* ================================================================ Modelo */

  function openOrders() {
    const out = {};
    const push = (code, o) => { const l = (out[code] = out[code] || []); if (!l.some((x) => x.id === o.id)) l.push(o); };
    (D.machines || []).forEach((m) => { if (m.open_work_order) push(m.code, { id: m.open_work_order, date: null, status: 'abierta', text: String(m.note || '').split(';')[0] }); });
    Object.values(D.lots || {}).forEach((l) => ((l.back && l.back.maintenance) || []).forEach((mt) => {
      push(mt.equipment, { id: mt.work_order, date: mt.date, status: mt.status, text: mt.text });
    }));
    return out;
  }

  /* Palés de los lotes que estaban en C-07 durante la excursión: dónde están y qué expediciones los llevan. */
  function palletPlan() {
    const lots = D.lots_in_c07 || [];
    const c07 = { pallets: lots.reduce((s, l) => s + l.pallets, 0), kg: lots.reduce((s, l) => s + l.kg, 0), lots };
    const silos = {};
    lots.forEach((l) => {
      const f = (D.lots[l.lot] || {}).forward || {};
      (f.by_location || []).forEach((b) => {
        if (b.location === (D.chamber_c07 || {}).code) return;
        (silos[b.location] = silos[b.location] || []).push({ lot: l.lot, product: l.product, pallets: b.pallets });
      });
    });
    const docks = {};
    lots.forEach((l) => {
      const s = (D.shipments || {})[l.planned_shipment];
      const m = s && dockCode(s.dock);
      if (!m) return;
      const d = (docks[m] = docks[m] || { shipment: l.planned_shipment, date: s.date, time: s.time, customer: customerName(s.customer), transport: s.transport, lots: [] });
      d.lots.push({ lot: l.lot, product: l.product, pallets: l.pallets, lane: l.lane });
    });
    const inSilos = Object.values(silos).reduce((s, arr) => s + arr.reduce((a, b) => a + b.pallets, 0), 0);
    return { c07, silos, docks, inSilos };
  }

  /* Lotes (de las trazas disponibles) con palés en un silo, y granel de origen almacenado allí. */
  function siloLots(code) {
    const out = [];
    Object.entries(D.lots || {}).forEach(([lot, l]) => {
      ((l.forward && l.forward.by_location) || []).forEach((b) => { if (b.location === code) out.push({ lot, product: (l.info || {}).product || l.forward.product, pallets: b.pallets }); });
    });
    const bulk = [];
    Object.entries(D.lots || {}).forEach(([lot, l]) => {
      const o = (l.info || {}).origin || {};
      if (o.bulk_storage === code && o.bulk_lot && !bulk.some((b) => b.bulk === o.bulk_lot)) bulk.push({ bulk: o.bulk_lot, lot, line: o.bulk_line, date: o.bulk_date });
    });
    return { lots: out, bulk };
  }

  function sourcesFor(type, code) {
    if (code === 'DM-1' || type === 'detector_metales') return ['MES Mapex', 'Elara'];
    if (COLD_TYPES.has(type)) return ['SCADA Galileo'];
    return ['MES Mapex'];
  }
  function refLabel(metric) {
    if (metric === 'hours_since_verification') return 'Máximo';
    if (/temp|pressure|chlorine/.test(metric)) return 'Consigna';
    return 'Referencia';
  }
  function limitsText(m) {
    const t = (D.thresholds || {})[m.metric];
    if (!t) return '';
    const u = unitShort(m.unit);
    const n = (v) => fmt.num(Math.round(v * 1000) / 1000);
    if (t.direction === 'high') return `aviso > ${n(t.warning_abs)} · crítico > ${n(t.critical_abs)}${NBSP}${u}`;
    if (t.direction === 'both') return `aviso ±${n(t.warning_abs_delta)} · crítico ±${n(t.critical_abs_delta)}${NBSP}${u}`;
    if (t.direction === 'low') return `aviso < ${n(m.baseline * t.warning)} · crítico < ${n(m.baseline * t.critical)}${NBSP}${u}`;
    return '';
  }

  function buildModel(o) {
    const items = {};
    const add = (it) => { items[it.code] = Object.assign({ status: 'none', related: [], orders: [], sources: [] }, it); return items[it.code]; };
    const M = byCode(D.machines);
    const EQ = D.equipment || {};
    const orders = openOrders();
    const tickets = o.tickets || {};
    const alarm = o.alarm || alarmState();
    const pp = palletPlan();
    const ch = D.chamber_c07 || {};
    const exc = D.excursion_c07 || {};
    const out = App.outcome ? App.outcome('alarma') : null;

    /* Equipos de proceso y servicios */
    Object.entries(EQ).forEach(([code, e]) => {
      if (e.plant !== 'FUS') return;
      const m = M[code];
      const base = { code, name: e.name, short: e.short, type: e.type, line: e.line, orders: orders[code] || [], ticket: tickets[code] || null };
      if (m) {
        const u = unitShort(m.unit);
        Object.assign(base, {
          kind: 'machine', status: m.status || 'ok', pcc: !!m.ccp, area: m.area, metric: m.metric, metricLabel: m.metric_label,
          value: valText(m.reading, m.unit), valueShort: `${fmt.num(m.reading)}${u === '%' ? NBSP + '%' : u === 'paradas/h' ? NBSP + 'par./h' : u === '°C' ? NBSP + '°C' : ''}`, valueMin: fmt.num(m.reading),
          ref: { label: refLabel(m.metric), text: valText(m.baseline, m.unit) }, limits: limitsText(m),
          note: m.note ? fmt.text(m.note) : '', sources: sourcesFor(m.type, code), reading: m.reading, baseline: m.baseline, unit: u
        });
      } else {
        Object.assign(base, { kind: 'equip', status: 'none', area: ((D.lines || {})[e.line] || {}).name || '', sources: COLD_TYPES.has(e.type) ? ['SCADA Galileo'] : ['MES Mapex'] });
      }
      add(base);
    });
    (D.machines || []).forEach((m) => { if (!items[m.code]) add({ code: m.code, kind: 'machine', name: m.name, type: m.type, line: m.line, status: m.status || 'ok' }); });

    /* Última intervención conocida */
    Object.values(items).forEach((it) => {
      const m = M[it.code];
      const last = [];
      if (m && m.metric === 'hours_since_verification') {
        const t = (String(m.note || '').match(/\((\d{2}:\d{2})\)/) || [])[1];
        if (t) last.push(`Última verificación correcta con probetas a las ${t}`);
      }
      if (m && m.metric === 'hours_since_defrost') last.push(`Último desescarche hace ${fmt.num(m.reading)}${NBSP}h (lectura de las ${READ_TIME})`);
      it.orders.forEach((od) => last.push(`${od.id}${od.date ? ` · ${fmt.date(od.date)}` : ''} · ${fmt.cap(fmt.text(od.text))} (${od.status})`));
      it.last = last;
    });

    /* Relaciones que cruzan sistemas (todas deducidas de notas y trazas de CN_DATA) */
    const rel = (a, b, label, tone) => { if (items[a] && items[b] && !items[a].related.some((r) => r.code === b)) items[a].related.push({ code: b, label, tone: tone || null }); };
    (D.machines || []).forEach((m) => {
      (String(m.note || '').match(/\b[A-Z][A-Z0-9]{1,3}-[A-Z0-9]{1,4}\b/g) || []).forEach((c) => {
        if (c === m.code || !items[c]) return;
        const od = (orders[c] || [])[0];
        const other = M[c];
        const label = od ? `${od.id} abierta desde el ${fmt.date(od.date)}`
          : other ? `${fmt.cap(other.metric_label)} ${valText(other.reading, other.unit)} · ${(STATUS_LABEL[other.status || 'ok'] || '').toLowerCase()}`
            : 'Citado en la observación del parte';
        rel(m.code, c, label, od ? 'warn' : other ? STATUS_TONE[other.status || 'ok'] : null);
        rel(c, m.code, `${fmt.cap(m.metric_label)}: ${valText(m.reading, m.unit)}`, STATUS_TONE[m.status || 'ok']);
      });
    });
    const esc3 = M['ESC-3'];
    const cal = M['CAL-B1'];
    if (esc3 && cal) rel('ESC-3', 'CAL-B1', `Vapor a ${valText(cal.reading, cal.unit)}: en rango, causa probable local`, 'ok');
    const dm1 = M['DM-1'];
    if (dm1) {
      const t = (String(dm1.note || '').match(/\((\d{2}:\d{2})\)/) || [])[1];
      const withDm = Object.values(D.lots || {}).map((l) => (l.info || {}).route || []).find((r) => r.indexOf('DM-1') > 0);
      const pack = withDm ? withDm[withDm.indexOf('DM-1') - 1] : null;
      if (pack && items[pack]) rel('DM-1', pack, t ? `Producto envasado desde las ${t}: retención a decidir por Calidad` : 'Envasado previo al detector', 'warn');
    }

    /* Recepción, laboratorio */
    const camp = D.campaign || {};
    add({ code: 'BAS', kind: 'area', zone: 'recepcion', name: 'Básculas de entrada', short: 'pesaje y tarjeta del remolque', sources: ['SAP'] });
    ['R1', 'R2', 'R3'].forEach((r) => add({ code: r, kind: 'area', zone: 'recepcion', name: `Muelle de recepción ${r}`, short: 'descarga de remolques de campo', sources: ['SAP'] }));
    add({ code: 'TLV', kind: 'area', zone: 'recepcion', name: 'Tolvas de recepción', short: 'alimentación de las líneas L1–L3', sources: ['MES Mapex'] });
    add({ code: 'LAB', kind: 'area', zone: 'laboratorio', name: 'Laboratorio de Calidad', short: 'ensayos de recepción, proceso y producto', sources: ['Elara'] });
    if (items['TUN-1'] && camp.tunnels && camp.tunnels['TUN-1'] && camp.tunnels['TUN-1'].note) rel('TUN-1', 'TLV', `Recepción del ${fmt.dayMonth(camp.date)}: ${fmt.text(camp.tunnels['TUN-1'].note).replace(/^En aviso en el parte de hoy \([^)]*\): /, '')}`, 'warn');
    if (dm1) rel('DM-1', 'LAB', 'Verificación con probetas (PCC · PNT-CAL-031)', 'brand');
    if (esc3) rel('ESC-3', 'LAB', 'Ensayo de peroxidasa recomendado en el parte', 'brand');

    /* Líneas */
    LINES.forEach((l) => {
      const inLine = Object.values(items).filter((it) => it.line === l && (it.kind === 'machine' || it.kind === 'equip'));
      add({ code: l, kind: 'line', name: ((D.lines || {})[l] || {}).name || `Línea ${l}`, product: lineProduct(l), members: inLine.map((x) => x.code) });
    });

    /* Cámaras */
    CHAMBERS.forEach((c) => {
      if (c === ch.code) {
        const st = alarm === 'open' ? 'critical' : alarm === 'approved' ? 'blocked' : 'warning';
        add({
          code: c, kind: 'chamber', name: `${ch.name} · ${c}`, short: 'cámara de expedición', status: st, pulse: alarm === 'open',
          statusLabel: alarm === 'open' ? 'Alarma sin decisión' : alarm === 'approved' ? 'Bloqueo de calidad' : 'Revisada sin bloqueo',
          outcome: out, reading: ch.current_c, value: fmt.temp(ch.current_c), time: ch.current_time, setpoint: ch.setpoint_c, limit: ch.limit_c, critical: ch.critical_c,
          capacity: ch.capacity_pallets, sensor: ch.sensor, alarmId: ch.alarm_id, exc, events: ch.events || [], cause: ch.probable_cause,
          pallets: pp.c07.pallets, kg: pp.c07.kg, lots: pp.c07.lots, sources: ['SCADA Galileo', 'Mecalux Easy WMS']
        });
        return;
      }
      const w = WORLD_CHAMBERS[c];
      if (!w) return;
      const st = w.current_c > w.critical_c ? 'critical' : w.current_c > w.limit_c ? 'warning' : 'ok';
      add({ code: c, kind: 'chamber', name: `${w.name} · ${c}`, short: 'cámara de expedición', status: st, reading: w.current_c, value: fmt.temp(w.current_c), time: ch.current_time, setpoint: w.setpoint_c, limit: w.limit_c, critical: w.critical_c, capacity: w.capacity_pallets, sources: ['SCADA Galileo'] });
    });
    const evSt = (e) => (ch.events || []).filter((x) => x.equipment === e);
    const chArea = `${ch.name} · ${ch.code}`;
    if (items['EV-07']) Object.assign(items['EV-07'], { zone: 'camaras', parent: ch.code, area: chArea, events: evSt('EV-07') });
    if (items['P-07']) {
      const doorEv = evSt('P-07');
      Object.assign(items['P-07'], { zone: 'camaras', parent: ch.code, area: chArea, events: doorEv, status: doorEv.some((e) => e.type === 'puerta') ? 'warning' : 'none', statusLabel: 'Revisar cierre' });
    }
    if (items[ch.code]) {
      const defrost = evSt('EV-07').find((e) => e.type === 'desescarche');
      if (defrost) rel(ch.code, 'EV-07', `Desescarche programado ${defrost.time}–${defrost.end}`, 'brand');
      const door = evSt('P-07');
      if (door.length) rel(ch.code, 'P-07', `Sensor de puerta abierta ${door[0].time}–${door[0].end || ''}`.replace(/–$/, ''), 'warn');
      rel('EV-07', ch.code, 'Evaporador de la cámara', STATUS_TONE[items[ch.code].status]);
      rel('P-07', ch.code, 'Puerta rápida de la cámara', STATUS_TONE[items[ch.code].status]);
    }

    /* Silos */
    SILOS.forEach((s) => {
      const w = WORLD_CHAMBERS[s];
      if (!w) return;
      const st = w.current_c > w.critical_c ? 'critical' : w.current_c > w.limit_c ? 'warning' : 'ok';
      add({ code: s, kind: 'silo', name: `${w.name} · ${s}`, short: 'almacén automático', status: st, reading: w.current_c, value: fmt.temp(w.current_c), time: ch.current_time, setpoint: w.setpoint_c, limit: w.limit_c, capacity: w.capacity_pallets, evaporator: w.evaporator || null, stock: siloLots(s), c07: pp.silos[s] || [], sources: ['SCADA Galileo', 'Mecalux Easy WMS'] });
      if (w.evaporator && items[w.evaporator]) {
        Object.assign(items[w.evaporator], { zone: 'almacen', parent: s });
        rel(s, w.evaporator, `${items[w.evaporator].value || ''} desde el último desescarche`.trim(), STATUS_TONE[items[w.evaporator].status]);
        rel(w.evaporator, s, `Silo a ${fmt.temp(w.current_c)} (consigna ${fmt.temp(w.setpoint_c)}): dentro de límites`, 'ok');
      }
      if ((pp.silos[s] || []).length && items[ch.code]) {
        const n = pp.silos[s].reduce((a, b) => a + b.pallets, 0);
        rel(ch.code, s, `${fmt.plural(n, 'palé', 'palés')} de los mismos lotes · a evaluar`, 'warn');
        rel(s, ch.code, `${fmt.plural(n, 'palé', 'palés')} de lotes expuestos en ${ch.code}`, STATUS_TONE[items[ch.code].status]);
      }
    });

    /* Muelles */
    const planned = {};
    Object.entries(D.shipments || {}).forEach(([id, s]) => {
      const m = dockCode(s.dock);
      if (!m || s.status !== 'planificada') return;
      (planned[m] = planned[m] || []).push(Object.assign({ id }, s));
    });
    DOCKS.forEach((d) => {
      const list = (planned[d] || []).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
      const next = list[0] || null;
      const c07 = pp.docks[d] || null;
      let st = next ? 'info' : 'none';
      let label = next ? 'Expedición planificada' : 'Sin expedición asignada';
      if (c07 && alarm !== 'rejected') { st = 'warning'; label = alarm === 'approved' ? 'Palés bloqueados: replanificar la carga' : 'Palés de C-07 pendientes de decisión'; }
      add({ code: d, kind: 'dock', name: `Muelle de carga ${d.slice(1)} · ${d}`, short: 'muelle de carga', status: st, statusLabel: label, next, c07, sources: ['SAP', 'Mecalux Easy WMS'] });
      if (c07 && items[ch.code]) {
        const n = c07.lots.reduce((a, b) => a + b.pallets, 0);
        rel(ch.code, d, `${c07.shipment} · ${c07.date !== (D.meta || {}).today ? fmt.dayMonth(c07.date) + ' ' : ''}${c07.time} · ${fmt.plural(n, 'palé', 'palés')}`, STATUS_TONE[items[d].status]);
        rel(d, ch.code, `${fmt.plural(n, 'palé', 'palés')} en ${ch.code} (calle ${fmt.list(c07.lots.map((x) => String(x.lane)))})`, STATUS_TONE[items[ch.code].status]);
      }
    });

    /* Referencias fantasma: equipos que una línea usa pero pertenecen a otra (rutas de los lotes) */
    const ghosts = {};
    Object.values(D.lots || {}).forEach((l) => {
      const i = l.info || {};
      if (i.plant !== 'FUS' || !LINES.includes(i.line)) return;
      (i.route || []).forEach((c) => {
        const e = EQ[c];
        if (e && e.line !== i.line && LINES.includes(e.line)) {
          const g = (ghosts[i.line] = ghosts[i.line] || []);
          if (!g.includes(c)) g.push(c);
        }
      });
    });

    return { items, ghosts, pallets: pp, alarm, today: (D.meta || {}).today };
  }

  /* ================================================================ SVG · piezas */

  function svgIcon(name, x, y, size, cls) {
    return `<g class="pm-ico${cls ? ' ' + cls : ''}" transform="translate(${r1(x)} ${r1(y)})">${String(icon(name, { size, stroke: 1.75 }))}</g>`;
  }
  function t(x, y, text, cls, anchor) {
    return `<text class="${cls}" x="${r1(x)}" y="${r1(y)}"${anchor ? ` text-anchor="${anchor}"` : ''}>${esc(text)}</text>`;
  }
  function stateCls(code, st) {
    const c = [];
    if (st.selected === code) c.push('is-selected');
    if (st.related.has(code)) c.push('is-related', `rel-${st.related.get(code) || 'brand'}`);
    if (st.dim(code)) c.push('is-dim');
    return c.join(' ');
  }
  function aria(it) {
    const s = it.statusLabel || STATUS_LABEL[it.status] || '';
    const v = it.value ? ` · ${it.value}` : '';
    return `${it.name}${s ? ' · ' + s : ''}${v}`;
  }
  function itemOpen(it, st, extra) {
    return `<g class="pm-item pm-k-${it.kind} pm-s-${it.status}${it.pcc ? ' pm-pcc' : ''}${extra ? ' ' + extra : ''} ${stateCls(it.code, st)}" data-pm="${esc(it.code)}" tabindex="0" role="button" aria-label="${esc(aria(it))}">`;
  }
  function ring(x, y, w, h, rx) {
    return `<rect class="pm-ring" x="${r1(x - 4)}" y="${r1(y - 4)}" width="${r1(w + 8)}" height="${r1(h + 8)}" rx="${rx + 3}"/>`;
  }
  function pulseRect(x, y, w, h, rx) {
    return `<rect class="pm-pulse" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${rx}" style="--pm-sx:${(1 + 12 / w).toFixed(3)};--pm-sy:${(1 + 12 / h).toFixed(3)}"/>`;
  }
  function statusBar(x, y, h) { return `<rect class="pm-bar" x="${r1(x + 2)}" y="${r1(y + 5)}" width="3" height="${r1(Math.max(6, h - 10))}" rx="1.5"/>`; }
  function badgeOrder(x, y) {
    return `<g class="pm-badge-ot"><circle cx="${r1(x)}" cy="${r1(y)}" r="8"/>${svgIcon('wrench', x - 5.5, y - 5.5, 11)}</g>`;
  }
  function pccTag(x, y) {
    return `<g class="pm-pcc-tag"><rect x="${r1(x)}" y="${r1(y)}" width="26" height="13" rx="3"/><text x="${r1(x + 13)}" y="${r1(y + 9.6)}" text-anchor="middle">PCC</text></g>`;
  }
  function countPill(x, y, text, tone, anchor) {
    const w = Math.ceil(textW(text, 10, 600)) + 12;
    const x0 = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
    return `<g class="pm-pill pm-pill-${tone}"><rect x="${r1(x0)}" y="${r1(y)}" width="${w}" height="16" rx="8"/><text x="${r1(x0 + w / 2)}" y="${r1(y + 11.4)}" text-anchor="middle">${esc(text)}</text></g>`;
  }

  /* Caja de equipo (máquina o equipo sin indicador) */
  function eqBox(it, x, y, w, h, st, o) {
    const opt = o || {};
    const inner = w - 12;
    const narrow = w < 66;
    const codeSize = h < 24 ? 9.5 : 11;
    const parts = [itemOpen(it, st, opt.ghost ? 'pm-ghost' : '')];
    parts.push(`<rect class="pm-hit" x="${r1(x - 3)}" y="${r1(y - 3)}" width="${r1(w + 6)}" height="${r1(h + 6)}" rx="6"/>`);
    if (it.pulse && !opt.ghost) parts.push(pulseRect(x, y, w, h, 5));
    parts.push(`<rect class="pm-box" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="5"/>`);
    if (!opt.ghost && it.status !== 'none') parts.push(statusBar(x, y, h));
    const code = fit([it.code], inner + 2, codeSize, 600, true) || it.code;
    if (h < 24) {
      parts.push(t(x + w / 2, y + h / 2 + 3.4, code, 'pm-code pm-code-sm', 'middle'));
    } else {
      parts.push(t(x + 9, y + 15, code, 'pm-code'));
      let sub = '';
      if (opt.ghost) sub = fit(['compartido', `de ${it.line}`], inner + 2, 9.5, 500);
      else if (it.kind === 'machine') sub = fit([it.value, it.valueShort, it.valueMin], inner, narrow ? 10 : 10.5, 600);
      else sub = fit(BOX_LABEL[it.type] || [it.short, String(it.short || '').split(/[ /]/)[0]], inner + 3, 9.5, 500);
      if (sub) parts.push(t(x + 9, y + 29, sub, it.kind === 'machine' && !opt.ghost ? `pm-val${narrow ? ' pm-val-sm' : ''}` : 'pm-sub'));
    }
    if (!opt.ghost && it.pcc) parts.push(pccTag(x + 6, y - 7));
    if (!opt.ghost && (it.orders.length || it.ticket)) parts.push(badgeOrder(x + w - 2, y + 1));
    if (st.selected === it.code) parts.push(ring(x, y, w, h, 5));
    parts.push('</g>');
    return parts.join('');
  }

  function lineTag(it, x, y, w, h, st, showProduct) {
    const alerts = it.members.filter((c) => st.model.items[c] && /critical|warning/.test(st.model.items[c].status)).length;
    const parts = [itemOpen(it, st, alerts ? 'has-alerts' : '')];
    parts.push(`<rect class="pm-tag" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="5"/>`);
    const prod = showProduct && it.product ? fit([it.product, it.product.split(/[ /]/)[0]], w - 4, 9, 500) : '';
    if (prod) {
      parts.push(t(x + w / 2, y + 16, it.code, 'pm-tag-t', 'middle'));
      parts.push(t(x + w / 2, y + 29, prod, 'pm-tag-s', 'middle'));
    } else {
      parts.push(t(x + w / 2, y + h / 2 + 4.2, it.code, 'pm-tag-t', 'middle'));
    }
    if (st.selected === it.code) parts.push(ring(x, y, w, h, 5));
    parts.push('</g>');
    return parts.join('');
  }

  function zoneFrame(x, y, w, h, titles, sub, cls) {
    const out = [`<rect class="pm-zone${cls ? ' ' + cls : ''}" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="8"/>`];
    (titles || []).forEach((tt, i) => out.push(t(x + 10, y + 17 + i * 12, tt, 'pm-zone-t')));
    if (sub) out.push(t(x + 10, y + 17 + (titles || []).length * 12, sub, 'pm-zone-s'));
    return out.join('');
  }

  function chamberBox(it, x, y, w, h, st, big, subs) {
    const parts = [itemOpen(it, st)];
    parts.push(`<rect class="pm-hit" x="${r1(x - 3)}" y="${r1(y - 3)}" width="${r1(w + 6)}" height="${r1(h + 6)}" rx="7"/>`);
    if (it.pulse) parts.push(pulseRect(x, y, w, h, 6));
    parts.push(`<rect class="pm-box" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="6"/>`);
    parts.push(statusBar(x, y, h));
    parts.push(t(x + 10, y + 17, it.code, 'pm-code pm-code-lg'));
    const inner = w - 18;
    if (big) {
      const tag = it.status === 'critical' ? 'ALARMA' : it.status === 'blocked' ? 'BLOQUEO' : 'REVISADA';
      if (10 + monoW(it.code, 12.5) + 6 + textW(tag, 9, 700) * 1.06 + 8 <= w) parts.push(t(x + w - 8, y + 16, tag, `pm-flag pm-flag-${it.status}`, 'end'));
      parts.push(t(x + 10, y + 36, it.value, 'pm-temp'));
      const lines = [
        [fit([`consigna ${fmt.temp(it.setpoint)}`, `cons. ${fmt.temp(it.setpoint)}`], inner + 6, 9.5, 500), 'pm-sub'],
        [it.exc && it.exc.peak != null ? fit([`pico ${fmt.temp(it.exc.peak)} · ${it.exc.peak_time}`, `pico ${fmt.temp(it.exc.peak)}`], inner + 6, 9.5, 600) : '', 'pm-sub pm-t-crit'],
        [fit([`${it.pallets} palés · ${it.lots.length} lotes`, `${it.pallets} palés`], inner + 6, 9.5, 600), 'pm-sub pm-strong']
      ].filter((l) => l[0]);
      /* Prioridad si falta alto: palés > pico > consigna (se conserva el orden de lectura). */
      const room = Math.max(0, Math.floor((h - 38 - (subs ? 28 : 4)) / 14));
      const keep = lines.slice(Math.max(0, lines.length - room));
      keep.forEach((l, i) => parts.push(t(x + 10, y + 50 + i * 14, l[0], l[1])));
    } else {
      parts.push(t(x + 10, y + 35, it.value, 'pm-temp'));
      if (h >= 58) parts.push(t(x + 10, y + 50, fit([`consigna ${fmt.temp(it.setpoint)}`, `cons. ${fmt.temp(it.setpoint)}`], inner + 6, 9.5, 500), 'pm-sub'));
    }
    if (st.selected === it.code) parts.push(ring(x, y, w, h, 6));
    parts.push('</g>');
    return parts.join('');
  }

  function siloBox(it, x, y, w, h, st, overlay) {
    const parts = [itemOpen(it, st)];
    parts.push(`<rect class="pm-hit" x="${r1(x - 3)}" y="${r1(y - 3)}" width="${r1(w + 6)}" height="${r1(h + 6)}" rx="7"/>`);
    parts.push(`<rect class="pm-box" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="6"/>`);
    parts.push(statusBar(x, y, h));
    parts.push(t(x + 10, y + 16, it.code, 'pm-code'));
    parts.push(t(x + 10, y + 33, it.value, 'pm-temp pm-temp-sm'));
    const inner = w - 18;
    const n = (it.c07 || []).reduce((a, b) => a + b.pallets, 0);
    if (!it.evaporator && h >= 52) parts.push(t(x + 10, y + h - 9, capVariants(it.capacity)[st.capIdx || 0], 'pm-sub'));
    if (overlay && n) parts.push(countPill(x + w - 5, y + 5, String(n), 'warn', 'end'));
    if (st.selected === it.code) parts.push(ring(x, y, w, h, 6));
    parts.push('</g>');
    return parts.join('');
  }

  function capVariants(n) { return [`capacidad ${fmt.num(n)}`, `cap. ${fmt.num(n)} palés`, `cap. ${fmt.num(n)}`, fmt.num(n)]; }
  /* Misma variante de texto para todos los silos (la más larga que quepa en todos). */
  function capIndex(model, maxW) {
    const caps = SILOS.map((c) => model.items[c]).filter(Boolean).map((it) => capVariants(it.capacity));
    for (let i = 0; i < 4; i++) if (caps.every((v) => textW(v[i], 9.5, 500) <= maxW)) return i;
    return 3;
  }

  function dockBox(it, x, y, w, h, st, overlay) {
    const parts = [itemOpen(it, st)];
    parts.push(`<rect class="pm-hit" x="${r1(x - 3)}" y="${r1(y - 3)}" width="${r1(w + 6)}" height="${r1(h + 6)}" rx="6"/>`);
    parts.push(`<rect class="pm-box" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="5"/>`);
    if (it.status !== 'none') parts.push(statusBar(x, y, h));
    parts.push(t(x + 9, y + (h >= 34 ? 15 : h / 2 + 4), it.code, 'pm-code'));
    const nx = it.next;
    if (h >= 34) {
      const when = nx ? (nx.date !== st.model.today ? fmt.dayMonth(nx.date) : nx.time) : '—';
      parts.push(t(x + 9, y + 29, when, nx ? 'pm-val pm-val-n' : 'pm-sub'));
    }
    if (overlay && it.c07) {
      const n = it.c07.lots.reduce((a, b) => a + b.pallets, 0);
      parts.push(countPill(x + w - 5, y + 5, String(n), 'warn', 'end'));
    }
    if (st.selected === it.code) parts.push(ring(x, y, w, h, 5));
    parts.push('</g>');
    return parts.join('');
  }

  function areaBox(it, x, y, w, h, st, ico, label, sub) {
    const parts = [itemOpen(it, st)];
    parts.push(`<rect class="pm-hit" x="${r1(x - 3)}" y="${r1(y - 3)}" width="${r1(w + 6)}" height="${r1(h + 6)}" rx="6"/>`);
    parts.push(`<rect class="pm-box" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="5"/>`);
    let tx = x + 8;
    const withIcon = ico && w >= 44 && (!label || textW(label, 10.5, 600) <= w - 32);
    if (withIcon) { parts.push(svgIcon(ico, x + 7, y + h / 2 - 7, 14, 'pm-ico-area')); tx = x + 26; }
    const inner = x + w - tx - 6;
    if (label) {
      if (sub && h >= 34) {
        parts.push(t(tx, y + h / 2 - 2, fit([label], inner, 10.5, 600) || label, 'pm-area-t'));
        parts.push(t(tx, y + h / 2 + 11, fit([sub], inner, 9.5, 500), 'pm-sub'));
      } else {
        parts.push(t(tx, y + h / 2 + 3.6, fit([label, it.code], inner, 10.5, 600) || it.code, 'pm-area-t'));
      }
    }
    if (st.selected === it.code) parts.push(ring(x, y, w, h, 5));
    parts.push('</g>');
    return parts.join('');
  }

  /* Tramos de transportador entre etapas de una fila: sencillo → sencillo recto; con etapas en paralelo, codos. */
  function conveyor(stages, exitX, markerCls) {
    const segs = [];
    for (let i = 0; i < stages.length - 1; i++) {
      const a = stages[i];
      const b = stages[i + 1];
      if (a.ys.length === 1 && b.ys.length === 1) { segs.push(`M${r1(a.x1)} ${r1(a.ys[0])}H${r1(b.x0)}`); continue; }
      const xm = b.ys.length > 1 ? b.x0 - 9 : a.x1 + 9;
      a.ys.forEach((ya) => b.ys.forEach((yb) => segs.push(`M${r1(a.x1)} ${r1(ya)}H${r1(xm)}V${r1(yb)}H${r1(b.x0)}`)));
    }
    const last = stages[stages.length - 1];
    const out = [`<path class="pm-conv" d="${segs.join('')}"/>`];
    if (last.ys.length === 1) out.push(`<path class="pm-conv ${markerCls || ''}" d="M${r1(last.x1)} ${r1(last.ys[0])}H${r1(exitX)}" marker-end="url(#__MK__)"/>`);
    else {
      const xm = last.x1 + 9;
      const yc = (last.ys[0] + last.ys[last.ys.length - 1]) / 2;
      out.push(`<path class="pm-conv" d="${last.ys.map((y) => `M${r1(last.x1)} ${r1(y)}H${r1(xm)}V${r1(yc)}`).join('')}"/>`);
      out.push(`<path class="pm-conv" d="M${r1(xm)} ${r1(yc)}H${r1(exitX)}" marker-end="url(#__MK__)"/>`);
    }
    return out.join('');
  }

  /* ================================================================ Maquetación · plano completo */

  const FULL_MIN = 1040;

  function renderFull(model, W, st) {
    const tt = clamp((W - FULL_MIN) / 300, 0, 1);
    const L = (a, b) => Math.round(a + (b - a) * tt);
    const P = 12;
    const G = L(20, 26);
    const RW = L(96, 106);
    const SW = L(104, 116);
    const CW = L(108, 120);
    const MW = L(64, 74);
    const LW = W - 2 * P - RW - SW - CW - MW - 4 * G;
    const xR = P;
    const xL = xR + RW + G;
    const xS = xL + LW + G;
    const xC = xS + SW + G;
    const xM = xC + CW + G;
    const top = P;
    const HEAD = 50;
    const BOX_H = 38;
    const PITCH = 50;
    const DIV = 22;
    const rowY = { L1: top + HEAD };
    rowY.L2 = rowY.L1 + PITCH;
    rowY.L3 = rowY.L2 + PITCH;
    rowY.L4 = rowY.L3 + PITCH + DIV;
    rowY.L5 = rowY.L4 + PITCH;
    const zoneB = rowY.L5 + BOX_H + 16;
    const ZH = zoneB - top;
    const tagW = LW >= 640 ? 58 : LW >= 580 ? 50 : 38;
    const cx0 = xL + 12 + tagW + 14;
    const cx1 = xL + LW - 14;
    const colW = (cx1 - cx0) / COLS.length;
    const boxW = Math.min(Math.floor(colW - (colW < 76 ? 8 : 10)), 112);
    const colX = (c) => cx0 + c * colW + (colW - boxW) / 2;
    const svcY = zoneB + 20;
    const SVC_H = 68;
    const H = svcY + SVC_H + P;
    const I = model.items;
    const overlay = st.overlay;
    const parts = [];
    const cy = (l) => rowY[l] + BOX_H / 2;

    /* Zonas */
    const recH = rowY.L3 + BOX_H + 14 - top;
    parts.push(zoneFrame(xR, top, RW, recH, ['RECEPCIÓN', 'DE CAMPO']));
    parts.push(zoneFrame(xR, top + recH + 12, RW, ZH - recH - 12, ['LABORATORIO']));
    parts.push(zoneFrame(xL, top, LW, ZH, ['LÍNEAS DE PROCESO'], null, 'pm-zone-lines'));
    parts.push(zoneFrame(xS, top, SW, ZH, ['ALMACÉN', 'AUTOMÁTICO'], `Mecalux · ${fmt.temp(WORLD_CHAMBERS['SIL-1'].setpoint_c)}`));
    parts.push(zoneFrame(xC, top, CW, ZH, ['CÁMARAS DE', 'EXPEDICIÓN'], `consigna ${fmt.temp((D.chamber_c07 || {}).setpoint_c)}`));
    parts.push(zoneFrame(xM, top, MW, ZH, ['MUELLES', 'DE CARGA']));

    /* Cabecera de columnas de proceso */
    COLS.forEach((c, i) => parts.push(t(cx0 + i * colW + colW / 2, top + 35, fit([c, c.split(' ')[0]], colW - 4, 9.5, 500), 'pm-col-t', 'middle')));
    parts.push(`<line class="pm-col-rule" x1="${r1(cx0)}" y1="${r1(top + 40.5)}" x2="${r1(cx1)}" y2="${r1(top + 40.5)}"/>`);

    /* Separador reenvasado y mezclas */
    const divY = rowY.L3 + BOX_H + (PITCH - BOX_H + DIV) / 2;
    parts.push(`<line class="pm-div" x1="${r1(xL + 10)}" y1="${r1(divY)}" x2="${r1(xL + LW - 10)}" y2="${r1(divY)}"/>`);
    const divLabel = fit(['REENVASADO Y MEZCLAS · DESDE GRANEL', 'REENVASADO Y MEZCLAS'], LW - 40, 9, 600);
    const dlw = textW(divLabel, 9, 600) * 1.08 + 12;
    parts.push(`<rect class="pm-knock" x="${r1(xL + 14)}" y="${r1(divY - 7)}" width="${r1(dlw)}" height="14"/>`);
    parts.push(t(xL + 20, divY + 3.2, divLabel, 'pm-div-t'));

    /* Recepción → líneas L1–L3 */
    const rin = RW - 16;
    parts.push(areaBox(I.BAS, xR + 8, top + 36, rin, 30, st, 'scale', 'Básculas'));
    const rdW = (rin - 8) / 3;
    ['R1', 'R2', 'R3'].forEach((r, i) => parts.push(areaBox(I[r], xR + 8 + i * (rdW + 4), top + 80, rdW, 26, st, null, r)));
    parts.push(areaBox(I.TLV, xR + 8, top + 120, rin, 30, st, 'download', 'Tolvas'));
    parts.push(`<path class="pm-link" d="M${r1(xR + 8 + rin / 2)} ${r1(top + 66)}V${r1(top + 80)}M${r1(xR + 8 + rin / 2)} ${r1(top + 106)}V${r1(top + 120)}"/>`);
    const camp = D.campaign || {};
    if (camp.rule_field_to_tunnel_max_min) {
      parts.push(t(xR + 10, top + recH - 22, fit(['Campo → túnel', 'Campo→túnel'], rin, 9, 500), 'pm-zone-s'));
      parts.push(t(xR + 10, top + recH - 10, `≤ ${camp.rule_field_to_tunnel_max_min} min`, 'pm-zone-s pm-strong'));
    }
    const manX = xR + RW + Math.round(G / 2);
    parts.push(`<path class="pm-conv" d="M${r1(xR + 8 + rin)} ${r1(top + 135)}H${r1(manX)}M${r1(manX)} ${r1(cy('L1'))}V${r1(cy('L3'))}"/>`);
    ['L1', 'L2', 'L3'].forEach((l) => parts.push(`<path class="pm-conv" d="M${r1(manX)} ${r1(cy(l))}H${r1(xL + 12)}" marker-end="url(#__MK__)"/>`));

    /* Laboratorio */
    const labY = top + recH + 12;
    parts.push(areaBox(I.LAB, xR + 8, labY + 28, rin, 42, st, 'flask', 'Laboratorio', 'de Calidad'));

    /* Líneas */
    LINES.forEach((l) => {
      const y = rowY[l];
      const tag = I[l];
      const members = tag.members.map((c) => I[c]).filter((it) => TYPE_COL[it.type] != null);
      const cols = {};
      members.forEach((it) => { (cols[TYPE_COL[it.type]] = cols[TYPE_COL[it.type]] || []).push({ it, ghost: false }); });
      (model.ghosts[l] || []).forEach((c) => { const it = I[c]; if (it && TYPE_COL[it.type] != null && !cols[TYPE_COL[it.type]]) cols[TYPE_COL[it.type]] = [{ it, ghost: true }]; });
      const stages = [{ x0: xL + 12, x1: xL + 12 + tagW, ys: [y + BOX_H / 2] }];
      const boxes = [];
      Object.keys(cols).map(Number).sort((a, b) => a - b).forEach((c) => {
        const list = cols[c].sort((a, b) => a.it.code.localeCompare(b.it.code));
        const x = colX(c);
        if (list.length === 1) {
          stages.push({ x0: x, x1: x + boxW, ys: [y + BOX_H / 2] });
          boxes.push(eqBox(list[0].it, x, y, boxW, BOX_H, st, { ghost: list[0].ghost }));
        } else {
          const hh = (BOX_H - 4) / 2;
          stages.push({ x0: x, x1: x + boxW, ys: list.map((_, i) => y + i * (hh + 4) + hh / 2) });
          list.forEach((e, i) => boxes.push(eqBox(e.it, x, y + i * (hh + 4), boxW, hh, st, { ghost: e.ghost })));
        }
      });
      parts.push(conveyor(stages, xS - 1));
      parts.push(boxes.join(''));
      parts.push(lineTag(tag, xL + 12, y, tagW, BOX_H, st, tagW >= 50));
    });

    /* Granel: del almacén a L4 y L5 */
    const yRet = rowY.L5 + BOX_H + 8;
    const xRet = xL + 6;
    parts.push(`<path class="pm-conv pm-bulk" d="M${r1(xS - 1)} ${r1(yRet)}H${r1(xRet)}V${r1(cy('L4'))}"/>`);
    ['L4', 'L5'].forEach((l) => parts.push(`<path class="pm-conv pm-bulk" d="M${r1(xRet)} ${r1(cy(l))}H${r1(xL + 12)}" marker-end="url(#__MK__)"/>`));
    const bulkLabel = fit(['granel (octavines) desde el almacén', 'granel desde el almacén', 'granel'], colW * 4, 9, 500);
    const blw = textW(bulkLabel, 9, 500) * 1.06 + 10;
    const blx = cx0 + colW * 2;
    parts.push(`<rect class="pm-knock" x="${r1(blx - 5)}" y="${r1(yRet - 6)}" width="${r1(blw)}" height="12"/>`);
    parts.push(t(blx, yRet + 3, bulkLabel, 'pm-bulk-t'));

    /* Almacén automático */
    st.capIdx = capIndex(model, SW - 16 - 18 + 4);
    const inTop = top + HEAD + 4;
    const inH = zoneB - 10 - inTop;
    const sH = (inH - 3 * 8) / 4;
    SILOS.forEach((s, i) => {
      const it = I[s];
      if (!it) return;
      const y = inTop + i * (sH + 8);
      parts.push(siloBox(it, xS + 8, y, SW - 16, sH, st, overlay));
      if (it.evaporator && I[it.evaporator]) parts.push(eqBox(I[it.evaporator], xS + 18, y + sH - 23, 54, 17, st));
    });
    /* Almacén → cámaras */
    const cH = [(inH - 16) * 0.27, (inH - 16) * 0.46, (inH - 16) * 0.27];
    let cyy = inTop;
    const chY = {};
    CHAMBERS.forEach((c, i) => { chY[c] = { y: cyy, h: cH[i] }; cyy += cH[i] + 8; });
    CHAMBERS.forEach((c) => parts.push(`<path class="pm-conv" d="M${r1(xS + SW)} ${r1(chY[c].y + chY[c].h / 2)}H${r1(xC - 1)}" marker-end="url(#__MK__)"/>`));

    /* Cámaras */
    CHAMBERS.forEach((c) => {
      const it = I[c];
      if (!it) return;
      const g = chY[c];
      const big = c === (D.chamber_c07 || {}).code;
      parts.push(chamberBox(it, xC + 8, g.y, CW - 16, g.h, st, big, big));
      if (big) {
        const sw2 = (CW - 16 - 20 - 6) / 2;
        const sy = g.y + g.h - 28;
        if (I['EV-07']) parts.push(eqBox(I['EV-07'], xC + 18, sy, sw2, 19, st));
        if (I['P-07']) parts.push(eqBox(I['P-07'], xC + 18 + sw2 + 6, sy, sw2, 19, st));
      }
    });

    /* Cámaras → colector → muelles */
    const busX = xC + CW + Math.round(G / 2);
    const dH = (inH - 5 * 6) / 6;
    const dY = (i) => inTop + i * (dH + 6);
    parts.push(`<path class="pm-conv" d="${CHAMBERS.map((c) => `M${r1(xC + CW)} ${r1(chY[c].y + chY[c].h / 2)}H${r1(busX)}`).join('')}M${r1(busX)} ${r1(dY(0) + dH / 2)}V${r1(dY(5) + dH / 2)}"/>`);
    DOCKS.forEach((d, i) => {
      parts.push(`<path class="pm-conv" d="M${r1(busX)} ${r1(dY(i) + dH / 2)}H${r1(xM + 5)}" marker-end="url(#__MK__)"/>`);
    });
    DOCKS.forEach((d, i) => { if (I[d]) parts.push(dockBox(I[d], xM + 6, dY(i), MW - 12, dH, st, overlay)); });

    /* Recorrido de los palés de C-07 (superpuesto) */
    if (overlay || st.selected === (D.chamber_c07 || {}).code) {
      const c07 = (D.chamber_c07 || {}).code;
      const g = chY[c07];
      if (g) {
        const ys = DOCKS.map((d, i) => (I[d] && I[d].c07 ? dY(i) + dH / 2 : null)).filter((v) => v != null);
        if (ys.length) {
          const yc = g.y + g.h / 2;
          const y0 = Math.min(yc, ...ys);
          const y1 = Math.max(yc, ...ys);
          parts.push(`<path class="pm-route" d="M${r1(xC + CW)} ${r1(yc)}H${r1(busX)}M${r1(busX)} ${r1(y0)}V${r1(y1)}${ys.map((y) => `M${r1(busX)} ${r1(y)}H${r1(xM + 5)}`).join('')}"/>`);
        }
      }
    }

    /* Servicios: calderas y sala de máquinas NH3, con el circuito de amoniaco */
    const nh3W = 2 * boxW + 30;
    const tunX = colX(3);
    const nh3X = Math.max(xL + 150, tunX - 10);
    const calW = boxW + 20;
    const calX = nh3X - 14 - calW;
    parts.push(zoneFrame(calX, svcY, calW, SVC_H, ['CALDERAS'], null, 'pm-zone-svc'));
    if (I['CAL-B1']) parts.push(eqBox(I['CAL-B1'], calX + 10, svcY + 24, boxW, BOX_H, st));
    parts.push(zoneFrame(nh3X, svcY, nh3W, SVC_H, [fit(['SALA DE MÁQUINAS NH3', 'SALA NH3'], nh3W - 16, 10, 600)], null, 'pm-zone-svc'));
    if (I['NH3-C1']) parts.push(eqBox(I['NH3-C1'], nh3X + 10, svcY + 24, boxW, BOX_H, st));
    if (I['NH3-C2']) parts.push(eqBox(I['NH3-C2'], nh3X + 20 + boxW, svcY + 24, boxW, BOX_H, st));
    const busY = svcY + 24 + BOX_H / 2;
    const tickS = xS + SW / 2;
    const tickC = xC + CW / 2;
    parts.push(`<path class="pm-nh3" d="M${r1(nh3X + nh3W)} ${r1(busY)}H${r1(tickC)}M${r1(tickS)} ${r1(busY)}V${r1(zoneB)}M${r1(tickC)} ${r1(busY)}V${r1(zoneB)}M${r1(tunX + boxW / 2)} ${r1(svcY)}V${r1(zoneB)}"/>`);
    const nh3Label = fit(['Circuito de amoniaco · túneles, silos y cámaras', 'Circuito de amoniaco', 'NH3'], tickS - (nh3X + nh3W) - 24, 9, 500);
    if (nh3Label) parts.push(t(nh3X + nh3W + 12, busY - 6, nh3Label, 'pm-nh3-t'));
    const steamX = calX + calW / 2;
    const escX = colX(2) + boxW / 2;
    parts.push(`<path class="pm-steam" d="M${r1(steamX)} ${r1(svcY)}V${r1(svcY - 10)}H${r1(escX)}V${r1(zoneB)}"/>`);
    if (calX - xL > 70) parts.push(t(calX - 8, svcY + 16, 'vapor', 'pm-nh3-t', 'end'));

    return { W, H, body: parts.join('') };
  }

  /* ================================================================ Maquetación · mini (cadena de frío) */

  const MINI_MIN = 560;

  function renderMini(model, W, st) {
    const P = 10;
    const G = 22;
    const I = model.items;
    const PW = 96;
    const MW = 88;
    const rest = W - 2 * P - PW - MW - 3 * G;
    const SW = Math.round(rest * 0.48);
    const CW = rest - SW;
    const xP = P;
    const xS = xP + PW + G;
    const xC = xS + SW + G;
    const xM = xC + CW + G;
    const top = P;
    const HEAD = 30;
    const inTop = top + HEAD;
    const inH = 196;
    const H = inTop + inH + 10 + P;
    const zb = inTop + inH + 10;
    const parts = [];
    const overlay = st.overlay;
    parts.push(zoneFrame(xP, top, PW, zb - top, ['PRODUCCIÓN']));
    parts.push(zoneFrame(xS, top, SW, zb - top, ['ALMACÉN AUTOMÁTICO']));
    parts.push(zoneFrame(xC, top, CW, zb - top, ['CÁMARAS DE EXPEDICIÓN']));
    parts.push(zoneFrame(xM, top, MW, zb - top, ['MUELLES']));
    const tH = (inH - 4 * 6) / 5;
    LINES.forEach((l, i) => {
      const y = inTop + i * (tH + 6);
      parts.push(lineTag(I[l], xP + 8, y, 30, tH, st, false));
      const alerts = I[l].members.map((c) => I[c]).filter((x) => x && /critical|warning/.test(x.status));
      const worst = alerts.some((x) => x.status === 'critical') ? 'crit' : alerts.length ? 'warn' : 'ok';
      parts.push(t(xP + 46, y + tH / 2 + 3.5, alerts.length ? `${alerts.length} ${alerts.length === 1 ? 'alerta' : 'alertas'}` : 'sin alertas', `pm-sub pm-t-${worst}`));
    });
    parts.push(`<path class="pm-conv" d="M${r1(xP + PW)} ${r1(inTop + inH / 2)}H${r1(xS - 1)}" marker-end="url(#__MK__)"/>`);
    const cols = SW >= 190 ? 2 : 1;
    const rows = 4 / cols;
    const sW = (SW - 16 - (cols - 1) * 8) / cols;
    st.capIdx = capIndex(model, sW - 18 + 4);
    const sH = (inH - (rows - 1) * 8) / rows;
    SILOS.forEach((s, i) => {
      const it = I[s];
      if (!it) return;
      const x = xS + 8 + (i % cols) * (sW + 8);
      const y = inTop + Math.floor(i / cols) * (sH + 8);
      parts.push(siloBox(it, x, y, sW, sH, st, overlay));
      if (it.evaporator && I[it.evaporator] && sH >= 56) parts.push(eqBox(I[it.evaporator], x + 10, y + sH - 23, 54, 17, st));
    });
    const cH = [(inH - 16) * 0.26, (inH - 16) * 0.48, (inH - 16) * 0.26];
    let yy = inTop;
    const chY = {};
    CHAMBERS.forEach((c, i) => { chY[c] = { y: yy, h: cH[i] }; yy += cH[i] + 8; });
    CHAMBERS.forEach((c) => parts.push(`<path class="pm-conv" d="M${r1(xS + SW)} ${r1(chY[c].y + chY[c].h / 2)}H${r1(xC - 1)}" marker-end="url(#__MK__)"/>`));
    CHAMBERS.forEach((c) => {
      const it = I[c];
      if (!it) return;
      const big = c === (D.chamber_c07 || {}).code;
      parts.push(chamberBox(it, xC + 8, chY[c].y, CW - 16, chY[c].h, st, big, big && chY[c].h >= 88));
      if (big && chY[c].h >= 88) {
        const sw2 = Math.min(56, (CW - 16 - 20 - 6) / 2);
        const sy = chY[c].y + chY[c].h - 26;
        if (I['EV-07']) parts.push(eqBox(I['EV-07'], xC + 18, sy, sw2, 18, st));
        if (I['P-07']) parts.push(eqBox(I['P-07'], xC + 18 + sw2 + 6, sy, sw2, 18, st));
      }
    });
    const busX = xC + CW + Math.round(G / 2);
    const dH = (inH - 5 * 5) / 6;
    const dY = (i) => inTop + i * (dH + 5);
    parts.push(`<path class="pm-conv" d="${CHAMBERS.map((c) => `M${r1(xC + CW)} ${r1(chY[c].y + chY[c].h / 2)}H${r1(busX)}`).join('')}M${r1(busX)} ${r1(dY(0) + dH / 2)}V${r1(dY(5) + dH / 2)}"/>`);
    DOCKS.forEach((d, i) => parts.push(`<path class="pm-conv" d="M${r1(busX)} ${r1(dY(i) + dH / 2)}H${r1(xM + 5)}" marker-end="url(#__MK__)"/>`));
    DOCKS.forEach((d, i) => { if (I[d]) parts.push(dockBox(I[d], xM + 6, dY(i), MW - 12, dH, st, overlay)); });
    if (overlay || st.selected === (D.chamber_c07 || {}).code) {
      const g = chY[(D.chamber_c07 || {}).code];
      const ys = DOCKS.map((d, i) => (I[d] && I[d].c07 ? dY(i) + dH / 2 : null)).filter((v) => v != null);
      if (g && ys.length) {
        const yc = g.y + g.h / 2;
        parts.push(`<path class="pm-route" d="M${r1(xC + CW)} ${r1(yc)}H${r1(busX)}M${r1(busX)} ${r1(Math.min(yc, ...ys))}V${r1(Math.max(yc, ...ys))}${ys.map((y) => `M${r1(busX)} ${r1(y)}H${r1(xM + 5)}`).join('')}"/>`);
      }
    }
    return { W, H, body: parts.join('') };
  }

  /* ================================================================ Tooltip y panel */

  function tipRows(it, model) {
    const rows = [];
    if (it.kind === 'machine') {
      rows.push([`Lectura ${READ_TIME}`, it.value]);
      if (it.ref) rows.push([it.ref.label, it.ref.text]);
    } else if (it.kind === 'chamber' || it.kind === 'silo') {
      rows.push([`Aire ${it.time || ''}`.trim(), it.value]);
      rows.push(['Consigna', fmt.temp(it.setpoint)]);
      if (it.code === (D.chamber_c07 || {}).code && it.exc) rows.push(['Excursión', `${it.exc.start}–${it.exc.end} · pico ${fmt.temp(it.exc.peak)}`]);
      if (it.kind === 'silo' && it.c07 && it.c07.length) rows.push([`Lotes de ${(D.chamber_c07 || {}).code}`, fmt.plural(it.c07.reduce((a, b) => a + b.pallets, 0), 'palé', 'palés')]);
    } else if (it.kind === 'dock') {
      if (it.next) rows.push(['Próxima expedición', `${it.next.id} · ${it.next.date !== model.today ? fmt.dayMonth(it.next.date) + ' ' : ''}${it.next.time}`]);
      else rows.push(['Expediciones', 'Sin expedición asignada']);
      if (it.c07) rows.push([`Palés de ${(D.chamber_c07 || {}).code}`, String(it.c07.lots.reduce((a, b) => a + b.pallets, 0))]);
    } else if (it.kind === 'line') {
      const al = it.members.map((c) => model.items[c]).filter((x) => x && /critical|warning/.test(x.status));
      rows.push(['Equipos', String(it.members.length)]);
      rows.push(['Con alerta', al.length ? al.map((x) => x.code).join(', ') : 'ninguno']);
    } else if (it.kind === 'equip') {
      rows.push(['Tipo', fmt.cap(it.short || '')]);
      const evs = (it.events || []).filter((e) => e.end && EVENT_SHORT[e.type]);
      if (evs.length) evs.forEach((e) => rows.push(['Hoy', `${EVENT_SHORT[e.type]} ${e.time}–${e.end}`]));
      else rows.push(['Indicador', `Sin indicador en el parte de las ${READ_TIME}`]);
      if (it.orders.length) rows.push(['Orden abierta', it.orders[0].id]);
    } else if (it.kind === 'area') {
      rows.push(['Función', fmt.cap(it.short || '')]);
    }
    if (it.ticket) rows.push(['Ticket', it.ticket.id]);
    return rows;
  }

  function tipName(it) {
    const code = String(it.code).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const n = String(it.name || '').replace(new RegExp(`\\s*(·\\s*)?${code}\\b`), '').replace(/\s{2,}/g, ' ').trim();
    return n || it.name;
  }
  function tipHTML(it, model) {
    const s = it.statusLabel || STATUS_LABEL[it.status] || '';
    const tone = STATUS_TONE[it.status] || 'neutral';
    const src = (it.sources || []).filter(Boolean);
    return String(html`<div class="pm-tip-head"><span class="pm-tip-code">${it.code}</span>${s && it.status !== 'none' ? html`<span class="pm-tip-st tone-${tone}"><i></i>${s}</span>` : ''}${it.pcc ? html`<span class="pm-tip-pcc">PCC</span>` : ''}</div>
      <div class="pm-tip-name">${tipName(it)}</div>
      <dl class="pm-tip-rows">${tipRows(it, model).map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>
      ${src.length ? html`<div class="pm-tip-src">${src.join(' · ')}<span>${src.length > 1 ? 'conectores de demostración' : 'conector de demostración'}</span></div>` : ''}`);
  }

  function sparkline(series, o) {
    const W = 300;
    const H = 84;
    const pad = { l: 30, r: 8, t: 8, b: 16 };
    const pts = (series || []).map((p) => ({ x: p.time, y: p.temp_c }));
    if (!pts.length) return '';
    const ys = pts.map((p) => p.y).concat([o.limit, o.critical]);
    const y0 = Math.floor(Math.min(...ys)) - 1;
    const y1 = Math.ceil(Math.max(...ys)) + 1;
    const X = (i) => pad.l + (i / (pts.length - 1)) * (W - pad.l - pad.r);
    const Y = (v) => pad.t + (1 - (v - y0) / (y1 - y0)) * (H - pad.t - pad.b);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${r1(X(i))} ${r1(Y(p.y))}`).join('');
    let fill = '';
    let run = [];
    const flush = () => {
      if (run.length > 1) fill += `M${r1(X(run[0]))} ${r1(Y(o.limit))}${run.map((i) => `L${r1(X(i))} ${r1(Y(pts[i].y))}`).join('')}L${r1(X(run[run.length - 1]))} ${r1(Y(o.limit))}Z`;
      run = [];
    };
    pts.forEach((p, i) => { if (p.y > o.limit) run.push(i); else flush(); });
    flush();
    const pk = pts.reduce((a, p, i) => (p.y > pts[a].y ? i : a), 0);
    return `<svg class="pm-spark" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Temperatura de aire de ${esc(o.code)} de ${esc(pts[0].x)} a ${esc(pts[pts.length - 1].x)}; pico ${esc(fmt.temp(pts[pk].y))} a las ${esc(pts[pk].x)}">
      <path class="pm-sp-fill" d="${fill}"/>
      <line class="pm-sp-lim" x1="${pad.l}" x2="${W - pad.r}" y1="${r1(Y(o.limit))}" y2="${r1(Y(o.limit))}"/>
      <line class="pm-sp-crit" x1="${pad.l}" x2="${W - pad.r}" y1="${r1(Y(o.critical))}" y2="${r1(Y(o.critical))}"/>
      <text class="pm-sp-ax" x="${pad.l - 4}" y="${r1(Y(o.limit) + 3)}" text-anchor="end">${esc(fmt.num(o.limit))}</text>
      <text class="pm-sp-ax" x="${pad.l - 4}" y="${r1(Y(o.critical) + 3)}" text-anchor="end">${esc(fmt.num(o.critical))}</text>
      <path class="pm-sp-line" d="${line}"/>
      <circle class="pm-sp-peak" cx="${r1(X(pk))}" cy="${r1(Y(pts[pk].y))}" r="3"/>
      <text class="pm-sp-ax" x="${pad.l}" y="${H - 3}">${esc(pts[0].x)}</text>
      <text class="pm-sp-ax" x="${W - pad.r}" y="${H - 3}" text-anchor="end">${esc(pts[pts.length - 1].x)}</text>
    </svg>`;
  }

  function relChips(it, model, title) {
    if (!it.related.length) return '';
    return html`<section class="pm-sec"><h4 class="pm-sec-h">${title || 'Relacionado'}</h4><div class="pm-rel">${it.related.map((r) => {
      const o = model.items[r.code];
      if (!o) return '';
      return html`<button type="button" class="pm-rel-btn tone-${r.tone || STATUS_TONE[o.status] || 'neutral'}" data-pm-go="${r.code}"><span class="pm-rel-code">${r.code}</span><span class="pm-rel-label">${r.label}</span>${icon('chevron-right', 14)}</button>`;
    })}</div></section>`;
  }

  function lastSection(it) {
    const rows = [];
    if (it.last && it.last.length) rows.push(['Última intervención', html`${it.last.map((l, i) => html`${i ? raw('<br>') : ''}${l}`)}`]);
    else if (it.kind === 'machine' || it.kind === 'equip') rows.push(['Última intervención', html`<span class="muted">Sin órdenes abiertas</span>`]);
    if (it.kind === 'machine' || it.kind === 'equip') {
      if (it.ticket) rows.push(['Ticket', html`<span class="code">${it.ticket.id}</span> ${chip(it.ticket.kind === 'new' ? 'created' : 'updated')}<div class="pm-muted-line">${[it.ticket.priority, it.ticket.owner].filter(Boolean).join(' · ')}</div>`]);
      else if (it.kind === 'machine' && /critical|warning/.test(it.status)) rows.push(['Ticket', html`<span class="muted">Sin ticket todavía: lo crea el parte diario</span>`]);
    }
    return rows.length ? html`<section class="pm-sec"><h4 class="pm-sec-h">Mantenimiento</h4>${App.kv(rows)}</section>` : '';
  }

  function panelHTML(it, model, opts) {
    const s = it.statusLabel || STATUS_LABEL[it.status] || '';
    const chips = [];
    if (it.status !== 'none' && s) chips.push(chip(STATUS_TONE[it.status] || 'neutral', s));
    if (it.pcc) chips.push(chip('pcc'));
    const zoneName = { machine: it.area, equip: it.area, chamber: 'Cámaras de expedición', silo: 'Almacén automático · Mecalux Easy WMS', dock: 'Muelles de carga', line: 'Líneas de proceso', area: it.zone === 'laboratorio' ? 'Laboratorio' : 'Recepción de campo' }[it.kind] || '';
    const body = [];
    const src = (it.sources || []).length ? html`<span class="pm-srcs">${(it.sources || []).map((n) => sys(n))}</span>` : '';

    if (it.kind === 'machine') {
      const rows = [[`Lectura (${READ_TIME})`, html`<span class="strong ${it.status === 'critical' ? 't-crit' : it.status === 'warning' ? 't-warn' : ''}">${it.value}</span>`]];
      if (it.ref) rows.push([it.ref.label, it.ref.text]);
      if (it.limits) rows.push(['Umbrales', it.limits]);
      if (src) rows.push(['Fuente', src]);
      body.push(html`<section class="pm-sec"><h4 class="pm-sec-h">${fmt.cap(it.metricLabel || '')}</h4>${App.kv(rows)}</section>`);
      body.push(relChips(it, model));
      body.push(lastSection(it));
      if (it.note) body.push(html`<section class="pm-sec"><h4 class="pm-sec-h">Observación del parte</h4><p class="pm-p">${it.note}</p></section>`);
    } else if (it.kind === 'equip') {
      const rows = [['Tipo', fmt.cap(it.short || '')]];
      if (it.events && it.events.length) rows.push([`Eventos de hoy (${it.sources[0] || 'SCADA Galileo'})`, html`${it.events.map((e, i) => html`${i ? raw('<br>') : ''}${e.time}${e.end ? `–${e.end}` : ''} · ${fmt.text(e.text)}`)}`]);
      else rows.push(['Indicador', `Sin indicador en el parte de las ${READ_TIME}`]);
      if (src) rows.push(['Fuente', src]);
      body.push(html`<section class="pm-sec">${App.kv(rows)}</section>`);
      body.push(lastSection(it));
    } else if (it.kind === 'chamber') {
      const c07 = it.code === (D.chamber_c07 || {}).code;
      const rows = [[`Aire (${it.time})`, html`<span class="strong">${it.value}</span>`], ['Consigna', fmt.temp(it.setpoint)], ['Límite · crítico', `${fmt.temp(it.limit)} · ${fmt.temp(it.critical)}`], ['Capacidad', fmt.plural(it.capacity, 'palé', 'palés')]];
      if (it.sensor) rows.push(['Sonda', it.sensor]);
      if (src) rows.push(['Fuente', src]);
      if (c07) {
        const e = it.exc || {};
        body.push(html`<section class="pm-sec"><h4 class="pm-sec-h">Excursión ${e.start}–${e.end} · ${it.alarmId}</h4>
          ${raw(sparkline(D.chamber_c07_series, { limit: it.limit, critical: it.critical, code: it.code }))}
          <p class="pm-p">${e.minutes_above_limit} min por encima de ${fmt.temp(e.limit)} y ${e.minutes_above_critical} min por encima de ${fmt.temp(e.critical)}; pico de ${fmt.temp(e.peak)} a las ${e.peak_time}.${it.outcome && it.outcome.label ? html` <strong>${it.outcome.label}.</strong>` : ''}</p></section>`);
        body.push(html`<section class="pm-sec">${App.kv(rows)}</section>`);
        body.push(html`<section class="pm-sec"><h4 class="pm-sec-h">${it.pallets} palés de ${it.lots.length} lotes · ${fmt.kg(it.kg)}</h4>
          <table class="pm-mini-tbl"><tbody>${it.lots.map((l) => html`<tr><td>${App.lotTag(l.lot, { icon: false })}<span class="pm-muted-line">${l.product}</span></td><td class="num">${l.pallets}</td><td class="num muted">calle ${l.lane}</td></tr>`)}</tbody></table></section>`);
        const pp = model.pallets;
        const siloRows = Object.keys(pp.silos).sort().map((sc) => ({ code: sc, n: pp.silos[sc].reduce((a, b) => a + b.pallets, 0), lots: pp.silos[sc].map((x) => x.lot) }));
        const dockRows = Object.keys(pp.docks).sort().map((dc) => Object.assign({ code: dc, n: pp.docks[dc].lots.reduce((a, b) => a + b.pallets, 0) }, pp.docks[dc]));
        if (siloRows.length) body.push(html`<section class="pm-sec"><h4 class="pm-sec-h">Mismos lotes en el almacén · ${pp.inSilos} palés a evaluar</h4>
          <table class="pm-mini-tbl"><tbody>${siloRows.map((r) => html`<tr class="is-link" data-pm-go="${r.code}"><td><span class="code">${r.code}</span><span class="pm-muted-line">${fmt.list(r.lots)}</span></td><td class="num">${fmt.plural(r.n, 'palé', 'palés')}</td></tr>`)}</tbody></table></section>`);
        if (dockRows.length) body.push(html`<section class="pm-sec"><h4 class="pm-sec-h">Expediciones planificadas con estos palés</h4>
          <table class="pm-mini-tbl"><tbody>${dockRows.map((r) => html`<tr class="is-link" data-pm-go="${r.code}"><td><span class="code">${r.shipment}</span><span class="pm-muted-line">${r.customer}</span></td><td class="num">${r.date !== model.today ? fmt.dayMonth(r.date) + ' ' : ''}${r.time}<span class="pm-muted-line">muelle ${r.code}</span></td><td class="num">${r.n}</td></tr>`)}</tbody></table></section>`);
        const ce = it.related.filter((r) => model.items[r.code] && model.items[r.code].parent === it.code);
        if (ce.length) body.push(relChips(Object.assign({}, it, { related: ce }), model, 'Equipos de la cámara'));
        body.push(html`<section class="pm-sec"><h4 class="pm-sec-h">Hipótesis de causa</h4><p class="pm-p">${fmt.text(it.cause || '')}</p></section>`);
      } else {
        body.push(html`<section class="pm-sec">${App.kv(rows)}</section>`);
      }
    } else if (it.kind === 'silo') {
      const rows = [[`Aire (${it.time})`, html`<span class="strong">${it.value}</span>`], ['Consigna', fmt.temp(it.setpoint)], ['Límite', fmt.temp(it.limit)], ['Capacidad', fmt.plural(it.capacity, 'palé', 'palés')]];
      if (src) rows.push(['Fuente', src]);
      body.push(html`<section class="pm-sec">${App.kv(rows)}</section>`);
      const stock = it.stock || { lots: [], bulk: [] };
      if (stock.lots.length || stock.bulk.length) {
        const comp = (D.complaint || {});
        body.push(html`<section class="pm-sec"><h4 class="pm-sec-h">Lotes en seguimiento en este silo</h4>
          <table class="pm-mini-tbl"><tbody>
            ${stock.lots.map((l) => {
              const inC07 = (it.c07 || []).some((x) => x.lot === l.lot);
              const why = inC07 ? `mismo lote que ${(D.chamber_c07 || {}).code} · a evaluar` : l.lot === comp.lot ? `lote de la reclamación ${comp.code}` : '';
              return html`<tr><td>${App.lotTag(l.lot, { icon: false })}<span class="pm-muted-line">${l.product}${why ? html` · <span class="${inC07 ? 't-warn' : ''}">${why}</span>` : ''}</span></td><td class="num">${fmt.plural(l.pallets, 'palé', 'palés')}</td></tr>`;
            })}
            ${stock.bulk.map((b) => html`<tr><td><span class="code">${b.bulk}</span><span class="pm-muted-line">Granel de origen de ${b.lot}</span></td><td class="num muted">granel</td></tr>`)}
          </tbody></table></section>`);
      }
    } else if (it.kind === 'dock') {
      const rows = [];
      if (it.next) {
        rows.push(['Próxima expedición', html`<span class="code">${it.next.id}</span>`]);
        rows.push(['Salida', `${it.next.date !== model.today ? fmt.date(it.next.date) + ' ' : ''}${it.next.time}`]);
        rows.push(['Cliente', customerName(it.next.customer)]);
        rows.push(['Transporte', fmt.text(it.next.transport)]);
      } else rows.push(['Expediciones', 'Sin expedición asignada']);
      if (src) rows.push(['Fuente', src]);
      body.push(html`<section class="pm-sec">${App.kv(rows)}</section>`);
      if (it.c07) {
        body.push(html`<section class="pm-sec"><h4 class="pm-sec-h">Palés de ${(D.chamber_c07 || {}).code} en esta expedición</h4>
          <table class="pm-mini-tbl"><tbody>${it.c07.lots.map((l) => html`<tr><td>${App.lotTag(l.lot, { icon: false })}<span class="pm-muted-line">${l.product}</span></td><td class="num">${fmt.plural(l.pallets, 'palé', 'palés')}</td><td class="num muted">calle ${l.lane}</td></tr>`)}</tbody></table>
          ${App.callout({ tone: model.alarm === 'approved' ? 'crit' : 'warn', icon: model.alarm === 'approved' ? 'lock' : 'alert-triangle', body: model.alarm === 'approved' ? 'Estos palés tienen bloqueo de calidad: la carga se replanifica.' : `La carga depende de la decisión de Calidad sobre la excursión de ${(D.chamber_c07 || {}).code}.` })}</section>`);
      }
    } else if (it.kind === 'line') {
      const rows = it.members.map((c) => model.items[c]).filter(Boolean).sort((a, b) => (TYPE_COL[a.type] || 0) - (TYPE_COL[b.type] || 0));
      const ghosts = (model.ghosts[it.code] || []).map((c) => model.items[c]).filter(Boolean);
      body.push(html`<section class="pm-sec"><h4 class="pm-sec-h">Equipos de la línea</h4>
        <table class="pm-mini-tbl"><tbody>${rows.map((m) => html`<tr class="is-link" data-pm-go="${m.code}"><td><span class="code">${m.code}</span><span class="pm-muted-line">${fmt.cap(m.short || '')}</span></td><td class="num">${m.kind === 'machine' ? m.value : ''}</td><td class="right">${m.status === 'none' ? html`<span class="muted xs">sin indicador</span>` : chip(STATUS_TONE[m.status], STATUS_LABEL[m.status])}</td></tr>`)}
        ${ghosts.map((m) => html`<tr class="is-link" data-pm-go="${m.code}"><td><span class="code">${m.code}</span><span class="pm-muted-line">${fmt.cap(m.short || '')} · compartido con ${m.line}</span></td><td></td><td class="right">${m.status === 'none' ? '' : chip(STATUS_TONE[m.status], STATUS_LABEL[m.status])}</td></tr>`)}</tbody></table></section>`);
    } else if (it.kind === 'area') {
      if (it.zone === 'laboratorio') {
        const pend = [];
        const dm = (D.machines || []).find((m) => m.metric === 'hours_since_verification' && m.status === 'critical');
        if (dm) pend.push(html`<li><button type="button" class="link-btn" data-pm-go="${dm.code}">${dm.code}</button>: verificación con probetas (PCC), ${fmt.num(dm.reading)} h desde la última.</li>`);
        const es = (D.machines || []).find((m) => m.type === 'escaldador' && /peroxidasa/.test(m.note || ''));
        if (es) pend.push(html`<li><button type="button" class="link-btn" data-pm-go="${es.code}">${es.code}</button>: ensayo de peroxidasa (agua a ${valText(es.reading, es.unit)}).</li>`);
        body.push(html`<section class="pm-sec"><h4 class="pm-sec-h">Verificaciones que pide el parte de las ${READ_TIME}</h4>${pend.length ? html`<ul class="pm-ul">${pend}</ul>` : html`<p class="pm-p muted">Ninguna.</p>`}</section>`);
        body.push(html`<section class="pm-sec">${App.kv([['Registros', 'PCC, APPCC y ensayos de recepción, proceso y producto'], ['Fuente', src]])}</section>`);
      } else {
        const c = D.campaign || {};
        const rows = [['Función', fmt.cap(it.short || '')]];
        if (c.note) rows.push([`Campaña ${fmt.dayMonth(c.date)}`, fmt.text(c.note)]);
        if (c.rule_field_to_tunnel_max_min) rows.push(['Campo → túnel', `≤ ${c.rule_field_to_tunnel_max_min} min`]);
        if (c.operating_hours) rows.push(['Horario de recepción', `${c.operating_hours.start}–${c.operating_hours.end} · franjas de ${c.slot_minutes} min`]);
        if (src) rows.push(['Fuente', src]);
        body.push(html`<section class="pm-sec">${App.kv(rows)}</section>`);
        const tun = c.tunnels && Object.entries(c.tunnels).find(([, v]) => v.note);
        if (tun) body.push(html`<section class="pm-sec">${App.callout({ tone: 'warn', icon: 'snowflake', title: `${tun[0]} · entrada de mañana`, body: fmt.text(tun[1].note) })}</section>`);
      }
    }
    if (it.kind !== 'machine' && !(it.kind === 'chamber' && it.code === (D.chamber_c07 || {}).code)) body.push(relChips(it, model));

    const acts = [];
    if (it.code === (D.chamber_c07 || {}).code) {
      acts.push(html`<button type="button" class="btn btn-primary btn-sm" data-go="alarma">${icon('thermometer', 15)}<span>Abrir alarma ${it.code}</span></button>`);
      if (opts.filter !== 'c07') acts.push(html`<button type="button" class="btn btn-secondary btn-sm" data-pm-filter="c07">${icon('pallet', 15)}<span>Ver palés en el plano</span></button>`);
    }
    if (opts.panelActions) { const extra = opts.panelActions(it); if (extra) acts.push(extra); }
    return String(html`<div class="pm-panel-head">
        <div class="pm-panel-titles">
          <div class="pm-kicker">${chips.length ? html`<span class="pm-panel-chips">${chips}</span>` : ''}<span class="pm-kicker-t">${zoneName}</span></div>
          <h3 class="pm-panel-title">${it.name}</h3>
        </div>
        <button type="button" class="icon-btn pm-close" data-pm-close aria-label="Cerrar el detalle">${icon('x', 18)}</button>
      </div>
      <div class="pm-panel-body">${body}</div>
      ${acts.length ? html`<div class="pm-panel-foot">${acts}</div>` : ''}`);
  }

  /* ================================================================ Componente */

  const COLD_CODES = (model) => {
    const s = new Set();
    Object.values(model.items).forEach((it) => {
      if (COLD_TYPES.has(it.type) || it.kind === 'silo' || it.kind === 'chamber' || it.kind === 'dock') s.add(it.code);
    });
    return s;
  };

  function plantMap(options) {
    const opts = Object.assign({ variant: 'full', filter: 'all', toolbar: true }, options || {});
    if (opts.panel == null) opts.panel = opts.variant !== 'mini';
    if (opts.pallets == null) opts.pallets = opts.variant === 'mini';
    const uid = App.uid ? App.uid('pm') : 'pm' + Math.random().toString(36).slice(2, 8);
    const mini = opts.variant === 'mini';
    const minW = mini ? MINI_MIN : FULL_MIN;
    const scrollBelow = mini ? 420 : 720;
    let model = buildModel(opts);
    let selected = opts.selected && model.items[opts.selected] ? opts.selected : null;
    let filter = FILTERS.some((f) => f.value === opts.filter) ? opts.filter : 'all';
    let lastW = 0;
    let destroyed = false;

    const root = document.createElement('div');
    root.className = `pm pm-${mini ? 'mini' : 'full'}`;
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', mini ? 'Plano de la cadena de frío de Fustiñana' : 'Plano de planta de Fustiñana');
    const legend = html`<div class="pm-legend" aria-label="Leyenda">
      <span class="pm-lg"><i class="pm-sw pm-sw-crit"></i>Crítico</span>
      <span class="pm-lg"><i class="pm-sw pm-sw-warn"></i>Aviso</span>
      <span class="pm-lg"><i class="pm-sw pm-sw-ok"></i>En rango</span>
      <span class="pm-lg"><i class="pm-sw pm-sw-none"></i>Sin indicador en el parte</span>
      ${mini ? '' : html`<span class="pm-lg"><i class="pm-sw-pcc">PCC</i>Punto de control crítico</span>
      <span class="pm-lg"><i class="pm-sw-ot">${icon('wrench', 10)}</i>Orden o ticket</span>`}
    </div>`;
    root.innerHTML = String(html`
      ${opts.toolbar ? html`<div class="pm-toolbar">${legend}${mini ? '' : html`<div class="pm-filter">${App.segmented({ name: 'pm-filter', label: 'Resaltar en el plano', value: filter, options: FILTERS })}</div>`}</div>` : ''}
      <div class="pm-overlay-note" hidden></div>
      <div class="pm-stage">
        <div class="pm-scroll"><div class="pm-canvas"></div></div>
        <div class="pm-tip" role="tooltip" hidden></div>
        <aside class="pm-panel" hidden></aside>
      </div>
      <div class="pm-hint" hidden>${icon('arrow-right', 14)}<span>Desliza para recorrer toda la planta</span></div>`);
    const stage = root.querySelector('.pm-stage');
    const scroller = root.querySelector('.pm-scroll');
    const canvas = root.querySelector('.pm-canvas');
    const tip = root.querySelector('.pm-tip');
    const panel = root.querySelector('.pm-panel');
    const hint = root.querySelector('.pm-hint');
    const note = root.querySelector('.pm-overlay-note');

    function relatedSet() {
      const s = new Map();
      if (filter === 'c07' || (mini && opts.pallets)) {
        Object.keys(model.pallets.silos).forEach((c) => s.set(c, 'warn'));
        Object.keys(model.pallets.docks).forEach((c) => s.set(c, 'warn'));
      }
      if (selected && model.items[selected]) model.items[selected].related.forEach((r) => s.set(r.code, r.tone || 'brand'));
      s.delete(selected);
      return s;
    }
    function dimFn() {
      const c07 = (D.chamber_c07 || {}).code;
      if (filter === 'alerts') return (code) => { const it = model.items[code]; return !(it && /critical|warning|blocked/.test(it.status)) && code !== selected; };
      if (filter === 'cold') { const cold = COLD_CODES(model); return (code) => !cold.has(code) && code !== selected; }
      if (filter === 'c07') {
        const keep = new Set([c07, 'EV-07', 'P-07'].concat(Object.keys(model.pallets.silos), Object.keys(model.pallets.docks)));
        return (code) => !keep.has(code) && code !== selected;
      }
      return () => false;
    }

    function render() {
      if (destroyed) return;
      const sw = Math.round(stage.clientWidth || 0);
      const avail = sw || 1100;
      const W = Math.max(avail, minW);
      const mode = avail >= minW ? 'fit' : avail >= scrollBelow ? 'scale' : 'scroll';
      lastW = sw;
      const c07sel = selected === (D.chamber_c07 || {}).code;
      const st = { model, selected, related: relatedSet(), dim: dimFn(), overlay: filter === 'c07' || (mini && opts.pallets) || c07sel };
      const r = mini ? renderMini(model, W, st) : renderFull(model, W, st);
      const mk = `${uid}-arrow`;
      const svg = `<svg class="pm-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r.W} ${r.H}" width="${mode === 'scale' ? '100%' : r.W}" ${mode === 'scale' ? '' : `height="${r.H}"`} role="group" aria-label="${mini ? 'Cadena de frío: producción, almacén automático, cámaras y muelles' : 'Esquema de la planta: recepción, líneas, almacén automático, cámaras, muelles y servicios'}" focusable="false">
        <defs><marker id="${mk}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path class="pm-arrowhead" d="M0.5 0.8 7.2 4 0.5 7.2z"/></marker></defs>
        ${r.body.split('__MK__').join(mk)}
      </svg>`;
      const hadFocus = root.contains(document.activeElement) && document.activeElement.closest && document.activeElement.closest('[data-pm]');
      const focusCode = hadFocus ? hadFocus.getAttribute('data-pm') : null;
      canvas.innerHTML = svg;
      root.classList.toggle('is-scroll', mode === 'scroll');
      root.classList.toggle('is-scale', mode === 'scale');
      hint.hidden = mode !== 'scroll';
      if (focusCode) { const el = canvas.querySelector(`[data-pm="${cssEsc(focusCode)}"]`); if (el) el.focus({ preventScroll: true }); }
      renderNote();
      renderPanel();
    }

    function renderNote() {
      if (filter !== 'c07' || mini) { note.hidden = true; note.innerHTML = ''; return; }
      const p = model.pallets;
      const docks = Object.keys(p.docks).sort();
      note.hidden = false;
      note.innerHTML = String(html`${icon('pallet', 16)}<span><strong>${p.c07.pallets} palés</strong> de ${p.c07.lots.length} lotes en ${(D.chamber_c07 || {}).code} durante la excursión · <strong>${p.inSilos} palés</strong> de los mismos lotes en ${fmt.list(Object.keys(p.silos).sort())} (a evaluar) · ${docks.length} expediciones planificadas en los muelles ${fmt.list(docks)}</span>`);
    }

    function renderPanel() {
      if (!opts.panel) { panel.hidden = true; return; }
      const it = selected ? model.items[selected] : null;
      if (!it) { panel.hidden = true; panel.innerHTML = ''; root.classList.remove('has-panel'); return; }
      const g = canvas.querySelector(`[data-pm="${cssEsc(selected)}"]`);
      let side = 'right';
      if (g) {
        const rs = stage.getBoundingClientRect();
        const rg = g.getBoundingClientRect();
        if (rs.width && (rg.left + rg.width / 2 - rs.left) > rs.width * 0.52) side = 'left';
      }
      panel.setAttribute('data-side', side);
      panel.setAttribute('aria-label', `Detalle de ${it.name}`);
      panel.innerHTML = panelHTML(it, model, { filter, panelActions: opts.panelActions });
      panel.hidden = false;
      root.classList.add('has-panel');
    }

    function showTip(g) {
      const code = g.getAttribute('data-pm');
      const it = model.items[code];
      if (!it || (code === selected && opts.panel && !panel.hidden)) return hideTip();
      tip.innerHTML = tipHTML(it, model);
      tip.hidden = false;
      const rs = stage.getBoundingClientRect();
      const rg = g.getBoundingClientRect();
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      let x = rg.left - rs.left + rg.width / 2 - tw / 2;
      x = clamp(x, 4, Math.max(4, rs.width - tw - 4));
      let y = rg.top - rs.top - th - 8;
      if (rg.top - th - 8 < 8) y = rg.bottom - rs.top + 8;
      tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }
    function hideTip() { tip.hidden = true; }

    function select(code, via) {
      const next = code && model.items[code] ? code : null;
      if (next === selected && via !== 'force') return;
      selected = next;
      hideTip();
      render();
      if (typeof opts.onSelect === 'function') { try { opts.onSelect(selected, selected ? model.items[selected] : null); } catch (e) { console.error(e); } }
      root.dispatchEvent(new CustomEvent('plantselect', { bubbles: true, detail: { code: selected } }));
      if (selected && via === 'key') { const p = panel.querySelector('.pm-close'); if (p && !panel.hidden) p.focus({ preventScroll: true }); }
      if (selected && opts.panel && via === 'click' && !panel.hidden && getComputedStyle(panel).position === 'static') {
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    function setFilter(v) {
      const val = FILTERS.some((f) => f.value === v) ? v : 'all';
      if (val === filter) return;
      filter = val;
      const seg = root.querySelector('[data-seg="pm-filter"]');
      if (seg) seg.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-pressed', b.getAttribute('data-value') === val ? 'true' : 'false'));
      render();
      if (typeof opts.onFilter === 'function') { try { opts.onFilter(filter); } catch (e) { console.error(e); } }
      root.dispatchEvent(new CustomEvent('plantfilter', { bubbles: true, detail: { value: filter } }));
    }

    /* Eventos */
    stage.addEventListener('pointerover', (e) => {
      if (e.pointerType === 'touch') return;
      const g = e.target.closest && e.target.closest('.pm-canvas [data-pm]');
      if (g) showTip(g);
    });
    stage.addEventListener('pointerout', (e) => {
      const g = e.target.closest && e.target.closest('.pm-canvas [data-pm]');
      if (g && !(e.relatedTarget && g.contains(e.relatedTarget))) hideTip();
    });
    stage.addEventListener('focusin', (e) => {
      const g = e.target.closest && e.target.closest('.pm-canvas [data-pm]');
      if (g && g.matches(':focus-visible')) showTip(g);
    });
    stage.addEventListener('focusout', (e) => { if (e.target.closest && e.target.closest('.pm-canvas [data-pm]')) hideTip(); });
    root.addEventListener('click', (e) => {
      const t0 = e.target;
      if (!t0 || !t0.closest) return;
      const close = t0.closest('[data-pm-close]');
      if (close) { const prev = selected; select(null); const g = prev && canvas.querySelector(`[data-pm="${cssEsc(prev)}"]`); if (g) g.focus({ preventScroll: true }); return; }
      const goEl = t0.closest('[data-pm-go]');
      if (goEl) { select(goEl.getAttribute('data-pm-go'), 'click'); return; }
      const fEl = t0.closest('[data-pm-filter]');
      if (fEl) { setFilter(fEl.getAttribute('data-pm-filter')); return; }
      const g = t0.closest('.pm-canvas [data-pm]');
      if (g) { select(g.getAttribute('data-pm'), 'click'); return; }
      if (t0.closest('.pm-canvas') && opts.panel) select(null);
    });
    root.addEventListener('keydown', (e) => {
      const g = e.target.closest && e.target.closest('.pm-canvas [data-pm]');
      if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(g.getAttribute('data-pm'), 'key'); return; }
      if (e.key === 'Escape' && selected) {
        e.preventDefault();
        const prev = selected;
        select(null);
        const el = canvas.querySelector(`[data-pm="${cssEsc(prev)}"]`);
        if (el) el.focus({ preventScroll: true });
      }
    });
    root.addEventListener('segchange', (e) => { if (e.detail && e.detail.name === 'pm-filter') setFilter(e.detail.value); });
    scroller.addEventListener('scroll', hideTip, { passive: true });

    let raf = 0;
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
      if (!root.isConnected) { ro.disconnect(); return; }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { if (Math.round(stage.clientWidth) !== lastW) render(); });
    }) : null;
    if (ro) ro.observe(stage);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!destroyed && root.isConnected) render(); }).catch(() => {});

    render();

    root.plantMap = {
      select: (code) => select(code),
      setFilter,
      update(o2) {
        Object.assign(opts, o2 || {});
        model = buildModel(opts);
        if (selected && !model.items[selected]) selected = null;
        render();
      },
      refresh() { model = buildModel(opts); render(); },
      item: (code) => model.items[code] || null,
      items: () => Object.assign({}, model.items),
      get selected() { return selected; },
      get filter() { return filter; },
      destroy() { destroyed = true; if (ro) ro.disconnect(); root.remove(); }
    };
    return root;
  }

  function cssEsc(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'); }

  App.plantMap = plantMap;
})();
