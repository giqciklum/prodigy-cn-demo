/* Presentation-only localisation. Domain identifiers, source evidence and session data stay unchanged. */
(function () {
  'use strict';
  const KEY = 'cn-demo-language';
  const query = new URLSearchParams(location.search);
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (_) { /* private browsing */ }
  const requested = query.get('lang');
  const lang = /^(es|en)$/.test(requested || '') ? requested : (saved === 'en' ? 'en' : 'es');
  try { localStorage.setItem(KEY, lang); } catch (_) { /* preference is optional */ }
  document.documentElement.lang = lang;
  if(lang==='en'){const meta=document.querySelector('meta[name="description"]');if(meta)meta.content='Prodigy demonstration for Congelados de Navarra. Interactive scenarios with synthetic data, prepared by Ciklum.';}
  const english = lang === 'en';
  const messages = window.CN_EN || {};
  const normalize = (s) => String(s).replace(/\s+/g, ' ').trim();
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const entries = Object.entries(messages);
  const exact = new Map(entries.map(([a,b]) => [normalize(a),b]));
  const folded = new Map(entries.map(([a,b])=>[normalize(a).toLowerCase(),b]));
  const outputs = new Set(entries.filter(([a])=>!a.includes('⟦')).map(([,b])=>normalize(b)));
  const patterns = entries.filter(([a,b]) => a.includes('⟦') && /[a-zÀ-ÿ]{3}/i.test(a.replace(/⟦\d+⟧/g,'')))
    .sort((a,b)=>b[0].replace(/⟦\d+⟧/g,'').length-a[0].replace(/⟦\d+⟧/g,'').length)
    .map(([a,b]) => {const ids=[]; const source=a.split(/(⟦\d+⟧)/).map(part=>{if(/^⟦\d+⟧$/.test(part)){ids.push(part);return '(.*?)';} return escapeRe(part);}).join('');return {re:new RegExp('^'+source+'$','u'),ids,to:b};});
  const fragments = entries.filter(([a,b])=>a!==b && !a.includes('⟦') && a.length>=3 && !/[<>\[\]{}]/.test(a)).sort((a,b)=>b[0].length-a[0].length);
  const fragmentRe = fragments.length ? new RegExp('(?<![\\p{L}\\p{N}_])(?:'+fragments.map(([a])=>escapeRe(a)).join('|')+')(?![\\p{L}\\p{N}_])','gu') : null;
  const cache = new Map();
  function translate(s, depth) {
    if (!english || s == null || typeof s !== 'string' || !s.trim()) return s;
    const n=normalize(s);
    if(cache.has(n)) return cache.get(n);
    if(exact.has(n)) return exact.get(n);
    if(folded.has(n.toLowerCase())) {const found=folded.get(n.toLowerCase());return n===n.toUpperCase()?found.toUpperCase():found;}
    const quoted=/^[«“](.*)[»”]$/.exec(n);
    if(quoted) return '“'+translate(quoted[1],(depth||0)+1)+'”';
    if(!/[.!?]$/.test(n) && exact.has(n+'.')) return exact.get(n+'.').replace(/\.$/,'');
    if(n===n.toUpperCase() && folded.has(n.toLowerCase())) return folded.get(n.toLowerCase()).toUpperCase();
    if(outputs.has(n)) return s;
    if((depth||0)<4) for(const p of patterns){const m=p.re.exec(n);if(m){const vals={};p.ids.forEach((id,i)=>vals[id]=translate(m[i+1],(depth||0)+1));const out=p.to.replace(/⟦\d+⟧/g,id=>vals[id]??id);cache.set(n,out);return out;}}
    const out=fragmentRe ? n.replace(fragmentRe,hit=>exact.get(hit)||hit) : s;
    if(cache.size>6000) cache.clear();
    cache.set(n,out); return out;
  }
  // Keep original spacing at boundaries of inline elements (strong, citations, etc.).
  function text(s){const value=translate(s,0);if(value===s)return s;return (s.match(/^\s*/)||[''])[0]+value.trim()+(s.match(/\s*$/)||[''])[0];}
  const seen=new WeakMap();
  const skip='script,style,code,pre,[data-no-translate],.language-switch';
  function localize(root){
    if(!english || !root) return;
    const doc=root.ownerDocument||document;
    const walk=doc.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];if(root.nodeType===3)nodes.push(root);else while(walk.nextNode())nodes.push(walk.currentNode);
    for(const node of nodes){if(!node.parentElement||node.parentElement.closest(skip)||seen.get(node)===node.nodeValue)continue;const val=text(node.nodeValue);if(val!==node.nodeValue)node.nodeValue=val;seen.set(node,val);}
    const elements=root.nodeType===1?[root,...root.querySelectorAll('[title],[aria-label],[placeholder],[alt]')]:root.querySelectorAll?root.querySelectorAll('[title],[aria-label],[placeholder],[alt]'):[];
    for(const el of elements){if(el.closest(skip))continue;for(const attr of ['title','aria-label','placeholder','alt']){if(!el.hasAttribute(attr))continue;const val=el.getAttribute(attr);const translated=text(val);if(translated!==val)el.setAttribute(attr,translated);}}
  }
  function html(source){
    if(!english) return source;
    const full=/<!doctype|<html/i.test(source);
    if(full){const doc=new DOMParser().parseFromString(source,'text/html');doc.documentElement.lang='en';localize(doc);return '<!doctype html>\n'+doc.documentElement.outerHTML;}
    const template=document.createElement('template');template.innerHTML=source;localize(template.content);return template.innerHTML;
  }
  function exportContent(content,mime){
    if(!english||typeof content!=='string')return content;
    if(/html/.test(mime||''))return html(content);
    if(/yaml/.test(mime||''))return content; // Preserve machine-readable workflow definitions.
    if(/json/.test(mime||'')){try{const visit=v=>typeof v==='string'?text(v):Array.isArray(v)?v.map(visit):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(x)])):v;return JSON.stringify(visit(JSON.parse(content)),null,2);}catch(_){return content;}}
    return content.split(/(\r?\n)/).map(line=>text(line)).join('');
  }
  const queryWords = {
    'metal detector': 'detector de metales', 'foreign body': 'cuerpo extraño', 'foreign bodies': 'cuerpos extraños',
    'quality hold': 'bloqueo de calidad', 'cold chain': 'cadena de frio', 'cold room': 'camara', 'cold rooms': 'camaras',
    'working days': 'dias habiles', 'business days': 'dias habiles', 'cross contamination': 'contaminacion cruzada',
    'mass balance': 'balance de masas', 'best before': 'consumo preferente', 'product recall': 'retirada de producto',
    'lot release': 'liberacion lote', 'root cause': 'causa raiz', 'air temperature': 'temperatura de aire',
    'shift quality manager': 'responsable de calidad de turno', 'plant quality manager': 'responsable de calidad de planta',
    'allergens':'alergenos','allergen':'alergeno','allergen-free':'sin alergenos','contains':'contiene',
    'temperature':'temperatura','threshold':'umbral','exceeds':'supera','above':'encima','minutes':'minutos',
    'approve':'aprobar','approval':'aprobacion','authorise':'autorizar','authorize':'autorizar','release':'liberar',
    'hold':'bloqueo','block':'bloquear','blocked':'bloqueado','pallets':'pales','lots':'lotes','batch':'lote',
    'complaint':'reclamacion','complaints':'reclamaciones','customer':'cliente','response':'respuesta',
    'deadline':'plazo','report':'informe','acknowledgement':'acuse de recibo','traceability':'trazabilidad',
    'microbiological':'microbiologico','sampling':'muestreo','sample':'muestra','samples':'muestras',
    'environmental':'ambiental','cleaning':'limpieza','withdrawal':'retirada','recall':'retirada',
    'cost':'coste','price':'precio','certification':'certificacion','certificate':'certificado',
    'shelf life':'vida util','expiry':'caducidad','peanuts':'cacahuetes','peanut':'cacahuete',
    'peas':'guisantes','pea':'guisante','broccoli':'brocoli','beans':'judias','corn':'maiz','spinach':'espinacas',
    'wheat':'trigo','nuts':'frutos secos','milk':'leche','soy':'soja','sesame':'sesamo','mustard':'mostaza',
    'washing':'lavado','heat treatment':'tratamiento termico','test':'prueba','check':'verificacion',
    'metal':'metal','ccp':'pcc','maintenance':'mantenimiento','calibration':'calibracion',
    'grower':'agricultor','supplier':'proveedor','stone':'piedra','stones':'piedras','screen':'malla',
    'destoner':'despedregadora','optical sorter':'selectora optica','sorting':'seleccion',
    'who':'quien','when':'cuando','how':'como','which':'que','what':'que','why':'por que','can':'puede',
    'must':'debe','should':'debe','before':'antes','after':'despues','hours':'horas','days':'dias',
    'shipments':'expediciones','shipment':'expedicion','shipping':'expedicion','dispatch':'expedicion',
    'plant':'planta','product':'producto','products':'productos','quality':'calidad','procedure':'procedimiento'
  };
  const queryRe=new RegExp('\\b(?:'+Object.keys(queryWords).sort((a,b)=>b.length-a.length).map(escapeRe).join('|')+')\\b','gi');
  const reverse=new Map(entries.filter(([a,b])=>!a.includes('⟦')).map(([a,b])=>[normalize(b).toLowerCase(),a]));
  function queryToSpanish(s){const n=normalize(s);return reverse.get(n.toLowerCase())||n.replace(queryRe,hit=>queryWords[hit.toLowerCase()]);}
  function setLanguage(next){
    if(!/^(es|en)$/.test(next)||next===lang)return;
    try{localStorage.setItem(KEY,next);}catch(_){}
    const url=new URL(location.href);url.searchParams.set('lang',next);url.searchParams.delete('reset');
    location.assign(url.href);
  }
  function start(){
    document.querySelectorAll('[data-language]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.language===lang));b.addEventListener('click',()=>setLanguage(b.dataset.language));});
    localize(document.body);
    if(english){
      const observer=new MutationObserver(records=>{
        observer.disconnect();
        const roots=new Set();
        for(const r of records){if(r.type==='characterData')roots.add(r.target);else if(r.type==='attributes')roots.add(r.target);else for(const node of r.addedNodes)if(node.nodeType===1||node.nodeType===3)roots.add(node);}
        roots.forEach(localize);localize(document.querySelector('title'));
        observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder','alt']});
      });
      observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder','alt']});
    }
  }
  window.CN_I18N={lang,english,text,html,localize,exportContent,setLanguage,queryToSpanish};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
