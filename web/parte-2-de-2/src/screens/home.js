import { html, useState } from '../../vendor/preact-htm.js';
import * as data from '../data.js';
import * as D from '../domain.js';
import { N } from '../catalog.js';
import { store } from '../store.js';
import { selectProfile } from '../session.js';
import { Page, Section, Row, Sheet, Stat, Tile, Icon, Confetti, ProgressRing, Segmented, go, run, toast, useTick } from '../ui.js';
import { activeTheme } from '../theme.js';
import { LoadTypeReview } from './exercises.js';

const JS_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function SyncBadge() {
  if (store.mode !== 'cloud') return html`<span class="sync offline"><span class="dot"></span>Solo este dispositivo</span>`;
  const { state, pending } = store.sync;
  const label = state === 'syncing' ? 'Sincronizando…' : state === 'offline' ? `Sin conexión${pending ? ` · ${pending} pendientes` : ''}`
    : state === 'error' ? 'Error al sincronizar' : pending ? `${pending} cambios pendientes` : 'Guardado en la nube';
  return html`<button class=${`sync ${state}`} style="background:none;border:0;padding:0;cursor:pointer" onClick=${() => store.syncNow()}><span class="dot"></span>${label}</button>`;
}

export function startWorkout(owner, dayID) {
  const session = run(() => data.startWorkout(dayID, owner));
  if (session) go('entreno');
}

export function Home({ owner }) {
  useTick(60000);
  const me = data.profile(owner);
  const [choosing, setChoosing] = useState(false);
  const [sheet, setSheet] = useState(null);
  const missingLoads = data.exercisesWithoutLoad().length;
  const active = data.activeSession(owner);
  const routine = data.activeRoutine(owner);
  const routineDays = routine ? data.days(routine.id) : [];
  const trainable = routineDays.filter((d) => data.dayEntries(d.id).length);
  const today = routineDays.find((d) => d.weekday === JS_DAYS[new Date().getDay()]);
  const todayEntries = today ? data.dayEntries(today.id) : [];

  // Sin día asignado para hoy: sugerir el día que sigue al último entrenamiento de esta rutina.
  const lastDone = data.sessions(owner).find((s) => s.status === 'completed');
  const lastIndex = routine && lastDone?.routineID === routine.id ? trainable.findIndex((d) => d.name === lastDone.dayNameSnapshot) : -1;
  const upNext = trainable.length ? trainable[(lastIndex + 1) % trainable.length] : null;

  const todays = data.birthdaysToday();
  const mine = todays.some((p) => p.id === owner);
  const soon = todays.length ? [] : data.upcomingBirthdays(7);

  const progress = data.progress(owner);
  const week = D.overview(progress, D.periodInterval('week'));
  const events = D.intelligence(progress, D.periodInterval('fourWeeks')).events.slice(0, 2);

  let workout;
  if (active) {
    const ex = data.sessionExercises(active.id).filter((e) => !e.isReplaced);
    workout = html`
      <div class="caps">Entrenamiento en curso</div>
      <div class="big">${active.dayNameSnapshot}</div>
      <div class="muted small">${ex.length} ejercicios · ${ex.reduce((a, e) => a + e.targetSets, 0)} series objetivo · ${D.formatDuration(Date.now() - active.startedAt)}</div>
      <button class="btn primary block big" style="margin-top:12px" onClick=${() => go('entreno')}><${Icon} name="play" /> Continuar entrenamiento</button>`;
  } else if (routine) {
    workout = html`
      ${today ? html`
        <div class="caps">Hoy</div>
        <div class="big">${today.name}</div>
        <div class="muted small">${todayEntries.length ? `${todayEntries.length} ejercicios · ${todayEntries.reduce((a, e) => a + e.sets, 0)} series` : '⏸ Día de descanso'}</div>
        ${todayEntries.length > 0 && html`<button class="btn primary block big" style="margin-top:12px" onClick=${() => startWorkout(owner, today.id)}><${Icon} name="play" /> Comenzar entrenamiento</button>`}
      ` : html`
        <div class="caps">Tu próxima sesión</div>
        <div class="big">${upNext?.name ?? routine.name}</div>
        <div class="muted small">${upNext ? `${data.dayEntries(upNext.id).length} ejercicios${lastIndex >= 0 ? ` · sigue a ${lastDone.dayNameSnapshot}` : ''}` : routine.name}</div>
        ${upNext && html`<button class="btn primary block big" style="margin-top:12px" onClick=${() => startWorkout(owner, upNext.id)}><${Icon} name="play" /> Comenzar ${upNext.name}</button>`}
      `}
      ${trainable.length > 0 && html`<button class="btn plain block" style="margin-top:6px" onClick=${() => setChoosing(true)}>Elegir otro entrenamiento</button>`}`;
  } else {
    workout = html`<b>Todavía no tienes una rutina</b><div class="muted small">Crea una o copia una existente desde Rutinas.</div>
      <button class="btn block" style="margin-top:12px" onClick=${() => go('rutinas')}>Ir a Rutinas</button>`;
  }

  return html`
    <${Page} title="Inicio" large right=${html`<${SyncBadge} />`}>
      <div class="hstack" style="margin-bottom:16px">
        <div class="spacer"><div class="muted small">${capitalize(new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
          <div style="font-size:24px;font-weight:800;letter-spacing:-0.02em">${mine ? `¡Feliz cumpleaños, ${me.name}! 🎂` : `Hola, ${me.name} ${activeTheme().emoji}`}</div></div>
        <button class="avatar" style="border:0;cursor:pointer" aria-label=${`Cambiar perfil (activo: ${me.name})`} onClick=${() => selectProfile(null)}>${me.name.slice(0, 1).toUpperCase()}</button>
      </div>
      ${todays.length > 0 && html`<${BirthdayCard} owner=${owner} people=${todays} />`}
      ${soon.length > 0 && html`<div class="card small birthday-soon">🎈 ${soon.map(({ profile, inDays }) =>
        `${inDays === 1 ? 'Mañana' : `En ${inDays} días`} es el cumpleaños de ${profile.id === owner ? 'ti' : profile.name}`).join(' · ')}</div>`}
      <div class="hero home-hero">
        <span class="hero-deco" aria-hidden="true">${activeTheme().deco ?? ''}${activeTheme().emoji}</span>
        ${workout}
        ${!active && lastDone && html`<div class="muted small" style="margin-top:10px">Último: ${lastDone.dayNameSnapshot} · ${ago(lastDone.startedAt)}</div>`}
      </div>
      <${InstallHint} />
      <${Section} title="Esta semana">
        <div class="duo">
          <${GoalCard} owner=${owner} onEdit=${() => setSheet('goal')} />
          <${WeightCard} owner=${owner} onLog=${() => setSheet('weight')} />
        </div>
        ${week.workouts > 0 && html`<div class="week-line">${week.workouts} ${week.workouts === 1 ? 'entrenamiento' : 'entrenamientos'} · ${week.sets} series · ${week.reps} reps · ${D.formatDuration(week.totalDuration)}</div>`}
      <//>
      <${Section} title="Constancia"><${Consistency} owner=${owner} /><//>
      <${FamilyFeed} owner=${owner} />
      ${events.length > 0 && html`
        <${Section} title="Progreso reciente">
          <div class="list">${events.map((e) => html`<${Row} icon=${html`<${Tile} name=${e.icon === '🏆' ? 'trophy' : 'progress'} color=${e.icon === '🏆' ? '#ffb340' : '#30d158'} />`} title=${`${e.title} · ${N(e.group.name)}`} sub=${e.detail} href=${`progreso/${encodeURIComponent(e.group.id)}`} />`)}</div>
        <//>`}
      <${Section} title="Tu gimnasio">
        <div class="list">
          <${Row} icon=${html`<${Tile} name="dumbbell" color="#ff9f0a" />`} title="Ejercicios" sub="Cómo se hacen, fotos y variaciones" href="ejercicios" />
          <${Row} icon=${html`<${Tile} name="body" color="#ff375f" />`} title="Progreso corporal" sub="Peso, medidas y fotos" href="cuerpo" />
          ${missingLoads > 0 && html`<${Row} icon=${html`<${Tile} text="💡" color="#ffd60a" />`} title="Completar tipo de carga"
            sub=${`${missingLoads} ${missingLoads === 1 ? 'ejercicio' : 'ejercicios'}: así recibes sugerencias y récords`} onClick=${() => setSheet('loads')} />`}
        </div>
      <//>
    <//>
    ${sheet === 'goal' && html`<${GoalSheet} owner=${owner} onClose=${() => setSheet(null)} />`}
    ${sheet === 'weight' && html`<${WeightSheet} owner=${owner} onClose=${() => setSheet(null)} />`}
    ${sheet === 'loads' && html`<${LoadTypeReview} onClose=${() => setSheet(null)} />`}
    ${choosing && html`
      <${Sheet} title="Elegir entrenamiento" onClose=${() => setChoosing(false)}>
        <div class="list">${trainable.map((d) => html`<${Row} title=${`Iniciar ${d.name}`} sub=${d.weekday} onClick=${() => { setChoosing(false); startWorkout(owner, d.id); }} />`)}</div>
      <//>`}`;
}

const capitalize = (t) => t.charAt(0).toUpperCase() + t.slice(1);
function ago(t) {
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 864e5);
  return days <= 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`;
}

/** Últimas 8 semanas (lunes a domingo): un punto por día entrenado, y racha de semanas. */
function Consistency({ owner }) {
  const trained = data.trainingDays(owner);
  const streak = data.weekStreak(owner);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = D.startOfWeek(today.getTime()) - 7 * 7 * 864e5;
  const weeks = Array.from({ length: 8 }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const day = new Date(start); day.setDate(day.getDate() + w * 7 + d);
    return day.getTime();
  }));
  const month = [...trained].filter((d) => new Date(d).getMonth() === today.getMonth() && new Date(d).getFullYear() === today.getFullYear()).length;
  return html`
    <div class="card">
      <div class="hstack" style="margin-bottom:10px">
        <span class="streak-flame" aria-hidden="true"><${Icon} name="flame" size=${26} /></span>
        <div class="spacer"><b>${streak ? `${streak} ${streak === 1 ? 'semana' : 'semanas'} seguidas` : 'Empieza tu racha esta semana'}</b>
          <div class="muted small">${month} ${month === 1 ? 'día entrenado' : 'días entrenados'} este mes</div></div>
      </div>
      <div class="calendar" role="img" aria-label=${`Días entrenados en las últimas 8 semanas: ${weeks.flat().filter((d) => trained.has(d)).length}`}>
        ${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((l) => html`<span class="cal-head">${l}</span>`)}
        ${weeks.flat().map((d) => html`<span class=${`cal-day ${trained.has(d) ? 'on' : ''} ${d === today.getTime() ? 'today' : ''} ${d > today.getTime() ? 'future' : ''}`}
          title=${new Date(d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}></span>`)}
      </div>
    </div>`;
}

/** Sugerencia única para instalar la app en la pantalla de inicio (no aparece si ya está instalada). */
function InstallHint() {
  const key = 'gymef.installHint.dismissed';
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(key) === '1'; } catch { return false; }
  });
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (hidden || installed) return null;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const android = /Android/.test(navigator.userAgent);
  if (!ios && !android) return null;
  const dismiss = () => { try { localStorage.setItem(key, '1'); } catch {} setHidden(true); };
  return html`
    <div class="card" style="margin-top:12px">
      <b>📲 Instala GymE&F en tu pantalla de inicio</b>
      <p class="muted small" style="margin:4px 0 10px">${ios ? 'En Safari: botón Compartir ⬆︎ → «Agregar a pantalla de inicio».' : 'En Chrome: menú ⋮ → «Instalar app».'} Se abre a pantalla completa y funciona sin señal.</p>
      <button class="btn plain" onClick=${dismiss}>Ahora no</button>
    </div>`;
}

/** Felicitación del día: especial para quien cumple años, aviso para el resto de la familia. Confeti una vez al día. */
function BirthdayCard({ owner, people }) {
  const mine = people.some((p) => p.id === owner);
  const others = people.filter((p) => p.id !== owner).map((p) => p.name);
  const names = others.length > 1 ? `${others.slice(0, -1).join(', ')} y ${others.at(-1)}` : others[0];
  const key = 'gymef.birthdayConfetti';
  const stamp = `${new Date().toDateString()}:${owner}`;
  const [party] = useState(() => {
    try { if (localStorage.getItem(key) === stamp) return false; localStorage.setItem(key, stamp); } catch {}
    return true;
  });
  return html`
    ${party && html`<${Confetti} />`}
    <div class="birthday-card">
      <span class="birthday-cake" aria-hidden="true">🎂</span>
      <div class="spacer">
        ${mine ? html`<b>¡Hoy es tu día!</b><div class="small">Toda la familia GymE&F te desea un feliz cumpleaños. ¡Entrena con todo! 💪</div>`
          : html`<b>Hoy es el cumpleaños de ${names}</b><div class="small">¡Mándale un abrazo! 🎉</div>`}
        ${mine && others.length > 0 && html`<div class="small" style="margin-top:4px">Y también de ${names} 🎉</div>`}
      </div>
    </div>`;
}

/** Meta semanal: anillo con entrenamientos hechos frente a la meta del perfil. */
function GoalCard({ owner, onEdit }) {
  const { done, goal } = data.weekProgress(owner);
  if (!goal) {
    return html`<button class="mini-card" onClick=${onEdit}><span class="mini-icon"><${Icon} name="calendar" /></span>
      <b>Meta semanal</b><span class="small muted">Ponte una meta de entrenamientos por semana</span></button>`;
  }
  const left = Math.max(0, goal - done);
  return html`<button class="mini-card" onClick=${onEdit}>
    <${ProgressRing} value=${done / goal} size=${54}><span class="ring-small">${done}/${goal}</span><//>
    <b>${left ? `Te ${left === 1 ? 'falta' : 'faltan'} ${left}` : '¡Meta cumplida! 🎉'}</b>
    <span class="small muted">${done} de ${goal} entrenamientos esta semana</span></button>`;
}
function GoalSheet({ owner, onClose }) {
  const current = data.profile(owner).weeklyGoal;
  const options = { 0: 'Sin meta', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6' };
  return html`<${Sheet} title="Meta semanal" onClose=${onClose}>
    <div class="card stack">
      <p class="muted small" style="margin:0">¿Cuántos entrenamientos quieres completar cada semana (de lunes a domingo)?</p>
      <${Segmented} options=${options} value=${String(current ?? 0)} onChange=${(v) => run(() => { data.setWeeklyGoal(owner, Number(v) || null); toast(Number(v) ? `Meta: ${v} entrenamientos por semana` : 'Meta quitada'); onClose(); })} />
    </div><//>`;
}

/** Peso corporal: último registro, cambio en ~30 días y registro rápido. */
function WeightCard({ owner, onLog }) {
  const unit = data.unitFor(owner, null);
  const trend = data.bodyWeightTrend(owner);
  const show = (kg) => D.display(Math.round(D.convert(kg, 'kg', unit) * 10) / 10);
  return html`<button class="mini-card" onClick=${onLog}><span class="mini-icon pink"><${Icon} name="scale" /></span>
    ${trend ? html`<b>${show(trend.latest.bodyWeight)} ${unit}</b>
      <span class="small muted">${trend.change != null && Math.abs(trend.change) >= 0.05
        ? `${trend.change > 0 ? '+' : '−'}${show(Math.abs(trend.change))} ${unit} desde el ${D.formatDate(trend.since, { day: 'numeric', month: 'short' })}`
        : `Peso corporal · ${D.formatDate(trend.latest.recordedAt, { day: 'numeric', month: 'short' })}`}</span>`
    : html`<b>Peso corporal</b><span class="small muted">Toca para registrar tu peso de hoy</span>`}
  </button>`;
}
function WeightSheet({ owner, onClose }) {
  const unit = data.unitFor(owner, null);
  const trend = data.bodyWeightTrend(owner);
  const [value, setValue] = useState(trend ? D.inputNumber(D.convert(trend.latest.bodyWeight, 'kg', unit)) : '');
  const parsed = D.parseNumber(value);
  const save = () => run(() => { data.logBodyWeight(owner, parsed, unit); toast('Peso registrado'); onClose(); });
  return html`<${Sheet} title="Peso de hoy" onClose=${onClose} right=${html`<button class="btn plain" disabled=${!(parsed > 0)} onClick=${save}>Guardar</button>`}>
    <div class="card stack">
      <input class="input big-input" inputmode="decimal" value=${value} onInput=${(e) => setValue(e.target.value)} onFocus=${(e) => e.target.select()} aria-label=${`Peso en ${unit}`} />
      <div class="conversion">${parsed > 0 ? `${D.display(parsed)} ${unit} = ${D.display(Math.round(D.convert(parsed, unit, unit === 'kg' ? 'lb' : 'kg') * 10) / 10)} ${unit === 'kg' ? 'lb' : 'kg'}` : `En ${unit}`}</div>
      <button class="btn primary block big" disabled=${!(parsed > 0)} onClick=${save}>Guardar</button>
      <a class="btn plain block" href="#/cuerpo" onClick=${onClose}>Ver medidas y gráfica</a>
    </div><//>`;
}

/** Lo último que ha hecho la familia: entrenamientos terminados y récords (últimos 7 días). */
function FamilyFeed({ owner }) {
  if (data.profiles().length < 2) return null;
  const events = data.familyActivity(7).slice(0, 4);
  return html`<${Section} title="Familia">
    <div class="list">
      ${events.length === 0 && html`<div class="row static muted small">Cuando alguien de la familia termine un entrenamiento o haga un récord, aparecerá aquí.</div>`}
      ${events.map((e) => html`<${Row} icon=${html`<span class="avatar small-avatar" aria-hidden="true">${e.profile.name.slice(0, 1).toUpperCase()}</span>`}
        title=${`${e.profile.id === owner ? 'Tú' : e.profile.name} ${e.profile.id === owner ? e.title.replace('terminó', 'terminaste') : e.title}${e.kind === 'record' ? ' 🏆' : ''}`}
        sub=${`${e.detail} · ${agoTime(e.date)}${e.mood ? ` · ${data.MOODS[e.mood].split(' ')[0]}` : ''}`} />`)}
    </div><//>`;
}
function agoTime(t) {
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 60) return mins <= 1 ? 'ahora' : `hace ${mins} min`;
  return ago(t);
}
