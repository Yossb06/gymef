import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import * as data from '../data.js';
import * as D from '../domain.js';
import { store } from '../store.js';
import { compressImage } from '../media.js';
import { Page, Section, Row, Sheet, Field, Input, Segmented, LineChart, run, toast, confirmDialog } from '../ui.js';

const toLocalDate = (t) => { const d = new Date(t); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
// El peso se guarda en kg y se muestra en la unidad del perfil; las medidas, en cm.
let weightUnit = 'kg';
const unitOf = (metric) => (metric === 'bodyWeight' ? weightUnit : 'cm');
const shown = (metric, v) => (metric === 'bodyWeight' ? D.convert(v, 'kg', weightUnit) : v);
const stored = (metric, v) => (metric === 'bodyWeight' ? D.convert(v, weightUnit, 'kg') : v);

export function BodyView({ owner }) {
  const [tab, setTab] = useState('measures');
  const [metric, setMetric] = useState('bodyWeight');
  weightUnit = data.unitFor(owner, null);
  const [sheet, setSheet] = useState(null);
  const list = data.measurements(owner);
  const points = list.filter((m) => m[metric] != null).map((m) => ({ x: m.recordedAt, y: shown(metric, m[metric]) })).reverse();
  const available = Object.fromEntries(Object.entries(D.BODY_METRICS).filter(([k]) => k === 'bodyWeight' || list.some((m) => m[k] != null)));
  return html`
    <${Page} title="Progreso corporal" backTo="">
      <${Segmented} options=${{ measures: 'Medidas', photos: 'Fotos' }} value=${tab} onChange=${setTab} />
      ${tab === 'measures' ? html`
        <div class="card stack" style="margin-top:12px">
          <select class="input" value=${metric} onChange=${(e) => setMetric(e.target.value)}>
            ${Object.entries(available).map(([k, v]) => html`<option value=${k}>${v}</option>`)}
          </select>
          <${LineChart} points=${points} format=${(v) => `${D.display(Math.round(v * 10) / 10)}`} />
          ${points.length >= 2 && html`<div class="small muted center">Cambio: ${D.display(Math.round((points[points.length - 1].y - points[0].y) * 10) / 10)} ${unitOf(metric)}</div>`}
        </div>
        <button class="btn primary block" style="margin-top:12px" onClick=${() => setSheet({ measure: null })}>+ Registrar medidas</button>
        <${Section} title="Registros">
          <div class="list">
            ${list.length === 0 && html`<div class="row static muted">Aún no hay medidas.</div>`}
            ${list.map((m) => html`<${Row} title=${D.formatDate(m.recordedAt, { day: 'numeric', month: 'short', year: 'numeric' })}
              sub=${Object.keys(D.BODY_METRICS).filter((k) => m[k] != null).map((k) => `${D.BODY_METRICS[k]} ${D.display(Math.round(shown(k, m[k]) * 10) / 10)} ${unitOf(k)}`).join(' · ')}
              onClick=${() => setSheet({ measure: m })} />`)}
          </div>
        <//>` : html`<${Photos} owner=${owner} />`}
    <//>
    ${sheet && 'measure' in sheet && html`<${MeasureSheet} owner=${owner} record=${sheet.measure} onClose=${() => setSheet(null)} />`}`;
}

function MeasureSheet({ owner, record, onClose }) {
  const [date, setDate] = useState(toLocalDate(record?.recordedAt ?? Date.now()));
  const [values, setValues] = useState(Object.fromEntries(Object.keys(D.BODY_METRICS).map((k) => [k, record?.[k] != null ? D.inputNumber(shown(k, record[k])) : ''])));
  const save = () => run(() => {
    const parsed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim() ? (D.parseNumber(v) == null ? NaN : stored(k, D.parseNumber(v))) : null]));
    const [y, m, d] = date.split('-').map(Number);
    data.saveMeasurement(owner, record?.id ?? null, new Date(y, m - 1, d, 12).getTime(), parsed);
    toast('Medidas guardadas'); onClose();
  });
  const remove = async () => {
    if (await confirmDialog('¿Eliminar este registro?', { confirm: 'Eliminar', danger: true })) { run(() => data.deleteMeasurement(owner, record.id)); onClose(); }
  };
  return html`
    <${Sheet} title=${record ? 'Editar medidas' : 'Nuevas medidas'} onClose=${onClose} right=${html`<button class="btn plain" onClick=${save}>Guardar</button>`}>
      <div class="card">
        <${Field} label="Fecha"><input class="input" type="date" value=${date} onInput=${(e) => setDate(e.target.value)} /><//>
        <div class="grid2" style="margin-top:12px">
          ${Object.entries(D.BODY_METRICS).map(([k, label]) => html`<${Field} label=${`${label} (${unitOf(k)})`}>
            <${Input} inputmode="decimal" value=${values[k]} onInput=${(v) => setValues({ ...values, [k]: v })} /><//>`)}
        </div>
      </div>
      ${record && html`<button class="btn block danger" style="margin-top:12px" onClick=${remove}>Eliminar registro</button>`}
    <//>`;
}

function Thumb({ photo, onClick }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { store.blobURL(photo.id).then(setUrl).catch(() => setUrl(null)); }, [photo.id]);
  return html`<button onClick=${onClick} aria-label=${`Foto del ${D.formatDate(photo.capturedAt)}`}>${url && html`<img src=${url} alt="" loading="lazy" />`}</button>`;
}

function Photos({ owner }) {
  const [category, setCategory] = useState('front');
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null);
  const list = data.photos(owner);
  async function add(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try { await data.addPhoto(owner, await compressImage(file), file.lastModified || Date.now(), category); toast('Foto guardada'); }
    catch (error) { toast(`No se pudo guardar la foto: ${error.message}`); }
    setBusy(false);
  }
  return html`
    <div class="card stack" style="margin-top:12px">
      <${Field} label="Categoría de la nueva foto">
        <select class="input" value=${category} onChange=${(e) => setCategory(e.target.value)}>
          ${Object.entries(D.PHOTO_CATEGORIES).map(([k, v]) => html`<option value=${k}>${v}</option>`)}
        </select><//>
      <label class=${`btn primary block ${busy ? 'disabled' : ''}`}>${busy ? 'Guardando…' : '+ Añadir foto'}<input type="file" accept="image/*" hidden disabled=${busy} onChange=${add} /></label>
      <p class="muted small" style="margin:0">Las fotos son privadas de tu cuenta${store.mode === 'cloud' ? ' y se guardan en la nube' : ' y se guardan solo en este dispositivo'}.</p>
    </div>
    ${Object.entries(D.PHOTO_CATEGORIES).map(([k, label]) => {
      const items = list.filter((p) => p.category === k);
      return items.length > 0 && html`<${Section} title=${label}><div class="photos">${items.map((p) => html`<${Thumb} photo=${p} onClick=${() => setViewing(p)} />`)}</div><//>`;
    })}
    ${list.length === 0 && html`<div class="empty">Aún no hay fotos de progreso.</div>`}
    ${viewing && html`<${Viewer} owner=${owner} photo=${viewing} onClose=${() => setViewing(null)} />`}`;
}

function Viewer({ owner, photo, onClose }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { store.blobURL(photo.id).then(setUrl).catch(() => {}); }, [photo.id]);
  const remove = async () => {
    if (!(await confirmDialog('¿Eliminar esta foto?', { message: 'No se puede deshacer.', confirm: 'Eliminar', danger: true }))) return;
    try { await data.deletePhoto(owner, photo.id); onClose(); } catch (e) { toast(`No se pudo eliminar: ${e.message}`); }
  };
  return html`
    <${Sheet} title=${`${D.PHOTO_CATEGORIES[photo.category]} · ${D.formatDate(photo.capturedAt, { day: 'numeric', month: 'short', year: 'numeric' })}`} onClose=${onClose}>
      <div class="viewer">${url ? html`<img src=${url} alt="Foto de progreso" />` : html`<p class="muted center">Cargando…</p>`}</div>
      <button class="btn block danger" style="margin-top:12px" onClick=${remove}>Eliminar foto</button>
    <//>`;
}
