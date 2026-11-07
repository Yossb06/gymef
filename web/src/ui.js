import { html, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import { store } from './store.js';
import { UserError } from './data.js';
import { confettiColors } from './theme.js';

// ---------- Estado y navegación ----------
export function useStore() {
  const [, setVersion] = useState(store.version);
  useEffect(() => store.subscribe(setVersion), []);
  return store;
}
export function useHash() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => { setHash(location.hash); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
}
// Profundidad dentro de la app guardada en history.state: «Atrás» nunca sale de la app
// (por ejemplo, hacia la página de confirmación del correo) y al abrir un enlace directo vuelve a su pantalla padre.
let depth = history.state?.gymDepth ?? 0;
let replacing = false;
if (history.state?.gymDepth == null) history.replaceState({ gymDepth: 0 }, '');
addEventListener('hashchange', () => {
  const known = history.state?.gymDepth;
  if (known != null) depth = known;
  else { if (!replacing) depth += 1; history.replaceState({ gymDepth: depth }, ''); }
  replacing = false;
});
export const go = (path) => { location.hash = `#/${path}`; };
/** Cambia de pantalla sin añadir un paso a «Atrás» (p. ej. pasar al siguiente ejercicio). */
export const replaceRoute = (path) => { replacing = true; location.replace(`#/${path}`); };
export const back = (fallback = '') => { if (depth > 0) history.back(); else replaceRoute(fallback); };
export function useTick(ms) {
  const [, set] = useState(0);
  useEffect(() => { const t = setInterval(() => set((x) => x + 1), ms); return () => clearInterval(t); }, [ms]);
}

// ---------- Avisos y diálogos ----------
const host = { dialog: null, toast: null, listeners: new Set() };
const refresh = () => host.listeners.forEach((fn) => fn({}));
/** Aviso breve arriba de la pantalla; con `action` muestra un botón (p. ej. «Deshacer»). */
export function toast(message, { action, onAction, duration = action ? 5000 : 2600 } = {}) {
  clearTimeout(host.toastTimer);
  host.toast = { message, action, onAction }; refresh();
  host.toastTimer = setTimeout(() => { host.toast = null; refresh(); }, duration);
}
/** Ejecuta una operación; los errores de validación se muestran como aviso. */
export function run(fn) {
  try {
    const result = fn();
    if (result?.catch) result.catch(report);
    return result;
  } catch (error) { report(error); return undefined; }
}
function report(error) {
  console.error(error);
  toast(error instanceof UserError ? error.message : `Algo salió mal: ${error.message ?? error}`);
}
export function confirmDialog(title, { message = '', confirm = 'Confirmar', cancel = 'Volver', danger = false } = {}) {
  return new Promise((resolve) => {
    host.dialog = { kind: 'confirm', title, message, confirm, cancel, danger, resolve };
    refresh();
  });
}
export function promptDialog(title, { value = '', placeholder = '', confirm = 'Guardar', message = '' } = {}) {
  return new Promise((resolve) => {
    host.dialog = { kind: 'prompt', title, message, value, placeholder, confirm, resolve };
    refresh();
  });
}
export function DialogHost() {
  const [, set] = useState({});
  useEffect(() => { host.listeners.add(set); return () => host.listeners.delete(set); }, []);
  const d = host.dialog;
  const close = (value) => { host.dialog = null; refresh(); d.resolve(value); };
  const t = host.toast;
  const act = () => { host.toast = null; refresh(); t.onAction?.(); };
  return html`
    ${d && html`<${DialogView} d=${d} close=${close} />`}
    ${t && html`<div class="toast" role="status"><span>${t.message}</span>${t.action && html`<button class="toast-action" onClick=${act}>${t.action}</button>`}</div>`}
    ${host.update && html`<div class="update-banner" role="status"><span>Hay una versión nueva de GymE&F.</span>
      <button class="toast-action" onClick=${() => location.reload()}>Actualizar</button></div>`}`;
}
// Aviso de actualización: el service worker instala la versión nueva en segundo plano.
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  navigator.serviceWorker.addEventListener('controllerchange', () => { host.update = true; refresh(); });
}
function DialogView({ d, close }) {
  const [value, setValue] = useState(d.value ?? '');
  const ref = useRef();
  useEffect(() => { ref.current?.focus(); }, []);
  const submit = (e) => { e.preventDefault(); close(d.kind === 'prompt' ? value : true); };
  return html`
    <div class="backdrop dialog-wrap" onClick=${(e) => e.target === e.currentTarget && close(d.kind === 'prompt' ? null : false)}>
      <form class="dialog" onSubmit=${submit} role="dialog" aria-modal="true">
        <h3>${d.title}</h3>
        ${d.message && html`<p>${d.message}</p>`}
        ${d.kind === 'prompt' && html`<input ref=${ref} class="input" value=${value} placeholder=${d.placeholder} onInput=${(e) => setValue(e.target.value)} />`}
        <div class="actions">
          <button class=${`btn block ${d.danger ? 'danger' : 'primary'}`} type="submit" disabled=${d.kind === 'prompt' && !value.trim()}>${d.confirm}</button>
          <button class="btn block plain" type="button" onClick=${() => close(d.kind === 'prompt' ? null : false)}>${d.cancel ?? 'Cancelar'}</button>
        </div>
      </form>
    </div>`;
}

// ---------- Componentes ----------
export const VERSION = '2026-11-06.fdfd6f0';

/** Zona donde se puede soltar un archivo arrastrado desde Finder (alternativa al selector de archivos). */
export function DropZone({ onFile, children }) {
  const [over, setOver] = useState(false);
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
  return html`
    <div class=${`dropzone ${over ? 'over' : ''}`}
      onDragEnter=${(e) => { stop(e); setOver(true); }} onDragOver=${(e) => { stop(e); setOver(true); }}
      onDragLeave=${(e) => { stop(e); if (!e.currentTarget.contains(e.relatedTarget)) setOver(false); }}
      onDrop=${(e) => { stop(e); setOver(false); const f = e.dataTransfer?.files?.[0]; if (f) onFile(f); }}>
      ${children}
    </div>`;
}
export function Page({ title, large, backTo, right, children, dock, className = '' }) {
  return html`
    <div class=${`page ${dock ? 'with-dock' : ''} ${className}`}>
      <header class="topbar">
        <div class="side">${backTo !== undefined && html`<button class="back" onClick=${() => back(backTo)} aria-label="Atrás">‹ Atrás</button>`}</div>
        <h1>${large ? '' : title}</h1>
        <div class="side right">${right}</div>
      </header>
      ${large && html`<h2 class="large-title">${title}</h2>`}
      ${children}
    </div>
    ${dock && html`<div class="dock"><div class="dock-inner">${dock}</div></div>`}`;
}
export const Section = ({ title, children, right }) => html`
  <div class="hstack section-title"><span class="spacer">${title}</span>${right}</div>${children}`;
// Íconos de línea propios (24×24, trazo 2). `name` es una clave de ICONS.
const ICONS = {
  home: '<path d="M3 11 12 4l9 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
  routines: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 3h6v3H9zM9 11h6M9 15h4"/>',
  progress: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  history: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  more: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  dumbbell: '<path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11"/>',
  body: '<circle cx="12" cy="4.5" r="2"/><path d="M5 9h14M12 9v5.5M8.5 21l3.5-6.5 3.5 6.5"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.6 4M16 6h2.5a2.5 2.5 0 0 1-2.6 4M12 13v4M8.5 20h7"/>',
  flame: '<path d="M12 3c.5 3.5 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2.6 1.4-3.9 2.3-5.6.6 1.3 1.4 2.1 2.2 2.6C12 8 11.6 5.5 12 3z"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2 1.5M10 2.5h4M18.5 6.5l1.5-1.5"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
  upload: '<path d="M12 20V9M7.5 13.5 12 9l4.5 4.5M5 4h14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M17.5 14.8c2 .7 3.4 2.4 4 5.2"/>',
  swap: '<path d="M7 7h12M16 4l3 3-3 3M17 17H5M8 14l-3 3 3 3"/>',
  sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  cloud: '<path d="M7 18.5h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 11.2 3.7 3.7 0 0 0 7 18.5z"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9.5a4 4 0 0 1 6 0M12 9.5l1.2-1.6"/>',
  camera: '<path d="M4 8h3.5L9 5.5h6L16.5 8H20v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  excel: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M4 9h16M4 14.5h16M10 9v11.5"/>',
};
export const Icon = ({ name, size = 22 }) => html`
  <svg class="ico" width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: ICONS[name] ?? '' }}></svg>`;
/** Anillo de avance (0–1) con texto en el centro. */
export function ProgressRing({ value, size = 64, children }) {
  const r = 26, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value || 0));
  return html`
    <div class="ring" style=${`width:${size}px;height:${size}px`}>
      <svg viewBox="0 0 64 64" width=${size} height=${size} aria-hidden="true">
        <circle cx="32" cy="32" r=${r} class="ring-track" />
        <circle cx="32" cy="32" r=${r} class="ring-value" stroke-dasharray=${c} stroke-dashoffset=${c * (1 - v)} transform="rotate(-90 32 32)" />
      </svg>
      <span class="ring-label">${children}</span>
    </div>`;
}
/** Lluvia de confeti breve para celebrar (se respeta «reducir movimiento»). */
export function Confetti() {
  const [on, setOn] = useState(!matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const t = setTimeout(() => setOn(false), 3200); return () => clearTimeout(t); }, []);
  if (!on) return null;
  const colors = confettiColors();
  return html`<div class="confetti" aria-hidden="true">${Array.from({ length: 36 }, (_, i) => html`
    <i style=${`left:${(i * 37) % 100}%;background:${colors[i % colors.length]};animation-delay:${(i % 9) * 0.12}s;--spin:${(i % 2 ? 1 : -1) * (180 + i * 20)}deg`}></i>`)}</div>`;
}
/** Mosaico de ícono con color, como en Ajustes de iOS. */
export const Tile = ({ name, color = 'var(--accent)', text }) => html`
  <span class="icon tile" style=${`--tint:${color}`} aria-hidden="true">${text ?? html`<${Icon} name=${name} size=${18} />`}</span>`;

export const Row = ({ title, sub, icon, onClick, href, right, chevron = true, children }) => {
  const body = html`
    ${icon && (typeof icon === 'string' ? html`<span class="icon" aria-hidden="true">${icon}</span>` : icon)}
    <span class="grow"><div class="title">${title}</div>${sub && html`<div class="sub">${sub}</div>`}${children}</span>
    ${right}${(onClick || href) && chevron && html`<span class="chev" aria-hidden="true">›</span>`}`;
  if (href) return html`<a class="row" href=${`#/${href}`}>${body}</a>`;
  if (onClick) return html`<button class="row" type="button" onClick=${onClick}>${body}</button>`;
  return html`<div class="row static">${body}</div>`;
};
export function Sheet({ title, onClose, right, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return html`
    <div class="backdrop" onClick=${(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label=${title}>
        <div class="sheet-head">
          <div class="side"><button class="btn plain" onClick=${onClose}>Cerrar</button></div>
          <h2>${title}</h2>
          <div class="side right">${right}</div>
        </div>
        ${children}
      </div>
    </div>`;
}
export const Segmented = ({ options, value, onChange }) => html`
  <div class="segmented" role="tablist">
    ${Object.entries(options).map(([k, label]) => html`
      <button type="button" role="tab" aria-selected=${k === value} class=${k === value ? 'on' : ''} onClick=${() => onChange(k)}>${label}</button>`)}
  </div>`;
/** `group`: para botones/opciones (un <label> activaría el primer botón al tocar el título). */
export const Field = ({ label, children, group }) => (group
  ? html`<div class="field" role="group" aria-label=${label}><span>${label}</span>${children}</div>`
  : html`<label class="field"><span>${label}</span>${children}</label>`);
export const Input = ({ value, onInput, ...rest }) => html`<input class="input" value=${value ?? ''} onInput=${(e) => onInput(e.target.value)} ...${rest} />`;
export const Stat = ({ value, label }) => html`<div class="stat"><div class="v">${value}</div><div class="l">${label}</div></div>`;
export function Stepper({ value, onInput, onStep, label, decimal }) {
  return html`
    <div class="stepper">
      <button type="button" class="step" aria-label=${`Reducir ${label}`} onClick=${() => onStep(-1)}>−</button>
      <input class="input" aria-label=${label} inputmode=${decimal ? 'decimal' : 'numeric'} value=${value}
        onInput=${(e) => onInput(e.target.value)} onFocus=${(e) => e.target.select()} />
      <button type="button" class="step" aria-label=${`Aumentar ${label}`} onClick=${() => onStep(1)}>+</button>
    </div>`;
}

/** Gráfica de línea simple en SVG. points: [{x: fecha ms, y: número}] */
export function LineChart({ points, format = (v) => v }) {
  const [selected, setSelected] = useState(null);
  if (points.length < 2) return html`<p class="muted small center">Necesitas al menos dos registros para ver la gráfica.</p>`;
  const W = 320, H = 160, P = { l: 40, r: 10, t: 12, b: 22 };
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  let [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const pad = (y1 - y0) * 0.1; y0 -= pad; y1 += pad;
  const sx = (x) => P.l + (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0)) * (W - P.l - P.r);
  const sy = (y) => P.t + (1 - (y - y0) / (y1 - y0)) * (H - P.t - P.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const ticks = [y0 + pad, (y0 + y1) / 2, y1 - pad];
  const date = (t) => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  const shown = points[selected ?? points.length - 1];
  return html`
    <div class="chart-readout"><b>${format(shown.y)}</b> <span class="muted small">· ${date(shown.x)}${selected == null ? ' (último)' : ''}</span></div>
    <svg class="chart" viewBox=${`0 0 ${W} ${H}`} role="img" aria-label="Gráfica de progreso. Toca un punto para ver su valor.">
      ${ticks.map((t) => html`<line class="grid" x1=${P.l} x2=${W - P.r} y1=${sy(t)} y2=${sy(t)} /><text class="lbl" x=${P.l - 6} y=${sy(t) + 4} text-anchor="end">${format(t)}</text>`)}
      <path class="line" d=${d} />
      ${points.map((p, i) => html`<circle class=${`dot ${i === selected ? 'on' : ''}`} cx=${sx(p.x)} cy=${sy(p.y)} r=${i === selected ? 5.5 : 3.5} />`)}
      ${points.map((p, i) => html`<circle class="hit" cx=${sx(p.x)} cy=${sy(p.y)} r="14" onClick=${() => setSelected(i === selected ? null : i)}><title>${date(p.x)}: ${format(p.y)}</title></circle>`)}
      <text class="lbl" x=${P.l} y=${H - 4}>${date(x0)}</text>
      <text class="lbl" x=${W - P.r} y=${H - 4} text-anchor="end">${date(x1)}</text>
    </svg>`;
}

// ---------- Temporizador de descanso (compartido, sobrevive a recargas) ----------
const TIMER_KEY = 'gymef.restTimer';
function readTimer() { try { return JSON.parse(localStorage.getItem(TIMER_KEY)) ?? {}; } catch { return {}; } }
function writeTimer(t) { try { localStorage.setItem(TIMER_KEY, JSON.stringify(t)); } catch {} host.listeners.forEach((fn) => fn({})); }
let audio;
export const restTimer = {
  start(seconds) {
    if (!(seconds > 0)) { writeTimer({}); return; }
    unlockAudio();
    writeTimer({ deadline: Date.now() + seconds * 1000, visible: true });
  },
  remaining(t = readTimer()) { return Math.max(0, t.paused ?? (t.deadline ? t.deadline - Date.now() : 0)); },
  pause() { const t = readTimer(); if (t.deadline) writeTimer({ ...t, paused: this.remaining(t), deadline: null }); },
  resume() { const t = readTimer(); if (t.paused != null) writeTimer({ ...t, deadline: Date.now() + t.paused, paused: null }); },
  add(s) { const t = readTimer(); writeTimer(t.paused != null ? { ...t, paused: t.paused + s * 1000, notified: false } : { ...t, deadline: Date.now() + this.remaining(t) + s * 1000, notified: false }); },
  skip() { writeTimer({}); },
};
function unlockAudio() {
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch {}
}
function chime() {
  try { navigator.vibrate?.([200, 100, 200]); } catch {}
  if (!audio) return;
  const now = audio.currentTime;
  [0, 0.25].forEach((delay) => {
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
    g.gain.setValueAtTime(0.0001, now + delay);
    g.gain.exponentialRampToValueAtTime(0.3, now + delay + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.2);
    o.start(now + delay); o.stop(now + delay + 0.22);
  });
}
/** `presets`: si no hay descanso en marcha, ofrece iniciarlo a mano (ejercicios sin descanso configurado). */
export function RestTimer({ presets = false }) {
  const [, set] = useState({});
  useEffect(() => { host.listeners.add(set); return () => host.listeners.delete(set); }, []);
  useTick(500);
  const t = readTimer();
  const secs = Math.ceil(restTimer.remaining(t) / 1000);
  // Avisa una sola vez, aunque el temporizador se muestre en varias pantallas.
  useEffect(() => { if (t.visible && secs === 0 && t.deadline && !t.notified) { writeTimer({ ...t, notified: true }); chime(); } });
  if (!t.visible) {
    return presets ? html`
      <div class="timer idle"><span class="small muted">Descansar</span><span class="spacer"></span>
        ${[60, 90, 120, 180].map((s) => html`<button class="btn" onClick=${() => restTimer.start(s)}>${s % 60 ? `${Math.floor(s / 60)}:30` : `${s / 60} min`}</button>`)}
      </div>` : null;
  }
  return html`
    <div class=${`timer ${secs === 0 ? 'done' : ''}`} role="timer">
      <span aria-hidden="true">${secs === 0 ? '✓' : '⏱'}</span>
      <span class="time">${secs === 0 ? 'Descanso terminado' : `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`}</span>
      ${t.paused != null && html`<span class="small muted">Pausado</span>`}
      <span class="spacer"></span>
      ${secs > 0 && html`<button class="btn" onClick=${() => restTimer.add(30)} aria-label="Añadir treinta segundos">+30 s</button>
      <button class="btn" onClick=${() => (t.paused != null ? restTimer.resume() : restTimer.pause())}>${t.paused != null ? 'Reanudar' : 'Pausar'}</button>`}
      <button class="btn" onClick=${() => restTimer.skip()}>${secs === 0 ? 'Cerrar' : 'Omitir'}</button>
    </div>`;
}

/** Mantiene la pantalla encendida mientras se entrena (si el navegador lo permite). */
export function useWakeLock(enabled) {
  useEffect(() => {
    if (!enabled || !navigator.wakeLock) return undefined;
    let lock = null;
    const request = () => navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => {});
    request();
    const on = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', on);
    return () => { document.removeEventListener('visibilitychange', on); lock?.release().catch(() => {}); };
  }, [enabled]);
}
