/*
 * Documentos controlados de Calidad indexados en la consulta de procedimientos (SPEC §4.7).
 * Textos sintéticos, coherentes con window.CN_DATA (umbrales, equipos, órdenes, lotes y roles).
 * Los usan la escena «procedimientos» y, si lo necesita, «cuestionario».
 *
 * window.CN_DOCS
 *   .source, .indexedAt            origen del índice (Elara) y hora de la última indexación
 *   .order                         códigos en el orden de la biblioteca
 *   .docs[code]                    { code, title, short, type, version, date, owner, scope, related, sections: [{id, heading, text, list, refs}] }
 *                                  (los procedimientos de CN_DATA.procedures empiezan con la sección «Resumen», id 'R', con su resumen canónico)
 *   .get(code) · .all()            documento por código · lista ordenada
 *   .section(code, id)             sección de un documento
 *   .has(code, id, quote)          true si la cita literal existe en esa sección (párrafo o elemento de lista)
 *   .passages()                    fragmentos indexados [{doc, sec, heading, text}] (párrafos y elementos de lista)
 *   .search(pregunta, {limit})     fragmentos ordenados por pertinencia [{doc, sec, heading, text, score, matched, coverage}]
 *   .tidy(texto)                   signo menos y espacios duros entre cifra y unidad (lo usan también las citas)
 *   .normalize(texto) · .terms(texto) · .stem(palabra)   normalización y términos del índice (sin tildes, plural y prefijo de 6 letras)
 *   .unindexed                     documentos citados por otros que NO están en el índice (no se inventa su contenido)
 *
 * Carga: procedimientos.js inserta este fichero si index.html no lo incluye; al terminar emite App.emit('docs-ready', CN_DOCS).
 * Para usarlo desde otra escena sin carrera de carga: incluir <script src="assets/js/scenes/procedimientos-docs.js"> en index.html
 * antes de las escenas, o esperar a App.on('docs-ready', …) / window.CN_DOCS_READY (promesa).
 * La numeración de PNT-CAL-012 (4. Criterio de bloqueo · 5. Evaluación) coincide con la de la galería de componentes.
 * El código PNT-CAL-031 es el de cuerpos extraños (así lo define CN_DATA.procedures); Listeria es PNT-CAL-034.
 */
(function () {
  'use strict';

  const NB = ' ';

  /** Signo menos tipográfico y espacio duro entre cifra y unidad (−18 °C, 15 min, 2,5 %). */
  function tidy(s) {
    return String(s == null ? '' : s)
      .replace(/(^|[\s(«])-(?=\d)/g, '$1−')
      .replace(/(\d) (?=(°C|%|h\b|min\b|mm\b|kg\b|g\b|t\b|TR\b|ufc|ppm\b|días\b|meses\b|semanas\b))/g, `$1${NB}`);
  }

  const DOCS = [
    {
      code: 'PNT-CAL-012',
      title: 'Excursiones de temperatura en cámaras de producto congelado',
      short: 'Excursiones de temperatura',
      type: 'Procedimiento',
      version: '4',
      date: '2026-03-12',
      owner: 'Calidad de planta',
      scope: 'Fustiñana',
      related: ['PNT-CAL-015'],
      sections: [
        { id: '1', heading: '1. Objeto y alcance', text: [
          'Definir cómo se detecta, evalúa y registra una excursión de temperatura en los almacenes de producto congelado de la planta de Fustiñana, para proteger la seguridad y la calidad del producto y la cadena de frío hasta el cliente.',
          'Aplica a los silos automáticos SIL-1 a SIL-4 (consigna −25 °C) y a las cámaras de expedición (consigna −22 °C). No aplica al transporte, que se rige por las condiciones pactadas con cada transportista.'
        ] },
        { id: '2', heading: '2. Definiciones', list: [
          'Temperatura de aire: lectura de la sonda de ambiente de cada cámara (por ejemplo, TT-C07-01), registrada en SCADA Galileo cada 5 min.',
          'Excursión: temperatura de aire por encima de −18 °C.',
          'Excursión crítica: temperatura de aire por encima de −15 °C.',
          'Palés expuestos: palés que Mecalux Easy WMS sitúa en la cámara entre el inicio y el fin de la excursión.'
        ] },
        { id: '3', heading: '3. Responsabilidades', list: [
          'Responsable de Calidad de turno: valora la excursión, aprueba el bloqueo y decide la evaluación del producto.',
          'Jefe de turno de expedición: retiene las cargas con palés expuestos hasta la decisión de Calidad.',
          'Mantenimiento frigorífico: restablece la temperatura, investiga la causa y registra la intervención.'
        ] },
        { id: '4', heading: '4. Criterio de bloqueo', text: [
          'Si la temperatura de aire supera −18 °C durante más de 15 min seguidos, se bloquean todos los palés expuestos (bloqueo de calidad según PNT-CAL-015) y no se expiden hasta completar la evaluación del punto 5.',
          'Si en algún momento supera −15 °C, la excursión es crítica: además del bloqueo, se abre una no conformidad en Elara y se informa al Responsable de Calidad de planta.',
          'Los palés del mismo lote que están en otras ubicaciones no se bloquean de forma automática: se marcan «a evaluar» y el Responsable de Calidad de turno decide su alcance a la vista de los resultados.',
          'Una excursión de 15 min o menos que no llega a −15 °C se registra sin bloqueo y se revisa en el informe semanal de cadena de frío.'
        ] },
        { id: '5', heading: '5. Evaluación del producto', text: [
          'Los palés expuestos se evalúan por lote antes de cualquier expedición. La liberación la decide el Responsable de Calidad según PNT-CAL-015, con los resultados registrados en Elara.'
        ], list: [
          'Medir la temperatura de producto con sonda en los palés expuestos (capa exterior y centro).',
          'Análisis sensorial y de aspecto (cristales de hielo, apelmazado) por lote.',
          'Decisión de destino por lote: liberar, reclasificar o destruir.'
        ] },
        { id: '6', heading: '6. Registro y comunicación', list: [
          'La alarma de SCADA Galileo abre el registro de la excursión: inicio, fin, pico y minutos por encima de −18 °C y de −15 °C.',
          'El bloqueo se registra en SAP QM y en Mecalux Easy WMS con la referencia de la alarma (PNT-CAL-015).',
          'Se avisa al Jefe de turno de expedición por Microsoft Teams para retener las cargas planificadas con palés expuestos.',
          'La causa y la acción correctiva se documentan en la no conformidad; las excursiones repetidas en una misma cámara se analizan en la revisión mensual de cadena de frío.'
        ] },
        { id: '7', heading: '7. Referencias', refs: true, list: [
          'PNT-CAL-015 · Bloqueo y liberación de producto (retención de calidad).',
          'Real Decreto 1109/1991, norma general de alimentos ultracongelados.',
          'IFS Food v8 · BRCGS Food Safety · FSSC 22000.'
        ] }
      ]
    },
    {
      code: 'PNT-CAL-015',
      title: 'Bloqueo y liberación de producto (retención de calidad)',
      short: 'Bloqueo y liberación',
      type: 'Procedimiento',
      version: '6',
      date: '2026-01-20',
      owner: 'Calidad de planta',
      scope: 'Fustiñana',
      related: ['PNT-CAL-012', 'PNT-CAL-020'],
      sections: [
        { id: '1', heading: '1. Objeto y alcance', text: [
          'Asegurar que ningún producto con una desviación de calidad o de seguridad alimentaria sale de planta sin una decisión documentada de Calidad. Aplica a producto terminado, graneles (octavines) y materias primas en cualquier ubicación de Fustiñana.'
        ] },
        { id: '2', heading: '2. Responsabilidades', list: [
          'Cualquier responsable de turno puede proponer un bloqueo al detectar una desviación.',
          'El Responsable de Calidad de turno aprueba el bloqueo y define su alcance.',
          'Solo el Responsable de Calidad (de planta o, por delegación, de turno) puede liberar producto bloqueado.'
        ] },
        { id: '3', heading: '3. Registro del bloqueo', text: [
          'Todo bloqueo se registra a la vez en SAP QM (lote con bloqueo de calidad) y en Mecalux Easy WMS (palés inmovilizados y expediciones retenidas). Easy WMS no permite cargar un palé bloqueado.',
          'El registro incluye el motivo, el alcance (lotes, SSCC y ubicaciones), la referencia de origen (alarma, no conformidad o reclamación) y quién lo aprueba.'
        ] },
        { id: '4', heading: '4. Evaluación y decisión de empleo', text: [
          'La liberación exige evidencia documentada: resultados de la evaluación, análisis cuando procedan y conclusión firmada. La decisión de empleo se registra en SAP QM y puede ser liberar, reclasificar (industria o segunda calidad) o destruir.',
          'Ningún producto se libera por defecto ni por vencimiento de plazo.'
        ] },
        { id: '5', heading: '5. Liberación parcial', text: [
          'Un lote puede liberarse por palés (SSCC) cuando la evaluación permite separar los palés afectados de los que no lo están. Cada palé liberado queda identificado en SAP QM y en Easy WMS.'
        ] },
        { id: '6', heading: '6. Producto ya expedido', text: [
          'Si parte del lote ya se ha expedido, el Responsable de Calidad de planta valora la retirada o recuperación según PNT-CAL-018 (Trazabilidad y retirada de producto) e informa al cliente en el plazo que marque ese procedimiento.'
        ] },
        { id: '7', heading: '7. Registros', list: [
          'Bloqueos y decisiones de empleo: SAP QM.',
          'Palés inmovilizados y expediciones retenidas: Mecalux Easy WMS.',
          'Evidencias de la evaluación: Elara.'
        ] }
      ]
    },
    {
      code: 'PNT-CAL-020',
      title: 'Gestión de reclamaciones de cliente e informe 8D',
      short: 'Reclamaciones e informe 8D',
      type: 'Procedimiento',
      version: '5',
      date: '2025-12-15',
      owner: 'Calidad de planta',
      scope: 'Todas las plantas',
      related: ['PNT-CAL-015', 'PNT-CAL-031'],
      sections: [
        { id: '1', heading: '1. Objeto y alcance', text: [
          'Gestionar las reclamaciones de clientes, y las de consumidores que llegan a través de ellos, hasta su cierre con un informe 8D. Incluye las recibidas por las filiales comerciales, como Freeworld Foods en el Reino Unido.'
        ] },
        { id: '2', heading: '2. Plazos', list: [
          'Acuse de recibo al cliente: 24 h desde la recepción.',
          'Contención: 48 h para identificar y bloquear el stock del lote reclamado (PNT-CAL-015).',
          'Informe 8D: en el plazo pactado con el cliente; si no hay plazo pactado, 5 días hábiles.'
        ] },
        { id: '3', heading: '3. Clasificación', text: [
          'Gravedad alta: cuerpos extraños duros o cortantes de 7 mm o más, aunque no haya lesión; alérgenos no declarados; cualquier sospecha de riesgo microbiológico. Se informa en el día al Responsable de Calidad de planta.',
          'Gravedad media: defectos de calidad sin riesgo para la salud (aspecto, calibre, peso o envase).'
        ] },
        { id: '4', heading: '4. Investigación', text: [
          'La investigación de una reclamación por cuerpo extraño revisa, como mínimo:'
        ], list: [
          'Trazabilidad del lote hacia atrás (campo, recepción, línea y turno) y hacia delante (palés y expediciones).',
          'Registros de la línea en la fecha de fabricación: despedregadora, selectora óptica y detector de metales.',
          'Historial de mantenimiento de los equipos de control de cuerpos extraños de la línea, incluidas las órdenes abiertas.',
          'Reclamaciones similares de los últimos 12 meses en cualquier planta del grupo.'
        ] },
        { id: '5', heading: '5. Informe 8D', text: [
          'El informe 8D se prepara en Elara y sigue ocho pasos:'
        ], list: [
          'D1 · Equipo: Calidad de planta, Producción y Mantenimiento de línea.',
          'D2 · Descripción del problema con los datos del cliente.',
          'D3 · Contención: stock bloqueado y producto en poder del cliente.',
          'D4 · Causa raíz, confirmada con evidencia.',
          'D5 · Acciones correctivas.',
          'D6 · Implantación y verificación de la eficacia.',
          'D7 · Prevención: cambios en procedimientos, planes de mantenimiento o formación.',
          'D8 · Cierre y comunicación al cliente.'
        ] },
        { id: '6', heading: '6. Respuesta al cliente', text: [
          'La respuesta se redacta en el idioma del cliente y la aprueba el Responsable de Calidad de planta antes de enviarla.',
          'Una causa solo se comunica como confirmada cuando hay evidencia; hasta entonces se presenta como hipótesis en investigación.'
        ] },
        { id: '7', heading: '7. Historial de revisiones', text: [
          'Rev. 5 (15/12/2025): se añade la revisión del historial de mantenimiento de las despedregadoras en las reclamaciones por cuerpo extraño, como acción de la NC-2025-0388.'
        ] }
      ]
    },
    {
      code: 'PNT-CAL-031',
      title: 'Control de cuerpos extraños: despedregadoras, ópticas y detectores de metales',
      short: 'Control de cuerpos extraños',
      type: 'Procedimiento',
      version: '7',
      date: '2026-04-02',
      owner: 'Calidad de planta',
      scope: 'Fustiñana',
      related: ['IT-MAN-DP-02', 'PNT-CAL-020'],
      sections: [
        { id: '1', heading: '1. Objeto y alcance', text: [
          'Prevenir la presencia de cuerpos extraños (piedras, terrones, vidrio, metal y materia vegetal extraña) en el producto terminado. Aplica a las líneas L1 a L5 de Fustiñana.'
        ] },
        { id: '2', heading: '2. Barreras de control', text: [
          'Cada línea combina barreras sucesivas; ninguna sustituye a otra:'
        ], list: [
          'Limpiadora-aventadora: separa tierra, hojas y material ligero.',
          'Despedregadora: separa piedras y terrones por densidad; su malla se mantiene según IT-MAN-DP-02.',
          'Selectora óptica: rechaza piezas por color y forma después del túnel IQF.',
          'Detector de metales tras el envasado: es un punto de control crítico (PCC) del plan APPCC.'
        ] },
        { id: '3', heading: '3. Selectoras ópticas', text: [
          'Cada selectora tiene una tasa de rechazo de referencia por producto, fijada en MES Mapex (por ejemplo, 1,5 % en guisante).'
        ], list: [
          'Rechazo por encima del 2,5 %: el operador revisa la entrada de producto y las barreras anteriores, en especial la despedregadora.',
          'Rechazo por encima del 4 %: aviso inmediato a Calidad de turno y a Mantenimiento de línea, y muestreo reforzado de producto terminado.'
        ] },
        { id: '4', heading: '4. Detector de metales (PCC)', text: [
          'El detector de metales es un PCC. Se verifica con probetas certificadas de Fe 2,0 mm, no férrico 2,5 mm y acero inoxidable 3,0 mm al inicio del turno, cada 2 h y al final de la producción.',
          'Si una verificación falla o se superan las 2 h sin verificar, se retiene todo el producto envasado desde la última verificación correcta y se vuelve a pasar por el detector una vez corregido el equipo.',
          'El producto rechazado cae a un contenedor cerrado con llave; solo Calidad lo abre y registra su contenido.'
        ] },
        { id: '5', heading: '5. Registros', list: [
          'Verificaciones del detector: hoja de PCC en Elara, firmada por el operador y revisada por Calidad.',
          'Tasas de rechazo de las selectoras: MES Mapex, por turno.',
          'Inspecciones de mallas de despedregadora: GMAO (IT-MAN-DP-02).'
        ] },
        { id: '6', heading: '6. Referencias', refs: true, list: [
          'IT-MAN-DP-02 · Inspección y sustitución de mallas de despedregadora.',
          'Plan APPCC de la planta de Fustiñana.'
        ] }
      ]
    },
    {
      code: 'PNT-CAL-034',
      title: 'Control ambiental de Listeria monocytogenes',
      short: 'Control ambiental de Listeria',
      type: 'Procedimiento',
      version: '2',
      date: '2026-06-30',
      owner: 'Calidad de planta',
      scope: 'Fustiñana',
      related: ['PNT-CAL-015'],
      sections: [
        { id: 'R', heading: 'Resumen', text: [
          'Muestreo ambiental por zonas después del escaldado; la zona 1 se muestrea cada semana en cada línea. Un positivo en zona 1 retiene el producto desde la última limpieza verificada y exige tres muestreos negativos para volver a la frecuencia normal.'
        ] },
        { id: '1', heading: '1. Objeto y alcance', text: [
          'Detectar a tiempo la presencia de Listeria en el entorno de fabricación y evitar que llegue al producto. Aplica a las zonas posteriores al escaldado de las líneas L1 a L5 de Fustiñana: túneles IQF, selectoras ópticas, envasado y salas anexas.'
        ] },
        { id: '2', heading: '2. Zonas de muestreo', list: [
          'Zona 1: superficies en contacto con el producto después del escaldado (cintas, túnel IQF, selectora óptica, tolvas y básculas de envasado).',
          'Zona 2: superficies próximas sin contacto con el producto (bastidores, carcasas y cuadros de mando).',
          'Zona 3: resto de la sala de proceso (suelos, desagües, paredes y techos).',
          'Zona 4: áreas fuera de producción (vestuarios, pasillos y almacén de envases).'
        ] },
        { id: '3', heading: '3. Frecuencias', text: [
          'Frecuencias mínimas de muestreo ambiental:'
        ], list: [
          'Zona 1: semanal en cada línea, con la línea en producción.',
          'Zona 2: semanal.',
          'Zona 3: cada dos semanas, con prioridad en desagües y puntos con agua estancada.',
          'Zona 4: mensual.'
        ] },
        { id: '4', heading: '4. Muestreos adicionales', text: [
          'Además de las frecuencias mínimas, se muestrea después de obras, de averías que obliguen a abrir equipos de la zona 1 y de cada limpieza en profundidad de fin de campaña.'
        ] },
        { id: '5', heading: '5. Actuación ante un resultado positivo', text: [
          'Positivo de Listeria spp. en zona 1: se retiene el producto fabricado en esa línea desde la última limpieza verificada hasta conocer el resultado de Listeria monocytogenes, se limpia y desinfecta en profundidad y se toman muestras alrededor del punto positivo.',
          'La línea vuelve a la frecuencia normal tras tres muestreos consecutivos negativos en ese punto.',
          'Positivo en zonas 2 o 3: limpieza reforzada y nuevo muestreo en 24 a 48 h; si se repite, se investiga la causa con Mantenimiento de línea.',
          'Todo positivo se comunica en el día al Responsable de Calidad de planta y se registra en Elara.'
        ] },
        { id: '6', heading: '6. Producto terminado', text: [
          'El producto terminado se analiza según el plan analítico anual. Los resultados de Listeria monocytogenes se valoran según el Reglamento (CE) 2073/2005, modificado por el Reglamento (UE) 2024/2895, aplicable desde el 01/07/2026.'
        ] },
        { id: '7', heading: '7. Historial de revisiones', refs: true, text: [
          'Rev. 2 (30/06/2026): actualización por el Reglamento (UE) 2024/2895.'
        ] }
      ]
    },
    {
      code: 'IT-MAN-DP-02',
      title: 'Inspección y sustitución de mallas de despedregadora',
      short: 'Mallas de despedregadora',
      type: 'Instrucción técnica',
      version: '3',
      date: '2025-12-10',
      owner: 'Mantenimiento de línea',
      scope: 'Todas las plantas',
      related: ['PNT-CAL-031'],
      sections: [
        { id: '1', heading: '1. Objeto y alcance', text: [
          'Mantener la eficacia de separación de las despedregadoras. Aplica a las despedregadoras de todas las plantas del grupo; en Fustiñana, a DP-2 (línea L2, guisante y judía verde).'
        ] },
        { id: '2', heading: '2. Inspección semanal', text: [
          'Una vez por semana, con la línea parada y consignada, Mantenimiento de línea inspecciona la malla y registra el resultado en la GMAO:'
        ], list: [
          'Roturas, deformaciones y holgura del marco.',
          'Desgaste de la luz de malla, medido con galga en cinco puntos.',
          'Estado de las juntas y del sistema de expulsión de piedras.'
        ] },
        { id: '3', heading: '3. Criterio de desgaste', text: [
          'Hay desgaste cuando la luz de malla supera en más de un 10 % la nominal en cualquier punto medido, o cuando hay roturas o deformaciones.'
        ] },
        { id: '4', heading: '4. Actuación con desgaste', text: [
          'Se abre una orden de trabajo con la sustitución programada de la malla y se informa a Calidad de turno el mismo día.',
          'Hasta la sustitución, inspección reforzada: revisión visual al inicio de cada turno, anotada en la hoja de ruta de la línea, y seguimiento de la tasa de rechazo de la selectora óptica situada después del túnel.',
          'Si la malla presenta rotura, la línea no arranca hasta sustituirla.'
        ] },
        { id: '5', heading: '5. Sustitución y verificación', text: [
          'Tras cambiar la malla se verifica la separación con 10 piedras testigo de 6 a 10 mm: la despedregadora debe separar las 10. El resultado se registra en la orden de trabajo antes de cerrarla.'
        ] },
        { id: '6', heading: '6. Historial de revisiones', text: [
          'Rev. 3 (10/12/2025): se añade la inspección reforzada hasta la sustitución de la malla, como acción de la NC-2025-0388 (piedra en espinaca, línea de hoja de Alcorioja).'
        ] }
      ]
    },
    {
      code: 'FT-UK-GUI-1000',
      title: 'Ficha técnica de producto terminado · Guisante 1 kg (Garden Peas 1kg)',
      short: 'Ficha técnica · Guisante 1 kg (Reino Unido)',
      type: 'Ficha técnica',
      version: '2',
      date: '2026-03-03',
      owner: 'Calidad de planta',
      scope: 'UK-GUI-1000',
      related: ['MAT-ALE-FUS', 'PNT-CAL-031'],
      sections: [
        { id: '1', heading: '1. Producto', text: [
          'Guisante (Pisum sativum) desgranado, escaldado y ultracongelado en IQF. Marca blanca de un retailer del Reino Unido, comercializado a través de Freeworld Foods. Se fabrica en Fustiñana, en la línea L2.'
        ] },
        { id: '2', heading: '2. Ingredientes y alérgenos', text: [
          'Ingredientes: guisante (100 %).',
          'Alérgenos: no contiene ninguno de los 14 alérgenos de declaración obligatoria del Reglamento (UE) 1169/2011. Sin riesgo de contaminación cruzada identificado (MAT-ALE-FUS).'
        ] },
        { id: '3', heading: '3. Especificación física', list: [
          'Madurez en recepción: tenderómetro de 95 a 120 TR.',
          'Calibre: de 7,5 a 10,2 mm.',
          'Piedras, vidrio y metal: ausencia (tolerancia cero).',
          'Materia vegetal extraña (vainas, hojas): como máximo 2 piezas por kg.',
          'Granos defectuosos (manchados o partidos): como máximo el 3 % en peso.'
        ] },
        { id: '4', heading: '4. Microbiología', list: [
          'Escherichia coli: menos de 100 ufc/g.',
          'Listeria monocytogenes: ausencia en 25 g, según el plan analítico (PNT-CAL-034).',
          'Recuento de aerobios mesófilos: menos de 100.000 ufc/g.'
        ] },
        { id: '5', heading: '5. Conservación y vida útil', text: [
          'Conservar a −18 °C o menos. Consumo preferente: 24 meses desde la fabricación, en formato MM/AAAA.',
          'Una vez descongelado, no volver a congelar. Cocinar antes de consumir.'
        ] },
        { id: '6', heading: '6. Envase y paletización', list: [
          'Bolsa de 1 kg; 10 bolsas por caja; 80 cajas por palé (800 kg netos).',
          'Etiqueta de palé GS1-128 con SSCC, lote y consumo preferente.'
        ] },
        { id: '7', heading: '7. Código de lote', text: [
          'Formato L<aa>-<día juliano>-<planta>-<producto>-<nº>. Ejemplo: L26-231-FUS-GUI-01 es el lote 01 de guisante fabricado en Fustiñana el día 231 de 2026 (19/08/2026).'
        ] }
      ]
    },
    {
      code: 'MAT-ALE-FUS',
      title: 'Matriz de alérgenos · planta de Fustiñana',
      short: 'Matriz de alérgenos',
      type: 'Matriz',
      version: '9',
      date: '2026-06-30',
      owner: 'Equipo APPCC',
      scope: 'Fustiñana',
      related: ['FT-UK-GUI-1000'],
      sections: [
        { id: '1', heading: '1. Alcance', text: [
          'Recoge, por producto y línea, la presencia de los 14 alérgenos de declaración obligatoria del Reglamento (UE) 1169/2011 en la planta de Fustiñana. Se revisa con cada receta, materia prima o proveedor nuevo.'
        ] },
        { id: '2', heading: '2. Situación de la planta', text: [
          'En la planta de Fustiñana no se manipula ninguno de los 14 alérgenos: todas las recetas son verdura o mezclas de verduras, y los graneles a la plancha que llegan de Arguedas vienen declarados sin alérgenos en su especificación.',
          'No hay riesgo de contaminación cruzada por alérgenos identificado en las líneas L1 a L5.'
        ] },
        { id: '3', heading: '3. Matriz por producto', list: [
          'UK-GUI-1000 · Guisante 1 kg (Garden Peas 1kg) · línea L2 · contiene: ninguno · puede contener: ninguno.',
          'VL-GUI-1000 · Guisante fino 1 kg · línea L4 · contiene: ninguno · puede contener: ninguno.',
          'CN-BRO-2500 · Brócoli floretes 2,5 kg · línea L4 · contiene: ninguno · puede contener: ninguno.',
          'FR-JUD-1000 · Judía verde redonda 1 kg · línea L3 · contiene: ninguno · puede contener: ninguno.',
          'US-MAI-450 · Maíz dulce 450 g · línea L1 · contiene: ninguno · puede contener: ninguno.',
          'UK-MIX-600 · Salteado de verduras a la plancha 600 g · línea L5 · contiene: ninguno · puede contener: ninguno.',
          'VL-ESP-1000 · Espinaca en porciones 1 kg · envasada en Alcorioja; en Fustiñana solo se almacena y expide · contiene: ninguno · puede contener: ninguno.'
        ] },
        { id: '4', heading: '4. Control de cambios', text: [
          'Cualquier receta, materia prima o proveedor nuevo con alguno de los 14 alérgenos requiere la evaluación previa del equipo APPCC y la actualización de esta matriz antes de entrar en planta.',
          'Está prohibido introducir alimentos en las zonas de producción, incluidos frutos de cáscara y sésamo.'
        ] }
      ]
    }
  ];

  /* Documentos citados por los indexados que NO están en el índice: se nombran, no se resumen. */
  const UNINDEXED = {
    'PNT-CAL-018': { code: 'PNT-CAL-018', title: 'Trazabilidad y retirada de producto', mentionedIn: { doc: 'PNT-CAL-015', sec: '6', quote: 'según PNT-CAL-018 (Trazabilidad y retirada de producto)' } }
  };

  /* Título y resumen canónicos de CN_DATA.procedures: el resumen encabeza el documento (mismo texto que citan otras escenas). */
  const CANON = (window.CN_DATA && window.CN_DATA.procedures) || {};
  DOCS.forEach((d) => {
    const c = CANON[d.code];
    if (!c) return;
    if (c.title) d.title = c.title;
    if (c.summary) d.sections.unshift({ id: 'R', heading: 'Resumen', text: [c.summary] });
  });

  DOCS.forEach((d) => {
    d.title = tidy(d.title);
    d.sections.forEach((s) => {
      s.heading = tidy(s.heading);
      if (s.text) s.text = s.text.map(tidy);
      if (s.list) s.list = s.list.map(tidy);
    });
  });
  Object.values(UNINDEXED).forEach((u) => { u.mentionedIn.quote = tidy(u.mentionedIn.quote); });

  const BY_CODE = Object.fromEntries(DOCS.map((d) => [d.code, d]));

  /* ---------------------------------------------------------------- Índice de búsqueda (determinista) */

  const STOP = new Set(('a al algo algun alguna algunas alguno algunos ante antes aqui asi aun cada como con contra cual cuales cuando cuanto cuanta cuantas cuantos de del desde donde dos durante e el ella ellas ellos en entre era es esa esas ese eso esos esta estan estar estas este esto estos fue ha hace hacen hacer hacemos hago hay la las le les lo los mas me mi mis mucho muy nada ni no nos nosotros nuestra nuestras nuestro nuestros o os otra otras otro otros para pero poco por porque puede pueden puedo podemos que quien quienes se segun ser si sin sobre son su sus tambien tanto te tener tenemos tengo tiene tienen todo todos tu tus un una unas uno unos usa usan usar y ya debe deben debo debemos hay pasa ocurre dice dicen decir haya sea sean seria se esta estamos algun cual cuales vez veces favor quiero necesito saber dime explica explicame indica indicame'.split(' ')));

  function normalize(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/−/g, '-').replace(/[^a-z0-9ñ\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  /* Recorte ligero: plural en -s y prefijo de 6 letras (reclamación/reclamaciones → «reclam»). */
  function stem(t) {
    let w = t;
    if (/^\d/.test(w)) return w;
    if (w.length > 3 && /s$/.test(w)) w = w.slice(0, -1);
    return w.length > 6 ? w.slice(0, 6) : w;
  }
  /** Términos significativos (sin palabras vacías), normalizados y recortados. */
  function terms(s) {
    return normalize(s).split(/[\s-]+/).filter((t) => t && (t.length > 2 || /^\d+$/.test(t)) && !STOP.has(t)).map(stem);
  }

  let PASSAGES = null;
  let DF = null;
  function build() {
    if (PASSAGES) return;
    PASSAGES = [];
    DOCS.forEach((d) => d.sections.forEach((s) => {
      if (s.refs) return;
      (s.text || []).concat(s.list || []).forEach((text) => {
        const bag = new Set(terms(`${text} ${s.heading.replace(/^\d+\.\s*/, '')}`));
        PASSAGES.push({ doc: d.code, sec: s.id, heading: s.heading, text, bag });
      });
    }));
    DF = new Map();
    PASSAGES.forEach((p) => p.bag.forEach((t) => DF.set(t, (DF.get(t) || 0) + 1)));
  }
  function idf(t) { const n = PASSAGES.length; const df = DF.get(t) || 0; return Math.log(1 + (n - df + 0.5) / (df + 0.5)); }

  /**
   * Fragmentos ordenados por pertinencia. coverage = términos de la pregunta presentes en el fragmento / términos de la pregunta.
   * strong = términos poco frecuentes en el índice (aparecen en menos del 8 % de los fragmentos).
   */
  function search(question, opts) {
    build();
    const o = opts || {};
    const q = Array.from(new Set(terms(question)));
    if (!q.length) return [];
    const strongCut = Math.max(2, Math.floor(PASSAGES.length * 0.08));
    const out = PASSAGES.map((p) => {
      const matched = q.filter((t) => p.bag.has(t));
      const score = matched.reduce((acc, t) => acc + idf(t), 0);
      const strong = matched.filter((t) => (DF.get(t) || 0) <= strongCut);
      return { doc: p.doc, sec: p.sec, heading: p.heading, text: p.text, score, matched, strong, coverage: matched.length / q.length };
    }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score || b.coverage - a.coverage);
    return o.limit ? out.slice(0, o.limit) : out;
  }

  function section(code, id) { const d = BY_CODE[code]; return d ? d.sections.find((s) => s.id === String(id)) || null : null; }
  function has(code, id, quote) {
    const s = section(code, id);
    if (!s || !quote) return false;
    return (s.text || []).concat(s.list || []).some((t) => t.indexOf(quote) >= 0);
  }

  window.CN_DOCS = {
    source: 'Elara · documentos controlados de Calidad',
    indexedAt: '2026-09-29T06:00',
    order: DOCS.map((d) => d.code),
    docs: BY_CODE,
    unindexed: UNINDEXED,
    get: (code) => BY_CODE[String(code || '').trim().toUpperCase()] || null,
    all: () => DOCS.slice(),
    section,
    has,
    passages: () => { build(); return PASSAGES.map((p) => ({ doc: p.doc, sec: p.sec, heading: p.heading, text: p.text })); },
    search,
    tidy,
    normalize,
    terms,
    stem
  };

  if (window.App && typeof window.App.emit === 'function') window.App.emit('docs-ready', window.CN_DOCS);
})();
