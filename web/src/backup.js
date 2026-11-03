// Respaldo estructurado V1, compatible con BackupStore de la app iOS (fechas en segundos Unix).
import { store, KINDS } from './store.js';
import { isUnit, zeroLoad } from './domain.js';

const SECTIONS = {
  profiles: ['createdAt'], exercises: ['createdAt'], preferences: [], routines: ['createdAt', 'archivedAt'], days: [],
  routineExercises: [], sessions: ['startedAt', 'endedAt', 'createdAt'], workoutExercises: [], sets: ['confirmedAt'], measurements: ['recordedAt'],
};
const MAX_BYTES = 32 * 1024 * 1024;

export function parseBackup(text) {
  if (text.length > MAX_BYTES) throw new Error('El respaldo supera el límite de 32 MB.');
  let raw;
  try { raw = JSON.parse(text); } catch { throw new Error('Este archivo no es un respaldo compatible con GymE&F V1.'); }
  if (raw?.format !== 'GymEF' || raw?.schemaVersion !== 1) throw new Error('Este archivo no es un respaldo compatible con GymE&F V1.');
  const b = {};
  for (const [kind, dates] of Object.entries(SECTIONS)) {
    if (!Array.isArray(raw[kind])) throw invalid();
    b[kind] = raw[kind].map((item) => {
      const out = { ...item };
      for (const field of dates) out[field] = item[field] == null ? null : item[field] * 1000;
      return out;
    });
  }
  validate(b);
  return b;
}
const invalid = () => new Error('El respaldo contiene datos inválidos, UUID duplicados o relaciones incompletas. No se ha restaurado.');

function validate(b) {
  const check = (ok) => { if (!ok) throw invalid(); };
  const ids = new Set();
  for (const kind of Object.keys(SECTIONS)) for (const v of b[kind]) { check(typeof v.id === 'string' && !ids.has(v.id)); ids.add(v.id); }
  const set = (kind) => new Set(b[kind].map((x) => x.id));
  const profiles = set('profiles'), exercises = set('exercises'), routines = set('routines'), days = set('days'), sessions = set('sessions'), wes = set('workoutExercises');
  const date = (v) => Number.isFinite(v);
  const rest = (v) => v == null || v >= 0;
  const positive = (v) => v == null || (Number.isFinite(v) && v > 0);
  const unit = (v) => v == null || isUnit(v);
  check(b.profiles.length > 0);
  for (const p of b.profiles) check(p.name && unit(p.defaultLoadUnitRaw) && date(p.createdAt));
  for (const e of b.exercises) check(e.name && date(e.createdAt));
  const pairs = new Set(), activeRoutines = new Set(), activeSessions = new Set();
  for (const p of b.preferences) {
    check(profiles.has(p.profileID) && exercises.has(p.exerciseID) && !pairs.has(`${p.profileID}/${p.exerciseID}`));
    pairs.add(`${p.profileID}/${p.exerciseID}`);
    check(unit(p.preferredLoadUnit) && unit(p.incrementUnit) && positive(p.preferredIncrement) && rest(p.preferredRestSeconds));
  }
  for (const r of b.routines) {
    check(profiles.has(r.profileID) && date(r.createdAt));
    if (r.isActive) { check(!r.archivedAt && !activeRoutines.has(r.profileID)); activeRoutines.add(r.profileID); }
  }
  for (const d of b.days) check(routines.has(d.routineID) && d.order >= 0);
  for (const e of b.routineExercises) check(days.has(e.dayID) && (e.exerciseID == null || exercises.has(e.exerciseID)) && e.order >= 0 && e.sets > 0 && e.repsMin > 0 && e.repsMax >= e.repsMin && rest(e.restSeconds));
  for (const s of b.sessions) {
    check(profiles.has(s.profileID) && date(s.startedAt) && date(s.createdAt));
    if (s.status === 'active') { check(s.endedAt == null && !activeSessions.has(s.profileID)); activeSessions.add(s.profileID); }
    else check(date(s.endedAt) && s.endedAt >= s.startedAt);
  }
  for (const e of b.workoutExercises) check(sessions.has(e.sessionID) && e.order >= 0 && e.targetSets >= 0 && e.repsMin > 0 && e.repsMax >= e.repsMin && rest(e.restSeconds));
  for (const s of b.sets) {
    check(wes.has(s.exerciseID) && s.order > 0 && s.reps > 0 && date(s.confirmedAt) && Number.isFinite(s.weight) && s.weight >= 0 && unit(s.unit));
    check((!zeroLoad(s.loadType) || s.weight === 0) && s.repsConvention === (s.isUnilateral ? 'perSide' : 'total'));
  }
  for (const m of b.measurements) check(profiles.has(m.profileID) && date(m.recordedAt));
}

/** Sustituye todos los datos de la cuenta por los del respaldo (las fotos no viajan en el respaldo). */
export function restore(b) {
  store.batch(() => {
    for (const kind of KINDS) if (kind !== 'photos') for (const r of store.all(kind)) store.remove(kind, r.id);
    for (const kind of Object.keys(SECTIONS)) for (const item of b[kind]) store.put(kind, normalize(kind, item));
  });
}
function normalize(kind, item) {
  const out = { ...item };
  if (kind === 'exercises') { out.instructionsText ??= ''; out.aliasesText ??= ''; out.seedKey ??= null; }
  if (kind === 'routineExercises') { out.restSeconds ??= null; out.note ??= ''; }
  if (kind === 'workoutExercises') { out.restSeconds ??= null; out.note ??= ''; out.originalExerciseID ??= null; }
  if (kind === 'sessions') { out.endedAt ??= null; out.routineID ??= null; }
  return out;
}

export function exportBackup() {
  const out = { format: 'GymEF', schemaVersion: 1 };
  for (const [kind, dates] of Object.entries(SECTIONS)) {
    out[kind] = store.all(kind).sort((a, b) => (a.id < b.id ? -1 : 1)).map(({ _u, ...item }) => {
      const copy = {};
      for (const [k, v] of Object.entries(item)) if (v != null) copy[k] = dates.includes(k) ? v / 1000 : v;
      return copy;
    });
  }
  return JSON.stringify(out);
}
