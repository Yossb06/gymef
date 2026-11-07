import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import * as data from '../data.js';
import * as D from '../domain.js';
import { N } from '../catalog.js';
import { store, newId } from '../store.js';
import { Page, Section, Row, Sheet, Field, Stepper, RestTimer, restTimer, go, replaceRoute, run, confirmDialog, useTick, useWakeLock, toast, Icon, Tile, ProgressRing, Confetti } from '../ui.js';
import { themeEmoji } from '../theme.js';
import { ExercisePicker, PreferenceSheet, GuideSheet, LoadTypeReview, ExerciseVisual } from './exercises.js';
import { WeightTools } from './tools.js';

const LAST_FINISHED = 'gymef.lastFinished';

function stateIcon(we) {
  const n = data.setsOf(we.id).length;
  if (we.isReplaced) return html`<${Tile} name="swap" color="#8e8e93" />`;
  if (n >= we.targetSets && we.targetSets > 0) return html`<${Tile} name="check" color="#30d158" />`;
  const muscle = data.exercise(we.originalExerciseID)?.primaryMuscle;
  return html`<span class=${`icon tile status ${n ? 'partial' : ''}`} style=${`--tint:${D.muscleColor(muscle)}`} aria-hidden="true">${n}/${we.targetSets}</span>`;
}
const ExerciseLabel = ({ we, onClick, href, next }) => html`
  <${Row} icon=${stateIcon(we)} title=${N(we.name)} sub=${`${data.setsOf(we.id).length} / ${we.targetSets} series · ${data.stateLabel(we)}`} onClick=${onClick} href=${href}
    right=${next && html`<span class="badge on">Siguiente</span>`} />`;
/** Primer ejercicio sin terminar, empezando después de `from` y dando la vuelta. */
function nextPending(exercises, from = -1) {
  const open = exercises.map((e, i) => [e, i]).filter(([e]) => !e.isReplaced && !data.isComplete(e));
  return (open.find(([, i]) => i > from) ?? open[0])?.[0] ?? null;
}

/** Hoja para añadir un ejercicio al entrenamiento en curso, con opción de guardarlo también en la rutina. */
export function AddToSession({ owner, session, afterOrder = null, onClose, onAdded }) {
  const [alsoRoutine, setAlsoRoutine] = useState(false);
  const day = data.routineDayOf(session);
  return html`<${ExercisePicker} title=${afterOrder == null ? 'Añadir al entrenamiento' : 'Añadir después de este'} prescription onClose=${onClose}
    footer=${() => day && html`<label class="check card" style="margin-top:12px"><input type="checkbox" checked=${alsoRoutine} onChange=${(e) => setAlsoRoutine(e.target.checked)} />
      <span>Guardarlo también en la rutina (${day.name}) para las próximas veces</span></label>`}
    onPick=${(ex, rx) => {
      const we = run(() => data.addExerciseToSession(session.id, owner, ex.id, rx, { afterOrder, alsoRoutine }));
      if (we) { toast(`${N(ex.name)} añadido${alsoRoutine && day ? ' y guardado en la rutina' : ''}`); onAdded?.(we); }
    }} />`;
}

export function SessionView({ owner }) {
  useTick(30000);
  const [adding, setAdding] = useState(false);
  const [noting, setNoting] = useState(false);
  const active = data.activeSession(owner);
  useWakeLock(!!active);
  if (!active) {
    const finished = store.get('sessions', sessionStorage.getItem(LAST_FINISHED));
    if (finished && finished.profileID === owner) {
      return html`<${Page} title=${finished.dayNameSnapshot} backTo="">
        ${finished.status === 'completed' && html`<${Confetti} />`}
        <${WorkoutSummary} owner=${owner} session=${finished} celebrate />
        <button class="btn primary block big" style="margin-top:16px" onClick=${() => { sessionStorage.removeItem(LAST_FINISHED); go(''); }}>Volver a Inicio</button>
      <//>`;
    }
    return html`<${Page} title="Entrenamiento" backTo=""><div class="empty">No hay un entrenamiento en curso.</div><//>`;
  }
  const exercises = data.sessionExercises(active.id);
  const open = exercises.filter((e) => !e.isReplaced);
  const completed = open.filter(data.isComplete).length;
  const target = open.reduce((a, e) => a + Math.max(e.targetSets, data.setsOf(e.id).length), 0);
  const done = exercises.reduce((a, e) => a + data.setsOf(e.id).length, 0);
  const next = nextPending(exercises);
  async function finish() {
    if (open.some((e) => !data.isComplete(e))) {
      const ok = await confirmDialog('Aún tienes ejercicios sin completar.', { message: '¿Finalizar de todos modos?', confirm: 'Finalizar' });
      if (!ok) return;
    }
    run(() => { data.finishWorkout(active.id, owner); restTimer.skip(); sessionStorage.setItem(LAST_FINISHED, active.id); });
  }
  async function cancel() {
    const ok = await confirmDialog('¿Cancelar entrenamiento?', { message: 'Se conservarán las series registradas. No se usarán para sugerencias.', confirm: 'Cancelar y conservar series', cancel: 'Seguir entrenando', danger: true });
    if (ok) run(() => { data.finishWorkout(active.id, owner, true); restTimer.skip(); go(''); });
  }
  return html`
    <${Page} title=${active.dayNameSnapshot} backTo="" dock=${html`<${RestTimer} />
      ${next ? html`<button class="btn primary block big" onClick=${() => go(`entreno/${next.id}`)}><${Icon} name="play" /> ${data.setsOf(next.id).length ? 'Continuar' : 'Empezar'}: ${N(next.name)}</button>`
        : html`<button class="btn primary block big" onClick=${finish}><${Icon} name="check" /> Finalizar entrenamiento</button>`}`}
      right=${html`<button class="btn plain danger" onClick=${cancel}>Cancelar</button>`}>
      <div class="hero hstack">
        <${ProgressRing} value=${target ? done / target : 0}>${target ? Math.round((done / target) * 100) : 0}%<//>
        <div class="spacer">
          <div class="hero-kicker">En curso · ${D.formatDuration(Date.now() - active.startedAt)}</div>
          <div class="hero-title">${active.dayNameSnapshot}</div>
          <div class="hero-sub">${completed} de ${open.length} ejercicios · ${done} de ${target} series</div>
        </div>
      </div>
      <${Section} title="Ejercicios">
        <div class="list">
          ${exercises.map((we) => html`<${ExerciseLabel} we=${we} next=${we === next} href=${`entreno/${we.id}`} />`)}
          <${Row} icon=${html`<${Tile} name="plus" />`} title="Añadir ejercicio" sub="Solo hoy o también en tu rutina" onClick=${() => setAdding(true)} chevron=${false} />
        </div>
      <//>
      <div class="list" style="margin-top:12px">
        <${Row} icon=${html`<${Tile} name="edit" color="#ff9f0a" />`} title="Nota del entrenamiento"
          sub=${active.mood || active.note ? [active.mood && data.MOODS[active.mood], active.note].filter(Boolean).join(' · ') : '¿Cómo te sientes hoy? Algo que recordar'} onClick=${() => setNoting(true)} />
      </div>
      <button class="btn block big" style="margin-top:20px" onClick=${finish}>Finalizar entrenamiento</button>
    <//>
    ${adding && html`<${AddToSession} owner=${owner} session=${active} onClose=${() => setAdding(false)} onAdded=${() => setAdding(false)} />`}
    ${noting && html`<${NoteSheet} owner=${owner} session=${active} onClose=${() => setNoting(false)} />`}`;
}

export function WorkoutSummary({ owner, session, celebrate = false }) {
  const exercises = data.sessionExercises(session.id);
  const all = exercises.flatMap((we) => data.setsOf(we.id));
  const vol = D.volume(all);
  const records = data.progress(owner).records.filter((r) => r.set.sessionID === session.id);
  return html`
    <div class="hero">
      ${celebrate && session.status === 'completed' && html`<div class="hero-emoji" aria-hidden="true">${themeEmoji()}</div>`}
      <div class="hero-kicker">${session.status === 'cancelled' ? 'Cancelado' : celebrate ? '¡Entrenamiento completado!' : 'Entrenamiento completado'}</div>
      <div class="hero-title">${session.dayNameSnapshot}</div>
      <div class="hero-sub">${D.formatDate(session.startedAt, { weekday: 'long', day: 'numeric', month: 'long' })} · ${D.formatTime(session.startedAt)}${session.endedAt ? `–${D.formatTime(session.endedAt)}` : ''}</div>
    </div>
    <div class="stats" style="margin-top:12px">
      <div class="stat"><div class="v">${session.endedAt ? D.formatDuration(session.endedAt - session.startedAt) : '—'}</div><div class="l">Duración</div></div>
      <div class="stat"><div class="v">${all.length}</div><div class="l">Series</div></div>
      <div class="stat"><div class="v">${all.reduce((a, s) => a + s.reps, 0)}</div><div class="l">Reps</div></div>
      <div class="stat"><div class="v">${records.length}</div><div class="l">Récords</div></div>
    </div>
    <p class="muted small">${D.volumeLabel(vol)}</p>
    <${MoodNote} owner=${owner} session=${session} />
    ${records.length > 0 && html`<${Section} title="Récords"><div class="list">${records.map((r) => html`<${Row} icon="🏆" title=${N(r.set.name)} sub=${r.metric === 'load' ? `Nuevo PR · ${D.setProgressLabel(r.set)}` : `1RM estimado · ${D.display(r.value)} ${D.keyLoadLabel(r.set.key)}`} />`)}</div><//>`}
    <${Section} title="Ejercicios">
      <div class="list">${exercises.map((we) => html`<${Row} title=${N(we.name) + (we.isReplaced ? ' (sustituido)' : '')} sub=${data.setsOf(we.id).map(D.recordLabel).join(' · ') || 'Sin series'} />`)}</div>
    <//>`;
}

/** Editor de una serie ya registrada (también usado en Historial). */
export function SetEditor({ record, onSave, onClose, title = 'Editar serie' }) {
  const [weight, setWeight] = useState(D.inputNumber(record.weight));
  const [reps, setReps] = useState(String(record.reps));
  const invalid = D.validateSet(weight, reps, record.loadType);
  return html`
    <${Sheet} title=${title} onClose=${onClose}
      right=${html`<button class="btn plain" disabled=${!!invalid} onClick=${() => onSave(D.parseNumber(weight), Number(reps))}>Guardar</button>`}>
      <${SetInputs} load=${record.loadType} unit=${record.unit} increment=${2.5} weight=${weight} reps=${reps} setWeight=${setWeight} setReps=${setReps} />
      ${invalid && html`<p class="muted small">${invalid}</p>`}
    <//>`;
}

export function SetInputs({ load, unit, increment, weight, reps, setWeight, setReps }) {
  const [tools, setTools] = useState(false);
  const weightLabel = load === 'assisted' ? `Asistencia (${unit})` : load === 'dumbbellPerHand' ? `Peso por mancuerna (${unit})` : load === 'bodyweightPlusLoad' ? `Lastre (+${unit})` : `Peso (${unit})`;
  const value = D.parseNumber(weight);
  const other = unit === 'kg' ? 'lb' : 'kg';
  return html`
    <div class="stack">
      ${D.zeroLoad(load) ? html`<div class="muted">Sin carga externa</div>` : html`
        <div><div class="hstack" style="margin:0 4px 6px"><span class="small muted spacer">${weightLabel}</span>
            <button type="button" class="link-btn calc-link" onClick=${() => setTools(true)}><${Icon} name="scale" size=${15} /> Calculadora</button></div>
          <${Stepper} label="peso" decimal value=${weight} onInput=${setWeight}
            onStep=${(d) => setWeight(D.inputNumber(Math.max(0, (value ?? 0) + d * increment)))} />
          ${value > 0 && D.isUnit(unit) && html`<div class="conversion">${D.display(value)} ${unit} = ${D.display(Math.round(D.convert(value, unit, other) * 10) / 10)} ${other}</div>`}</div>`}
      <div><div class="small muted" style="margin:0 4px 6px">Repeticiones</div>
        <${Stepper} label="repeticiones" value=${reps} onInput=${(v) => setReps(v.replace(/\D/g, ''))}
          onStep=${(d) => setReps(String(Math.max(1, (Number(reps) || 0) + d)))} /></div>
    </div>
    ${tools && html`<${WeightTools} unit=${D.isUnit(unit) ? unit : 'kg'} start=${value > 0 ? value : null}
      onUse=${(w) => { setWeight(D.inputNumber(w)); setTools(false); }} onClose=${() => setTools(false)} />`}`;
}

function ProgressionCard({ p }) {
  return html`<div class="suggest"><div class="k">${D.PROGRESSION_TITLES[p.kind]}</div><div><b>${D.progressionCompact(p)}</b></div><div class="small muted">${p.explanation}</div></div>`;
}

export function ExerciseView({ owner, id }) {
  const we = store.get('workoutExercises', id);
  return we ? html`<${ExerciseScreen} owner=${owner} we=${we} key=${we.id} />`
    : html`<${Page} title="Ejercicio" backTo="entreno"><div class="empty">Este ejercicio ya no forma parte del entrenamiento.</div><//>`;
}

function ExerciseScreen({ owner, we }) {
  const session = store.get('sessions', we.sessionID);
  useWakeLock(session?.status === 'active');
  const records = data.setsOf(we.id);
  const exercises = data.sessionExercises(we.sessionID);
  const position = exercises.findIndex((e) => e.id === we.id);
  const canRecord = !we.isReplaced && session?.status === 'active' && session.profileID === owner;
  const [extra, setExtra] = useState(false);
  const needsSet = canRecord && (records.length < we.targetSets || extra);
  const unit = data.unitFor(owner, we.originalExerciseID);
  const pref = we.originalExerciseID ? data.preference(owner, we.originalExerciseID) : null;
  const increment = data.incrementFor(owner, we.originalExerciseID, we.loadType, we.equipment, we.isUnilateral);
  const progression = data.progressionFor(owner, we);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [message, setMessage] = useState(null);
  const [record, setRecord] = useState(null);
  const [sheet, setSheet] = useState(null);
  const confirmation = useRef(newId());
  const cooling = useRef(false);
  const signature = records.map((r) => `${r.id}:${r.weight}:${r.reps}:${r.unit}`).join() + unit + (pref?._u ?? '');

  useEffect(() => {
    const lastRecord = records[records.length - 1];
    const last = lastRecord && D.isUnit(lastRecord.unit) ? { weight: D.convert(lastRecord.weight, lastRecord.unit, unit), reps: lastRecord.reps, unit } : null;
    const s = D.prefill(progression, records.length, last);
    setWeight(s ? D.inputNumber(s.weight) : D.zeroLoad(we.loadType) ? '0' : '');
    setReps(String(s?.reps ?? we.repsMin));
  }, [signature]);

  const invalid = D.validateSet(weight, reps, we.loadType);
  function confirm() {
    if (cooling.current || invalid) return;
    const value = D.parseNumber(weight), count = Number(reps);
    run(() => {
      const saved = data.confirmSet(we.id, owner, value, count, unit, confirmation.current);
      confirmation.current = newId();
      const prs = data.recordFeedback(owner, saved.id);
      setRecord(prs.length ? `${prs.some((r) => r.metric === 'load') ? 'Nuevo PR' : 'Nuevo 1RM estimado'} · ${D.recordLabel(saved)}` : null);
      setMessage(`Guardada: ${D.setLabel({ weight: value, reps: count, unit }, we.loadType)}`);
      try { navigator.vibrate?.(30); } catch {}
      restTimer.start(we.restSeconds ?? pref?.preferredRestSeconds ?? null);
      setExtra(false);
      cooling.current = true;
      setTimeout(() => { cooling.current = false; }, 400);
    });
  }
  const move = (offset) => { const next = exercises[position + offset]; if (next) replaceRoute(`entreno/${next.id}`); };
  const pending = nextPending(exercises, position);
  function remove(r) {
    const removed = { ...r };
    if (run(() => { data.deleteSet(r.id, owner); return true; })) {
      toast(`Serie ${removed.order} eliminada`, { action: 'Deshacer', onAction: () => run(() => data.restoreSet(removed, owner)) });
    }
  }
  async function removeExercise() {
    if (!(await confirmDialog(`¿Quitar ${N(we.name)} de hoy?`, { message: 'Tu rutina no cambia.', confirm: 'Quitar', danger: true }))) return;
    const target = nextPending(exercises.filter((e) => e.id !== we.id), position - 1);
    if (run(() => { data.removeFromSession(we.id, owner); return true; })) replaceRoute(target ? `entreno/${target.id}` : 'entreno');
  }
  const source = progression.source;
  // Referencia de la última vez (cualquier configuración); «Usar» copia la serie equivalente.
  const previous = data.lastPerformance(owner, we.originalExerciseID, we.sessionID);
  const usePrevious = () => {
    const shown = data.lastPerformanceText(previous, unit);
    const i = Math.min(records.length, previous.sets.length - 1);
    if (!D.zeroLoad(we.loadType) && !D.zeroLoad(previous.loadType)) setWeight(D.inputNumber(shown.weights[i]));
    setReps(String(previous.sets[i].reps));
  };
  const best = !we.isReplaced && we.originalExerciseID ? data.bestMarks(owner, we) : null;
  const bestLabel = best && [
    best.load && `${D.setProgressLabel(best.load.set)}`,
    !best.load && best.reps && D.zeroLoad(we.loadType) && `${best.reps.value} reps`,
    best.e1rm && `1RM est. ${D.display(Math.round(best.e1rm.value * 10) / 10)} ${D.keyLoadLabel(best.key)}`,
  ].filter(Boolean).join(' · ');

  const dock = html`
    <${RestTimer} presets=${canRecord && records.length > 0 && !(we.restSeconds ?? pref?.preferredRestSeconds)} />
    ${record && html`<div class="pr">🏆 ${record}</div>`}
    ${needsSet ? html`
      ${message && html`<div class="ok">✓ ${message}</div>`}
      <button class="btn primary block big" disabled=${!!invalid} onClick=${confirm}>✓ Completar serie</button>`
    : canRecord && html`<div class="ok center">✓ Objetivo de series completado</div>
      <div class="hstack"><button class="btn block" onClick=${() => setExtra(true)}>+ Añadir serie</button>
      ${pending ? html`<button class="btn primary block" onClick=${() => replaceRoute(`entreno/${pending.id}`)}>Siguiente: ${N(pending.name)} ›</button>`
        : html`<button class="btn primary block" onClick=${() => replaceRoute('entreno')}>Ver entrenamiento ›</button>`}</div>`}`;

  return html`
    <${Page} title=${N(we.name)} backTo="entreno" dock=${dock}
      right=${we.originalExerciseID && html`<button class="btn plain" onClick=${() => go(`ejercicio/${we.originalExerciseID}`)}>Ficha</button>`}>
      <div class="card stack exercise-head">
        <div class="hstack" style="align-items:flex-start"><div class="spacer">
          <div style="font-size:22px;font-weight:800;letter-spacing:-0.01em">${N(we.name)}</div>
          <div class="muted"><b>${we.targetSets} × ${we.repsMin}–${we.repsMax}</b>${we.restSeconds ? ` · descanso ${D.display(we.restSeconds / 60)} min` : ''}</div>
          ${data.exercise(we.originalExerciseID) && html`<button class="link-btn" onClick=${() => setSheet('guide')}>¿No sabes cómo hacerlo? <b>Ver cómo se hace</b></button>`}
          ${we.isReplaced && html`<div class="small muted">Sustituido · series conservadas</div>`}
          </div>
          ${data.exercise(we.originalExerciseID) && html`<${ExerciseVisual} exercise=${data.exercise(we.originalExerciseID)} compact onClick=${() => setSheet('guide')} />`}
        </div>
        ${!we.isReplaced && html`<${PreviousBox} last=${previous} unit=${unit} onUse=${canRecord && needsSet ? usePrevious : null} />`}
        ${!we.isReplaced && !['noHistory', 'historyOnly'].includes(progression.kind) && html`<${ProgressionCard} p=${progression} />`}
        ${bestLabel && html`<div class="small">🏆 Tu mejor marca: <b>${bestLabel}</b></div>`}
        ${canRecord && we.loadType === 'unspecified' && we.originalExerciseID && html`
          <button class="link-btn" style="text-align:left" onClick=${() => setSheet('loads')}>💡 Este ejercicio no tiene tipo de carga. <b>Defínelo aquí</b> para recibir sugerencias de subir peso y récords desde tu próximo entrenamiento.</button>`}
        ${data.setupSummary(pref) && html`<div class="small">Tu configuración: ${data.setupSummary(pref)}</div>`}
        <div class="hstack">
          <button class="icon-btn" aria-label="Ejercicio anterior" disabled=${position <= 0} onClick=${() => move(-1)}>‹</button>
          <button class="btn plain spacer" onClick=${() => setSheet('choose')}>Ejercicio ${position + 1} de ${exercises.length}</button>
          <button class="icon-btn" aria-label="Ejercicio siguiente" disabled=${position + 1 >= exercises.length} onClick=${() => move(1)}>›</button>
        </div>
      </div>

      ${needsSet && html`
        <${Section} title=${`Serie ${records.length + 1} de ${Math.max(we.targetSets, records.length + 1)}`}>
          <div class="card">
            <${SetInputs} load=${we.loadType} unit=${unit} increment=${increment ?? 2.5} weight=${weight} reps=${reps} setWeight=${setWeight} setReps=${setReps} />
            ${invalid && weight !== '' && html`<p class="muted small">${invalid}</p>`}
          </div>
        <//>`}

      <${Section} title="Series confirmadas">
        <div class="list">
          ${records.length === 0 && html`<div class="row static muted">Aún no hay series confirmadas.</div>`}
          ${records.map((r) => html`
            <div class="row static">
              <span class="badge on">${r.order}</span>
              <button class="grow" style="background:none;border:0;text-align:left;padding:0;cursor:pointer" onClick=${() => setSheet({ edit: r })}>${D.recordLabel(r)}</button>
              ${canRecord && html`<button class="btn plain danger" aria-label=${`Eliminar serie ${r.order}`} onClick=${() => remove(r)}>Eliminar</button>`}
            </div>`)}
        </div>
      <//>

      <${Section} title="Detalles">
        <div class="list">
          <${Row} title=${D.LOAD_TYPES[we.loadType] + (we.isUnilateral ? ' · Reps por lado' : '')} sub=${[we.equipment, we.note].filter(Boolean).join(' · ')} />
          ${canRecord && we.originalExerciseID && html`<${Row} title="Tu configuración" sub="Unidad, incremento, descanso, asiento" onClick=${() => setSheet('pref')} />`}
          ${canRecord && we.originalExerciseID && data.exercise(we.originalExerciseID) && html`<${Row} icon=${html`<${Tile} text="⇄" color="#5e5ce6" />`}
            title="¿No tienes este equipo?" sub="Ver variaciones con mancuernas, máquina, polea o sin equipo" onClick=${() => setSheet('variations')} />`}
          ${canRecord && html`<${Row} icon=${html`<${Tile} name="swap" color="#0a84ff" />`} title="Cambiar ejercicio" sub="Solo esta sesión. La rutina original no cambia." onClick=${() => setSheet('replace')} />`}
          ${session?.status === 'active' && html`<${Row} icon=${html`<${Tile} name="plus" color="#30d158" />`} title="Añadir un ejercicio después de este" sub="Solo hoy o también en tu rutina" onClick=${() => setSheet('add')} />`}
          ${canRecord && records.length === 0 && html`<${Row} icon=${html`<${Tile} name="trash" color="#ff453a" />`} title="Quitar de este entrenamiento" sub="Hoy no lo vas a hacer" onClick=${removeExercise} />`}
        </div>
      <//>
    <//>
    ${sheet === 'add' && html`<${AddToSession} owner=${owner} session=${session} afterOrder=${we.order} onClose=${() => setSheet(null)}
      onAdded=${(added) => { setSheet(null); replaceRoute(`entreno/${added.id}`); }} />`}
    ${sheet === 'choose' && html`<${Sheet} title="Ejercicios" onClose=${() => setSheet(null)}>
      <div class="list">${exercises.map((e) => html`<${ExerciseLabel} we=${e} onClick=${() => { setSheet(null); replaceRoute(`entreno/${e.id}`); }} />`)}</div><//>`}
    ${sheet === 'replace' && html`<${ExercisePicker} title="Sustituir en esta sesión" onClose=${() => setSheet(null)}
      onPick=${(ex) => { const next = run(() => data.replaceInSession(we.id, owner, ex.id)); setSheet(null); if (next) replaceRoute(`entreno/${next.id}`); }} />`}
    ${sheet === 'loads' && html`<${LoadTypeReview} onClose=${() => setSheet(null)} />`}
    ${(sheet === 'guide' || sheet === 'variations') && data.exercise(we.originalExerciseID) && html`<${GuideSheet} exercise=${data.exercise(we.originalExerciseID)} tab=${sheet === 'variations' ? 'variations' : 'how'}
      onClose=${() => setSheet(null)} useLabel="Hacer este hoy"
      onUse=${canRecord ? (alt) => { const next = alt && run(() => data.replaceInSession(we.id, owner, alt.id)); setSheet(null); if (next) { toast(`Hoy: ${N(alt.name)}`); replaceRoute(`entreno/${next.id}`); } } : null} />`}
    ${sheet === 'pref' && html`<${PreferenceSheet} owner=${owner} exerciseID=${we.originalExerciseID} onClose=${() => setSheet(null)} />`}
    ${sheet?.edit && html`<${SetEditor} record=${sheet.edit} onClose=${() => setSheet(null)}
      onSave=${(w, r) => { run(() => { data.updateSet(sheet.edit.id, owner, w, r, null, { active: canRecord }); setSheet(null); toast('Serie actualizada'); }); }} />`}`;
}

/** «Peso anterior / Repeticiones anteriores» de la última vez que hiciste este ejercicio. */
export function PreviousBox({ last, unit, onUse }) {
  const text = data.lastPerformanceText(last, unit);
  if (!text) return html`<div class="prev-box empty small">Primera vez con este ejercicio: elige un peso cómodo y anótalo.</div>`;
  return html`
    <div class="prev-box">
      <div class="spacer">
        ${text.weight && html`<div><span class="muted">Peso anterior:</span> <b>${text.weight}</b>${text.converted && html` <span class="muted small">(${text.converted})</span>`}</div>`}
        <div><span class="muted">Repeticiones anteriores:</span> <b>${text.reps}</b></div>
        <div class="small muted">${text.date}</div>
      </div>
      ${onUse && html`<button class="btn" onClick=${onUse}>Usar</button>`}
    </div>`;
}

/** Hoja para escribir la nota y el ánimo del entrenamiento. */
export function NoteSheet({ owner, session, onClose }) {
  const [mood, setMood] = useState(session.mood ?? null);
  const [note, setNote] = useState(session.note ?? '');
  const save = () => run(() => { data.setSessionNote(session.id, owner, { mood, note }); toast('Nota guardada'); onClose(); });
  return html`<${Sheet} title="Nota del entrenamiento" onClose=${onClose} right=${html`<button class="btn plain" onClick=${save}>Guardar</button>`}>
    <div class="card stack">
      <div><div class="small muted" style="margin:0 4px 6px">¿Cómo te sentiste?</div>
        <div class="chips wrap" style="margin:0">${Object.entries(data.MOODS).map(([k, label]) => html`
          <button class=${`chip ${mood === k ? 'on' : ''}`} onClick=${() => setMood(mood === k ? null : k)}>${label}</button>`)}</div></div>
      <${Field} label="Nota (opcional)"><textarea class="input" placeholder="Ej.: me molestó el hombro izquierdo, dormí poco…" value=${note} onInput=${(e) => setNote(e.target.value)} /><//>
      <button class="btn primary block" onClick=${save}>Guardar nota</button>
    </div><//>`;
}

/** Ánimo y nota en el resumen; si aún no hay, pregunta «¿Cómo te fue?». */
function MoodNote({ owner, session }) {
  const [open, setOpen] = useState(false);
  const has = session.mood || session.note;
  return html`
    <div class="card">
      ${has ? html`<div class="hstack"><div class="spacer">
          ${session.mood && html`<b>${data.MOODS[session.mood]}</b>`}
          ${session.note && html`<div style="white-space:pre-wrap">${session.note}</div>`}</div>
          <button class="btn plain" onClick=${() => setOpen(true)}>Editar</button></div>`
      : html`<div class="small muted" style="margin-bottom:8px">¿Cómo te fue?</div>
        <div class="chips wrap" style="margin:0">${Object.entries(data.MOODS).map(([k, label]) => html`
          <button class="chip" onClick=${() => run(() => data.setSessionNote(session.id, owner, { mood: k, note: session.note }))}>${label}</button>`)}
          <button class="chip" onClick=${() => setOpen(true)}>📝 Escribir nota</button></div>`}
    </div>
    ${open && html`<${NoteSheet} owner=${owner} session=${session} onClose=${() => setOpen(false)} />`}`;
}
