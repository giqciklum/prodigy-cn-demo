# core.js · API de la consola Prodigy para Congelados de Navarra

Guía para quien construye una escena. Todo lo que sigue existe en `window.App` (cargado por `assets/js/core.js`). La escena de referencia es `assets/js/scenes/turno.js`: cópiala como patrón. La galería `tests/gallery.html` (no se publica) muestra cada componente con datos reales de `CN_DATA`.

## v2.2: industrias

La guía siguiente describe los componentes de la demo original. Las cuatro industrias nuevas los reutilizan desde `scenes/industries.js`; sus perfiles están en `../industries.js`. El README público documenta el contrato y la arquitectura. Las restricciones editoriales históricas de cambios por fichero de esta guía no impiden mantener el selector ni el motor compartido. La línea de simulación y sus límites deben quedar visibles.

## 0. Antes de escribir una línea

- Lee `SPEC-v2.md` §1 (reglas anti «AI slop»). Resumen: títulos descriptivos y nada de eslóganes ni tríadas; sin emojis ni iconos de caracteres Unicode (solo `App.icon`); sin degradados, brillos ni glassmorphism; cifras exactas sacadas de `CN_DATA`; vocabulario de planta; sus sistemas por su nombre; una sola línea de honestidad (ya está en el pie y en «Acerca de esta demo»): explica los límites en el pie, Acerca de, plataforma y el generador preparado cuando corresponda.
- Colores: solo las variables de `assets/css/tokens.css`. Rojo (`--cn-red`) únicamente para crítico.
- Español de España con tildes, «comillas latinas», formato `−13,9 °C`, `17.600 kg`, `29/09/2026 05:50` (usa `App.fmt`, nunca `toFixed` a mano).
- Personas: solo roles (`CN_DATA.roles`), nunca nombres.
- Cada escena toca **solo su fichero** `assets/js/scenes/<id>.js`. Si necesitas CSS propio, inyéctalo con `App.style()` usando tokens. No edites `core.js`, `app.css` ni `index.html`.

## 1. Plantilla de escena

```js
(function () {
  'use strict';
  const { html, icon, fmt, chip } = App;
  const D = window.CN_DATA;

  App.scene({
    id: 'alarma',                 // = hash (#alarma) y clave en App.state.scenes
    order: 30,                    // posición en la navegación (turno 10 … plataforma 80)
    section: 'Automatización',    // grupo de la barra lateral
    nav: 'Alarma C-07',           // texto corto en la barra lateral
    title: 'Alarma C-07 en ejecución', // migas de pan y <title>
    icon: 'thermometer',          // App.icons() lista los disponibles
    badge: (state) => (state.outcomes.alarma ? null : { text: '1', tone: 'crit' }), // opcional
    presenter: {                  // panel «Modo presentador» (tecla P)
      say: ['Frase 1 para Manuel.', 'Frase 2.'],        // o (state) => [...]
      next: 'Pulsar «Ejecutar workflow».'               // o (state) => '...'
    },
    render(root, ctx) {
      root.innerHTML = String(html`
        ${App.pageHead({ title: 'Cámara C-07 · excursión de temperatura', meta: [{ icon: 'clock', text: 'Alarma 05:50' }] })}
        ${App.card({ title: 'Lotes afectados', body: '…' })}`);
      ctx.on('click', '[data-action="aprobar"]', (e, el) => { /* … */ });
    },
    onLeave(ctx) { /* opcional: limpiar algo propio */ }
  });
})();
```

Reglas del ciclo de vida:
- `render(root, ctx)` debe ser **idempotente**: pinta la vista completa a partir de `ctx.local` / `App.state`. Al volver a la escena o recargar la página debe reaparecer el mismo estado (sin repetir animaciones ya terminadas).
- Las animaciones largas actualizan **solo su contenedor** (`ctx.$('#mi-zona').innerHTML = …`). Al terminar: guarda el resultado con `ctx.setLocal()` y llama a `ctx.rerender()`.
- Si el usuario cambia de escena a mitad de un flujo, `ctx.sleep()` deja de resolverse y `reasoningStream` se detiene: el `await` se queda parado y no hay errores. Tras `await`, comprueba `if (!ctx.alive()) return;` antes de tocar estado.
- Un error en `render` no rompe la consola: el núcleo muestra «Esta vista no se ha podido cargar» y lo escribe en consola (la prueba de humo lo detecta).

## 2. `ctx` (segundo argumento de `render`)

| Miembro | Uso |
|---|---|
| `ctx.id`, `ctx.params` | id de la escena y parámetros del hash (`#reclamacion/L26-231-FUS-GUI-01` → `['L26-231-FUS-GUI-01']`) |
| `ctx.data` | `window.CN_DATA` |
| `ctx.local` / `ctx.setLocal(patch)` | estado persistente **propio** de la escena (`App.state.scenes[id]`) |
| `ctx.state` | `App.state` completo (lectura) |
| `ctx.on(tipo, selector, fn(e, el))` | delegación de eventos en la raíz de la escena; se limpian en cada `rerender` |
| `ctx.$(sel)`, `ctx.$$(sel)` | consultas dentro de la escena |
| `ctx.rerender()` | vuelve a ejecutar `render` (tras guardar estado) |
| `await ctx.sleep(ms)`, `ctx.after(ms, fn)`, `ctx.every(ms, fn)` | temporizadores ligados a la visita (se cancelan al salir). `sleep`/`after` respetan el ritmo «Rápidas» del presentador |
| `ctx.signal`, `ctx.alive()` | `AbortSignal` de la visita y comprobación de vida |
| `ctx.vars` | objeto temporal de la visita (no persiste), p. ej. `ctx.vars.busy` |
| `ctx.presenter({ say, next })` | cambia las notas del presentador durante un flujo; `ctx.presenter(null)` vuelve a las de la escena |
| `ctx.audit`, `ctx.toast`, `ctx.modal`, `ctx.go` | atajos de `App.*` |

Eventos que no burbujean: usa `focusin`/`focusout` en lugar de `focus`/`blur`. `input`, `change`, `submit`, `click`, `keydown` y los propios `tabchange`/`segchange` sí funcionan con `ctx.on`.

## 3. Estado, contratos compartidos y auditoría

- `App.state` se guarda en `localStorage['cn-demo-v2']` y se borra con «Reiniciar demo» (o `?reset=1` en la URL). Forma: `{ v, clock, audit, seq, workflows, outcomes, scenes }`.
- `App.set(patch)` fusiona en el primer nivel; `App.update(fn)` para mutaciones: `App.update((s) => s.workflows.push(wf))`. Nunca toques `state.audit` directamente.
- **Contrato `App.state.workflows`** (lo escribe `workflow`, lo lee `alarma` y la bandeja de `turno`): lista de objetos
  `{ id: 'wf-…', name, version: 'v1', status: 'published' | 'draft', template: 'cadena-frio' | 'reclamacion' | 'parte-diario', trigger: { system: 'Galileo/SCADA', type: 'temperatura', threshold: -18, minutes: 15, label }, steps: [{ id, label, kind, systems: [] }], approver, params: {}, publishedAt }`.
  `turno` detecta el de cadena de frío si `name`/`template`/`trigger.type` contienen «frío», «temperatura», «cámara» o «excursión» y `status !== 'draft'`.
- **Contrato `App.outcome(id, {status, label})`**: cuando una escena resuelve su caso, publica el resultado para que la bandeja de `turno` lo refleje. Estados: `'approved'`, `'rejected'`, `'done'`, `'sent'`. Ejemplos: `App.outcome('alarma', { status: 'approved', label: 'Bloqueo BLQ-2026-0917 aprobado' })`, `App.outcome('reclamacion', { status: 'sent', label: 'Respuesta enviada al cliente' })`. `App.outcome('alarma')` lo lee; `App.outcome('alarma', null)` lo borra.
- `App.seq('NC-2026-', 418)` → `'NC-2026-0418'`, luego `0419`… (persistente; usa ids fijos del SPEC cuando existan: `BLQ-2026-0917`, `NC-2026-0418`).
- `App.audit(acción, detalle, actor?)` añade una entrada append-only `{ id, at, action, detail, actor, scene }` visible en «Registro de auditoría» (barra lateral) y exportable a JSON. Actor por defecto: «Responsable de Calidad de turno»; para agentes usa `'Prodigy · agente <nombre>'`. Registra **cada acción del usuario** (aprobar, rechazar con motivo, editar, publicar, enviar) y los efectos simulados de los agentes. `downloadFile`, `printableReport` y `traceModal` ya auditan solos.
- `App.auditTable(entries?, {limit})` pinta la tabla del registro; `App.openAuditLog()`, `App.exportAudit()`.

## 4. Reloj de planta y formato

- `App.now()` → `Date` en hora de planta (campos UTC = hora de Fustiñana). Arranca el **martes 29/09/2026 07:05** y avanza en tiempo real. `App.nowISO()` → `'2026-09-29T07:05:12'`; `App.clock()` → `'07:05'`.
- `App.fmt`:

| Función | Ejemplo |
|---|---|
| `num(v, dec?)` | `17600 → '17.600'`, `-13.9 → '−13,9'`, `num(3, 1) → '3,0'` (sin `dec`: hasta 2 decimales) |
| `kg(v)`, `t(v)`, `pct(v)` | `'28.592 kg'`, `'24,6 t'`, `'4,8 %'` |
| `temp(v, dec?)` | `'−13,9 °C'`, `'−18 °C'` |
| `eur(v)`, `usd(v)` | `'49.837,60 €'`, `'0,04 USD'` |
| `dur(seg)`, `ms(ms)` | `dur(112) → '1 min 52 s'`, `dur(3000) → '50 min'`, `ms(640) → '640 ms'`, `ms(10570) → '10,6 s'` |
| `date(v, opts?)` | `'2026-09-29' → '29/09/2026'`, `'2026-09-29T05:50' → '29/09/2026 05:50'`, `date('2026-09-29', '05:50')` |
| `time(v, seg?)`, `dayMonth(v)` | `'05:50'`, `'07:05:12'`, `'29/09'` |
| `weekday(v)`, `dateLong(v)` | `'martes'`, `'martes, 29 de septiembre de 2026'` |
| `days(a, b)` | días entre fechas (`days('2026-08-18', '2026-09-29') → 42`) |
| `plural(n, uno, varios)`, `list(arr)`, `cap(s)` | `'38 palés'`, `'a, b y c'`, `'Piedra'` |
| `minus(texto)` | cambia el guion por el signo menos en textos de `CN_DATA` (`'-18 °C' → '−18 °C'`) |
| `text(texto)` | **para cualquier texto libre de `CN_DATA`** (notas, resúmenes, eventos): signo menos y fechas ISO a dd/mm/aaaa (`'anotado el 2026-08-18' → 'anotado el 18/08/2026'`) |

## 5. HTML seguro

- `` App.html`…${valor}…` `` (alias `App.h`) escapa todo lo interpolado **salvo** lo que ya es seguro (lo que devuelven los componentes y `App.raw`). Arrays se concatenan. `null`, `false`, `true` no pintan nada.
- `App.raw(str)` marca HTML de confianza (solo cadenas tuyas, nunca texto de datos). `App.esc(str)` escapa. `App.attrs({ 'data-id': x, hidden: true })` compone atributos.
- Asigna así: `root.innerHTML = String(html\`…\`)`.

## 6. Componentes

Todos devuelven HTML seguro para interpolar en `html```. Los interactivos funcionan por delegación (no hay que enlazar nada) y emiten eventos que escuchas con `ctx.on`.

**Cabecera y botones**
```js
App.pageHead({ title, meta: ['texto', { icon: 'clock', text: 'Alarma 05:50' }], desc, actions: html`…` })
App.button({ label: 'Aprobar bloqueo', icon: 'check', variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ok', size: 'sm' | 'lg', attrs: { 'data-action': 'aprobar' }, disabled })
```
Clases directas: `btn btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`, `btn-sm`, `icon-btn`, `link-btn`.

**KPI, cifras, chips, sistemas y lotes**
```js
App.kpi({ label: 'Palés en C-07 durante la excursión', value: 38, unit, sub: '6 lotes · 28.592 kg', icon: 'pallet', tone: 'crit' | 'warn' | 'ok', href: '#alarma' /* o action: 'x' */ })
// contenedor: <div class="kpis">…4 kpi…</div>
App.stats([{ label: 'Palés bloqueados', value: 38, tone: 'crit' }, …])
App.chip('critical')            // Crítico · también 'ok', 'warning', 'pending', 'waiting', 'approved', 'rejected', 'blocked', 'hold', 'draft', 'published', 'created', 'updated', 'planned', 'shipped', 'review', 'evaluate', 'running', 'pcc'
App.chip('pending', 'Vence el 02/10')          // texto propio
App.chip({ tone: 'brand', icon: 'git-branch', label: 'v1 · borrador' })
App.sys('SAP QM')               // insignia de sistema; tooltip «SAP QM · conector de demostración»
App.sysList(['SAP', 'MES Mapex', 'Mecalux Easy WMS'])
App.lotTag('L26-231-FUS-GUI-01') // abre la traza del lote al pulsar
```
Nombres de sistema con icono propio: `SAP`, `SAP QM`, `MES Mapex`, `Siemens Opcenter APS`, `Mecalux Easy WMS` (o `Easy WMS`), `SCADA Galileo` (o `Galileo/SCADA`), `Elara`, `Microsoft Teams`, `Outlook`, `Microsoft 365`, `GMAO`, `Prodigy`, `Modelo de lenguaje`, `Procedimientos`.

**Tarjeta, tabla, pestañas, segmentado**
```js
App.card({ title, sub, icon, iconTone: 'crit', actions: html`…`, body, footer, flush: true /* sin relleno, para tablas */, tone: 'crit' | 'warn' | 'ok' | 'brand', id })
App.table({
  cols: [{ label: 'Lote', render: (r) => html`<span class="code">${r.lot}</span><span class="sub">${r.product}</span>` },
         { label: 'Palés', key: 'pallets', num: true }, { label: 'Kg', render: (r) => fmt.num(r.kg), num: true }],
  rows, dense: true, clickable: true, rowAttrs: (r) => ({ 'data-lot': r.lot }), rowClass: (r) => 'tone-crit',
  empty: 'Sin datos', stack: true /* en móvil se apila en tarjetas (por defecto) */
})
App.tabs({ id: 'c07', flush: true, tabs: [{ id: 'temp', label: 'Temperatura', count: 6, body }] })   // emite 'tabchange' {id, tab}
App.segmented({ name: 'filtro', value: 'all', options: [{ value: 'all', label: 'Todos', count: 11 }, { value: 'critical', label: 'Críticos', tone: 'crit' }] })
ctx.on('segchange', '[data-seg="filtro"]', (e) => e.detail.value)
```
En celdas: `.sub` (segunda línea gris), `.code` (IDs en monoespaciada), `.strong`, `.t-crit|t-warn|t-ok`.

**Listas, líneas de tiempo, avisos, vacíos, clave-valor**
```js
App.list([{ icon: 'mail', tone: 'warn', title, meta: ['26/09 10:14', App.sys('Elara')], body, side: html`…`, done: false }])
App.timeline({ items: [{ time: '05:50', timeSub: 'a 06:40', title, text, tone: 'crit' | 'warn' | 'ok' | 'brand', meta: html`…` }], compact: true })
App.callout({ tone: 'brand' | 'warn' | 'crit' | 'ok', icon, title, body, actions })
App.empty({ icon: 'search', title: 'Sin resultados', text, actions })
App.kv([['Lote', App.lotTag('L26-261-FUS-GUI-03')], ['Palés', '8']], { cols: 2 })
```

**Grafo del workflow**
```js
App.planGraph({
  nodes: [{ id: 't', kind: 'trigger', label: 'Temperatura de aire > −18 °C', sub: 'durante más de 15 min', systems: ['SCADA Galileo'], icon: 'thermometer' },
          { id: 'a1', label: 'Monitor cadena de frío', systems: ['SCADA Galileo'], icon: 'activity' },          // kind por defecto: 'agent'
          { id: 'h', kind: 'approval', label: 'Aprobación de Calidad', sub: 'Responsable de Calidad de turno' },
          { id: 'o', kind: 'output', label: 'Incidencia y aviso', systems: ['Elara', 'Teams'] }],
  edges: [['t', 'a1'], ['a1', 'h'], { from: 'h', to: 'o', label: 'aprobado' }],
  status: { t: 'done', a1: 'active' },   // pending | active | done | waiting | error | rejected | skipped
  layout: 'auto'                          // por defecto: se ajusta al ancho real (vertical si no cabe); 'lr' | 'tb' fijos
})
App.planGraph.set(ctx.root, { a1: 'done', h: 'waiting' })   // cambia estados sin repintar (las aristas se recalculan)
```
Aristas: verde continua si ambos nodos están hechos, verde discontinua animada hacia el nodo activo o en espera. Úsalo a ancho completo cuando tenga más de 4 nodos.

**Registro de razonamiento**
```js
const run = App.reasoningStream(ctx.$('#log'), [
  { agent: 'Trazabilidad', system: 'Mecalux Easy WMS', action: 'Palés en C-07 entre 05:50 y 06:40', result: '38 palés de 6 lotes', ms: 610, tone: 'crit' | 'warn' | 'ok' },
  …
], { title: 'Ejecución · workflow v1', signal: ctx.signal, onStep: (step, i) => App.planGraph.set(ctx.root, { … }), maxHeight: 360, start: App.nowISO() });
const res = await run.done;          // { ms: suma de ms simulados, steps }
if (!ctx.alive()) return;
// run.accelerate(), run.finish(), run.stop()
App.reasoningStream(el, steps, { instant: true })   // vuelve a pintar una ejecución terminada (al recargar)
```
Cada línea muestra hora simulada, agente, insignia de sistema, acción, resultado y duración. Incluye los botones «Acelerar» y «Mostrar todo». `ms` es la latencia simulada que se muestra; la espera en pantalla se limita a 0,26–1,5 s por paso (usa `wait` para forzarla).

**Aprobación humana**
```js
App.approvalCard({
  id: 'blq-c07', status: 'pending' | 'approved' | 'rejected',
  title: 'Bloqueo de calidad · 38 palés en C-07', summary, approver: D.roles.quality_shift, policy: 'PNT-CAL-012 · PNT-CAL-015',
  scope: [{ label: 'Palés en C-07', value: '38 palés · 6 lotes', status: 'blocked', chip: 'Bloquear' }, { label: 'Mismos lotes en silos', value: '47 palés', status: 'evaluate' }],
  effects: ['SAP QM: lotes con bloqueo de calidad', 'Easy WMS: 38 palés inmovilizados'],
  editable: true, approveLabel: 'Aprobar bloqueo', rejectLabel: 'Rechazar', editLabel: 'Editar alcance',
  decidedBy, decidedAt: App.nowISO(), comment, doneActions: html`…botones tras decidir…`
})
ctx.on('click', '[data-approval="approve"]', …)   // también "reject" y "edit"; data-approval-id = id
const motivo = await App.promptText({ title: 'Rechazar la propuesta', label: 'Motivo', required: true, confirmLabel: 'Rechazar' });
```
Comportamiento obligatorio (SPEC §1.8): **rechazar no aplica ninguna acción** (la tarjeta tacha los efectos) y queda en auditoría con su motivo.

**Documento controlado y correo**
```js
App.docPreview({ code: 'PNT-CAL-012', title, version: '4', date: '2026-03-12', owner: 'Calidad de planta',
  sections: [{ id: '4', heading: '4. Criterio de bloqueo', text: 'párrafos separados por línea en blanco', list: ['…'] }],
  highlight: { section: '4', text: 'durante más de 15 min', tone: 'brand' } })   // resalta y sombrea la sección citada
App.emailView({ headers: D.complaint.headers, text: D.complaint.body, attachments: ['foto_1.jpg'],
  highlights: [{ text: 'L26-231-FUS-GUI-01', label: 'Lote', tone: 'brand' }, { text: 'stone of approximately 8 mm', label: 'Defecto', tone: 'crit' }] })
App.highlightText(texto, [{ text, label, tone, all: true }])   // el mismo resaltado en cualquier texto
```
Citas en respuestas: `<button type="button" class="cite" data-cite="1">1</button>` (clase `.cite`, `.is-active` para la seleccionada); la escena escucha el clic con `ctx.on('click', '[data-cite]', …)` y muestra la fuente con `docPreview({ highlight })`.

**Gráfica**
```js
App.lineChart({ series: D.chamber_c07_series,              // [{time, temp_c}] o {x, y}/{time, value}; accesores x/y opcionales
  threshold: { value: -18, label: 'Límite −18 °C', legend: 'Límite −18 °C · 50 min por encima' },
  critical: { value: -15 }, peak: { x: '06:25', y: -13.9 } /* o true */, last: true,
  xTicks: ['05:00', '05:30', '06:00', '06:30', '07:00'], yTicks: [-24, -21, -18, -15, -12],
  annotations: [{ x: '05:50', label: 'Alarma 05:50' }], bands: [{ from: '05:40', to: '06:05', label: 'Desescarche EV-07', tone: 'warn' }],
  height: 240, unit: '°C', seriesLabel: 'Aire (TT-C07-01)', shadeLabel: 'Excursión 05:50–06:40' })
```
Sin `width` se pinta al ancho real del contenedor y se repinta al cambiar de tamaño (texto siempre legible). Solo usa relleno en la zona de excursión.

## 7. Modal, confirmación y avisos

```js
const m = App.modal({ title, kicker: 'Trazabilidad', size: 'sm' | 'md' | 'lg' | 'xl', body: html`…`,
  actions: [{ label: 'Descargar', icon: 'download', variant: 'ghost', left: true, close: false, onClick: (api) => { … return false; } },
            { label: 'Cerrar', variant: 'primary' }], onClose: () => {} });
m.setBody(html`…`); m.close();
if (await App.confirm({ title: 'Publicar workflow', body: html`<p>…</p>`, confirmLabel: 'Publicar' })) { … }
App.toast('Bloqueo aplicado', { tone: 'ok' | 'warn' | 'crit' | 'info', icon, action: { label: 'Deshacer', onClick } });
```
Solo hay un modal a la vez (abrir otro sustituye al anterior). `Esc` y el fondo lo cierran.

## 8. Descargas, informes y trazabilidad

```js
App.downloadFile('respuesta-UKC-44718.eml', 'message/rfc822', texto)   // audita y avisa
App.csv({ cols: [{ label: 'SSCC', key: 'sscc' }, { label: 'Palé', value: (r) => `${r.n}/${r.of}` }], rows })  // «;» + BOM: se abre bien en Excel en español
App.printableReport({ title: 'Informe de incidencia · Cámara C-07', subtitle, code: 'INC-…', filename: 'informe-incidencia-c07',
  meta: [['Planta', 'Fustiñana (FUS)'], ['Aprobado por', D.roles.quality_shift]],
  sections: [{ heading: '1. Resumen', text }, { heading: '2. Lotes', table: { cols: [{ label: 'Lote', key: 'lot' }, { label: 'Palés', key: 'pallets', num: true }], rows } },
             { heading: '3. Acciones', list: ['…'] }, { heading: '4. Datos', kv: [['Pico', '−13,9 °C']] }, { heading: 'Nota', callout: '…' }],
  signatures: [{ role: D.roles.quality_shift, note: 'Aprobado' }] })
App.traceModal('L26-261-FUS-GUI-03')   // traza atrás/adelante, SSCC, calidad; lote desconocido → «No encuentro el lote … en SAP/Mapex»
App.lot('L26-261-FUS-GUI-03')          // datos del lote o null (nunca inventes uno)
App.copyText(texto)
```
`printableReport` abre una vista previa con «Guardar como PDF» (diálogo del navegador), «Abrir en pestaña nueva» y «Descargar HTML». Llámalo directamente desde el clic.

## 9. Atributos declarativos (sin JavaScript)

| Atributo | Efecto |
|---|---|
| `data-go="alarma"` | navega a la escena (cierra el modal si lo hay); admite `data-go="reclamacion/L26-231-FUS-GUI-01"` |
| `data-lot="L26-…"` | abre la traza del lote (también en filas de tabla) |
| `data-open-audit` | abre el registro de auditoría |
| `data-open-about` | abre «Acerca de esta demo» |
| `data-copy="texto"` | copia al portapapeles |

## 10. Presentador y navegación

- Tecla **P** (o botón «Presentador»): panel lateral con «Qué decir», «Siguiente clic», escena anterior/siguiente, cronómetro y ritmo de animaciones (Normal/Rápidas). **← →** cambian de escena (salvo al escribir o dentro de pestañas y segmentados).
- `presenter.say` y `presenter.next` pueden ser funciones de `state` para cambiar según el avance; durante un flujo usa `ctx.presenter({ next: '…' })`.
- `App.go(id, ...params)`, `App.next()`, `App.prev()`, `App.scenes()`, `App.current()`, `App.presenter.open()/close()/toggle()`.
- URL: `?reset=1` arranca limpio; `?presenter=1` abre el panel.

## 11. CSS disponible (assets/css/app.css)

- Maquetación: `.grid` + `.cols-2|cols-3|cols-4|cols-7-5|cols-5-7|cols-8-4|cols-4-8` (se apilan en tabletas/móvil), `.kpis`, `.stack` (`.stack-sm`, `.stack-lg`), `.row` (`.row-nowrap`, `.between`), `.spacer`, `.section` (margen superior 24 px), `.mt-1…mt-8`, `.mb-2`, `.mb-4`, `.divider`.
- Texto: `.h2`, `.h3`, `.muted`, `.slate`, `.small`, `.xs`, `.strong`, `.mono`, `.code`, `.num`, `.nowrap`, `.truncate`, `.t-crit|t-warn|t-ok|t-brand`, `.prose` (párrafos y listas).
- Formularios: `.field` > `.label` + `.input` | `.select` | `.textarea` + `.hint`; `.input-group` + `.input-addon` (unidades); `.check`.
- Tarjetas: `.card`, `.card.flat` (sin sombra), `.card-body`, `.card-foot`; tonos `tone-crit|warn|ok|brand` (filete a la izquierda).
- Espaciado siempre en múltiplos de 4 px. Radios 6–8 px. Nada de sombras grandes ni fondos degradados.
- CSS propio de una escena: `App.style('alarma', '.alarma-mapa { … var(--cn-green) … }')`.

## 12. Iconos

`App.icon('thermometer')`, `App.icon('check', 16)`, `App.icon('x', { size: 14, title: 'Cerrar' })`. Lista completa: `App.icons()`. Incluye, entre otros: thermometer, snowflake, pallet, truck, factory, shield-check, shield, file-text, search, workflow, git-branch, check, x, clock, alert-triangle, user-check, database, link, download, upload, play, pause, send, mail, list-checks, book-open, layers, map-pin, scale, repeat, cpu, lock, unlock, eye, edit, chevron-right/left/down/up, arrow-right/left, external-link, calendar, bar-chart, activity, box, leaf, globe, menu, info, printer, rotate-ccw, presentation, message-square, wrench, ticket, bell, filter, copy, plus, minus, fast-forward, sliders, server, cloud, key, gauge, droplet, door, flask, building, history, check-circle, x-circle, alert-circle, clipboard, hash, circle, circle-dot, keyboard, users, user, route, maximize, more-horizontal, inbox, tag, barcode, warehouse, save, euro, version, fan.

## 13. Pruebas

```bash
python3 -m http.server 8805 --directory site           # en segundo plano
node site/tests/smoke.cjs 8805                          # todas las escenas, escritorio y móvil, sin errores ni scroll horizontal
node site/tests/smoke.cjs 8805 --only=alarma            # solo tu escena
node site/tests/turno.cjs 8805                          # ejemplo de prueba funcional de escena
# galería de componentes: http://127.0.0.1:8805/tests/gallery.html
```
Capturas en `site/tests/shots/<id>-*.png` (a 1512×982 y 375×812).

## 14. Lista de comprobación de una escena

1. Todas las cifras salen de `CN_DATA` (o se calculan de él) y coinciden con las del resto de escenas.
2. Textos en español de España, con tildes; títulos descriptivos; verbos de acción concretos en los botones.
3. Ninguna mención a «ilustrativo», «simulado», «IA», emojis o caracteres usados como iconos.
4. Cada acción del usuario se registra con `App.audit`; los resultados compartidos con `App.outcome`.
5. Rechazar no aplica nada; un lote desconocido no inventa datos; una pregunta sin fuente dice «No hay evidencia suficiente en los procedimientos indexados».
6. Recargar la página conserva el estado; «Reiniciar demo» lo borra.
7. `presenter.say` y `presenter.next` escritos para Manuel.
8. `smoke.cjs` limpio a 1512×982 y 375×812.
9. Coste por petición: el SPEC §4.3 lo muestra como «0,04 € (estimación)», mientras que el brief de reunión recuerda que Prodigy contabiliza el coste en USD. Si lo muestras, di siempre «estimación»; `App.fmt.usd` existe por si se decide mostrarlo en USD.
