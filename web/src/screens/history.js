import { html, useState } from '../../vendor/preact-htm.js';
import * as data from '../data.js';
import * as D from '../domain.js';
import { N } from '../catalog.js';
import { store } from '../store.js';
import { Page, Section, Row, Sheet, Field, run, go, toast, confirmDialog } from '../ui.js';
import { ExercisePicker } from './exercises.js';
import { SetEditor, WorkoutSummary } from './workout.js';

const STATUS = { active: 'En curso', completed: 'Completado', cancelled: 'Cancelado' };
const toLocalInput = (t) => { const d = new Date(t); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export function HistoryList({ owner }) {
  const [limit, setLimit] = useState(30);
  const list = data.sessions(owner);
  return html`
    <${Page} title="Historial" large>
      ${list.length === 0 && html`<div class="card center muted">Tus entrenamientos aparecerán aquí.</div>`}
      <div class="list">
        ${list.slice(0, limit).map((s) => {
          const sets = data.sessionExercises(s.id).flatMap((we) => data.setsOf(we.id));
          return html`<${Row} href=${s.status === 'active' ? 'entreno' : `historial/${s.id}`} title=${s.dayNameSnapshot}
            sub=${`${D.formatDate(s.startedAt, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${sets.length} series${s.endedAt ? ` · ${D.formatDuration(s.endedAt - s.startedAt)}` : ''}`}
            right=${s.status !== 'completed' ? html`<span class="badge">${STATUS[s.status]}</span>` : s.mood && html`<span aria-label=${data.MOODS[s.mood]}>${data.MOODS[s.mood].split(' ')[0]}</span>`} />`;
        })}
      </div>
      ${list.length > limit && html`<button class="btn block" style="margin-top:12px" onClick=${() => setLimit(limit + 30)}>Ver más</button>`}
    <//>`;
}

export function HistoryDetail({ owner, id }) {
  const session = store.get('sessions', id);
  const [editing, setEditing] = useState(false);
  const [sheet, setSheet] = useState(null);
  if (!session || session.profileID !== owner) return html`<${Page} title="Entrenamiento" backTo="historial"><div class="empty">Este entrenamiento no existe en tu perfil.</div><//>`;
  const exercises = data.sessionExercises(id);
  const remove = async () => {
    if (await confirmDialog('¿Eliminar este entrenamiento?', { message: 'Se borrarán sus series y dejará de contar en tu progreso. No se puede deshacer.', confirm: 'Eliminar entrenamiento', danger: true })) {
      run(() => { data.deleteSession(id, owner); toast('Entrenamiento eliminado'); go('historial'); });
    }
  };
  const removeSet = (r) => {
    const removed = { ...r };
    if (run(() => { data.deleteSet(r.id, owner, { active: false }); return true; })) {
      toast(`Serie ${removed.order} eliminada`, { action: 'Deshacer', onAction: () => run(() => data.restoreSet(removed, owner, { active: false })) });
    }
  };
  // Una serie nueva parte de la última registrada en ese ejercicio.
  const draftFor = (we) => {
    const last = data.setsOf(we.id).at(-1);
    return { weight: last?.weight ?? 0, reps: last?.reps ?? we.repsMin, loadType: we.loadType, unit: last?.unit ?? data.unitFor(owner, we.originalExerciseID) };
  };
  const removeExercise = async (we) => {
    if (await confirmDialog(`¿Quitar ${N(we.name)}?`, { message: 'Se borrarán sus series de este entrenamiento.', confirm: 'Quitar', danger: true })) run(() => data.deleteWorkoutExercise(we.id, owner));
  };
  return html`
    <${Page} title=${session.dayNameSnapshot} backTo="historial" right=${html`<button class="btn plain" onClick=${() => setEditing(!editing)}>${editing ? 'Listo' : 'Editar'}</button>`}>
      ${!editing ? html`<${WorkoutSummary} owner=${owner} session=${session} />` : html`
        <div class="card hstack"><div class="spacer"><b>${D.formatDate(session.startedAt, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
          <div class="small muted">${D.formatTime(session.startedAt)}${session.endedAt ? `–${D.formatTime(session.endedAt)}` : ''}</div></div>
          <button class="btn" onClick=${() => setSheet('dates')}>Fechas</button></div>
        ${exercises.map((we) => html`
          <${Section} title=${N(we.name) + (we.isReplaced ? ' · sustituido' : '')}
            right=${html`<button class="btn plain danger" onClick=${() => removeExercise(we)}>Quitar</button>`}>
            <div class="list">
              ${data.setsOf(we.id).map((r) => html`<div class="row static"><span class="badge on">${r.order}</span>
                <button class="grow" style="background:none;border:0;text-align:left;padding:0;cursor:pointer;color:inherit" onClick=${() => setSheet({ edit: r })}>${D.recordLabel(r)}</button>
                <button class="btn plain danger" onClick=${() => removeSet(r)}>Eliminar</button></div>`)}
              <${Row} title="+ Añadir serie" onClick=${() => setSheet({ add: we })} chevron=${false} />
            </div>
          <//>`)}
        <div class="stack" style="margin-top:16px">
          <button class="btn block" onClick=${() => setSheet('exercise')}>+ Añadir ejercicio</button>
          <button class="btn block danger" onClick=${remove}>Eliminar entrenamiento</button>
        </div>
        <p class="muted small">Los cambios recalculan tu progreso y récords. Las sugerencias usan solo entrenamientos completados.</p>`}
    <//>
    ${sheet === 'dates' && html`<${DatesSheet} owner=${owner} session=${session} onClose=${() => setSheet(null)} />`}
    ${sheet === 'exercise' && html`<${ExercisePicker} title="Añadir ejercicio" onClose=${() => setSheet(null)} onPick=${(ex) => { run(() => data.addExerciseToHistory(id, owner, ex.id)); setSheet(null); }} />`}
    ${sheet?.edit && html`<${SetEditor} record=${sheet.edit} onClose=${() => setSheet(null)} onSave=${(w, r) => { run(() => { data.updateSet(sheet.edit.id, owner, w, r, null, { active: false }); setSheet(null); }); }} />`}
    ${sheet?.add && html`<${SetEditor} title="Nueva serie" record=${draftFor(sheet.add)}
      onClose=${() => setSheet(null)} onSave=${(w, r) => { run(() => { data.addSetToHistory(sheet.add.id, owner, w, r, draftFor(sheet.add).unit); setSheet(null); }); }} />`}`;
}

function DatesSheet({ owner, session, onClose }) {
  const [start, setStart] = useState(toLocalInput(session.startedAt));
  const [end, setEnd] = useState(session.endedAt ? toLocalInput(session.endedAt) : '');
  const save = () => run(() => { data.updateSessionDates(session.id, owner, new Date(start).getTime(), end ? new Date(end).getTime() : null); onClose(); });
  return html`
    <${Sheet} title="Fechas" onClose=${onClose} right=${html`<button class="btn plain" onClick=${save}>Guardar</button>`}>
      <div class="card">
        <${Field} label="Inicio"><input class="input" type="datetime-local" value=${start} onInput=${(e) => setStart(e.target.value)} /><//>
        <${Field} label="Fin"><input class="input" type="datetime-local" value=${end} onInput=${(e) => setEnd(e.target.value)} /><//>
      </div>
    <//>`;
}
