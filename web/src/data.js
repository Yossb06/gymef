// Consultas y operaciones por perfil (equivalente a RoutineStore, WorkoutStore, WorkoutHistory,
// ExercisePreferenceStore y BodyMeasurementStore). Toda operación personal exige un perfil explícito.
import { store, newId } from './store.js';
import * as D from './domain.js';
import { altEntry, variationNames, spanishName } from './catalog.js';

export class UserError extends Error {}
const fail = (message) => { throw new UserError(message); };
const OWNERSHIP = 'El elemento no pertenece a este perfil.';
const byOrder = (a, b) => a.order - b.order;
const trimmed = (s) => (s ?? '').trim();

// ---------- Perfiles ----------
export const profiles = () => store.all('profiles').sort((a, b) => a.createdAt - b.createdAt || a.name.localeCompare(b.name));
export const profile = (id) => store.get('profiles', id);
export function createProfile(name) {
  if (!trimmed(name)) fail('Escribe un nombre.');
  return store.put('profiles', { id: newId(), name: trimmed(name), defaultLoadUnitRaw: 'kg', createdAt: Date.now() });
}
export function renameProfile(owner, name) {
  if (!trimmed(name)) fail('Escribe un nombre.');
  store.update('profiles', owner, { name: trimmed(name) });
}
export const setDefaultUnit = (owner, unit) => store.update('profiles', owner, { defaultLoadUnitRaw: unit });
/** Cumpleaños del perfil como «MM-DD» (sin año), o null. Lo puede poner cualquiera de la familia. */
export function setBirthday(profileID, monthDay) {
  if (monthDay != null && !/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(monthDay)) fail('Elige un día y un mes válidos.');
  if (!profile(profileID)) fail('El perfil ya no está disponible.');
  store.update('profiles', profileID, { birthday: monthDay });
}
const monthDayOf = (date) => `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
/** Perfiles que cumplen años hoy. */
export const birthdaysToday = (date = new Date()) => profiles().filter((p) => p.birthday === monthDayOf(date));
/** Próximos cumpleaños en los siguientes `days` días (sin contar hoy), del más cercano al más lejano. */
export function upcomingBirthdays(days = 14, date = new Date()) {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const list = [];
  for (let i = 1; i <= days; i += 1) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    for (const p of profiles()) if (p.birthday === monthDayOf(d)) list.push({ profile: p, inDays: i, date: d });
  }
  return list;
}
/** Apariencia del perfil: { mode, theme, text } (ver theme.js). */
export const setAppearance = (owner, appearance) => store.update('profiles', owner, { appearance: { ...(profile(owner)?.appearance ?? {}), ...appearance } });

// ---------- Ejercicios y preferencias ----------
export const exercises = () => store.all('exercises').sort((a, b) => a.name.localeCompare(b.name, 'es'));
export const exercise = (id) => store.get('exercises', id);
export function saveExercise({ id, name, primaryMuscle, equipment, loadType, isUnilateral, instructionsText, aliasesText }) {
  const clean = trimmed(name);
  if (!clean) fail('Revisa el nombre del ejercicio.');
  if (exercises().some((e) => e.id !== id && D.normalizedName(e.name) === D.normalizedName(clean))) fail('Ya existe un ejercicio con ese nombre.');
  const base = id ? exercise(id) : { id: newId(), createdAt: Date.now(), seedKey: null };
  return store.put('exercises', {
    ...base, name: clean, primaryMuscle: trimmed(primaryMuscle) || 'Sin especificar', equipment: trimmed(equipment) || 'Sin especificar',
    loadType: loadType || 'unspecified', isUnilateral: !!isUnilateral, instructionsText: instructionsText ?? '', aliasesText: aliasesText ?? '',
  });
}
export const preference = (owner, exerciseID) =>
  store.all('preferences').find((p) => p.profileID === owner && p.exerciseID === exerciseID) ?? null;
export function savePreference(owner, exerciseID, { increment, incrementUnit, rest, seat, settings, notes, preferredUnit }) {
  if (!(increment == null || (Number.isFinite(increment) && increment > 0)) || !(rest == null || rest >= 0))
    fail('El incremento debe ser positivo y el descanso no puede ser negativo.');
  const ex = exercise(exerciseID);
  if (!profile(owner) || !ex) fail('El perfil o ejercicio ya no está disponible.');
  const existing = preference(owner, exerciseID);
  const clean = (t) => trimmed(t) || null;
  store.put('preferences', {
    ...(existing ?? { id: newId(), profileID: owner, exerciseID }),
    preferredLoadUnit: preferredUnit || null, incrementUnit: incrementUnit || 'kg', preferredIncrement: increment ?? null,
    preferredRestSeconds: rest ?? null, seatPosition: clean(seat), equipmentSettings: clean(settings), setupNotes: clean(notes),
    incrementConfiguration: increment == null ? null : D.incrementConfiguration(ex.loadType, ex.equipment, ex.isUnilateral),
  });
}
export const unitFor = (owner, exerciseID) => D.resolveUnit(profile(owner), exerciseID ? preference(owner, exerciseID) : null);
export function incrementFor(owner, exerciseID, load, equipment, unilateral) {
  const p = exerciseID && preference(owner, exerciseID);
  if (!p || p.incrementConfiguration !== D.incrementConfiguration(load, equipment, unilateral)) return null;
  if (!(Number.isFinite(p.preferredIncrement) && p.preferredIncrement > 0)) return null;
  return D.convert(p.preferredIncrement, D.isUnit(p.incrementUnit) ? p.incrementUnit : 'kg', unitFor(owner, exerciseID));
}
export const setupSummary = (p) => p ? [p.seatPosition && `Asiento ${p.seatPosition}`, p.equipmentSettings, p.setupNotes].filter(Boolean).join(' · ') : '';

// ---------- Rutinas ----------
export const routines = (owner) => store.all('routines').filter((r) => r.profileID === owner).sort((a, b) => a.createdAt - b.createdAt);
export const activeRoutine = (owner) => routines(owner).find((r) => r.isActive && !r.archivedAt) ?? null;
export const days = (routineID) => [...store.by('days', 'routineID', routineID)].sort(byOrder);
export const dayEntries = (dayID) => [...store.by('routineExercises', 'dayID', dayID)].sort(byOrder);
export function requireRoutine(routineID, owner) {
  const r = store.get('routines', routineID);
  if (!r || r.profileID !== owner) fail(OWNERSHIP);
  return r;
}
export function requireDay(dayID, owner) {
  const d = store.get('days', dayID);
  if (!d) fail(OWNERSHIP);
  requireRoutine(d.routineID, owner);
  return d;
}
function requireEntry(entryID, owner) {
  const e = store.get('routineExercises', entryID);
  if (!e) fail(OWNERSHIP);
  requireDay(e.dayID, owner);
  return e;
}
export function createRoutine(owner, name) {
  if (!trimmed(name)) fail('Revisa el nombre, series, repeticiones y descanso.');
  if (!profile(owner)) fail(OWNERSHIP);
  return store.put('routines', { id: newId(), name: trimmed(name), createdAt: Date.now(), isActive: !activeRoutine(owner), archivedAt: null, seedKey: null, profileID: owner });
}
export function renameRoutine(id, owner, name) {
  requireRoutine(id, owner);
  if (!trimmed(name)) fail('Escribe un nombre.');
  store.update('routines', id, { name: trimmed(name) });
}
export function activateRoutine(id, owner) {
  requireRoutine(id, owner);
  store.batch(() => {
    for (const r of routines(owner)) if (r.isActive && r.id !== id) store.update('routines', r.id, { isActive: false });
    store.update('routines', id, { isActive: true, archivedAt: null });
  });
}
export function archiveRoutine(id, owner) {
  requireRoutine(id, owner);
  store.update('routines', id, { isActive: false, archivedAt: Date.now() });
}
/** Copia independiente, con nuevos UUID e inicialmente sin activar. */
export function copyRoutine(sourceID, targetOwner) {
  const source = store.get('routines', sourceID);
  if (!source || !profile(targetOwner)) fail(OWNERSHIP);
  return store.batch(() => {
    const copy = store.put('routines', { id: newId(), name: source.name, createdAt: Date.now(), isActive: false, archivedAt: null, seedKey: null, profileID: targetOwner });
    for (const d of days(source.id)) {
      const day = store.put('days', { ...d, id: newId(), routineID: copy.id });
      for (const e of dayEntries(d.id)) store.put('routineExercises', { ...e, id: newId(), dayID: day.id });
    }
    return copy;
  });
}
export function addDay(routineID, owner, name, weekday) {
  requireRoutine(routineID, owner);
  if (!trimmed(name)) fail('Escribe un nombre para el día.');
  const order = Math.max(-1, ...days(routineID).map((d) => d.order)) + 1;
  return store.put('days', { id: newId(), name: trimmed(name), weekday: weekday ?? '', order, routineID });
}
export function updateDay(dayID, owner, name, weekday) {
  requireDay(dayID, owner);
  if (!trimmed(name)) fail('Escribe un nombre para el día.');
  store.update('days', dayID, { name: trimmed(name), weekday: weekday ?? '' });
}
export function duplicateDay(dayID, owner) {
  const source = requireDay(dayID, owner);
  return store.batch(() => {
    const list = days(source.routineID);
    for (const d of list) if (d.order > source.order) store.update('days', d.id, { order: d.order + 1 });
    const copy = store.put('days', { ...source, id: newId(), name: `${source.name} (copia)`, order: source.order + 1 });
    for (const e of dayEntries(source.id)) store.put('routineExercises', { ...e, id: newId(), dayID: copy.id });
    return copy;
  });
}
export function deleteDay(dayID, owner) {
  const day = requireDay(dayID, owner);
  store.batch(() => {
    for (const e of dayEntries(dayID)) store.remove('routineExercises', e.id);
    store.remove('days', dayID);
    days(day.routineID).forEach((d, i) => d.order !== i && store.update('days', d.id, { order: i }));
  });
}
function reorder(kind, list, index, offset) {
  const target = index + offset;
  if (target < 0 || target >= list.length) return;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  store.batch(() => next.forEach((x, i) => x.order !== i && store.update(kind, x.id, { order: i })));
}
export function moveDay(dayID, owner, offset) {
  const day = requireDay(dayID, owner);
  const list = days(day.routineID);
  reorder('days', list, list.findIndex((d) => d.id === dayID), offset);
}
const validPrescription = ({ sets, repsMin, repsMax }) => sets > 0 && repsMin > 0 && repsMax >= repsMin;
export function addEntry(dayID, owner, exerciseID, { sets = 3, repsMin = 8, repsMax = 12 } = {}) {
  requireDay(dayID, owner);
  if (!exercise(exerciseID)) fail('El ejercicio ya no está disponible.');
  if (!validPrescription({ sets, repsMin, repsMax })) fail('Revisa series y repeticiones.');
  const order = Math.max(-1, ...dayEntries(dayID).map((e) => e.order)) + 1;
  return store.put('routineExercises', { id: newId(), order, sets, repsMin, repsMax, restSeconds: null, note: '', dayID, exerciseID });
}
/** Añade varios ejercicios de una vez al final del día, con la misma prescripción. */
export function addEntries(dayID, owner, exerciseIDs, prescription) {
  return store.batch(() => exerciseIDs.map((id) => addEntry(dayID, owner, id, prescription)));
}
/** Ejercicio de la biblioteca con ese nombre; si no existe, lo crea con los datos de la biblioteca inicial o del catálogo de variaciones. */
export function exerciseNamed(name) {
  const found = findExercise(name);
  if (found) return found;
  const seed = D.SEED_LIBRARY.find(([n]) => D.normalizedName(n) === D.normalizedName(name));
  const alt = altEntry(name);
  const [, primaryMuscle, equipment, loadType, isUnilateral] = seed ?? alt ?? [];
  return saveExercise({ name, primaryMuscle, equipment, loadType, isUnilateral: !!isUnilateral });
}
// También reconoce el ejercicio por su nombre en español (p. ej. «Sentadilla goblet» → «Goblet saquat»), para no duplicarlo.
export function findExercise(name) {
  const key = D.normalizedName(name ?? '');
  const all = store.all('exercises');
  // Mismo nombre en español = mismo ejercicio («Seated leg curl» y «Sitting Leg Curl» son «Curl femoral sentado»).
  const es = D.normalizedName(spanishName(name) ?? name);
  const esOf = (e) => D.normalizedName(spanishName(e.name) ?? e.name);
  return all.find((e) => D.normalizedName(e.name) === key)
    ?? all.find((e) => esOf(e) === key || esOf(e) === es) ?? null;
}

/**
 * Variaciones de un ejercicio: las del catálogo (con otro equipo) y las que la familia relacionó a mano.
 * Cada una trae el ejercicio de la biblioteca si ya existe, o los datos del catálogo para crearlo al elegirla.
 */
export function variationsFor(ex) {
  if (!ex) return [];
  const items = [];
  // Clave por nombre en español: dos nombres originales del mismo ejercicio (Seated/Sitting leg curl) salen una vez.
  const keyOf = (name) => D.normalizedName(spanishName(name) ?? name);
  const seen = new Set([keyOf(ex.name)]);
  const add = (name, custom) => {
    const key = D.normalizedName(name);
    if (seen.has(keyOf(name))) return;
    seen.add(keyOf(name));
    const existing = findExercise(name);
    if (existing && existing.id === ex.id) return;
    const row = altEntry(name) ?? D.SEED_LIBRARY.find(([n]) => D.normalizedName(n) === key);
    const [, primaryMuscle, equipment, loadType] = row ?? [];
    items.push({ name: existing?.name ?? name, exercise: existing, custom,
      preview: existing ?? { name, primaryMuscle: primaryMuscle ?? ex.primaryMuscle, equipment: equipment ?? '', loadType: loadType ?? 'unspecified' } });
  };
  for (const id of ex.variations ?? []) { const other = exercise(id); if (other) add(other.name, true); }
  for (const name of variationNames(ex.name)) add(name, false);
  return items;
}
/** Relaciona dos ejercicios como variaciones entre sí (lo ven todos los perfiles). */
export function linkVariation(aID, bID) {
  const a = exercise(aID), b = exercise(bID);
  if (!a || !b || aID === bID) fail('Elige otro ejercicio.');
  store.batch(() => {
    store.update('exercises', aID, { variations: [...new Set([...(a.variations ?? []), bID])] });
    store.update('exercises', bID, { variations: [...new Set([...(b.variations ?? []), aID])] });
  });
}
export function unlinkVariation(aID, bID) {
  store.batch(() => {
    for (const [x, y] of [[aID, bID], [bID, aID]]) {
      const ex = exercise(x);
      if (ex?.variations?.includes(y)) store.update('exercises', x, { variations: ex.variations.filter((id) => id !== y) });
    }
  });
}
/** Crea una rutina completa desde una plantilla; usa los ejercicios de la biblioteca (o los crea si faltan). */
export function createRoutineFromTemplate(owner, templateID) {
  const template = D.ROUTINE_TEMPLATES[templateID];
  if (!template) fail('Plantilla no disponible.');
  return store.batch(() => {
    const routine = createRoutine(owner, template.name);
    for (const [dayName, weekday, entries] of template.days) {
      const day = addDay(routine.id, owner, dayName, weekday);
      for (const [name, sets, repsMin, repsMax] of entries) addEntry(day.id, owner, exerciseNamed(name).id, { sets, repsMin, repsMax });
    }
    return routine;
  });
}
export function replaceEntry(entryID, owner, exerciseID) {
  requireEntry(entryID, owner);
  store.update('routineExercises', entryID, { exerciseID });
}
export function updateEntry(entryID, owner, { sets, repsMin, repsMax, restSeconds, note }) {
  requireEntry(entryID, owner);
  if (!(sets > 0 && repsMin > 0 && repsMax >= repsMin && (restSeconds == null || restSeconds >= 0)))
    fail('Revisa el nombre, series, repeticiones y descanso.');
  store.update('routineExercises', entryID, { sets, repsMin, repsMax, restSeconds: restSeconds ?? null, note: note ?? '' });
}
export function deleteEntry(entryID, owner) {
  const entry = requireEntry(entryID, owner);
  store.batch(() => {
    store.remove('routineExercises', entryID);
    dayEntries(entry.dayID).forEach((e, i) => e.order !== i && store.update('routineExercises', e.id, { order: i }));
  });
}
export function moveEntry(entryID, owner, offset) {
  const entry = requireEntry(entryID, owner);
  const list = dayEntries(entry.dayID);
  reorder('routineExercises', list, list.findIndex((e) => e.id === entryID), offset);
}

// ---------- Entrenamientos ----------
export const sessions = (owner) => [...store.by('sessions', 'profileID', owner)].sort((a, b) => b.startedAt - a.startedAt);
export const activeSession = (owner) => sessions(owner).find((s) => s.status === 'active') ?? null;
export const sessionExercises = (sessionID) => [...store.by('workoutExercises', 'sessionID', sessionID)].sort(byOrder);
export const setsOf = (weID) => [...store.by('sets', 'exerciseID', weID)].sort(byOrder);
export function requireSession(sessionID, owner, { active = true } = {}) {
  const s = store.get('sessions', sessionID);
  if (!s || s.profileID !== owner) fail('El entrenamiento no pertenece a este perfil.');
  if (active && s.status !== 'active') fail('El entrenamiento ya no admite nuevas series.');
  return s;
}
export function requireWorkoutExercise(weID, owner, opts) {
  const we = store.get('workoutExercises', weID);
  if (!we) fail('El entrenamiento no pertenece a este perfil.');
  requireSession(we.sessionID, owner, opts);
  return we;
}
export const isComplete = (we) => setsOf(we.id).length >= we.targetSets;
export function stateLabel(we) {
  const n = setsOf(we.id).length;
  return we.isReplaced ? 'Sustituido' : n >= we.targetSets ? 'Completado' : n === 0 ? 'Pendiente' : 'En progreso';
}
const snapshotOf = (ex, sessionID, entry) => ({
  id: newId(), sessionID, originalExerciseID: ex.id, name: ex.name, order: entry.order, targetSets: entry.sets,
  repsMin: entry.repsMin, repsMax: entry.repsMax, restSeconds: entry.restSeconds ?? null, note: entry.note ?? '',
  loadType: ex.loadType, isUnilateral: ex.isUnilateral, equipment: ex.equipment, isReplaced: false,
});
export function startWorkout(dayID, owner) {
  const day = requireDay(dayID, owner);
  const existing = activeSession(owner);
  if (existing) return existing;
  const routine = store.get('routines', day.routineID);
  const entries = dayEntries(dayID);
  if (!routine.isActive || routine.archivedAt || !entries.length || entries.some((e) => !exercise(e.exerciseID)))
    fail('Elige un día con ejercicios de tu rutina activa.');
  return store.batch(() => {
    const now = Date.now();
    const session = store.put('sessions', { id: newId(), profileID: owner, startedAt: now, endedAt: null, status: 'active',
      routineID: routine.id, routineNameSnapshot: routine.name, dayNameSnapshot: day.name, createdAt: now });
    for (const e of entries) store.put('workoutExercises', snapshotOf(exercise(e.exerciseID), session.id, e));
    return session;
  });
}
function validateValues(weight, reps, load) {
  if (!(Number.isFinite(weight) && weight >= 0 && reps > 0 && Number.isInteger(reps)) || (D.zeroLoad(load) && weight !== 0))
    fail('Introduce un peso válido (≥ 0) y repeticiones mayores que cero.');
}
const recordFrom = (we, order, weight, reps, unit, id = newId()) => ({
  id, exerciseID: we.id, order, weight, reps, confirmedAt: Date.now(), loadType: we.loadType, isUnilateral: we.isUnilateral,
  equipment: we.equipment, unit, repsConvention: we.isUnilateral ? 'perSide' : 'total',
});
/** Idempotente por confirmationID: un doble toque no duplica la serie. */
export function confirmSet(weID, owner, weight, reps, unit, confirmationID) {
  const we = requireWorkoutExercise(weID, owner);
  if (we.isReplaced) fail('El entrenamiento ya no admite nuevas series.');
  validateValues(weight, reps, we.loadType);
  const existing = store.get('sets', confirmationID);
  if (existing) return existing;
  return store.put('sets', recordFrom(we, setsOf(weID).length + 1, weight, reps, unit, confirmationID));
}
export function updateSet(setID, owner, weight, reps, unit, { active = true } = {}) {
  const record = store.get('sets', setID);
  if (!record) fail(OWNERSHIP);
  requireWorkoutExercise(record.exerciseID, owner, { active });
  validateValues(weight, reps, record.loadType);
  store.update('sets', setID, { weight, reps, unit: unit ?? record.unit });
}
export function deleteSet(setID, owner, { active = true } = {}) {
  const record = store.get('sets', setID);
  if (!record) return;
  requireWorkoutExercise(record.exerciseID, owner, { active });
  store.batch(() => {
    store.remove('sets', setID);
    setsOf(record.exerciseID).forEach((s, i) => s.order !== i + 1 && store.update('sets', s.id, { order: i + 1 }));
  });
}
/** Deshace deleteSet: vuelve a insertar la serie en su posición original. */
export function restoreSet(record, owner, { active = true } = {}) {
  requireWorkoutExercise(record.exerciseID, owner, { active });
  store.batch(() => {
    for (const s of setsOf(record.exerciseID)) if (s.order >= record.order) store.update('sets', s.id, { order: s.order + 1 });
    store.put('sets', record);
  });
}
/** Mejor carga y mejor 1RM estimado con la misma configuración del ejercicio en curso (unidad del ejercicio). */
export function bestMarks(owner, we) {
  const unit = unitFor(owner, we.originalExerciseID);
  const target = D.keyId(D.inUnit(D.snapshotKey(we), unit));
  const group = progressIn(owner, unit).groups.find((g) => g.id === target);
  if (!group) return null;
  const pick = (metric) => group.sets.reduce((best, s) => {
    const v = D.metricValue(metric, s);
    return v !== null && (!best || v > best.value) ? { set: s, value: v } : best;
  }, null);
  return { load: D.zeroLoad(we.loadType) || we.loadType === 'assisted' ? null : pick('load'), e1rm: pick('estimated1RM'), reps: pick('reps'), key: group.key };
}

/** Nunca reetiqueta trabajo ya hecho: conserva el snapshot anterior y continúa en uno nuevo. */
export function replaceInSession(weID, owner, exerciseID, { active = true } = {}) {
  const old = requireWorkoutExercise(weID, owner, { active });
  if (old.isReplaced) fail('El entrenamiento ya no admite nuevas series.');
  const ex = exercise(exerciseID);
  if (!ex) fail('El ejercicio ya no está disponible.');
  return store.batch(() => {
    const done = setsOf(weID).length;
    const next = snapshotOf(ex, old.sessionID, { order: old.order, sets: Math.max(1, old.targetSets - done), repsMin: old.repsMin, repsMax: old.repsMax, restSeconds: old.restSeconds, note: old.note });
    if (!done) store.remove('workoutExercises', weID);
    else {
      store.update('workoutExercises', weID, { isReplaced: true });
      for (const e of sessionExercises(old.sessionID)) if (e.id !== weID && e.order > old.order) store.update('workoutExercises', e.id, { order: e.order + 1 });
      next.order = old.order + 1;
    }
    return store.put('workoutExercises', next);
  });
}
/** Día de la rutina del que salió la sesión (por nombre, porque la sesión guarda una copia). */
export function routineDayOf(session) {
  const routine = session && store.get('routines', session.routineID);
  return routine ? days(routine.id).find((d) => d.name === session.dayNameSnapshot) ?? null : null;
}
/** Añade un ejercicio al entrenamiento en curso (al final o después de `afterOrder`); opcionalmente también a la rutina. */
export function addExerciseToSession(sessionID, owner, exerciseID, prescription, { afterOrder = null, alsoRoutine = false } = {}) {
  const session = requireSession(sessionID, owner);
  const ex = exercise(exerciseID);
  if (!ex) fail('El ejercicio ya no está disponible.');
  if (!validPrescription(prescription)) fail('Revisa series y repeticiones.');
  return store.batch(() => {
    const list = sessionExercises(sessionID);
    const order = afterOrder == null ? Math.max(-1, ...list.map((e) => e.order)) + 1 : afterOrder + 1;
    for (const e of list) if (e.order >= order) store.update('workoutExercises', e.id, { order: e.order + 1 });
    const we = store.put('workoutExercises', snapshotOf(ex, sessionID, { ...prescription, order, restSeconds: null, note: '' }));
    const day = alsoRoutine ? routineDayOf(session) : null;
    if (day && store.get('routines', day.routineID)?.profileID === owner) addEntry(day.id, owner, ex.id, prescription);
    return we;
  });
}
/** Quita de la sesión en curso un ejercicio que todavía no tiene series. */
export function removeFromSession(weID, owner) {
  const we = requireWorkoutExercise(weID, owner);
  if (setsOf(weID).length) fail('Este ejercicio ya tiene series registradas; elimínalas primero.');
  store.batch(() => {
    store.remove('workoutExercises', weID);
    sessionExercises(we.sessionID).forEach((e, i) => e.order !== i && store.update('workoutExercises', e.id, { order: i }));
  });
}
export function finishWorkout(sessionID, owner, cancelled = false) {
  requireSession(sessionID, owner);
  store.update('sessions', sessionID, { status: cancelled ? 'cancelled' : 'completed', endedAt: Date.now() });
}

// ---------- Historial (edición explícita) ----------
export function addSetToHistory(weID, owner, weight, reps, unit) {
  const we = requireWorkoutExercise(weID, owner, { active: false });
  validateValues(weight, reps, we.loadType);
  return store.put('sets', recordFrom(we, setsOf(weID).length + 1, weight, reps, unit));
}
/** Sin prescripción histórica inventada (targetSets = 0), como en la app iOS. */
export function addExerciseToHistory(sessionID, owner, exerciseID) {
  requireSession(sessionID, owner, { active: false });
  const order = Math.max(-1, ...sessionExercises(sessionID).map((e) => e.order)) + 1;
  return store.put('workoutExercises', snapshotOf(exercise(exerciseID), sessionID, { order, sets: 0, repsMin: 8, repsMax: 12, restSeconds: null, note: '' }));
}
export function deleteWorkoutExercise(weID, owner) {
  const we = requireWorkoutExercise(weID, owner, { active: false });
  store.batch(() => {
    for (const s of setsOf(weID)) store.remove('sets', s.id);
    store.remove('workoutExercises', weID);
    sessionExercises(we.sessionID).forEach((e, i) => e.order !== i && store.update('workoutExercises', e.id, { order: i }));
  });
}
export function updateSessionDates(sessionID, owner, startedAt, endedAt) {
  const s = requireSession(sessionID, owner, { active: false });
  if (!(Number.isFinite(startedAt) && (s.status === 'active' || (Number.isFinite(endedAt) && endedAt >= startedAt))))
    fail('La hora de fin debe ser posterior al inicio.');
  store.update('sessions', sessionID, { startedAt, endedAt: s.status === 'active' ? null : endedAt });
}
export function deleteSession(sessionID, owner) {
  requireSession(sessionID, owner, { active: false });
  store.batch(() => {
    for (const we of sessionExercises(sessionID)) {
      for (const s of setsOf(we.id)) store.remove('sets', s.id);
      store.remove('workoutExercises', we.id);
    }
    store.remove('sessions', sessionID);
  });
}

// ---------- Referencia «la última vez» ----------
/**
 * Últimas series registradas de este ejercicio (cualquier configuración), sin contar la sesión en curso.
 * Es solo una referencia para el usuario: las sugerencias automáticas siguen exigiendo la misma configuración.
 */
export function lastPerformance(owner, exerciseID, excludeSessionID = null) {
  if (!exerciseID) return null;
  for (const s of sessions(owner)) {
    if (s.id === excludeSessionID || s.status === 'active') continue;
    const done = sessionExercises(s.id).filter((we) => we.originalExerciseID === exerciseID && setsOf(we.id).length);
    const we = done[done.length - 1];
    if (we) return { date: s.startedAt, loadType: we.loadType, sets: setsOf(we.id) };
  }
  return null;
}
/** Textos «Peso anterior» y «Repeticiones anteriores», con el peso en `unit`. */
export function lastPerformanceText(last, unit) {
  if (!last) return null;
  const weights = last.sets.map((s) => (D.isUnit(s.unit) ? D.convert(s.weight, s.unit, unit) : s.weight));
  const same = weights.every((w) => Math.abs(w - weights[0]) < 0.05);
  const prefix = last.loadType === 'bodyweightPlusLoad' ? '+' : '';
  const suffix = last.loadType === 'dumbbellPerHand' ? ' por mancuerna' : last.loadType === 'assisted' ? ' de asistencia' : '';
  return {
    weight: D.zeroLoad(last.loadType) ? null
      : `${prefix}${same ? D.display(weights[0]) : weights.map((w) => D.display(w)).join(' / ')} ${unit}${suffix}`,
    reps: last.sets.map((s) => s.reps).join(' / '),
    date: D.formatDate(last.date, { day: 'numeric', month: 'long' }),
    weights,
    // Equivalencia solo informativa en la otra unidad (p. ej. «= 36,3 kg»); nunca cambia lo registrado.
    converted: D.zeroLoad(last.loadType) || !D.isUnit(unit) || !same ? null
      : `= ${D.display(Math.round(D.convert(weights[0], unit, unit === 'kg' ? 'lb' : 'kg') * 10) / 10)} ${unit === 'kg' ? 'lb' : 'kg'}`,
  };
}

// ---------- Sugerencias ----------
/** Última sesión completada con la misma identidad y semántica. Nunca combina snapshots distintos. */
export function previousWorkout(owner, key, exerciseID) {
  if (!exerciseID || key.identity !== `exercise:${exerciseID}`) return null;
  const unit = unitFor(owner, exerciseID);
  const target = D.keyId(key);
  const completed = sessions(owner).filter((s) => s.status === 'completed')
    .sort((a, b) => (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt) || (a.id < b.id ? -1 : 1));
  for (const session of completed) {
    for (const candidate of sessionExercises(session.id).reverse()) {
      if (D.keyId(D.snapshotKey(candidate)) !== target) continue;
      const records = setsOf(candidate.id);
      if (!records.length || !records.every((r) => D.keyId(D.snapshotKey(candidate, r)) === target)) continue;
      return { sessionID: session.id, date: session.startedAt, targetSets: candidate.targetSets,
        sets: records.map((r) => ({ weight: D.convert(r.weight, r.unit, unit), reps: r.reps, unit })) };
    }
  }
  return null;
}
export function progressionFor(owner, we) {
  const source = we.originalExerciseID ? previousWorkout(owner, D.snapshotKey(we), we.originalExerciseID) : null;
  return D.evaluateProgression({ target: we.targetSets, min: we.repsMin, max: we.repsMax, load: we.loadType,
    unilateral: we.isUnilateral, equipment: we.equipment, source,
    preferredIncrement: incrementFor(owner, we.originalExerciseID, we.loadType, we.equipment, we.isUnilateral) });
}
/** Sugerencia con la prescripción actual de la rutina activa (para la ficha del ejercicio). */
export function progressionForKey(owner, key) {
  const routine = activeRoutine(owner);
  if (!routine) return null;
  for (const day of days(routine.id)) {
    for (const entry of dayEntries(day.id)) {
      const ex = exercise(entry.exerciseID);
      if (!ex || D.keyId(D.libraryKey(ex)) !== D.keyId(D.inUnit(key, 'kg'))) continue;
      const source = previousWorkout(owner, D.inUnit(key, 'kg'), ex.id);
      return [day.name, D.evaluateProgression({ target: entry.sets, min: entry.repsMin, max: entry.repsMax, load: ex.loadType,
        unilateral: ex.isUnilateral, equipment: ex.equipment, source,
        preferredIncrement: incrementFor(owner, ex.id, ex.loadType, ex.equipment, ex.isUnilateral) })];
    }
  }
  return null;
}

// ---------- Progreso ----------
function progressSessions(owner, extra = []) {
  return [...sessions(owner), ...extra].map((s) => ({
    id: s.id, date: s.startedAt, endedAt: s.endedAt, status: s.status,
    sets: sessionExercises(s.id).flatMap((we) => setsOf(we.id).map((r) => ({
      id: r.id, sessionID: s.id, date: s.startedAt, confirmedAt: r.confirmedAt, key: D.snapshotKey(we, r), name: we.name,
      weight: D.isUnit(r.unit) ? D.convert(r.weight, r.unit, 'kg') : r.weight, reps: r.reps, order: r.order,
    }))),
  }));
}
const progressCache = new Map();
/** Progreso del perfil en una unidad (por defecto la del perfil); se recalcula solo si cambian los datos. */
function progressIn(owner, unit) {
  const cacheKey = `${owner}@${unit}`;
  const hit = progressCache.get(cacheKey);
  if (hit?.revision === store.revision) return hit.value;
  const value = D.buildProgress(progressSessions(owner), unit);
  progressCache.set(cacheKey, { revision: store.revision, value });
  return value;
}
export const progress = (owner) => progressIn(owner, unitFor(owner, null));

/** Días con entrenamiento completado (inicio del día local, ms). */
export function trainingDays(owner) {
  const days = new Set();
  for (const s of sessions(owner)) {
    if (s.status !== 'completed') continue;
    const d = new Date(s.startedAt); d.setHours(0, 0, 0, 0);
    days.add(d.getTime());
  }
  return days;
}
/** Semanas seguidas (hasta la actual o la anterior) con al menos un entrenamiento completado. */
export function weekStreak(owner) {
  const weeks = new Set([...trainingDays(owner)].map((d) => D.startOfWeek(d)));
  let week = D.startOfWeek(Date.now());
  if (!weeks.has(week)) week = D.startOfWeek(week - 3 * 864e5);
  let streak = 0;
  while (weeks.has(week)) { streak += 1; week = D.startOfWeek(week - 3 * 864e5); }
  return streak;
}

/** Historial del perfil como CSV para Excel en español (separador «;», decimales con coma). */
export function historyCSV(owner) {
  const cell = (v) => { const t = String(v ?? ''); return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const num = (v) => String(Math.round(v * 100) / 100).replace('.', ',');
  const STATUS = { completed: 'Completado', cancelled: 'Cancelado', active: 'En curso' };
  const rows = [['Fecha', 'Hora', 'Entrenamiento', 'Estado', 'Ejercicio', 'Serie', 'Peso', 'Unidad', 'Reps', 'Tipo de carga', 'Equipo', 'Reps por lado']];
  for (const s of [...sessions(owner)].reverse()) {
    const start = new Date(s.startedAt);
    for (const we of sessionExercises(s.id)) {
      for (const r of setsOf(we.id)) {
        rows.push([start.toLocaleDateString('es'), start.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }), s.dayNameSnapshot,
          STATUS[s.status], we.name, r.order, num(r.weight), r.unit, r.reps, D.LOAD_TYPES[r.loadType] ?? r.loadType, r.equipment, r.isUnilateral ? 'Sí' : 'No']);
      }
    }
  }
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
}
/** ¿La serie recién confirmada es un PR? Compara con el historial completado + la sesión activa. */
export function recordFeedback(owner, setID) {
  const record = store.get('sets', setID);
  const we = record && store.get('workoutExercises', record.exerciseID);
  const session = we && store.get('sessions', we.sessionID);
  if (!session || session.profileID !== owner || session.status !== 'active') return [];
  const history = progress(owner).groups.flatMap((g) => g.sets);
  const current = progressSessions(owner).find((s) => s.id === session.id).sets;
  return D.recordEvents([...history, ...current], D.isUnit(record.unit) ? record.unit : 'kg').filter((r) => r.set.id === setID);
}

// ---------- Cuerpo ----------
export const measurements = (owner) => store.all('measurements').filter((m) => m.profileID === owner).sort((a, b) => b.recordedAt - a.recordedAt);
export function saveMeasurement(owner, id, recordedAt, values) {
  if (!profile(owner)) fail(OWNERSHIP);
  if (id && store.get('measurements', id)?.profileID !== owner) fail(OWNERSHIP);
  const entries = Object.entries(values).filter(([, v]) => v != null);
  if (!entries.length) fail('Introduce al menos una medida.');
  if (entries.some(([, v]) => !(Number.isFinite(v) && v > 0))) fail('Las medidas deben ser números positivos.');
  const base = Object.fromEntries(Object.keys(D.BODY_METRICS).map((k) => [k, null]));
  store.put('measurements', { ...base, ...Object.fromEntries(entries), id: id ?? newId(), profileID: owner, recordedAt });
}
export function deleteMeasurement(owner, id) {
  if (store.get('measurements', id)?.profileID !== owner) fail(OWNERSHIP);
  store.remove('measurements', id);
}
export const photos = (owner) => store.all('photos').filter((p) => p.profileID === owner).sort((a, b) => b.capturedAt - a.capturedAt);
export async function addPhoto(owner, blob, capturedAt, category) {
  if (!profile(owner)) fail(OWNERSHIP);
  const id = newId();
  await store.saveBlob(id, blob);
  return store.put('photos', { id, profileID: owner, createdAt: Date.now(), capturedAt, type: 'progressPhoto', category });
}
export async function deletePhoto(owner, id) {
  if (store.get('photos', id)?.profileID !== owner) fail(OWNERSHIP);
  await store.deleteBlob(id);
  store.remove('photos', id);
}

/** Registro rápido de peso corporal (en `unit`); si ya hay medidas de hoy, solo actualiza el peso. */
export function logBodyWeight(owner, value, unit) {
  if (!(Number.isFinite(value) && value > 0)) fail('Escribe tu peso.');
  const kg = D.convert(value, D.isUnit(unit) ? unit : 'kg', 'kg');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const existing = measurements(owner).find((m) => m.recordedAt >= today.getTime());
  if (existing) {
    const values = Object.fromEntries(Object.keys(D.BODY_METRICS).map((k) => [k, existing[k]]));
    saveMeasurement(owner, existing.id, existing.recordedAt, { ...values, bodyWeight: kg });
  } else saveMeasurement(owner, null, Date.now(), { bodyWeight: kg });
}
/** Último peso corporal y su cambio frente al registro más cercano a 30 días antes (todo en kg). */
export function bodyWeightTrend(owner) {
  const list = measurements(owner).filter((m) => m.bodyWeight != null);
  if (!list.length) return null;
  const latest = list[0];
  const ref = list.find((m) => m.recordedAt <= latest.recordedAt - 25 * 864e5) ?? list[list.length - 1];
  return { latest, change: ref !== latest ? latest.bodyWeight - ref.bodyWeight : null, since: ref.recordedAt };
}

// ---------- Meta semanal y notas ----------
export function setWeeklyGoal(owner, goal) {
  if (goal != null && !(Number.isInteger(goal) && goal >= 1 && goal <= 7)) fail('Elige entre 1 y 7 entrenamientos.');
  store.update('profiles', owner, { weeklyGoal: goal });
}
/** Entrenamientos completados esta semana (lunes a domingo) frente a la meta del perfil. */
export function weekProgress(owner) {
  const start = D.startOfWeek(Date.now());
  const done = sessions(owner).filter((s) => s.status === 'completed' && s.startedAt >= start).length;
  return { done, goal: profile(owner)?.weeklyGoal ?? null };
}
export const MOODS = { tired: '😴 Cansado', normal: '🙂 Normal', strong: '💪 Con energía', pain: '🤕 Molestia' };
/** Nota y ánimo del entrenamiento (en curso o ya terminado). */
export function setSessionNote(sessionID, owner, { mood, note }) {
  requireSession(sessionID, owner, { active: false });
  if (mood != null && !MOODS[mood]) fail('Elige cómo te sentiste.');
  store.update('sessions', sessionID, { mood: mood ?? null, note: trimmed(note) || null });
}

// ---------- Tipo de carga pendiente ----------
const LOAD_HINTS = {
  'press inclinado': ['totalWeight', 'Barra'], 'pec fly': ['machine', 'Máquina'], 'press banca': ['totalWeight', 'Barra'],
  'curl predicador': ['totalWeight', 'Barra Z'], squat: ['totalWeight', 'Barra'], 'romanian deadlift': ['totalWeight', 'Barra'],
  'standing calf raise': ['machine', 'Máquina'], 'shoulder press': ['machine', 'Máquina'], shrugs: ['dumbbellPerHand', 'Mancuernas'],
};
/** Ejercicios de la biblioteca que aún no tienen tipo de carga. */
export const exercisesWithoutLoad = () => exercises().filter((e) => e.loadType === 'unspecified');
/** Tipo de carga probable, para preseleccionarlo (el usuario lo confirma). */
export function suggestedLoad(ex) {
  const hint = LOAD_HINTS[D.normalizedName(ex.name)];
  if (hint) return { loadType: hint[0], equipment: hint[1] };
  const text = D.normalizedName(`${ex.name} ${ex.equipment}`);
  if (/mancuerna|dumbbell/.test(text)) return { loadType: 'dumbbellPerHand', equipment: 'Mancuernas' };
  if (/polea|cable/.test(text)) return { loadType: 'cable', equipment: 'Polea' };
  if (/maquina|machine|smith|prensa/.test(text)) return { loadType: 'machine', equipment: 'Máquina' };
  if (/barra|barbell/.test(text)) return { loadType: 'totalWeight', equipment: 'Barra' };
  return null;
}
/** Asigna el tipo de carga (y el equipo si no tenía). Solo afecta a entrenamientos futuros. */
export function setExerciseLoad(exerciseID, loadType, equipment) {
  const ex = exercise(exerciseID);
  if (!ex || !D.LOAD_TYPES[loadType]) fail('Elige un tipo de carga.');
  saveExercise({ ...ex, loadType, equipment: ex.equipment && ex.equipment !== 'Sin especificar' ? ex.equipment : equipment ?? ex.equipment });
}

// ---------- Actividad de la familia ----------
/** Entrenamientos terminados y récords de todos los perfiles en los últimos `days` días, del más reciente. */
export function familyActivity(days = 7) {
  const since = Date.now() - days * 864e5;
  const events = [];
  for (const p of profiles()) {
    for (const s of sessions(p.id)) {
      if (s.status !== 'completed' || (s.endedAt ?? s.startedAt) < since) continue;
      const sets = sessionExercises(s.id).reduce((a, we) => a + setsOf(we.id).length, 0);
      events.push({ id: `w-${s.id}`, kind: 'workout', profile: p, date: s.endedAt ?? s.startedAt, mood: s.mood,
        title: `terminó ${s.dayNameSnapshot}`, detail: `${sets} series${s.endedAt ? ` · ${D.formatDuration(s.endedAt - s.startedAt)}` : ''}` });
    }
    const seen = new Set();
    const data = progress(p.id);
    // La primera vez que se hace un ejercicio no cuenta como récord para el resumen familiar.
    const firsts = new Set(data.groups.map((g) => `${g.id}|${g.sets[0]?.sessionID}`));
    for (const r of data.records) {
      const key = `${D.keyId(r.set.key)}|${r.set.sessionID}`;
      if (r.metric !== 'load' || r.set.date < since || firsts.has(key)) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({ id: `r-${r.set.id}`, kind: 'record', profile: p, date: r.set.confirmedAt, title: `nuevo récord en ${r.set.name}`, detail: D.setProgressLabel(r.set) });
    }
  }
  return events.sort((a, b) => b.date - a.date);
}

// ---------- Inicio ----------
/** Biblioteca compartida inicial y perfiles, solo cuando no existe ningún dato. */
export function seedStart(names) {
  store.batch(() => {
    if (!store.all('exercises').length) {
      D.SEED_LIBRARY.forEach(([name, primaryMuscle, equipment, loadType], i) => store.put('exercises', {
        id: newId(), name, primaryMuscle, equipment, loadType, isUnilateral: false, instructionsText: '', aliasesText: '',
        createdAt: Date.now(), seedKey: `library-v1-${i}`,
      }));
    }
    names.filter((n) => trimmed(n)).forEach((n) => createProfile(n));
  });
}
