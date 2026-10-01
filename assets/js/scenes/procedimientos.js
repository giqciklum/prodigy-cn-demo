/*
 * Escena «procedimientos» · Preguntar a los procedimientos (SPEC §4.7).
 *  - Respuestas extractivas: cada frase lleva su cita [n] a un pasaje literal de un documento indexado
 *    (window.CN_DOCS, en procedimientos-docs.js); el panel «Fuente» abre el documento con ese pasaje resaltado.
 *  - Sin fuente no hay respuesta: «No hay evidencia suficiente en los procedimientos indexados», sin citas.
 *  - Las respuestas se cruzan con los datos de planta de CN_DATA (alarma de C-07, UKC-44718, DM-1, DP-2/OPT-2).
 *  - render() es idempotente: la conversación y la cita seleccionada viven en ctx.local.
 *  - Enlace directo a un documento: #procedimientos/PNT-CAL-012 (opcional: /4 para abrir el apartado).
 */
(function () {
  'use strict';

  const { html, icon, fmt, chip, sys } = App;
  const D = window.CN_DATA;
  const ROLE = D.roles;
  const AGENT = 'Procedimientos';
  const AGENT_ACTOR = 'Prodigy · agente Procedimientos';
  const NONE_TITLE = 'No hay evidencia suficiente en los procedimientos indexados';

  /* ---------------------------------------------------------------- Documentos (procedimientos-docs.js) */

  const DOCS_SRC = (function () {
    try {
      const s = document.currentScript && document.currentScript.src;
      if (s) return s.replace(/procedimientos\.js(\?.*)?$/, 'procedimientos-docs.js');
    } catch (e) { /* sin currentScript */ }
    return 'assets/js/scenes/procedimientos-docs.js';
  })();
  let docsPromise = null;
  /** Carga window.CN_DOCS si index.html no la ha cargado ya (lo reutiliza también «cuestionario»). */
  function ensureDocs() {
    if (window.CN_DOCS) return Promise.resolve(window.CN_DOCS);
    if (docsPromise) return docsPromise;
    docsPromise = new Promise((resolve, reject) => {
      let el = Array.from(document.scripts).find((s) => /procedimientos-docs\.js/.test(s.src || ''));
      const fresh = !el;
      if (fresh) {
        el = document.createElement('script');
        el.src = DOCS_SRC;
        el.async = false;
        el.setAttribute('data-cn-docs', '');
      }
      el.addEventListener('load', () => (window.CN_DOCS ? resolve(window.CN_DOCS) : reject(new Error('CN_DOCS'))));
      el.addEventListener('error', () => { docsPromise = null; reject(new Error('CN_DOCS')); });
      if (fresh) document.head.appendChild(el);
    });
    return docsPromise;
  }
  const docsReady = ensureDocs();
  docsReady.catch(() => { /* la escena muestra el aviso al pintarse */ });
  /* Promesa para otras escenas (p. ej. «cuestionario»): window.CN_DOCS_READY.then((docs) => …) */
  if (!window.CN_DOCS_READY) window.CN_DOCS_READY = docsReady;
  const K = () => window.CN_DOCS;
  const T = (s) => K().tidy(s);

  /* ---------------------------------------------------------------- Datos de planta que usan las respuestas */

  const exc = D.excursion_c07;
  const chamber = D.chamber_c07;
  const lotsC07 = D.lots_in_c07;
  const palletsC07 = lotsC07.reduce((s, l) => s + l.pallets, 0);
  const complaint = D.complaint;
  const complaintLot = D.lots[complaint.lot];
  const dpOrder = (complaintLot.back.maintenance || []).find((m) => m.equipment === 'DP-2');
  const daysOpen = fmt.days(dpOrder.date, D.meta.today);
  const byCode = Object.fromEntries(D.machines.map((m) => [m.code, m]));
  const similar = (D.complaint_history || []).find((h) => h.similar);
  const elsewhere = lotsC07.map((l) => ({ lot: l.lot, locs: ((D.lots[l.lot] || {}).forward || {}).by_location || [] }))
    .flatMap((x) => x.locs.filter((b) => b.location !== chamber.code).map((b) => ({ lot: x.lot, location: b.location, pallets: b.pallets })))
    .sort((a, b) => a.location.localeCompare(b.location));
  const elsewherePallets = elsewhere.reduce((s, x) => s + x.pallets, 0);

  /* ---------------------------------------------------------------- Respuestas preparadas (extractivas) */

  const cite = (doc, sec, quote) => ({ doc, sec: String(sec), quote });
  const P = (t, ...c) => ({ t, c });
  const UL = (intro, items) => ({ intro, list: items });

  const INTENTS = [
    {
      id: 'camara', icon: 'thermometer', topic: 'Cadena de frío · excursiones de temperatura', scope: 'FUS',
      q: '¿Qué hay que hacer si una cámara supera −18 °C?',
      anchors: ['cámara', 'cámaras', 'excursión', 'temperatura', 'frío', '18', 'silo', 'silos'],
      terms: ['supera', 'superar', 'sube', 'subir', 'calienta', 'caliente', 'alarma', 'bloquear', 'bloqueo', 'actuar', 'actuación', 'pierde', 'perder', 'rotura', 'cadena', 'encima', 'palés', 'minutos', '15', 'criterio', 'crítica', 'puerta', 'abre', 'abierta'],
      min: 3,
      build: () => ({
        blocks: [
          P('Si la temperatura de aire supera −18 °C durante más de 15 min seguidos, se bloquean todos los palés expuestos y no se expiden hasta evaluarlos.', cite('PNT-CAL-012', 4, 'Si la temperatura de aire supera −18 °C durante más de 15 min seguidos, se bloquean todos los palés expuestos')),
          P('Si en algún momento supera −15 °C, la excursión es crítica: además del bloqueo, se abre una no conformidad en Elara y se informa al Responsable de Calidad de planta.', cite('PNT-CAL-012', 4, 'Si en algún momento supera −15 °C, la excursión es crítica')),
          P('El bloqueo se registra a la vez en SAP QM y en Mecalux Easy WMS, que no permite cargar un palé bloqueado.', cite('PNT-CAL-015', 3, 'Todo bloqueo se registra a la vez en SAP QM (lote con bloqueo de calidad) y en Mecalux Easy WMS (palés inmovilizados y expediciones retenidas).')),
          P('Cada lote expuesto se evalúa antes de expedirlo: temperatura de producto con sonda, análisis sensorial y decisión de destino (liberar, reclasificar o destruir).', cite('PNT-CAL-012', 5, 'Los palés expuestos se evalúan por lote antes de cualquier expedición.')),
          P('Se avisa al Jefe de turno de expedición por Microsoft Teams para retener las cargas con palés expuestos.', cite('PNT-CAL-012', 6, 'Se avisa al Jefe de turno de expedición por Microsoft Teams para retener las cargas planificadas con palés expuestos.'))
        ],
        context: ({
          systems: ['SCADA Galileo', 'Mecalux Easy WMS'],
          text: `Alarma ${chamber.alarm_id} de hoy en ${chamber.code}: ${exc.minutes_above_limit} min por encima de ${fmt.temp(exc.limit)} y ${exc.minutes_above_critical} min por encima de ${fmt.temp(exc.critical)}, con pico de ${fmt.temp(exc.peak)} a las ${exc.peak_time}. Por el apartado 4 es una excursión crítica: bloqueo de los ${palletsC07} palés expuestos (${lotsC07.length} lotes) y no conformidad en Elara.`,
          outcome: 'alarma',
          go: 'alarma', goLabel: `Abrir alarma ${chamber.code}`
        }),
        followups: ['liberar', 'mismo-lote']
      })
    },
    {
      id: 'mismo-lote', icon: 'layers', topic: 'Cadena de frío · alcance del bloqueo', scope: 'FUS',
      q: '¿Hay que bloquear los palés del mismo lote que están en otras ubicaciones?',
      anchors: ['ubicaciones', 'ubicación', 'mismo lote', 'otras cámaras', 'otros silos', 'resto del lote', 'otras ubicaciones'],
      terms: ['bloquear', 'bloqueo', 'palés', 'lote', 'silo', 'silos', 'evaluar', 'mismo'],
      min: 3,
      build: () => ({
        blocks: [
          P('No de forma automática: se marcan «a evaluar» y el Responsable de Calidad de turno decide su alcance a la vista de los resultados.', cite('PNT-CAL-012', 4, 'se marcan «a evaluar» y el Responsable de Calidad de turno decide su alcance a la vista de los resultados')),
          P('Si la evaluación permite separar los palés afectados de los que no lo están, el lote puede liberarse por palés (SSCC).', cite('PNT-CAL-015', 5, 'Un lote puede liberarse por palés (SSCC) cuando la evaluación permite separar los palés afectados de los que no lo están.'))
        ],
        context: ({
          systems: ['Mecalux Easy WMS'],
          text: `Los ${lotsC07.length} lotes expuestos en ${chamber.code} tienen además ${elsewherePallets} palés en los silos (${elsewhere.map((x) => `${x.location}: ${x.pallets}`).join(' · ')}). Quedan «a evaluar», sin bloqueo automático.`,
          go: 'alarma', goLabel: `Abrir alarma ${chamber.code}`
        }),
        followups: ['liberar', 'evaluacion']
      })
    },
    {
      id: 'responsables', icon: 'users', topic: 'Cadena de frío · responsabilidades', scope: 'FUS',
      q: '¿Quién hace qué en una excursión de temperatura?',
      anchors: ['responsable', 'responsables', 'responsabilidad', 'responsabilidades', 'mantenimiento frigorífico', 'jefe de turno de expedición'],
      terms: ['excursión', 'temperatura', 'cámara', 'alarma', 'frío', 'quién', 'hace', 'decide', 'aprueba'],
      min: 4,
      build: () => ({
        blocks: [
          UL(P('Reparto de responsabilidades ante una excursión:'), [
            P('Responsable de Calidad de turno: valora la excursión, aprueba el bloqueo y decide la evaluación del producto.', cite('PNT-CAL-012', 3, 'Responsable de Calidad de turno: valora la excursión, aprueba el bloqueo y decide la evaluación del producto.')),
            P('Jefe de turno de expedición: retiene las cargas con palés expuestos hasta la decisión de Calidad.', cite('PNT-CAL-012', 3, 'Jefe de turno de expedición: retiene las cargas con palés expuestos hasta la decisión de Calidad.')),
            P('Mantenimiento frigorífico: restablece la temperatura, investiga la causa y registra la intervención.', cite('PNT-CAL-012', 3, 'Mantenimiento frigorífico: restablece la temperatura, investiga la causa y registra la intervención.'))
          ]),
          P('Si la excursión es crítica, se informa además al Responsable de Calidad de planta.', cite('PNT-CAL-012', 4, 'se abre una no conformidad en Elara y se informa al Responsable de Calidad de planta'))
        ],
        context: ({
          systems: ['SCADA Galileo', 'Microsoft Teams'],
          text: `En la alarma de ${chamber.code} de hoy, ${fmt.text(chamber.probable_cause).replace(/^Hipótesis a confirmar por Mantenimiento frigorífico: /, 'Mantenimiento frigorífico tiene que confirmar la hipótesis de causa: ').replace(/(\d{2}:\d{2})-(\d{2}:\d{2})/g, '$1–$2')}`,
          go: 'alarma', goLabel: `Abrir alarma ${chamber.code}`
        }),
        followups: ['camara', 'liberar']
      })
    },
    {
      id: 'evaluacion', icon: 'flask', topic: 'Cadena de frío · evaluación del producto', scope: 'FUS',
      q: '¿Cómo se evalúa el producto expuesto a una excursión?',
      anchors: ['evalúa', 'evaluar', 'evaluación', 'sonda', 'sensorial', 'destino'],
      terms: ['producto', 'expuesto', 'palés', 'excursión', 'temperatura', 'cámara', 'lote', 'mide', 'medir'],
      min: 3,
      build: () => ({
        blocks: [
          UL(P('La evaluación se hace por lote y antes de cualquier expedición:', cite('PNT-CAL-012', 5, 'Los palés expuestos se evalúan por lote antes de cualquier expedición.')), [
            P('Temperatura de producto con sonda en los palés expuestos, en la capa exterior y en el centro.', cite('PNT-CAL-012', 5, 'Medir la temperatura de producto con sonda en los palés expuestos (capa exterior y centro).')),
            P('Análisis sensorial y de aspecto por lote: cristales de hielo y apelmazado.', cite('PNT-CAL-012', 5, 'Análisis sensorial y de aspecto (cristales de hielo, apelmazado) por lote.')),
            P('Decisión de destino por lote: liberar, reclasificar o destruir.', cite('PNT-CAL-012', 5, 'Decisión de destino por lote: liberar, reclasificar o destruir.'))
          ]),
          P('La decisión de empleo se registra en SAP QM y exige evidencia documentada.', cite('PNT-CAL-015', 4, 'La liberación exige evidencia documentada: resultados de la evaluación, análisis cuando procedan y conclusión firmada.'))
        ],
        followups: ['liberar', 'camara']
      })
    },
    {
      id: 'liberar', icon: 'unlock', topic: 'Bloqueo y liberación de producto', scope: 'FUS',
      q: '¿Quién puede liberar un lote bloqueado?',
      anchors: ['liberar', 'liberación', 'libera', 'liberarlo', 'desbloquear', 'desbloqueo', 'decisión de empleo'],
      terms: ['quién', 'lote', 'bloqueado', 'bloqueo', 'retenido', 'retención', 'producto', 'palés', 'firma', 'autoriza', 'puede'],
      min: 3,
      build: () => ({
        blocks: [
          P('Solo el Responsable de Calidad: el de planta o, por delegación, el de turno.', cite('PNT-CAL-015', 2, 'Solo el Responsable de Calidad (de planta o, por delegación, de turno) puede liberar producto bloqueado.')),
          P('La liberación exige evidencia documentada (resultados de la evaluación, análisis cuando procedan y conclusión firmada) y se registra como decisión de empleo en SAP QM: liberar, reclasificar o destruir.', cite('PNT-CAL-015', 4, 'La liberación exige evidencia documentada: resultados de la evaluación, análisis cuando procedan y conclusión firmada.'), cite('PNT-CAL-015', 4, 'La decisión de empleo se registra en SAP QM y puede ser liberar, reclasificar (industria o segunda calidad) o destruir.')),
          P('Ningún producto se libera por defecto ni por vencimiento de plazo.', cite('PNT-CAL-015', 4, 'Ningún producto se libera por defecto ni por vencimiento de plazo.')),
          P('Si la evaluación lo permite, el lote puede liberarse por palés (SSCC).', cite('PNT-CAL-015', 5, 'Un lote puede liberarse por palés (SSCC)'))
        ],
        followups: ['registro', 'expedido']
      })
    },
    {
      id: 'bloqueo-quien', icon: 'user-check', topic: 'Bloqueo de producto · quién decide', scope: 'FUS',
      q: '¿Quién decide un bloqueo de calidad?',
      anchors: ['bloqueo', 'bloquear', 'bloquea', 'retención', 'retener'],
      terms: ['quién', 'decide', 'aprueba', 'autoriza', 'propone', 'responsable', 'firma'],
      min: 4,
      build: () => ({
        blocks: [
          P('Cualquier responsable de turno puede proponer un bloqueo al detectar una desviación.', cite('PNT-CAL-015', 2, 'Cualquier responsable de turno puede proponer un bloqueo al detectar una desviación.')),
          P('Lo aprueba el Responsable de Calidad de turno, que también define su alcance.', cite('PNT-CAL-015', 2, 'El Responsable de Calidad de turno aprueba el bloqueo y define su alcance.')),
          P('En una excursión de temperatura, el Responsable de Calidad de turno valora la excursión, aprueba el bloqueo y decide la evaluación del producto.', cite('PNT-CAL-012', 3, 'Responsable de Calidad de turno: valora la excursión, aprueba el bloqueo y decide la evaluación del producto.')),
          P('Liberar, en cambio, solo puede hacerlo el Responsable de Calidad, de planta o, por delegación, de turno.', cite('PNT-CAL-015', 2, 'Solo el Responsable de Calidad (de planta o, por delegación, de turno) puede liberar producto bloqueado.'))
        ],
        followups: ['liberar', 'registro']
      })
    },
    {
      id: 'registro', icon: 'lock', topic: 'Bloqueo y liberación · registro', scope: 'FUS',
      q: '¿Dónde se registra un bloqueo de calidad?',
      anchors: ['registra', 'registrar', 'registro', 'sap qm', 'easy wms', 'inmovilizar', 'inmovilizados'],
      terms: ['bloqueo', 'bloquear', 'bloqueado', 'calidad', 'palés', 'lote', 'dónde'],
      min: 3,
      build: () => ({
        blocks: [
          P('A la vez en SAP QM (lote con bloqueo de calidad) y en Mecalux Easy WMS (palés inmovilizados y expediciones retenidas).', cite('PNT-CAL-015', 3, 'Todo bloqueo se registra a la vez en SAP QM (lote con bloqueo de calidad) y en Mecalux Easy WMS (palés inmovilizados y expediciones retenidas).')),
          P('Easy WMS no permite cargar un palé bloqueado.', cite('PNT-CAL-015', 3, 'Easy WMS no permite cargar un palé bloqueado.')),
          P('El registro incluye el motivo, el alcance (lotes, SSCC y ubicaciones), la referencia de origen y quién lo aprueba.', cite('PNT-CAL-015', 3, 'El registro incluye el motivo, el alcance (lotes, SSCC y ubicaciones), la referencia de origen (alarma, no conformidad o reclamación) y quién lo aprueba.'))
        ],
        followups: ['liberar']
      })
    },
    {
      id: 'expedido', icon: 'truck', topic: 'Producto ya expedido', scope: 'FUS', kind: 'partial',
      q: '¿Qué se hace si el producto afectado ya se ha expedido?',
      anchors: ['=expedido', '=expedida', '=expedidos', '=expedidas', 'ya salió', 'ya ha salido', 'en el cliente'],
      terms: ['producto', 'lote', 'afectado', 'bloqueo', 'palés', 'cliente', 'retirada'],
      min: 2,
      build: () => ({
        blocks: [
          P('Si parte del lote ya se ha expedido, el Responsable de Calidad de planta valora la retirada o recuperación según PNT-CAL-018 e informa al cliente.', cite('PNT-CAL-015', 6, 'el Responsable de Calidad de planta valora la retirada o recuperación según PNT-CAL-018 (Trazabilidad y retirada de producto)'))
        ],
        note: 'PNT-CAL-018 (Trazabilidad y retirada de producto) no está entre los documentos indexados: los pasos de la retirada no se pueden detallar desde esta consulta.',
        followups: ['liberar']
      })
    },
    {
      id: 'plazos', icon: 'mail', topic: 'Reclamaciones de cliente · plazos', scope: 'ALL',
      q: '¿Qué plazos tenemos para responder a una reclamación de cliente?',
      anchors: ['reclamación', 'reclamaciones', 'queja', 'quejas', '8d'],
      terms: ['plazo', 'plazos', 'tiempo', 'responder', 'contestar', 'acuse', 'días', 'horas', 'cuándo', 'enviar', 'entregar', 'límite', 'vence', 'tenemos', 'gestiona', 'gestionar', 'gestión', 'proceso', 'procedimiento', 'tratar', 'trata'],
      min: 3,
      build: () => ({
        blocks: [
          UL(P('Plazos del procedimiento de reclamaciones:'), [
            P('Acuse de recibo al cliente en 24 h desde la recepción.', cite('PNT-CAL-020', 2, 'Acuse de recibo al cliente: 24 h desde la recepción.')),
            P('Contención en 48 h: identificar y bloquear el stock del lote reclamado.', cite('PNT-CAL-020', 2, 'Contención: 48 h para identificar y bloquear el stock del lote reclamado (PNT-CAL-015).')),
            P('Informe 8D en el plazo pactado con el cliente; si no hay plazo pactado, 5 días hábiles.', cite('PNT-CAL-020', 2, 'Informe 8D: en el plazo pactado con el cliente; si no hay plazo pactado, 5 días hábiles.'))
          ]),
          P('La respuesta se redacta en el idioma del cliente y la aprueba el Responsable de Calidad de planta antes de enviarla.', cite('PNT-CAL-020', 6, 'La respuesta se redacta en el idioma del cliente y la aprueba el Responsable de Calidad de planta antes de enviarla.'))
        ],
        context: ({
          systems: ['Elara'],
          text: `Reclamación ${complaint.code} (${D.customers[complaint.customer].label}), recibida el ${fmt.date(complaint.received_date)} a las ${complaint.received_time}: el cliente pide el informe en 5 días hábiles, antes del ${fmt.date(complaint.response_due)}.`,
          outcome: 'reclamacion',
          go: 'reclamacion', goLabel: `Abrir reclamación ${complaint.code}`
        }),
        followups: ['cuerpo-extrano', '8d']
      })
    },
    {
      id: '8d', icon: 'list-checks', topic: 'Reclamaciones · informe 8D', scope: 'ALL',
      q: '¿Qué debe incluir un informe 8D?',
      anchors: ['8d', 'ocho disciplinas', 'd1', 'd4', 'd8'],
      terms: ['informe', 'incluir', 'incluye', 'pasos', 'contenido', 'estructura', 'apartados', 'disciplinas', 'partes', 'plantilla'],
      min: 2,
      build: () => ({
        blocks: [
          UL(P('El informe 8D se prepara en Elara y sigue ocho pasos:', cite('PNT-CAL-020', 5, 'El informe 8D se prepara en Elara y sigue ocho pasos:')), [
            P('D1 · Equipo: Calidad de planta, Producción y Mantenimiento de línea.'),
            P('D2 · Descripción del problema con los datos del cliente.'),
            P('D3 · Contención: stock bloqueado y producto en poder del cliente.'),
            P('D4 · Causa raíz, confirmada con evidencia.'),
            P('D5 · Acciones correctivas.'),
            P('D6 · Implantación y verificación de la eficacia.'),
            P('D7 · Prevención: cambios en procedimientos, planes de mantenimiento o formación.'),
            P('D8 · Cierre y comunicación al cliente.')
          ]),
          P('Una causa solo se comunica como confirmada cuando hay evidencia; hasta entonces se presenta como hipótesis en investigación.', cite('PNT-CAL-020', 6, 'Una causa solo se comunica como confirmada cuando hay evidencia; hasta entonces se presenta como hipótesis en investigación.'))
        ],
        followups: ['plazos', 'cuerpo-extrano']
      })
    },
    {
      id: 'cuerpo-extrano', icon: 'search', topic: 'Reclamaciones · cuerpos extraños', scope: 'ALL',
      q: '¿Cómo se investiga una reclamación por piedra o cuerpo extraño?',
      anchors: ['piedra', 'piedras', 'cuerpo extraño', 'cuerpos extraños', 'objeto extraño', 'cristal', 'vidrio', 'plástico'],
      terms: ['reclamación', 'reclamaciones', 'queja', 'investiga', 'investigar', 'investigación', 'gravedad', 'clasifica', 'cliente', 'consumidor', 'mm'],
      min: 3,
      build: () => ({
        blocks: [
          P('Es de gravedad alta: cuerpos extraños duros o cortantes de 7 mm o más, aunque no haya lesión. Se informa en el día al Responsable de Calidad de planta.', cite('PNT-CAL-020', 3, 'Gravedad alta: cuerpos extraños duros o cortantes de 7 mm o más, aunque no haya lesión')),
          UL(P('La investigación revisa como mínimo:', cite('PNT-CAL-020', 4, 'La investigación de una reclamación por cuerpo extraño revisa, como mínimo:')), [
            P('La trazabilidad del lote hacia atrás (campo, recepción, línea y turno) y hacia delante (palés y expediciones).'),
            P('Los registros de despedregadora, selectora óptica y detector de metales en la fecha de fabricación.'),
            P('El historial de mantenimiento de esos equipos, incluidas las órdenes abiertas.', cite('PNT-CAL-020', 4, 'Historial de mantenimiento de los equipos de control de cuerpos extraños de la línea, incluidas las órdenes abiertas.')),
            P('Las reclamaciones similares de los últimos 12 meses en cualquier planta del grupo.')
          ]),
          P('En la respuesta al cliente, la causa se presenta como hipótesis hasta que haya evidencia.', cite('PNT-CAL-020', 6, 'Una causa solo se comunica como confirmada cuando hay evidencia'))
        ],
        context: ({
          systems: ['Elara', 'GMAO'],
          text: `${complaint.code}: ${complaint.defect.type} de ${complaint.defect.size_mm} mm en el lote ${complaint.lot} (L2, ${fmt.date(complaintLot.info.production_date)}), gravedad alta según el apartado 3. La despedregadora DP-2 tiene abierta la ${dpOrder.work_order} desde el ${fmt.date(dpOrder.date)}${similar ? ` y hay una reclamación similar: ${similar.id} (${fmt.text(similar.description).toLowerCase()}, ${similar.nc})` : ''}.`,
          outcome: 'reclamacion',
          go: 'reclamacion', goLabel: `Abrir reclamación ${complaint.code}`
        }),
        followups: ['malla', '8d']
      })
    },
    {
      id: 'detector', icon: 'shield-check', topic: 'Cuerpos extraños · detector de metales (PCC)', scope: 'FUS',
      q: '¿Cada cuánto se verifica el detector de metales y qué pasa si falla?',
      anchors: ['detector', 'detectores', 'metales', 'metal', 'probetas', 'probeta', 'pcc'],
      terms: ['verifica', 'verificar', 'verificación', 'cada cuánto', 'frecuencia', 'falla', 'fallo', 'horas', 'retener', 'retiene', 'rechazo', 'rechazado'],
      min: 2,
      build: () => {
        const dm1 = byCode['DM-1'];
        const lastOk = ((dm1.note || '').match(/\((\d{2}:\d{2})\)/) || [])[1] || '';
        return {
          blocks: [
            P('El detector de metales es un PCC. Se verifica con probetas certificadas de Fe 2,0 mm, no férrico 2,5 mm y acero inoxidable 3,0 mm al inicio del turno, cada 2 h y al final de la producción.', cite('PNT-CAL-031', 4, 'Se verifica con probetas certificadas de Fe 2,0 mm, no férrico 2,5 mm y acero inoxidable 3,0 mm al inicio del turno, cada 2 h y al final de la producción.')),
            P('Si una verificación falla o se superan las 2 h sin verificar, se retiene todo el producto envasado desde la última verificación correcta y se vuelve a pasar por el detector una vez corregido el equipo.', cite('PNT-CAL-031', 4, 'Si una verificación falla o se superan las 2 h sin verificar, se retiene todo el producto envasado desde la última verificación correcta')),
            P('El producto rechazado cae a un contenedor cerrado con llave que solo abre Calidad.', cite('PNT-CAL-031', 4, 'El producto rechazado cae a un contenedor cerrado con llave; solo Calidad lo abre y registra su contenido.')),
            P('Cada verificación se registra en la hoja de PCC de Elara, firmada por el operador y revisada por Calidad.', cite('PNT-CAL-031', 5, 'Verificaciones del detector: hoja de PCC en Elara, firmada por el operador y revisada por Calidad.'))
          ],
          context: ({
            systems: ['MES Mapex', 'Elara'],
            text: `${dm1.code} (línea ${dm1.line}) lleva ${fmt.num(dm1.reading)} h sin verificar (máximo ${fmt.num(dm1.baseline)} h)${lastOk ? `; la última verificación correcta fue a las ${lastOk}` : ''}. Por el apartado 4 corresponde retener el producto envasado en ${dm1.line} desde esa hora; la retención la aprueba Calidad (PNT-CAL-015).`,
            go: 'turno', goLabel: 'Ver parte diario'
          }),
          followups: ['optica', 'malla']
        };
      }
    },
    {
      id: 'optica', icon: 'eye', topic: 'Cuerpos extraños · selectoras ópticas', scope: 'FUS',
      q: '¿Qué hacer si la selectora óptica rechaza más de lo normal?',
      anchors: ['óptica', 'ópticas', 'selectora', 'selectoras'],
      terms: ['rechazo', 'rechaza', 'rechazos', 'tasa', 'porcentaje', 'normal', 'alta', 'sube', 'referencia', 'hacer'],
      min: 2,
      build: () => {
        const opt = byCode['OPT-2'];
        return {
          blocks: [
            P('Cada selectora tiene una tasa de rechazo de referencia por producto, fijada en MES Mapex (1,5 % en guisante).', cite('PNT-CAL-031', 3, 'Cada selectora tiene una tasa de rechazo de referencia por producto, fijada en MES Mapex (por ejemplo, 1,5 % en guisante).')),
            UL(null, [
              P('Por encima del 2,5 %, el operador revisa la entrada de producto y las barreras anteriores, en especial la despedregadora.', cite('PNT-CAL-031', 3, 'Rechazo por encima del 2,5 %: el operador revisa la entrada de producto y las barreras anteriores, en especial la despedregadora.')),
              P('Por encima del 4 %, aviso inmediato a Calidad de turno y a Mantenimiento de línea, y muestreo reforzado de producto terminado.', cite('PNT-CAL-031', 3, 'Rechazo por encima del 4 %: aviso inmediato a Calidad de turno y a Mantenimiento de línea, y muestreo reforzado de producto terminado.'))
            ])
          ],
          context: ({
            systems: ['MES Mapex', 'GMAO'],
            text: `${opt.name} (${opt.line}) rechaza hoy el ${fmt.pct(opt.reading)} (referencia ${fmt.pct(opt.baseline)}), por encima del 4 %. La despedregadora DP-2, antes de ${opt.code} en la misma línea, tiene la malla pendiente de sustitución (${dpOrder.work_order}).`,
            go: 'turno', goLabel: 'Ver parte diario'
          }),
          followups: ['malla', 'detector']
        };
      }
    },
    {
      id: 'malla', icon: 'wrench', topic: 'Despedregadora · desgaste de malla', scope: 'ALL',
      q: '¿Qué hacer si la malla de la despedregadora tiene desgaste?',
      anchors: ['malla', 'mallas', 'despedregadora', 'despedregadoras', 'dp-2', 'dp2'],
      terms: ['desgaste', 'desgastada', 'gastada', 'rota', 'rotura', 'sustituir', 'sustitución', 'cambiar', 'cambio', 'hacer', 'orden de trabajo', 'reparar'],
      min: 2,
      build: () => {
        const opt = byCode['OPT-2'];
        return {
          blocks: [
            P('Se abre una orden de trabajo con la sustitución programada de la malla y se informa a Calidad de turno el mismo día.', cite('IT-MAN-DP-02', 4, 'Se abre una orden de trabajo con la sustitución programada de la malla y se informa a Calidad de turno el mismo día.')),
            P('Hasta la sustitución, inspección reforzada: revisión visual al inicio de cada turno, anotada en la hoja de ruta de la línea, y seguimiento de la tasa de rechazo de la selectora óptica situada después del túnel.', cite('IT-MAN-DP-02', 4, 'Hasta la sustitución, inspección reforzada: revisión visual al inicio de cada turno, anotada en la hoja de ruta de la línea, y seguimiento de la tasa de rechazo de la selectora óptica situada después del túnel.')),
            P('Si la malla presenta rotura, la línea no arranca hasta sustituirla.', cite('IT-MAN-DP-02', 4, 'Si la malla presenta rotura, la línea no arranca hasta sustituirla.')),
            P('Tras el cambio se verifica con 10 piedras testigo de 6 a 10 mm: la despedregadora debe separar las 10.', cite('IT-MAN-DP-02', 5, 'Tras cambiar la malla se verifica la separación con 10 piedras testigo de 6 a 10 mm: la despedregadora debe separar las 10.'))
          ],
          context: ({
            systems: ['GMAO', 'MES Mapex'],
            text: `DP-2 (L2): la ${dpOrder.work_order} está abierta desde el ${fmt.date(dpOrder.date)} (${daysOpen} días), ${String(dpOrder.status).replace(/^abierta,\s*/, '')}. ${opt.code} rechaza el ${fmt.pct(opt.reading)} (referencia ${fmt.pct(opt.baseline)}). La reclamación ${complaint.code} es de un lote de L2 fabricado el ${fmt.date(complaintLot.info.production_date)}, un día después de anotarse el desgaste.`,
            go: 'reclamacion', goLabel: `Abrir reclamación ${complaint.code}`
          }),
          followups: ['optica', 'cuerpo-extrano']
        };
      }
    },
    {
      id: 'malla-inspeccion', icon: 'wrench', topic: 'Despedregadora · inspección de malla', scope: 'ALL',
      q: '¿Cada cuánto se inspecciona la malla de la despedregadora?',
      anchors: ['malla', 'mallas', 'despedregadora', 'despedregadoras', 'dp-2', 'dp2'],
      terms: ['cada cuánto', 'frecuencia', 'semanal', 'semana', 'inspecciona', 'inspeccionar', 'inspección', 'revisa', 'revisar', 'revisión', 'galga'],
      min: 3,
      build: () => ({
        blocks: [
          UL(P('Una vez por semana, con la línea parada y consignada; Mantenimiento de línea registra el resultado en la GMAO. Se revisan:', cite('IT-MAN-DP-02', 2, 'Una vez por semana, con la línea parada y consignada, Mantenimiento de línea inspecciona la malla y registra el resultado en la GMAO:')), [
            P('Roturas, deformaciones y holgura del marco.'),
            P('Desgaste de la luz de malla, medido con galga en cinco puntos.'),
            P('Estado de las juntas y del sistema de expulsión de piedras.')
          ]),
          P('Hay desgaste cuando la luz de malla supera en más de un 10 % la nominal en cualquier punto medido, o cuando hay roturas o deformaciones.', cite('IT-MAN-DP-02', 3, 'Hay desgaste cuando la luz de malla supera en más de un 10 % la nominal en cualquier punto medido, o cuando hay roturas o deformaciones.')),
          P('Con desgaste, y hasta sustituirla, la malla se revisa al inicio de cada turno.', cite('IT-MAN-DP-02', 4, 'revisión visual al inicio de cada turno'))
        ],
        followups: ['malla']
      })
    },
    {
      id: 'listeria', icon: 'flask', topic: 'Listeria · muestreo ambiental', scope: 'FUS',
      q: '¿Con qué frecuencia se muestrea Listeria en el entorno?',
      anchors: ['listeria', 'ambiental', 'hisopos', 'hisopo', 'muestreo ambiental'],
      terms: ['frecuencia', 'cada cuánto', 'muestrea', 'muestrean', 'muestreo', 'muestras', 'entorno', 'semanal', 'plan'],
      min: 2,
      build: () => ({
        blocks: [
          UL(P('Frecuencias mínimas de muestreo ambiental:', cite('PNT-CAL-034', 3, 'Frecuencias mínimas de muestreo ambiental:')), [
            P('Zona 1, superficies en contacto con el producto después del escaldado: semanal en cada línea, con la línea en producción.', cite('PNT-CAL-034', 2, 'Zona 1: superficies en contacto con el producto después del escaldado')),
            P('Zona 2: semanal.'),
            P('Zona 3: cada dos semanas, con prioridad en desagües y puntos con agua estancada.'),
            P('Zona 4: mensual.')
          ]),
          P('Además, se muestrea después de obras, de averías que obliguen a abrir equipos de la zona 1 y de cada limpieza en profundidad de fin de campaña.', cite('PNT-CAL-034', 4, 'se muestrea después de obras, de averías que obliguen a abrir equipos de la zona 1 y de cada limpieza en profundidad de fin de campaña.'))
        ],
        followups: ['listeria-positivo']
      })
    },
    {
      id: 'listeria-positivo', icon: 'flask', topic: 'Listeria · actuación ante un positivo', scope: 'FUS',
      q: '¿Qué hacer ante un positivo de Listeria en zona 1?',
      anchors: ['listeria', 'ambiental', 'hisopos', 'hisopo'],
      terms: ['positivo', 'positiva', 'positivos', 'detecta', 'aparece', 'resultado', 'actuar', 'retener', 'contaminación', 'zona', 'zonas'],
      min: 3,
      build: () => ({
        blocks: [
          P('Se retiene el producto fabricado en esa línea desde la última limpieza verificada hasta conocer el resultado de Listeria monocytogenes; se limpia y desinfecta en profundidad y se toman muestras alrededor del punto positivo.', cite('PNT-CAL-034', 5, 'se retiene el producto fabricado en esa línea desde la última limpieza verificada hasta conocer el resultado de Listeria monocytogenes')),
          P('La línea vuelve a la frecuencia normal tras tres muestreos consecutivos negativos en ese punto.', cite('PNT-CAL-034', 5, 'La línea vuelve a la frecuencia normal tras tres muestreos consecutivos negativos en ese punto.')),
          P('En zonas 2 o 3: limpieza reforzada y nuevo muestreo en 24 a 48 h.', cite('PNT-CAL-034', 5, 'Positivo en zonas 2 o 3: limpieza reforzada y nuevo muestreo en 24 a 48 h')),
          P('Todo positivo se comunica en el día al Responsable de Calidad de planta y se registra en Elara.', cite('PNT-CAL-034', 5, 'Todo positivo se comunica en el día al Responsable de Calidad de planta y se registra en Elara.'))
        ],
        followups: ['listeria']
      })
    },
    {
      id: 'ficha', icon: 'file-text', topic: 'Ficha técnica · guisante 1 kg (Reino Unido)', scope: 'FUS',
      q: '¿Qué tolerancia de piedras admite la ficha técnica del guisante?',
      anchors: ['tolerancia', 'ficha técnica', 'ficha', 'especificación', 'especificaciones', 'calibre', 'tenderómetro'],
      terms: ['piedras', 'piedra', 'vidrio', 'metal', 'guisante', 'cuerpos', 'extraños', 'admite', 'máximo', 'técnica'],
      min: 2,
      build: () => ({
        blocks: [
          UL(P('La ficha técnica del guisante 1 kg para el Reino Unido (UK-GUI-1000) fija, entre otros:', cite('FT-UK-GUI-1000', 1, 'Guisante (Pisum sativum) desgranado, escaldado y ultracongelado en IQF.')), [
            P('Piedras, vidrio y metal: ausencia (tolerancia cero).', cite('FT-UK-GUI-1000', 3, 'Piedras, vidrio y metal: ausencia (tolerancia cero).')),
            P('Madurez en recepción: tenderómetro de 95 a 120 TR.', cite('FT-UK-GUI-1000', 3, 'Madurez en recepción: tenderómetro de 95 a 120 TR.')),
            P('Materia vegetal extraña: como máximo 2 piezas por kg.', cite('FT-UK-GUI-1000', 3, 'Materia vegetal extraña (vainas, hojas): como máximo 2 piezas por kg.')),
            P('Sin alérgenos de declaración obligatoria.', cite('FT-UK-GUI-1000', 2, 'no contiene ninguno de los 14 alérgenos de declaración obligatoria')),
            P('Consumo preferente de 24 meses, conservado a −18 °C o menos.', cite('FT-UK-GUI-1000', 5, 'Conservar a −18 °C o menos. Consumo preferente: 24 meses desde la fabricación'))
          ])
        ],
        context: ({
          systems: ['Elara'],
          text: `${complaint.code}: el cliente reclama una ${complaint.defect.type} de ${complaint.defect.size_mm} mm en el lote ${complaint.lot} de este producto. La ficha no admite piedras (tolerancia cero).`,
          outcome: 'reclamacion',
          go: 'reclamacion', goLabel: `Abrir reclamación ${complaint.code}`
        }),
        followups: ['vida-util', 'lote']
      })
    },
    {
      id: 'vida-util', icon: 'snowflake', topic: 'Ficha técnica · conservación', scope: 'FUS',
      q: '¿Cuál es la vida útil del guisante 1 kg y cómo se conserva?',
      anchors: ['vida útil', 'caducidad', 'consumo preferente', 'conservar', 'conserva', 'conservación', 'descongelar', 'descongelado', 'recongelar'],
      terms: ['guisante', 'meses', 'temperatura', 'ficha', 'producto', 'congelar', 'años'],
      min: 2,
      build: () => ({
        blocks: [
          P('Para el guisante 1 kg del Reino Unido (UK-GUI-1000), consumo preferente de 24 meses desde la fabricación, en formato MM/AAAA.', cite('FT-UK-GUI-1000', 5, 'Consumo preferente: 24 meses desde la fabricación, en formato MM/AAAA.')),
          P('Se conserva a −18 °C o menos; una vez descongelado no se vuelve a congelar, y se cocina antes de consumir.', cite('FT-UK-GUI-1000', 5, 'Conservar a −18 °C o menos.'), cite('FT-UK-GUI-1000', 5, 'Una vez descongelado, no volver a congelar. Cocinar antes de consumir.'))
        ],
        followups: ['ficha', 'lote']
      })
    },
    {
      id: 'lote', icon: 'barcode', topic: 'Código de lote', scope: 'FUS',
      q: '¿Cómo se lee el código de lote?',
      anchors: ['código de lote', 'codigo de lote', 'día juliano', 'juliano', 'formato de lote', 'l26'],
      terms: ['lote', 'código', 'leer', 'lee', 'significa', 'interpreta', 'formato', 'fecha'],
      min: 2,
      build: () => ({
        blocks: [
          P('Formato L<aa>-<día juliano>-<planta>-<producto>-<nº>.', cite('FT-UK-GUI-1000', 7, 'Formato L<aa>-<día juliano>-<planta>-<producto>-<nº>.')),
          P('Por ejemplo, L26-231-FUS-GUI-01 es el lote 01 de guisante fabricado en Fustiñana el día 231 de 2026, es decir, el 19/08/2026.', cite('FT-UK-GUI-1000', 7, 'L26-231-FUS-GUI-01 es el lote 01 de guisante fabricado en Fustiñana el día 231 de 2026 (19/08/2026).'))
        ],
        context: ({
          systems: ['SAP', 'MES Mapex', 'Mecalux Easy WMS'],
          text: `Traza completa del lote del ejemplo, hacia atrás y hacia delante, con sus ${complaintLot.info.pallets_produced} SSCC:`,
          lot: complaint.lot
        }),
        followups: ['vida-util', 'paletizacion']
      })
    },
    {
      id: 'paletizacion', icon: 'pallet', topic: 'Ficha técnica · envase y paletización', scope: 'FUS',
      q: '¿Cuántas cajas lleva un palé de guisante 1 kg?',
      anchors: ['paletización', 'paletizado', 'cajas', 'caja', 'bolsas por caja', 'cajas por palé'],
      terms: ['palé', 'palés', 'guisante', 'cuántas', 'lleva', 'kg', 'bolsa', 'bolsas', 'etiqueta'],
      min: 3,
      build: () => ({
        blocks: [
          P('Para el guisante 1 kg del Reino Unido (UK-GUI-1000): bolsa de 1 kg, 10 bolsas por caja y 80 cajas por palé, con 800 kg netos.', cite('FT-UK-GUI-1000', 6, 'Bolsa de 1 kg; 10 bolsas por caja; 80 cajas por palé (800 kg netos).')),
          P('Cada palé lleva etiqueta GS1-128 con SSCC, lote y consumo preferente.', cite('FT-UK-GUI-1000', 6, 'Etiqueta de palé GS1-128 con SSCC, lote y consumo preferente.'))
        ],
        followups: ['lote']
      })
    },
    {
      id: 'alergenos', icon: 'leaf', topic: 'Alérgenos · planta de Fustiñana', scope: 'FUS',
      q: '¿Qué alérgenos se manipulan en Fustiñana?',
      anchors: ['alérgeno', 'alérgenos', 'alergia', 'alergias', 'gluten', 'apio', 'soja', 'sésamo', 'frutos de cáscara', 'cacahuete', 'lactosa', 'huevo', 'mostaza', 'sulfitos', 'altramuces', 'crustáceos', 'moluscos'],
      terms: ['fustiñana', 'planta', 'manipulan', 'contiene', 'trazas', 'matriz', 'producto', 'lleva', 'cruzada'],
      min: 2,
      build: (q) => {
        const row = productRow(q);
        const blocks = [
          P('En la planta de Fustiñana no se manipula ninguno de los 14 alérgenos de declaración obligatoria: todas las recetas son verdura o mezclas de verduras.', cite('MAT-ALE-FUS', 2, 'En la planta de Fustiñana no se manipula ninguno de los 14 alérgenos')),
          P('No hay riesgo de contaminación cruzada por alérgenos identificado en las líneas L1 a L5.', cite('MAT-ALE-FUS', 2, 'No hay riesgo de contaminación cruzada por alérgenos identificado en las líneas L1 a L5.'))
        ];
        if (row) blocks.push(P(`${row.name} (${row.sku}): no contiene alérgenos ni trazas según la matriz.`, cite('MAT-ALE-FUS', 3, row.text)));
        blocks.push(P('Una receta, materia prima o proveedor nuevo con alérgenos requiere la evaluación previa del equipo APPCC y actualizar la matriz antes de entrar en planta.', cite('MAT-ALE-FUS', 4, 'requiere la evaluación previa del equipo APPCC y la actualización de esta matriz antes de entrar en planta.')));
        return { blocks, followups: ['ficha'] };
      }
    }
  ];
  const INTENT = Object.fromEntries(INTENTS.map((i) => [i.id, i]));
  const SUGGESTED = ['camara', 'liberar', 'plazos', 'detector', 'malla', 'listeria'];

  /* Temas sin documento indexado: se responde «No hay evidencia suficiente…» sin citas. */
  const GAPS = [
    { id: 'simulacro', topic: 'Simulacro y retirada de producto', anchors: ['simulacro', 'simulacros', 'retirada', 'retiradas', 'retirar', 'recall', 'recuperación', 'mock'],
      reason: 'Ningún documento indexado describe el simulacro ni los pasos de una retirada de producto.', related: 'PNT-CAL-018' },
    { id: 'defensa', topic: 'Defensa alimentaria', anchors: ['defensa alimentaria', 'food defense', 'sabotaje', 'intrusión', 'vulnerabilidad', 'fraude'],
      reason: 'Ningún documento indexado trata la defensa alimentaria ni la vulnerabilidad al fraude.' },
    { id: 'residuos', topic: 'Residuos de plaguicidas y contaminantes', anchors: ['plaguicidas', 'pesticidas', 'residuos', 'clorato', 'cloratos', 'fitosanitarios', 'nitratos', 'micotoxinas', 'metales pesados'],
      reason: 'Ningún documento indexado trata el control de residuos de plaguicidas, clorato u otros contaminantes.' },
    { id: 'certificados', topic: 'Certificados y auditorías', anchors: ['certificado', 'certificados', 'certificación', 'certificaciones', 'ifs', 'brcgs', 'brc', 'fssc', 'auditoría', 'auditorías', 'auditor'],
      reason: 'Los certificados y los informes de auditoría no están entre los documentos indexados.' },
    { id: 'sostenibilidad', topic: 'Sostenibilidad', anchors: ['sostenibilidad', 'huella', 'carbono', 'co2', 'emisiones', 'reciclaje', 'reciclable'],
      reason: 'Ningún documento indexado trata la sostenibilidad ni la huella ambiental.' },
    { id: 'precio', topic: 'Precios y costes', anchors: ['precio', 'precios', 'cuesta', 'cuestan', 'coste', 'costes', 'costo', 'tarifa', 'euros', 'facturación', 'margen'],
      reason: 'Precios y costes no forman parte de los procedimientos de Calidad indexados.' },
    { id: 'personal', topic: 'Condiciones laborales', anchors: ['vacaciones', 'nómina', 'salario', 'sueldo', 'convenio', 'plantilla', 'contrato', 'despido', 'horario'],
      reason: 'Las condiciones laborales no forman parte de los procedimientos de Calidad indexados.' }
  ];
  const GAP = Object.fromEntries(GAPS.map((g) => [g.id, g]));
  const OTHER_PLANTS = ['arguedas', 'alcorioja', 'alfaro', 'olmedo', 'iberfresco', 'vega', 'alicante', 'formentera'];

  const PRODUCT_WORDS = [
    { words: ['salteado', 'mezcla', 'plancha', 'mix'], sku: 'UK-MIX-600' },
    { words: ['brocoli', 'brócoli'], sku: 'CN-BRO-2500' },
    { words: ['judia', 'judía', 'judias'], sku: 'FR-JUD-1000' },
    { words: ['maiz', 'maíz'], sku: 'US-MAI-450' },
    { words: ['espinaca', 'espinacas'], sku: 'VL-ESP-1000' },
    { words: ['garden', 'reino unido', 'uk'], sku: 'UK-GUI-1000' },
    { words: ['guisante', 'guisantes'], sku: 'VL-GUI-1000' }
  ];
  function productRow(q) {
    const n = ` ${K().normalize(q)} `;
    const hit = PRODUCT_WORDS.find((p) => p.words.some((w) => n.includes(` ${K().normalize(w)} `)));
    if (!hit) return null;
    const sec = K().section('MAT-ALE-FUS', '3');
    const text = sec && sec.list.find((t) => t.indexOf(hit.sku) === 0);
    if (!text) return null;
    const name = text.split(' · ')[1] || hit.sku;
    return { sku: hit.sku, name, text };
  }

  /* ---------------------------------------------------------------- Motor de consulta (determinista) */

  let prepared = false;
  function prepareTerms() {
    if (prepared) return;
    const conv = (w) => {
      if (w.charAt(0) === '=') return { exact: K().normalize(w.slice(1)) };
      const n = K().normalize(w);
      return /\s/.test(n) ? { phrase: n } : { stem: K().stem(n) };
    };
    const uniq = (list) => {
      const seen = new Set();
      return list.filter((a) => { const k = JSON.stringify(a); if (seen.has(k)) return false; seen.add(k); return true; });
    };
    INTENTS.concat(GAPS).forEach((d) => {
      d._anchors = uniq((d.anchors || []).map(conv));
      const ak = new Set(d._anchors.map((a) => JSON.stringify(a)));
      d._terms = uniq((d.terms || []).map(conv)).filter((t) => !ak.has(JSON.stringify(t)));
    });
    prepared = true;
  }
  function qBag(question) {
    const norm = K().normalize(question);
    const words = norm.split(/[\s-]+/).filter(Boolean);
    return { norm: ` ${norm} `, words: new Set(words), stems: new Set(words.map((w) => K().stem(w))) };
  }
  function hits(bag, list) {
    return (list || []).filter((a) => (a.exact ? bag.words.has(a.exact) : a.phrase ? bag.norm.includes(` ${a.phrase} `) : bag.stems.has(a.stem))).length;
  }
  function scoreDef(bag, d) {
    const a = hits(bag, d._anchors);
    return a ? a * 2 + hits(bag, d._terms) : 0;
  }

  /** Clasifica una pregunta: {type: 'intent'|'gap'|'generic'|'none', id, reason, cites} */
  function classify(question) {
    if (window.CN_I18N) question = CN_I18N.queryToSpanish(question);
    prepareTerms();
    const bag = qBag(question);
    const exact = INTENTS.find((i) => K().normalize(i.q) === bag.norm.trim());
    if (exact) return { type: 'intent', id: exact.id };
    let best = null;
    INTENTS.forEach((d) => { const s = scoreDef(bag, d); if (s >= (d.min || 3) && (!best || s > best.s)) best = { d, s }; });
    let gap = null;
    GAPS.forEach((d) => { const s = scoreDef(bag, d); if (s >= 2 && (!gap || s > gap.s)) gap = { d, s }; });
    if (gap && (!best || gap.s >= best.s)) return { type: 'gap', id: gap.d.id };
    const otherPlant = OTHER_PLANTS.find((p) => bag.words.has(p));
    if (best && otherPlant && best.d.scope === 'FUS') return { type: 'gap', id: 'otra-planta', plant: otherPlant };
    if (best) return { type: 'intent', id: best.d.id };
    const found = K().search(question);
    const top = found[0];
    if (top && top.coverage >= 0.75 && top.strong.length >= 2) {
      const seen = new Set();
      const cites = found.filter((r) => r.coverage >= Math.max(0.5, top.coverage - 0.25) && r.strong.length >= 1)
        .filter((r) => { const k = `${r.doc}#${r.sec}#${r.text}`; if (seen.has(k)) return false; seen.add(k); return true; })
        .slice(0, 3).map((r) => ({ doc: r.doc, sec: r.sec, quote: r.text }));
      return { type: 'generic', cites };
    }
    return { type: 'none' };
  }

  /** Numeración de citas por orden de aparición (sin duplicados). */
  function finalize(spec) {
    const cites = [];
    const key = (c) => `${c.doc}#${c.sec}#${c.quote}`;
    const num = (c) => {
      const cc = { doc: c.doc, sec: String(c.sec), quote: T(c.quote) };
      let i = cites.findIndex((x) => key(x) === key(cc));
      if (i < 0) { cites.push(cc); i = cites.length - 1; }
      return i + 1;
    };
    const blk = (b) => ({ t: T(b.t), n: (b.c || []).map(num) });
    const blocks = spec.blocks.map((b) => (b.list ? { intro: b.intro ? blk(b.intro) : null, list: b.list.map(blk) } : blk(b)));
    return Object.assign({}, spec, { blocks, cites, note: spec.note ? T(spec.note) : null });
  }

  /** Respuesta de un turno guardado (se recalcula al pintar; los datos de planta pueden cambiar de estado). */
  function answerOf(turn) {
    if (turn.type === 'intent') {
      const it = INTENT[turn.ref];
      if (!it) return null;
      return finalize(Object.assign({ kind: it.kind || 'answer' }, it.build(turn.q)));
    }
    if (turn.type === 'generic') {
      return finalize({
        kind: 'answer',
        blocks: [UL(P('Pasajes de los documentos indexados que responden a la pregunta:'), (turn.cites || []).map((c) => P(`«${c.quote}»`, cite(c.doc, c.sec, c.quote))))],
        followups: []
      });
    }
    return null;
  }
  function gapOf(turn) {
    if (turn.type === 'gap' && turn.ref === 'otra-planta') {
      return { topic: 'Otra planta', reason: `Los documentos indexados sobre este tema son de la planta de Fustiñana; no hay evidencia para ${fmt.cap(turn.plant || 'otras plantas')}.` };
    }
    if (turn.type === 'gap') return GAP[turn.ref] || null;
    return { topic: 'Sin tema reconocido', reason: `Ningún fragmento de los ${K().order.length} documentos indexados responde a esta pregunta.` };
  }
  function topicOf(turn) {
    if (turn.type === 'intent') return (INTENT[turn.ref] || {}).topic || 'Consulta';
    if (turn.type === 'generic') return 'Consulta libre';
    const g = gapOf(turn);
    return g ? g.topic : 'Sin tema reconocido';
  }
  /** Nombre del apartado sin número («Criterio de bloqueo», «Resumen») y referencia corta («§4», «resumen»). */
  function secName(c) { const s = K().section(c.doc, c.sec); return s ? s.heading.replace(/^\d+\.\s*/, '') : ''; }
  function secShort(c) { return /^\d/.test(c.sec) ? `§${c.sec}` : 'resumen'; }
  function secSpoken(c) { return /^\d/.test(c.sec) ? `apartado ${c.sec}` : 'resumen'; }
  function refLabel(c) {
    const name = secName(c);
    return /^\d/.test(c.sec) ? `${c.doc} §${c.sec}${name ? ` ${name}` : ''}` : `${c.doc} · ${name || 'Resumen'}`;
  }

  /** Estadísticas reales del índice para el registro de la consulta. */
  function statsFor(question, ans) {
    const total = K().passages().length;
    const found = K().search(question);
    const keys = new Set(found.map((r) => `${r.doc}#${r.sec}`));
    (ans ? ans.cites : []).forEach((c) => keys.add(`${c.doc}#${c.sec}`));
    const k = ans ? ans.cites.length : 0;
    const nd = ans ? new Set(ans.cites.map((c) => c.doc)).size : 0;
    return { total, cands: Math.max(found.length, k), sections: keys.size, k, nd, docs: K().order.length };
  }
  function stepsFor(turn) {
    const s = turn.stats || statsFor(turn.q, turn.kind !== 'none' ? answerOf(turn) : null);
    const ans = turn.kind !== 'none';
    const steps = [
      { agent: AGENT, system: 'Prodigy', action: 'Interpreta la pregunta', result: `Tema: ${topicOf(turn)}`, ms: 42, wait: 300 },
      { agent: AGENT, system: 'Procedimientos', action: `Busca en ${s.docs} documentos vigentes, por texto y por significado`, result: `${s.total} fragmentos revisados · ${s.cands} candidatos`, ms: 214, wait: 560 },
      { agent: AGENT, system: 'Prodigy', action: 'Filtra por los permisos del usuario', result: `Calidad · Fustiñana: ${s.cands} de ${s.cands} accesibles`, ms: 26, wait: 280 },
      { agent: AGENT, system: 'Prodigy', action: 'Ordena los candidatos por pertinencia', result: ans ? `${fmt.plural(s.k, 'fragmento', 'fragmentos')} de ${fmt.plural(s.nd, 'documento', 'documentos')}` : 'Ningún fragmento por encima del umbral', ms: 131, wait: 380 },
      { agent: AGENT, system: 'Modelo de lenguaje', action: '¿Responden las fuentes a la pregunta?', result: turn.kind === 'answer' ? 'Sí: la respuesta está en las fuentes' : turn.kind === 'partial' ? 'En parte: remiten a un documento no indexado' : 'No: ningún fragmento responde', ms: 690, wait: 620, tone: turn.kind === 'answer' ? 'ok' : 'warn' }
    ];
    if (ans) steps.push({ agent: AGENT, system: 'Modelo de lenguaje', action: 'Redacta la respuesta citando solo esos fragmentos', result: `${fmt.plural(s.k, 'cita comprobada', 'citas comprobadas')} contra el texto original`, ms: 1180 + s.k * 40, wait: 700, tone: 'ok' });
    else steps.push({ agent: AGENT, system: 'Prodigy', action: 'Responde sin fuente', result: NONE_TITLE, ms: 14, wait: 320, tone: 'warn' });
    return steps;
  }

  /* ---------------------------------------------------------------- Piezas de la vista */

  function selectedCite(ctx) {
    const sel = ctx.local.sel;
    if (!sel) return null;
    if (sel.doc) return { doc: sel.doc, sec: sel.sec || null, quote: sel.quote || null, n: null, turn: null };
    const turn = (ctx.local.turns || []).find((t) => t.id === sel.turn);
    const ans = turn && answerOf(turn);
    const c = ans && ans.cites[sel.n - 1];
    return c ? Object.assign({ n: sel.n, turn: turn.id }, c) : null;
  }

  function citeButtons(turnId, ns, cites, active) {
    return ns.map((n) => {
      const c = cites[n - 1];
      const on = active && active.turn === turnId && active.n === n;
      return html`<button type="button" class="cite${on ? ' is-active' : ''}" data-cite="${n}" data-turn="${turnId}" title="${refLabel(c)}" aria-label="Fuente ${n}: ${c.doc}, ${secSpoken(c)}">${n}</button>`;
    });
  }
  function blockLine(turnId, b, cites, active) {
    return html`${b.t}${b.n.length ? html`&nbsp;${citeButtons(turnId, b.n, cites, active)}` : ''}`;
  }
  function answerBody(turn, ans, active) {
    return html`<div class="pr-body">${ans.blocks.map((b) => (b.list
      ? html`${b.intro ? html`<p>${blockLine(turn.id, b.intro, ans.cites, active)}</p>` : ''}<ul>${b.list.map((li) => html`<li>${blockLine(turn.id, li, ans.cites, active)}</li>`)}</ul>`
      : html`<p>${blockLine(turn.id, b, ans.cites, active)}</p>`))}</div>`;
  }

  function contextBlock(ans) {
    const c = ans.context;
    if (!c) return '';
    const out = c.outcome ? App.outcome(c.outcome) : null;
    return html`<div class="pr-context">${App.callout({
      tone: 'brand',
      icon: 'link',
      title: 'Aplicado a Fustiñana hoy',
      body: html`<p>${c.text}</p>
        <div class="row mt-2">${App.sysList(c.systems)}${out ? chip(out.status === 'rejected' ? 'rejected' : 'approved', out.label || undefined) : ''}${c.lot ? App.lotTag(c.lot) : ''}</div>`,
      actions: c.go ? html`<button type="button" class="btn btn-secondary btn-sm" data-go="${c.go}">${c.goLabel}${icon('arrow-right', 15)}</button>` : ''
    })}</div>`;
  }

  function sourcesBlock(turn, ans, active) {
    if (!ans.cites.length) return '';
    return html`<div class="pr-sources">
      <div class="pr-label">Fuentes</div>
      <ol class="pr-src-list">${ans.cites.map((c, i) => {
        const d = K().get(c.doc);
        const on = active && active.turn === turn.id && active.n === i + 1;
        return html`<li><button type="button" class="pr-src${on ? ' is-active' : ''}" data-cite="${i + 1}" data-turn="${turn.id}">
          <span class="pr-src-n">${i + 1}</span>
          <span class="pr-src-main"><span class="pr-src-ref"><span class="code">${c.doc}</span> · ${/^\d/.test(c.sec) ? `§${c.sec} ` : ''}${secName(c)}</span><span class="pr-src-quote">«${c.quote}»</span></span>
          <span class="pr-src-rev">Rev. ${d ? d.version : '—'}</span>
        </button></li>`;
      })}</ol>
    </div>`;
  }

  function noneBlock(turn) {
    const g = gapOf(turn);
    const rel = g && g.related ? K().unindexed[g.related] : null;
    return html`<div class="pr-none">${App.callout({
      tone: 'warn',
      icon: 'search',
      title: NONE_TITLE,
      body: html`<p>${g ? g.reason : ''}</p>
        ${rel ? html`<p><span class="code">${rel.code}</span> (${rel.title}) se menciona en ${rel.mentionedIn.doc}, apartado ${rel.mentionedIn.sec}, pero no está indexado.
          <button type="button" class="link-btn" data-open-doc="${rel.mentionedIn.doc}" data-sec="${rel.mentionedIn.sec}" data-quote="${rel.mentionedIn.quote}">Ver la mención</button></p>` : ''}
        <p>Sin una fuente no se genera respuesta. La pregunta puede derivarse a Calidad de planta para que la conteste o incorpore el documento.</p>`,
      actions: turn.routed
        ? chip('done', `Derivada a Calidad de planta · ${fmt.time(turn.routed)}`)
        : html`<button type="button" class="btn btn-secondary btn-sm" data-action="route" data-turn="${turn.id}">${icon('send', 15)}<span>Derivar a Calidad de planta</span></button>`
    })}</div>`;
  }

  function kindChip(turn, ans) {
    if (turn.kind === 'none') return chip({ tone: 'warn', icon: 'alert-triangle', label: 'Sin evidencia suficiente' });
    if (turn.kind === 'partial') return chip({ tone: 'warn', icon: 'alert-circle', label: 'Evidencia parcial' });
    const nd = new Set(ans.cites.map((c) => c.doc)).size;
    return chip({ tone: 'ok', icon: 'check', label: `${fmt.plural(ans.cites.length, 'cita', 'citas')} · ${fmt.plural(nd, 'documento', 'documentos')}` });
  }

  function questionRow(turn) {
    return html`<div class="pr-q"><span class="pr-avatar" aria-hidden="true">RC</span><div class="pr-q-text">${turn.q}</div><span class="pr-q-time">${fmt.time(turn.at)}</span></div>`;
  }

  function turnHTML(turn, active) {
    const ans = turn.kind !== 'none' ? answerOf(turn) : null;
    const follow = ans && ans.followups ? ans.followups.filter((id) => INTENT[id]) : [];
    return html`<li class="pr-turn" id="pr-${turn.id}" data-turn-id="${turn.id}">
      ${questionRow(turn)}
      <div class="pr-a${turn.kind === 'none' ? ' is-none' : turn.kind === 'partial' ? ' is-partial' : ''}">
        <div class="pr-a-head">${icon('workflow', 16)}<span class="strong">Prodigy</span><span class="muted">· agente ${AGENT}</span>${ans || turn.kind === 'none' ? kindChip(turn, ans) : ''}<span class="spacer"></span><span class="muted xs nowrap">Respondida en ${fmt.ms(turn.ms)}</span></div>
        ${ans ? answerBody(turn, ans, active) : noneBlock(turn)}
        ${ans && ans.note ? html`<div class="pr-note">${icon('info', 15)}<span>${ans.note}</span></div>` : ''}
        ${ans ? contextBlock(ans) : ''}
        ${ans ? sourcesBlock(turn, ans, active) : ''}
        <div class="pr-a-foot">
          <details class="run-log pr-log"><summary>${icon('chevron-right', 16)}<span>Cómo se ha respondido · ${stepsFor(turn).length} pasos · ${fmt.ms(turn.ms)}</span></summary><div class="mt-2" data-log="${turn.id}"></div></details>
          ${ans ? html`<button type="button" class="btn btn-ghost btn-sm pr-copy" data-action="copy" data-turn="${turn.id}">${icon('copy', 15)}<span>Copiar respuesta</span></button>` : ''}
        </div>
        ${follow.length ? html`<div class="pr-follow"><span class="pr-label">Relacionadas</span>${follow.map((id) => html`<button type="button" class="pr-chip" data-ask="${id}">${INTENT[id].q}</button>`)}</div>` : ''}
      </div>
    </li>`;
  }

  function suggestions(compact, turns) {
    if (compact) {
      const asked = new Set((turns || []).filter((t) => t.type === 'intent').map((t) => t.ref));
      const left = SUGGESTED.filter((id) => !asked.has(id));
      if (!left.length) return '';
      return html`<div class="pr-chips"><span class="pr-label">Preguntas sugeridas</span>${left.map((id) => html`<button type="button" class="pr-chip" data-ask="${id}">${INTENT[id].q}</button>`)}</div>`;
    }
    return html`<div class="pr-suggest">${SUGGESTED.map((id) => html`<button type="button" class="pr-sugg" data-ask="${id}">${icon(INTENT[id].icon, 18)}<span>${INTENT[id].q}</span></button>`)}</div>`;
  }

  function consultaCard(ctx, turns, active) {
    const body = html`
      ${turns.length
        ? html`<ol class="pr-thread" id="pr-thread">${turns.map((t) => turnHTML(t, active))}</ol>`
        : html`<div class="pr-intro" id="pr-intro">
            <div class="h3">Pregunta sobre los procedimientos de Calidad de Fustiñana</div>
            <p class="slate small mt-1">Cada frase de la respuesta cita el documento y el apartado de donde sale. Si ningún documento indexado lo recoge, la consulta lo indica y no responde.</p>
            ${suggestions(false)}
          </div>`}
      <div class="pr-compose">
        <form class="pr-ask" data-form="ask" autocomplete="off">
          <label class="sr-only" for="pr-q">Pregunta sobre los procedimientos</label>
          <input id="pr-q" class="input" name="q" type="text" maxlength="300" placeholder="Escribe una pregunta sobre los procedimientos de Calidad" ${App.attrs({ disabled: ctx.vars.busy ? true : null })}>
          <button type="submit" class="btn btn-primary" data-ask-btn ${App.attrs({ disabled: ctx.vars.busy ? true : null })}>${icon('send')}<span>Preguntar</span></button>
        </form>
        <div class="pr-hint" id="pr-hint" aria-live="polite">Busca en ${K().order.length} documentos vigentes. Pulsa Intro para preguntar.</div>
        ${turns.length ? suggestions(true, turns) : ''}
      </div>`;
    return App.card({
      id: 'pr-consulta',
      title: 'Consulta',
      sub: 'Respuestas extraídas de los documentos vigentes, con la cita de cada frase',
      icon: 'message-square',
      flush: true,
      actions: turns.length ? html`<button type="button" class="btn btn-ghost btn-sm" data-action="clear">${icon('rotate-ccw', 15)}<span>Nueva consulta</span></button>` : '',
      body
    });
  }

  function docView(c) {
    const d = K().get(c.doc);
    if (!d) return '';
    return App.docPreview({
      code: d.code, title: d.title, version: d.version, date: d.date, owner: d.owner,
      sections: d.sections,
      highlight: c.sec ? { section: c.sec, text: c.quote || '', tone: 'brand' } : null
    });
  }

  function sourceCard(ctx) {
    const c = selectedCite(ctx);
    const last = (ctx.local.turns || [])[(ctx.local.turns || []).length - 1];
    if (!c) {
      const lastNone = last && last.kind === 'none' && !ctx.local.sel;
      return App.card({
        id: 'pr-source', class: 'pr-source-card', title: 'Fuente', icon: 'book-open',
        sub: lastNone ? 'La última pregunta no tiene fuente' : 'Documento y pasaje citados',
        body: App.empty({
          icon: lastNone ? 'search' : 'book-open',
          title: lastNone ? 'Sin fuente para la última pregunta' : 'Selecciona una cita',
          text: lastNone ? `Ningún pasaje de los ${K().order.length} documentos indexados responde a «${last.q}». No se muestra ninguna cita.` : 'Pulsa un número de cita de la respuesta o un documento de la biblioteca: se abre aquí con el pasaje exacto resaltado.'
        })
      });
    }
    const d = K().get(c.doc);
    const s = c.sec ? K().section(c.doc, c.sec) : null;
    return App.card({
      id: 'pr-source', class: 'pr-source-card', title: 'Fuente', icon: 'book-open',
      sub: c.n ? `Cita ${c.n} · ${c.doc} · ${s ? s.heading : ''}` : `${c.doc} · ${s ? s.heading : 'documento completo'}`,
      actions: html`<button type="button" class="btn btn-ghost btn-sm" data-action="doc-full" title="Abrir el documento completo">${icon('maximize', 15)}<span>Ampliar</span></button>`,
      flush: true,
      body: html`<div class="pr-src-meta">
          ${c.n ? html`<span class="pr-src-n">${c.n}</span>` : ''}
          <span class="pr-src-meta-main"><span class="strong"><span class="code">${d.code}</span> · ${d.short}</span><span class="pr-src-meta-sub">${d.type} · revisión ${d.version} · vigente desde ${fmt.date(d.date)}</span></span>
          ${chip('ok', 'Vigente')}
        </div>
        ${c.quote ? html`<div class="pr-quote">${icon('file-text', 15)}<span>Pasaje citado: «${c.quote}»</span></div>` : ''}
        <div class="pr-doc-scroll" id="pr-doc-scroll">${docView(c)}</div>`,
      footer: html`<span class="muted small row">${sys('Elara')}<span>Documento controlado · copia indexada el ${fmt.date(K().indexedAt, { time: true })}</span></span>`
    });
  }

  function citeCounts(ctx) {
    const out = {};
    (ctx.local.turns || []).forEach((t) => {
      const ans = t.kind !== 'none' ? answerOf(t) : null;
      if (ans) ans.cites.forEach((c) => { out[c.doc] = (out[c.doc] || 0) + 1; });
    });
    return out;
  }

  function libraryCard(ctx) {
    const counts = citeCounts(ctx);
    const pcount = {};
    K().passages().forEach((p) => { pcount[p.doc] = (pcount[p.doc] || 0) + 1; });
    const cur = selectedCite(ctx);
    const unindexed = Object.values(K().unindexed);
    return App.card({
      id: 'pr-library',
      title: 'Documentos indexados',
      sub: `${K().order.length} documentos vigentes · ${K().passages().length} fragmentos · origen: Elara`,
      icon: 'layers',
      flush: true,
      body: App.table({
        dense: true,
        clickable: true,
        rows: K().all(),
        rowAttrs: (d) => ({ 'data-open-doc': d.code }),
        rowClass: (d) => (cur && cur.doc === d.code ? 'is-selected' : ''),
        cols: [
          { label: 'Documento', render: (d) => html`<span class="code strong">${d.code}</span><span class="sub">${d.title}</span>` },
          { label: 'Tipo', width: '13%', render: (d) => d.type },
          { label: 'Revisión', width: '8%', render: (d) => `Rev. ${d.version}` },
          { label: 'Vigente desde', width: '11%', render: (d) => fmt.date(d.date) },
          { label: 'Propietario', width: '15%', render: (d) => d.owner },
          { label: 'Fragmentos', width: '9%', num: true, render: (d) => fmt.num(pcount[d.code] || 0) },
          { label: 'Citas en la sesión', width: '11%', num: true, render: (d) => (counts[d.code] ? html`<span class="strong">${fmt.num(counts[d.code])}</span>` : html`<span class="muted">—</span>`) },
          { label: 'Estado', width: '8%', render: () => chip('ok', 'Vigente') }
        ]
      }),
      footer: unindexed.length ? html`<span class="muted small row row-nowrap" style="align-items:flex-start">${icon('info', 16)}<span>${unindexed.map((u) => html`Citado y no indexado: <span class="code">${u.code}</span> ${u.title} (se menciona en ${u.mentionedIn.doc}, apartado ${u.mentionedIn.sec}). Las preguntas sobre su contenido se responden «sin evidencia suficiente».`)}</span></span>` : ''
    });
  }

  /* ---------------------------------------------------------------- Acciones */

  function isStacked(ctx) {
    const side = ctx.$('.pr-side');
    const main = ctx.$('.pr-main');
    if (!side || !main) return true;
    return side.getBoundingClientRect().top >= main.getBoundingClientRect().bottom - 2;
  }
  function scrollToMark(box) {
    if (!box) return;
    const m = box.querySelector('mark.hl') || box.querySelector('.doc-sec.is-hl');
    if (!m) { box.scrollTop = 0; return; }
    const top = m.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 56;
    box.scrollTop = Math.max(0, top);
  }
  function refreshSource(ctx) {
    const el = ctx.$('#pr-source');
    if (el) el.outerHTML = String(sourceCard(ctx));
    const cur = ctx.local.sel || {};
    ctx.$$('.cite[data-turn], .pr-src[data-turn]').forEach((b) => {
      b.classList.toggle('is-active', b.getAttribute('data-turn') === cur.turn && Number(b.getAttribute('data-cite')) === cur.n);
    });
    const docCode = (selectedCite(ctx) || {}).doc;
    ctx.$$('#pr-library tr[data-open-doc]').forEach((tr) => tr.classList.toggle('is-selected', tr.getAttribute('data-open-doc') === docCode));
    requestAnimationFrame(() => scrollToMark(ctx.$('#pr-doc-scroll')));
  }
  function docModal(c) {
    const d = K().get(c.doc);
    if (!d) return;
    const s = c.sec ? K().section(c.doc, c.sec) : null;
    const m = App.modal({
      title: d.title,
      kicker: c.n ? `Fuente ${c.n} · ${d.code} · ${s ? s.heading : ''}` : `${d.code} · ${d.type}`,
      size: 'lg',
      body: html`${c.quote ? html`<div class="pr-quote mb-4">${icon('file-text', 15)}<span>Pasaje citado: «${c.quote}»</span></div>` : ''}${docView(c)}`,
      actions: [
        c.quote ? { label: 'Copiar referencia', icon: 'copy', variant: 'ghost', left: true, close: false, onClick: () => { App.copyText(`${d.code} (rev. ${d.version}), ${s ? s.heading : ''}: «${c.quote}»`, 'Referencia copiada'); return false; } } : null,
        { label: 'Cerrar', variant: 'primary' }
      ].filter(Boolean)
    });
    if (m) requestAnimationFrame(() => scrollToMark(m.body));
  }
  function select(ctx, sel) {
    ctx.setLocal({ sel });
    const c = selectedCite(ctx);
    if (!c) return;
    if (isStacked(ctx)) { refreshSource(ctx); docModal(c); return; }
    refreshSource(ctx);
  }

  function plainAnswer(turn) {
    const ans = turn.kind !== 'none' ? answerOf(turn) : null;
    if (!ans) {
      const g = gapOf(turn);
      return `${NONE_TITLE}. ${g ? g.reason : ''}`.trim();
    }
    const line = (b) => `${b.t}${b.n.length ? ' ' + b.n.map((n) => `[${n}]`).join('') : ''}`;
    const parts = [];
    ans.blocks.forEach((b) => {
      if (b.list) { if (b.intro) parts.push(line(b.intro)); b.list.forEach((li) => parts.push(`- ${line(li)}`)); } else parts.push(line(b));
    });
    if (ans.note) parts.push(ans.note);
    return parts.join('\n');
  }
  function plainSources(turn) {
    const ans = turn.kind !== 'none' ? answerOf(turn) : null;
    if (!ans) return [];
    return ans.cites.map((c, i) => { const d = K().get(c.doc); return `[${i + 1}] ${c.doc} (rev. ${d ? d.version : '—'}), ${secName(c)}: «${c.quote}»`; });
  }

  async function ask(ctx, raw, forcedId) {
    const input = ctx.$('#pr-q');
    const q = String(raw || '').trim().replace(/\s+/g, ' ');
    const hint = ctx.$('#pr-hint');
    if (!q) {
      if (hint) { hint.textContent = 'Escribe una pregunta o elige una de las sugeridas.'; hint.classList.add('t-warn'); }
      if (input) input.focus();
      return;
    }
    if (ctx.vars.busy) return;
    ctx.vars.busy = true;
    const typed = !(forcedId && INTENT[forcedId]);
    const res = typed ? classify(q) : { type: 'intent', id: forcedId };
    const seqN = (ctx.local.seq || 0) + 1;
    const turn = { id: `t${seqN}`, q, type: res.type, ref: res.id || null, plant: res.plant || null, cites: res.cites || null, at: App.nowISO(), routed: null };
    turn.kind = res.type === 'intent' ? ((INTENT[res.id] && INTENT[res.id].kind) || 'answer') : res.type === 'generic' ? 'answer' : 'none';
    const ans = turn.kind !== 'none' ? answerOf(turn) : null;
    turn.stats = statsFor(q, ans);
    const steps = stepsFor(turn);

    App.audit('Pregunta a los procedimientos', `«${q}»`);
    if (input) { input.value = ''; input.disabled = true; }
    ctx.$$('[data-ask-btn], [data-ask]').forEach((b) => { b.disabled = true; });
    if (hint) { hint.classList.remove('t-warn'); hint.textContent = `Consultando ${K().order.length} documentos…`; }

    let thread = ctx.$('#pr-thread');
    if (!thread) {
      const intro = ctx.$('#pr-intro');
      thread = document.createElement('ol');
      thread.className = 'pr-thread';
      thread.id = 'pr-thread';
      if (intro) intro.replaceWith(thread); else ctx.$('#pr-consulta .card-body').prepend(thread);
    }
    thread.insertAdjacentHTML('beforeend', String(html`<li class="pr-turn is-pending" id="pr-${turn.id}">${questionRow(turn)}
      <div class="pr-a"><div class="pr-a-head">${icon('workflow', 16)}<span class="strong">Prodigy</span><span class="muted">· agente ${AGENT}</span>${chip('running', 'Consultando')}</div><div class="pr-run mt-2" id="pr-run-${turn.id}"></div></div></li>`));
    const li = ctx.$(`#pr-${turn.id}`);
    if (li) li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    ctx.presenter({ next: 'Mientras responde: busca en los documentos, filtra por permisos, comprueba que las fuentes responden y solo entonces redacta.' });

    const run = App.reasoningStream(ctx.$(`#pr-run-${turn.id}`), steps, { title: `Consulta · ${topicOf(turn)}`, signal: ctx.signal, maxHeight: 280, controls: false, start: turn.at });
    const r = await run.done;
    if (!ctx.alive()) return;
    ctx.vars.busy = false;
    turn.ms = r.ms;
    const turns = (ctx.local.turns || []).concat([turn]);
    ctx.setLocal({ turns, seq: seqN, sel: ans && ans.cites.length ? { turn: turn.id, n: 1 } : null });
    if (ans) {
      const refs = Array.from(new Set(ans.cites.map((c) => `${c.doc} ${secShort(c)}`)));
      App.audit(turn.kind === 'partial' ? 'Respuesta con evidencia parcial' : 'Respuesta con citas', `${fmt.plural(ans.cites.length, 'cita', 'citas')}: ${refs.join(', ')}`, AGENT_ACTOR);
    } else {
      const g = gapOf(turn);
      App.audit('Respuesta sin evidencia suficiente', `«${q}» · sin citas${g && g.related ? ` · documento relacionado no indexado: ${g.related}` : ''}`, AGENT_ACTOR);
    }
    ctx.presenter(null);
    ctx.rerender();
    requestAnimationFrame(() => {
      const el = ctx.$(`#pr-${turn.id}`);
      // Solo se desplaza si la respuesta nueva queda por debajo de la mitad de la pantalla (o por encima de ella).
      const top = el ? el.getBoundingClientRect().top : 0;
      if (el && (top > window.innerHeight * 0.45 || top < 56)) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const again = ctx.$('#pr-q');
      if (typed && again && !isStacked(ctx)) again.focus({ preventScroll: true });
    });
  }

  function routeTurn(ctx, id) {
    const turns = (ctx.local.turns || []).map((t) => (t.id === id ? Object.assign({}, t, { routed: App.nowISO() }) : t));
    const t = turns.find((x) => x.id === id);
    if (!t) return;
    ctx.setLocal({ turns });
    App.audit('Consulta derivada a Calidad de planta', `«${t.q}» · ${ROLE.quality_plant}`);
    App.toast(`Pregunta derivada a ${ROLE.quality_plant}`, { tone: 'ok', icon: 'send' });
    ctx.rerender();
  }

  function fillLog(ctx, id) {
    const host = ctx.$(`[data-log="${id}"]`);
    if (!host || host.childElementCount) return;
    const t = (ctx.local.turns || []).find((x) => x.id === id);
    if (!t) return;
    App.reasoningStream(host, stepsFor(t), { title: `Consulta · ${topicOf(t)}`, instant: true, start: t.at, maxHeight: 320 });
  }

  function exportReport(ctx) {
    const turns = ctx.local.turns || [];
    if (!turns.length) return;
    const withCites = turns.filter((t) => t.kind !== 'none').length;
    App.printableReport({
      title: 'Consulta de procedimientos de Calidad',
      subtitle: `${fmt.plural(turns.length, 'pregunta', 'preguntas')} · respuestas con cita al documento y apartado`,
      code: `CON-PROC-${D.meta.today.replace(/-/g, '')}`,
      filename: `consulta-procedimientos-${D.meta.today}`,
      meta: [['Planta', 'Fustiñana (FUS)'], ['Consultado por', ROLE.quality_shift], ['Documentos indexados', `${K().order.length} vigentes (Elara)`], ['Con fuente', `${withCites} de ${turns.length}`], ['Sin evidencia', String(turns.length - withCites)]],
      sections: turns.map((t, i) => ({
        heading: `${i + 1}. ${t.q}`,
        text: plainAnswer(t),
        list: plainSources(t).length ? plainSources(t) : null
      })).map((s) => { if (!s.list) delete s.list; return s; }).concat([{ heading: 'Nota', callout: 'Las respuestas citan solo pasajes literales de los documentos vigentes indexados. Una pregunta sin fuente se responde «No hay evidencia suficiente en los procedimientos indexados», sin citas.' }]),
      signatures: [{ role: ROLE.quality_shift, note: 'Consulta realizada' }]
    });
  }

  /* ---------------------------------------------------------------- Registro de la escena */

  const scene = App.scene({
    id: 'procedimientos',
    order: 70,
    section: 'Calidad',
    nav: 'Procedimientos',
    title: 'Preguntar a los procedimientos',
    icon: 'book-open',
    presenter: {
      say: (state) => {
        const turns = (state.scenes.procedimientos && state.scenes.procedimientos.turns) || [];
        const answered = turns.some((t) => t.kind !== 'none');
        const none = turns.some((t) => t.kind === 'none');
        const out = [
          'Consulta de los procedimientos de Calidad: la respuesta sale solo de los documentos controlados, y cada frase lleva su cita al documento y al apartado.',
          'Hay ocho documentos de Elara indexados: cadena de frío, bloqueo y liberación, reclamaciones y 8D, cuerpos extraños, Listeria, la instrucción de la despedregadora, una ficha técnica y la matriz de alérgenos. Aquí son sintéticos; en el piloto, los suyos vigentes.'
        ];
        if (!turns.length) out.push('Sirve en auditorías IFS o BRCGS, para formar a turnos nuevos y para contestar a clientes con la referencia exacta.');
        if (answered) out.push('Al pulsar una cita se abre el documento con el pasaje exacto resaltado. Y la respuesta se cruza con lo que pasa hoy en planta: la alarma de C-07, la reclamación UKC-44718 o el detector DM-1.');
        if (none) out.push('Cuando no hay fuente lo dice y no inventa: ni respuesta ni cita. Si el tema está en un documento que no está indexado, lo nombra (PNT-CAL-018) y permite derivar la pregunta a Calidad.');
        return out;
      },
      next: (state) => {
        const turns = (state.scenes.procedimientos && state.scenes.procedimientos.turns) || [];
        if (!turns.length) return 'Pulsar «¿Qué hay que hacer si una cámara supera −18 °C?» y después la cita 1 para ver el pasaje resaltado.';
        if (!turns.some((t) => t.kind === 'none')) return 'Escribir una pregunta sin fuente, por ejemplo «¿Cada cuánto hacemos el simulacro de retirada?», y pulsar «Preguntar».';
        return 'Pasar a «Cómo encaja en CN» con la flecha derecha.';
      }
    },
    render(root, ctx) {
      if (!window.CN_DOCS) {
        root.innerHTML = String(html`${App.pageHead({ title: 'Consulta de procedimientos de Calidad' })}${App.card({ body: App.empty({ icon: 'book-open', title: 'Cargando los documentos indexados', text: 'Un momento.' }) })}`);
        ensureDocs().then(() => ctx.rerender()).catch(() => {
          if (!ctx.alive()) return;
          root.innerHTML = String(html`${App.pageHead({ title: 'Consulta de procedimientos de Calidad' })}${App.card({ body: App.empty({ icon: 'alert-triangle', title: 'No se han podido cargar los documentos indexados', text: 'Recarga la página.' }) })}`);
        });
        return;
      }
      // Enlace directo: #procedimientos/PNT-CAL-012[/4]
      const deep = ctx.params && ctx.params[0] ? K().get(ctx.params[0]) : null;
      if (deep && !(ctx.vars.deepDone)) {
        ctx.vars.deepDone = true;
        ctx.setLocal({ sel: { doc: deep.code, sec: ctx.params[1] && K().section(deep.code, ctx.params[1]) ? String(ctx.params[1]) : null } });
      }
      const turns = ctx.local.turns || [];
      const active = ctx.local.sel && ctx.local.sel.turn ? ctx.local.sel : null;
      root.innerHTML = String(html`
        ${App.pageHead({
          title: 'Consulta de procedimientos de Calidad',
          meta: [
            { icon: 'book-open', text: `${K().order.length} documentos vigentes` },
            { icon: 'layers', text: `${fmt.num(K().passages().length)} fragmentos indexados` },
            { icon: 'history', text: `Índice actualizado el ${fmt.date(K().indexedAt.slice(0, 10))} a las ${fmt.time(K().indexedAt)}` },
            sys('Elara')
          ],
          actions: turns.length ? html`<button type="button" class="btn btn-secondary" data-action="export">${icon('printer')}<span>Exportar consulta (PDF)</span></button>` : ''
        })}
        <div class="pr-wrap">
          <div class="pr-grid">
            <div class="pr-main">${consultaCard(ctx, turns, active)}</div>
            <aside class="pr-side" aria-label="Fuente citada">${sourceCard(ctx)}</aside>
          </div>
        </div>
        <div class="section">${libraryCard(ctx)}</div>
      `);
      requestAnimationFrame(() => scrollToMark(ctx.$('#pr-doc-scroll')));

      ctx.on('submit', 'form[data-form="ask"]', (e, form) => { e.preventDefault(); ask(ctx, form.querySelector('input').value); });
      ctx.on('click', '[data-ask]', (e, el) => { const id = el.getAttribute('data-ask'); if (INTENT[id]) ask(ctx, INTENT[id].q, id); });
      ctx.on('click', '[data-cite]', (e, el) => { e.preventDefault(); select(ctx, { turn: el.getAttribute('data-turn'), n: Number(el.getAttribute('data-cite')) }); });
      ctx.on('click', '[data-open-doc]', (e, el) => {
        const code = el.getAttribute('data-open-doc');
        if (!K().get(code)) return;
        select(ctx, { doc: code, sec: el.getAttribute('data-sec') || null, quote: el.getAttribute('data-quote') || null });
      });
      ctx.on('click', '[data-action="doc-full"]', () => { const c = selectedCite(ctx); if (c) docModal(c); });
      ctx.on('click', '[data-action="route"]', (e, el) => routeTurn(ctx, el.getAttribute('data-turn')));
      ctx.on('click', '[data-action="copy"]', (e, el) => {
        const t = (ctx.local.turns || []).find((x) => x.id === el.getAttribute('data-turn'));
        if (t) App.copyText(`Pregunta: ${t.q}\n\n${plainAnswer(t)}\n\nFuentes:\n${plainSources(t).join('\n')}`, 'Respuesta copiada con sus fuentes');
      });
      ctx.on('click', '[data-action="export"]', () => exportReport(ctx));
      ctx.on('click', '[data-action="clear"]', async () => {
        const ok = await App.confirm({ title: 'Nueva consulta', body: html`<p class="slate">Se vacía la conversación de esta vista. El registro de auditoría conserva las preguntas y respuestas.</p>`, confirmLabel: 'Vaciar conversación', icon: 'rotate-ccw' });
        if (!ok || !ctx.alive()) return;
        ctx.setLocal({ turns: [], sel: null });
        ctx.rerender();
      });
      ctx.on('click', 'details.pr-log > summary', (e, el) => { const host = el.parentElement.querySelector('[data-log]'); if (host) fillLog(ctx, host.getAttribute('data-log')); });
      ctx.on('input', '#pr-q', () => { const hint = ctx.$('#pr-hint'); if (hint && hint.classList.contains('t-warn')) { hint.classList.remove('t-warn'); hint.textContent = `Busca en ${K().order.length} documentos vigentes. Pulsa Intro para preguntar.`; } });
    }
  });

  /* Motor expuesto para las pruebas (tests/procedimientos.cjs) y para otras escenas. */
  if (scene) {
    scene.engine = {
      ready: ensureDocs,
      classify: (q) => classify(q),
      intents: () => INTENTS.map((i) => ({ id: i.id, q: i.q })),
      suggested: () => SUGGESTED.slice(),
      answer: (q) => { const r = classify(q); const t = { q, type: r.type, ref: r.id, cites: r.cites, plant: r.plant }; t.kind = r.type === 'intent' ? ((INTENT[r.id] && INTENT[r.id].kind) || 'answer') : r.type === 'generic' ? 'answer' : 'none'; return { result: r, kind: t.kind, answer: t.kind !== 'none' ? answerOf(t) : null, text: plainAnswer(t) }; },
      /** Comprueba que cada cita preparada existe literalmente en su documento. */
      validate: () => {
        const bad = [];
        INTENTS.forEach((it) => {
          const qs = it.id === 'alergenos' ? [it.q, '¿El salteado de verduras lleva alérgenos?', '¿Qué alérgenos tiene el brócoli?'] : [it.q];
          qs.forEach((q) => {
            const a = finalize(Object.assign({ kind: 'answer' }, it.build(q)));
            a.cites.forEach((c) => { if (!K().has(c.doc, c.sec, c.quote)) bad.push(`${it.id}: ${c.doc} §${c.sec} «${c.quote}»`); });
          });
        });
        Object.values(K().unindexed).forEach((u) => { if (!K().has(u.mentionedIn.doc, u.mentionedIn.sec, u.mentionedIn.quote)) bad.push(`mención ${u.code}`); });
        return bad;
      }
    };
  }
})();
