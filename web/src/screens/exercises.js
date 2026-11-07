import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import * as data from '../data.js';
import * as D from '../domain.js';
import { Page, Section, Row, Sheet, Field, Input, Segmented, Icon, Tile, run, toast, go } from '../ui.js';
import { guideFor, videoURL } from '../guides.js';
import { builtInFrames, customMedia, mediaURL, addExerciseMedia, removeExerciseMedia } from '../media.js';
import { activeProfileID } from '../session.js';
import { confirmDialog } from '../ui.js';

const RANGES = { '6-8': '6–8', '8-10': '8–10', '8-12': '8–12', '10-15': '10–15', '12-15': '12–15' };
/** Series y rango de repeticiones con botones rápidos. */
export function PrescriptionPicker({ value, onChange }) {
  const range = `${value.repsMin}-${value.repsMax}`;
  return html`
    <div class="stack">
      <${Field} group label="Series"><${Segmented} options=${{ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }} value=${String(value.sets)} onChange=${(v) => onChange({ ...value, sets: Number(v) })} /><//>
      <${Field} group label="Repeticiones"><${Segmented} options=${RANGES} value=${RANGES[range] ? range : ''}
        onChange=${(v) => { const [repsMin, repsMax] = v.split('-').map(Number); onChange({ ...value, repsMin, repsMax }); }} /><//>
    </div>`;
}

export const MuscleTile = ({ muscle }) => html`<${Tile} color=${D.muscleColor(muscle)} text=${(muscle ?? '?').slice(0, 2)} />`;

/** Lista de la biblioteca con búsqueda y filtro por músculo; agrupada por músculo. */
function SearchList({ onPick, hrefFor, selected }) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState('');
  const all = data.exercises();
  const muscleOf = (e) => (e.primaryMuscle ?? '').trim() || 'Sin especificar';
  const muscles = [...new Set(all.map(muscleOf))].sort((a, b) => a.localeCompare(b, 'es'));
  const list = all.filter((e) => (!query.trim() || D.matchesSearch(e, query)) && (!muscle || muscleOf(e) === muscle));
  const groups = query.trim() ? [['Resultados', list]] : muscles.filter((m) => !muscle || m === muscle)
    .map((m) => [m, list.filter((e) => muscleOf(e) === m)]).filter(([, items]) => items.length);
  const row = (e) => html`<${Row} icon=${html`<${MuscleTile} muscle=${e.primaryMuscle} />`} title=${e.name} sub=${`${e.equipment} · ${D.LOAD_TYPES[e.loadType]}`}
    onClick=${onPick && (() => onPick(e))} href=${hrefFor?.(e)} chevron=${!selected}
    right=${selected && html`<span class=${`pick ${selected.has(e.id) ? 'on' : ''}`}>${selected.has(e.id) && html`<${Icon} name="check" size=${16} />`}</span>`} />`;
  return html`
    <input class="input" type="search" placeholder="Buscar por nombre, músculo o equipo" value=${query} onInput=${(e) => setQuery(e.target.value)} />
    <div class="chips">
      <button class=${`chip ${!muscle ? 'on' : ''}`} onClick=${() => setMuscle('')}>Todos</button>
      ${muscles.map((m) => html`<button class=${`chip ${muscle === m ? 'on' : ''}`} style=${`--tint:${D.muscleColor(m)}`} onClick=${() => setMuscle(muscle === m ? '' : m)}><i></i>${m}</button>`)}
    </div>
    ${list.length === 0 && html`<div class="list"><div class="row static muted">Sin resultados.</div></div>`}
    ${groups.map(([title, items]) => html`<${Section} title=${title}><div class="list">${items.map(row)}</div><//>`)}`;
}

/**
 * Selector de ejercicios. Con `multiple`, se marcan varios y se añaden juntos con la misma prescripción;
 * con `prescription`, pide series y repeticiones antes de confirmar.
 */
export function ExercisePicker({ title = 'Elegir ejercicio', onPick, onPickMany, onClose, multiple = false, prescription = false, footer }) {
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [single, setSingle] = useState(null);
  const [rx, setRx] = useState({ sets: 3, repsMin: 8, repsMax: 12 });
  const toggle = (e) => { const next = new Set(selected); next.has(e.id) ? next.delete(e.id) : next.add(e.id); setSelected(next); };
  const choose = (e) => (multiple ? toggle(e) : prescription ? setSingle(e) : onPick(e));
  if (single) {
    return html`<${Sheet} title=${single.name} onClose=${() => setSingle(null)}
      right=${html`<button class="btn plain" onClick=${() => onPick(single, rx)}>Añadir</button>`}>
      <div class="card"><${PrescriptionPicker} value=${rx} onChange=${setRx} /></div>
      ${footer?.(rx)}
      <button class="btn primary block big" style="margin-top:16px" onClick=${() => onPick(single, rx)}><${Icon} name="plus" /> Añadir ${single.name}</button>
    <//>`;
  }
  return html`
    <${Sheet} title=${title} onClose=${onClose} right=${html`<button class="btn plain" onClick=${() => setCreating(true)}>Nuevo</button>`}>
      <${SearchList} onPick=${choose} selected=${multiple ? selected : null} />
      ${multiple && html`<div class="sheet-dock">
        ${selected.size > 0 && html`<${PrescriptionPicker} value=${rx} onChange=${setRx} />`}
        <button class="btn primary block big" disabled=${!selected.size} onClick=${() => onPickMany([...selected], rx)}>
          ${selected.size ? `Añadir ${selected.size} ${selected.size === 1 ? 'ejercicio' : 'ejercicios'} · ${rx.sets} × ${rx.repsMin}–${rx.repsMax}` : 'Elige uno o varios ejercicios'}
        </button></div>`}
    <//>
    ${creating && html`<${ExerciseForm} onClose=${() => setCreating(false)} onSaved=${(e) => { setCreating(false); choose(e); }} />`}`;
}

export function Library() {
  const [creating, setCreating] = useState(false);
  const [review, setReview] = useState(false);
  const missing = data.exercisesWithoutLoad().length;
  return html`
    <${Page} title="Ejercicios" backTo="" right=${html`<button class="btn plain" onClick=${() => setCreating(true)}>+ Nuevo</button>`}>
      ${missing > 0 && html`<button class="notice" onClick=${() => setReview(true)}>
        <span class="notice-icon">💡</span><span class="spacer"><b>${missing} ${missing === 1 ? 'ejercicio' : 'ejercicios'} sin tipo de carga</b>
        <span class="small muted">Complétalos para recibir sugerencias y récords</span></span><span class="chev">›</span></button>`}
      <${SearchList} hrefFor=${(e) => `ejercicio/${e.id}`} />
    <//>
    ${creating && html`<${ExerciseForm} onClose=${() => setCreating(false)} onSaved=${(e) => { setCreating(false); go(`ejercicio/${e.id}`); }} />`}
    ${review && html`<${LoadTypeReview} onClose=${() => setReview(false)} />`}`;
}

// Tipos de carga más comunes primero, con una pista corta.
const LOAD_CHOICES = [
  ['totalWeight', 'Barra o peso libre total'], ['dumbbellPerHand', 'Peso de cada mancuerna'], ['machine', 'Placas o pines'],
  ['cable', 'Polea o cable'], ['bodyweight', 'Solo tu cuerpo'], ['bodyweightPlusLoad', 'Cuerpo + disco o cinturón'],
  ['assisted', 'Máquina que te ayuda'], ['noExternalLoad', 'Sin peso (p. ej. plancha)'], ['unspecified', 'Lo decido después'],
];
const EQUIPMENT_FOR = { totalWeight: 'Barra', dumbbellPerHand: 'Mancuernas', machine: 'Máquina', cable: 'Polea', assisted: 'Máquina' };

export function ExerciseForm({ exercise, onClose, onSaved }) {
  const [f, setF] = useState(exercise ?? { name: '', primaryMuscle: '', equipment: '', loadType: 'unspecified', isUnilateral: false, instructionsText: '', aliasesText: '' });
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const save = () => run(() => { const saved = data.saveExercise(f); toast('Ejercicio guardado'); onSaved?.(saved); });
  const muscles = [...new Set([...data.exercises().map((e) => e.primaryMuscle), 'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Gemelos', 'Abdomen'])]
    .filter((m) => m && m !== 'Sin especificar').sort((a, b) => a.localeCompare(b, 'es'));
  return html`
    <${Sheet} title=${exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'} onClose=${onClose}
      right=${html`<button class="btn plain" disabled=${!f.name.trim()} onClick=${save}>Guardar</button>`}>
      <div class="card">
        <${Field} label="Nombre"><${Input} value=${f.name} onInput=${set('name')} /><//>
        <${Field} group label="Músculo principal">
          <div class="chips wrap">${muscles.map((m) => html`<button type="button" class=${`chip ${f.primaryMuscle === m ? 'on' : ''}`} style=${`--tint:${D.muscleColor(m)}`} onClick=${() => set('primaryMuscle')(m)}><i></i>${m}</button>`)}</div>
          <${Input} value=${f.primaryMuscle === 'Sin especificar' ? '' : f.primaryMuscle} placeholder="U otro músculo" onInput=${set('primaryMuscle')} /><//>
        <${Field} group label="Tipo de carga">
          <div class="choice-grid">${LOAD_CHOICES.map(([k, hint]) => html`<button type="button" class=${`choice ${f.loadType === k ? 'on' : ''}`} onClick=${() => setF({ ...f, loadType: k, equipment: f.equipment && f.equipment !== 'Sin especificar' ? f.equipment : EQUIPMENT_FOR[k] ?? f.equipment })}>
            <b>${D.LOAD_TYPES[k]}</b><span>${hint}</span></button>`)}</div><//>
        <${Field} label="Equipo"><${Input} value=${f.equipment === 'Sin especificar' ? '' : f.equipment} placeholder="Barra, máquina, polea…" onInput=${set('equipment')} /><//>
        <label class="check"><input type="checkbox" checked=${f.isUnilateral} onChange=${(e) => set('isUnilateral')(e.target.checked)} /> Reps por lado (unilateral)</label>
        <${Field} label="Instrucciones"><textarea class="input" value=${f.instructionsText} onInput=${(e) => set('instructionsText')(e.target.value)} /><//>
        <${Field} label="Otros nombres (para buscar)"><${Input} value=${f.aliasesText} onInput=${set('aliasesText')} /><//>
      </div>
      ${exercise && html`<p class="muted small">Los entrenamientos anteriores conservan los datos con que se registraron.</p>`}
    <//>`;
}

export function PreferenceSheet({ owner, exerciseID, onClose }) {
  const ex = data.exercise(exerciseID);
  const p = data.preference(owner, exerciseID) ?? {};
  const profileUnit = data.profile(owner).defaultLoadUnitRaw;
  const [unit, setUnit] = useState(p.preferredLoadUnit ?? '');
  const [incUnit, setIncUnit] = useState(p.incrementUnit ?? p.preferredLoadUnit ?? profileUnit ?? 'kg');
  const [inc, setInc] = useState(p.preferredIncrement != null ? D.inputNumber(p.preferredIncrement) : '');
  const [restMin, setRestMin] = useState(p.preferredRestSeconds != null ? String(Math.floor(p.preferredRestSeconds / 60)) : '');
  const [restSec, setRestSec] = useState(p.preferredRestSeconds != null ? String(p.preferredRestSeconds % 60) : '');
  const [seat, setSeat] = useState(p.seatPosition ?? '');
  const [settings, setSettings] = useState(p.equipmentSettings ?? '');
  const [notes, setNotes] = useState(p.setupNotes ?? '');
  const save = () => run(() => {
    const increment = inc.trim() ? D.parseNumber(inc) : null;
    if (inc.trim() && increment === null) throw new data.UserError('El incremento debe ser positivo y el descanso no puede ser negativo.');
    const rest = restMin.trim() || restSec.trim() ? (Number(restMin) || 0) * 60 + (Number(restSec) || 0) : null;
    data.savePreference(owner, exerciseID, { increment, incrementUnit: incUnit, rest, seat, settings, notes, preferredUnit: unit || null });
    toast('Configuración guardada'); onClose();
  });
  return html`
    <${Sheet} title="Tu configuración" onClose=${onClose} right=${html`<button class="btn plain" onClick=${save}>Guardar</button>`}>
      <p class="muted small" style="margin-top:0">${ex.name} · solo para tu perfil.</p>
      <div class="card stack">
        <${Field} group label="Unidad para este ejercicio"><${Segmented} options=${{ '': `Perfil (${profileUnit})`, kg: 'kg', lb: 'lb' }} value=${unit} onChange=${setUnit} /><//>
        <${Field} label="Incremento sugerido">
          <div class="hstack"><${Input} inputmode="decimal" placeholder="Ej. 2,5" value=${inc} onInput=${setInc} />
          <${Segmented} options=${{ kg: 'kg', lb: 'lb' }} value=${incUnit} onChange=${setIncUnit} /></div><//>
        <p class="muted small" style="margin:0">El incremento solo se sugiere si la configuración del ejercicio (carga, equipo, lateralidad) no cambia.</p>
        <${Field} label="Descanso preferido">
          <div class="grid2"><${Input} inputmode="numeric" placeholder="min" value=${restMin} onInput=${setRestMin} /><${Input} inputmode="numeric" placeholder="seg" value=${restSec} onInput=${setRestSec} /></div><//>
        <div class="hstack wrap">${[60, 90, 120, 150, 180].map((s) => html`<button class="btn" onClick=${() => { setRestMin(String(Math.floor(s / 60))); setRestSec(String(s % 60)); }}>${D.display(s / 60)} min</button>`)}</div>
        <p class="muted small" style="margin:0">El descanso de la rutina tiene prioridad sobre este.</p>
      </div>
      <div class="card" style="margin-top:12px">
        <${Field} label="Asiento"><${Input} value=${seat} onInput=${setSeat} /><//>
        <${Field} label="Ajustes del equipo"><${Input} value=${settings} onInput=${setSettings} /><//>
        <${Field} label="Notas"><textarea class="input" value=${notes} onInput=${(e) => setNotes(e.target.value)} /><//>
      </div>
    <//>`;
}

export function ExerciseDetail({ owner, id }) {
  const ex = data.exercise(id);
  const [sheet, setSheet] = useState(null);
  if (!ex) return html`<${Page} title="Ejercicio" backTo="ejercicios"><div class="empty">Este ejercicio ya no existe.</div><//>`;
  const pref = data.preference(owner, id);
  const groups = data.progress(owner).groups.filter((g) => g.key.identity === `exercise:${id}`);
  const suggestion = data.progressionForKey(owner, D.libraryKey(ex));
  const unit = data.unitFor(owner, id);
  return html`
    <${Page} title=${ex.name} backTo="ejercicios" right=${html`<button class="btn plain" onClick=${() => setSheet('edit')}>Editar</button>`}>
      <${ExerciseVisual} exercise=${ex} editable />
      <div class="card" style="margin-top:12px">
        <div style="font-size:22px;font-weight:700">${ex.name}</div>
        <div class="muted small">${ex.primaryMuscle} · ${ex.equipment} · ${D.LOAD_TYPES[ex.loadType]}${ex.isUnilateral ? ' · Reps por lado' : ''}</div>
        ${ex.instructionsText && html`<p style="white-space:pre-wrap;margin-bottom:0">${ex.instructionsText}</p>`}
      </div>
      <div class="list" style="margin-top:12px"><${Row} icon=${html`<${Tile} text="?" color="#0a84ff" />`} title="¿Cómo se hace?" sub="Pasos, claves y video de técnica" onClick=${() => setSheet('guide')} /></div>
      ${suggestion && html`<${Section} title=${`Próxima vez · ${suggestion[0]}`}>
        <div class="suggest"><div class="k">${D.PROGRESSION_TITLES[suggestion[1].kind]}</div><b>${D.progressionCompact(suggestion[1])}</b><div class="small muted">${suggestion[1].explanation}</div></div><//>`}
      <${Section} title="Tu configuración">
        <div class="list">
          <${Row} title=${data.setupSummary(pref) || 'Sin ajustes guardados'}
            sub=${[`Unidad ${unit}`, pref?.preferredIncrement && `incremento ${D.display(pref.preferredIncrement)} ${pref.incrementUnit ?? 'kg'}`, pref?.preferredRestSeconds != null && `descanso ${D.display(pref.preferredRestSeconds / 60)} min`].filter(Boolean).join(' · ')}
            onClick=${() => setSheet('pref')} />
        </div>
      <//>
      <${Section} title="Tu progreso">
        <div class="list">
          ${groups.length === 0 && html`<div class="row static muted">Aún no hay series completadas con este ejercicio.</div>`}
          ${groups.map((g) => html`<${Row} title=${D.keyConfigLabel(g.key)} sub=${`${new Set(g.sets.map((s) => s.sessionID)).size} sesiones · última ${D.formatDate(g.sets[g.sets.length - 1].date)}`} href=${`progreso/${encodeURIComponent(g.id)}`} />`)}
        </div>
      <//>
    <//>
    ${sheet === 'guide' && html`<${GuideSheet} exercise=${ex} onClose=${() => setSheet(null)} />`}
    ${sheet === 'edit' && html`<${ExerciseForm} exercise=${ex} onClose=${() => setSheet(null)} onSaved=${() => setSheet(null)} />`}
    ${sheet === 'pref' && html`<${PreferenceSheet} owner=${owner} exerciseID=${id} onClose=${() => setSheet(null)} />`}`;
}

/** Ficha «¿Cómo se hace?»: pasos y claves (sin conexión) y un botón a videos de técnica (con conexión). */
export function GuideSheet({ exercise, onClose }) {
  const guide = guideFor(exercise);
  const notes = exercise.instructionsText?.trim();
  return html`
    <${Sheet} title="¿Cómo se hace?" onClose=${onClose}>
      <${ExerciseVisual} exercise=${exercise} editable />
      <div class="card stack" style="margin-top:12px">
        <div class="hstack"><${MuscleTile} muscle=${exercise.primaryMuscle} />
          <div class="spacer"><b>${exercise.name}</b><div class="small muted">${exercise.primaryMuscle} · ${exercise.equipment} · ${D.LOAD_TYPES[exercise.loadType]}</div></div></div>
        ${guide ? html`
          <ol class="guide-steps">${guide.steps.map((step) => html`<li>${step}</li>`)}</ol>
          <div class="guide-tips">${guide.tips.map((tip) => html`<div>💡 ${tip}</div>`)}</div>`
        : !notes && html`<p class="muted small" style="margin:0">Este ejercicio no tiene guía todavía. Puedes escribir tus propias indicaciones en la ficha del ejercicio → Editar → Instrucciones.</p>`}
        ${notes && html`<div><div class="caps" style="margin-bottom:4px">Tus indicaciones</div><div style="white-space:pre-wrap">${notes}</div></div>`}
      </div>
      <a class="btn primary block big" style="margin-top:12px" href=${videoURL(exercise)} target="_blank" rel="noopener"
        onClick=${(e) => { if (!navigator.onLine) { e.preventDefault(); toast('Necesitas internet para ver videos. La guía de arriba funciona sin conexión.'); } }}>
        <${Icon} name="play" /> Ver video de técnica</a>
      <p class="muted small center">Se abre YouTube con videos de este ejercicio.</p>
    <//>`;
}

const QUICK_LOADS = [['totalWeight', 'Barra / peso libre'], ['dumbbellPerHand', 'Mancuernas'], ['machine', 'Máquina'], ['cable', 'Polea'], ['bodyweight', 'Peso corporal'], ['bodyweightPlusLoad', 'Corporal + lastre']];
const EQUIPMENT_OF = { totalWeight: 'Barra', dumbbellPerHand: 'Mancuernas', machine: 'Máquina', cable: 'Polea', bodyweight: 'Peso corporal', bodyweightPlusLoad: 'Lastre' };

/** Completar el tipo de carga de los ejercicios «Sin especificar», con una sugerencia preseleccionada que el usuario confirma. */
export function LoadTypeReview({ onClose }) {
  const pending = data.exercisesWithoutLoad();
  const withHint = pending.map((e) => [e, data.suggestedLoad(e)]).filter(([, hint]) => hint);
  const apply = (e, loadType, equipment) => run(() => { data.setExerciseLoad(e.id, loadType, equipment ?? EQUIPMENT_OF[loadType]); toast(`${e.name}: ${D.LOAD_TYPES[loadType]}`); });
  const applyAll = () => run(() => {
    for (const [e, hint] of withHint) data.setExerciseLoad(e.id, hint.loadType, hint.equipment);
    toast(`${withHint.length} ejercicios actualizados`);
  });
  return html`
    <${Sheet} title="Tipo de carga" onClose=${onClose}>
      <p class="muted small" style="margin-top:0">Con el tipo de carga, la app puede sugerirte cuándo subir peso y marcar tus récords. Tu historial se conserva; las sugerencias empiezan desde tu próximo entrenamiento con cada ejercicio.</p>
      ${pending.length === 0 ? html`<div class="card center"><b>¡Todo listo! ✅</b><p class="muted small" style="margin:4px 0 0">Todos tus ejercicios tienen tipo de carga.</p></div>` : html`
        ${withHint.length > 1 && html`<button class="btn primary block" style="margin-bottom:12px" onClick=${applyAll}><${Icon} name="sparkles" /> Aplicar las ${withHint.length} sugerencias</button>`}
        <div class="stack">
          ${pending.map((e) => {
            const hint = data.suggestedLoad(e);
            return html`<div class="card">
              <div class="hstack" style="margin-bottom:8px"><${MuscleTile} muscle=${e.primaryMuscle} /><b class="spacer">${e.name}</b></div>
              <div class="chips wrap" style="margin:0">${QUICK_LOADS.map(([k, label]) => html`
                <button class=${`chip ${hint?.loadType === k ? 'suggested' : ''}`} onClick=${() => apply(e, k, hint?.loadType === k ? hint.equipment : null)}>
                  ${label}${hint?.loadType === k ? ' · sugerido' : ''}</button>`)}</div>
            </div>`;
          })}
        </div>`}
    <//>`;
}

const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Imagen del ejercicio: el medio propio de la familia (foto, GIF o video) o, si no hay, las fotos incluidas
 * alternando inicio ↔ final como animación. `editable` muestra los botones para agregar, cambiar o quitar.
 */
export function ExerciseVisual({ exercise, editable = false, compact = false, onClick }) {
  const custom = customMedia(exercise.id);
  const frames = builtInFrames(exercise);
  const [url, setUrl] = useState(null);
  const [frame, setFrame] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (custom) mediaURL(custom).then((u) => alive && setUrl(u)).catch(() => {});
    return () => { alive = false; };
  }, [custom?.id]);
  useEffect(() => {
    if (custom || !frames || frames.length < 2 || calm()) return undefined;
    const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), 1000);
    return () => clearInterval(t);
  }, [custom?.id, frames?.[0]]);

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try { await addExerciseMedia(exercise.id, file, activeProfileID()); toast('Guardado para toda la familia'); }
    catch (error) { toast(error instanceof data.UserError ? error.message : `No se pudo guardar: ${error.message ?? error}`); }
    setBusy(false);
  }
  async function remove() {
    if (!(await confirmDialog('¿Quitar esta imagen?', { message: frames ? 'Volverá a mostrarse la foto incluida.' : 'El ejercicio quedará sin imagen.', confirm: 'Quitar', danger: true }))) return;
    try { await removeExerciseMedia(custom.id); } catch (error) { toast(`No se pudo quitar: ${error.message ?? error}`); }
  }

  const has = custom || frames;
  if (!has && !editable) return null;
  const media = custom
    ? (url ? (custom.kind === 'video'
        ? html`<video src=${url} autoplay muted loop playsinline aria-label=${`Video de ${exercise.name}`}></video>`
        : html`<img src=${url} alt=${`Cómo se hace ${exercise.name}`} />`)
      : html`<span class="visual-loading">Cargando…</span>`)
    : frames ? frames.map((src, i) => html`<img src=${src} alt=${i === 0 ? `Cómo se hace ${exercise.name}` : ''} class=${i === frame ? 'on' : ''} loading="lazy" />`)
    : html`<span class="visual-empty">📷<br />Sin imagen</span>`;
  if (compact) return has ? html`<button class="visual compact" onClick=${onClick} aria-label=${`Ver cómo se hace ${exercise.name}`}>${media}</button>` : null;
  return html`
    <div class="visual-wrap">
      <div class=${`visual ${frames && !custom ? 'frames' : ''}`} onClick=${() => frames && !custom && calm() && setFrame((f) => (f + 1) % frames.length)}>${media}</div>
      ${editable && html`<div class="hstack visual-actions">
        <label class=${`btn ${busy ? 'disabled' : ''}`}>${busy ? 'Guardando…' : custom ? 'Cambiar imagen' : html`<${Icon} name="camera" /> Agregar foto, GIF o video`}
          <input type="file" accept="image/*,video/*" class="visually-hidden" disabled=${busy} onChange=${pick} /></label>
        ${custom && html`<button class="btn plain danger" onClick=${remove}>Quitar</button>`}
      </div>
      <p class="muted small" style="margin:6px 0 0">${custom ? 'Agregada por tu familia: la ven todos los perfiles.' : frames ? 'Foto de referencia. Puedes cambiarla por tu propio GIF o video; la verán todos los perfiles.' : 'Agrega una foto, GIF o video para que toda la familia lo identifique.'}</p>`}
    </div>`;
}
