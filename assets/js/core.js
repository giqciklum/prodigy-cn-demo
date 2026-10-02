/*
 * Prodigy · Congelados de Navarra — núcleo de la consola de demostración.
 * JavaScript plano (ES2020), sin dependencias. Expone window.App.
 * API y ejemplos: assets/js/README-core.md
 */
(function () {
  'use strict';

  const DATA = window.CN_DATA || {};
  const INDUSTRY = window.DEMO_INDUSTRY;
  const STORE_KEY = 'cn-demo-v2' + (INDUSTRY && INDUSTRY.id !== 'frozen_food' ? '-' + INDUSTRY.id : '');
  const UI_KEY = STORE_KEY + '-ui';
  const STATE_VERSION = 2;
  const VERSION = '2.2';
  const I18N = window.CN_I18N;
  const t = (s) => I18N ? I18N.text(s) : s;
  const DEMO_EPOCH = Date.UTC(2026, 8, 29, 7, 5, 0); // martes 29/09/2026 07:05, hora de planta
  const STALE_MS = 4 * 3600 * 1000;
  const DEFAULT_ACTOR = (INDUSTRY && INDUSTRY.id !== 'frozen_food' && INDUSTRY.text(INDUSTRY.profile.role)) || (DATA.roles && DATA.roles.quality_shift) || 'Responsable de Calidad de turno';
  const MINUS = '\u2212';
  const NBSP = '\u00A0';

  /* ================================================================ HTML seguro */

  class SafeHTML {
    constructor(s) { this.s = String(s); }
    toString() { return I18N ? I18N.html(this.s) : this.s; }
  }
  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ESC_MAP[c]); }
  function raw(s) { return s instanceof SafeHTML ? s : new SafeHTML(s == null ? '' : s); }
  function toHTML(v) {
    if (v == null || v === false || v === true) return '';
    if (v instanceof SafeHTML) return v.s;
    if (Array.isArray(v)) return v.map(toHTML).join('');
    return esc(v);
  }
  /** Plantilla etiquetada: escapa todo lo interpolado salvo SafeHTML (componentes, App.raw). */
  function html(strings, ...vals) {
    let out = strings[0];
    for (let i = 0; i < vals.length; i++) out += toHTML(vals[i]) + strings[i + 1];
    return new SafeHTML(out);
  }
  function attrs(obj) {
    if (!obj) return raw('');
    return raw(Object.entries(obj)
      .filter(([, v]) => v != null && v !== false)
      .map(([k, v]) => (v === true ? esc(k) : `${esc(k)}="${esc(v)}"`))
      .join(' '));
  }
  let uidSeq = 0;
  function uid(prefix) { uidSeq += 1; return (prefix || 'u') + uidSeq.toString(36); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function slug(s) {
    return String(s || 'documento').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'documento';
  }
  function cssEsc(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'); }

  /* ================================================================ Iconos (trazo 1,75 · 24×24) */

  const ICONS = {
    thermometer: '<path d="M14 14.5V5a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0Z"/><path d="M12 17.5V10"/>',
    snowflake: '<path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5"/><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2"/>',
    pallet: '<rect x="5" y="4.5" width="14" height="10" rx="1"/><path d="M9.5 4.5V8h5V4.5"/><path d="M3 14.5h18M3 19.5h18M5 14.5v5M12 14.5v5M19 14.5v5"/>',
    truck: '<path d="M2.5 6.5h11v9h-11z"/><path d="M13.5 9.5h4l3 3.5v2.5h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    factory: '<path d="M3 20.5V11l5 3.2V11l5 3.2V11l5 3.2V4h3v16.5z"/><path d="M7 17.5h1.5M11.5 17.5H13M16 17.5h1.5"/>',
    'shield-check': '<path d="M12 3 19 6v5.2c0 4.3-2.9 8.1-7 9.8-4.1-1.7-7-5.5-7-9.8V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    shield: '<path d="M12 3 19 6v5.2c0 4.3-2.9 8.1-7 9.8-4.1-1.7-7-5.5-7-9.8V6z"/>',
    'file-text': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6M9 9h2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.9-3.9"/>',
    workflow: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M6.5 10v3.5a3.5 3.5 0 0 0 3.5 3.5H14"/>',
    'git-branch': '<circle cx="6" cy="5.5" r="2.2"/><circle cx="6" cy="18.5" r="2.2"/><circle cx="18" cy="7.5" r="2.2"/><path d="M6 7.7v8.6M18 9.7c0 4.3-4.8 5.3-10.3 7.2"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    'alert-triangle': '<path d="M10.3 4.2 2.7 17.3A2 2 0 0 0 4.4 20.3h15.2a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.2M12 17h.01"/>',
    'user-check': '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-5.8 6-5.8s6 2.5 6 5.8"/><path d="m16 11 2 2 4-4"/>',
    database: '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13"/><path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    download: '<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/>',
    upload: '<path d="M12 16V5M7.5 9.5 12 5l4.5 4.5"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/>',
    play: '<path d="M7 5v14l11-7z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    send: '<path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    'list-checks': '<path d="m3.5 6.5 1.5 1.5 3-3M3.5 12.5 5 14l3-3M3.5 18.5 5 20l3-3"/><path d="M11 7h10M11 13h10M11 19h10"/>',
    'book-open': '<path d="M3 5.5c2.6-1 5.6-.8 9 1.2 3.4-2 6.4-2.2 9-1.2V19c-2.6-1-5.6-.8-9 1.2-3.4-2-6.4-2.2-9-1.2z"/><path d="M12 6.7v13.5"/>',
    layers: '<path d="M12 3 2.5 8 12 13l9.5-5z"/><path d="m2.5 12.5 9.5 5 9.5-5"/><path d="m2.5 16.5 9.5 5 9.5-5"/>',
    'map-pin': '<path d="M12 21s7-5.6 7-11.5a7 7 0 1 0-14 0C5 15.4 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    scale: '<path d="M12 4v16M8 20h8M5 7h14"/><path d="m5 7-2.5 6a2.5 2.5 0 0 0 5 0z"/><path d="m19 7-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
    repeat: '<path d="m17 3 3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="m7 21-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5" rx=".5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5v-3a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5v-3a4 4 0 0 1 7.7-1.5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    'chevron-right': '<path d="m9 6 6 6-6 6"/>',
    'chevron-left': '<path d="m15 6-6 6 6 6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-up': '<path d="m6 15 6-6 6 6"/>',
    'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    'arrow-left': '<path d="M20 12H4m6-6-6 6 6 6"/>',
    'external-link': '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    'bar-chart': '<path d="M4 20h16M7 16v-5M12 16V6M17 16V9"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    leaf: '<path d="M5 20c0-9 5.5-15 15-16 0 10-6 16-15 16z"/><path d="m5 20 8.5-8.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
    printer: '<path d="M7 9V4h10v5"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
    'rotate-ccw': '<path d="M3.5 4.5v5h5"/><path d="M4.3 9.5A8 8 0 1 1 5.7 16.8"/>',
    presentation: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8.5 20h7"/><path d="m7 12 3-3 2.5 2.5L17 7"/>',
    'message-square': '<path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',
    wrench: '<path d="M14.5 3.8a5 5 0 0 0-4.3 6.9l-6.4 6.4a2 2 0 0 0 2.9 2.9l6.4-6.4a5 5 0 0 0 6.9-4.3l-3 1.7-2.6-.9-.9-2.6z"/>',
    ticket: '<path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z"/><path d="M14 6v2.5M14 11v2M14 15.5V18"/>',
    bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
    filter: '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    'fast-forward': '<path d="M4 6v12l8-6zM12 6v12l8-6z"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    server: '<rect x="3.5" y="4" width="17" height="7" rx="1.5"/><rect x="3.5" y="13" width="17" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    cloud: '<path d="M7 18.5h10.5a4 4 0 0 0 .6-8A6 6 0 0 0 6.6 12 3.3 3.3 0 0 0 7 18.5z"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7M16 7l2.5 2.5M18.5 4.5 21 7"/>',
    gauge: '<path d="M4.3 17.5a9 9 0 1 1 15.4 0"/><path d="m12 14 4-4.5"/><circle cx="12" cy="14" r="1.2"/>',
    droplet: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3.5 21h17"/><path d="M14.5 12h.01"/>',
    flask: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7.2 15h9.6"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4v4.5H8M12 8v4l3 2"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.7 2.7L16 10"/>',
    'x-circle': '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    'alert-circle': '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V13M12 16.5h.01"/>',
    clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5v-1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 15h4"/>',
    hash: '<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>',
    circle: '<circle cx="12" cy="12" r="8"/>',
    'circle-dot': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
    keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7 14h10"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c0-3.2 2.7-5.5 6-5.5s6 2.3 6 5.5M16 5a3 3 0 0 1 0 6M18 14.2c1.8.7 3 2.5 3 5.3"/>',
    user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>',
    route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H16"/>',
    maximize: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    'more-horizontal': '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    inbox: '<path d="M3 13h5l1.5 3h5l1.5-3h5"/><path d="M5.5 5h13L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z"/>',
    tag: '<path d="M3 12V4h8l9.5 9.5-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    barcode: '<path d="M4 5v14M7.5 5v14M10.5 5v14M14 5v14M16.5 5v14M20 5v14"/>',
    warehouse: '<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8M7 17h10"/>',
    save: '<path d="M6 3.5h10L19.5 7v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5z"/><path d="M8 3.5v5h7v-5M8 20.5v-6h8v6"/>',
    euro: '<path d="M18 6.6A7 7 0 1 0 18 17.4"/><path d="M4 10.5h9M4 14h9"/>',
    version: '<circle cx="12" cy="12" r="3.5"/><path d="M3 12h5.5M15.5 12H21"/>',
    fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c-1-4 .5-7 3.5-7 2.2 0 3.2 2.3 1.5 4zM14 12c4-1 7 .5 7 3.5 0 2.2-2.3 3.2-4 1.5zM12 14c1 4-.5 7-3.5 7-2.2 0-3.2-2.3-1.5-4zM10 12c-4 1-7-.5-7-3.5 0-2.2 2.3-3.2 4-1.5z"/>'
  };

  /** Icono SVG de línea. icon('thermometer') · icon('check', 16) · icon('x', {size: 14, title: 'Cerrar'}) */
  function icon(name, opts) {
    const o = typeof opts === 'number' ? { size: opts } : (opts || {});
    const size = o.size || 20;
    const body = ICONS[name] || ICONS.circle;
    const a11y = o.title ? `role="img" aria-label="${esc(o.title)}"` : 'aria-hidden="true"';
    return raw(`<svg class="icon${o.class ? ' ' + esc(o.class) : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${o.stroke || 1.75}" stroke-linecap="round" stroke-linejoin="round" focusable="false" ${a11y}>${o.title ? `<title>${esc(o.title)}</title>` : ''}${body}</svg>`);
  }

  /* ================================================================ Formato (es-ES) */

  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  /** Convierte a Date con campos UTC = hora de planta. Acepta Date, 'AAAA-MM-DD', 'AAAA-MM-DDTHH:MM[:SS]', 'HH:MM'. */
  function toDate(v) {
    if (v instanceof Date) return v;
    if (typeof v === 'number') return new Date(v);
    if (typeof v === 'string') {
      const s = v.trim();
      let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s);
      if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
      m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
      if (m) return new Date(Date.UTC(2026, 8, 29, +m[1], +m[2], +(m[3] || 0)));
    }
    return null;
  }

  const fmt = {
    /** 17600 → '17.600' · -13.9 → '−13,9' · 4.8 → '4,8' · (0.04) → '0,04' · num(3, 1) → '3,0' */
    num(v, dec) {
      if (v == null || v === '' || isNaN(Number(v))) return '—';
      const n = Number(v);
      const s = dec == null ? (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, '') : n.toFixed(dec);
      let [int, frac] = s.split('.');
      const neg = int.charAt(0) === '-';
      if (neg) int = int.slice(1);
      int = int.replace(/\B(?=(\d{3})+(?!\d))/g, I18N && I18N.english ? ',' : '.');
      const out = int + (frac ? (I18N && I18N.english ? '.' : ',') + frac : '');
      return (neg && Number(s) !== 0 ? MINUS : '') + out;
    },
    int(v) { return fmt.num(Math.round(Number(v)), 0); },
    kg(v, dec) { return fmt.num(v, dec) + NBSP + 'kg'; },
    t(v, dec) { return fmt.num(v, dec) + NBSP + 't'; },
    /** -13.9 → '−13,9 °C' · -18 → '−18 °C' */
    temp(v, dec) {
      if (v == null || isNaN(Number(v))) return '—';
      const d = dec != null ? dec : (Number.isInteger(Number(v)) ? 0 : 1);
      return fmt.num(v, d) + NBSP + '°C';
    },
    pct(v, dec) { return fmt.num(v, dec) + NBSP + '%'; },
    eur(v, dec) { return fmt.num(v, dec != null ? dec : (Number.isInteger(Number(v)) ? 0 : 2)) + NBSP + '€'; },
    usd(v, dec) { return fmt.num(v, dec != null ? dec : 2) + NBSP + 'USD'; },
    /** Segundos → '1 min 52 s' · '50 min' · '2 h 5 min' · '3,8 s' */
    dur(sec) {
      if (sec == null || isNaN(Number(sec))) return '—';
      const s = Math.max(0, Number(sec));
      if (s < 60) return (Number.isInteger(s) ? fmt.num(s, 0) : fmt.num(s, 1)) + NBSP + 's';
      const t = Math.round(s);
      const h = Math.floor(t / 3600);
      const m = Math.floor((t % 3600) / 60);
      const r = t % 60;
      if (h) return `${h}${NBSP}h` + (m ? ` ${m}${NBSP}min` : '');
      return `${m}${NBSP}min` + (r ? ` ${r}${NBSP}s` : '');
    },
    /** Milisegundos → '640 ms' · '10,6 s' */
    ms(ms) {
      const n = Number(ms) || 0;
      return n < 1000 ? fmt.num(Math.round(n), 0) + NBSP + 'ms' : fmt.dur(Math.round(n / 100) / 10);
    },
    /** '2026-09-29' → '29/09/2026' · ('2026-09-29T05:50') → '29/09/2026 05:50' · ('2026-09-29', '05:50') */
    date(v, opts) {
      let val = v;
      let o = opts;
      if (typeof opts === 'string') { val = `${v}T${opts}`; o = { time: true }; }
      if (opts === true) o = { time: true };
      o = o || {};
      const d = toDate(val);
      if (!d) return val == null ? '—' : String(val);
      const showTime = o.time != null ? o.time : (typeof val === 'string' && /[T ]\d{1,2}:\d{2}/.test(val));
      const base = `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
      if (!showTime) return base;
      return `${base} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}${o.seconds ? ':' + pad2(d.getUTCSeconds()) : ''}`;
    },
    /** → '05:50' (o '07:05:12' con segundos) */
    time(v, seconds) {
      const d = toDate(v);
      if (!d) return v == null ? '—' : String(v);
      return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}${seconds ? ':' + pad2(d.getUTCSeconds()) : ''}`;
    },
    /** → '29/09' */
    dayMonth(v) { const d = toDate(v); return d ? `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}` : '—'; },
    weekday(v) { const d = toDate(v); return d ? WEEKDAYS[d.getUTCDay()] : '—'; },
    /** → 'martes, 29 de septiembre de 2026' */
    dateLong(v) {
      const d = toDate(v);
      return d ? `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]} de ${d.getUTCFullYear()}` : '—';
    },
    /** Días entre dos fechas (b − a) */
    days(a, b) { const x = toDate(a); const y = toDate(b); return x && y ? Math.round((y - x) / 86400000) : null; },
    /** plural(38, 'palé', 'palés') → '38 palés' */
    plural(n, one, many) { return `${fmt.num(n)}${NBSP}${Number(n) === 1 ? one : many}`; },
    /** ['a','b','c'] → 'a, b y c' */
    list(arr) { const a = (arr || []).filter((x) => x != null && x !== ''); return a.length < 2 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} y ${a[a.length - 1]}`; },
    cap(s) { const t = String(s == null ? '' : s); return t.charAt(0).toUpperCase() + t.slice(1); },
    /** Sustituye el guion por el signo menos tipográfico en textos de datos ('-18 °C' → '−18 °C') */
    minus(s) { return String(s == null ? '' : s).replace(/(^|[\s(])-(?=\d)/g, `$1${MINUS}`); },
    /** Texto libre de CN_DATA listo para mostrar: signo menos y fechas ISO → dd/mm/aaaa ('anotado el 2026-08-18' → 'anotado el 18/08/2026') */
    text(s) { return fmt.minus(s).replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3/$2/$1'); }
  };

  /* ================================================================ Almacenamiento y estado */

  const store = {
    read(key) { try { const s = window.localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
    write(key, val) { try { window.localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } },
    remove(key) { try { window.localStorage.removeItem(key); } catch (e) { /* sin almacenamiento */ } }
  };

  function freshState() {
    return { v: STATE_VERSION, clock: { real: Date.now(), demo: DEMO_EPOCH }, audit: [], seq: {}, workflows: [], outcomes: {}, scenes: {} };
  }
  let resumedStale = false;
  function loadState() {
    const s = store.read(STORE_KEY);
    if (!s || s.v !== STATE_VERSION || typeof s !== 'object') return freshState();
    const base = freshState();
    Object.keys(base).forEach((k) => { if (s[k] == null || typeof s[k] !== typeof base[k]) s[k] = base[k]; });
    if (!Array.isArray(s.audit)) s.audit = [];
    if (!Array.isArray(s.workflows)) s.workflows = [];
    const age = Date.now() - (s.clock.real || 0);
    if (age > STALE_MS || age < 0) {
      const last = s.audit.length ? toDate(s.audit[s.audit.length - 1].at) : null;
      s.clock = { real: Date.now(), demo: Math.max(DEMO_EPOCH, last ? last.getTime() + 60000 : DEMO_EPOCH) };
      resumedStale = s.audit.length > 0;
    }
    return s;
  }
  let state = loadState();
  const ui = Object.assign({ presenter: false, speed: 1, timerStart: null }, store.read(UI_KEY) || {});

  function save() { store.write(STORE_KEY, state); }
  function saveUI() { store.write(UI_KEY, ui); }
  function set(patch) { Object.assign(state, patch || {}); save(); emit('state', patch); scheduleChrome(); return state; }
  function update(fn) { fn(state); save(); emit('state'); scheduleChrome(); return state; }

  /** Hora de planta simulada: empieza en 29/09/2026 07:05 y avanza en tiempo real. */
  function now() { return new Date(state.clock.demo + (Date.now() - state.clock.real)); }
  function isoLocal(d) {
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
  }
  function nowISO() { return isoLocal(now()); }
  function globalSpeed() { return ui.speed > 1 ? ui.speed : 1; }

  /** Registro de auditoría append-only. */
  function audit(action, detail, actor) {
    const d = now();
    const entry = {
      id: 'AUD-' + String(state.audit.length + 1).padStart(4, '0'),
      at: isoLocal(d),
      action: String(action),
      detail: detail == null ? '' : (typeof detail === 'string' ? detail : JSON.stringify(detail)),
      actor: actor || DEFAULT_ACTOR,
      scene: current ? current.id : null
    };
    state.audit.push(entry);
    save();
    emit('audit', entry);
    scheduleChrome();
    return entry;
  }

  /** Identificadores correlativos persistentes: seq('MNT-2026-', 1184) → 'MNT-2026-1184', luego 1185… */
  function seq(prefix, start, width) {
    const k = String(prefix);
    const n = state.seq[k] != null ? state.seq[k] + 1 : (start != null ? start : 1);
    state.seq[k] = n;
    save();
    return k + String(n).padStart(width || 4, '0');
  }

  /** Resultado de un caso compartido entre escenas: outcome('alarma') / outcome('alarma', {status, label}) */
  function outcome(id, val) {
    if (val === undefined) return state.outcomes[id] || null;
    if (val === null) { delete state.outcomes[id]; } else { state.outcomes[id] = Object.assign({ at: nowISO() }, val); }
    save();
    emit('state');
    scheduleChrome();
    return state.outcomes[id] || null;
  }

  /* ================================================================ Eventos */

  const listeners = {};
  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); return () => off(evt, fn); }
  function off(evt, fn) { listeners[evt] = (listeners[evt] || []).filter((f) => f !== fn); }
  function emit(evt, payload) {
    (listeners[evt] || []).slice().forEach((fn) => { try { fn(payload); } catch (e) { console.error(e); } });
  }

  /* ================================================================ Componentes básicos */

  function button(o) {
    const cls = ['btn', 'btn-' + (o.variant || 'secondary'), o.size ? 'btn-' + o.size : '', o.class || ''].filter(Boolean).join(' ');
    return html`<button type="${o.type || 'button'}" class="${cls}" ${attrs(Object.assign({ id: o.id, title: o.title, disabled: o.disabled || null }, o.attrs))}>${o.icon ? icon(o.icon) : ''}<span>${o.label}</span>${o.iconRight ? icon(o.iconRight) : ''}</button>`;
  }

  function pageHead(o) {
    const meta = (o.meta || []).filter(Boolean).map((m) => {
      if (m instanceof SafeHTML) return html`<span class="item">${m}</span>`;
      if (typeof m === 'object') return html`<span class="item">${m.icon ? icon(m.icon, 16) : ''}${m.text}</span>`;
      return html`<span class="item">${m}</span>`;
    });
    return html`<header class="page-head">
      <div class="page-head-main">
        <h1 class="page-title">${o.title}</h1>
        ${meta.length ? html`<div class="page-meta">${meta}</div>` : ''}
        ${o.desc ? html`<p class="page-desc">${o.desc}</p>` : ''}
      </div>
      ${o.actions ? html`<div class="page-actions">${o.actions}</div>` : ''}
    </header>`;
  }

  function kpi(o) {
    const val = typeof o.value === 'number' ? fmt.num(o.value, o.decimals) : o.value;
    const cls = `kpi${o.tone ? ' tone-' + o.tone : ''}${o.class ? ' ' + o.class : ''}`;
    const inner = html`<div class="kpi-top"><span class="kpi-label">${o.label}</span>${o.icon ? icon(o.icon, 18) : ''}</div>
      <div class="kpi-value"><span class="kpi-num">${val}</span>${o.unit ? html`<span class="kpi-unit">${o.unit}</span>` : ''}</div>
      ${o.sub ? html`<div class="kpi-sub">${o.sub}</div>` : ''}`;
    if (o.href) return html`<a class="${cls}" href="${o.href}" ${attrs({ id: o.id })}>${inner}</a>`;
    if (o.action) return html`<button type="button" class="${cls}" data-action="${o.action}" ${attrs({ id: o.id })}>${inner}</button>`;
    return html`<div class="${cls}" ${attrs({ id: o.id })}>${inner}</div>`;
  }

  const CHIPS = {
    ok: ['ok', 'OK'], conforme: ['ok', 'Conforme'], approved: ['ok', 'Aprobado'], aprobado: ['ok', 'Aprobado'],
    done: ['ok', 'Completado'], published: ['ok', 'Publicado'], sent: ['ok', 'Enviado'], created: ['ok', 'Creado'],
    resolved: ['ok', 'Resuelto'], released: ['ok', 'Liberado'],
    warning: ['warn', 'Aviso'], warn: ['warn', 'Aviso'], aviso: ['warn', 'Aviso'], pending: ['warn', 'Pendiente'],
    pendiente: ['warn', 'Pendiente'], waiting: ['warn', 'Esperando aprobación'], review: ['warn', 'Requiere revisión'],
    open: ['warn', 'Abierta'], evaluate: ['warn', 'A evaluar'],
    critical: ['crit', 'Crítico'], crit: ['crit', 'Crítico'], critico: ['crit', 'Crítico'], blocked: ['crit', 'Bloqueado'],
    bloqueado: ['crit', 'Bloqueado'], hold: ['crit', 'Retenido'], error: ['crit', 'Error'],
    info: ['info', 'Info'], brand: ['brand', ''], neutral: ['neutral', ''], draft: ['draft', 'Borrador'],
    borrador: ['draft', 'Borrador'], rejected: ['neutral', 'Rechazado'], rechazado: ['neutral', 'Rechazado'],
    running: ['brand', 'En curso'], active: ['brand', 'Activo'], updated: ['info', 'Actualizada'],
    planned: ['info', 'Planificada'], shipped: ['neutral', 'Expedida'], closed: ['neutral', 'Cerrada'],
    pcc: ['pcc', 'PCC', false]
  };
  const TONES = new Set(['ok', 'warn', 'crit', 'info', 'brand', 'neutral', 'draft', 'pcc']);
  /** chip('critical') · chip('ok', 'Conforme') · chip({tone: 'brand', label: 'v1', icon: 'git-branch'}) */
  function chip(status, label, opts) {
    let o = opts || {};
    let st = status;
    let lb = label;
    if (status && typeof status === 'object' && !(status instanceof SafeHTML)) { o = status; st = o.status || o.tone; lb = o.label; }
    const key = String(st || 'neutral').toLowerCase();
    const def = CHIPS[key] || [TONES.has(key) ? key : 'neutral', String(st || '')];
    const tone = o.tone || def[0];
    const text = lb != null ? lb : def[1];
    const withDot = o.dot != null ? o.dot : def[2] !== false;
    const lead = o.icon ? icon(o.icon, 13) : (withDot ? raw('<span class="dot"></span>') : '');
    const cls = `chip chip-${tone}${o.size ? ' chip-' + o.size : ''}${key === 'running' ? ' is-running' : ''}`;
    return html`<span class="${cls}" ${attrs({ title: o.title })}>${lead}${text}</span>`;
  }

  const SYSTEM_ICONS = {
    'SAP': 'database', 'SAP QM': 'shield-check', 'SAP PP': 'database', 'SAP SD': 'database',
    'MES Mapex': 'factory', 'Mapex': 'factory', 'Siemens Opcenter APS': 'calendar', 'Opcenter APS': 'calendar', 'Opcenter': 'calendar',
    'Mecalux Easy WMS': 'warehouse', 'Easy WMS': 'warehouse', 'SCADA Galileo': 'activity', 'Galileo/SCADA': 'activity', 'Galileo': 'activity',
    'Elara': 'clipboard', 'Microsoft Teams': 'message-square', 'Teams': 'message-square', 'Outlook': 'mail', 'Microsoft 365': 'mail',
    'Correo': 'mail', 'GMAO': 'wrench', 'Prodigy': 'workflow', 'Modelo de lenguaje': 'cpu', 'Procedimientos': 'book-open'
  };
  const INTERNAL_SYSTEMS = new Set(['Prodigy', 'Modelo de lenguaje', 'Procedimientos']);
  /** Insignia de sistema con tooltip «conector de demostración». */
  function sys(name, opts) {
    const o = opts || {};
    const n = String(name);
    const ic = o.icon || SYSTEM_ICONS[n] || 'database';
    const tip = o.title || (INTERNAL_SYSTEMS.has(n) ? n : `${n} · conector de demostración`);
    return html`<span class="sys" title="${tip}">${icon(ic, 12)}${n}</span>`;
  }
  function sysList(names) { return html`<span class="sys-list">${(names || []).map((n) => sys(n))}</span>`; }

  /** Código de lote que abre la traza al pulsarlo (data-lot). */
  function lotTag(code, opts) {
    const o = opts || {};
    return html`<button type="button" class="lot" data-lot="${code}" title="Ver la traza del lote ${code}">${o.icon === false ? '' : icon('git-branch', 12)}${o.label || code}</button>`;
  }

  function alignCls(c) { return c.num ? 'num' : c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : ''; }
  function cellValue(c, r, i) {
    if (c.render) return c.render(r, i);
    const v = r[c.key];
    if (c.mono) return html`<span class="code">${v}</span>`;
    if (typeof v === 'number') return fmt.num(v);
    return v == null || v === '' ? '—' : v;
  }
  /** Tabla densa. En móvil (≤720 px) se apila en tarjetas salvo stack:false. */
  function table(o) {
    const cols = o.cols || [];
    const rows = o.rows || [];
    const stack = o.stack !== false;
    const cls = ['tbl', o.dense ? 'dense' : '', stack ? 'tbl-stack' : '', o.class || ''].filter(Boolean).join(' ');
    const head = html`<thead><tr>${cols.map((c) => html`<th scope="col" class="${alignCls(c)}" ${attrs({ style: c.width ? `width:${c.width}` : null })}>${c.label || ''}</th>`)}</tr></thead>`;
    const body = rows.length ? rows.map((r, i) => {
      const clickable = typeof o.clickable === 'function' ? o.clickable(r, i) : !!o.clickable;
      const key = o.rowKey ? (typeof o.rowKey === 'function' ? o.rowKey(r, i) : r[o.rowKey]) : null;
      const rc = [o.rowClass ? o.rowClass(r, i) : '', clickable ? 'is-clickable' : ''].filter(Boolean).join(' ');
      const ra = Object.assign({ class: rc || null, 'data-key': key, tabindex: clickable ? '0' : null }, o.rowAttrs ? o.rowAttrs(r, i) : null);
      return html`<tr ${attrs(ra)}>${cols.map((c, ci) => {
        const tdc = [alignCls(c), c.className || '', ci === 0 && stack && o.stackPrimary !== false ? 'cell-primary' : ''].filter(Boolean).join(' ');
        return html`<td ${attrs({ class: tdc || null, 'data-label': c.stackLabel != null ? c.stackLabel : (c.label || '') })}>${cellValue(c, r, i)}</td>`;
      })}</tr>`;
    }) : html`<tr><td class="tbl-empty" colspan="${cols.length}" data-label="">${o.empty || 'Sin datos'}</td></tr>`;
    return html`<div class="tbl-wrap"><table class="${cls}">${o.caption ? html`<caption>${o.caption}</caption>` : ''}${o.hideHead ? '' : head}<tbody>${body}</tbody></table></div>`;
  }

  function card(o) {
    const hasHead = o.title || o.icon || o.actions;
    const head = hasHead ? html`<div class="card-head${o.plainHead ? ' plain' : ''}">
        ${o.icon ? html`<span class="card-icon${o.iconTone ? ' tone-' + o.iconTone : ''}">${icon(o.icon, 18)}</span>` : ''}
        <div class="card-titles">${o.title ? html`<h2 class="card-title">${o.title}</h2>` : ''}${o.sub ? html`<div class="card-sub">${o.sub}</div>` : ''}</div>
        ${o.actions ? html`<div class="card-actions">${o.actions}</div>` : ''}
      </div>` : '';
    const cls = `card${o.tone ? ' tone-' + o.tone : ''}${o.class ? ' ' + o.class : ''}`;
    return html`<section ${attrs(Object.assign({ class: cls, id: o.id }, o.attrs))}>${head}${o.body != null ? html`<div class="card-body${o.flush ? ' flush' : ''}">${o.body}</div>` : ''}${o.footer ? html`<div class="card-foot">${o.footer}</div>` : ''}</section>`;
  }

  /** Pestañas accesibles; el cambio lo gestiona el núcleo y emite 'tabchange' {id, tab}. */
  function tabs(o) {
    const id = o.id || uid('tabs');
    const list = o.tabs || [];
    const active = o.active || (list[0] && list[0].id);
    return html`<div class="tabs${o.flush ? ' flush' : ''}" data-tabs="${id}">
      <div class="tab-list" role="tablist" ${attrs({ 'aria-label': o.label })}>${list.map((t) => html`<button type="button" class="tab" role="tab" id="${id}-tab-${t.id}" aria-controls="${id}-panel-${t.id}" aria-selected="${t.id === active ? 'true' : 'false'}" tabindex="${t.id === active ? '0' : '-1'}" data-tab="${t.id}">${t.icon ? icon(t.icon, 16) : ''}<span>${t.label}</span>${t.count != null ? html`<span class="count">${t.count}</span>` : ''}</button>`)}</div>
      ${list.map((t) => html`<div class="tab-panel" role="tabpanel" id="${id}-panel-${t.id}" aria-labelledby="${id}-tab-${t.id}" data-panel="${t.id}" ${t.id === active ? '' : raw('hidden')}>${t.body}</div>`)}
    </div>`;
  }
  function activateTab(tabBtn) {
    const wrap = tabBtn.closest('[data-tabs]');
    if (!wrap) return;
    const id = tabBtn.getAttribute('data-tab');
    const tablist = tabBtn.closest('[role="tablist"]');
    tablist.querySelectorAll('[role="tab"]').forEach((b) => {
      const on = b === tabBtn;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.setAttribute('tabindex', on ? '0' : '-1');
    });
    Array.from(wrap.children).filter((el) => el.matches('[data-panel]')).forEach((p) => { p.hidden = p.getAttribute('data-panel') !== id; });
    wrap.dispatchEvent(new CustomEvent('tabchange', { bubbles: true, detail: { id: wrap.getAttribute('data-tabs'), tab: id } }));
  }

  /** Control segmentado; emite 'segchange' {name, value} en el propio .seg */
  function segmented(o) {
    return html`<div class="seg" role="group" data-seg="${o.name || ''}" ${attrs({ 'aria-label': o.label })}>${(o.options || []).map((op) => html`<button type="button" class="seg-btn" aria-pressed="${String(op.value) === String(o.value) ? 'true' : 'false'}" data-value="${op.value}">${op.tone ? html`<span class="dot tone-${op.tone}"></span>` : ''}${op.icon ? icon(op.icon, 15) : ''}${op.label}${op.count != null ? html`<span class="count">${op.count}</span>` : ''}</button>`)}</div>`;
  }
  function selectSeg(btn) {
    const seg = btn.closest('.seg');
    if (!seg) return;
    seg.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    seg.dispatchEvent(new CustomEvent('segchange', { bubbles: true, detail: { name: seg.getAttribute('data-seg'), value: btn.getAttribute('data-value') } }));
  }

  /** Línea de tiempo vertical: items [{time, timeSub, title, text, tone, meta}] */
  function timeline(o) {
    const items = Array.isArray(o) ? o : (o.items || []);
    const compact = !Array.isArray(o) && o.compact;
    return html`<ol class="tl${compact ? ' compact' : ''}">${items.map((it) => html`<li class="tl-item${it.tone ? ' tone-' + it.tone : ''}">
      <div class="tl-time">${it.time || ''}${it.timeSub ? html`<span class="sub">${it.timeSub}</span>` : ''}</div>
      <div class="tl-mark"><span class="tl-dot"></span></div>
      <div class="tl-content"><div class="tl-title">${it.title}</div>${it.text ? html`<div class="tl-text">${it.text}</div>` : ''}${it.meta ? html`<div class="tl-meta">${it.meta}</div>` : ''}</div>
    </li>`)}</ol>`;
  }

  const TONE_ICON = { ok: 'check-circle', warn: 'alert-triangle', crit: 'alert-circle', brand: 'info', info: 'info', neutral: 'info' };
  function callout(o) {
    const tone = o.tone || 'brand';
    return html`<div class="callout callout-${tone}${o.class ? ' ' + o.class : ''}" ${attrs(o.attrs)}>${icon(o.icon || TONE_ICON[tone] || 'info', 18)}<div class="callout-body">${o.title ? html`<div class="callout-title">${o.title}</div>` : ''}${o.body || ''}${o.actions ? html`<div class="callout-actions">${o.actions}</div>` : ''}</div></div>`;
  }
  function empty(o) {
    return html`<div class="empty">${html`<div class="empty-icon">${icon(o.icon || 'inbox', 24)}</div>`}<div class="empty-title">${o.title}</div>${o.text ? html`<p class="empty-text">${o.text}</p>` : ''}${o.actions ? html`<div class="empty-actions">${o.actions}</div>` : ''}</div>`;
  }
  /** Pares clave-valor: kv([['Lote', 'L26-…'], ['Palés', '38']], {cols: 2}) */
  function kv(pairs, opts) {
    const o = opts || {};
    return html`<dl class="kv${o.cols === 2 ? ' kv-2' : ''}">${(pairs || []).filter(Boolean).map(([k, v]) => html`<dt>${k}</dt><dd>${v == null || v === '' ? '—' : v}</dd>`)}</dl>`;
  }
  /** Fila de cifras: stats([{label, value, tone}]) */
  function stats(items) {
    return html`<div class="stat-row">${(items || []).map((s) => html`<div class="stat${s.tone ? ' tone-' + s.tone : ''}"><div class="stat-num">${typeof s.value === 'number' ? fmt.num(s.value) : s.value}</div><div class="stat-label">${s.label}</div></div>`)}</div>`;
  }
  /** Elemento de bandeja/listado: {icon, tone, title, meta:[…], body, side, done, attrs} */
  function listItem(it) {
    const meta = (it.meta || []).filter(Boolean);
    return html`<li ${attrs(Object.assign({ class: `list-item${it.done ? ' is-done' : ''}` }, it.attrs))}>
      <span class="li-icon${it.tone ? ' tone-' + it.tone : ''}">${icon(it.icon || 'circle', 18)}</span>
      <div class="li-main"><div class="li-title">${it.title}</div>${meta.length ? html`<div class="li-meta">${meta.map((m, i) => html`${i ? raw('<span class="sep"></span>') : ''}<span>${m}</span>`)}</div>` : ''}${it.body ? html`<div class="li-body">${it.body}</div>` : ''}</div>
      ${it.side ? html`<div class="li-side">${it.side}</div>` : ''}
    </li>`;
  }
  function list(items) { return html`<ul class="list">${(items || []).map(listItem)}</ul>`; }

  /* ================================================================ Medida de texto (SVG) */

  let measureCtx = null;
  function textWidth(text, size, weight) {
    try {
      measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
      measureCtx.font = `${weight || 400} ${size}px Inter, system-ui, -apple-system, 'Segoe UI', sans-serif`;
      return measureCtx.measureText(t(String(text))).width * 1.04;
    } catch (e) {
      return String(text).length * size * 0.6;
    }
  }
  function ellipsize(text, maxW, size, weight) {
    let t = I18N ? I18N.text(String(text)) : String(text);
    if (textWidth(t, size, weight) <= maxW) return t;
    while (t.length > 1 && textWidth(t + '…', size, weight) > maxW) t = t.slice(0, -1);
    return t.trimEnd() + '…';
  }
  function wrapText(text, maxW, size, weight, maxLines) {
    const words = t(String(text || '')).split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    words.forEach((w) => {
      const t = cur ? cur + ' ' + w : w;
      if (!cur || textWidth(t, size, weight) <= maxW) cur = t;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      kept[maxLines - 1] = ellipsize(lines.slice(maxLines - 1).join(' '), maxW, size, weight);
      return kept;
    }
    return lines.map((l) => ellipsize(l, maxW, size, weight));
  }

  /* ================================================================ Grafo del workflow */

  const PG_KIND = { trigger: 'Disparador', agent: 'Agente', approval: 'Aprobación', output: 'Salida', action: 'Acción', decision: 'Condición' };
  const PG_ICON = { trigger: 'bell', agent: 'cpu', approval: 'user-check', output: 'file-text', action: 'play', decision: 'git-branch' };
  const PG_STATUS = ['pending', 'active', 'done', 'waiting', 'error', 'rejected', 'skipped'];

  function pgLayers(nodes, edges) {
    const layer = {};
    nodes.forEach((n) => { layer[n.id] = 0; });
    for (let k = 0; k < nodes.length; k++) {
      let changed = false;
      edges.forEach((e) => {
        if (layer[e.from] == null || layer[e.to] == null) return;
        if (layer[e.to] < layer[e.from] + 1) { layer[e.to] = layer[e.from] + 1; changed = true; }
      });
      if (!changed) break;
    }
    const out = [];
    nodes.forEach((n) => { const L = n.layer != null ? n.layer : layer[n.id]; (out[L] = out[L] || []).push(n); });
    return out.filter(Boolean);
  }
  function pgPackBadges(listNames, maxW) {
    const rows = [];
    let row = [];
    let x = 0;
    (listNames || []).forEach((name) => {
      const w = Math.ceil(textWidth(name, 9.5, 600)) + 12;
      if (row.length && x + w > maxW) { rows.push(row); row = []; x = 0; }
      row.push({ name, x, w: Math.min(w, maxW) });
      x += w + 4;
    });
    if (row.length) rows.push(row);
    return rows;
  }
  function pgMeasure(n, W) {
    const inner = W - 24;
    const titleLines = wrapText(n.label || '', inner, 12.5, 600, 2);
    const sub = n.sub ? ellipsize(n.sub, inner, 11, 400) : '';
    const sysRows = pgPackBadges(n.systems, inner);
    let h = 10 + 14 + 6 + titleLines.length * 16;
    if (sub) h += 15;
    if (sysRows.length) h += 8 + sysRows.length * 20 - 4;
    h += 12;
    return { titleLines, sub, sysRows, h: Math.max(h, 64) };
  }
  function pgStatusMarks(x, y) {
    return `<g class="pg-st" transform="translate(${r1(x)},${r1(y)})">`
      + '<g class="st st-pending"><circle cx="7" cy="7" r="5.5"/></g>'
      + '<g class="st st-active"><circle class="track" cx="7" cy="7" r="5.5"/><circle class="arc" cx="7" cy="7" r="5.5"/></g>'
      + '<g class="st st-done"><circle cx="7" cy="7" r="7"/><path d="M4 7.2l2 2 4-4.2"/></g>'
      + '<g class="st st-waiting"><circle cx="7" cy="7" r="7"/><path d="M7 3.8V7l2 1.3"/></g>'
      + '<g class="st st-error"><circle cx="7" cy="7" r="7"/><path d="M4.8 4.8l4.4 4.4M9.2 4.8l-4.4 4.4"/></g>'
      + '<g class="st st-rejected"><circle cx="7" cy="7" r="7"/><path d="M4.8 4.8l4.4 4.4M9.2 4.8l-4.4 4.4"/></g>'
      + '<g class="st st-skipped"><circle cx="7" cy="7" r="7"/><path d="M4.5 7h5"/></g>'
      + '</g>';
  }
  function pgNode(n, p, mm) {
    const kind = n.kind || 'agent';
    const st = PG_STATUS.includes(n.status) ? n.status : 'pending';
    const ic = n.icon || PG_ICON[kind] || 'circle';
    const kindLabel = (n.kindLabel || PG_KIND[kind] || kind).toUpperCase();
    const out = [];
    let y = 10;
    out.push(`<rect class="pg-box" x="0" y="0" width="${p.w}" height="${p.h}" rx="8"/>`);
    out.push(`<svg class="pg-ico" x="12" y="${y}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[ic] || ICONS.circle}</svg>`);
    out.push(`<text class="pg-kind" x="31" y="${y + 10.5}">${esc(ellipsize(kindLabel, p.w - 31 - 30, 9.5, 600))}</text>`);
    out.push(pgStatusMarks(p.w - 26, y));
    y += 20;
    mm.titleLines.forEach((line, i) => { out.push(`<text class="pg-title" x="12" y="${y + 12 + i * 16}">${esc(line)}</text>`); });
    y += mm.titleLines.length * 16;
    if (mm.sub) { out.push(`<text class="pg-sub" x="12" y="${y + 12}">${esc(mm.sub)}</text>`); y += 15; }
    if (mm.sysRows.length) {
      y += 8;
      mm.sysRows.forEach((row, ri) => row.forEach((b) => {
        out.push(`<g class="pg-sysb" transform="translate(${r1(12 + b.x)},${r1(y + ri * 20)})"><rect width="${r1(b.w)}" height="16" rx="3"/><text x="6" y="11.5">${esc(b.name)}</text></g>`);
      }));
    }
    const tip = `${PG_KIND[kind] || ''}: ${n.label}${n.systems && n.systems.length ? ' · ' + n.systems.join(', ') : ''}${n.sub ? ' · ' + n.sub : ''}`;
    return `<g class="pg-node kind-${esc(kind)} is-${st}" data-node="${esc(n.id)}" transform="translate(${r1(p.x)},${r1(p.y)})"><title>${esc(tip)}</title>${out.join('')}</g>`;
  }
  function pgEdgeStatus(a, b) {
    if (a === 'done' && (b === 'active' || b === 'waiting')) return 'active';
    if (a === 'done' && (b === 'done' || b === 'error')) return 'done';
    return 'pending';
  }
  function pgRender(nodes, edges, o, mode) {
    const W = mode === 'lr' ? o.nodeWidth : o.nodeWidthTB;
    const labelW = edges.reduce((mx, e) => (e.label ? Math.max(mx, textWidth(e.label, 10.5, 500) + 18) : mx), 0);
    const gx = mode === 'lr' ? Math.max(o.gapX, labelW) : 16;
    const gy = mode === 'lr' ? o.gapY : 30;
    const PAD = 6;
    const m = {};
    nodes.forEach((n) => { m[n.id] = pgMeasure(n, W); });
    const L = pgLayers(nodes, edges);
    const pos = {};
    let totalW;
    let totalH;
    if (mode === 'lr') {
      const colH = L.map((col) => col.reduce((s, n) => s + m[n.id].h, 0) + (col.length - 1) * gy);
      const maxH = Math.max.apply(null, colH);
      L.forEach((col, ci) => {
        let y = PAD + (maxH - colH[ci]) / 2;
        col.forEach((n) => { pos[n.id] = { x: PAD + ci * (W + gx), y, w: W, h: m[n.id].h }; y += m[n.id].h + gy; });
      });
      totalW = PAD * 2 + L.length * W + (L.length - 1) * gx;
      totalH = PAD * 2 + maxH;
    } else {
      const rowW = L.map((row) => row.length * W + (row.length - 1) * gx);
      const maxW = Math.max.apply(null, rowW);
      let y = PAD;
      L.forEach((row, ri) => {
        const rh = Math.max.apply(null, row.map((n) => m[n.id].h));
        let x = PAD + (maxW - rowW[ri]) / 2;
        row.forEach((n) => { pos[n.id] = { x, y: y + (rh - m[n.id].h) / 2, w: W, h: m[n.id].h }; x += W + gx; });
        y += rh + gy;
      });
      totalW = PAD * 2 + maxW;
      totalH = y - gy + PAD;
    }
    const statusOf = {};
    nodes.forEach((n) => { statusOf[n.id] = n.status || 'pending'; });
    const edgeSvg = edges.map((e) => {
      const a = pos[e.from];
      const b = pos[e.to];
      if (!a || !b) return '';
      let d;
      let arrow;
      let lx;
      let ly;
      if (mode === 'lr') {
        const x1 = a.x + a.w; const y1 = a.y + a.h / 2; const x2 = b.x; const y2 = b.y + b.h / 2;
        const dx = Math.max(16, (x2 - x1) / 2);
        d = `M${r1(x1)},${r1(y1)} C${r1(x1 + dx)},${r1(y1)} ${r1(x2 - dx)},${r1(y2)} ${r1(x2 - 7)},${r1(y2)}`;
        arrow = `M${r1(x2 - 8)},${r1(y2 - 4.5)} L${r1(x2)},${r1(y2)} L${r1(x2 - 8)},${r1(y2 + 4.5)} Z`;
        lx = (x1 + x2) / 2; ly = (y1 + y2) / 2 - 7;
      } else {
        const x1 = a.x + a.w / 2; const y1 = a.y + a.h; const x2 = b.x + b.w / 2; const y2 = b.y;
        const dy = Math.max(10, (y2 - y1) / 2);
        d = `M${r1(x1)},${r1(y1)} C${r1(x1)},${r1(y1 + dy)} ${r1(x2)},${r1(y2 - dy)} ${r1(x2)},${r1(y2 - 7)}`;
        arrow = `M${r1(x2 - 4.5)},${r1(y2 - 8)} L${r1(x2)},${r1(y2)} L${r1(x2 + 4.5)},${r1(y2 - 8)} Z`;
        lx = (x1 + x2) / 2 + 8; ly = (y1 + y2) / 2 + 4;
      }
      const est = pgEdgeStatus(statusOf[e.from], statusOf[e.to]);
      let label = '';
      if (e.label) {
        const tw = textWidth(e.label, 10.5, 500) + 8;
        const rx = mode === 'lr' ? lx - tw / 2 : lx - 4;
        label = `<g class="pg-edge-label"><rect x="${r1(rx)}" y="${r1(ly - 10)}" width="${r1(tw)}" height="14" rx="3"/><text x="${r1(rx + 4)}" y="${r1(ly + 0.5)}">${esc(e.label)}</text></g>`;
      }
      return `<g class="pg-edge is-${est}" data-from="${esc(e.from)}" data-to="${esc(e.to)}"><path class="pg-line" d="${d}"/><path class="pg-arrow" d="${arrow}"/>${label}</g>`;
    }).join('');
    const nodeSvg = nodes.map((n) => (pos[n.id] ? pgNode(n, pos[n.id], m[n.id]) : '')).join('');
    const aria = `${o.title || 'Workflow'}: ${nodes.map((n) => n.label).join(', ')}`;
    const style = `max-width:${r1(totalW)}px${mode === 'lr' ? `;min-width:${Math.min(r1(totalW), o.minWidth)}px` : ''}`;
    return `<svg class="pg pg-${mode}" viewBox="0 0 ${r1(totalW)} ${r1(totalH)}" width="${r1(totalW)}" height="${r1(totalH)}" style="${style};width:100%" role="img" aria-label="${esc(aria)}">${edgeSvg}${nodeSvg}</svg>`;
  }
  /**
   * Grafo SVG del workflow. nodes: [{id, label, sub, kind: trigger|agent|approval|output|action, systems: [], icon, status}]
   * edges: [['a','b'], {from, to, label}] · activeId · status: {id: 'done'|'active'|'waiting'|'error'|'rejected'|'skipped'}
   * layout: 'auto' (horizontal; vertical en móvil) | 'lr' | 'tb'
   */
  function planGraph(opts) {
    const o = Object.assign({ nodes: [], edges: [], activeId: null, status: null, layout: 'auto', nodeWidth: 176, nodeWidthTB: 260, gapX: 38, gapY: 14, minWidth: 640, title: 'Workflow' }, opts || {});
    const nodes = o.nodes.map((n) => Object.assign({ kind: 'agent', status: 'pending', systems: [] }, n));
    if (o.status) Object.keys(o.status).forEach((id) => { const n = nodes.find((x) => x.id === id); if (n) n.status = o.status[id]; });
    if (o.activeId) { const a = nodes.find((n) => n.id === o.activeId); if (a && a.status === 'pending') a.status = 'active'; }
    const edges = (o.edges || []).map((e) => (Array.isArray(e) ? { from: e[0], to: e[1], label: e[2] } : e));
    const lr = o.layout !== 'tb' ? pgRender(nodes, edges, o, 'lr') : '';
    const tb = o.layout !== 'lr' ? pgRender(nodes, edges, o, 'tb') : '';
    let autoAttr = '';
    if (o.layout === 'auto') {
      const gid = uid('pg');
      autoGraphs.set(gid, { nodes, edges, o, t: Date.now() });
      autoAttr = ` data-pg-auto="${gid}"`;
      scheduleChartFit();
    }
    return raw(`<div class="pg-wrap ${o.layout === 'auto' ? 'auto' : esc(o.layout)}" data-plan-graph${autoAttr}${o.id ? ` id="${esc(o.id)}"` : ''}>${lr}${tb}</div>`);
  }
  /* Grafos 'auto': al ancho real del contenedor (nodos de 140–210 px; vertical si no caben). Conserva los estados del DOM. */
  const autoGraphs = new Map();
  function fitGraphs() {
    const seen = new Set();
    document.querySelectorAll('[data-pg-auto]').forEach((el) => {
      const gid = el.getAttribute('data-pg-auto');
      seen.add(gid);
      const cfg = autoGraphs.get(gid);
      const w = Math.round(el.clientWidth);
      if (chartRO && !el.__observed) { el.__observed = true; chartRO.observe(el); }
      if (!cfg || w < 40 || el.getAttribute('data-w') === String(w)) return;
      el.querySelectorAll('[data-node]').forEach((g) => {
        const n = cfg.nodes.find((x) => x.id === g.getAttribute('data-node'));
        const st = PG_STATUS.find((st0) => g.classList.contains('is-' + st0));
        if (n && st) n.status = st;
      });
      const cols = pgLayers(cfg.nodes, cfg.edges).length || 1;
      const labelW = cfg.edges.reduce((mx, e) => (e.label ? Math.max(mx, textWidth(e.label, 10.5, 500) + 18) : mx), 0);
      const gx = Math.max(cfg.o.gapX, labelW);
      const fitW = Math.floor((w - 12 - (cols - 1) * gx) / cols);
      let out;
      if (fitW >= 116) {
        out = pgRender(cfg.nodes, cfg.edges, Object.assign({}, cfg.o, { nodeWidth: clamp(fitW, 140, 210), minWidth: 0 }), 'lr');
      } else {
        out = pgRender(cfg.nodes, cfg.edges, Object.assign({}, cfg.o, { nodeWidthTB: clamp(w - 12, 200, 320) }), 'tb');
      }
      el.setAttribute('data-w', String(w));
      el.classList.remove('auto');
      el.innerHTML = out;
    });
    autoGraphs.forEach((v, k) => { if (!seen.has(k) && Date.now() - v.t > 5000) autoGraphs.delete(k); });
  }
  /** Cambia estados sin volver a pintar: App.planGraph.set(contenedor, {a1: 'done', a2: 'active'}) */
  planGraph.set = function (scope, statuses) {
    const root = scope || document;
    Object.keys(statuses || {}).forEach((id) => {
      const st = PG_STATUS.includes(statuses[id]) ? statuses[id] : 'pending';
      root.querySelectorAll(`[data-plan-graph] [data-node="${cssEsc(id)}"]`).forEach((g) => {
        PG_STATUS.forEach((s) => g.classList.remove('is-' + s));
        g.classList.add('is-' + st);
      });
    });
    root.querySelectorAll('[data-plan-graph] svg.pg').forEach((svg) => {
      svg.querySelectorAll('.pg-edge').forEach((e) => {
        const a = svg.querySelector(`[data-node="${cssEsc(e.getAttribute('data-from'))}"]`);
        const b = svg.querySelector(`[data-node="${cssEsc(e.getAttribute('data-to'))}"]`);
        const sa = a ? (PG_STATUS.find((s) => a.classList.contains('is-' + s)) || 'pending') : 'pending';
        const sb = b ? (PG_STATUS.find((s) => b.classList.contains('is-' + s)) || 'pending') : 'pending';
        ['pending', 'active', 'done'].forEach((s) => e.classList.remove('is-' + s));
        e.classList.add('is-' + pgEdgeStatus(sa, sb));
      });
    });
  };

  /* ================================================================ Registro de razonamiento */

  /**
   * Pinta pasos tipo log (agente · sistema · acción · resultado · ms) uno a uno.
   * steps: [{agent, system, action, result, ms, tone, wait}] · opts: {title, speed, signal, onStep, maxHeight, controls, start, instant}
   * instant:true pinta el registro ya completado (para volver a mostrar una ejecución terminada).
   * Devuelve {done: Promise<{ms, steps}>, accelerate(), finish(), stop(), ms}
   */
  function reasoningStream(el, steps, opts) {
    const o = Object.assign({ title: 'Registro de ejecución', speed: 1, maxHeight: 340, controls: true, signal: null, onStep: null, start: null, minDelay: 260, maxDelay: 1500 }, opts || {});
    const t0 = (o.start ? toDate(o.start) : now()).getTime();
    const total = steps.length;
    let speed = o.speed;
    let idx = 0;
    let simMs = 0;
    let finished = false;
    let stopped = false;
    let timer = null;
    let runningLi = null;
    let resolveDone;
    const done = new Promise((r) => { resolveDone = r; });
    el.innerHTML = String(html`<div class="rs" data-stream>
      <div class="rs-head">
        <span data-rs-state>${chip('running', 'En curso')}</span>
        <span class="rs-title">${o.title}</span>
        <span class="rs-stats"><span data-rs-count>0 de ${total} pasos</span> · <span data-rs-time>0 ms</span></span>
        ${o.controls && !o.instant ? html`<span class="rs-controls"><button type="button" class="btn btn-ghost btn-sm" data-rs="fast">${icon('fast-forward', 15)}<span>Acelerar</span></button><button type="button" class="btn btn-ghost btn-sm" data-rs="all"><span>Mostrar todo</span></button></span>` : ''}
      </div>
      <ol class="rs-list" style="--rs-max:${o.maxHeight}px"></ol>
    </div>`);
    const box = el.querySelector('.rs');
    const listEl = el.querySelector('.rs-list');
    const countEl = el.querySelector('[data-rs-count]');
    const timeEl = el.querySelector('[data-rs-time]');
    const stateEl = el.querySelector('[data-rs-state]');
    function stamp(ms) {
      const d = new Date(t0 + ms);
      return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
    }
    function lineHTML(s, running, startMs) {
      return html`<span class="rs-time">${stamp(startMs)}</span>
        <span class="rs-who"><span class="rs-agent">${s.agent || ''}</span>${s.system ? sys(s.system) : ''}</span>
        <span class="rs-text"><span class="rs-action">${s.action || ''}</span><span class="rs-result">${running ? raw('<span class="typing" aria-hidden="true"><i></i><i></i><i></i></span>') : html`${icon('arrow-right', 13)}<span>${s.result || 'Hecho'}</span>`}</span></span>
        <span class="rs-ms">${running ? raw('<span class="spinner" aria-hidden="true"></span>') : fmt.ms(s.ms || 0)}</span>`;
    }
    function begin(s) {
      const li = document.createElement('li');
      li.className = 'rs-line is-new is-running';
      li.dataset.start = String(simMs);
      li.innerHTML = String(lineHTML(s, true, simMs));
      listEl.appendChild(li);
      listEl.scrollTop = listEl.scrollHeight;
      return li;
    }
    function complete(li, s, k) {
      const start = Number(li.dataset.start) || 0;
      simMs += Number(s.ms) || 0;
      li.classList.remove('is-running');
      if (s.tone) li.classList.add('tone-' + s.tone);
      li.innerHTML = String(lineHTML(s, false, start));
      countEl.textContent = `${k + 1} de ${total} pasos`;
      timeEl.textContent = fmt.ms(simMs);
      listEl.scrollTop = listEl.scrollHeight;
      if (o.onStep) { try { o.onStep(s, k); } catch (e) { console.error(e); } }
    }
    function alive() { return !stopped && el.isConnected && !(o.signal && o.signal.aborted); }
    function finish() {
      if (finished) return;
      finished = true;
      stateEl.innerHTML = String(chip('done', 'Completado'));
      const c = box.querySelector('.rs-controls');
      if (c) c.remove();
      resolveDone({ ms: simMs, steps: total });
    }
    function tick() {
      if (!alive()) { stopped = true; return; }
      if (idx >= total) { finish(); return; }
      const s = steps[idx];
      runningLi = begin(s);
      const base = s.wait != null ? s.wait : (s.ms || 400);
      const delay = clamp(base, o.minDelay, o.maxDelay) / (speed * globalSpeed());
      timer = setTimeout(() => {
        if (!alive()) { stopped = true; return; }
        complete(runningLi, s, idx);
        runningLi = null;
        idx += 1;
        tick();
      }, delay);
    }
    function showAll() {
      if (finished || stopped) return;
      clearTimeout(timer);
      while (idx < total) {
        const li = runningLi || begin(steps[idx]);
        runningLi = null;
        complete(li, steps[idx], idx);
        idx += 1;
      }
      finish();
    }
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-rs]');
      if (!b) return;
      if (b.getAttribute('data-rs') === 'fast') {
        speed *= 4;
        b.disabled = true;
        b.innerHTML = String(html`${icon('fast-forward', 15)}<span>Acelerado ×4</span>`);
      } else showAll();
    });
    if (o.signal) o.signal.addEventListener('abort', () => { stopped = true; clearTimeout(timer); }, { once: true });
    if (o.instant) { showAll(); listEl.scrollTop = 0; } else timer = setTimeout(tick, 140);
    return {
      done,
      accelerate(f) { speed *= f || 4; },
      finish: showAll,
      stop() { stopped = true; clearTimeout(timer); },
      get ms() { return simMs; }
    };
  }

  /* ================================================================ Aprobación, documento, correo */

  /**
   * Tarjeta de aprobación humana. status: 'pending' | 'approved' | 'rejected'.
   * Botones con data-approval="approve|reject|edit" y data-approval-id; la escena los escucha con ctx.on().
   */
  function approvalCard(o) {
    const st = o.status || 'pending';
    const id = o.id || 'approval';
    const when = o.decidedAt ? fmt.time(o.decidedAt) : '';
    const headIcon = st === 'approved' ? 'check-circle' : st === 'rejected' ? 'x-circle' : 'user-check';
    const headText = st === 'approved'
      ? `Aprobado${o.decidedBy ? ' por ' + o.decidedBy : ''}${when ? ' · ' + when : ''}`
      : st === 'rejected'
        ? `Rechazado${o.decidedBy ? ' por ' + o.decidedBy : ''}${when ? ' · ' + when : ''} · no se ha aplicado ninguna acción`
        : (o.pendingLabel || 'Aprobación requerida antes de actuar');
    const effectsTitle = st === 'approved' ? 'Acciones aplicadas' : st === 'rejected' ? 'Acciones no aplicadas' : (o.effectsTitle || 'Si se aprueba');
    const scope = (o.scope || []).map((s) => html`<li><span class="scope-label">${s.label}</span>${s.tone || s.status ? chip(s.status || s.tone, s.chip != null ? s.chip : undefined) : ''}<span class="scope-value">${s.value}</span></li>`);
    const effects = (o.effects || []).map((e) => (typeof e === 'object' && !(e instanceof SafeHTML)
      ? html`<li>${icon(e.icon || 'arrow-right', 15)}<span>${e.text}</span></li>`
      : html`<li>${icon(st === 'approved' ? 'check' : 'arrow-right', 15)}<span>${e}</span></li>`));
    const buttons = st === 'pending' ? html`
      ${o.editable ? html`<button type="button" class="btn btn-ghost" data-approval="edit" data-approval-id="${id}">${icon('edit')}<span>${o.editLabel || 'Editar alcance'}</span></button>` : ''}
      <button type="button" class="btn btn-secondary" data-approval="reject" data-approval-id="${id}">${icon('x')}<span>${o.rejectLabel || 'Rechazar'}</span></button>
      <button type="button" class="btn btn-primary" data-approval="approve" data-approval-id="${id}">${icon('check')}<span>${o.approveLabel || 'Aprobar'}</span></button>` : (o.doneActions || '');
    return html`<section class="approval is-${st}" data-approval-card="${id}">
      <div class="approval-head">${icon(headIcon, 18)}<span class="head-text">${headText}</span>${st === 'pending' && o.approver ? html`<span class="meta">Decide: ${o.approver}</span>` : ''}</div>
      <div class="approval-body">
        <div class="approval-title">${o.title}</div>
        ${o.summary ? html`<p class="approval-summary">${o.summary}</p>` : ''}
        ${scope.length ? html`<div class="approval-section"><div class="approval-label">${o.scopeTitle || 'Alcance'}</div><ul class="approval-scope">${scope}</ul></div>` : ''}
        ${effects.length ? html`<div class="approval-section"><div class="approval-label">${effectsTitle}</div><ul class="approval-effects">${effects}</ul></div>` : ''}
        ${o.extra || ''}
        ${o.comment ? html`<div class="approval-comment">${o.comment}</div>` : ''}
      </div>
      ${(o.policy || buttons) ? html`<div class="approval-foot">${o.policy ? html`<span class="approval-policy">${icon('shield-check', 15)}${o.policy}</span>` : html`<span class="spacer"></span>`}${buttons}</div>` : ''}
    </section>`;
  }

  /** Resalta fragmentos: highlightText(texto, [{text, label, tone, all}]) → SafeHTML con <mark> */
  function highlightText(text, hls) {
    const s = String(text == null ? '' : text);
    const ranges = [];
    (hls || []).forEach((h) => {
      const hh = typeof h === 'string' ? { text: h } : h;
      if (!hh || !hh.text) return;
      let from = 0;
      for (;;) {
        const i = s.indexOf(hh.text, from);
        if (i < 0) break;
        const j = i + hh.text.length;
        if (!ranges.some((r) => i < r.end && j > r.start)) ranges.push({ start: i, end: j, h: hh });
        from = j;
        if (!hh.all) break;
      }
    });
    ranges.sort((a, b) => a.start - b.start);
    let out = '';
    let pos = 0;
    ranges.forEach((r) => {
      out += esc(s.slice(pos, r.start));
      out += `<mark class="hl${r.h.tone ? ' hl-' + esc(r.h.tone) : ''}"${r.h.label ? ` data-label="${esc(r.h.label)}"` : ''}>${esc(s.slice(r.start, r.end))}${r.h.label ? `<span class="hl-tag">${esc(r.h.label)}</span>` : ''}</mark>`;
      pos = r.end;
    });
    out += esc(s.slice(pos));
    return raw(out);
  }

  /** Documento controlado: {code, title, version, date, owner, org, sections: [{id, heading, text, list}], highlight: {section, text, tone}} */
  function docPreview(o) {
    const hl = o.highlight || {};
    const metaBits = [o.version ? `Revisión ${o.version}` : '', o.date ? `Vigente desde ${fmt.date(o.date)}` : '', o.owner ? `Propietario: ${o.owner}` : ''].filter(Boolean);
    const mark = (t) => highlightText(t, [{ text: hl.text, tone: hl.tone, all: true }]);
    const sections = (o.sections || []).map((s) => {
      const on = !!(hl.section && hl.section === s.id);
      const doMark = !!hl.text && (!hl.section || on);
      const paras = Array.isArray(s.text) ? s.text : String(s.text || '').split(/\n{2,}/).filter(Boolean);
      const body = paras.map((p) => html`<p>${doMark ? mark(p) : p}</p>`);
      const items = s.list ? html`<ul>${s.list.map((li) => html`<li>${doMark ? mark(li) : li}</li>`)}</ul>` : '';
      return html`<section class="doc-sec${on ? ' is-hl' : ''}" data-section="${s.id || ''}">${s.heading ? html`<h4>${s.heading}</h4>` : ''}${body}${items}</section>`;
    });
    return html`<article class="doc" ${attrs({ 'data-doc': o.code })}>
      <header class="doc-head">
        <div class="doc-org">${o.org || 'Congelados de Navarra · Sistema de gestión de calidad'}</div>
        <div class="doc-title">${o.title}</div>
        <div class="doc-code">${o.code || ''}</div>
        ${metaBits.length ? html`<div class="doc-meta">${metaBits.map((b) => html`<span>${b}</span>`)}</div>` : ''}
      </header>
      <div class="doc-body">${sections}</div>
    </article>`;
  }

  /** Correo con extracciones resaltadas: {headers: {From, To, Date, Subject}, text, highlights, attachments} */
  function emailView(o) {
    const h = o.headers || {};
    const pairs = [['De', h.From || o.from], ['Para', h.To || o.to], ['Fecha', h.Date || o.date]].filter((p) => p[1]);
    const subject = h.Subject || o.subject;
    return html`<article class="email">
      ${subject ? html`<div class="email-subject">${o.highlightSubject ? highlightText(subject, o.highlights) : subject}</div>` : ''}
      ${pairs.length ? html`<dl class="email-head">${pairs.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>` : ''}
      <div class="email-body">${highlightText(o.text != null ? o.text : (o.body || ''), o.highlights)}</div>
      ${o.attachments && o.attachments.length ? html`<div class="email-attach">${o.attachments.map((a) => html`<span class="sys">${icon('file-text', 12)}${a}</span>`)}</div>` : ''}
    </article>`;
  }

  /* ================================================================ Gráfica de líneas */

  function niceStep(raw0) {
    const r = Math.abs(raw0) || 1;
    const p = Math.pow(10, Math.floor(Math.log10(r)));
    const m = [1, 2, 5, 10].find((k) => r <= k * p) || 10;
    return m * p;
  }
  function decimalsOf(v) { const s = String(v); const i = s.indexOf('.'); return i < 0 ? 0 : Math.min(2, s.length - i - 1); }
  function excursionPaths(data, t, X, Y, dir) {
    const above = (v) => (dir === 'low' ? v < t : v > t);
    const polys = [];
    let cur = null;
    const cross = (i) => { const q = data[i - 1]; const p = data[i]; const f = (t - q.y) / (p.y - q.y); return [X(i - 1) + f * (X(i) - X(i - 1)), Y(t)]; };
    data.forEach((p, i) => {
      const a = above(p.y);
      if (a) {
        if (!cur) cur = [i > 0 ? cross(i) : [X(i), Y(t)]];
        cur.push([X(i), Y(p.y)]);
        if (i === data.length - 1) { cur.push([X(i), Y(t)]); polys.push(cur); cur = null; }
      } else if (cur) {
        cur.push(cross(i));
        polys.push(cur);
        cur = null;
      }
    });
    return polys.map((pts) => `<path class="excursion" d="M${pts.map((pt) => `${r1(pt[0])},${r1(pt[1])}`).join(' L')} Z"/>`).join('');
  }
  /**
   * Serie temporal SVG. series: [{time, temp_c}] (o x/y con accesores). threshold/critical: número o {value, label}.
   * peak: true | {x, y, label} · last: true · bands: [{from, to, label, tone}] · annotations: [{x, label}]
   */
  function renderLineChart(opts) {
    const o = Object.assign({ series: [], width: 640, height: 220, unit: '°C', direction: 'high', legend: true, seriesLabel: 'Temperatura', bands: [], annotations: [] }, opts || {});
    const getX = o.x || ((d) => (d.time != null ? d.time : d.x != null ? d.x : d.t));
    const getY = o.y || ((d) => (d.temp_c != null ? d.temp_c : d.value != null ? d.value : d.y != null ? d.y : d.v));
    const data = (o.series || []).map((d) => ({ x: String(getX(d)), y: Number(getY(d)) })).filter((d) => !isNaN(d.y));
    const n = data.length;
    if (!n) return raw('');
    const asObj = (v) => (v == null ? null : typeof v === 'number' ? { value: v } : v);
    const thr = asObj(o.threshold);
    const crit = asObj(o.critical);
    const fv = (v) => (o.unit === '°C' ? fmt.temp(v) : `${fmt.num(v)}${o.unit ? NBSP + o.unit : ''}`);
    let yTicks = o.yTicks;
    let ymin;
    let ymax;
    if (yTicks && yTicks.length > 1) { ymin = Math.min.apply(null, yTicks); ymax = Math.max.apply(null, yTicks); } else {
      const vals = data.map((d) => d.y);
      if (thr) vals.push(thr.value);
      if (crit) vals.push(crit.value);
      let lo = Math.min.apply(null, vals);
      let hi = Math.max.apply(null, vals);
      if (lo === hi) { lo -= 1; hi += 1; }
      const step = niceStep((hi - lo) / 4);
      ymin = Math.floor(lo / step) * step;
      ymax = Math.ceil(hi / step) * step;
      if (ymax - hi < step * 0.3) ymax += step;
      yTicks = [];
      for (let v = ymin; v <= ymax + 1e-9; v += step) yTicks.push(Math.round(v * 1e6) / 1e6);
    }
    const bands = o.bands || [];
    const laneH = 16;
    const bandsH = bands.length ? bands.length * laneH + 6 : 0;
    const padL = 42;
    const padR = 14;
    const padT = 16;
    const axisH = 22;
    const W = o.width;
    const plotH = o.height - padT - axisH;
    const H = o.height + bandsH;
    const pw = W - padL - padR;
    const X = (i) => padL + (n === 1 ? pw / 2 : (i * pw) / (n - 1));
    const Y = (v) => padT + ((ymax - v) / (ymax - ymin)) * plotH;
    const minutes = (s) => { const mm = /^(\d{1,2}):(\d{2})/.exec(String(s)); return mm ? (+mm[1]) * 60 + (+mm[2]) : null; };
    const m0 = minutes(data[0].x);
    const m1 = minutes(data[n - 1].x);
    const xOf = (label) => {
      const i = data.findIndex((d) => d.x === String(label));
      if (i >= 0) return X(i);
      const mm = minutes(label);
      if (mm != null && m0 != null && m1 != null && m1 > m0) return padL + ((mm - m0) / (m1 - m0)) * pw;
      return null;
    };
    const baseY = padT + plotH;
    const parts = [];
    yTicks.forEach((v) => {
      const y = r1(Y(v));
      parts.push(`<line class="grid-line" x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}"/>`);
      parts.push(`<text class="tick" x="${padL - 8}" y="${r1(y + 3.5)}" text-anchor="end">${esc(fmt.num(v, decimalsOf(v)))}</text>`);
    });
    parts.push(`<line class="axis-line" x1="${padL}" x2="${W - padR}" y1="${baseY}" y2="${baseY}"/>`);
    let xt = o.xTicks;
    if (!xt) {
      const k = [1, 2, 3, 4, 6, 8, 12, 24].find((kk) => (n - 1) / kk <= 6) || Math.ceil((n - 1) / 6);
      xt = data.filter((d, i) => i % k === 0).map((d) => d.x);
    }
    xt.forEach((l) => {
      const x = xOf(l);
      if (x == null) return;
      const half = textWidth(l, 11, 400) / 2;
      const anchor = x + half > W - 1 ? 'end' : x - half < 1 ? 'start' : 'middle';
      const tx = anchor === 'end' ? W - 1 : anchor === 'start' ? 1 : x;
      parts.push(`<text class="tick" x="${r1(tx)}" y="${baseY + 15}" text-anchor="${anchor}">${esc(l)}</text>`);
    });
    if (thr && o.shade !== false) parts.push(excursionPaths(data, thr.value, X, Y, o.direction));
    const hLine = (t, cls, lcls, def) => {
      const y = r1(Y(t.value));
      const label = t.label != null ? t.label : def;
      // La etiqueta va al extremo donde la serie queda más lejos de la línea (no la tapa la curva).
      const leftSide = t.side ? t.side === 'left' : Math.abs(data[0].y - t.value) >= Math.abs(data[n - 1].y - t.value);
      const lx = leftSide ? padL + 4 : W - padR - 2;
      return `<line class="${cls}" x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}"/>${label ? `<text class="${lcls} halo" x="${lx}" y="${r1(y - 5)}" text-anchor="${leftSide ? 'start' : 'end'}">${esc(label)}</text>` : ''}`;
    };
    if (thr) parts.push(hLine(thr, 'th-line', 'th-label', `Límite ${fv(thr.value)}`));
    if (crit) parts.push(hLine(crit, 'crit-line', 'crit-label', `Crítico ${fv(crit.value)}`));
    let peak = o.peak;
    if (peak === true) { let bi = 0; data.forEach((p, i) => { if (o.direction === 'low' ? p.y < data[bi].y : p.y > data[bi].y) bi = i; }); peak = { x: data[bi].x, y: data[bi].y }; }
    let peakSvg = '';
    let peakBox = null;
    if (peak) {
      const px = xOf(peak.x);
      const py = Y(peak.y);
      if (px != null) {
        const label = peak.label || `${fv(peak.y)} · ${peak.x}`;
        const tw = textWidth(label, 11, 600) + 14;
        const bx = clamp(px - tw / 2, padL, W - padR - tw);
        let by = py - 31;
        if (by < 1) by = py + 11;
        peakBox = { x: bx, y: by, w: tw, h: 20 };
        peakSvg = `<g class="peak"><rect class="peak-box" x="${r1(bx)}" y="${r1(by)}" width="${r1(tw)}" height="20" rx="4"/><text class="peak-text" x="${r1(bx + tw / 2)}" y="${r1(by + 14)}" text-anchor="middle">${esc(label)}</text><circle class="peak-dot" cx="${r1(px)}" cy="${r1(py)}" r="4.5"/></g>`;
      }
    }
    (o.annotations || []).forEach((a) => {
      const x = xOf(a.x);
      if (x == null) return;
      const label = a.label || '';
      const lw = textWidth(label, 10.5, 600);
      const hits = peakBox && x + 4 < peakBox.x + peakBox.w && x + 4 + lw > peakBox.x && padT < peakBox.y + peakBox.h && padT + 12 > peakBox.y;
      const ly = hits ? baseY - 6 : padT + 8;
      parts.push(`<line class="annot-line" x1="${r1(x)}" x2="${r1(x)}" y1="${padT}" y2="${baseY}"/><text class="annot-text halo" x="${r1(x + 4)}" y="${r1(ly)}">${esc(label)}</text>`);
    });
    parts.push(`<path class="series" d="${data.map((p, i) => `${i ? 'L' : 'M'}${r1(X(i))},${r1(Y(p.y))}`).join(' ')}"/>`);
    if (peakSvg) parts.push(peakSvg);
    if (o.last) {
      const lp = data[n - 1];
      const lx = X(n - 1);
      const ly = Y(lp.y);
      const label = (o.last && o.last.label) || `${fv(lp.y)} · ${lp.x}`;
      const prevY = n > 1 ? Y(data[n - 2].y) : ly;
      const below = prevY < ly - 1 && ly + 18 < baseY;
      parts.push(`<circle class="last-dot" cx="${r1(lx)}" cy="${r1(ly)}" r="4"/><text class="last-text halo" x="${r1(lx - 8)}" y="${r1(below ? ly + 17 : ly - 9)}" text-anchor="end">${esc(label)}</text>`);
    }
    bands.forEach((b, i) => {
      const x1 = xOf(b.from);
      const x2 = xOf(b.to);
      if (x1 == null || x2 == null) return;
      const y = o.height + 2 + i * laneH;
      const lbl = b.label || '';
      const tw = textWidth(lbl, 10, 500);
      const after = x2 + 6 + tw <= W - padR;
      const tx = after ? x2 + 6 : x1 - 6;
      parts.push(`<g class="band"><title>${esc(`${lbl} · ${b.from}–${b.to}`)}</title><rect class="band-bar${b.tone ? ' tone-' + esc(b.tone) : ''}" x="${r1(x1)}" y="${y}" width="${r1(Math.max(3, x2 - x1))}" height="8" rx="2"/><text class="band-text" x="${r1(tx)}" y="${y + 7.5}" text-anchor="${after ? 'start' : 'end'}">${esc(lbl)}</text></g>`);
    });
    data.forEach((p, i) => {
      const a = i === 0 ? padL : (X(i - 1) + X(i)) / 2;
      const b = i === n - 1 ? W - padR : (X(i) + X(i + 1)) / 2;
      parts.push(`<rect class="hit" x="${r1(a)}" y="${padT}" width="${r1(b - a)}" height="${r1(plotH)}"><title>${esc(`${p.x} · ${fv(p.y)}`)}</title></rect>`);
    });
    const aria = o.ariaLabel || `${o.seriesLabel}: ${n} lecturas de ${data[0].x} a ${data[n - 1].x}${peak ? `; máximo ${fv(peak.y)} a las ${peak.x}` : ''}`;
    const legend = o.legend === false ? '' : html`<div class="chart-legend">
      <span class="lg"><i class="lg-line"></i>${o.seriesLabel}</span>
      ${thr ? html`<span class="lg"><i class="lg-th"></i>${thr.legend || thr.label || 'Límite'}</span>` : ''}
      ${crit ? html`<span class="lg"><i class="lg-crit"></i>${crit.legend || crit.label || 'Crítico'}</span>` : ''}
      ${thr && o.shade !== false ? html`<span class="lg"><i class="lg-fill"></i>${o.shadeLabel || 'Por encima del límite'}</span>` : ''}
    </div>`;
    return html`<figure class="chart-fig" style="margin:0"><svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${aria}">${raw(parts.join(''))}</svg>${legend}</figure>`;
  }
  /* Las gráficas sin ancho fijo se pintan al ancho real de su contenedor (texto siempre a su tamaño). */
  const autoCharts = new Map();
  let chartFitQueued = false;
  function fitCharts() {
    chartFitQueued = false;
    try { fitGraphs(); } catch (e) { console.error(e); }
    const seen = new Set();
    document.querySelectorAll('[data-chart-auto]').forEach((el) => {
      const id = el.getAttribute('data-chart-auto');
      seen.add(id);
      const o = autoCharts.get(id);
      const w = Math.round(el.clientWidth);
      if (chartRO && !el.__observed) { el.__observed = true; chartRO.observe(el); }
      if (!o || w < 40 || el.getAttribute('data-w') === String(w)) return;
      el.setAttribute('data-w', String(w));
      el.innerHTML = String(renderLineChart(Object.assign({}, o, { width: Math.max(280, w) })));
    });
    autoCharts.forEach((v, k) => { if (!seen.has(k) && Date.now() - v.__t > 5000) autoCharts.delete(k); });
  }
  function scheduleChartFit() {
    if (chartFitQueued) return;
    chartFitQueued = true;
    requestAnimationFrame(fitCharts);
  }
  let chartResizeT = null;
  const chartRO = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => { clearTimeout(chartResizeT); chartResizeT = setTimeout(scheduleChartFit, 90); })
    : null;
  /** Gráfica de líneas. Sin `width` (o width:'auto') se ajusta al contenedor; con número usa ese ancho de viewBox. */
  function lineChart(opts) {
    const o = opts || {};
    if (typeof o.width === 'number') return renderLineChart(o);
    const id = uid('chart');
    autoCharts.set(id, Object.assign({}, o, { __t: Date.now() }));
    scheduleChartFit();
    const bandsH = (o.bands || []).length ? (o.bands.length * 16 + 6) : 0;
    return html`<div class="chart-auto" data-chart-auto="${id}" style="min-height:${(o.height || 220) + bandsH}px"></div>`;
  }

  /* ================================================================ Modal, confirmación, avisos */

  let modalApi = null;
  function toastHost() {
    const box = document.getElementById('toasts');
    const dlg = document.getElementById('modal');
    if (box && dlg) {
      const target = dlg.open ? dlg : document.body;
      if (box.parentNode !== target) target.appendChild(box);
    }
    return box;
  }
  /**
   * App.modal({title, kicker, body, size: sm|md|lg|xl, actions: [{label, variant, icon, onClick(api), close, left, autofocus}], onClose, dismissible})
   * Devuelve {el, body, close(), setBody(html)}. Una acción que devuelve false deja el modal abierto.
   */
  function modal(o) {
    const dlg = document.getElementById('modal');
    if (!dlg) return null;
    if (modalApi) modalApi.close('replaced');
    const actions = o.actions || [{ label: 'Cerrar', variant: 'primary' }];
    dlg.className = 'modal modal-' + (o.size || 'md');
    dlg.innerHTML = String(html`<div class="modal-card">
      <header class="modal-head"><div class="modal-titles">${o.kicker ? html`<div class="modal-kicker">${o.kicker}</div>` : ''}<h2 class="modal-title" id="modal-title">${o.title || ''}</h2></div><button type="button" class="icon-btn" data-modal-close aria-label="Cerrar">${icon('x')}</button></header>
      <div class="modal-body"></div>
      ${actions.length ? html`<footer class="modal-foot">${actions.map((a, i) => html`<button type="button" class="btn btn-${a.variant || 'secondary'}${a.left ? ' foot-left' : ''}" data-modal-action="${i}" ${attrs({ 'data-autofocus': a.autofocus ? '1' : null, id: a.id })}>${a.icon ? icon(a.icon) : ''}<span>${a.label}</span></button>`)}</footer>` : ''}
    </div>`);
    const body = dlg.querySelector('.modal-body');
    if (o.body instanceof Node) body.appendChild(o.body); else body.innerHTML = toHTML(o.body);
    let closed = false;
    const api = {
      el: dlg,
      body,
      close(result) {
        if (closed) return;
        closed = true;
        dlg.removeEventListener('click', onClick);
        dlg.removeEventListener('cancel', onCancel);
        if (result !== 'replaced') {
          if (dlg.open) dlg.close();
          dlg.innerHTML = '';
        }
        if (modalApi === api) modalApi = null;
        toastHost();
        if (o.onClose) { try { o.onClose(result); } catch (e) { console.error(e); } }
      },
      setBody(content) { body.innerHTML = toHTML(content); }
    };
    function onClick(e) {
      const act = e.target.closest('[data-modal-action]');
      if (act) {
        const a = actions[Number(act.getAttribute('data-modal-action'))];
        let res;
        if (a && a.onClick) { try { res = a.onClick(api); } catch (err) { console.error(err); } }
        if (a && a.close !== false && res !== false) api.close(a.value);
        return;
      }
      if (e.target.closest('[data-modal-close]')) { api.close(); return; }
      if (e.target === dlg && o.dismissible !== false) api.close();
    }
    function onCancel(e) { e.preventDefault(); if (o.dismissible !== false) api.close(); }
    dlg.addEventListener('click', onClick);
    dlg.addEventListener('cancel', onCancel);
    if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); } }
    toastHost();
    const af = dlg.querySelector('[data-autofocus]') || dlg.querySelector('.modal-foot .btn:last-child');
    if (af) af.focus();
    modalApi = api;
    return api;
  }
  function closeModal() { if (modalApi) modalApi.close(); }
  function isModalOpen() { const d = document.getElementById('modal'); return !!(d && d.open); }

  /** Confirmación: await App.confirm({title, body, confirmLabel, danger}) → true/false */
  function confirm(o) {
    return new Promise((resolve) => {
      let ok = false;
      modal({
        title: o.title || 'Confirmar',
        kicker: o.kicker,
        size: 'sm',
        body: o.body,
        onClose: () => resolve(ok),
        actions: [
          { label: o.cancelLabel || 'Cancelar', variant: 'secondary' },
          { label: o.confirmLabel || 'Confirmar', variant: o.danger ? 'danger' : 'primary', icon: o.icon, autofocus: true, onClick: () => { ok = true; } }
        ]
      });
    });
  }
  /** Texto libre: await App.promptText({title, label, placeholder, required, value, confirmLabel}) → string | null */
  function promptText(o) {
    return new Promise((resolve) => {
      let val = null;
      const fid = uid('prompt');
      const m = modal({
        title: o.title || 'Añadir comentario',
        kicker: o.kicker,
        size: 'sm',
        body: html`${o.text ? html`<p class="slate mb-4">${o.text}</p>` : ''}<div class="field"><label class="label" for="${fid}">${o.label || 'Comentario'}</label><textarea id="${fid}" class="textarea" rows="3" style="min-height:92px" placeholder="${o.placeholder || ''}">${o.value || ''}</textarea><span class="hint" data-prompt-hint>${o.required ? 'Obligatorio' : 'Opcional'}</span></div>`,
        onClose: () => resolve(val),
        actions: [
          { label: 'Cancelar', variant: 'secondary' },
          {
            label: o.confirmLabel || 'Aceptar',
            variant: o.danger ? 'danger' : 'primary',
            onClick: (api) => {
              const ta = api.body.querySelector('textarea');
              const t = ta.value.trim();
              if (o.required && !t) {
                ta.focus();
                const hint = api.body.querySelector('[data-prompt-hint]');
                if (hint) { hint.textContent = 'Escribe el motivo para continuar'; hint.classList.add('t-crit'); }
                return false;
              }
              val = t;
              return undefined;
            }
          }
        ]
      });
      setTimeout(() => { const ta = m && m.body.querySelector('textarea'); if (ta) ta.focus(); }, 40);
    });
  }

  const TOAST_ICON = { ok: 'check-circle', warn: 'alert-triangle', crit: 'alert-circle', info: 'info' };
  /** Aviso breve: App.toast('Bloqueo aplicado', {tone: 'ok', icon, action: {label, onClick}, duration}) */
  function toast(msg, opts) {
    const o = opts || {};
    const box = toastHost();
    if (!box) return null;
    const tone = o.tone || 'info';
    const el = document.createElement('div');
    el.className = `toast toast-${tone}`;
    el.setAttribute('role', 'status');
    el.innerHTML = String(html`${icon(o.icon || TOAST_ICON[tone] || 'info', 18)}<span class="toast-msg">${msg}</span>${o.action ? html`<button type="button" class="toast-action">${o.action.label}</button>` : ''}`);
    const remove = () => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 220); };
    if (o.action) el.querySelector('.toast-action').addEventListener('click', () => { remove(); try { o.action.onClick(); } catch (e) { console.error(e); } });
    box.appendChild(el);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(remove, o.duration || (o.action ? 8000 : 4200));
    return el;
  }

  /* ================================================================ Descargas e informes */

  /** Descarga un fichero generado en el navegador (queda en auditoría salvo {audit:false}). */
  function downloadFile(name, mime, content, opts) {
    const o = opts || {};
    try {
      const type = mime || 'text/plain';
      const needsCharset = /^text\/|json|csv|xml|html/.test(type) && !/charset/i.test(type);
      const blob = content instanceof Blob ? content : new Blob([I18N ? I18N.exportContent(content, type) : content], { type: needsCharset ? `${type};charset=utf-8` : type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      if (o.audit !== false) audit('Descarga', name);
      if (o.toast !== false) toast(`Descargado: ${name}`, { tone: 'ok', icon: 'download' });
      return true;
    } catch (e) {
      console.warn(e);
      toast('No se ha podido descargar el fichero', { tone: 'crit' });
      return false;
    }
  }
  /** CSV para Excel en español (separador «;», BOM UTF-8): csv({cols: [{key, label, value(r)}], rows}) */
  function csv(o) {
    const cols = o.cols || [];
    const q = (v) => { const s = v == null ? '' : String(v); return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [cols.map((c) => q(c.label)).join(';')].concat((o.rows || []).map((r) => cols.map((c) => q(c.value ? c.value(r) : r[c.key])).join(';')));
    return '\uFEFF' + lines.join('\r\n');
  }

  const REPORT_TOKENS = ['--cn-green', '--cn-green-dark', '--cn-green-900', '--cn-green-50', '--cn-red', '--cn-red-50', '--amber', '--amber-50', '--ok', '--ok-50', '--ink', '--slate', '--muted', '--line', '--bg', '--card'];
  function reportSection(s) {
    let b = '';
    if (s.text) b += String(s.text).split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
    if (s.html) b += toHTML(s.html);
    if (s.list) b += `<ul>${s.list.map((li) => `<li>${toHTML(li)}</li>`).join('')}</ul>`;
    if (s.kv) b += `<dl class="kv">${s.kv.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${toHTML(v)}</dd>`).join('')}</dl>`;
    if (s.table) {
      const t = s.table;
      b += `<table><thead><tr>${t.cols.map((c) => `<th${c.num ? ' class="num"' : ''}>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${t.cols.map((c) => `<td${c.num ? ' class="num"' : ''}>${toHTML(c.render ? c.render(r) : r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    if (s.callout) b += `<div class="note">${toHTML(s.callout)}</div>`;
    return `<section class="sec">${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}${b}</section>`;
  }
  function reportHTML(o) {
    const cs = getComputedStyle(document.documentElement);
    const vars = REPORT_TOKENS.map((k) => `${k}:${cs.getPropertyValue(k).trim()}`).join(';');
    const when = o.date || nowISO();
    const meta = [['Código', o.code]].concat(o.meta || []).concat([['Generado', fmt.date(when, { time: true })]]).filter((m) => m && m[1] != null && m[1] !== '');
    while (meta.length % 3) meta.push(['', '']);
    const signs = (o.signatures || []).map((s) => `<div><strong>${esc(s.role)}</strong><br>${esc(s.note || 'Firma')}</div>`).join('');
    return `<!doctype html><html lang="${I18N && I18N.english ? "en" : "es"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700&display=swap">
<style>:root{${vars}}
@page{size:A4;margin:16mm 14mm 16mm}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:13px/1.55 Inter,system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.toolbar{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 18px;background:var(--cn-green-dark);color:var(--card);font-size:13px}
.toolbar button{border:0;border-radius:6px;background:var(--card);color:var(--cn-green-dark);font:600 13px Inter,system-ui,sans-serif;padding:8px 12px;cursor:pointer}
.embedded .toolbar{display:none}
.page{max-width:820px;margin:24px auto;padding:36px 44px 40px;background:var(--card);border:1px solid var(--line);border-radius:6px}
.embedded .page{margin:0 auto;border:0;border-radius:0}
.rh{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:10px;margin-bottom:18px;border-bottom:2px solid var(--cn-green-dark)}
.org{font:600 11px/1.3 Inter,system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase;color:var(--cn-green)}
.brand{font:700 13px/1 Montserrat,system-ui,sans-serif;color:var(--cn-green-dark)}
h1{font:700 22px/1.25 Montserrat,system-ui,sans-serif;color:var(--cn-green-900);margin:0 0 4px}
.subtitle{color:var(--slate);margin:0 0 16px}
.meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin:0 0 22px;background:var(--line);border:1px solid var(--line);border-radius:6px;overflow:hidden}
.meta div{background:var(--card);padding:8px 10px}
.meta dt{font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.meta dd{margin:2px 0 0;font-weight:600}
.sec{margin:0 0 18px}
.sec h2{font:600 14px/1.3 Montserrat,system-ui,sans-serif;color:var(--cn-green-900);margin:0 0 8px;padding-bottom:5px;border-bottom:1px solid var(--line);break-after:avoid}
p{margin:0 0 6px}
ul{margin:4px 0 0;padding-left:18px}
li{margin:2px 0}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px}
th{background:var(--bg);text-align:left;font-weight:600;color:var(--slate);padding:6px 8px;border-bottom:1px solid var(--line)}
td{padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
tr{break-inside:avoid}
.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px}
.muted{color:var(--muted)}
.kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;margin:0}
.kv dt{color:var(--muted)}.kv dd{margin:0}
.note{margin-top:8px;padding:10px 12px;border-left:3px solid var(--amber);background:var(--amber-50);color:var(--ink)}
.tag{display:inline-block;padding:1px 6px;border-radius:9px;font-size:11px;font-weight:600;background:var(--bg);color:var(--slate)}
.tag.crit{background:var(--cn-red-50);color:var(--cn-red)}.tag.warn{background:var(--amber-50);color:var(--amber)}.tag.ok{background:var(--ok-50);color:var(--ok)}
.sign{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-top:30px;break-inside:avoid}
.sign div{border-top:1px solid var(--ink);padding-top:6px;font-size:12px;color:var(--slate)}
.pf{margin-top:28px;padding-top:10px;border-top:1px solid var(--line);font-size:10.5px;color:var(--muted)}
@media print{body{background:var(--card)}.toolbar{display:none}.page{margin:0;padding:0;border:0;max-width:none}}
@media (max-width:640px){.page{margin:0;padding:22px 18px;border:0}.meta{grid-template-columns:1fr 1fr}}
</style><script>if(window.self!==window.top)document.documentElement.classList.add('embedded');</script></head><body>
<div class="toolbar"><span>${esc(o.title)}</span><button type="button" onclick="window.print()">Imprimir o guardar como PDF</button></div>
<main class="page">
<header class="rh"><div class="org">${esc(INDUSTRY ? INDUSTRY.profile.company + " · " + INDUSTRY.text(INDUSTRY.profile.site) : "Congelados de Navarra · Planta de Fustiñana")}</div><div class="brand">Prodigy</div></header>
<h1>${esc(o.title)}</h1>${o.subtitle ? `<p class="subtitle">${esc(o.subtitle)}</p>` : ''}
<dl class="meta">${meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${toHTML(v)}</dd></div>`).join('')}</dl>
${(o.sections || []).map(reportSection).join('')}
${signs ? `<div class="sign">${signs}</div>` : ''}
<div class="pf">${esc(o.footer || `Generado con Prodigy el ${fmt.date(when, { time: true })} · Demostración con datos sintéticos · preparado por Ciklum`)}</div>
</main></body></html>`;
  }
  /**
   * Informe imprimible: vista previa en modal + «Guardar como PDF» (diálogo del navegador).
   * {title, subtitle, code, meta: [[k, v]], sections: [{heading, text | html | list | kv | table: {cols, rows} | callout}], signatures: [{role, note}], filename}
   */
  function printableReport(o) {
    const doc = I18N ? I18N.html(reportHTML(o)) : reportHTML(o);
    const fname = `${o.filename || slug(o.title)}.html`;
    const m = modal({
      title: o.title,
      kicker: o.kicker || 'Vista previa del informe',
      size: 'lg',
      body: raw(`<iframe class="report-frame" title="${esc(o.title)}"></iframe>`),
      actions: [
        { label: 'Descargar HTML', icon: 'download', variant: 'ghost', left: true, close: false, onClick: () => { downloadFile(fname, 'text/html', doc); return false; } },
        { label: 'Abrir en pestaña nueva', icon: 'external-link', variant: 'secondary', close: false, onClick: () => { openDocTab(doc); return false; } },
        { label: 'Guardar como PDF', icon: 'printer', variant: 'primary', close: false, onClick: (api) => { printFrame(api.el.querySelector('iframe')); return false; } }
      ]
    });
    const frame = m && m.el.querySelector('iframe');
    if (frame) frame.srcdoc = doc;
    if (o.audit !== false) audit('Informe generado', o.title);
    return m;
  }
  function printFrame(frame) {
    try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { toast('Abre el informe en una pestaña nueva para imprimirlo', { tone: 'warn' }); }
  }
  function openDocTab(docHTML) {
    try {
      const url = URL.createObjectURL(new Blob([docHTML], { type: 'text/html;charset=utf-8' }));
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { console.warn(e); }
  }

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(String(text));
      toast(label || 'Copiado al portapapeles', { tone: 'ok', icon: 'copy' });
      return true;
    } catch (e) {
      toast('No se ha podido copiar', { tone: 'warn' });
      return false;
    }
  }
  /** CSS específico de una escena (solo tokens): App.style('turno', '.foo{...}') */
  function style(id, css) {
    let el = document.head.querySelector(`style[data-style="${cssEsc(id)}"]`);
    if (!el) { el = document.createElement('style'); el.setAttribute('data-style', id); document.head.appendChild(el); }
    el.textContent = css;
    return el;
  }

  /* ================================================================ Trazabilidad de lote */

  function lot(code) { const k = String(code || '').trim().toUpperCase(); return (DATA.lots && DATA.lots[k]) || null; }
  function whenParts(w) {
    const s = String(w || '');
    const d = toDate(s);
    if (!d) return { time: s, sub: '' };
    return { time: fmt.dayMonth(d), sub: /\d{2}:\d{2}/.test(s) ? fmt.time(d) : String(d.getUTCFullYear()) };
  }
  function originText(i) {
    const og = i.origin || {};
    if (og.type === 'granel') return `Granel ${og.bulk_lot} (${fmt.date(og.bulk_date)})`;
    if (og.type === 'mezcla') return `Mezcla de ${(og.components || []).length} componentes`;
    if (og.type === 'campo') return `Campo · ${og.grower} · cosecha ${fmt.date(og.harvest_date)}`;
    return '—';
  }
  /** Modal de traza hacia atrás y hacia delante. Lote desconocido → «No encuentro ese lote en SAP/Mapex». */
  function traceModal(code) {
    const k = String(code || '').trim().toUpperCase();
    const L = lot(k);
    if (!L) {
      audit('Consulta de trazabilidad sin resultado', k || '(vacío)');
      return modal({
        title: 'Lote no encontrado',
        kicker: 'Trazabilidad',
        size: 'sm',
        body: callout({ tone: 'warn', icon: 'search', title: `No encuentro el lote «${k || '—'}» en SAP/Mapex`, body: 'No se muestra ninguna traza: Prodigy no genera datos que no estén en los sistemas. Comprueba el código (formato L26-261-FUS-GUI-03) o consulta a Calidad.' })
      });
    }
    audit('Consulta de trazabilidad', k);
    const i = L.info;
    const b = L.back;
    const f = L.forward;
    const summary = [
      ['Producto', i.product_name], ['Marca y canal', i.brand], ['SKU', i.sku], ['Planta y línea', `${i.plant_name} · ${i.line_name}`],
      ['Fabricación', `${fmt.date(i.production_date)} · turno de ${i.shift}`], ['Consumo preferente', i.best_before],
      ['Producido', `${fmt.plural(i.pallets_produced, 'palé', 'palés')} · ${fmt.kg(i.kg_total)}`], ['Origen', originText(i)]
    ];
    const comps = (b.components || []).length ? html`<div class="h3 mb-2">Componentes de la mezcla</div>${table({
      dense: true,
      cols: [
        { label: 'Componente', render: (c) => html`${c.name}<span class="sub">${c.route_text || ''}</span>` },
        { label: '%', render: (c) => fmt.pct(c.share_pct), num: true },
        { label: 'Granel', render: (c) => html`<span class="code">${c.bulk_lot}</span>` },
        { label: 'Agricultor', render: (c) => html`${c.grower ? c.grower.code : '—'}<span class="sub">${(c.parcels || []).map((p) => p.code).join(', ')}</span>` },
        { label: 'Recepción', render: (c) => (c.intake ? html`<span class="code">${c.intake.ticket}</span><span class="sub">${fmt.date(c.intake.date)} ${c.intake.time}</span>` : '—') }
      ],
      rows: b.components
    })}<div class="mt-6"></div>` : '';
    const backTab = html`${comps}${timeline({ items: (b.steps || []).map((s) => { const w = whenParts(s.when); return { time: w.time, timeSub: w.sub, title: s.stage, text: fmt.text(s.detail), tone: s.stage === 'Mantenimiento' ? 'warn' : s.stage === 'Calidad' ? 'ok' : 'brand', meta: s.ref ? html`<span class="code">${s.ref}</span>` : '' }; }) })}`;
    const fwdTab = html`<div class="h3 mb-2">Stock por ubicación</div>
      ${table({ dense: true, empty: 'Sin stock en almacén', rows: f.by_location || [], cols: [
        { label: 'Ubicación', render: (r) => html`${r.label}<span class="sub code">${r.location}</span>` },
        { label: 'Palés', key: 'pallets', num: true },
        { label: 'Calle', render: (r) => (r.lane ? String(r.lane) : '—') },
        { label: 'Expedición planificada', render: (r) => (r.planned_shipment ? html`<span class="code">${r.planned_shipment}</span>` : '—') }
      ] })}
      <div class="h3 mt-6 mb-2">Expediciones</div>
      ${table({ dense: true, empty: 'Sin expediciones', rows: f.shipments || [], cols: [
        { label: 'Expedición', render: (r) => html`<span class="code">${r.id}</span>${r.dock ? html`<span class="sub">${r.dock}</span>` : ''}` },
        { label: 'Fecha', render: (r) => fmt.date(r.date, r.time) },
        { label: 'Palés', key: 'pallets', num: true },
        { label: 'Cliente', render: (r) => html`${r.customer}${r.end_customer ? html`<span class="sub">${r.end_customer}</span>` : ''}` },
        { label: 'Estado', render: (r) => (r.status === 'expedida' ? chip('shipped', 'Expedida') : chip('planned', 'Planificada')) }
      ] })}
      ${f.transfer ? html`<div class="mt-4">${callout({ tone: 'brand', icon: 'truck', title: `Traslado ${f.transfer.code}`, body: `${f.transfer.pallets} palés de ${f.transfer.from_plant} a ${f.transfer.to_plant} el ${fmt.date(f.transfer.date)} a las ${f.transfer.time} · ${fmt.minus(f.transfer.transport)}` })}</div>` : ''}`;
    const palletTab = table({ dense: true, rows: f.pallets || [], cols: [
      { label: 'Palé', render: (r) => `${r.n}/${r.of}`, num: true },
      { label: 'SSCC', render: (r) => html`<span class="code">${r.sscc}</span>` },
      { label: 'Kg', render: (r) => fmt.num(r.kg), num: true },
      { label: 'Ubicación', render: (r) => html`${r.location_label}${r.position ? html`<span class="sub">${r.position}</span>` : ''}` },
      { label: 'Estado', render: (r) => (r.status === 'expedido' ? chip('shipped', 'Expedido') : chip('ok', 'En stock')) },
      { label: 'Expedición', render: (r) => (r.shipment || r.planned_shipment ? html`<span class="code">${r.shipment || r.planned_shipment}</span>` : '—') }
    ] });
    const maint = (b.maintenance || []).map((mt) => callout({ tone: 'warn', icon: 'wrench', title: `${mt.equipment} · ${mt.work_order} (${mt.status})`, body: `${fmt.cap(mt.text)} · anotado el ${fmt.date(mt.date)}` }));
    const qcTab = html`<ul class="prose" style="margin:0;padding-left:18px">${(i.qc || b.qc || []).map((q) => html`<li>${q}</li>`)}</ul>${maint.length ? html`<div class="stack stack-sm mt-4">${maint}</div>` : ''}`;
    const sysLabel = (DATA.meta && DATA.meta.production_systems && DATA.meta.production_systems.lot_traceability) || 'SAP + MES Mapex + Mecalux Easy WMS';
    return modal({
      title: `Traza del lote ${k}`,
      kicker: `Trazabilidad · ${sysLabel}`,
      size: 'lg',
      body: html`<dl class="trace-summary">${summary.map(([a, v]) => html`<div><dt>${a}</dt><dd>${v}</dd></div>`)}</dl>${tabs({ id: uid('trace'), label: 'Traza del lote', tabs: [
        { id: 'atras', label: 'Hacia atrás', body: backTab },
        { id: 'delante', label: 'Hacia delante', body: fwdTab },
        { id: 'sscc', label: 'Palés (SSCC)', count: (f.pallets || []).length, body: palletTab },
        { id: 'calidad', label: 'Calidad', body: qcTab }
      ] })}`,
      actions: [
        { label: 'Descargar SSCC (CSV)', icon: 'download', variant: 'ghost', left: true, close: false, onClick: () => { downloadFile(`sscc-${k}.csv`, 'text/csv', csv({ rows: f.pallets || [], cols: [{ label: 'Lote', key: 'lot' }, { label: 'Palé', value: (r) => `${r.n}/${r.of}` }, { label: 'SSCC', key: 'sscc' }, { label: 'Kg', key: 'kg' }, { label: 'Ubicación', key: 'location_label' }, { label: 'Estado', key: 'status' }, { label: 'Expedición', value: (r) => r.shipment || r.planned_shipment || '' }] })); return false; } },
        { label: 'Cerrar', variant: 'primary' }
      ]
    });
  }

  /* ================================================================ Auditoría y «Acerca de» */

  function sceneName(id) { const s = scenes.find((x) => x.id === id); return s ? s.nav : (id || '—'); }
  function auditTable(entries, opts) {
    const o = opts || {};
    const rows = (entries || state.audit).slice().reverse();
    return table({
      dense: true,
      rows: o.limit ? rows.slice(0, o.limit) : rows,
      empty: 'Aún no hay acciones registradas en esta sesión.',
      cols: [
        { label: 'Hora', width: '92px', render: (r) => html`<span class="code">${fmt.time(r.at, true)}</span><span class="sub">${fmt.dayMonth(r.at)}</span>` },
        { label: 'Acción', render: (r) => html`<strong>${r.action}</strong>${r.detail ? html`<span class="sub">${r.detail}</span>` : ''}` },
        { label: 'Actor', render: (r) => r.actor },
        { label: 'Vista', render: (r) => sceneName(r.scene) }
      ]
    });
  }
  function exportAudit() {
    const payload = { sistema: 'Prodigy · Congelados de Navarra (demostración)', planta: 'Fustiñana', exportado: nowISO(), entradas: state.audit };
    downloadFile('registro-auditoria-prodigy-cn.json', 'application/json', JSON.stringify(payload, null, 2), { audit: false });
    audit('Registro de auditoría exportado', `${state.audit.length} entradas`);
  }
  function openAuditLog() {
    modal({
      title: 'Registro de auditoría',
      kicker: 'Sesión de demostración · solo se añaden entradas',
      size: 'lg',
      body: html`<p class="slate small mb-4">Cada acción de la sesión queda registrada con hora de planta, actor y vista. No se edita ni se borra desde la consola; solo «Reiniciar demo» empieza un registro nuevo.</p>${auditTable(state.audit)}`,
      actions: [
        { label: 'Exportar JSON', icon: 'download', variant: 'secondary', left: true, close: false, onClick: () => { exportAudit(); return false; } },
        { label: 'Cerrar', variant: 'primary' }
      ]
    });
  }
  function openAbout() {
    if (INDUSTRY && typeof INDUSTRY.openAbout === 'function') return INDUSTRY.openAbout();
    const sections = [
      ['Qué es', 'Una simulación interactiva de la consola de Prodigy, la plataforma de agentes de Ciklum, configurada para Congelados de Navarra. Se abre en el navegador, sin instalación y sin acceso a sistemas de Congelados de Navarra.'],
      ['Datos', 'Lotes, palés (SSCC), lecturas, reclamaciones y procedimientos son sintéticos y coherentes entre sí. Los ha preparado Ciklum para esta demostración; no proceden de Congelados de Navarra.'],
      ['Acciones', 'Bloqueos, tickets, envíos y publicaciones se simulan y no salen de este navegador. Todo queda en el registro de auditoría de la sesión y se borra con «Reiniciar demo».'],
      ['Conectores', 'SAP (SAP QM), MES Mapex, Siemens Opcenter APS, Mecalux Easy WMS, Galileo/SCADA, Elara y Microsoft 365 aparecen como conectores de demostración. En un piloto se conectan uno o dos sistemas en modo lectura.'],
      ['De serie y a medida', 'De serie en Prodigy: agentes y workflows (Routines) con editor, aprobación humana, registro de auditoría, respuestas con citas y control de coste por petición. Representado en esta demo: el generador de workflows desde texto y los agentes de planta. Su integración en Prodigy y los conectores se validan en el piloto.'],
      ['Modelo de lenguaje', 'Esta página no llama a ningún modelo: las respuestas están preparadas. En un piloto, el modelo lo elige Congelados de Navarra (Azure OpenAI, Gemini o un modelo local) y Prodigy se instala en su infraestructura.']
    ];
    modal({
      title: 'Acerca de esta demo',
      kicker: 'Prodigy · Congelados de Navarra',
      size: 'md',
      body: html`<div class="stack" style="gap:14px">${sections.map(([h, t]) => html`<div><div class="h3" style="font-size:14px">${h}</div><p class="slate mt-1">${t}</p></div>`)}<p class="muted small">Versión ${VERSION} · 29/09/2026 · preparado por Ciklum</p></div>`,
      actions: [
        { label: 'Manual de presentación (PDF · ESP)', icon: 'file-text', variant: 'ghost', left: true, close: false, onClick: () => { window.open('manual.pdf', '_blank', 'noopener'); return false; } },
        { label: 'Registro de auditoría', icon: 'history', variant: 'secondary', onClick: () => { setTimeout(openAuditLog, 0); } },
        { label: 'Cerrar', variant: 'primary', autofocus: true }
      ]
    });
  }

  /* ================================================================ Escenas y navegación */

  const scenes = [];
  let started = false;
  let current = null;
  let visit = null;

  /** Registra una escena: App.scene({id, nav, section, title, order, icon, badge(state), presenter: {say, next}, render(root, ctx), onLeave(ctx)}) */
  function scene(def) {
    if (!def || !def.id || typeof def.render !== 'function') { console.error('App.scene: hace falta id y render()'); return null; }
    const s = Object.assign({ order: 100, section: 'General', icon: 'circle', presenter: {} }, def);
    s.nav = s.nav || s.title || s.id;
    s.title = s.title || s.nav;
    const i = scenes.findIndex((x) => x.id === s.id);
    if (i >= 0) scenes[i] = s; else scenes.push(s);
    scenes.sort((a, b) => a.order - b.order);
    if (started) { buildNav(); if (current && current.id === s.id) navigate(true); }
    return s;
  }
  function parseHash() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    const parts = h.split('/').filter(Boolean);
    return { id: parts[0] || '', params: parts.slice(1) };
  }
  /** Navega a una escena: App.go('alarma') · App.go('reclamacion', 'L26-231-FUS-GUI-01') */
  function go(id, ...params) {
    const target = '#' + [id].concat(params).map((p) => encodeURIComponent(p)).join('/');
    closeNav();
    if (location.hash === target) navigate(true); else location.hash = target;
  }
  function visibleScenes() { return scenes.filter((s) => !s.hidden); }
  function nextScene() { const v = visibleScenes(); const i = v.findIndex((s) => current && s.id === current.id); if (i >= 0 && i < v.length - 1) go(v[i + 1].id); }
  function prevScene() { const v = visibleScenes(); const i = v.findIndex((s) => current && s.id === current.id); if (i > 0) go(v[i - 1].id); }

  function navigate(force) {
    if (!scenes.length) return;
    const p = parseHash();
    let s = scenes.find((x) => x.id === p.id);
    let params = p.params;
    if (!s) {
      s = visibleScenes()[0] || scenes[0];
      params = [];
      try { history.replaceState(null, '', location.pathname + location.search + '#' + s.id); } catch (e) { /* file:// */ }
    }
    const key = s.id + '/' + params.join('/');
    if (!force && visit && visit.key === key) return;
    leave();
    enter(s, params, key);
  }
  function leave() {
    if (!visit) return;
    const v = visit;
    visit = null;
    try { if (v.scene.onLeave) v.scene.onLeave(v.ctx); } catch (e) { console.error(e); }
    v.ctrl.abort();
    v.timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
    v.timers.clear();
    v.listeners.forEach(([type, fn]) => v.root.removeEventListener(type, fn));
    v.listeners = [];
  }
  function makeCtx(v, params) {
    const id = v.scene.id;
    const ctx = {
      id,
      params,
      data: DATA,
      root: v.root,
      vars: {},
      get state() { return state; },
      get local() { if (!state.scenes[id]) state.scenes[id] = {}; return state.scenes[id]; },
      setLocal(patch) { state.scenes[id] = Object.assign({}, state.scenes[id], patch); save(); emit('state'); scheduleChrome(); return state.scenes[id]; },
      set,
      go,
      get signal() { return v.ctrl.signal; },
      alive() { return visit === v && !v.ctrl.signal.aborted; },
      rerender() { if (ctx.alive()) doRender(v); },
      on(type, selector, handler) {
        const fn = (e) => {
          const t = e.target && e.target.closest ? e.target.closest(selector) : null;
          if (t && v.root.contains(t)) handler(e, t);
        };
        v.root.addEventListener(type, fn);
        v.listeners.push([type, fn]);
      },
      $(sel) { return v.root.querySelector(sel); },
      $$(sel) { return Array.from(v.root.querySelectorAll(sel)); },
      after(ms, fn) {
        const t = setTimeout(() => { v.timers.delete(t); if (ctx.alive()) fn(); }, (ms || 0) / globalSpeed());
        v.timers.add(t);
        return t;
      },
      every(ms, fn) { const t = setInterval(() => { if (ctx.alive()) fn(); }, ms); v.timers.add(t); return t; },
      sleep(ms) { return new Promise((res) => { ctx.after(ms, res); }); },
      presenter(p) { v.presenter = p ? Object.assign({}, v.presenter || {}, p) : null; renderPresenter(); },
      audit,
      toast,
      modal
    };
    return ctx;
  }
  function doRender(v) {
    v.listeners.forEach(([type, fn]) => v.root.removeEventListener(type, fn));
    v.listeners = [];
    try {
      v.scene.render(v.root, v.ctx);
    } catch (err) {
      console.error(`[escena ${v.scene.id}]`, err);
      v.root.innerHTML = String(html`${pageHead({ title: v.scene.title })}${card({ body: empty({ icon: 'alert-triangle', title: 'Esta vista no se ha podido cargar', text: 'Recarga la página o pulsa «Reiniciar demo».' }) })}`);
    }
    scheduleChrome();
  }
  function enter(s, params, key) {
    const view = document.getElementById('view');
    if (!view) return;
    current = s;
    const root = document.createElement('section');
    root.className = 'scene';
    root.setAttribute('data-scene', s.id);
    view.replaceChildren(root);
    const v = { key, scene: s, root, ctrl: new AbortController(), timers: new Set(), listeners: [], presenter: null };
    visit = v;
    v.ctx = makeCtx(v, params);
    doRender(v);
    updateChrome();
    window.scrollTo(0, 0);
    try { view.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
    emit('scene', s);
  }

  /* ================================================================ Presentador */

  function presenterOpen() { return document.body.classList.contains('presenter-open'); }
  function togglePresenter(force) {
    const open = force != null ? !!force : !presenterOpen();
    ui.presenter = open;
    if (open && !ui.timerStart) ui.timerStart = Date.now();
    saveUI();
    document.body.classList.toggle('presenter-open', open);
    const panel = document.getElementById('presenter');
    if (panel) panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    const btn = document.getElementById('presenter-btn');
    if (btn) btn.setAttribute('aria-pressed', open ? 'true' : 'false');
    renderPresenter();
    tickTimer();
  }
  function resolvePresenter() {
    if (!current) return { say: [], next: '' };
    const p = Object.assign({}, current.presenter || {}, (visit && visit.presenter) || {});
    const say = typeof p.say === 'function' ? p.say(state) : (p.say || []);
    const next = typeof p.next === 'function' ? p.next(state) : (p.next || '');
    return { say: Array.isArray(say) ? say : [say], next };
  }
  function renderPresenter() {
    const panel = document.getElementById('presenter');
    if (!panel || !current) return;
    const v = visibleScenes();
    const i = v.findIndex((s) => s.id === current.id);
    const p = resolvePresenter();
    const sceneEl = document.getElementById('presenter-scene');
    if (sceneEl) sceneEl.textContent = `${i + 1} ${I18N && I18N.english ? "of" : "de"} ${v.length} · ${current.nav}`;
    const sayEl = document.getElementById('presenter-say');
    if (sayEl) sayEl.innerHTML = String(html`${p.say.map((t) => html`<li>${t}</li>`)}`);
    const nextEl = document.getElementById('presenter-next');
    if (nextEl) nextEl.textContent = p.next || 'Continuar con la siguiente escena.';
    const prev = document.getElementById('presenter-prev');
    const fwd = document.getElementById('presenter-fwd');
    if (prev) { prev.disabled = i <= 0; prev.innerHTML = String(html`${icon('chevron-left', 16)}<span>${i > 0 ? v[i - 1].nav : 'Inicio'}</span>`); }
    if (fwd) { fwd.disabled = i >= v.length - 1; fwd.innerHTML = String(html`<span>${i < v.length - 1 ? v[i + 1].nav : 'Fin'}</span>${icon('chevron-right', 16)}`); }
    panel.querySelectorAll('[data-speed]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-speed')) === globalSpeed())));
  }
  function tickTimer() {
    const el = document.getElementById('presenter-timer');
    if (!el) return;
    const start = ui.timerStart || Date.now();
    const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
    el.textContent = `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
  }

  /* ================================================================ Marco de la aplicación */

  let chromeQueued = false;
  function scheduleChrome() {
    if (chromeQueued || !started) return;
    chromeQueued = true;
    requestAnimationFrame(() => { chromeQueued = false; updateChrome(); });
  }
  function updateChrome() {
    if (!started) return;
    document.querySelectorAll('[data-nav]').forEach((a) => {
      if (current && a.getAttribute('data-nav') === current.id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    scenes.forEach((s) => {
      const el = document.querySelector(`[data-badge="${cssEsc(s.id)}"]`);
      if (!el) return;
      let b = null;
      try { b = typeof s.badge === 'function' ? s.badge(state) : s.badge; } catch (e) { b = null; }
      const text = b == null || b === false || b === 0 ? '' : (typeof b === 'object' ? b.text : String(b));
      el.hidden = !text;
      el.textContent = text || '';
      el.className = 'nav-badge' + (b && typeof b === 'object' && b.tone ? ' tone-' + b.tone : '');
    });
    const sec = document.getElementById('crumb-section');
    const tit = document.getElementById('crumb-title');
    if (current) {
      if (sec) sec.textContent = current.section;
      if (tit) tit.textContent = current.title;
      document.title = `${current.title} · Prodigy · ${INDUSTRY ? INDUSTRY.profile.company : "Congelados de Navarra"}`;
    }
    const cnt = document.getElementById('audit-count');
    if (cnt) cnt.textContent = String(state.audit.length);
    renderPresenter();
    updateClock();
  }
  function updateClock() {
    const el = document.getElementById('clock-text');
    if (!el) return;
    const d = now();
    el.textContent = `${fmt.date(d)} · ${fmt.time(d)}`;
  }
  function buildNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const groups = [];
    visibleScenes().forEach((s) => {
      const g = groups[groups.length - 1];
      if (g && g.section === s.section) g.items.push(s); else groups.push({ section: s.section, items: [s] });
    });
    nav.innerHTML = String(html`${groups.map((g) => html`<div class="nav-group"><div class="nav-label">${g.section}</div>${g.items.map((s) => html`<a class="nav-item" href="#${s.id}" data-nav="${s.id}">${icon(s.icon, 18)}<span class="nav-text">${s.nav}</span><span class="nav-badge" data-badge="${s.id}" hidden></span></a>`)}</div>`)}`);
  }
  function injectIcons(scope) {
    (scope || document).querySelectorAll('[data-icon]').forEach((el) => {
      el.outerHTML = String(icon(el.getAttribute('data-icon'), Number(el.getAttribute('data-size')) || 20));
    });
  }
  function openNav() { document.body.classList.add('nav-open'); const b = document.getElementById('menu-btn'); if (b) b.setAttribute('aria-expanded', 'true'); }
  function closeNav() { document.body.classList.remove('nav-open'); const b = document.getElementById('menu-btn'); if (b) b.setAttribute('aria-expanded', 'false'); }

  /** Reinicia la demo (pide confirmación salvo {confirm:false}). */
  async function reset(opts) {
    const o = opts || {};
    if (o.confirm !== false) {
      const ok = await confirm({
        title: 'Reiniciar demo',
        body: html`<p class="slate">${I18N && I18N.english ? "Published workflows, decisions, tickets and the audit log for the selected industry will be cleared. Other industries keep their sessions. Data returns to Tuesday 29/09/2026 at 07:05." : "Se borran los workflows publicados, las decisiones, los tickets y el registro de auditoría de la industria seleccionada. Las demás industrias conservan su sesión. Los datos vuelven a las 07:05 del martes 29/09/2026."}</p>`,
        confirmLabel: 'Reiniciar demo',
        icon: 'rotate-ccw'
      });
      if (!ok) return false;
    }
    closeModal();
    leave();
    state = freshState();
    save();
    if (ui.presenter) { ui.timerStart = Date.now(); saveUI(); }
    emit('reset');
    const first = visibleScenes()[0];
    if (first) {
      if (parseHash().id === first.id && !parseHash().params.length) navigate(true); else location.hash = first.id;
    }
    updateChrome();
    toast('Demo reiniciada · martes 29/09/2026 07:05', { tone: 'ok', icon: 'rotate-ccw' });
    return true;
  }

  function isTyping(t) { return !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))); }
  function bindShell() {
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      const lotEl = t.closest('[data-lot]');
      if (lotEl) { e.preventDefault(); traceModal(lotEl.getAttribute('data-lot')); return; }
      const goEl = t.closest('[data-go]');
      if (goEl) { e.preventDefault(); closeModal(); go.apply(null, goEl.getAttribute('data-go').split('/')); return; }
      const tab = t.closest('[data-tabs] [role="tab"]');
      if (tab) { activateTab(tab); return; }
      const seg = t.closest('.seg .seg-btn');
      if (seg) { selectSeg(seg); return; }
      if (t.closest('[data-open-audit]')) { openAuditLog(); return; }
      if (t.closest('[data-open-about]')) { openAbout(); return; }
      const cp = t.closest('[data-copy]');
      if (cp) { copyText(cp.getAttribute('data-copy')); return; }
      const navLink = t.closest('.nav-item');
      if (navLink) closeNav();
    });
    document.addEventListener('keydown', (e) => {
      const t = e.target;
      if ((e.key === 'Enter' || e.key === ' ') && t && t.matches && t.matches('tr.is-clickable')) { e.preventDefault(); t.click(); return; }
      if (t && t.matches && t.matches('[role="tab"]') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const tabsEls = Array.from(t.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
        const i = tabsEls.indexOf(t);
        const n = tabsEls[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabsEls.length) % tabsEls.length];
        e.preventDefault();
        n.focus();
        activateTab(n);
        return;
      }
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { closeNav(); return; }
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTyping(t) || isModalOpen()) return;
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePresenter(); return; }
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      if (t && t.closest && t.closest('.seg, [role="tablist"]')) return;
      e.preventDefault();
      if (e.key === 'ArrowRight') nextScene(); else prevScene();
    });
    window.addEventListener('hashchange', () => navigate());
    const byId = (id) => document.getElementById(id);
    if (byId('menu-btn')) byId('menu-btn').addEventListener('click', () => (document.body.classList.contains('nav-open') ? closeNav() : openNav()));
    if (byId('scrim')) byId('scrim').addEventListener('click', closeNav);
    if (byId('presenter-btn')) byId('presenter-btn').addEventListener('click', () => togglePresenter());
    if (byId('presenter-close')) byId('presenter-close').addEventListener('click', () => togglePresenter(false));
    if (byId('presenter-prev')) byId('presenter-prev').addEventListener('click', prevScene);
    if (byId('presenter-fwd')) byId('presenter-fwd').addEventListener('click', nextScene);
    if (byId('presenter-timer-reset')) byId('presenter-timer-reset').addEventListener('click', () => { ui.timerStart = Date.now(); saveUI(); tickTimer(); });
    if (byId('presenter')) byId('presenter').addEventListener('click', (e) => { const b = e.target.closest('[data-speed]'); if (b) { ui.speed = Number(b.getAttribute('data-speed')) || 1; saveUI(); renderPresenter(); } });
    if (byId('reset-btn')) byId('reset-btn').addEventListener('click', () => reset());
    if (byId('about-btn')) byId('about-btn').addEventListener('click', openAbout);
    if (byId('env-chip')) byId('env-chip').addEventListener('click', openAbout);
    if (byId('audit-link')) byId('audit-link').addEventListener('click', () => { closeNav(); openAuditLog(); });
  }

  function start() {
    if (started) return;
    started = true;
    let qs = null;
    try { qs = new URLSearchParams(location.search); } catch (e) { qs = null; }
    if (qs && qs.has('reset')) {
      state = freshState();
      save();
      resumedStale = false;
      qs.delete('reset');
      try { history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs.toString() : '') + location.hash); } catch (e) { /* file:// */ }
    }
    if (qs && qs.has('presenter')) ui.presenter = qs.get('presenter') !== '0';
    injectIcons();
    buildNav();
    bindShell();
    document.body.classList.toggle('presenter-open', !!ui.presenter);
    const panel = document.getElementById('presenter');
    if (panel) panel.setAttribute('aria-hidden', ui.presenter ? 'false' : 'true');
    const pbtn = document.getElementById('presenter-btn');
    if (pbtn) pbtn.setAttribute('aria-pressed', ui.presenter ? 'true' : 'false');
    navigate(true);
    try { new MutationObserver(() => { if (document.querySelector('[data-chart-auto]:not([data-w]), [data-pg-auto]:not([data-w])')) scheduleChartFit(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) { /* sin observador */ }
    let resizeT = null;
    window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(scheduleChartFit, 120); });
    document.addEventListener('tabchange', scheduleChartFit);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        document.querySelectorAll('[data-chart-auto], [data-pg-auto]').forEach((el) => el.removeAttribute('data-w'));
        scheduleChartFit();
      }).catch(() => {});
    }
    setInterval(() => { updateClock(); if (presenterOpen()) tickTimer(); }, 1000);
    if (resumedStale) {
      toast(`Sesión anterior recuperada (${state.audit.length} acciones). Para empezar de cero, reinicia la demo.`, { tone: 'info', icon: 'history', action: { label: 'Reiniciar', onClick: () => reset({ confirm: false }) } });
    }
    document.documentElement.setAttribute('data-ready', '1');
    emit('ready');
  }

  /* ================================================================ API pública */

  const App = {
    version: VERSION,
    data: DATA,
    scene,
    go,
    next: nextScene,
    prev: prevScene,
    scenes: () => scenes.slice(),
    current: () => current,
    get state() { return state; },
    set,
    update,
    reset,
    audit,
    auditLog: () => state.audit.slice(),
    auditTable,
    openAuditLog,
    exportAudit,
    outcome,
    seq,
    now,
    nowISO,
    clock: () => fmt.time(now()),
    speed: globalSpeed,
    toast,
    modal,
    closeModal,
    confirm,
    promptText,
    html,
    h: html,
    raw,
    esc,
    attrs,
    uid,
    icon,
    icons: () => Object.keys(ICONS),
    fmt,
    pageHead,
    button,
    kpi,
    chip,
    sys,
    sysList,
    lotTag,
    table,
    card,
    tabs,
    segmented,
    timeline,
    callout,
    empty,
    kv,
    stats,
    list,
    listItem,
    planGraph,
    reasoningStream,
    approvalCard,
    docPreview,
    emailView,
    highlightText,
    lineChart,
    downloadFile,
    csv,
    printableReport,
    copyText,
    style,
    lot,
    traceModal,
    openAbout,
    textWidth,
    presenter: { toggle: () => togglePresenter(), open: () => togglePresenter(true), close: () => togglePresenter(false), isOpen: presenterOpen, refresh: renderPresenter },
    on,
    off,
    emit
  };
  window.App = App;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else setTimeout(start, 0);
})();
