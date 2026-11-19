// Teclado propio de la app, como una calculadora: se escriben peso, repeticiones y minutos sin el teclado del
// teléfono. Así el teclado nunca se cierra a media suma y el iPhone no pregunta «Deshacer texto escrito» al moverlo.
import { html, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import * as D from './domain.js';
import { Sheet } from './ui.js';

// Los discos grandes primero, para que se vean sin deslizar.
const PLATES = { kg: [25, 20, 15, 10, 5, 2.5, 1.25], lb: [45, 35, 25, 10, 5, 2.5] };
const other = (u) => (u === 'kg' ? 'lb' : 'kg');
const MAX_DIGITS = 7;

/** Suma de los números escritos, en `unit` (los que están en la otra unidad se convierten). */
function total(terms, unit) {
  const nums = terms.map((t) => ({ value: D.parseNumber(t.text), unit: t.unit })).filter((t) => t.value != null);
  const mixed = nums.some((t) => t.unit !== unit);
  const raw = nums.reduce((a, t) => a + D.convert(t.value, t.unit, unit), 0);
  return { value: Math.round(raw * (mixed ? 10 : 100)) / (mixed ? 10 : 100), count: nums.length, mixed };
}

/** Una tecla sobre el estado { terms, fresh }; devuelve el estado nuevo (sin efectos, para no perder toques rápidos). */
function apply(state, key, mode, unit) {
  const { terms, fresh } = state;
  const weight = mode === 'weight';
  const current = terms[terms.length - 1];
  const withCurrent = (changes) => ({ terms: [...terms.slice(0, -1), { ...current, ...changes }], fresh: false });
  if (/^\d$/.test(key)) {
    if (fresh) return { terms: [{ text: key, unit: current.unit }], fresh: false };
    if (current.text.replace(',', '').length >= MAX_DIGITS) return state;
    return withCurrent({ text: current.text === '0' ? key : current.text + key });
  }
  switch (key) {
    case ',':
      if (mode === 'integer') return state;
      if (fresh) return { terms: [{ text: '0,', unit: current.unit }], fresh: false };
      return current.text.includes(',') ? state : withCurrent({ text: `${current.text || '0'},` });
    case 'back':
      if (fresh) return { terms: [{ text: '', unit: current.unit }], fresh: false };
      if (current.text) return withCurrent({ text: current.text.slice(0, -1) });
      return terms.length > 1 ? { terms: terms.slice(0, -1), fresh: false } : state;
    case 'clear': return { terms: [{ text: '', unit }], fresh: false };
    case '+':
      if (!weight) return state;
      return current.text && D.parseNumber(current.text) != null ? { terms: [...terms, { text: '', unit: current.unit }], fresh: false } : { terms, fresh: false };
    case 'unit': return weight ? withCurrent({ unit: other(current.unit) }) : state;
    case '=': {
      if (!weight) return state;
      const sum = total(terms, unit);
      return { terms: [{ text: sum.count ? D.inputNumber(sum.value) : '', unit }], fresh: false };
    }
    default: return state;
  }
}
/** Disco tocado: si no hay número en curso lo escribe; si lo hay, lo suma como otro número (misma unidad). */
function addPlate({ terms, fresh }, plate) {
  const current = terms[terms.length - 1];
  const text = D.inputNumber(plate);
  if (fresh) return { terms: [{ text, unit: current.unit }], fresh: false };
  if (!current.text) return { terms: [...terms.slice(0, -1), { ...current, text }], fresh: false };
  return { terms: [...terms, { text, unit: current.unit }], fresh: false };
}
function resultOf({ terms }, mode, unit) {
  if (mode !== 'weight') return terms[terms.length - 1].text.replace(/,$/, '');
  const sum = total(terms, unit);
  return sum.count ? D.inputNumber(sum.value) : '';
}

/**
 * Calculadora del gimnasio. `mode`: 'weight' (suma con +, discos y kg/lb por número), 'decimal' (minutos, km)
 * o 'integer' (repeticiones). El valor inicial se muestra en gris: el primer número lo reemplaza y «+» le suma.
 * `onDone(texto)` recibe el resultado listo para el campo (con coma decimal).
 */
export function Calculator({ value = '', unit = 'kg', mode = 'weight', onDone, doneLabel = 'Listo', onTools }) {
  const weight = mode === 'weight';
  // El estado vive en una referencia: cada toque lee el último valor aunque la pantalla aún no se haya redibujado.
  const state = useRef(null);
  state.current ??= { terms: [{ text: String(value ?? ''), unit }], fresh: String(value ?? '') !== '' };
  const [, redraw] = useState(0);
  const update = (next) => { if (next !== state.current) { state.current = next; redraw((n) => n + 1); } };
  const press = (key) => update(apply(state.current, key, mode, unit));
  const finish = () => onDone?.(resultOf(state.current, mode, unit));
  const latest = useRef();
  latest.current = { press, finish };

  // Con teclado físico (computadora) también funciona: números, coma o punto, +, =, borrar, Enter.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const map = { Backspace: 'back', Delete: 'clear', '.': ',', ',': ',', '+': '+', '=': '=' };
      if (e.key === 'Enter') { e.preventDefault(); latest.current.finish(); return; }
      const key = /^\d$/.test(e.key) ? e.key : map[e.key];
      if (key) { e.preventDefault(); latest.current.press(key); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const { terms, fresh } = state.current;
  const current = terms[terms.length - 1];
  const sum = weight ? total(terms, unit) : null;
  const showUnits = weight && terms.some((t) => t.unit !== unit);
  const shown = (t) => `${t.text || '…'}${showUnits ? ` ${t.unit}` : ''}`;
  const keys = ['7', '8', '9', 'back', '4', '5', '6', 'clear', '1', '2', '3', weight ? '+' : '', mode === 'integer' ? '' : ',', '0', weight ? 'unit' : '', weight ? '=' : ''];
  const labels = { back: '⌫', clear: 'C', unit: current.unit, '=': '=' };
  const aria = { back: 'Borrar', clear: 'Borrar todo', '+': 'Sumar otro peso', unit: `Este número está en ${current.unit}; tocar para cambiar a ${other(current.unit)}`, '=': 'Resultado' };
  return html`
    <div class="calc-display" aria-live="polite">
      ${weight && (terms.length > 1 || showUnits) && html`<div class="calc-expr">${terms.map(shown).join(' + ')}</div>`}
      <div class=${`calc-value ${fresh ? 'fresh' : ''}`}>${weight && (terms.length > 1 || showUnits) ? `= ${D.display(sum.value)}` : current.text || '0'}${weight && html`<small>${unit}</small>`}</div>
    </div>
    ${weight && html`<div class="calc-plates" role="group" aria-label=${`Sumar un disco en ${current.unit}`}>
      <span class="small muted">Discos ${current.unit}</span>
      ${PLATES[current.unit].map((p) => html`<button type="button" class="chip" onClick=${() => update(addPlate(state.current, p))}>+${D.display(p)}</button>`)}
    </div>`}
    <div class="keys">
      ${keys.map((k) => html`<button type="button" class=${`key ${['+', '=', 'unit', 'back', 'clear'].includes(k) ? 'op' : ''}`} disabled=${!k}
        aria-label=${aria[k] ?? k} onClick=${() => press(k)}>${labels[k] ?? k}</button>`)}
    </div>
    ${onDone && html`<button type="button" class="btn primary block big" style="margin-top:12px" onClick=${finish}>
      ${weight && sum.count ? `${doneLabel} · ${D.display(sum.value)} ${unit}` : doneLabel}</button>`}
    ${onTools && html`<button type="button" class="btn plain block" onClick=${onTools}>Convertir kg ↔ lb · ¿Qué discos pongo?</button>`}`;
}

/** Hoja con la calculadora para escribir un número; `onDone(texto)` lo devuelve al campo. */
export function KeypadSheet({ title, value, unit, mode, onDone, onClose, onTools }) {
  return html`<${Sheet} title=${title} onClose=${onClose}>
    <${Calculator} value=${value} unit=${unit} mode=${mode} onDone=${onDone} onTools=${onTools} />
  <//>`;
}

/**
 * − número + : los botones suben o bajan; tocar el número abre la calculadora (sin el teclado del teléfono).
 * `header(abrir)` permite poner arriba un enlace que también la abre.
 */
export function NumberStepper({ value, onChange, onStep, label, title = label, mode = 'integer', unit, header, onTools }) {
  const [open, setOpen] = useState(false);
  return html`
    ${header?.(() => setOpen(true))}
    <div class="stepper">
      <button type="button" class="step" aria-label=${`Reducir ${label}`} onClick=${() => onStep(-1)}>−</button>
      <button type="button" class="input stepper-value" aria-label=${label} onClick=${() => setOpen(true)}>${value || html`<span class="muted">0</span>`}</button>
      <button type="button" class="step" aria-label=${`Aumentar ${label}`} onClick=${() => onStep(1)}>+</button>
    </div>
    ${open && html`<${KeypadSheet} title=${title} value=${value} unit=${unit} mode=${mode} onClose=${() => setOpen(false)}
      onDone=${(text) => { onChange(text); setOpen(false); }} onTools=${onTools && (() => { setOpen(false); onTools(); })} />`}`;
}
