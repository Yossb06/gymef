import { html, useState } from '../../vendor/preact-htm.js';
import * as data from '../data.js';
import * as D from '../domain.js';
import { N } from '../catalog.js';
import { Page, Section, Row, Sheet, Field, Input, Icon, run, go, toast, confirmDialog, promptDialog } from '../ui.js';
import { ExercisePicker, GuideSheet, MuscleTile } from './exercises.js';
import { startWorkout } from './home.js';

const exerciseCount = (routineID) => data.days(routineID).reduce((a, d) => a + data.dayEntries(d.id).length, 0);

export function RoutinesList({ owner }) {
  const [copying, setCopying] = useState(false);
  const list = data.routines(owner).sort((a, b) => (a.isActive !== b.isActive ? (a.isActive ? -1 : 1) : a.createdAt - b.createdAt));
  const [creating, setCreating] = useState(false);
  const blank = async () => {
    setCreating(false);
    const name = await promptDialog('Nueva rutina', { placeholder: 'Nombre', confirm: 'Crear' });
    if (name) { const r = run(() => data.createRoutine(owner, name)); if (r) go(`rutina/${r.id}`); }
  };
  const fromTemplate = (id) => {
    const r = run(() => data.createRoutineFromTemplate(owner, id));
    setCreating(false);
    if (r) { toast(r.isActive ? 'Rutina creada y activada. Ajústala a tu gusto.' : 'Rutina creada. Actívala cuando quieras usarla.'); go(`rutina/${r.id}`); }
  };
  const others = data.profiles().filter((p) => p.id !== owner).flatMap((p) => data.routines(p.id).map((r) => ({ r, p })));
  return html`
    <${Page} title="Rutinas" large>
      ${list.length === 0 && html`<div class="card center"><b>Tu primera rutina</b><p class="muted small">Crea tus días o copia una rutina de otro perfil.</p></div>`}
      ${list.length > 0 && html`<div class="list">${list.map((r) => html`
        <${Row} title=${r.name} href=${`rutina/${r.id}`}
          sub=${`${data.days(r.id).length} días · ${exerciseCount(r.id)} ejercicios`}
          right=${html`<span class=${`badge ${r.isActive ? 'on' : ''}`}>${r.isActive ? 'Activa' : r.archivedAt ? 'Archivada' : 'Sin activar'}</span>`} />`)}</div>`}
      <div class="stack" style="margin-top:16px">
        <button class="btn primary block" onClick=${() => setCreating(true)}><${Icon} name="plus" /> Crear rutina</button>
        <button class="btn block" onClick=${() => setCopying(true)}>Copiar de otro perfil</button>
      </div>
    <//>
    ${creating && html`
      <${Sheet} title="Nueva rutina" onClose=${() => setCreating(false)}>
        <p class="muted small" style="margin-top:0">Elige una plantilla con ejercicios ya puestos y cámbiala a tu gusto, o empieza en blanco.</p>
        <div class="stack">
          ${Object.entries(D.ROUTINE_TEMPLATES).map(([id, t]) => html`
            <button class="template-card" onClick=${() => fromTemplate(id)}>
              <span class="template-icon"><${Icon} name="sparkles" /></span>
              <span class="grow"><b>${t.name}</b><span class="muted small">${t.detail}</span>
                <span class="template-days">${t.days.map(([name]) => html`<span class="badge">${name}</span>`)}</span></span>
            </button>`)}
          <button class="template-card" onClick=${blank}>
            <span class="template-icon plain"><${Icon} name="edit" /></span>
            <span class="grow"><b>En blanco</b><span class="muted small">Le pones nombre y agregas tus días y ejercicios.</span></span>
          </button>
          <button class="template-card" onClick=${() => { setCreating(false); setCopying(true); }}>
            <span class="template-icon plain"><${Icon} name="copy" /></span>
            <span class="grow"><b>Copiar de otro perfil</b><span class="muted small">Empieza con la rutina de alguien de tu familia y ajústala a ti.</span></span>
          </button>
        </div>
      <//>`}
    ${copying && html`
      <${Sheet} title="Copiar rutina" onClose=${() => setCopying(false)}>
        <div class="list">
          ${others.length === 0 && html`<div class="row static muted">No hay rutinas para copiar.</div>`}
          ${others.map(({ r, p }) => html`<${Row} title=${r.name} sub=${p.name} onClick=${() => { const c = run(() => data.copyRoutine(r.id, owner)); setCopying(false); if (c) { toast('Copia creada, sin activar.'); go(`rutina/${c.id}`); } }} />`)}
        </div>
        <p class="muted small">La copia será independiente y quedará sin activar.</p>
      <//>`}`;
}

export function RoutineDetail({ owner, id }) {
  const routine = data.routines(owner).find((r) => r.id === id);
  const [adding, setAdding] = useState(false);
  if (!routine) return html`<${Page} title="Rutina" backTo="rutinas"><div class="empty">Esta rutina no existe en tu perfil.</div><//>`;
  const days = data.days(id);
  const rename = async () => {
    const name = await promptDialog('Nombre de la rutina', { value: routine.name });
    if (name) run(() => data.renameRoutine(id, owner, name));
  };
  const archive = async () => {
    if (await confirmDialog('¿Archivar esta rutina?', { message: 'Dejará de estar activa. El historial no cambia.', confirm: 'Archivar', danger: true }))
      run(() => data.archiveRoutine(id, owner));
  };
  return html`
    <${Page} title=${routine.name} backTo="rutinas" right=${html`<button class="btn plain" onClick=${rename}>Renombrar</button>`}>
      <div class="card hstack">
        <div class="spacer"><b>${routine.name}</b><div class="small muted">${routine.isActive ? 'Rutina activa' : routine.archivedAt ? 'Archivada' : 'Sin activar'}</div></div>
        ${!routine.isActive && html`<button class="btn primary" onClick=${() => run(() => data.activateRoutine(id, owner))}>Activar</button>`}
      </div>
      <${Section} title="Días">
        <div class="list">
          ${days.length === 0 && html`<div class="row static muted">Añade el primer día de la rutina.</div>`}
          ${days.map((d, i) => {
            const entries = data.dayEntries(d.id);
            return html`<div class="row static">
              <a class="grow" href=${`#/dia/${d.id}`} style="color:inherit"><div class="title">${d.name}</div>
                <div class="sub">${[d.weekday, entries.length ? `${entries.length} ejercicios · ${entries.reduce((a, e) => a + e.sets, 0)} series` : 'Descanso'].filter(Boolean).join(' · ')}</div></a>
              <button class="icon-btn" aria-label="Subir" disabled=${i === 0} onClick=${() => run(() => data.moveDay(d.id, owner, -1))}>↑</button>
              <button class="icon-btn" aria-label="Bajar" disabled=${i === days.length - 1} onClick=${() => run(() => data.moveDay(d.id, owner, 1))}>↓</button>
            </div>`;
          })}
        </div>
      <//>
      <div class="stack" style="margin-top:16px">
        <button class="btn block" onClick=${() => setAdding(true)}>+ Añadir día</button>
        ${!routine.archivedAt && html`<button class="btn block danger" onClick=${archive}>Archivar rutina</button>`}
      </div>
    <//>
    ${adding && html`<${DayForm} onClose=${() => setAdding(false)} onSave=${(name, weekday) => { const d = run(() => data.addDay(id, owner, name, weekday)); if (d) setAdding(false); }} />`}`;
}

function DayForm({ day, onClose, onSave }) {
  const [name, setName] = useState(day?.name ?? '');
  const [weekday, setWeekday] = useState(day?.weekday ?? '');
  return html`
    <${Sheet} title=${day ? 'Editar día' : 'Nuevo día'} onClose=${onClose} right=${html`<button class="btn plain" disabled=${!name.trim()} onClick=${() => onSave(name, weekday)}>Guardar</button>`}>
      <div class="card">
        <${Field} label="Nombre"><${Input} value=${name} placeholder="Ej. Upper" onInput=${setName} /><//>
        <${Field} label="Día de la semana">
          <select class="input" value=${weekday} onChange=${(e) => setWeekday(e.target.value)}>
            <option value="">Sin día fijo</option>${D.WEEKDAYS.map((w) => html`<option value=${w}>${w}</option>`)}
          </select><//>
      </div>
    <//>`;
}

export function DayDetail({ owner, id }) {
  const [sheet, setSheet] = useState(null);
  let day = null;
  try { day = data.requireDay(id, owner); } catch {}
  if (!day) return html`<${Page} title="Día" backTo="rutinas"><div class="empty">Este día no existe en tu perfil.</div><//>`;
  const routine = data.requireRoutine(day.routineID, owner);
  const entries = data.dayEntries(id);
  const remove = async () => {
    if (await confirmDialog(`¿Eliminar ${day.name}?`, { message: 'Se quitará el día y sus ejercicios de la rutina. El historial no cambia.', confirm: 'Eliminar día', danger: true })) {
      run(() => data.deleteDay(id, owner)); go(`rutina/${routine.id}`);
    }
  };
  return html`
    <${Page} title=${day.name} backTo=${`rutina/${routine.id}`} right=${html`<button class="btn plain" onClick=${() => setSheet('day')}>Editar</button>`}>
      <div class="card">
        <b>${day.name}</b><div class="small muted">${[day.weekday, routine.name].filter(Boolean).join(' · ')}</div>
        ${routine.isActive && entries.length > 0 && html`<button class="btn primary block" style="margin-top:12px" onClick=${() => startWorkout(owner, id)}>▶ Iniciar este entrenamiento</button>`}
      </div>
      <${Section} title="Ejercicios">
        <div class="list">
          ${entries.length === 0 && html`<div class="row static muted">Día de descanso. Añade ejercicios para entrenarlo.</div>`}
          ${entries.map((e, i) => {
            const ex = data.exercise(e.exerciseID);
            return html`<div class="row static">
              ${ex && html`<${MuscleTile} muscle=${ex.primaryMuscle} />`}
              <button class="grow" style="background:none;border:0;text-align:left;padding:0;cursor:pointer;color:inherit" onClick=${() => setSheet({ entry: e })}>
                <div class="title">${N(ex?.name) ?? 'Ejercicio no disponible'}</div>
                <div class="sub">${e.sets} × ${e.repsMin}–${e.repsMax}${e.restSeconds ? ` · ${D.display(e.restSeconds / 60)} min` : ''}${e.note ? ` · ${e.note}` : ''}</div>
                ${previousLine(owner, e.exerciseID)}
              </button>
              ${ex && html`<button class="help-btn" aria-label=${`Cómo se hace ${N(ex.name)}`} onClick=${() => setSheet({ guide: ex, entryID: e.id })}>?</button>`}
              <button class="icon-btn" aria-label="Subir" disabled=${i === 0} onClick=${() => run(() => data.moveEntry(e.id, owner, -1))}>↑</button>
              <button class="icon-btn" aria-label="Bajar" disabled=${i === entries.length - 1} onClick=${() => run(() => data.moveEntry(e.id, owner, 1))}>↓</button>
            </div>`;
          })}
        </div>
      <//>
      <div class="stack" style="margin-top:16px">
        <button class="btn primary block" onClick=${() => setSheet('add')}><${Icon} name="plus" /> Añadir ejercicios</button>
        <button class="btn block" onClick=${() => { const c = run(() => data.duplicateDay(id, owner)); if (c) go(`dia/${c.id}`); }}>Duplicar día</button>
        <button class="btn block danger" onClick=${remove}>Eliminar día</button>
      </div>
    <//>
    ${sheet === 'day' && html`<${DayForm} day=${day} onClose=${() => setSheet(null)} onSave=${(name, weekday) => { run(() => data.updateDay(id, owner, name, weekday)); setSheet(null); }} />`}
    ${sheet === 'add' && html`<${ExercisePicker} title="Añadir ejercicios" multiple onClose=${() => setSheet(null)}
      onPickMany=${(ids, rx) => { const added = run(() => data.addEntries(id, owner, ids, rx)); if (added) { setSheet(null); toast(`${added.length} ${added.length === 1 ? 'ejercicio añadido' : 'ejercicios añadidos'}`); } }} />`}
    ${sheet?.entry && html`<${EntryEditor} owner=${owner} entry=${sheet.entry} onClose=${() => setSheet(null)} onReplace=${() => setSheet({ replacing: sheet.entry })} />`}
    ${sheet?.guide && html`<${GuideSheet} exercise=${sheet.guide} onClose=${() => setSheet(null)} useLabel="Cambiar en mi rutina"
      onUse=${(alt) => { if (alt && run(() => { data.replaceEntry(sheet.entryID, owner, alt.id); return true; })) { toast(`Cambiado por ${N(alt.name)} en tu rutina`); setSheet(null); } }} />`}
    ${sheet?.replacing && html`<${ExercisePicker} title="Sustituir ejercicio" onClose=${() => setSheet(null)} onPick=${(ex) => { run(() => data.replaceEntry(sheet.replacing.id, owner, ex.id)); setSheet(null); }} />`}`;
}

function EntryEditor({ owner, entry, onClose, onReplace }) {
  const ex = data.exercise(entry.exerciseID);
  const [sets, setSets] = useState(String(entry.sets));
  const [min, setMin] = useState(String(entry.repsMin));
  const [max, setMax] = useState(String(entry.repsMax));
  const [restMin, setRestMin] = useState(entry.restSeconds != null ? String(Math.floor(entry.restSeconds / 60)) : '');
  const [restSec, setRestSec] = useState(entry.restSeconds != null ? String(entry.restSeconds % 60) : '');
  const [note, setNote] = useState(entry.note ?? '');
  const save = () => run(() => {
    const rest = restMin.trim() || restSec.trim() ? (Number(restMin) || 0) * 60 + (Number(restSec) || 0) : null;
    data.updateEntry(entry.id, owner, { sets: Number(sets), repsMin: Number(min), repsMax: Number(max), restSeconds: rest, note: note.trim() });
    onClose();
  });
  const remove = async () => {
    if (await confirmDialog('¿Quitar este ejercicio del día?', { confirm: 'Quitar', danger: true })) { run(() => data.deleteEntry(entry.id, owner)); onClose(); }
  };
  const num = (setter) => (v) => setter(v.replace(/\D/g, ''));
  return html`
    <${Sheet} title=${N(ex?.name) ?? 'Ejercicio'} onClose=${onClose} right=${html`<button class="btn plain" onClick=${save}>Guardar</button>`}>
      <div class="card">
        <div class="grid2" style="grid-template-columns:1fr 1fr 1fr">
          <${Field} label="Series"><${Input} inputmode="numeric" value=${sets} onInput=${num(setSets)} /><//>
          <${Field} label="Reps mín."><${Input} inputmode="numeric" value=${min} onInput=${num(setMin)} /><//>
          <${Field} label="Reps máx."><${Input} inputmode="numeric" value=${max} onInput=${num(setMax)} /><//>
        </div>
        <${Field} label="Descanso (opcional)">
          <div class="grid2"><${Input} inputmode="numeric" placeholder="min" value=${restMin} onInput=${num(setRestMin)} /><${Input} inputmode="numeric" placeholder="seg" value=${restSec} onInput=${num(setRestSec)} /></div><//>
        <div class="hstack wrap" style="margin-top:8px">${[60, 90, 120, 150, 180].map((s) => html`<button class="btn" onClick=${() => { setRestMin(String(Math.floor(s / 60))); setRestSec(String(s % 60)); }}>${D.display(s / 60)} min</button>`)}
          <button class="btn" onClick=${() => { setRestMin(''); setRestSec(''); }}>Sin descanso</button></div>
        <${Field} label="Nota"><textarea class="input" value=${note} onInput=${(e) => setNote(e.target.value)} /><//>
      </div>
      <div class="stack" style="margin-top:12px">
        <button class="btn block" onClick=${onReplace}>Sustituir ejercicio</button>
        <button class="btn block danger" onClick=${remove}>Quitar del día</button>
      </div>
    <//>`;
}

/** Línea breve «Anterior: 80 lb · 9 / 10 / 8 reps» bajo cada ejercicio del día. */
function previousLine(owner, exerciseID) {
  const text = data.lastPerformanceText(data.lastPerformance(owner, exerciseID), data.unitFor(owner, exerciseID));
  return text && html`<div class="sub prev-line">Anterior: ${text.weight ? `${text.weight} · ` : ''}${text.reps} reps</div>`;
}
