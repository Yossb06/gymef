import { html, useState } from '../../vendor/preact-htm.js';
import * as D from '../domain.js';
import { Sheet, Segmented, Field } from '../ui.js';

const PLATES = { kg: [25, 20, 15, 10, 5, 2.5, 1.25], lb: [45, 35, 25, 10, 5, 2.5] };
// Claves con prefijo para conservar el orden (las claves numéricas se ordenarían de menor a mayor).
const BARS = { kg: { b20: 'Olímpica 20', b15: '15', b10: '10', b0: 'Sin barra' }, lb: { b45: 'Olímpica 45', b35: '35', b25: '25', b0: 'Sin barra' } };

/** Discos por lado para llegar a `total` con una barra de `bar`; lo que no se puede cuadrar queda en `left`. */
export function platesFor(total, bar, unit) {
  let side = (total - bar) / 2;
  if (!(side > 0)) return { plates: [], left: Math.max(0, side * 2) };
  const plates = [];
  for (const p of PLATES[unit]) {
    while (side >= p - 1e-9) { plates.push(p); side -= p; }
  }
  return { plates, left: Math.round(side * 2 * 100) / 100 };
}

/** Calculadora: convertir kg ↔ lb y «¿Qué discos pongo?». `onUse` devuelve el peso al campo de la serie. */
export function WeightTools({ unit = 'kg', start = null, onUse, onClose }) {
  const [tab, setTab] = useState('convert');
  const [from, setFrom] = useState(unit);
  const [amount, setAmount] = useState(start ? D.inputNumber(start) : '');
  const [plateUnit, setPlateUnit] = useState(unit);
  const [target, setTarget] = useState(start ? D.inputNumber(start) : '');
  const [bar, setBar] = useState(unit === 'kg' ? 'b20' : 'b45');
  const barWeight = Number(bar.slice(1));
  const to = from === 'kg' ? 'lb' : 'kg';
  const value = D.parseNumber(amount);
  const converted = value > 0 ? Math.round(D.convert(value, from, to) * 10) / 10 : null;
  const goal = D.parseNumber(target);
  const result = goal > 0 ? platesFor(goal, barWeight, plateUnit) : null;
  const counts = result ? Object.entries(result.plates.reduce((a, p) => ({ ...a, [p]: (a[p] ?? 0) + 1 }), {})).sort((a, b) => b[0] - a[0]) : [];
  return html`
    <${Sheet} title="Calculadora" onClose=${onClose}>
      <${Segmented} options=${{ convert: 'Convertir kg ↔ lb', plates: '¿Qué discos pongo?' }} value=${tab} onChange=${setTab} />
      ${tab === 'convert' ? html`
        <div class="card stack" style="margin-top:12px">
          <${Field} group label="Convertir de"><${Segmented} options=${{ kg: 'kg → lb', lb: 'lb → kg' }} value=${from} onChange=${setFrom} /><//>
          <${Field} label=${`Peso en ${from}`}><input class="input big-input" inputmode="decimal" value=${amount} onInput=${(e) => setAmount(e.target.value)} placeholder="0" /><//>
          <div class="conversion-result">${converted !== null ? html`<b>${D.display(converted)} ${to}</b>` : html`<span class="muted">Escribe un peso</span>`}</div>
          <div class="chips wrap">${(from === 'kg' ? [2.5, 5, 10, 20, 25, 50] : [5, 10, 25, 35, 45, 100]).map((v) => html`
            <button type="button" class="chip" onClick=${() => setAmount(D.inputNumber(v))}>${D.display(v)} ${from}</button>`)}</div>
          ${onUse && converted !== null && to === unit && html`<button class="btn primary block" onClick=${() => onUse(converted)}>Usar ${D.display(converted)} ${to} en la serie</button>`}
          ${onUse && value > 0 && from === unit && html`<button class="btn block" onClick=${() => onUse(value)}>Usar ${D.display(value)} ${from} en la serie</button>`}
        </div>` : html`
        <div class="card stack" style="margin-top:12px">
          <${Field} group label="Unidad de los discos"><${Segmented} options=${{ kg: 'kg', lb: 'lb' }} value=${plateUnit}
            onChange=${(u) => { setPlateUnit(u); setBar(u === 'kg' ? 'b20' : 'b45'); }} /><//>
          <${Field} label=${`Peso total que quieres (${plateUnit})`}><input class="input big-input" inputmode="decimal" value=${target} onInput=${(e) => setTarget(e.target.value)} placeholder="0" /><//>
          <${Field} group label="Barra"><${Segmented} options=${BARS[plateUnit]} value=${bar} onChange=${setBar} /><//>
          ${result && (goal < barWeight
            ? html`<p class="muted small" style="margin:0">El peso es menor que la barra.</p>`
            : html`
              <div class="plates-result">
                <div class="caps">De cada lado</div>
                ${counts.length ? html`<div class="plates">${counts.map(([p, n]) => html`<span class="plate" style=${`--h:${34 + Number(p) * (plateUnit === 'kg' ? 1.6 : 0.8)}px`}>${n} × ${D.display(Number(p))}</span>`)}</div>`
                  : html`<div class="muted small">Solo la barra.</div>`}
                ${result.left > 0 && html`<div class="small" style="margin-top:6px;color:var(--danger)">No se puede exacto: faltan ${D.display(result.left)} ${plateUnit} con estos discos.</div>`}
              </div>`)}
          <p class="muted small" style="margin:0">Discos: ${PLATES[plateUnit].map((p) => D.display(p)).join(', ')} ${plateUnit}.</p>
        </div>`}
    <//>`;
}
