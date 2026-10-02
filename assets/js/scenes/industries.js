/* Shared presentation components; deterministic, synthetic scenario execution. */
(function () {
  'use strict';
  const I = window.DEMO_INDUSTRY;
  if (!I || !window.App) return;
  const P = I.profile, L = I.text, B = I.bilingual;
  const T = (es, en) => L(B(es, en));
  const { html, fmt } = App;
  const btn = (label, action, variant = 'primary', icon = 'arrow-right', disabled = false) => App.button({ label, icon, variant, disabled, attrs: { 'data-sector-action': action } });
  const title = (s, desc, actions) => App.pageHead({ title: s, desc, meta: [P.company, L(P.site)], actions });
  const show = (root, content) => { root.innerHTML = String(content); };
  const word = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const canonical = n => Number(n).toString();
  function chrome() {
    const select = document.getElementById('industry-select');
    if (select) {
      select.innerHTML = Object.values(I.profiles).map(p => `<option value="${App.esc(p.id)}"${p.id === I.id ? ' selected' : ''}>${App.esc(L(p.label))}</option>`).join('');
      select.previousElementSibling.textContent = T('Industria', 'Industry');
      select.addEventListener('change', () => {
        const url = new URL(location.href); url.searchParams.set('industry', select.value); url.searchParams.delete('reset');
        location.assign(url.href);
      });
    }
    const setText = (selector, value) => { const el = document.querySelector(selector); if (el) { el.dataset.noTranslate = ''; el.textContent = value; } };
    setText('.ws-name', P.company); setText('.ws-sub', L(P.site)); setText('.ws-avatar', P.initials);
    setText('.crumb-root', P.company); setText('.me-name', L(P.role)); setText('.me-sub', L(P.site)); setText('.me-avatar', P.initials);
    const clock = document.querySelector('.clock'); if (clock) clock.title = L(P.site);
    document.querySelector('meta[name="description"]').content = T('Demo de Prodigy con selector de industrias. Datos ficticios y acciones simuladas en el navegador.', 'Prodigy demo with an industry selector. Fictional data and actions simulated in the browser.');
  }
  chrome();
  I.openAbout = () => App.modal({ title: T('Acerca de esta demo', 'About this demo'), kicker: `Prodigy · ${P.company}`, size: 'md', body: html`<div class="stack">
    <div><h3 class="h3">${T('Qué estás viendo', 'What you are viewing')}</h3><p>${T('Una simulación estática con cinco industrias. Los escenarios nuevos usan empresas ficticias; los datos y procedimientos de Congelados también son sintéticos.', 'A static simulation with five industries. New scenarios use fictional companies; Frozen Food records and procedures are synthetic too.')}</p></div>
    <div><h3 class="h3">${T('Cómo funciona', 'How it works')}</h3><p>${T('Esta página ejecuta reglas y respuestas preparadas en JavaScript. No llama a un LLM ni al backend de Prodigy. Los sistemas del escenario son conectores representados, sin acceso real.', 'This page runs prepared JavaScript rules and responses. It does not call an LLM or the Prodigy backend. Scenario systems are represented connectors, without real access.')}</p></div>
    <div><h3 class="h3">${T('Aprobaciones y datos', 'Approvals and data')}</h3><p>${T('Las decisiones quedan en este navegador, separadas por industria. Rechazar no aplica los efectos propuestos. Reiniciar borra solo la industria seleccionada.', 'Decisions stay in this browser, separated by industry. Rejecting applies none of the proposed effects. Reset clears only the selected industry.')}</p></div>
    <div><h3 class="h3">${T('Para llevarlo a Prodigy', 'To implement it in Prodigy')}</h3><p>${T('Hay que configurar agentes, Routines, permisos, datos y conectores; integrar la interfaz y validar el generador de texto con el modelo elegido. Una clave de IA por sí sola no completa esa integración.', 'Configure agents, Routines, permissions, data and connectors; integrate the interface and validate the text generator with the selected model. An AI key alone does not complete that integration.')}</p></div>
    <p class="small muted">v2.2 · 02/10/2026</p></div>`, actions: [{ label: T('Manual (PDF · ESP)', 'Manual (PDF · ESP)'), variant: 'secondary', onClick: () => window.open('manual.pdf', '_blank', 'noopener') }, { label: T('Cerrar', 'Close'), variant: 'primary' }] });
  if (I.id === 'frozen_food') return;

  const series = Array.from({ length: 13 }, (_, i) => ({ time: `${String(Math.floor((350+i*5)/60)).padStart(2,'0')}:${String((350+i*5)%60).padStart(2,'0')}`, value: i < 4 ? P.threshold * .73 + i * P.threshold * .015 : i < 10 ? P.threshold + (P.peak - P.threshold) * [0.45, .7, .9, 1, .8, .6][i - 4] : P.threshold * .85 }));
  const baseline = () => ({ id: `preset-${I.id}`, template: 'event', name: P.event, version: 'v1', threshold: P.threshold, minutes: P.minutes, status: 'published', preset: true });
  const activeWorkflow = () => App.state.workflows.slice().reverse().find(w => w.template === 'event' && w.status === 'published') || baseline();
  const triggerDuration = threshold => {
    let current = 0, max = 0;
    for (const r of series) { current = r.value > threshold ? current + 5 : 0; max = Math.max(max, current); }
    return max;
  };
  const qualifies = w => triggerDuration(w.threshold) > w.minutes;
  const refButton = () => html`<button type="button" class="link-btn code" data-sector-ref>${P.ref}</button>`;
  const graph = (status = 'idle', wf = activeWorkflow(), kind = 'event') => {
    const done = status === 'approved', ready = status === 'pending' || status === 'rejected';
    const nodes = [
      { id: 'trigger', kind: 'trigger', label: kind === 'case' ? L(P.caseTitle) : kind === 'daily' ? T('Parte diario', 'Daily report') : L(P.event), sub: kind === 'case' ? T('Correo del cliente', 'Customer email') : kind === 'daily' ? '07:05' : `${L(P.metric)} > ${fmt.num(wf.threshold)} ${P.unit} · > ${wf.minutes} min`, systems: [P.systems[0]], icon: P.icon },
      { id: 'diagnose', label: L(P.agents[0]), sub: T('Datos y procedimiento', 'Data and procedure'), systems: [P.systems[0]], icon: 'activity' },
      { id: 'trace', label: L(P.agents[1]), sub: P.ref, systems: [P.systems[1], P.systems[2]], icon: 'git-branch' },
      { id: 'human', kind: 'approval', label: L(P.role), sub: T('Revisión del alcance', 'Scope review') },
      { id: 'output', kind: 'output', label: kind === 'case' ? T('Respuesta revisada', 'Reviewed reply') : kind === 'daily' ? T('Parte revisado', 'Reviewed report') : L(P.agents[2]), sub: T('Registro y propuesta', 'Record and proposal'), systems: [P.systems[2], P.systems[4]] }
    ];
    return App.planGraph({ nodes, edges: [['trigger','diagnose'],['diagnose','trace'],['trace','human'],['human','output']], status: { trigger: done || ready ? 'done' : 'pending', diagnose: done || ready ? 'done' : 'pending', trace: done || ready ? 'done' : 'pending', human: done ? 'done' : status === 'rejected' ? 'rejected' : ready ? 'waiting' : 'pending', output: done ? 'done' : status === 'rejected' ? 'skipped' : 'pending' } });
  };
  const chart = (wf = activeWorkflow()) => App.lineChart({ series, threshold: { value: wf.threshold, label: `${T('Umbral', 'Threshold')} ${fmt.num(wf.threshold)} ${P.unit}` }, peak: true, last: true, height: 240, unit: P.unit, seriesLabel: `${P.entity} · ${L(P.metric)}` });
  const source = (index = 0) => {
    const d = P.docs[index];
    return App.docPreview({ code: d.code, title: L(d.title), version: '1', date: '2026-09-29', owner: L(P.role), sections: [{ id: '1', heading: T('1. Procedimiento del escenario', '1. Scenario procedure'), text: L(d.text) }], highlight: { section: '1' } });
  };
  const docModal = index => App.modal({ title: L(P.docs[index].title), kicker: `${P.docs[index].code} · ${T('Documento sintético', 'Synthetic document')}`, size: 'lg', body: source(index), actions: [{ label: T('Cerrar', 'Close'), variant: 'primary' }] });
  const refs = index => html`<button type="button" class="cite" data-sector-cite="${index}">${index + 1}</button>`;
  const bindDocs = ctx => ctx.on('click', '[data-sector-cite]', (_, el) => docModal(Number(el.dataset.sectorCite)));
  const ledger = () => App.table({ cols: [{ label: T('Estado / ubicación', 'Status / location'), render: r => L(r[0]) }, { label: L(P.unitCount), render: r => fmt.num(r[1]), num: true }], rows: P.balance });
  const decisionStatus = id => (App.outcome(id) || {}).status;
  function exportReport(scene, name, sections) {
    App.printableReport({ code: `REG-${I.id.toUpperCase()}-${scene.toUpperCase()}`, title: name, meta: [[T('Empresa', 'Company'), P.company], [T('Referencia', 'Reference'), P.ref], [T('Escenario', 'Scenario'), T('Datos ficticios · acciones simuladas', 'Fictional data · simulated actions')]], sections, signatures: [{ role: L(P.role), note: T('Revisión del escenario', 'Scenario review') }] });
  }
  const presenter = (say, next) => ({ say: [say, T('Los datos y las acciones son simulados. La integración con Prodigy se valida en un piloto.', 'Data and actions are simulated. Prodigy integration is validated in a pilot.')], next });
  function register(id, order, section, nav, icon, notes, render) { App.scene({ id, order, section, nav, title: nav, icon, presenter: notes, render }); }

  register('turno',10,T('Operación','Operations'),T('Resumen de operación','Operations overview'),'bar-chart',presenter(L(P.benefit),T('Pulsa el área en alerta o abre «De palabras a workflow».','Click the alert area or open “From words to workflow”.')), (root,ctx) => {
    const st = decisionStatus('alarma');
    show(root,html`${title(T('Resumen de operación','Operations overview'),L(P.benefit),btn(T('Preparar informe','Prepare report'),'report','secondary','file-text'))}
      <div class="kpis">${P.kpis.map((k,i)=>App.kpi({ label:L(k[0]),value:L(k[1]),icon:['activity','bar-chart','box','clipboard'][i],tone:i===2?'warn':undefined,sub:i===2?P.ref:T('Datos del escenario','Scenario data') }))}</div>
      <div class="grid cols-7-5"><div class="stack">${App.card({ title:T('Mapa de operación','Operations map'),sub:L(P.site),icon:'map-pin',body:html`<div class="sector-map">${P.map.map((z,i)=>html`<button class="sector-zone ${i===2?'alert':''}" type="button" data-zone="${i}">${App.icon(i===2?P.icon:['box','factory','activity','shield-check','database','truck'][i],22)}<span class="zone-label">${L(z)}</span><span class="zone-sub">${i===2?App.chip(st==='approved'?'approved':st==='rejected'?'rejected':'critical'):T('Datos disponibles','Data available')}</span></button>`)}</div><div class="sector-map-note">${App.icon('database',14)}${T('Selecciona un área para ver la evidencia y sus sistemas.','Select an area to view evidence and systems.')}</div>` })}
        ${App.card({ title:L(P.metric),icon:'activity',body:chart() })}</div>
      <div class="stack">${App.card({ title:T('Bandeja de decisiones','Decision inbox'),icon:'user-check',body:App.list([{icon:P.icon,tone:'crit',title:L(P.event),body:L(P.evidence),side:App.chip(st||'pending'),meta:[P.ref]},{icon:'mail',title:L(P.caseTitle),body:T('Correo recibido · pendiente de revisión','Email received · pending review'),side:App.chip(decisionStatus('reclamacion')||'pending')}]),footer:html`${btn(T('Abrir alerta','Open alert'),'event','primary',P.icon)} ${btn(T('Ver reclamación','View complaint'),'case','secondary','mail')}` })}
        ${App.card({title:T('Registro vinculado','Linked record'),body:html`${App.kv([[L(P.recordLabel),refButton()],[T('Alcance','Scope'),L(P.scope)],[T('Riesgo','Risk'),L(P.risk)]])}${App.sysList(P.systems)}`})}
        ${App.card({title:T('Acciones pendientes de autorización','Actions awaiting authorisation'),body:html`<p>${L(P.effect)}</p><p class="small muted mt-3">${L(P.protected)}</p>`})}</div></div>`);
    ctx.on('click','[data-zone]',(_,el)=>{
      const i=Number(el.dataset.zone);
      App.modal({title:L(P.map[i]),kicker:P.company,size:'md',body:html`${App.kv([[T('Referencia','Reference'),P.ref],[T('Evidencia','Evidence'),i===2?L(P.evidence):L(P.balanceLabel)],[T('Responsable','Owner'),L(P.role)]])}${App.sysList(P.systems)}${i===2?App.callout({tone:'crit',title:L(P.event),body:L(P.risk)}):ledger()}`,actions:[...(i===2?[{label:T('Abrir alerta','Open alert'),variant:'primary',onClick:()=>App.go('alarma')}]:[]),{label:T('Cerrar','Close'),variant:'secondary'}]});
    });
    ctx.on('click','[data-sector-ref]',()=>App.go('retirada'));
    ctx.on('click','[data-sector-action="event"]',()=>App.go('alarma'));
    ctx.on('click','[data-sector-action="case"]',()=>App.go('reclamacion'));
    ctx.on('click','[data-sector-action="report"]',()=>exportReport('turno',T('Parte de operación','Operations report'),[{heading:T('Alerta y evidencia','Alert and evidence'),text:L(P.evidence)},{heading:T('Plan propuesto','Proposed plan'),text:L(P.effect)},{heading:T('Estado de la decisión','Decision status'),text:st||T('Pendiente de revisión','Pending review')} ]));
  });

  function template(kind = 'event') {
    if(kind==='case')return T(`Cuando llegue una reclamación relacionada con ${P.ref}, localiza el registro y contrasta la evidencia.\nPrepara una respuesta con las fuentes y marca lo que falta.\nPide aprobación de ${L(P.role)} antes de comunicarla al cliente.`, `When a complaint related to ${P.ref} arrives, locate the record and cross-check the evidence.\nPrepare a reply with sources and mark missing evidence.\nRequest approval from ${L(P.role)} before communicating with the customer.`);
    if(kind==='daily')return T(`Cada día a las 07:05, consulta ${P.systems[0]}, ${P.systems[1]} y ${P.systems[2]}.\nReúne alertas, registros afectados y decisiones pendientes.\nPrepara el parte y pide revisión de ${L(P.role)} antes de compartirlo.`,`Every day at 07:05, query ${P.systems[0]}, ${P.systems[1]} and ${P.systems[2]}.\nCollect alerts, affected records and pending decisions.\nPrepare the report and request review from ${L(P.role)} before sharing it.`);
    return T(`Cuando ${L(P.metric).toLowerCase()} de ${P.entity} supera ${fmt.num(P.threshold)} ${P.unit} durante más de ${P.minutes} minutos, contrasta las lecturas con ${P.docs[0].code}.\nLocaliza ${P.ref} y prepara el alcance con ${P.systems[1]} y ${P.systems[2]}.\nPrepara el plan de actuación y sus documentos.\nPide aprobación de ${L(P.role)} antes de aplicar cambios.`, `When ${L(P.metric).toLowerCase()} for ${P.entity} exceeds ${fmt.num(P.threshold)} ${P.unit} for more than ${P.minutes} minutes, cross-check readings against ${P.docs[0].code}.\nLocate ${P.ref} and prepare the scope using ${P.systems[1]} and ${P.systems[2]}.\nPrepare the action plan and its documents.\nRequest approval from ${L(P.role)} before applying changes.`);
  }
  function interpret(text) {
    const s=word(text), entity=word(P.entity), ref=word(P.ref);
    const kind=/reclamacion|complaint/.test(s)?'case':/cada dia|every day/.test(s)?'daily':'event';
    if(!s.includes(entity)&&!s.includes(ref)&&!(kind==='daily'&&P.systems.some(x=>s.includes(word(x)))))return {error:T('No hay un disparador conocido de esta industria. Usa una plantilla o incluye la referencia del escenario.','There is no known trigger for this industry. Use a template or include the scenario reference.')};
    let threshold=P.threshold,minutes=P.minutes;
    if(kind==='event'){
      const a=s.match(/(?:supera|superior a|exceeds|above|>)\s*(\d+(?:[.,]\d+)?)/),m=s.match(/(?:mas de|more than)\s*(\d+)\s*(?:minutos|minutes|min)/);
      if(!a||!m)return {error:T('Indica un umbral y una duración: «supera 4.5 mm/s durante más de 15 minutos», por ejemplo.','Specify a threshold and duration, for example “exceeds 4.5 mm/s for more than 15 minutes”.')};
      threshold=Number(a[1].replace(',','.'));minutes=Number(m[1]);
      if(!(threshold>0&&threshold<=1000&&minutes>0&&minutes<=180))return {error:T('El umbral o la duración queda fuera del rango de esta demo.','The threshold or duration is outside this demo’s range.')};
    }
    return {name:kind==='event'?P.event:kind==='case'?P.caseTitle:B('Parte diario de operación','Daily operations report'),template:kind,threshold,minutes,source:text,guardAdded:!(/aprob|approval|review|revision/.test(s)),createdAt:App.nowISO()};
  }
  register('workflow',20,T('Automatización','Automation'),T('De palabras a workflow','From words to workflow'),'git-branch',presenter(T('Escribe el procedimiento, revisa lo que se ha entendido y publica una versión. La demo interpreta solo los escenarios definidos.','Write the procedure, review the interpretation and publish a version. The demo interprets only the defined scenarios.'),T('Pulsa «Crear workflow», revisa los parámetros y publica.','Click “Create workflow”, review the parameters and publish.')), (root,ctx)=>{
    const d=ctx.local.draft,w=App.state.workflows.slice().reverse().find(x=>x.template===(d?d.template:'event'));
    const text=ctx.local.source==null?template(ctx.local.kind):ctx.local.source;
    show(root,html`${title(T('De palabras a workflow','From words to workflow'),T('Un procedimiento, los sistemas implicados y el responsable que autoriza la actuación.','A procedure, the systems involved and the owner who authorises the action.'))}
      <div class="grid cols-7-5"><div class="stack">${App.card({title:T('Describe el procedimiento','Describe the procedure'),icon:'file-text',body:html`<div class="sector-templates">${['event','case','daily'].map((k,i)=>btn([T('Alerta operativa','Operational alert'),T('Reclamación','Complaint'),T('Parte diario','Daily report')][i],`template-${k}`,'secondary','clipboard'))}</div><label for="sector-procedure" class="small muted">${T('Procedimiento en lenguaje natural','Natural-language procedure')}</label><textarea id="sector-procedure" class="sector-editor" spellcheck="true">${text}</textarea><div class="small muted mt-2">${T('Generador de demostración: reglas preparadas para esta industria.','Demo generator: prepared rules for this industry.')}</div>`,footer:btn(T('Crear workflow','Create workflow'),'build','primary','git-branch')})}
      <div id="sector-build-log"></div>${ctx.local.error?App.callout({tone:'warn',title:T('Revisa el procedimiento','Review the procedure'),body:ctx.local.error}):''}
      ${d?App.card({title:T('Del texto a los pasos','From text to steps'),body:html`<div class="sector-source">${d.source.split(/\n+/).map((s,i)=>html`<div><span class="sector-tag">${i===0?T('Disparador','Trigger'):/aprob|approval|review|revision/.test(word(s))?T('Aprobación humana','Human approval'):`${T('Paso','Step')} ${i}`}</span><span class="sector-phrase ${/aprob|approval|review/.test(word(s))?'approval':''}">${s}</span></div>`)}</div>`}):''}</div>
      <div class="stack">${App.card({title:T('Qué ha entendido Prodigy','What Prodigy understood'),icon:'check-circle',body:d?html`${App.list(P.agents.map((a,i)=>({title:L(a),icon:['activity','git-branch','clipboard'][i],body:d.template==='case'?[L(P.caseFinding),L(P.scope),T('Borrador de respuesta con evidencia pendiente','Draft reply with pending evidence')][i]:d.template==='daily'?[T('Consultar fuentes del turno','Query shift sources'),L(P.scope),T('Parte con alertas y decisiones pendientes','Report with alerts and pending decisions')][i]:[L(P.evidence),L(P.scope),L(P.effect)][i],meta:[App.sys(P.systems[i])]})))}${App.callout({tone:'warn',title:T('Aprobación obligatoria','Mandatory approval'),body:L(P.role)})}`:App.empty({icon:'git-branch',title:T('El workflow aparecerá aquí','The workflow will appear here'),text:T('Elige una plantilla y crea el borrador.','Choose a template and create the draft.')})})}
      ${d?App.card({title:T('Comprobaciones del procedimiento','Procedure checks'),body:html`${App.kv([[T('Fuente','Source'),html`${P.docs[d.template==='case'?2:0].code} ${refs(d.template==='case'?2:0)}`],[T('Responsable','Owner'),L(P.role)],[T('Permisos','Permissions'),T('Lectura antes de aprobación','Read before approval')]])}${d.guardAdded?App.callout({tone:'warn',title:T('Guardia añadida','Guard added'),body:T('El texto no indica aprobación. El borrador la exige antes de cualquier cambio.','The text does not specify approval. The draft requires it before any change.')}):''}` }):source(0)}</div></div>
      ${d?html`<div class="mt-4">${App.card({title:L(d.name),sub:T('Borrador revisable · diagrama y parámetros','Reviewable draft · diagram and parameters'),body:html`${graph('idle',d,d.template)}${d.template==='event'?html`<div class="sector-form mt-3"><label>${T('Umbral','Threshold')} (${P.unit})<input type="number" min="0.1" max="1000" step="0.1" data-wf-param="threshold" value="${d.threshold}"></label><label>${T('Duración','Duration')} (min)<input type="number" min="1" max="180" step="1" data-wf-param="minutes" value="${d.minutes}"></label></div><p class="small muted mt-2">${T('Referencia del procedimiento','Procedure reference')}: ${P.threshold} ${P.unit} · ${P.minutes} min · ${P.docs[0].code}</p>`:''}`,footer:html`${w?App.chip('published',`${w.version} · ${T('publicado','published')}`):App.chip('draft')}${btn(T('Publicar workflow','Publish workflow'),'publish','primary','check')}`})}</div>`:''}
      ${w?html`<div class="mt-4">${App.card({title:T('Frases que lo activan','Phrases that trigger it'),body:html`<div class="sector-form"><label for="sector-trigger">${T('Prueba una frase','Test a phrase')}<input id="sector-trigger" value="${L(P.event)}"></label>${btn(T('Probar frase','Test phrase'),'probe','secondary','search')}</div><div id="sector-trigger-result" class="mt-3" aria-live="polite"></div>`,footer:btn(T('Ver la ejecución','View execution'),'go-event','secondary',P.icon)})}</div>`:''}`);
    bindDocs(ctx);
    ctx.on('input','#sector-procedure',(_,el)=>ctx.setLocal({source:el.value,draft:null,error:null}));
    ctx.on('click','[data-sector-action^="template-"]',(_,el)=>{const kind=el.dataset.sectorAction.slice(9);ctx.setLocal({kind,source:template(kind),draft:null,error:null});ctx.rerender();});
    ctx.on('click','[data-sector-action="build"]',async(_,el)=>{
      if(ctx.vars.busy)return;const result=interpret(ctx.$('#sector-procedure').value);
      if(result.error){ctx.setLocal({error:result.error,draft:null});ctx.rerender();return;}
      ctx.vars.busy=true;el.disabled=true;
      const run=App.reasoningStream(ctx.$('#sector-build-log'),[
        {agent:T('Intérprete de procedimiento','Procedure interpreter'),system:'Prodigy',action:T('Detectar disparador y parámetros','Detect trigger and parameters'),result:`${L(result.name)} · ${result.threshold} ${P.unit}`,ms:320},
        {agent:T('Validador','Validator'),system:'Procedimientos',action:T('Contrastar procedimiento y permisos','Cross-check procedure and permissions'),result:`${P.docs[0].code} · ${L(P.role)}`,ms:400},
        {agent:T('Constructor de workflow','Workflow builder'),system:'Prodigy',action:T('Añadir pasos y guardia humana','Add steps and human guard'),result:T('Borrador listo para revisión','Draft ready for review'),ms:350}
      ],{signal:ctx.signal});await run.done;if(!ctx.alive())return;ctx.vars.busy=false;
      ctx.setLocal({draft:result,error:null});App.audit(T('Workflow preparado','Workflow prepared'),`${I.id} · ${L(result.name)}`);ctx.rerender();
    });
    ctx.on('change','[data-wf-param]',(_,el)=>{const key=el.dataset.wfParam,v=Number(el.value),draft=ctx.local.draft;if(!Number.isFinite(v)||v<=0||v>(key==='threshold'?1000:180)||key==='minutes'&&!Number.isInteger(v)){App.toast(T('Valor fuera de rango','Value outside range'),{tone:'warn'});el.value=draft[key];return;}ctx.setLocal({draft:{...draft,[key]:v}});App.audit(T('Parámetro editado','Parameter edited'),`${key}: ${v}`);ctx.rerender();});
    ctx.on('click','[data-sector-action="publish"]',async()=>{
      if(ctx.vars.busy||!ctx.local.draft)return;ctx.vars.busy=true;const draft=ctx.local.draft;
      let reason='';if(draft.template==='event'&&(draft.threshold!==P.threshold||draft.minutes!==P.minutes)){
        reason=await App.promptText({title:T('Cambio respecto al procedimiento','Change from procedure'),label:T('Justificación de la revisión','Reason for review'),required:true,confirmLabel:T('Continuar','Continue')});if(!ctx.alive())return;if(!reason){ctx.vars.busy=false;return;}
      }
      const ok=await App.confirm({title:T('Publicar workflow','Publish workflow'),body:html`<p>${L(draft.name)}</p><p>${T('La aprobación humana sigue siendo obligatoria. Esta publicación se guarda solo en el navegador.','Human approval remains mandatory. This publication is saved only in the browser.')}</p>`,confirmLabel:T('Publicar','Publish')});if(!ctx.alive())return;ctx.vars.busy=false;if(!ok)return;
      const count=App.state.workflows.filter(x=>x.template===draft.template).length;
      const wf={...draft,id:`wf-${I.id}-${draft.template}-${count+1}`,version:`v${count+1}`,status:'published',publishedAt:App.nowISO(),reason,approver:P.role};App.update(s=>s.workflows.push(wf));App.audit(T('Workflow publicado','Workflow published'),`${L(wf.name)} · ${wf.version}${reason?' · '+reason:''}`);ctx.rerender();
    });
    ctx.on('click','[data-sector-action="probe"]',()=>{const text=word(ctx.$('#sector-trigger').value),wf=w;const matched=wf.template==='event'?[P.entity,P.ref,L(P.metric),L(P.event)]:wf.template==='case'?[P.ref,'reclamacion','complaint']:['parte','report','07:05'];const hit=matched.some(x=>text.includes(word(x)));ctx.$('#sector-trigger-result').innerHTML=String(App.callout({tone:hit?'ok':'warn',title:hit?T('Coincide con el workflow','Matches the workflow'):T('Sin coincidencia','No match'),body:hit?`${L(wf.name)} · ${wf.version} · ${T('regla de coincidencia del escenario','scenario matching rule')}`:T('Esta frase no activa un workflow de esta industria.','This phrase does not trigger a workflow for this industry.')}));App.audit(T('Disparador probado','Trigger tested'),hit?'match':'no match');});
    ctx.on('click','[data-sector-action="go-event"]',()=>App.go(w&&w.template==='case'?'reclamacion':w&&w.template==='daily'?'turno':'alarma'));
  });

  function decision(id,root,ctx,kind) {
    const isCase=kind==='case',s=ctx.local,status=s.status||'idle',wf=s.wf||activeWorkflow();
    const pending=status==='pending',decided=status==='approved'||status==='rejected';
    const label=isCase?L(P.caseTitle):L(P.event);
    const ready= pending||decided;
    const actionTitle=isCase?T('Revisar respuesta al cliente','Review customer reply'):L(P.approve);
    const effects=isCase?[T('Guardar respuesta revisada y propuesta de seguimiento. El envío externo sigue pendiente de integración.','Save the reviewed reply and follow-up proposal. External sending remains pending integration.')]:[L(P.effect)];
    show(root,html`${title(label,isCase?T('Del correo a una respuesta con evidencia y revisión.','From email to a reply with evidence and review.'):L(P.evidence),btn(T('Preparar informe','Prepare report'),'report','secondary','file-text',!ready))}
      ${!isCase?html`<div class="sector-evidence">${App.chip('published',`${wf.version} · ${wf.preset?T('workflow del escenario','scenario workflow'):T('tu workflow publicado','your published workflow')}`)}${App.sysList(P.systems)}${refs(0)}</div>`:App.sysList([P.systems[3],P.systems[2]])}
      <div class="grid cols-7-5"><div class="stack">${App.card({title:isCase?T('Correo recibido','Received email'):L(P.metric),icon:isCase?'mail':'activity',body:isCase?App.emailView({headers:{From:'operaciones@cliente.example',To:'equipo@empresa.example',Date:'29/09/2026 06:45',Subject:label},text:L(P.mail),attachments:[T('evidencia-cliente.pdf','customer-evidence.pdf')]}):chart(wf)})}
      ${App.card({title:T('Alcance confirmado','Confirmed scope'),body:html`${App.kv([[L(P.recordLabel),refButton()],[T('Alcance','Scope'),L(P.scope)],[T('Evidencia','Evidence'),isCase?L(P.caseFinding):L(P.risk)]])}${isCase?refs(2):refs(0)}`,footer:!ready?btn(isCase?T('Preparar respuesta','Prepare reply'):T('Ejecutar workflow','Run workflow'),'run','primary','play'):App.chip(status)})}</div>
      <div class="stack">${App.card({title:T('Agentes y sistemas','Agents and systems'),body:App.list(P.agents.map((a,i)=>({title:L(a),icon:['activity','git-branch','clipboard'][i],body:[L(P.evidence),L(P.scope),L(P.protected)][i],meta:[App.sys(P.systems[i])]})))})}
      ${App.callout({tone:'warn',title:T('Decisión del responsable','Owner decision'),body:L(P.protected)})}${!isCase?App.callout({tone:qualifies(wf)?'brand':'warn',title:T('Evaluación del disparador','Trigger evaluation'),body:`${triggerDuration(wf.threshold)} min > ${wf.minutes} min · ${qualifies(wf)?T('condición cumplida','condition met'):T('condición no cumplida','condition not met')}`}):''}</div></div>
      <div class="mt-4">${App.card({title:T('Plan de ejecución','Execution plan'),body:graph(status,wf,kind)})}</div><div id="sector-run-log" class="mt-3"></div>
      ${ready?html`<div class="mt-4">${isCase?App.card({title:T('Borrador de respuesta','Draft reply'),body:html`<label for="sector-reply" class="small muted">${T('Revisa el texto antes de aprobar','Review the text before approval')}</label><textarea id="sector-reply" class="sector-editor" ${pending?'':'readonly'}>${s.reply||L(P.reply)}</textarea>`,footer:html`${refs(2)} ${T('Causa y acciones pendientes marcadas en el texto','Pending cause and actions marked in the text')}`}):''}${App.approvalCard({id:`sector-${id}`,status:pending?'pending':status,title:actionTitle,summary:isCase?L(P.caseFinding):L(P.risk),approver:L(P.role),policy:P.docs[isCase?2:0].code,scope:[{label:L(P.recordLabel),value:P.ref},{label:T('Alcance','Scope'),value:L(P.scope)}],effects,editable:false,approveLabel:isCase?T('Aprobar respuesta','Approve reply'):L(P.approve),rejectLabel:T('Rechazar','Reject'),decidedBy:s.decidedBy,decidedAt:s.decidedAt,comment:s.reason,doneActions:btn(T('Ver registro de auditoría','View audit log'),'audit','secondary','history')})}</div>`:''}
      ${status==='approved'?html`<div class="mt-4">${App.callout({tone:'ok',title:T('Actuación registrada','Action recorded'),body:isCase?T('Respuesta revisada guardada. Ningún correo ha salido del navegador.','Reviewed reply saved. No email has left the browser.'):L(P.effect)})}</div>`:''}`);
    bindDocs(ctx);ctx.on('click','[data-sector-ref]',()=>App.go('retirada'));
    ctx.on('click','[data-sector-action="run"]',async(_,el)=>{
      if(ctx.vars.busy||ctx.local.status==='pending'||ctx.local.status==='approved'||ctx.local.status==='rejected')return;
      const selected=activeWorkflow();if(!isCase&&!qualifies(selected)){App.toast(T('El disparador no se cumple; no se prepara ninguna actuación.','The trigger is not met; no action is prepared.'),{tone:'warn'});App.audit(T('Disparador no cumplido','Trigger not met'),`${selected.threshold} ${P.unit} · ${selected.minutes} min`);return;}
      ctx.vars.busy=true;el.disabled=true;
      const steps=[{agent:L(P.agents[0]),system:P.systems[0],action:isCase?T('Relacionar correo y registro','Link email and record'):T('Contrastar lecturas con el procedimiento','Cross-check readings against the procedure'),result:isCase?L(P.caseFinding):L(P.evidence),ms:420},{agent:L(P.agents[1]),system:P.systems[1],action:T('Localizar el alcance','Locate the scope'),result:L(P.scope),ms:550},{agent:L(P.agents[2]),system:P.systems[2],action:T('Preparar propuesta sin aplicar cambios','Prepare proposal without applying changes'),result:L(P.role)+` · ${T('aprobación pendiente','approval pending')}`,ms:390}];
      const stream=App.reasoningStream(ctx.$('#sector-run-log'),steps,{signal:ctx.signal,onStep:(_,i)=>App.planGraph.set(ctx.root,{trigger:'done',diagnose:i>0?'done':'active',trace:i>1?'done':i===1?'active':'pending',human:i===2?'waiting':'pending'})});await stream.done;if(!ctx.alive())return;ctx.vars.busy=false;
      ctx.setLocal({status:'pending',wf:selected,reply:isCase?L(P.reply):null,steps});App.audit(T('Propuesta preparada','Proposal prepared'),`${label} · ${selected.version}`);ctx.rerender();
    });
    ctx.on('input','#sector-reply',(_,el)=>ctx.setLocal({reply:el.value}));
    ctx.on('click','[data-approval="approve"]',async(_,el)=>{
      if(ctx.local.status!=='pending'||ctx.vars.busy)return;
      if(isCase&&!(ctx.local.reply||'').trim()){App.toast(T('La respuesta no puede estar vacía.','The reply cannot be empty.'),{tone:'warn'});return;}
      ctx.vars.busy=true;el.disabled=true;
      // Record the decision and its effects together; rerenders never replay the action.
      const decidedAt=App.nowISO();ctx.setLocal({status:'approved',decidedBy:L(P.role),decidedAt});
      App.outcome(id,{status:'approved',label:actionTitle,applied:true,at:decidedAt});App.audit(T('Propuesta aprobada','Proposal approved'),`${label} · ${effects.join(' ')}`,L(P.role));ctx.rerender();
    });
    ctx.on('click','[data-approval="reject"]',async()=>{
      if(ctx.local.status!=='pending'||ctx.vars.busy)return;ctx.vars.busy=true;
      const reason=await App.promptText({title:T('Rechazar la propuesta','Reject proposal'),label:T('Motivo obligatorio','Reason required'),required:true,confirmLabel:T('Rechazar','Reject')});if(!ctx.alive())return;ctx.vars.busy=false;if(!reason)return;
      ctx.setLocal({status:'rejected',reason,decidedBy:L(P.role),decidedAt:App.nowISO()});App.outcome(id,{status:'rejected',label:reason,applied:false});App.audit(T('Propuesta rechazada','Proposal rejected'),`${label} · ${reason} · ${T('sin acciones aplicadas','no actions applied')}`,L(P.role));ctx.rerender();
    });
    ctx.on('click','[data-sector-action="audit"]',()=>App.openAuditLog());
    ctx.on('click','[data-sector-action="report"]',()=>exportReport(id,label,[{heading:T('Evidencia','Evidence'),text:isCase?L(P.caseFinding):L(P.evidence)},{heading:T('Decisión','Decision'),text:`${status} · ${s.decidedBy||L(P.role)}${s.reason?' · '+s.reason:''}`},{heading:isCase?T('Respuesta revisada','Reviewed reply'):T('Plan de actuación','Action plan'),text:isCase?s.reply||L(P.reply):status==='approved'?L(P.effect):T('Sin acciones aplicadas','No actions applied')} ]));
    if(s.steps)App.reasoningStream(ctx.$('#sector-run-log'),s.steps,{instant:true,signal:ctx.signal});
  }
  register('alarma',30,T('Automatización','Automation'),T('Alerta en ejecución','Alert execution'),P.icon,presenter(L(P.effect),T('Ejecuta el workflow. Revisa el alcance antes de aprobar.','Run the workflow. Review the scope before approval.')),(r,c)=>decision('alarma',r,c,'event'));
  register('reclamacion',40,T('Operación','Operations'),T('Reclamación del cliente','Customer complaint'),'mail',presenter(T('El borrador relaciona la reclamación con el registro y marca la evidencia pendiente.','The draft links the complaint to the record and marks pending evidence.'),T('Prepara la respuesta, edítala y revisa la aprobación.','Prepare the reply, edit it and review approval.')),(r,c)=>decision('reclamacion',r,c,'case'));

  register('retirada',50,T('Operación','Operations'),T('Trazabilidad e impacto','Traceability and impact'),'git-branch',presenter(T('Las cantidades proceden del mismo registro que la alerta. La conciliación debe cuadrar.','Quantities come from the same record as the alert. Reconciliation must balance.'),T('Busca la referencia y descarga la conciliación.','Look up the reference and download reconciliation.')), (root,ctx)=>{
    const query=ctx.local.query==null?P.ref:ctx.local.query,found=ctx.local.found===true;
    const total=P.balance.reduce((n,r)=>n+r[1],0),gap=P.total-total;
    show(root,html`${title(T('Trazabilidad e impacto','Traceability and impact'),L(P.balanceLabel))}${App.card({title:T('Buscar registro','Find record'),body:html`<form class="sector-form" id="sector-trace-form"><label for="sector-trace">${L(P.recordLabel)}<input id="sector-trace" value="${query}" autocomplete="off"></label>${App.button({label:T('Consultar trazabilidad','Look up traceability'),icon:'search',type:'submit'})}</form><p class="small muted mt-2">${T('Referencia disponible','Available reference')}: ${P.ref}</p>`})}
      ${ctx.local.found===false?html`<div class="mt-4">${App.empty({icon:'search',title:T('Registro no encontrado','Record not found'),text:T('No hay evidencia para esta referencia. La demo no inventa datos.','There is no evidence for this reference. The demo does not invent records.')})}</div>`:''}
      ${found?html`<div class="kpis mt-4">${App.kpi({label:T('Total registrado','Recorded total'),value:fmt.num(P.total),unit:L(P.unitCount),icon:'database'})}${App.kpi({label:T('Total conciliado','Reconciled total'),value:fmt.num(total),unit:L(P.unitCount),icon:'check-circle'})}${App.kpi({label:T('Diferencia','Difference'),value:fmt.num(gap),unit:L(P.unitCount),tone:gap?'crit':'ok',icon:'git-branch'})}${App.kpi({label:T('Destinos / estados','Destinations / statuses'),value:P.balance.length,icon:'map-pin'})}</div>
      <div class="grid cols-7-5">${App.card({title:T('Cadena de evidencia','Evidence chain'),body:App.planGraph({nodes:[{id:'origin',kind:'trigger',label:P.ref,systems:[P.systems[1]]},...P.balance.map((r,i)=>({id:`dest-${i}`,kind:'output',label:L(r[0]),sub:`${fmt.num(r[1])} ${L(P.unitCount)}`,systems:[P.systems[2]]}))],edges:P.balance.map((_,i)=>['origin',`dest-${i}`]),status:{origin:'done',...Object.fromEntries(P.balance.map((_,i)=>[`dest-${i}`,'done']))}})})}
      ${App.card({title:T('Conciliación','Reconciliation'),body:ledger(),footer:btn(T('Exportar CSV','Export CSV'),'csv','secondary','download')})}</div>
      <div class="mt-4">${App.callout({tone:gap?'crit':'ok',title:gap?T('Diferencia pendiente','Unresolved difference'):T('Balance completo','Complete balance'),body:T('La suma de los estados coincide con el total registrado. Esto comprueba la coherencia del escenario; no certifica datos reales.','The status amounts add up to the recorded total. This checks scenario consistency; it does not certify real records.'),actions:btn(T('Preparar informe','Prepare report'),'report','secondary','file-text')})}</div>`:''}`);
    ctx.on('submit','#sector-trace-form',e=>{e.preventDefault();const q=ctx.$('#sector-trace').value.trim();ctx.setLocal({query:q,found:word(q)===word(P.ref)});App.audit(T('Trazabilidad consultada','Traceability queried'),q);ctx.rerender();});
    ctx.on('click','[data-sector-action="csv"]',()=>App.downloadFile(`trace-${I.id}-${P.ref}.csv`,'text/csv;charset=utf-8',App.csv({cols:[{label:T('Referencia','Reference'),value:()=>P.ref},{label:T('Estado','Status'),value:r=>L(r[0])},{label:L(P.unitCount),value:r=>r[1]}],rows:P.balance})));
    ctx.on('click','[data-sector-action="report"]',()=>exportReport('trace',L(P.balanceLabel),[{heading:T('Conciliación','Reconciliation'),table:{cols:[{label:T('Estado','Status'),render:r=>L(r[0])},{label:L(P.unitCount),render:r=>fmt.num(r[1]),num:true}],rows:P.balance}},{heading:T('Diferencia','Difference'),text:`${gap} ${L(P.unitCount)}`} ]));
  });

  function questions() {
    return [
      [B('¿Qué dispara la revisión?','What triggers the review?'),P.docs[0].text,0],
      [B('¿Quién autoriza la actuación?','Who authorises the action?'),B(`El responsable es ${L(P.role)}. Debe revisar el alcance antes de aplicar el plan.`,`The owner is ${L(P.role)}. They must review the scope before the plan is applied.`),0],
      [P.questionExtra,P.docs[1].text,1],
      [B('¿Cómo se revisa la respuesta al cliente?','How is the customer reply reviewed?'),P.docs[2].text,2],
      [B('¿Qué controles adicionales se aplican?','What additional controls apply?'),P.docs[1].text,1],
      [B('¿Existe certificado vigente adjunto?','Is a current certificate attached?'),null,null],
      [B('¿Consta un compromiso contractual de tiempo de respuesta?','Is a contractual response-time commitment available?'),null,null]
    ];
  }
  register('cuestionario',60,T('Conocimiento','Knowledge'),T('Cuestionario con fuentes','Questionnaire with sources'),'clipboard',presenter(T('Cada respuesta cita un documento. Las preguntas sin respaldo quedan pendientes.','Each answer cites a document. Questions without evidence remain pending.'),T('Prepara las respuestas, abre una fuente y revisa el documento.','Prepare answers, open a source and review the document.')), (root,ctx)=>{
    const ready=ctx.local.ready,status=ctx.local.status;
    show(root,html`${title(L(P.questionnaire),T('Siete preguntas, cinco respuestas con respaldo y dos evidencias pendientes.','Seven questions, five supported answers and two pending evidence items.'),btn(T('Preparar respuestas','Prepare answers'),'prepare','primary','file-text',!!ready))}
      <div class="kpis">${App.kpi({label:T('Preguntas','Questions'),value:7,icon:'clipboard'})}${App.kpi({label:T('Con evidencia','With evidence'),value:ready?5:0,icon:'file-text',tone:'ok'})}${App.kpi({label:T('Pendientes','Pending'),value:ready?2:7,icon:'clock',tone:'warn'})}${App.kpi({label:T('Revisión humana','Human review'),value:status==='approved'?T('Revisado','Reviewed'):T('Pendiente','Pending'),icon:'user-check'})}</div>
      <div class="grid cols-7-5">${App.card({title:T('Respuestas y citas','Answers and citations'),body:ready?html`${questions().map((q,i)=>html`<div class="sector-question"><div class="strong">${i+1}. ${L(q[0])}</div><div class="q-answer">${q[1]?html`${L(q[1])} ${refs(q[2])}`:App.chip('pending',T('Sin evidencia · solicitar documento','No evidence · request document'))}</div></div>`)}`:App.empty({icon:'clipboard',title:T('Cuestionario listo para preparar','Questionnaire ready to prepare'),text:T('La demo buscará en los tres procedimientos de esta industria.','The demo will look through this industry’s three procedures.')})})}
      <div class="stack">${P.docs.map((d,i)=>App.card({title:d.code,sub:L(d.title),body:html`<p class="small muted">${T('Procedimiento sintético · versión 1','Synthetic procedure · version 1')}</p>`,footer:btn(T('Abrir fuente','Open source'),`doc-${i}`,'secondary','file-text')}))}</div></div><div id="sector-q-log" class="mt-4"></div>
      ${ready?html`<div class="mt-4">${App.approvalCard({id:'sector-questionnaire',status:status||'pending',title:T('Revisión del cuestionario','Questionnaire review'),approver:L(P.role),summary:T('Aprobar guarda las cinco respuestas respaldadas. Las dos preguntas sin evidencia siguen pendientes.','Approval saves the five supported answers. The two questions without evidence remain pending.'),effects:[T('Guardar cuestionario revisado con dos evidencias pendientes; no enviarlo al cliente.','Save the reviewed questionnaire with two pending evidence items; do not send it to the customer.')],approveLabel:T('Aprobar revisión','Approve review'),rejectLabel:T('Rechazar','Reject'),comment:ctx.local.reason,decidedBy:ctx.local.decidedBy,doneActions:btn(T('Exportar documento','Export document'),'export','secondary','download')})}</div>`:''}`);
    bindDocs(ctx);
    ctx.on('click','[data-sector-action^="doc-"]',(_,el)=>docModal(Number(el.dataset.sectorAction.slice(4))));
    ctx.on('click','[data-sector-action="prepare"]',async(_,el)=>{if(ctx.vars.busy||ctx.local.ready)return;ctx.vars.busy=true;el.disabled=true;const run=App.reasoningStream(ctx.$('#sector-q-log'),P.docs.map(d=>({agent:T('Documentación','Documentation'),system:'Procedimientos',action:L(d.title),result:`${d.code} · ${T('respaldo localizado','support located')}`,ms:350})),{signal:ctx.signal});await run.done;if(!ctx.alive())return;ctx.vars.busy=false;ctx.setLocal({ready:true});App.audit(T('Cuestionario preparado','Questionnaire prepared'),`${I.id} · 5/7`);ctx.rerender();});
    ctx.on('click','[data-approval="approve"]',()=>{if(ctx.local.status||!ctx.local.ready)return;ctx.setLocal({status:'approved',decidedBy:L(P.role)});App.audit(T('Cuestionario revisado','Questionnaire reviewed'),T('5 respuestas · 2 evidencias pendientes','5 answers · 2 pending evidence items'));ctx.rerender();});
    ctx.on('click','[data-approval="reject"]',async()=>{if(ctx.vars.busy||ctx.local.status)return;ctx.vars.busy=true;const reason=await App.promptText({title:T('Rechazar revisión','Reject review'),label:T('Motivo','Reason'),required:true});if(!ctx.alive())return;ctx.vars.busy=false;if(!reason)return;ctx.setLocal({status:'rejected',reason,decidedBy:L(P.role)});App.audit(T('Cuestionario rechazado','Questionnaire rejected'),reason);ctx.rerender();});
    ctx.on('click','[data-sector-action="export"]',()=>exportReport('questionnaire',L(P.questionnaire),[{heading:T('Estado de revisión','Review status'),text:`${ctx.local.status||'pending'}${ctx.local.reason?' · '+ctx.local.reason:''} · ${T('2 evidencias pendientes; documento sin enviar','2 pending evidence items; document not sent')}`},...questions().map(q=>({heading:L(q[0]),text:q[1]?`${L(q[1])}\n[${q[2]+1}] ${P.docs[q[2]].code}`:T('Sin evidencia. Pendiente de aportar documento.','No evidence. Awaiting document.')}))]));
  });

  function answerQuery(query) {
    const terms=word(query).split(/[^a-z0-9]+/).filter(x=>x.length>3);
    let index=-1,best=0;P.docs.forEach((d,i)=>{const score=terms.filter(t=>d.terms.split(' ').some(x=>x.startsWith(t)||t.startsWith(x))||word(d.code).includes(t)).length;if(score>best){best=score;index=i;}});
    return index;
  }
  register('procedimientos',70,T('Conocimiento','Knowledge'),T('Preguntar a procedimientos','Ask the procedures'),'book-open',presenter(T('La respuesta muestra el documento que la respalda. Si no hay evidencia, la demo lo indica.','The answer shows its supporting document. If there is no evidence, the demo says so.'),T('Pregunta por el umbral o por la aprobación; abre la cita.','Ask about the threshold or approval; open the citation.')), (root,ctx)=>{
    const idx=ctx.local.answer,asked=ctx.local.asked;
    show(root,html`${title(T('Preguntar a procedimientos','Ask the procedures'),T('Consulta la biblioteca de esta industria con fuentes visibles.','Query this industry’s library with visible sources.'))}
      <div class="grid cols-7-5"><div class="stack">${App.card({title:T('Tu pregunta','Your question'),body:html`<form class="sector-form" id="sector-query-form"><label for="sector-query">${T('Pregunta','Question')}<input id="sector-query" value="${ctx.local.query||''}" placeholder="${T('¿Cuál es el umbral de revisión?','What is the review threshold?')}"></label>${App.button({label:T('Consultar','Ask'),icon:'search',type:'submit'})}</form><div class="sector-templates mt-3">${[B('¿Cuál es el umbral?','What is the threshold?'),P.questionExtra,B('¿Cómo se trata una reclamación?','How is a complaint handled?')].map((q,i)=>btn(L(q),`suggest-${i}`,'secondary','book-open'))}</div>`})}
      ${asked?App.card({title:T('Respuesta con evidencia','Answer with evidence'),body:idx>=0?html`<p>${L(P.docs[idx].text)} ${refs(idx)}</p><div class="small muted mt-3">${P.docs[idx].code} · v1 · ${T('procedimiento del escenario','scenario procedure')}</div>`:App.empty({icon:'search',title:T('Sin evidencia suficiente','Insufficient evidence'),text:T('La biblioteca de esta industria no contiene una fuente para esa pregunta. Solicita el documento al responsable.','This industry’s library has no source for that question. Ask the owner for the document.')})}):''}</div>
      <div class="stack">${idx>=0&&asked?source(idx):App.card({title:T('Biblioteca de procedimientos','Procedure library'),body:App.list(P.docs.map((d,i)=>({title:html`<button class="link-btn sector-doc-btn" type="button" data-sector-cite="${i}">${d.code} · ${L(d.title)}</button>`,icon:'file-text',body:T('Documento sintético del escenario · v1','Synthetic scenario document · v1')})))})}</div></div>`);
    bindDocs(ctx);
    const ask=q=>{if(!q.trim())return;const index=answerQuery(q);ctx.setLocal({query:q,answer:index,asked:true});App.audit(T('Procedimiento consultado','Procedure queried'),index>=0?P.docs[index].code:T('Sin fuente','No source'));ctx.rerender();};
    ctx.on('submit','#sector-query-form',e=>{e.preventDefault();ask(ctx.$('#sector-query').value);});
    ctx.on('click','[data-sector-action^="suggest-"]',(_,el)=>ask([T('¿Cuál es el umbral?','What is the threshold?'),L(P.questionExtra),T('¿Cómo se trata una reclamación?','How is a complaint handled?')][Number(el.dataset.sectorAction.slice(8))]));
  });

  register('plataforma',80,T('Prodigy','Prodigy'),T('Cómo encaja en tu empresa','How it fits your company'),'layers',presenter(L(P.benefit),T('Explica el alcance del piloto y abre el registro de auditoría.','Explain the pilot scope and open the audit log.')), (root,ctx)=>{
    show(root,html`${title(T('Cómo encaja en tu empresa','How it fits your company'),L(P.benefit),btn(T('Registro de auditoría','Audit log'),'audit','secondary','history'))}
      ${App.card({title:T('Del evento a una actuación revisada','From event to reviewed action'),body:graph('idle')})}
      <div class="grid cols-7-5 mt-4"><div class="stack">${App.card({title:T('Sistemas del escenario','Scenario systems'),body:html`${App.sysList(P.systems)}<p class="mt-3">${T('Cada agente consulta una fuente, prepara su resultado y comparte el alcance con el responsable. En un piloto se definen los permisos de lectura y escritura de cada conector.','Each agent queries a source, prepares its result and shares the scope with the owner. A pilot defines read and write permissions for each connector.')}</p>`})}
      ${App.card({title:T('Primer piloto','First pilot'),body:App.timeline({items:[{time:'1–2',title:T('Fuentes y permisos','Sources and permissions'),text:T('Un caso, dos fuentes en lectura y procedimientos aprobados por el cliente.','One case, two read-only sources and customer-approved procedures.')},{time:'3–4',title:T('Agentes y Routines','Agents and Routines'),text:T('Configurar el modelo, el workflow y la revisión humana; comparar con casos históricos.','Configure the model, workflow and human review; compare against historical cases.')},{time:'5–6',title:T('Validación con usuarios','User validation'),text:T('Medir acierto de alcance, evidencia y tiempo de preparación. Autorizar escrituras solo tras superar las pruebas.','Measure scope accuracy, evidence and preparation time. Authorise writes only after tests pass.')} ]})})}</div>
      <div class="stack">${App.card({title:T('Qué demuestra esta página','What this page demonstrates'),body:html`<p>${T('El recorrido de trabajo, la información que necesita el responsable y la experiencia de revisión. La simulación ejecuta reglas preparadas y guarda decisiones en localStorage.','The workflow, the information the owner needs and the review experience. The simulation runs prepared rules and saves decisions in localStorage.')}</p><p class="mt-3">${T('No ejecuta agentes del backend, inferencia LLM ni conexiones reales. Los diagramas y las respuestas no validan por sí solos las capacidades de una instancia de Prodigy.','It does not run backend agents, LLM inference or real connections. Diagrams and responses alone do not validate an instance of Prodigy.')}</p>`})}
      ${App.card({title:T('Qué hace falta para ejecutarlo','What implementation requires'),body:App.list([{icon:'git-branch',title:T('Configuración por industria','Configuration per industry'),body:T('Agentes, Routines, fuentes y contratos de datos.','Agents, Routines, sources and data contracts.')},{icon:'database',title:T('Integración','Integration'),body:T('API de Prodigy, identidad, conectores y permisos; validar estados y errores.','Prodigy API, identity, connectors and permissions; validate states and errors.')},{icon:'shield-check',title:T('Modelo y evaluación','Model and evaluation'),body:T('Elegir proveedor y despliegue con el cliente; medir precisión, coste y fallos con sus casos.','Choose provider and deployment with the customer; measure accuracy, cost and failures using their cases.')}])})}</div></div>
      <div class="mt-4">${App.card({title:T('Decisiones de esta industria','Decisions for this industry'),body:App.auditTable(undefined,{limit:6}),footer:btn(T('Compartir este escenario','Share this scenario'),'share','secondary','copy')})}</div>`);
    ctx.on('click','[data-sector-action="audit"]',()=>App.openAuditLog());
    ctx.on('click','[data-sector-action="share"]',()=>{const url=new URL(location.href);url.searchParams.set('industry',I.id);url.searchParams.set('lang',CN_I18N.lang);url.searchParams.delete('reset');App.copyText(url.href);});
  });
})();
