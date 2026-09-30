/*
 * Escena «retirada» · Simulacro de retirada (SPEC §4.5, ronda wow W3 y W4).
 *  - Punto de partida: un lote, todos los lotes de una parcela o un granel de campaña.
 *  - Genealogía hacia atrás y hacia delante (campo → recepción → granel → lote → palés → expediciones → clientes),
 *    balance de masas en kg, palés por SSCC, clientes a notificar con vista previa del aviso y una aprobación.
 *  - Todo sale de window.CN_DATA; las mermas por etapa (FLOWS) son datos sintéticos que cuadran con él.
 *  - Código desconocido: no se inventa nada («No encuentro … en SAP/Mapex»). Rechazar no aplica ninguna acción.
 *  - render() es idempotente: el resultado se guarda en ctx.local y se repinta al volver o recargar.
 */
(function () {
  'use strict';

  const { html, icon, fmt, chip, sys } = App;
  const D = window.CN_DATA;
  const ROLE = D.roles;
  const TODAY = D.meta.today;
  const TOMORROW = D.meta.tomorrow;
  const AG_TRACE = 'Trazabilidad';
  const AG_BAL = 'Balance de masas';
  const AG_REC = 'Registro y avisos';
  const actorOf = (a) => `Prodigy · agente ${a}`;
  const LOT_IDS = Object.keys(D.lots);
  const DEFAULTS = { lote: 'L26-261-FUS-GUI-03', parcela: 'P-0412-07', granel: 'G26-176-FUS-GUI' };
  const MODES = {
    lote: { label: 'Lote', noun: 'el lote', field: 'Código de lote', icon: 'layers', format: 'L26-261-FUS-GUI-03', where: 'SAP/Mapex' },
    parcela: { label: 'Parcela', noun: 'la parcela', field: 'Código de parcela', icon: 'leaf', format: 'P-0412-07', where: 'SAP' },
    granel: { label: 'Granel', noun: 'el granel', field: 'Código de granel', icon: 'box', format: 'G26-176-FUS-GUI', where: 'SAP/Mapex' }
  };
  const COUNTRY = { ES: 'España', UK: 'Reino Unido', FR: 'Francia', US: 'Estados Unidos' };
  const STORE = {
    'SIL-1': 'Silo automático 1 (Fustiñana)', 'SIL-2': 'Silo automático 2 (Fustiñana)', 'SIL-3': 'Silo automático 3 (Fustiñana)', 'SIL-4': 'Silo automático 4 (Fustiñana)',
    'C-07': 'Cámara de expedición 7 (Fustiñana)', 'ALF-C1': 'Cámara de granel C1 (Alcorioja)', 'ARG-C3': 'Cámara C3 (Arguedas)'
  };
  const BRC_LIMIT_S = 4 * 3600;
  const CN_FROM = (D.complaint && D.complaint.headers && D.complaint.headers.To) || 'Calidad, Congelados de Navarra';
  const lotsInC07 = new Set(D.lots_in_c07.map((l) => l.lot));

  /*
   * Mermas declaradas en MES Mapex por etapa (partes de producción) y granel restante en Mecalux Easy WMS.
   * Datos sintéticos coherentes con CN_DATA: la entrada es el ticket de báscula (net_t) y la salida, los kg de
   * cada lote. Por recepción: entrada = mermas + producto (o consumo en la mezcla) + granel restante + diferencia,
   * con una diferencia sin justificar por debajo del 0,5 %. [etapa, concepto, kg]
   */
  const FLOWS = {
    'REC-26-18233': {
      phases: [{ title: 'Proceso en L2', date: '2026-08-19', stages: [
        ['LIM-2', 'Vaina, hoja y tierra (aventado)', 1990],
        ['LIM-2', 'Guisante partido y bajo calibre (cribas), a alimentación animal', 3010],
        ['DP-2', 'Piedras y terrones', 24],
        ['ESC-2', 'Escaldado: exudado y arrastre', 1105],
        ['TUN-2', 'Congelación IQF: deshidratación', 410],
        ['OPT-2', 'Rechazo de la selectora óptica (1,6 % del flujo)', 289],
        ['ENV-4', 'Sobrellenado de bolsas (0,5 %)', 88],
        ['ENV-4', 'Bolsas rechazadas y muestras de retención', 21]
      ] }]
    },
    'REC-26-09412': {
      bulk: { kg: 20400, units: 24, used: 21, usedKg: 17850 },
      stock: { kg: 2550, units: 3 },
      phases: [
        { title: 'Campaña en L2 · granel', date: '2026-06-25', stages: [
          ['LIM-2', 'Vaina, hoja y tierra (aventado)', 1540],
          ['LIM-2', 'Guisante partido y bajo calibre (cribas), a alimentación animal', 2190],
          ['DP-2', 'Piedras y terrones', 31],
          ['ESC-2', 'Escaldado: exudado y arrastre', 1150],
          ['TUN-2', 'Congelación IQF: deshidratación', 440],
          ['OPT-2', 'Rechazo de la selectora óptica (1,5 % del flujo)', 311]
        ] },
        { title: 'Reenvasado en L4', date: '2026-09-18', stages: [
          ['CRB-4', 'Terrones de hielo y guisante partido (criba)', 118],
          ['ENV-2', 'Sobrellenado de bolsas (0,5 %)', 88],
          ['ENV-2', 'Bolsas rechazadas y muestras de retención', 21]
        ] }
      ]
    },
    'REC-26-06120': {
      bulk: { kg: 13950, units: 34, used: 32, usedKg: 13190 },
      stock: { kg: 760, units: 2 },
      phases: [
        { title: 'Campaña en L3 · granel', date: '2026-05-12', stages: [
          ['COR-3', 'Floreteado: tallo y hoja, a subproducto', 3680],
          ['ESC-3', 'Escaldado: exudado', 330],
          ['TUN-1', 'Congelación IQF: deshidratación', 185],
          ['OPT-3', 'Rechazo de la selectora óptica (1,5 % del flujo)', 213]
        ] },
        { title: 'Reenvasado en L4', date: '2026-09-15', stages: [
          ['CRB-4', 'Terrones de hielo y florete roto (criba)', 96],
          ['ENV-1', 'Sobrellenado de bolsas (0,6 %)', 78],
          ['ENV-1', 'Bolsas rechazadas y muestras de retención', 24]
        ] }
      ]
    },
    'REC-26-04877': {
      bulk: { kg: 11430, units: 14, used: 12, usedKg: 9700 },
      stock: { kg: 1730, units: 2 },
      phases: [
        { title: 'Campaña en Alcorioja (ALF-L1) · granel', date: '2026-04-08', stages: [
          ['LAV-A1', 'Lavado: tierra, tallo y hoja dañada', 1365],
          ['ESC-A1', 'Escaldado y escurrido', 2050],
          ['PRT-A1', 'Porcionado: recortes', 176],
          ['TUN-A2', 'Congelación IQF: deshidratación', 142]
        ] },
        { title: 'Envasado en Alcorioja (ALF-L2)', date: '2026-09-12', stages: [
          ['ENV-A2', 'Sobrellenado de bolsas (0,6 %)', 58],
          ['ENV-A2', 'Bolsas rechazadas y muestras de retención', 19]
        ] }
      ]
    },
    'REC-26-21045': {
      phases: [{ title: 'Proceso en L3', date: '2026-09-16', stages: [
        ['LIM-3', 'Limpieza: hoja, tierra y vaina dañada', 830],
        ['COR-3', 'Despuntado: puntas y recortes', 2620],
        ['COR-3', 'Trozos fuera de calibre, a subproducto', 1230],
        ['ESC-3', 'Escaldado: exudado', 430],
        ['TUN-2', 'Congelación IQF: deshidratación', 300],
        ['OPT-3', 'Rechazo de la selectora óptica (1,2 % del flujo)', 197],
        ['ENV-3', 'Sobrellenado de bolsas (0,6 %)', 96],
        ['ENV-3', 'Bolsas rechazadas y muestras de retención', 53]
      ] }]
    },
    'REC-26-21390': {
      phases: [{ title: 'Proceso en L1', date: '2026-09-20', stages: [
        ['DES-1', 'Desgranado: zuro (corazón de la mazorca)', 11380],
        ['DES-1', 'Brácteas y sedas', 975],
        ['LAV-1', 'Lavado: restos de zuro, piel y grano dañado', 650],
        ['ESC-1', 'Escaldado: exudado', 390],
        ['TUN-1', 'Congelación IQF: deshidratación', 260],
        ['OPT-1', 'Rechazo de la selectora óptica (1,5 % del flujo)', 283],
        ['ENV-3', 'Sobrellenado de bolsas (1,0 %)', 181],
        ['ENV-3', 'Bolsas rechazadas y muestras de retención', 165],
        ['DM-1', 'Bolsas expulsadas por el detector de metales', 12]
      ] }]
    },
    'REC-26-19905': {
      stock: { kg: 3720, units: 6 },
      phases: [{ title: 'Grill en Arguedas (ARG-G1) · granel', date: '2026-08-28', stages: [
        [null, 'Preparación: pedúnculo y semillas', 1410],
        ['GRL-1', 'Asado y pelado: piel y pérdida de agua', 4350],
        ['TUN-A1', 'Congelación IQF: deshidratación', 95]
      ] }]
    },
    'REC-26-19511': {
      stock: { kg: 5670, units: 9 },
      phases: [{ title: 'Grill en Arguedas (ARG-G1) · granel', date: '2026-08-24', stages: [
        [null, 'Preparación: despuntado y corte en rodajas', 1130],
        ['GRL-1', 'Plancha: pérdida de agua', 3950],
        ['TUN-A1', 'Congelación IQF: deshidratación', 130]
      ] }]
    },
    'REC-26-19730': {
      stock: { kg: 3620, units: 6 },
      phases: [{ title: 'Grill en Arguedas (ARG-G1) · granel', date: '2026-08-26', stages: [
        [null, 'Preparación: pedúnculo y corte', 860],
        ['GRL-1', 'Plancha: pérdida de agua', 2880],
        ['TUN-A1', 'Congelación IQF: deshidratación', 85]
      ] }]
    },
    'REC-26-18010': {
      stock: { kg: 3770, units: 6 },
      phases: [{ title: 'Grill en Arguedas (ARG-G1) · granel', date: '2026-08-17', stages: [
        [null, 'Preparación: pelado y despuntado', 1220],
        ['GRL-1', 'Asado: pérdida de agua', 2960],
        ['TUN-A1', 'Congelación IQF: deshidratación', 90]
      ] }]
    },
    'MIX:L26-262-FUS-MIX-02': {
      input: 10580,
      phases: [{ title: 'Mezcla y envasado en L5', date: '2026-09-19', stages: [
        ['DOS-5', 'Dosificación: derrames y ajuste de receta', 14],
        ['MZ-5', 'Mezcla: pieza rota, a subproducto', 22],
        ['ENV-5', 'Sobrellenado de bolsas (0,8 %)', 83],
        ['ENV-5', 'Bolsas rechazadas y muestras de retención', 58],
        ['DM-4', 'Bolsas expulsadas por el detector de metales', 6]
      ] }]
    }
  };

  /* ---------------------------------------------------------------- Utilidades */

  const norm = (s) => String(s == null ? '' : s).trim().toUpperCase();
  const sum = (arr, f) => arr.reduce((s, x) => s + (f ? f(x) : x), 0);
  const uniq = (arr) => Array.from(new Set(arr));
  function uniqBy(arr, key) { const seen = new Set(); return arr.filter((x) => { const k = typeof key === 'function' ? key(x) : x[key]; if (seen.has(k)) return false; seen.add(k); return true; }); }
  const pct1 = (v) => fmt.pct(v, 1);
  const storeLabel = (code) => STORE[code] || code;
  function whenText(date, time) {
    if (date === TODAY) return `hoy a las ${time}`;
    if (date === TOMORROW) return `mañana (${fmt.dayMonth(date)}) a las ${time}`;
    return `${fmt.date(date)} a las ${time}`;
  }
  function shortWhen(date, time) {
    if (date === TODAY) return `hoy ${time}`;
    if (date === TOMORROW) return `mañana ${time}`;
    return `${fmt.dayMonth(date)} ${time}`;
  }
  function secondsBetween(a, b) { const x = Date.parse(`${a}Z`); const y = Date.parse(`${b}Z`); return isNaN(x) || isNaN(y) ? 0 : Math.max(0, Math.round((y - x) / 1000)); }
  function addMs(iso, ms) {
    const d = new Date(Date.parse(`${iso}Z`) + ms);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
  }
  const ssccList = (list) => list.map((p) => p.sscc);

  /* ---------------------------------------------------------------- Genealogía (desde CN_DATA) */

  /** Materia prima de un lote: una entrada por recepción (la mezcla tiene una por componente). */
  function upstreamOf(lotId) {
    const L = D.lots[lotId];
    const o = L.info.origin || {};
    if (o.type === 'mezcla') {
      return (o.components || []).map((c) => {
        const eq = D.equipment[(c.route || [])[0]];
        return { lot: lotId, intake: c.intake, parcels: c.parcels || [], grower: c.grower, crop: c.name,
          bulk: { code: c.bulk_lot, date: c.process_date, line: eq ? eq.line : c.plant, storage: c.bulk_storage, plant: c.plant, route: c.route || [] },
          component: { name: c.name, share: c.share_pct } };
      });
    }
    const crop = (D.parcels[(o.parcels || [])[0]] || {}).crop || '';
    return [{ lot: lotId, intake: o.intake, parcels: o.parcels || [], grower: o.grower, crop,
      bulk: o.type === 'granel' ? { code: o.bulk_lot, date: o.bulk_date, line: o.bulk_line, storage: o.bulk_storage, plant: L.info.plant, route: o.bulk_route || [] } : null,
      component: null }];
  }
  const ALL_UPS = [].concat(...LOT_IDS.map(upstreamOf));

  function flowOf(u) {
    const f = FLOWS[u.intake.ticket];
    if (!f) return null;
    const inKg = Math.round(Number(u.intake.net_t) * 1000);
    const stages = [].concat(...f.phases.map((p) => p.stages.map(([eq, label, kg]) => ({ eq, label, kg, phase: p.title, date: p.date }))));
    const outs = [];
    if (u.component) {
      const mix = FLOWS[`MIX:${u.lot}`];
      outs.push({ kind: 'consumo', lot: u.lot, label: `Consumo en la mezcla ${u.lot}`, sub: `${fmt.pct(u.component.share, 0)} de la receta · dosificación DOS-5`, kg: Math.round((mix.input * u.component.share) / 100) });
    } else {
      const L = D.lots[u.lot];
      outs.push({ kind: 'lot', label: `Producto terminado ${u.lot}`, sub: `${fmt.plural(L.info.pallets_produced, 'palé', 'palés')} · ${L.info.product_name}`, kg: L.info.kg_total });
    }
    if (f.stock && u.bulk) outs.push({ kind: 'stock', label: `Granel restante ${u.bulk.code}`, sub: `${fmt.plural(f.stock.units, 'octavín', 'octavines')} en ${storeLabel(u.bulk.storage)}`, kg: f.stock.kg, units: f.stock.units, where: u.bulk.storage });
    const losses = sum(stages, (s) => s.kg);
    const diff = inKg - losses - sum(outs, (o) => o.kg);
    return { key: u.intake.ticket, kind: 'intake', u, f, inKg, stages, phases: f.phases, outs, losses, diff,
      title: u.bulk ? `Recepción ${u.intake.ticket} → granel ${u.bulk.code}` : `Recepción ${u.intake.ticket} → lote ${u.lot}`,
      inLabel: `Recibido · ${u.intake.ticket}`, inSub: `${fmt.date(u.intake.date)} ${u.intake.time} · ${u.grower} · ${fmt.list(u.parcels)}` };
  }
  function mixFlowOf(lotId) {
    const f = FLOWS[`MIX:${lotId}`];
    if (!f) return null;
    const L = D.lots[lotId];
    const stages = [].concat(...f.phases.map((p) => p.stages.map(([eq, label, kg]) => ({ eq, label, kg, phase: p.title, date: p.date }))));
    const outs = [{ kind: 'lot', label: `Producto terminado ${lotId}`, sub: `${fmt.plural(L.info.pallets_produced, 'palé', 'palés')} · ${L.info.product_name}`, kg: L.info.kg_total }];
    const losses = sum(stages, (s) => s.kg);
    return { key: `MIX:${lotId}`, kind: 'mix', inKg: f.input, stages, phases: f.phases, outs, losses, diff: f.input - losses - sum(outs, (o) => o.kg),
      title: `Mezcla ${lotId}`, inLabel: 'Graneles dosificados (4 componentes)', inSub: `Receta ${(L.info.origin.components || []).map((c) => fmt.pct(c.share_pct, 0)).join(' / ')}` };
  }

  const scopeCache = {};
  /** Alcance del simulacro o null si el código no existe (no se inventa nada). */
  function findScope(mode, raw) {
    const code = norm(raw);
    if (!code || !MODES[mode]) return null;
    const key = `${mode}|${code}`;
    if (scopeCache[key] !== undefined) return scopeCache[key];
    let lots = [];
    if (mode === 'lote') lots = D.lots[code] ? [code] : [];
    else if (mode === 'parcela') lots = LOT_IDS.filter((id) => upstreamOf(id).some((u) => u.parcels.includes(code)));
    else lots = LOT_IDS.filter((id) => upstreamOf(id).some((u) => u.bulk && u.bulk.code === code));
    scopeCache[key] = lots.length ? buildScope(mode, code, lots) : null;
    return scopeCache[key];
  }

  function buildScope(mode, code, lotIds) {
    const all = [].concat(...lotIds.map(upstreamOf));
    const U = mode === 'lote' ? all : all.filter((u) => (mode === 'parcela' ? u.parcels.includes(code) : !!(u.bulk && u.bulk.code === code)));
    const lots = lotIds.map((id) => D.lots[id]);
    const intakes = uniqBy(U.map((u) => u.intake), 'ticket');
    const parcels = uniq([].concat(...U.map((u) => u.parcels)));
    const bulks = uniqBy(U.filter((u) => u.bulk).map((u) => u.bulk), 'code');
    const pallets = [].concat(...lots.map((L) => L.forward.pallets));
    const shipMap = new Map();
    lots.forEach((L) => (L.forward.shipments || []).forEach((s) => {
      const cur = shipMap.get(s.id) || Object.assign({}, s, { pallets: 0, lots: [] });
      cur.pallets += s.pallets;
      cur.lots.push({ lot: L.info.code, pallets: s.pallets });
      shipMap.set(s.id, cur);
    }));
    const shipments = Array.from(shipMap.values()).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    shipments.forEach((s) => {
      s.sscc = pallets.filter((p) => p.shipment === s.id || p.planned_shipment === s.id);
      s.kg = sum(s.sscc, (p) => p.kg);
    });
    const custMap = new Map();
    shipments.forEach((s) => {
      const c = D.customers[s.customer_id] || {};
      const cur = custMap.get(s.customer_id) || { id: s.customer_id, label: c.label || s.customer, country: c.country, channel: c.channel, end_customer: c.end_customer || s.end_customer || null, delivered: [], planned: [] };
      (s.status === 'expedida' ? cur.delivered : cur.planned).push(s);
      custMap.set(s.customer_id, cur);
    });
    const customers = Array.from(custMap.values()).sort((a, b) => (b.delivered.length - a.delivered.length) || a.label.localeCompare(b.label));
    const mixLots = mode === 'lote' ? lotIds.filter((id) => FLOWS[`MIX:${id}`]) : [];
    const flows = U.map(flowOf).filter(Boolean).concat(mixLots.map(mixFlowOf));
    const intakeFlows = flows.filter((f) => f.kind === 'intake');
    const received = sum(intakeFlows, (f) => f.inKg);
    const losses = sum(flows, (f) => f.losses);
    const produced = sum(lots, (L) => L.info.kg_total);
    const outsAll = [].concat(...flows.map((f) => f.outs));
    const toProduct = sum(outsAll.filter((o) => o.kind === 'lot' || (o.kind === 'consumo' && !mixLots.includes(o.lot))), (o) => o.kg);
    const toMixOnly = outsAll.some((o) => o.kind === 'consumo') && !mixLots.length;
    const bulkLeft = sum(flows, (f) => sum(f.outs.filter((o) => o.kind === 'stock'), (o) => o.kg));
    const diff = sum(flows, (f) => f.diff);
    const absDiff = sum(flows, (f) => Math.abs(f.diff));
    const shippedKg = sum(pallets.filter((p) => p.status === 'expedido'), (p) => p.kg);
    const stockPal = pallets.filter((p) => p.status !== 'expedido');
    const stockKg = sum(stockPal, (p) => p.kg);
    const product = lotIds.map((id) => {
      const L = D.lots[id];
      const pal = L.forward.pallets;
      const shipped = pal.filter((p) => p.status === 'expedido');
      const stock = pal.filter((p) => p.status !== 'expedido');
      const byLoc = uniq(stock.map((p) => p.location)).map((loc) => ({ loc, n: stock.filter((p) => p.location === loc).length, kg: sum(stock.filter((p) => p.location === loc), (p) => p.kg) }));
      const located = shipped.length + stock.length;
      return { lot: id, product: L.info.product_name, pallets: pal.length, produced: L.info.kg_total, shippedN: shipped.length, shippedKg: sum(shipped, (p) => p.kg), stockN: stock.length, stockKg: sum(stock, (p) => p.kg), byLoc, diff: L.info.kg_total - sum(pal, (p) => p.kg), located, locatedPct: (100 * located) / L.info.pallets_produced };
    });
    const otherLots = LOT_IDS.filter((id) => !lotIds.includes(id) && upstreamOf(id).some((u) => intakes.some((i) => i.ticket === u.intake.ticket) || (u.bulk && bulks.some((b) => b.code === u.bulk.code))));
    const startLot = mode === 'lote' ? D.lots[code] : null;
    const startBulk = mode === 'granel' ? bulks.find((b) => b.code === code) : null;
    const startParcel = mode === 'parcela' ? D.parcels[code] : null;
    const comingled = mode === 'parcela' ? parcels.filter((p) => p !== code) : [];
    return {
      mode, code, lotIds, lots, U, intakes, parcels, bulks, pallets, shipments, customers, flows, otherLots, product,
      startLot, startBulk, startParcel, comingled,
      label: `${MODES[mode].label} ${code}`,
      bal: { received, losses, produced, toProduct, toMixOnly, bulkLeft, diff, absDiff, reconciled: received ? (100 * (received - absDiff)) / received : 100, shippedKg, stockKg, stockN: stockPal.length, stages: sum(flows, (f) => f.stages.length) },
      notify: customers.filter((c) => c.delivered.length),
      retain: shipments.filter((s) => s.status !== 'expedida')
    };
  }

  function scopeHeadline(sc) {
    if (sc.mode === 'lote') { const i = sc.startLot.info; return `${i.product_name} · ${i.brand} · fabricado el ${fmt.date(i.production_date)} en ${i.line}`; }
    if (sc.mode === 'parcela') { const p = sc.startParcel; return `${fmt.cap(p.crop)} · ${p.grower} · ${p.municipality} · ${fmt.num(p.ha)} ha · ${fmt.plural(sc.lotIds.length, 'lote', 'lotes')}`; }
    const b = sc.startBulk; return `${fmt.cap(sc.U.find((u) => u.bulk && u.bulk.code === sc.code).crop)} · ${b.line} · ${fmt.date(b.date)} · ${storeLabel(b.storage)}`;
  }

  /* ---------------------------------------------------------------- Pasos del agente */

  function streamSteps(sc, code) {
    const nI = sc.intakes.length;
    const nB = sc.bulks.length;
    const b = sc.bal;
    const growers = uniq(sc.U.map((u) => u.grower));
    const shipped = sc.shipments.filter((s) => s.status === 'expedida');
    const planned = sc.retain;
    const countries = uniq(sc.customers.map((c) => COUNTRY[c.country] || c.country));
    const locs = uniq(sc.pallets.filter((p) => p.status !== 'expedido').map((p) => p.location));
    const locText = fmt.list([sc.pallets.some((p) => p.status === 'expedido') ? `${sc.pallets.filter((p) => p.status === 'expedido').length} expedidos` : null]
      .concat(locs.map((l) => `${sc.pallets.filter((p) => p.location === l).length} en ${l}`)));
    const langs = uniq(sc.customers.map((c) => (c.country === 'ES' ? 'español' : 'inglés')));
    let backAction;
    let backResult;
    let fabAction;
    let fabResult;
    if (sc.mode === 'parcela') {
      backAction = `Recepciones de la parcela ${sc.code} y otras parcelas de la misma descarga`;
      backResult = `${sc.intakes.map((i) => `${i.ticket} (${fmt.num(i.net_t)} t)`).join(', ')}${sc.comingled.length ? ` · la descarga incluye también ${fmt.list(sc.comingled)}` : ''}`;
      fabAction = 'Lotes fabricados con esas recepciones (órdenes de fabricación)';
      fabResult = sc.lots.map((L) => `${L.info.code} (${L.info.line}, ${fmt.dayMonth(L.info.production_date)})`).join(', ');
    } else {
      backAction = sc.mode === 'granel' ? `Hacia atrás: recepción y parcelas del granel ${sc.code}` : 'Hacia atrás: recepción, agricultor y parcelas';
      backResult = `${sc.intakes.map((i) => `${i.ticket} (${fmt.num(i.net_t)} t)`).join(', ')} · ${fmt.list(growers)} · ${fmt.list(sc.parcels)}`;
      fabAction = sc.mode === 'granel' ? `Consumos del granel ${sc.code} en órdenes de reenvasado` : 'Órdenes de fabricación, rutas de línea y consumos';
      fabResult = sc.lots.map((L) => {
        const o = L.info.origin;
        if (o.type === 'granel') return `Granel ${o.bulk_lot} (${o.bulk_line}, ${fmt.dayMonth(o.bulk_date)}) → ${L.info.code} en ${L.info.line} el ${fmt.dayMonth(L.info.production_date)}`;
        if (o.type === 'mezcla' && sc.mode !== 'lote') return sc.U.map((u) => `Granel ${u.bulk.code} (${fmt.pct(u.component.share, 0)} de la receta) → mezcla ${L.info.code} en ${L.info.line} el ${fmt.dayMonth(L.info.production_date)}`).join(' · ');
        if (o.type === 'mezcla') return `${fmt.plural(o.components.length, 'granel', 'graneles')} de Arguedas → mezcla en ${L.info.line} el ${fmt.dayMonth(L.info.production_date)}`;
        return `Proceso en ${L.info.line} el ${fmt.dayMonth(L.info.production_date)} · turno de ${L.info.shift}`;
      }).join(' · ');
    }
    const startResult = sc.mode === 'lote' ? `${sc.startLot.info.product_name} · ${sc.startLot.info.brand}` : scopeHeadline(sc);
    const notices = sc.customers.length;
    return [
      { agent: AG_TRACE, system: 'SAP', action: `Localiza el punto de partida: ${sc.label}`, result: startResult, ms: 180, reveal: 0 },
      { agent: AG_TRACE, system: 'SAP', action: backAction, result: backResult, ms: 420 + 90 * (nI - 1), tone: sc.comingled.length ? 'warn' : undefined, reveal: 1 },
      { agent: AG_TRACE, system: 'MES Mapex', action: fabAction, result: fabResult, ms: 560 + 80 * Math.max(0, nB - 1), reveal: 2 },
      { agent: AG_TRACE, system: 'SAP', action: 'Otros lotes fabricados con la misma materia prima', result: sc.otherLots.length ? `${fmt.list(sc.otherLots)}: entran en el alcance` : 'Ninguno: esta materia prima no se ha usado en otros lotes', ms: 380, reveal: 3 },
      { agent: AG_TRACE, system: 'Mecalux Easy WMS', action: 'Palés por SSCC, ubicación y reservas de expedición', result: `${sc.pallets.length} SSCC · ${locText}`, ms: Math.max(420, 610 + 6 * (sc.pallets.length - 22)), reveal: 4 },
      { agent: AG_TRACE, system: 'SAP', action: 'Expediciones y clientes', result: `${fmt.plural(sc.shipments.length, 'expedición', 'expediciones')} (${fmt.plural(shipped.length, 'entregada', 'entregadas')}, ${fmt.plural(planned.length, 'planificada', 'planificadas')}) · ${fmt.plural(sc.customers.length, 'cliente', 'clientes')} (${fmt.list(countries)})`, ms: 470 + 60 * (sc.shipments.length - 2), tone: planned.some((s) => s.date === TODAY) ? 'warn' : undefined, reveal: 5 },
      { agent: AG_BAL, system: 'MES Mapex', action: 'Mermas declaradas por etapa y granel restante', result: `${b.stages} conceptos · ${fmt.kg(b.losses)} de mermas${b.bulkLeft ? ` · granel restante ${fmt.kg(b.bulkLeft)}` : ''}`, ms: 520 + 20 * (b.stages - 9) },
      { agent: AG_BAL, system: 'Prodigy', action: 'Balance de masas: materia prima y producto terminado', result: `Conciliado ${pct1(b.reconciled)} · ${fmt.kg(b.diff)} sin justificar · ${sc.pallets.length} de ${sc.pallets.length} palés localizados`, ms: 90, tone: 'ok' },
      { agent: AG_REC, system: 'Elara', action: 'Abre el registro del simulacro con los tiempos de cada actividad', result: `Registro ${code} en borrador`, ms: 330 },
      { agent: AG_REC, system: 'Outlook', action: 'Prepara los avisos con la plantilla de retirada, sin enviar', result: `${fmt.plural(notices, 'aviso', 'avisos')} (${fmt.list(langs)}) pendientes de aprobación`, ms: 240 + 60 * (notices - 1) }
    ];
  }

  /* ---------------------------------------------------------------- Diagrama de genealogía */

  const GEN_GAP = 20;
  const GEN_MIN_COL = 112;

  function genModel(sc) {
    const stages = [
      { id: 'campo', label: 'Campo', icon: 'leaf' },
      { id: 'recepcion', label: 'Recepción', icon: 'scale' },
      sc.bulks.length ? { id: 'granel', label: 'Granel', icon: 'box' } : null,
      { id: 'lote', label: 'Lote', icon: 'layers' },
      { id: 'pales', label: 'Palés', icon: 'pallet' },
      { id: 'expedicion', label: 'Expediciones', icon: 'truck' },
      { id: 'cliente', label: 'Clientes', icon: 'building' }
    ].filter(Boolean);
    const nodes = [];
    const edges = [];
    const add = (n) => { if (!nodes.some((x) => x.id === n.id)) nodes.push(n); };
    const edge = (a, b) => { if (!edges.some((e) => e[0] === a && e[1] === b)) edges.push([a, b]); };
    sc.parcels.forEach((code) => {
      const p = D.parcels[code] || {};
      const start = sc.mode === 'parcela' && code === sc.code;
      add({ id: `P:${code}`, stage: 'campo', kicker: 'Parcela', title: code, mono: true, sub: `${p.grower} · ${p.municipality}`, meta: `${p.crop} · ${fmt.num(p.ha)} ha`, alert: sc.comingled.includes(code) ? 'Misma descarga: entra en el alcance' : '', start, reveal: start ? 0 : 1 });
    });
    sc.U.forEach((u) => {
      const t = u.intake.ticket;
      add({ id: `R:${t}`, stage: 'recepcion', kicker: 'Recepción', title: t, mono: true, sub: `${fmt.dayMonth(u.intake.date)} ${u.intake.time} · ${fmt.num(u.intake.net_t)} t`, meta: u.grower, reveal: 1 });
      u.parcels.forEach((p) => edge(`P:${p}`, `R:${t}`));
      if (u.bulk) {
        const f = FLOWS[t] || {};
        const start = sc.mode === 'granel' && u.bulk.code === sc.code;
        add({ id: `G:${u.bulk.code}`, stage: 'granel', kicker: 'Granel', title: u.bulk.code, mono: true, sub: `${u.bulk.line} · ${fmt.dayMonth(u.bulk.date)}`, meta: f.stock ? `${u.bulk.storage}: quedan ${fmt.kg(f.stock.kg)}` : u.bulk.storage, start, reveal: start ? 0 : 2 });
        edge(`R:${t}`, `G:${u.bulk.code}`);
        edge(`G:${u.bulk.code}`, `L:${u.lot}`);
      } else {
        edge(`R:${t}`, `L:${u.lot}`);
      }
    });
    sc.lots.forEach((L) => {
      const i = L.info;
      const start = sc.mode === 'lote';
      const tr = L.forward.transfer;
      add({ id: `L:${i.code}`, stage: 'lote', kicker: 'Lote', title: i.code, mono: true, lot: i.code, sub: i.product_name, meta: `${i.line} · ${fmt.dayMonth(i.production_date)} · ${fmt.plural(i.pallets_produced, 'palé', 'palés')}${tr ? ` · traslado ${tr.code}` : ''}`, start, reveal: start ? 0 : 2 });
      const pal = L.forward.pallets;
      const shipped = pal.filter((p) => p.status === 'expedido');
      if (shipped.length) {
        const id = `W:${i.code}:EXP`;
        add({ id, stage: 'pales', kicker: 'Palés', title: `${shipped.length} expedidos`, sub: fmt.kg(sum(shipped, (p) => p.kg)), meta: 'Entregados a cliente', tone: 'shipped', reveal: 4 });
        edge(`L:${i.code}`, id);
        uniq(shipped.map((p) => p.shipment)).forEach((s) => edge(id, `E:${s}`));
      }
      (L.forward.by_location || []).forEach((loc) => {
        const id = `W:${i.code}:${loc.location}`;
        const kg = sum(pal.filter((p) => p.location === loc.location), (p) => p.kg);
        add({ id, stage: 'pales', kicker: 'Palés', title: `${loc.pallets} en ${loc.location}`, sub: fmt.kg(kg), meta: loc.location === 'C-07' && lotsInC07.has(i.code) ? 'Expuestos a la excursión de hoy' : 'En almacén', alertTone: loc.location === 'C-07', tone: loc.planned_shipment ? 'planned' : 'stock', reveal: 4 });
        edge(`L:${i.code}`, id);
        if (loc.planned_shipment) edge(id, `E:${loc.planned_shipment}`);
      });
    });
    sc.shipments.forEach((s) => {
      const planned = s.status !== 'expedida';
      add({ id: `E:${s.id}`, stage: 'expedicion', kicker: 'Expedición', title: s.id, mono: true, sub: `${shortWhen(s.date, s.time)} · ${planned ? 'planificada' : 'expedida'}`, meta: `${fmt.plural(s.pallets, 'palé', 'palés')}${s.dock ? ` · ${s.dock}` : ''}`, alert: planned ? 'Retener en muelle' : '', tone: planned ? 'planned' : 'shipped', reveal: 5 });
      edge(`E:${s.id}`, `C:${s.customer_id}`);
    });
    sc.customers.forEach((c) => {
      add({ id: `C:${c.id}`, stage: 'cliente', kicker: 'Cliente', title: c.label, sub: `${COUNTRY[c.country] || c.country} · ${c.channel}`, meta: c.end_customer || '', tone: 'customer', reveal: 5 });
    });
    return { stages, nodes, edges: edges.filter(([a, b]) => nodes.some((n) => n.id === a) && nodes.some((n) => n.id === b)) };
  }

  function genNode(n, visible) {
    const cls = ['gen-node', n.start ? 'is-start' : '', n.tone ? `tone-${n.tone}` : '', visible ? '' : 'is-hidden'].filter(Boolean).join(' ');
    const a = { class: cls, 'data-gid': n.id, 'data-reveal': String(n.reveal) };
    if (n.lot) Object.assign(a, { 'data-lot': n.lot, role: 'button', tabindex: '0', title: `Ver la traza del lote ${n.lot}` });
    const ic = { Parcela: 'leaf', 'Recepción': 'scale', Granel: 'box', Lote: 'layers', 'Palés': 'pallet', 'Expedición': 'truck', Cliente: 'building' }[n.kicker] || 'circle';
    return html`<div ${App.attrs(a)}>
      <div class="gen-kicker">${icon(ic, 12)}<span>${n.kicker}</span>${n.start ? html`<span class="gen-flag">Punto de partida</span>` : ''}</div>
      <div class="gen-title${n.mono ? ' mono' : ''}">${n.mono ? String(n.title).split('-').map((part, i, arr) => html`${part}${i < arr.length - 1 ? html`-<wbr>` : ''}`) : n.title}</div>
      ${n.sub ? html`<div class="gen-sub">${n.sub}</div>` : ''}
      ${n.meta ? html`<div class="gen-meta${n.alertTone ? ' t-warn' : ''}">${n.meta}</div>` : ''}
      ${n.alert ? html`<div class="gen-alert">${n.alert}</div>` : ''}
    </div>`;
  }

  function genHTML(sc, revealAll) {
    const m = genModel(sc);
    const cols = m.stages.map((st) => {
      const list = m.nodes.filter((n) => n.stage === st.id);
      return html`<div class="gen-col" data-stage="${st.id}">
        <div class="gen-head">${icon(st.icon, 14)}<span>${st.label}</span><span class="count">${list.length}</span></div>
        <div class="gen-body">${list.map((n) => genNode(n, revealAll))}</div>
      </div>`;
    });
    return html`<div class="gen" data-gen data-cols="${m.stages.length}" data-edges="${JSON.stringify(m.edges)}" style="--gen-cols:${m.stages.length}" role="group" aria-label="Genealogía de ${sc.label}: ${m.nodes.length} elementos">
      <svg class="gen-links" aria-hidden="true" focusable="false"></svg>
      <div class="gen-grid">${cols}</div>
    </div>`;
  }

  function genDraw(gen) {
    if (!gen || !gen.isConnected) return;
    const cols = Number(gen.getAttribute('data-cols')) || 7;
    const w = gen.clientWidth;
    if (w < 40) return;
    const vertical = (w - (cols - 1) * GEN_GAP) / cols < GEN_MIN_COL;
    gen.classList.toggle('is-vertical', vertical);
    const svg = gen.querySelector('.gen-links');
    if (!svg) return;
    if (vertical) { svg.innerHTML = ''; return; }
    const box = gen.getBoundingClientRect();
    const W = Math.round(box.width);
    const H = Math.round(box.height);
    svg.setAttribute('width', String(W));
    svg.setAttribute('height', String(H));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    let edges = [];
    try { edges = JSON.parse(gen.getAttribute('data-edges') || '[]'); } catch (e) { edges = []; }
    const r1 = (v) => Math.round(v * 10) / 10;
    const find = (id) => gen.querySelector(`[data-gid="${window.CSS && CSS.escape ? CSS.escape(id) : id}"]`);
    let out = '';
    edges.forEach(([a, b]) => {
      const na = find(a);
      const nb = find(b);
      if (!na || !nb || na.classList.contains('is-hidden') || nb.classList.contains('is-hidden')) return;
      const ra = na.getBoundingClientRect();
      const rb = nb.getBoundingClientRect();
      const x1 = ra.right - box.left;
      const y1 = ra.top + ra.height / 2 - box.top;
      const x2 = rb.left - box.left;
      const y2 = rb.top + rb.height / 2 - box.top;
      const dx = Math.max(8, (x2 - x1) / 2);
      const planned = nb.classList.contains('tone-planned') && na.classList.contains('tone-planned');
      out += `<path class="gen-link${planned ? ' is-planned' : ''}" d="M${r1(x1)},${r1(y1)} C${r1(x1 + dx)},${r1(y1)} ${r1(x2 - dx)},${r1(y2)} ${r1(x2 - 6)},${r1(y2)}"/><path class="gen-arrow${planned ? ' is-planned' : ''}" d="M${r1(x2 - 6)},${r1(y2 - 3.5)} L${r1(x2)},${r1(y2)} L${r1(x2 - 6)},${r1(y2 + 3.5)} Z"/>`;
    });
    svg.innerHTML = out;
  }

  function genBind(ctx) {
    if (ctx.vars.ro) { try { ctx.vars.ro.disconnect(); } catch (e) { /* sin observador */ } ctx.vars.ro = null; }
    const gen = ctx.$('[data-gen]');
    if (!gen) return;
    const redraw = () => requestAnimationFrame(() => genDraw(gen));
    redraw();
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(redraw);
      ro.observe(gen);
      ctx.vars.ro = ro;
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (ctx.alive()) redraw(); }).catch(() => {});
  }

  function genReveal(ctx, k) {
    const gen = ctx.$('[data-gen]');
    if (!gen) return;
    gen.querySelectorAll('.gen-node.is-hidden').forEach((n) => { if (Number(n.getAttribute('data-reveal')) <= k) n.classList.remove('is-hidden'); });
    genDraw(gen);
  }

  /* ---------------------------------------------------------------- Avisos a clientes */

  function noticeFor(sc, c, code) {
    const es = c.country === 'ES';
    const lotLines = (ships) => {
      const out = [];
      ships.forEach((s) => s.lots.forEach((x) => {
        const L = D.lots[x.lot];
        const i = L.info;
        const ss = s.sscc.filter((p) => p.lot === x.lot);
        out.push({ i, s, ss, kg: sum(ss, (p) => p.kg) });
      }));
      return out;
    };
    const delivered = lotLines(c.delivered);
    const planned = lotLines(c.planned);
    const products = uniq(delivered.concat(planned).map((x) => x.i.product_name));
    const lotsTxt = uniq(delivered.concat(planned).map((x) => x.i.code));
    let subject;
    let body;
    if (es) {
      subject = `[SIMULACRO] ${delivered.length ? 'Retirada de producto' : 'Retención de entrega'} · ${fmt.list(products)} · lote ${fmt.list(lotsTxt)}`;
      const parts = [`Estimado equipo de Calidad de ${c.label}:`];
      if (delivered.length) {
        parts.push('Les comunicamos la retirada del siguiente producto suministrado por Congelados de Navarra:');
        delivered.forEach((x) => parts.push([
          `Producto: ${x.i.product_name} · ${x.i.brand} · SKU ${x.i.sku}`,
          `Lote: ${x.i.code} · consumo preferente ${x.i.best_before}`,
          `Entregado: ${x.s.id} del ${fmt.date(x.s.date)} · ${fmt.plural(x.ss.length, 'palé', 'palés')} (${fmt.kg(x.kg)})`,
          `SSCC: ${ssccList(x.ss).join(', ')}`
        ].join('\n')));
        parts.push('Les pedimos que inmovilicen de inmediato las unidades de este lote en sus almacenes y puntos de venta y que nos confirmen, respondiendo a este correo, las cantidades localizadas. Nuestro equipo de Calidad les contactará para organizar la recogida.');
      }
      planned.forEach((x) => parts.push(`La entrega prevista para ${whenText(x.s.date, x.s.time)} (${x.s.id}, ${fmt.plural(x.ss.length, 'palé', 'palés')} de ${x.i.product_name}, lote ${x.i.code}) queda retenida en nuestras instalaciones. Les confirmaremos la nueva fecha de entrega.`));
      parts.push('Motivo: simulacro anual de retirada (IFS Food y BRCGS). En una retirada real, aquí se indican el peligro y el destino del producto.');
      parts.push('Atentamente,\nCalidad · Congelados de Navarra\nPlanta de Fustiñana');
      body = parts.join('\n\n');
    } else {
      subject = `[MOCK RECALL] ${delivered.length ? 'Product recall' : 'Delivery on hold'} · ${fmt.list(products).replace(/ y /g, ' and ')} · batch ${lotsTxt.join(', ')}`;
      const parts = [`Dear ${c.label} Quality Team,`];
      if (delivered.length) {
        parts.push('We are notifying you of the recall of the following product supplied by Congelados de Navarra:');
        delivered.forEach((x) => parts.push([
          `Product: ${x.i.product_name} · SKU ${x.i.sku}`,
          `Batch: ${x.i.code} · best before ${x.i.best_before}`,
          `Delivered: ${x.s.id} on ${fmt.date(x.s.date)} · ${x.ss.length} pallets (${fmt.num(x.kg)} kg)`,
          `SSCC: ${ssccList(x.ss).join(', ')}`
        ].join('\n')));
        parts.push('Please quarantine all units of this batch in your warehouses and stores immediately and confirm the quantities located by replying to this email. Our Quality team will contact you to arrange collection.');
      }
      planned.forEach((x) => parts.push(`The delivery planned for ${fmt.date(x.s.date)} at ${x.s.time} (${x.s.id}, ${x.ss.length} pallets of batch ${x.i.code}) is on hold at our site. We will confirm the new delivery date.`));
      parts.push('Reason: annual mock recall (IFS Food and BRCGS). In a real recall, this section states the hazard and the instructions for the product.');
      parts.push('Kind regards,\nQuality Department · Congelados de Navarra\nFustiñana plant');
      body = parts.join('\n\n');
    }
    return {
      lang: es ? 'Español' : 'Inglés',
      headers: { From: CN_FROM, To: `${es ? 'Calidad' : 'Quality'} · ${c.label}`, Date: `${fmt.date(TODAY)} (borrador ${code})`, Subject: subject },
      subject, body, delivered, planned
    };
  }

  function openNotice(ctx, sc, cid) {
    const c = sc.customers.find((x) => x.id === cid);
    if (!c) return;
    const run = ctx.local.run;
    const dec = ctx.local.decision;
    const n = noticeFor(sc, c, run.code);
    const state = dec ? (dec.status === 'approved' ? 'Guardado como borrador en Outlook con la marca SIMULACRO: no se envía.' : 'Simulacro rechazado: el aviso no se ha preparado.') : 'Pendiente de aprobación. En un simulacro el aviso no se envía: se guarda como borrador con la marca SIMULACRO.';
    App.audit('Aviso a cliente revisado', `${run.code} · ${c.label}`);
    App.modal({
      title: `Aviso a ${c.label}`,
      kicker: `Vista previa · ${n.lang} · registro ${run.code}`,
      size: 'lg',
      body: html`<div class="stack stack-sm">
        ${App.callout({ tone: dec && dec.status === 'rejected' ? 'warn' : 'brand', icon: 'mail', title: 'Simulacro de retirada', body: state })}
        ${App.emailView({ headers: n.headers, text: n.body, highlights: uniq(n.delivered.concat(n.planned).map((x) => x.i.code)).map((code) => ({ text: code, tone: 'brand', all: true })) })}
      </div>`,
      actions: [
        { label: 'Copiar texto', icon: 'copy', variant: 'ghost', left: true, close: false, onClick: () => { App.copyText(`${n.subject}\n\n${n.body}`, 'Aviso copiado al portapapeles'); return false; } },
        { label: 'Cerrar', variant: 'primary' }
      ]
    });
  }

  /* ---------------------------------------------------------------- Piezas de la vista */

  function referenceCard() {
    return App.card({
      title: 'Referencia de auditoría',
      sub: 'Objetivo del ejercicio; Calidad confirma los requisitos de su certificación vigente',
      icon: 'shield-check',
      body: html`<ul class="ret-ref">
        <li><span class="ret-ref-k">BRCGS Food</span><span>Objetivo ilustrativo: trazabilidad en 4 horas. Confirmar alcance, periodicidad y plazos con Calidad y la edición aplicable.</span></li>
        <li><span class="ret-ref-k">IFS Food v8</span><span>El ejercicio muestra trazabilidad hacia atrás y hacia delante, con balance de masas. Calidad valida el protocolo aplicable.</span></li>
        <li><span class="ret-ref-k">FSSC 22000</span><span>El simulacro permite revisar la eficacia del procedimiento de retirada; no acredita cumplimiento por sí solo.</span></li>
      </ul>
      <p class="muted small mt-4">Un simulacro no bloquea stock ni envía avisos: se mide si la información se obtiene completa, cuadra en kilos y a tiempo.</p>`
    });
  }

  function setupCard(ctx) {
    const mode = ctx.local.mode || 'lote';
    const codes = Object.assign({}, DEFAULTS, ctx.local.codes || {});
    const code = codes[mode];
    const m = MODES[mode];
    const options = mode === 'lote'
      ? LOT_IDS.map((id) => [id, `${D.lots[id].info.product_name} · ${D.lots[id].info.plant_name}`])
      : mode === 'parcela'
        ? uniq([].concat(...ALL_UPS.map((u) => u.parcels))).map((p) => [p, `${(D.parcels[p] || {}).crop || ''} · ${(D.parcels[p] || {}).grower || ''} · ${(D.parcels[p] || {}).municipality || ''}`])
        : uniqBy(ALL_UPS.filter((u) => u.bulk), (u) => u.bulk.code).map((u) => [u.bulk.code, `${u.crop} · ${u.bulk.line} · ${u.bulk.storage}`]);
    return App.card({
      id: 'ret-setup',
      title: 'Punto de partida',
      sub: 'Un lote de producto terminado, todos los lotes de una parcela o un granel de campaña',
      icon: 'git-branch',
      body: html`<div class="stack">
        <div class="ret-mode">${App.segmented({ name: 'ret-mode', label: 'Tipo de punto de partida', value: mode, options: Object.keys(MODES).map((k) => ({ value: k, label: MODES[k].label, icon: MODES[k].icon })) })}</div>
        <div>
          <div class="ret-field-row">
            <div class="field">
              <label class="label" for="ret-code">${m.field}</label>
              <input class="input mono" id="ret-code" list="ret-codes" value="${code}" autocomplete="off" spellcheck="false" autocapitalize="characters" placeholder="${m.format}" aria-describedby="ret-code-hint">
              <datalist id="ret-codes">${options.map(([v, t]) => html`<option value="${v}">${t}</option>`)}</datalist>
            </div>
            <button type="button" class="btn btn-primary btn-lg" data-action="start">${icon('play')}<span>Iniciar simulacro</span></button>
          </div>
          <div class="hint mt-2" id="ret-code-hint">Formato ${m.format} · búsqueda en ${m.where}</div>
        </div>
        <div class="ret-examples"><span>Ejemplos:</span>
          <button type="button" class="ret-example" data-example="lote|L26-261-FUS-GUI-03">Lote L26-261-FUS-GUI-03</button>
          <button type="button" class="ret-example" data-example="parcela|P-0412-07">Parcela P-0412-07</button>
          <button type="button" class="ret-example" data-example="granel|G26-176-FUS-GUI">Granel G26-176-FUS-GUI</button>
        </div>
        <div id="ret-preview" aria-live="polite">${previewHTML(ctx, mode, code)}</div>
      </div>`
    });
  }

  function previewHTML(ctx, mode, code) {
    const miss = ctx.local.miss;
    if (miss && miss.mode === mode && norm(miss.code) === norm(code)) {
      const m = MODES[mode];
      return App.callout({ tone: 'warn', icon: 'search', title: `No encuentro ${m.noun} «${norm(miss.code) || '—'}» en ${m.where}`,
        body: `No se ha iniciado el simulacro: Prodigy no genera datos que no estén en los sistemas. Comprueba el código (formato ${m.format}) o elige uno de la lista.` });
    }
    const sc = findScope(mode, code);
    if (!sc) return html`<div class="ret-preview muted small">${icon('search', 16)}<span>Escribe o elige un código de la lista.</span></div>`;
    return html`<div class="ret-preview">
      ${icon(MODES[mode].icon, 16)}
      <div class="ret-preview-main"><div class="strong">${sc.label}</div><div class="muted small">${scopeHeadline(sc)}</div></div>
      <div class="ret-preview-side">${fmt.plural(sc.lotIds.length, 'lote', 'lotes')} · ${fmt.plural(sc.pallets.length, 'palé', 'palés')}</div>
    </div>`;
  }

  function historyCard(ctx) {
    const hist = (ctx.local.history || []).slice().reverse();
    if (!hist.length) return '';
    return App.card({
      title: 'Simulacros de esta sesión',
      icon: 'history',
      flush: true,
      body: App.table({ dense: true, rows: hist, cols: [
        { label: 'Registro', render: (r) => html`<span class="code">${r.code}</span><span class="sub">${fmt.time(r.at)}</span>` },
        { label: 'Punto de partida', render: (r) => r.label },
        { label: 'Trazado', render: (r) => fmt.ms(r.ms), num: true },
        { label: 'Conciliado', render: (r) => pct1(r.reconciled), num: true },
        { label: 'Estado', render: (r) => (r.status === 'approved' ? chip('approved') : r.status === 'rejected' ? chip('rejected') : chip('draft')) }
      ] })
    });
  }

  function kpis(sc, run) {
    const b = sc.bal;
    const plannedToday = sc.retain.filter((s) => s.date === TODAY);
    return html`<div class="kpis">
      ${App.kpi({ label: 'Tiempo de trazado', value: fmt.ms(run.ms), sub: 'Tiempo simulado · objetivo ilustrativo: 4 h', icon: 'clock', tone: 'ok' })}
      ${App.kpi({ label: 'Palés localizados', value: `${sc.pallets.length} de ${sc.pallets.length}`, sub: `${fmt.kg(sum(sc.pallets, (p) => p.kg))} · ${fmt.plural(sc.bal.stockN, 'palé', 'palés')} en almacén`, icon: 'pallet' })}
      ${App.kpi({ label: 'Balance de masas conciliado', value: pct1(b.reconciled), sub: `${fmt.kg(b.diff)} sin justificar de ${fmt.kg(b.received)} recibidos`, icon: 'scale', action: 'scroll-balance' })}
      ${App.kpi({ label: 'Clientes a notificar', value: sc.notify.length, sub: sc.retain.length ? `${fmt.plural(sc.retain.length, 'expedición', 'expediciones')} a retener${plannedToday.length ? ` · ${fmt.list(plannedToday.map((s) => `hoy ${s.time}`))}` : ''}` : 'Sin expediciones planificadas', icon: 'mail', tone: sc.notify.length ? 'warn' : undefined, action: 'scroll-customers' })}
    </div>`;
  }

  function genCard(sc, run) {
    return App.card({
      id: 'ret-gen-card',
      title: 'Genealogía hacia atrás y hacia delante',
      sub: `${sc.label} · ${fmt.plural(sc.intakes.length, 'recepción', 'recepciones')} · ${fmt.plural(sc.pallets.length, 'SSCC', 'SSCC')} · ${fmt.plural(sc.customers.length, 'cliente', 'clientes')}`,
      icon: 'git-branch',
      actions: App.sysList(['SAP', 'MES Mapex', 'Mecalux Easy WMS']),
      body: html`${genHTML(sc, true)}
        <div class="gen-legend">
          <span class="lg"><i class="gen-lg is-start"></i>Punto de partida</span>
          <span class="lg"><i class="gen-lg tone-planned"></i>Expedición planificada: retener</span>
          <span class="lg"><i class="gen-lg"></i>Pulsa un lote para ver su traza completa</span>
        </div>`,
      footer: html`<details class="run-log" style="width:100%">
        <summary>${icon('chevron-right', 16)}<span>Registro de ejecución · ${streamSteps(sc, run.code).length} pasos · ${fmt.ms(run.ms)}</span></summary>
        <div class="mt-2" id="ret-log"></div>
      </details>`
    });
  }

  function balanceRows(f) {
    const rows = [{ type: 'in', label: f.inLabel, sub: f.inSub, stage: f.kind === 'mix' ? 'DOS-5' : 'SAP', kg: f.inKg, pct: 100 }];
    f.phases.forEach((p) => {
      const extra = f.f && f.f.bulk && /granel/.test(p.title) ? ` → ${f.u.bulk.code}: ${fmt.kg(f.f.bulk.kg)} (${fmt.plural(f.f.bulk.units, 'octavín', 'octavines')})`
        : f.f && f.f.bulk && /Reenvasado|Envasado/.test(p.title) ? ` · ${fmt.plural(f.f.bulk.used, 'octavín consumido', 'octavines consumidos')} (${fmt.kg(f.f.bulk.usedKg)})` : '';
      rows.push({ type: 'group', label: `${p.title} · ${fmt.date(p.date)}${extra}` });
      p.stages.forEach(([eq, label, kg]) => rows.push({ type: 'loss', label, stage: eq, kg: -kg, pct: (100 * kg) / f.inKg }));
    });
    rows.push({ type: 'group', label: 'Salidas' });
    f.outs.forEach((o) => rows.push({ type: 'out', label: o.label, sub: o.kind === 'stock' ? `${fmt.plural(o.units, 'octavín', 'octavines')} en ${storeLabel(o.where)}` : o.sub, stage: o.kind === 'stock' ? 'Easy WMS' : o.kind === 'consumo' ? 'MES Mapex' : 'SAP', kg: o.kg, pct: (100 * o.kg) / f.inKg }));
    rows.push({ type: 'diff', label: 'Diferencia sin justificar', sub: 'Entrada − mermas − salidas', kg: f.diff, pct: (100 * f.diff) / f.inKg });
    rows.push({ type: 'total', label: 'Conciliado', kg: null, pct: (100 * (f.inKg - Math.abs(f.diff))) / f.inKg });
    return rows;
  }

  function balanceTable(f) {
    return App.table({
      dense: true,
      class: 'ret-bal',
      rows: balanceRows(f),
      rowClass: (r) => `is-${r.type}`,
      cols: [
        { label: 'Concepto', render: (r) => (r.type === 'group' ? html`<span class="ret-group">${r.label}</span>` : html`${r.type === 'total' || r.type === 'in' ? html`<strong>${r.label}</strong>` : r.label}${r.sub ? html`<span class="sub">${r.sub}</span>` : ''}`) },
        { label: 'Etapa', width: '96px', render: (r) => (r.type === 'group' || r.type === 'total' || r.type === 'diff' ? '' : r.stage ? html`<span class="code">${r.stage}</span>` : html`<span class="muted">—</span>`) },
        { label: 'Kg', width: '96px', num: true, render: (r) => (r.kg == null ? '' : r.type === 'group' ? '' : html`<span class="${r.type === 'in' || r.type === 'out' ? 'strong' : r.type === 'diff' ? 't-warn strong' : ''}">${fmt.num(r.kg)}</span>`) },
        { label: '%', width: '76px', num: true, render: (r) => (r.type === 'group' ? '' : r.type === 'total' ? html`<strong class="t-ok">${pct1(r.pct)}</strong>` : html`<span class="muted">${fmt.pct(Math.abs(r.pct), 1)}</span>`) }
      ]
    });
  }

  function productTable(sc) {
    return App.table({
      dense: true,
      rows: sc.product,
      cols: [
        { label: 'Lote', render: (r) => html`${App.lotTag(r.lot)}<span class="sub">${r.product}</span>` },
        { label: 'Producido', num: true, render: (r) => html`${fmt.num(r.produced)}<span class="sub">${fmt.plural(r.pallets, 'palé', 'palés')}</span>` },
        { label: 'Expedido', num: true, render: (r) => html`${fmt.num(r.shippedKg)}<span class="sub">${fmt.plural(r.shippedN, 'palé', 'palés')}</span>` },
        { label: 'En almacén', num: true, render: (r) => html`${fmt.num(r.stockKg)}<span class="sub">${r.byLoc.length ? r.byLoc.map((x) => `${x.loc} ${x.n}`).join(' · ') : 'Sin stock'}</span>` },
        { label: 'Diferencia', num: true, render: (r) => fmt.num(r.diff) },
        { label: 'Localizado', num: true, render: (r) => html`<strong class="t-ok">${pct1(r.locatedPct)}</strong>` }
      ]
    });
  }

  function balanceCard(ctx, sc) {
    const b = sc.bal;
    const flows = sc.flows;
    const sel = flows.find((f) => f.key === ctx.local.flow) || flows[0];
    return App.card({
      id: 'ret-balance',
      title: 'Balance de masas',
      sub: 'Kilos de la recepción al destino · mermas declaradas en MES Mapex, stock en Mecalux Easy WMS',
      icon: 'scale',
      body: html`<div class="stack">
        <div>
          <div class="row between mb-2"><div class="h3">Materia prima</div><span class="muted small">${fmt.plural(sc.intakes.length, 'recepción', 'recepciones')} · ${fmt.plural(b.stages, 'concepto de merma', 'conceptos de merma')}</span></div>
          <div class="ret-stats">${App.stats([
            { label: 'Recibido', value: fmt.kg(b.received) },
            { label: 'Mermas justificadas', value: fmt.kg(b.losses) },
            { label: b.toMixOnly ? 'Consumido en la mezcla' : 'A producto terminado', value: fmt.kg(b.toProduct) },
            { label: 'Granel restante', value: b.bulkLeft ? fmt.kg(b.bulkLeft) : '—' },
            { label: `Sin justificar (${fmt.num((100 * b.diff) / b.received, 2)} %)`, value: fmt.kg(b.diff), tone: 'warn' },
            { label: 'Conciliado', value: pct1(b.reconciled), tone: 'ok' }
          ])}</div>
        </div>
        <div>
          <div class="row between mb-2"><div class="h3">Detalle por recepción</div>${flows.length > 1 ? App.segmented({ name: 'ret-flow', label: 'Flujo del balance', value: sel.key, options: flows.map((f) => ({ value: f.key, label: f.kind === 'mix' ? 'Mezcla L5' : f.key })) }) : ''}</div>
          <div class="muted small mb-2">${sel.title}</div>
          <div class="card flat">${balanceTable(sel)}</div>
        </div>
        <div>
          <div class="row between mb-2"><div class="h3">Producto terminado</div><span class="muted small">${fmt.kg(b.produced)} · ${fmt.kg(b.shippedKg)} expedidos · ${fmt.kg(b.stockKg)} en almacén</span></div>
          <div class="card flat" id="ret-product">${productTable(sc)}</div>
        </div>
        <div class="row row-nowrap muted small" style="align-items:flex-start">${icon('info', 16)}<span>Criterio: la diferencia sin justificar se muestra tal cual, no se reparte entre las mermas. Cada merma cita la etapa de la ruta del lote que la declara en MES Mapex.</span></div>
      </div>`
    });
  }

  function timingRows(sc, run) {
    const steps = streamSteps(sc, run.code);
    let acc = 0;
    const rows = [{ at: run.startedAt, what: 'Inicio del simulacro', who: ROLE.quality_shift, sys: null, ms: 0 }];
    const marks = { 0: 'Punto de partida localizado', 1: 'Traza hacia atrás completa', 2: 'Lotes y consumos identificados', 4: 'Palés localizados por SSCC', 5: 'Expediciones y clientes identificados', 7: 'Balance de masas cerrado', 9: 'Registro y avisos preparados' };
    steps.forEach((s, i) => {
      acc += s.ms;
      if (marks[i]) rows.push({ at: addMs(run.startedAt, acc), what: marks[i], who: `Agente ${s.agent}`, sys: s.system, ms: acc });
    });
    const dec = run.decision;
    if (dec) rows.push({ at: dec.at, what: dec.status === 'approved' ? 'Aprobación de Calidad' : 'Rechazo de Calidad', who: ROLE.quality_shift, sys: null, ms: null, total: secondsBetween(run.startedAt, dec.at) });
    return rows;
  }

  function clockCard(sc, run, dec) {
    const r = Object.assign({}, run, { decision: dec });
    const rows = timingRows(sc, r);
    return App.card({
      title: 'Cronómetro frente a auditoría',
      sub: 'Tiempos de la simulación; no son medidas de rendimiento de producción',
      icon: 'clock',
      body: html`<div class="stack">
        ${App.stats([
          { label: 'Trazado con Prodigy', value: fmt.ms(run.ms), tone: 'ok' },
          { label: 'Objetivo del ejercicio', value: fmt.dur(BRC_LIMIT_S) },
          { label: 'Hoy (estimación)', value: '1–4 h' }
        ])}
        <div class="card flat">${App.table({ dense: true, rows, cols: [
          { label: 'Hora', width: '84px', render: (x) => html`<span class="code">${fmt.time(x.at, true)}</span>` },
          { label: 'Actividad', render: (x) => html`${x.what}<span class="sub">${x.who}${x.sys ? ' · ' : ''}${x.sys ? sys(x.sys) : ''}</span>` },
          { label: 'Transcurrido', num: true, render: (x) => (x.total != null ? fmt.dur(x.total) : x.ms ? fmt.ms(x.ms) : '0 s') }
        ] })}</div>
      </div>`
    });
  }

  function palletsCard(ctx, sc) {
    const locRows = [];
    sc.lots.forEach((L) => {
      const pal = L.forward.pallets;
      const shipped = pal.filter((p) => p.status === 'expedido');
      if (shipped.length) {
        uniq(shipped.map((p) => p.shipment)).forEach((sid) => {
          const ps = shipped.filter((p) => p.shipment === sid);
          const s = D.shipments[sid] || {};
          locRows.push({ lot: L.info.code, where: 'Expedido', whereSub: `${sid} · ${fmt.date(s.date)}`, n: ps.length, kg: sum(ps, (p) => p.kg), action: 'Aviso al cliente', tone: 'warn' });
        });
      }
      (L.forward.by_location || []).forEach((loc) => {
        const ps = pal.filter((p) => p.location === loc.location);
        locRows.push({ lot: L.info.code, where: loc.location, whereSub: `${loc.label}${loc.lane ? ` · calle ${loc.lane}` : ''}`, n: ps.length, kg: sum(ps, (p) => p.kg),
          action: loc.planned_shipment ? `Retener ${loc.planned_shipment} (${shortWhen(D.shipments[loc.planned_shipment].date, D.shipments[loc.planned_shipment].time)})` : 'Bloquear en SAP QM y Easy WMS', tone: loc.planned_shipment ? 'crit' : '' });
      });
    });
    sc.flows.forEach((f) => f.outs.filter((o) => o.kind === 'stock').forEach((o) => locRows.push({ lot: f.u.bulk.code, bulk: true, where: o.where, whereSub: `Granel · ${fmt.plural(o.units, 'octavín', 'octavines')}`, n: null, kg: o.kg, action: 'Bloquear el granel restante', tone: '' })));
    const byLoc = App.table({ dense: true, rows: locRows, rowClass: (r) => (r.tone === 'crit' ? 'tone-crit' : r.tone === 'warn' ? 'tone-warn' : ''), cols: [
      { label: 'Lote o granel', render: (r) => (r.bulk ? html`<span class="code">${r.lot}</span>` : App.lotTag(r.lot)) },
      { label: 'Ubicación', render: (r) => html`<span class="strong">${r.where}</span><span class="sub">${r.whereSub}</span>` },
      { label: 'Palés', num: true, render: (r) => (r.n == null ? '—' : String(r.n)) },
      { label: 'Kg', num: true, render: (r) => fmt.num(r.kg) },
      { label: 'Acción en una retirada real', render: (r) => r.action }
    ] });
    const ssccTable = App.table({ dense: true, rows: sc.pallets, cols: [
      { label: 'SSCC', render: (p) => html`<span class="code">${p.sscc}</span><span class="sub">${p.lot} · ${p.n}/${p.of}</span>` },
      { label: 'Kg', num: true, render: (p) => fmt.num(p.kg) },
      { label: 'Ubicación', render: (p) => html`${p.location === 'EXPEDIDO' ? 'Expedido' : p.location}${p.position ? html`<span class="sub">${p.position}</span>` : ''}` },
      { label: 'Estado', render: (p) => (p.status === 'expedido' ? chip('shipped', 'Expedido') : p.planned_shipment ? chip('pending', 'Expedición planificada') : chip('ok', 'En stock')) },
      { label: 'Expedición', render: (p) => (p.shipment || p.planned_shipment ? html`<span class="code">${p.shipment || p.planned_shipment}</span>` : '—') }
    ] });
    return App.card({
      id: 'ret-pallets',
      title: 'Palés y SSCC',
      sub: `${fmt.plural(sc.pallets.length, 'palé', 'palés')} · ${fmt.kg(sum(sc.pallets, (p) => p.kg))} · Mecalux Easy WMS`,
      icon: 'pallet',
      flush: true,
      actions: html`<button type="button" class="btn btn-secondary btn-sm" data-action="csv">${icon('download', 15)}<span>SSCC (CSV)</span></button>`,
      body: App.tabs({ id: 'ret-pal', flush: true, label: 'Palés del alcance', tabs: [
        { id: 'loc', label: 'Por ubicación', count: locRows.length, body: html`<div class="card flat">${byLoc}</div>` },
        { id: 'sscc', label: 'SSCC', count: sc.pallets.length, body: html`<div class="card flat ret-scroll">${ssccTable}</div>` }
      ] })
    });
  }

  function customersCard(ctx, sc, run, dec) {
    const items = sc.customers.map((c) => {
      const del = c.delivered;
      const pl = c.planned;
      const delPal = sum(del, (s) => s.pallets);
      const delKg = sum(del, (s) => s.kg);
      const body = [];
      if (del.length) body.push(`Recibido: ${fmt.plural(delPal, 'palé', 'palés')} (${fmt.kg(delKg)}) en ${fmt.list(del.map((s) => `${s.id} del ${fmt.dayMonth(s.date)}`))}.`);
      pl.forEach((s) => body.push(`Planificado: ${fmt.plural(s.pallets, 'palé', 'palés')} en ${s.id}, ${whenText(s.date, s.time)}${s.dock ? ` (${s.dock})` : ''}: retener.`));
      return {
        icon: 'building',
        tone: del.length ? 'warn' : 'brand',
        title: c.label,
        meta: [COUNTRY[c.country] || c.country, c.channel, c.end_customer, `Aviso en ${c.country === 'ES' ? 'español' : 'inglés'}`],
        body: body.join(' '),
        side: html`${dec ? (dec.status === 'approved' ? chip('done', 'Borrador guardado') : chip('rejected', 'No preparado')) : del.length ? chip('pending', 'Notificar') : chip('info', 'Informar de la retención')}<button type="button" class="btn btn-secondary btn-sm" data-action="notice" data-customer="${c.id}">${icon('eye', 15)}<span>Ver aviso</span></button>`
      };
    });
    const holds = sc.retain.map((s) => ({
      icon: 'truck',
      tone: s.date === TODAY ? 'crit' : 'warn',
      title: `Retener ${s.id} en ${s.dock || 'muelle'}`,
      meta: [whenText(s.date, s.time), fmt.plural(s.pallets, 'palé', 'palés'), s.customer],
      body: `En una retirada real, el ${ROLE.dispatch_shift.toLowerCase()} no carga estos palés: ${fmt.list(uniq(s.sscc.map((p) => p.location)).map((l) => `${s.sscc.filter((p) => p.location === l).length} en ${l}`))}. SSCC en la pestaña «SSCC» y en el CSV.`
    }));
    return App.card({
      id: 'ret-customers',
      title: 'Clientes a notificar',
      sub: `${fmt.plural(sc.notify.length, 'cliente', 'clientes')} con producto entregado · ${sc.retain.length ? `${fmt.plural(sc.retain.length, 'expedición planificada', 'expediciones planificadas')} a retener` : 'sin expediciones planificadas'}`,
      icon: 'mail',
      flush: true,
      body: html`${App.list(items)}${holds.length ? html`<div class="ret-subhead">${icon('truck', 14)}<span>Expediciones a retener en muelle</span></div>${App.list(holds)}` : ''}`
    });
  }

  function approval(sc, run, dec) {
    const stock = sc.pallets.filter((p) => p.status !== 'expedido');
    const stockLoc = uniq(stock.map((p) => p.location)).map((l) => `${l} ${stock.filter((p) => p.location === l).length}`).join(' · ');
    const langs = uniq(sc.customers.map((c) => (c.country === 'ES' ? 'español' : 'inglés')));
    const scope = [
      { label: 'Clientes con producto entregado', value: sc.notify.length ? fmt.list(sc.notify.map((c) => c.label)) : 'Ninguno', status: sc.notify.length ? 'pending' : undefined, chip: sc.notify.length ? String(sc.notify.length) : undefined },
      { label: 'Expediciones planificadas a retener', value: sc.retain.length ? sc.retain.map((s) => `${s.id} · ${shortWhen(s.date, s.time)}`).join(' · ') : 'Ninguna' },
      { label: 'Palés en almacén que se bloquearían', value: stock.length ? `${stock.length} · ${stockLoc}` : 'Ninguno', status: 'evaluate', chip: 'Sin bloqueo en simulacro' }
    ];
    if (sc.bal.bulkLeft) scope.push({ label: 'Granel restante del mismo origen', value: fmt.kg(sc.bal.bulkLeft) });
    const effects = [
      `Outlook: ${fmt.plural(sc.customers.length, 'aviso guardado', 'avisos guardados')} como borrador con la marca SIMULACRO (${fmt.list(langs)}); no se envía nada`,
      `Elara: registro ${run.code} aprobado con los tiempos de cada actividad`,
      'SAP QM y Mecalux Easy WMS: sin cambios; en un simulacro no se bloquea stock'
    ];
    return App.approvalCard({
      id: 'ret-cierre',
      status: dec ? dec.status : 'pending',
      title: `Avisos a clientes y cierre del simulacro ${run.code}`,
      summary: `${sc.label}: trazado en ${fmt.ms(run.ms)}, ${sc.pallets.length} de ${sc.pallets.length} palés localizados y balance conciliado al ${pct1(sc.bal.reconciled)}.`,
      approver: ROLE.quality_shift,
      policy: 'PNT-CAL-015 · retener o bloquear producto requiere la aprobación de Calidad',
      scope,
      effects,
      approveLabel: 'Aprobar y cerrar simulacro',
      rejectLabel: 'Rechazar',
      decidedBy: dec ? dec.by : undefined,
      decidedAt: dec ? dec.at : undefined,
      comment: dec && dec.comment ? `Motivo: ${dec.comment}` : undefined,
      doneActions: dec ? html`<button type="button" class="btn btn-secondary" data-open-audit>${icon('history')}<span>Ver en auditoría</span></button><button type="button" class="btn btn-primary" data-action="pack">${icon('download')}<span>Descargar paquete de retirada</span></button>` : ''
    });
  }

  function compareCard(sc, run, dec) {
    const steps = streamSteps(sc, run.code).length;
    const review = dec ? secondsBetween(run.doneAt, dec.at) : null;
    const rows = [
      { k: 'Personas implicadas', today: '3–4: Calidad, Expedición, Producción y Administración', prodigy: `1: ${ROLE.quality_shift} revisa y aprueba` },
      { k: 'Sistemas consultados', today: '5–6 abiertos a mano: SAP, MES Mapex, Easy WMS, Elara, hojas de cálculo y correo', prodigy: '5 conectores consultados por los agentes: SAP, MES Mapex, Easy WMS, Elara y Outlook' },
      { k: 'Pasos', today: '12–16 consultas, cruces y cálculos manuales', prodigy: `${steps} pasos automáticos y 1 aprobación` },
      { k: 'Balance de masas', today: 'Hoja de cálculo con datos de varias fuentes', prodigy: `Calculado por etapa: ${pct1(sc.bal.reconciled)} conciliado` },
      { k: 'Tiempo', today: '1–4 h (estimación)', prodigy: review != null ? `${fmt.ms(run.ms)} de trazado + ${fmt.dur(review)} hasta la decisión de Calidad` : `${fmt.ms(run.ms)} de trazado · decisión de Calidad pendiente`, strong: true }
    ];
    return App.card({
      id: 'ret-compare',
      title: 'Hoy frente a Prodigy',
      sub: 'Mismo simulacro · la columna «Hoy» es un supuesto ilustrativo que se valida con una línea base en el piloto',
      icon: 'bar-chart',
      flush: true,
      body: App.table({ rows, cols: [
        { label: 'Concepto', width: '22%', render: (r) => html`<span class="strong">${r.k}</span>` },
        { label: 'Hoy (estimación a validar)', width: '39%', render: (r) => r.today },
        { label: 'Con Prodigy (simulación)', render: (r) => (r.strong ? html`<strong class="t-ok">${r.prodigy}</strong>` : r.prodigy) }
      ] }),
      footer: html`<span class="muted small row row-nowrap" style="align-items:flex-start">${icon('info', 16)}<span>Los valores de «Hoy» son supuestos ilustrativos y los segundos de esta demo corresponden a una simulación; en las semanas 1–2 del piloto se mide la línea base real de Congelados de Navarra.</span></span>`
    });
  }

  /* ---------------------------------------------------------------- Descargas */

  function csvContent(sc, run) {
    const shipOf = (p) => D.shipments[p.shipment || p.planned_shipment] || null;
    return App.csv({
      rows: sc.pallets,
      cols: [
        { label: 'Registro', value: () => run.code },
        { label: 'Lote', key: 'lot' },
        { label: 'Producto', value: (p) => D.lots[p.lot].info.product_name },
        { label: 'SSCC', key: 'sscc' },
        { label: 'Palé', value: (p) => `${p.n}/${p.of}` },
        { label: 'Kg', key: 'kg' },
        { label: 'Ubicación', value: (p) => (p.location === 'EXPEDIDO' ? 'Expedido' : p.location) },
        { label: 'Posición', value: (p) => p.position || '' },
        { label: 'Estado', value: (p) => (p.status === 'expedido' ? 'Expedido' : p.planned_shipment ? 'En stock · expedición planificada' : 'En stock') },
        { label: 'Expedición', value: (p) => p.shipment || p.planned_shipment || '' },
        { label: 'Fecha de expedición', value: (p) => { const s = shipOf(p); return s ? fmt.date(s.date, s.time) : ''; } },
        { label: 'Cliente', value: (p) => { const s = shipOf(p); return s ? (D.customers[s.customer] || {}).label || '' : ''; } },
        { label: 'País', value: (p) => { const s = shipOf(p); return s ? COUNTRY[(D.customers[s.customer] || {}).country] || '' : ''; } },
        { label: 'Acción en una retirada real', value: (p) => (p.status === 'expedido' ? 'Aviso al cliente' : p.planned_shipment ? 'Retener expedición' : 'Bloquear') }
      ]
    });
  }

  function downloadCsv(ctx) {
    const run = ctx.local.run;
    const sc = run && findScope(run.mode, run.code_in);
    if (!sc) return;
    App.downloadFile(`paquete-retirada-${run.code}-sscc.csv`, 'text/csv', csvContent(sc, run));
  }

  function openReport(ctx) {
    const run = ctx.local.run;
    const sc = run && findScope(run.mode, run.code_in);
    if (!sc) return;
    const dec = ctx.local.decision;
    const status = dec ? (dec.status === 'approved' ? 'Aprobado' : 'Rechazado') : 'Borrador';
    const rev = dec && dec.status === 'approved' ? '1' : '0';
    const b = sc.bal;
    const backRows = [];
    sc.parcels.forEach((code) => { const p = D.parcels[code] || {}; const u = sc.U.find((x) => x.parcels.includes(code)); backRows.push({ etapa: 'Parcela', ref: code, fecha: u ? `Cosecha ${fmt.date(u.intake.date)}` : '—', det: `${p.grower} · ${p.municipality} (${p.zone}) · ${p.crop} · ${fmt.num(p.ha)} ha · siembra ${fmt.date(p.sowing_date)}` }); });
    sc.U.forEach((u) => {
      if (!backRows.some((r) => r.ref === u.intake.ticket)) backRows.push({ etapa: 'Recepción', ref: u.intake.ticket, fecha: fmt.date(u.intake.date, u.intake.time), det: `${u.grower} · ${fmt.list(u.parcels)} · ${fmt.num(u.intake.net_t)} t netas` });
      if (u.bulk && !backRows.some((r) => r.ref === u.bulk.code)) backRows.push({ etapa: 'Granel', ref: u.bulk.code, fecha: fmt.date(u.bulk.date), det: `${u.bulk.line} · ${(u.bulk.route || []).join(' → ')} · ${storeLabel(u.bulk.storage)}` });
    });
    sc.lots.forEach((L) => backRows.push({ etapa: 'Lote', ref: L.info.code, fecha: fmt.date(L.info.production_date), det: `${L.info.product_name} · ${L.info.line_name} · ${(L.info.route || []).join(' → ')} · turno de ${L.info.shift}` }));
    const fwdRows = [];
    sc.product.forEach((p) => p.byLoc.forEach((x) => fwdRows.push({ dest: `${x.loc} · ${storeLabel(x.loc)}`, fecha: 'En almacén', pal: x.n, kg: x.kg, cliente: '—', estado: 'En stock' })));
    sc.shipments.forEach((s) => fwdRows.push({ dest: `${s.id}${s.dock ? ` · ${s.dock}` : ''}`, fecha: fmt.date(s.date, s.time), pal: s.pallets, kg: s.kg, cliente: `${s.customer} (${COUNTRY[(D.customers[s.customer_id] || {}).country] || ''})`, estado: s.status === 'expedida' ? 'Expedida' : 'Planificada: retener' }));
    const balSections = sc.flows.map((f, i) => ({
      heading: `5.${i + 1} ${f.title}`,
      table: { cols: [{ label: 'Concepto', key: 'label' }, { label: 'Etapa', key: 'stage' }, { label: 'Kg', key: 'kg', num: true }, { label: '%', key: 'pct', num: true }],
        rows: balanceRows(f).map((r) => ({ label: r.type === 'group' ? `— ${r.label}` : `${r.label}${r.sub ? ` · ${r.sub}` : ''}`, stage: r.type === 'group' || r.type === 'total' || r.type === 'diff' ? '' : (r.stage || '—'), kg: r.type === 'group' || r.kg == null ? '' : fmt.num(r.kg), pct: r.type === 'group' ? '' : r.type === 'total' ? pct1(r.pct) : fmt.pct(Math.abs(r.pct), 1) })) }
    }));
    const r = Object.assign({}, run, { decision: dec });
    const times = timingRows(sc, r).map((x) => ({ hora: fmt.time(x.at, true), act: x.what, quien: `${x.who}${x.sys ? ` · ${x.sys}` : ''}`, t: x.total != null ? fmt.dur(x.total) : x.ms ? fmt.ms(x.ms) : '0 s' }));
    const custRows = sc.customers.map((c) => ({ cliente: c.label, pais: COUNTRY[c.country] || c.country, exp: c.delivered.concat(c.planned).map((s) => s.id).join(', '), pal: String(sum(c.delivered, (s) => s.pallets)), accion: c.delivered.length ? `Aviso de retirada (${c.country === 'ES' ? 'español' : 'inglés'})` : 'Informar de la retención de la entrega' }));
    const decisionText = dec
      ? (dec.status === 'approved'
        ? `Aprobado por ${dec.by} el ${fmt.date(dec.at, { time: true })}. Avisos guardados como borrador con la marca SIMULACRO; no se ha enviado ninguno.`
        : `Rechazado por ${dec.by} el ${fmt.date(dec.at, { time: true })}. Motivo: ${dec.comment || '—'}. No se ha preparado ningún aviso.`)
      : 'Pendiente de la aprobación de Calidad.';
    const code = run.code;
    const pageCss = `<style>@page{@top-left{content:"Congelados de Navarra · Planta de Fustiñana";font:500 8.5px Inter,system-ui,sans-serif;color:var(--muted)}@top-right{content:"${code} · Rev. ${rev} · ${status}";font:600 8.5px Inter,system-ui,sans-serif;color:var(--muted)}@bottom-left{content:"Documento generado por Prodigy · demostración con datos sintéticos";font:8.5px Inter,system-ui,sans-serif;color:var(--muted)}@bottom-right{content:"Página " counter(page) " de " counter(pages);font:8.5px Inter,system-ui,sans-serif;color:var(--muted)}}</style>`;
    App.printableReport({
      title: `Simulacro de retirada · ${sc.label}`,
      subtitle: `Registro del ejercicio de trazabilidad y retirada · IFS Food v8 · BRCGS Food · FSSC 22000 · ${fmt.dateLong(TODAY)}`,
      code,
      filename: `simulacro-retirada-${code}`,
      kicker: 'Vista previa del registro',
      meta: [
        ['Revisión', rev], ['Estado', status], ['Planta', 'Fustiñana (FUS)'],
        ['Punto de partida', sc.label], ['Inicio', fmt.date(run.startedAt, { time: true, seconds: true })], ['Tiempo de trazado', fmt.ms(run.ms)],
        ['Palés localizados', `${sc.pallets.length} de ${sc.pallets.length}`], ['Balance de masas', `${pct1(b.reconciled)} conciliado`], ['Clientes a notificar', String(sc.notify.length)]
      ],
      footer: `Documento generado por Prodigy el ${fmt.date(App.nowISO(), { time: true })} · demostración con datos sintéticos · ${code} · revisión ${rev} · ${status.toLowerCase()}`,
      sections: [
        { heading: '1. Objeto y alcance', text: `Simulacro de retirada con punto de partida en ${MODES[sc.mode].noun} ${sc.code} (${scopeHeadline(sc)}). Se comprueba la trazabilidad hacia atrás (recepción, agricultor y parcela) y hacia delante (palés por SSCC, expediciones y clientes), con balance de masas. El ejercicio no bloquea stock ni envía avisos.` },
        { heading: '2. Resultado', list: [
          `Trazado simulado en ${fmt.ms(run.ms)}. Objetivo ilustrativo: 4 h, a confirmar por Calidad.`,
          `${sc.pallets.length} de ${sc.pallets.length} palés localizados (${fmt.kg(sum(sc.pallets, (p) => p.kg))}): ${fmt.plural(sc.pallets.filter((p) => p.status === 'expedido').length, 'expedido', 'expedidos')} y ${fmt.plural(b.stockN, 'en almacén', 'en almacén')}.`,
          `Balance de masas conciliado al ${pct1(b.reconciled)}: ${fmt.kg(b.received)} recibidos, ${fmt.kg(b.losses)} de mermas justificadas, ${fmt.kg(b.produced)} producidos${b.bulkLeft ? `, ${fmt.kg(b.bulkLeft)} de granel restante` : ''} y ${fmt.kg(b.diff)} sin justificar.`,
          `${fmt.plural(sc.notify.length, 'cliente', 'clientes')} con producto entregado y ${fmt.plural(sc.retain.length, 'expedición planificada', 'expediciones planificadas')} que se retendría${sc.retain.length === 1 ? '' : 'n'}.`,
          sc.otherLots.length ? `Otros lotes con la misma materia prima: ${fmt.list(sc.otherLots)}.` : 'Ningún otro lote comparte la materia prima del alcance.'
        ] },
        { heading: '3. Genealogía hacia atrás', table: { cols: [{ label: 'Etapa', key: 'etapa' }, { label: 'Referencia', key: 'ref', render: (x) => App.raw(`<span class="code">${App.esc(x.ref)}</span>`) }, { label: 'Fecha', key: 'fecha' }, { label: 'Detalle', key: 'det' }], rows: backRows } },
        { heading: '4. Genealogía hacia delante', table: { cols: [{ label: 'Destino', key: 'dest' }, { label: 'Fecha', key: 'fecha' }, { label: 'Palés', key: 'pal', num: true }, { label: 'Kg', render: (x) => fmt.num(x.kg), num: true }, { label: 'Cliente', key: 'cliente' }, { label: 'Estado', key: 'estado' }], rows: fwdRows } },
        { heading: '5. Balance de masas', text: 'Mermas declaradas en MES Mapex por etapa de la ruta; stock de granel en Mecalux Easy WMS; producto terminado en SAP. La diferencia sin justificar se muestra tal cual.' }
      ].concat(balSections).concat([
        { heading: `5.${balSections.length + 1} Producto terminado`, table: { cols: [{ label: 'Lote', key: 'lot' }, { label: 'Producido (kg)', render: (x) => fmt.num(x.produced), num: true }, { label: 'Expedido (kg)', render: (x) => fmt.num(x.shippedKg), num: true }, { label: 'En almacén (kg)', render: (x) => fmt.num(x.stockKg), num: true }, { label: 'Diferencia', render: (x) => fmt.num(x.diff), num: true }, { label: 'Localizado', render: (x) => pct1(x.locatedPct), num: true }], rows: sc.product } },
        { heading: '6. Palés y SSCC', table: { cols: [{ label: 'SSCC', render: (p) => App.raw(`<span class="code">${App.esc(p.sscc)}</span>`) }, { label: 'Lote', key: 'lot' }, { label: 'Palé', render: (p) => `${p.n}/${p.of}`, num: true }, { label: 'Kg', render: (p) => fmt.num(p.kg), num: true }, { label: 'Ubicación', render: (p) => (p.location === 'EXPEDIDO' ? 'Expedido' : `${p.location}${p.position ? ` · ${p.position}` : ''}`) }, { label: 'Expedición', render: (p) => p.shipment || p.planned_shipment || '—' }], rows: sc.pallets } },
        { heading: '7. Clientes a notificar', table: { cols: [{ label: 'Cliente', key: 'cliente' }, { label: 'País', key: 'pais' }, { label: 'Expediciones', key: 'exp' }, { label: 'Palés entregados', key: 'pal', num: true }, { label: 'Acción', key: 'accion' }], rows: custRows } },
        { heading: '8. Tiempos de las actividades clave', table: { cols: [{ label: 'Hora', key: 'hora' }, { label: 'Actividad', key: 'act' }, { label: 'Responsable y sistema', key: 'quien' }, { label: 'Transcurrido', key: 't', num: true }], rows: times } },
        { heading: '9. Decisión y conclusión', text: `${decisionText}\n\nConclusión: la información necesaria para una retirada se obtiene completa y cuadra en kilos. Acciones de mejora propuestas: verificar los contactos de retirada de cada cliente y revisar la merma de «bajo calibre» de la línea L2 con Producción.` },
        { heading: 'Nota', callout: 'Simulacro: no se ha bloqueado stock en SAP QM ni en Mecalux Easy WMS y no se ha enviado ningún aviso a clientes. Datos sintéticos de demostración.' },
        { html: App.raw(pageCss) }
      ]),
      signatures: [
        { role: 'Elaborado · Prodigy (agente Trazabilidad)', note: fmt.date(run.doneAt, { time: true }) },
        { role: `${dec && dec.status === 'rejected' ? 'Rechazado' : 'Aprobado'} · ${ROLE.quality_shift}`, note: dec ? fmt.date(dec.at, { time: true }) : 'Pendiente de aprobación' }
      ]
    });
  }

  /* ---------------------------------------------------------------- Acciones */

  function readInput(ctx) {
    const el = ctx.$('#ret-code');
    const mode = ctx.local.mode || 'lote';
    return { mode, code: el ? el.value : (Object.assign({}, DEFAULTS, ctx.local.codes || {}))[mode] };
  }

  async function start(ctx) {
    if (ctx.vars.busy || ctx.local.run) return;
    const { mode, code } = readInput(ctx);
    const sc = findScope(mode, code);
    if (!sc) {
      ctx.setLocal({ miss: { mode, code: norm(code) }, codes: Object.assign({}, ctx.local.codes, { [mode]: norm(code) }) });
      App.audit('Consulta de trazabilidad sin resultado', `${MODES[mode].label} «${norm(code) || '—'}» · no se inicia el simulacro`);
      const pv = ctx.$('#ret-preview');
      if (pv) pv.innerHTML = String(previewHTML(ctx, mode, code));
      return;
    }
    ctx.vars.busy = true;
    const regCode = ctx.local.nextCode || App.seq('SR-2026-', 4, 3);
    ctx.setLocal({ miss: null, nextCode: regCode, codes: Object.assign({}, ctx.local.codes, { [mode]: sc.code }) });
    const startedAt = App.nowISO();
    App.audit('Simulacro de retirada iniciado', `${regCode} · ${sc.label}`);
    ctx.vars.running = { sc, code: regCode, startedAt };
    ctx.presenter({ next: 'Mientras corre: «Mirad cómo aparece la genealogía, de la parcela al cliente, y qué sistema consulta cada paso». Si hace falta, pulsa «Acelerar».' });
    ctx.rerender();
    const host = ctx.$('#ret-run-log');
    const timer = ctx.$('#ret-timer');
    if (!host) return;
    const steps = streamSteps(sc, regCode);
    const run = App.reasoningStream(host, steps, {
      title: `Simulacro ${regCode} · ${sc.label}`, signal: ctx.signal, maxHeight: 320, start: startedAt,
      onStep: (s, i) => { if (timer) timer.textContent = fmt.ms(runMs(steps, i)); if (s.reveal != null) genReveal(ctx, s.reveal); }
    });
    const res = await run.done;
    if (!ctx.alive()) return;
    ctx.vars.busy = false;
    ctx.vars.running = null;
    const doneAt = App.nowISO();
    const b = sc.bal;
    ctx.setLocal({ run: { code: regCode, mode, code_in: sc.code, label: sc.label, startedAt, doneAt, ms: res.ms, steps: res.steps }, decision: null, nextCode: null, flow: null });
    App.audit('Traza hacia atrás completada', `${sc.label} · ${sc.intakes.map((i) => i.ticket).join(', ')} · ${fmt.list(sc.parcels)}`, actorOf(AG_TRACE));
    App.audit('Traza hacia delante completada', `${sc.pallets.length} SSCC · ${fmt.plural(sc.shipments.length, 'expedición', 'expediciones')} · ${fmt.plural(sc.customers.length, 'cliente', 'clientes')}`, actorOf(AG_TRACE));
    App.audit('Balance de masas calculado', `Conciliado ${pct1(b.reconciled)} · ${fmt.kg(b.diff)} sin justificar de ${fmt.kg(b.received)}`, actorOf(AG_BAL));
    App.audit('Registro de simulacro abierto en Elara', `${regCode} · borrador`, actorOf(AG_REC));
    App.audit('Avisos a clientes preparados sin enviar', `${fmt.plural(sc.customers.length, 'aviso', 'avisos')} · pendientes de aprobación`, actorOf(AG_REC));
    App.outcome('retirada', { status: 'done', label: `Simulacro ${regCode} trazado en ${fmt.ms(res.ms)}` });
    App.toast(`Simulacro ${regCode}: trazado en ${fmt.ms(res.ms)} · ${pct1(b.reconciled)} conciliado`, { tone: 'ok' });
    ctx.presenter(null);
    ctx.rerender();
    requestAnimationFrame(() => { const el = ctx.$('.kpis'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }

  function runMs(steps, i) { return sum(steps.slice(0, i + 1), (s) => s.ms); }

  async function decide(ctx, status) {
    const run = ctx.local.run;
    if (!run || ctx.local.decision) return;
    let comment = '';
    if (status === 'rejected') {
      const r = await App.promptText({ title: 'Rechazar el cierre del simulacro', label: 'Motivo del rechazo', placeholder: 'Por ejemplo: falta confirmar el contacto de retiradas del cliente', required: true, confirmLabel: 'Rechazar', danger: true });
      if (r == null || !ctx.alive()) return;
      comment = r;
    }
    const at = App.nowISO();
    ctx.setLocal({ decision: { status, at, by: ROLE.quality_shift, comment } });
    const sc = findScope(run.mode, run.code_in);
    if (status === 'approved') {
      App.audit('Simulacro de retirada aprobado', `${run.code} · ${run.label} · ${fmt.ms(run.ms)} · ${pct1(sc.bal.reconciled)} conciliado`);
      App.audit('Avisos guardados como borrador (simulacro, sin enviar)', `${run.code} · ${fmt.plural(sc.customers.length, 'aviso', 'avisos')} en Outlook`, actorOf(AG_REC));
      App.audit('Registro de simulacro aprobado en Elara', `${run.code} · revisión 1`, actorOf(AG_REC));
      App.outcome('retirada', { status: 'approved', label: `Simulacro ${run.code} aprobado` });
      App.toast(`Simulacro ${run.code} aprobado · avisos guardados como borrador, sin enviar`, { tone: 'ok' });
    } else {
      App.audit('Simulacro de retirada rechazado', `${run.code} · motivo: ${comment} · no se prepara ningún aviso`);
      App.outcome('retirada', { status: 'rejected', label: `Simulacro ${run.code} rechazado` });
      App.toast('Simulacro rechazado: no se ha preparado ningún aviso', { tone: 'warn' });
    }
    ctx.rerender();
    requestAnimationFrame(() => { const el = ctx.$('[data-approval-card="ret-cierre"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  }

  function newSimulation(ctx) {
    const run = ctx.local.run;
    if (!run) return;
    const sc = findScope(run.mode, run.code_in);
    const dec = ctx.local.decision;
    const hist = (ctx.local.history || []).concat([{ code: run.code, label: run.label, at: run.startedAt, ms: run.ms, reconciled: sc ? sc.bal.reconciled : 100, status: dec ? dec.status : 'draft' }]);
    App.audit('Simulacro archivado', `${run.code} · ${dec ? (dec.status === 'approved' ? 'aprobado' : 'rechazado') : 'sin decisión'}`);
    ctx.setLocal({ run: null, decision: null, history: hist, miss: null, flow: null });
    ctx.rerender();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function applyParams(ctx) {
    const p = norm(ctx.params && ctx.params[0]);
    if (!p || ctx.local.run || ctx.vars.paramDone === p) return;
    ctx.vars.paramDone = p;
    const mode = /^P-/.test(p) ? 'parcela' : /^G\d/.test(p) ? 'granel' : 'lote';
    ctx.setLocal({ mode, miss: null, codes: Object.assign({}, ctx.local.codes, { [mode]: p }) });
  }

  /* ---------------------------------------------------------------- Registro de la escena */

  App.scene({
    id: 'retirada',
    order: 50,
    section: 'Calidad',
    nav: 'Simulacro de retirada',
    title: 'Simulacro de retirada',
    icon: 'git-branch',
    presenter: {
      say: (state) => {
        const loc = state.scenes.retirada || {};
        const run = loc.run;
        if (!run) {
          return [
            'Simulacro de retirada con traza y balance de masas; en el piloto Calidad confirma el protocolo de auditoría y medimos el tiempo real.',
            'Se elige el punto de partida: un lote, todos los lotes de una parcela o un granel de campaña.',
            'Prodigy recorre SAP, Mapex y Easy WMS hacia atrás hasta la parcela y hacia delante hasta cada SSCC, expedición y cliente, y cuadra el balance en kilos.'
          ];
        }
        const sc = findScope(run.mode, run.code_in);
        const out = [
          `Trazado simulado en ${fmt.ms(run.ms)}; el objetivo de 4 horas es ilustrativo y lo confirma Calidad.`,
          sc ? `El balance cuadra en kilos: ${pct1(sc.bal.reconciled)} conciliado, con cada merma justificada por su etapa en Mapex. Lo que no cuadra (${fmt.kg(sc.bal.diff)}) se ve, no se reparte.` : '',
          sc && sc.retain.length ? `Lo accionable: ${sc.retain.map((s) => `${s.id} (${shortWhen(s.date, s.time)})`).join(' y ')} se retendría, y el stock del mismo origen se bloquearía.` : '',
          'Los avisos se preparan en el idioma de cada cliente, pero en un simulacro no se envía nada. Decide Calidad.'
        ];
        if (loc.decision) out.push('El registro sale con código, revisión, tiempos de cada actividad y bloque de firmas, como los registros de su sistema de calidad.');
        return out.filter(Boolean);
      },
      next: (state) => {
        const loc = state.scenes.retirada || {};
        if (!loc.run) return 'Pulsar «Iniciar simulacro» con el lote L26-261-FUS-GUI-03 (o elegir «Parcela P-0412-07»).';
        if (!loc.decision) return 'Pulsar «Ver aviso» del cliente y después «Aprobar y cerrar simulacro».';
        return '«Descargar paquete de retirada»: CSV de SSCC y registro imprimible. Después, «Cuestionario de cliente» (flecha derecha).';
      }
    },
    render(root, ctx) {
      applyParams(ctx);
      const running = ctx.vars.running;
      const run = ctx.local.run;
      const sc = run ? findScope(run.mode, run.code_in) : null;
      const dec = ctx.local.decision || null;
      const baseMeta = [
        { icon: 'calendar', text: `${fmt.cap(D.meta.weekday)} ${fmt.date(TODAY)}` },
        { icon: 'map-pin', text: 'Planta de Fustiñana' },
        { icon: 'user', text: ROLE.quality_shift }
      ];

      if (running) {
        const rs = running.sc;
        root.innerHTML = String(html`
          ${App.pageHead({ title: 'Simulacro de retirada', meta: baseMeta.concat([{ icon: 'hash', text: running.code }, { icon: MODES[rs.mode].icon, text: rs.label }]) })}
          ${App.card({
            id: 'ret-run',
            title: `Simulacro en curso · ${rs.label}`,
            sub: scopeHeadline(rs),
            icon: 'activity',
            actions: html`<div class="ret-timer" aria-live="off"><span class="ret-timer-label">Cronómetro</span><span class="ret-timer-num" id="ret-timer">0 ms</span><span class="ret-timer-ref">Objetivo demo: 4 h</span></div>`,
            body: html`<div class="stack">${genHTML(rs, false)}<div id="ret-run-log"></div></div>`
          })}`);
        genBind(ctx);
        return;
      }

      if (!run || !sc) {
        root.innerHTML = String(html`
          ${App.pageHead({ title: 'Simulacro de retirada', meta: baseMeta, desc: 'Ejercicio de trazabilidad y retirada para los simulacros de IFS Food y BRCGS: genealogía hacia atrás y hacia delante, balance de masas y clientes a notificar, a partir de un lote, una parcela o un granel.' })}
          <div class="grid cols-7-5">${setupCard(ctx)}${referenceCard()}</div>
          ${ctx.local.history && ctx.local.history.length ? html`<div class="section">${historyCard(ctx)}</div>` : ''}`);
        ctx.on('segchange', '[data-seg="ret-mode"]', (e) => { ctx.setLocal({ mode: e.detail.value, miss: null }); ctx.rerender(); const el = ctx.$('#ret-code'); if (el) { el.focus(); el.select(); } });
        ctx.on('input', '#ret-code', (e, el) => {
          const mode = ctx.local.mode || 'lote';
          ctx.setLocal({ codes: Object.assign({}, ctx.local.codes, { [mode]: el.value }), miss: null });
          const pv = ctx.$('#ret-preview');
          if (pv) pv.innerHTML = String(previewHTML(ctx, mode, el.value));
        });
        ctx.on('keydown', '#ret-code', (e) => { if (e.key === 'Enter') { e.preventDefault(); start(ctx); } });
        ctx.on('click', '[data-action="start"]', () => start(ctx));
        ctx.on('click', '[data-example]', (e, el) => {
          const [mode, code] = el.getAttribute('data-example').split('|');
          ctx.setLocal({ mode, miss: null, codes: Object.assign({}, ctx.local.codes, { [mode]: code }) });
          ctx.rerender();
        });
        return;
      }

      root.innerHTML = String(html`
        ${App.pageHead({
          title: 'Simulacro de retirada',
          meta: baseMeta.slice(0, 2).concat([{ icon: 'hash', text: `${run.code} · ${dec ? (dec.status === 'approved' ? 'aprobado' : 'rechazado') : 'borrador'}` }, { icon: MODES[run.mode].icon, text: sc.label }]),
          actions: html`<button type="button" class="btn btn-secondary" data-action="new">${icon('plus')}<span>Nuevo simulacro</span></button><button type="button" class="btn btn-primary" data-action="pack">${icon('download')}<span>Descargar paquete de retirada</span></button>`
        })}
        ${kpis(sc, run)}
        <div class="section">${genCard(sc, run)}</div>
        <div class="grid cols-7-5 section">${balanceCard(ctx, sc)}<div class="stack ret-side">${clockCard(sc, run, dec)}${referenceCard()}</div></div>
        <div class="grid cols-5-7 section">${customersCard(ctx, sc, run, dec)}${approval(sc, run, dec)}</div>
        <div class="section">${palletsCard(ctx, sc)}</div>
        <div class="section">${compareCard(sc, run, dec)}</div>
      `);
      genBind(ctx);
      const log = ctx.$('#ret-log');
      if (log) App.reasoningStream(log, streamSteps(sc, run.code), { title: `Simulacro ${run.code} · ${sc.label}`, instant: true, start: run.startedAt, maxHeight: 420 });
      ctx.on('click', '[data-action="new"]', () => newSimulation(ctx));
      ctx.on('click', '[data-action="pack"]', () => { downloadCsv(ctx); openReport(ctx); });
      ctx.on('click', '[data-action="csv"]', () => downloadCsv(ctx));
      ctx.on('click', '[data-action="notice"]', (e, el) => openNotice(ctx, sc, el.getAttribute('data-customer')));
      ctx.on('click', '[data-approval="approve"]', () => decide(ctx, 'approved'));
      ctx.on('click', '[data-approval="reject"]', () => decide(ctx, 'rejected'));
      ctx.on('click', '[data-action="scroll-balance"]', () => { const el = ctx.$('#ret-balance'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      ctx.on('click', '[data-action="scroll-customers"]', () => { const el = ctx.$('#ret-customers'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      ctx.on('segchange', '[data-seg="ret-flow"]', (e) => {
        ctx.setLocal({ flow: e.detail.value });
        const card = ctx.$('#ret-balance');
        if (card) card.outerHTML = String(balanceCard(ctx, sc));
      });
      ctx.on('keydown', '.gen-node[data-lot]', (e, el) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
    },
    onLeave(ctx) {
      if (ctx.vars.ro) { try { ctx.vars.ro.disconnect(); } catch (e) { /* sin observador */ } ctx.vars.ro = null; }
    }
  });
})();
