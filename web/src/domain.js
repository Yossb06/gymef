// Reglas puras portadas de la app iOS (Models/, Services/). Sin acceso a almacenamiento.

export const LOAD_TYPES = {
  unspecified: 'Sin especificar', totalWeight: 'Peso total', dumbbellPerHand: 'Peso por mancuerna',
  machine: 'Máquina', cable: 'Polea', bodyweight: 'Peso corporal',
  bodyweightPlusLoad: 'Peso corporal + lastre', assisted: 'Asistido', noExternalLoad: 'Sin carga externa',
};
export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const zeroLoad = (load) => load === 'bodyweight' || load === 'noExternalLoad';
export const isUnit = (u) => u === 'kg' || u === 'lb';

// ---------- Unidades ----------
const LB_PER_KG = 2.2046226218;
export function convert(value, from, to) {
  if (from === to || !isUnit(from) || !isUnit(to)) return value;
  return from === 'kg' ? value * LB_PER_KG : value / LB_PER_KG;
}
const displayFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });
export const display = (v) => displayFormat.format(v);
/** Valor para un campo de texto editable: hasta 2 decimales, con coma. */
export const inputNumber = (v) => String(Math.round(v * 100) / 100).replace('.', ',');
export function parseNumber(text) {
  const t = String(text ?? '').trim().replace(',', '.');
  if (t === '' || !/^-?\d*\.?\d*$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
export const resolveUnit = (profile, pref) =>
  (isUnit(pref?.preferredLoadUnit) && pref.preferredLoadUnit) || (isUnit(profile?.defaultLoadUnitRaw) && profile.defaultLoadUnitRaw) || 'kg';

export function setLabel({ weight, reps, unit }, load) {
  switch (load) {
    case 'bodyweight': case 'noExternalLoad': return `${reps} reps`;
    case 'dumbbellPerHand': return `${display(weight)} ${unit}/mancuerna × ${reps}`;
    case 'bodyweightPlusLoad': return `+${display(weight)} ${unit} × ${reps}`;
    case 'assisted': return `${display(weight)} ${unit} asistencia × ${reps}`;
    default: return `${display(weight)} ${unit} × ${reps}`;
  }
}
export function recordLabel(r) {
  if (zeroLoad(r.loadType)) return `${r.reps} reps`;
  const suffix = r.loadType === 'dumbbellPerHand' ? ' por mancuerna' : r.loadType === 'assisted' ? ' de asistencia' : '';
  return `${r.loadType === 'bodyweightPlusLoad' ? '+' : ''}${display(r.weight)} ${r.unit}${suffix} × ${r.reps}`;
}
export function validateSet(weightText, repsText, load) {
  const w = parseNumber(weightText);
  if (w === null || w < 0) return 'Introduce un peso válido de 0 o más.';
  if (zeroLoad(load) && w !== 0) return 'Este ejercicio no utiliza carga externa.';
  const r = Number(repsText);
  if (!Number.isInteger(r) || r <= 0) return 'Introduce al menos una repetición.';
  return null;
}
export const normalizedName = (s) => s.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function matchesSearch(ex, search) {
  const text = normalizedName([ex.name, ex.aliasesText, ex.primaryMuscle, ex.equipment].join(' '));
  return normalizedName(search).split(/\s+/).filter(Boolean).every((t) => text.includes(t));
}

// ---------- Identidad de progreso (ProgressKey) ----------
export function snapshotKey(we, record) {
  return {
    identity: we.originalExerciseID ? `exercise:${we.originalExerciseID}` : `snapshot:${we.id}`,
    loadType: record?.loadType ?? we.loadType,
    equipment: record?.equipment ?? we.equipment,
    unit: record ? (isUnit(record.unit) ? 'kg' : record.unit) : 'kg',
    unilateral: record?.isUnilateral ?? we.isUnilateral,
    repsConvention: record?.repsConvention ?? (we.isUnilateral ? 'perSide' : 'total'),
  };
}
export const libraryKey = (ex) => ({
  identity: `exercise:${ex.id}`, loadType: ex.loadType, equipment: ex.equipment, unit: 'kg',
  unilateral: ex.isUnilateral, repsConvention: ex.isUnilateral ? 'perSide' : 'total',
});
export const keyId = (k) => [k.identity, k.loadType, k.equipment, k.unit, k.unilateral, k.repsConvention].join('\u0001');
export const inUnit = (k, unit) => ({ ...k, unit });
const hasLoadMetric = (k) => !['bodyweight', 'noExternalLoad', 'unspecified'].includes(k.loadType);
const hasLoadRecord = (k) => hasLoadMetric(k) && k.loadType !== 'assisted';
const canEstimate = (k) => ['totalWeight', 'dumbbellPerHand'].includes(k.loadType) && isUnit(k.unit) && !k.unilateral && k.repsConvention === 'total';
export function keyLoadLabel(k) {
  switch (k.loadType) {
    case 'dumbbellPerHand': return `${k.unit} por mancuerna`;
    case 'assisted': return `${k.unit} de asistencia`;
    case 'bodyweightPlusLoad': return `${k.unit} de lastre`;
    default: return k.unit;
  }
}
export const keyConfigLabel = (k) => `${LOAD_TYPES[k.loadType] ?? k.loadType} · ${k.equipment}${k.unilateral ? ' · Reps por lado' : ''}`;

// ---------- Preferencias ----------
export function incrementConfiguration(load, equipment, unilateral) {
  return `${load}|${unilateral}|${new TextEncoder().encode(equipment).length}:${equipment}`;
}

// ---------- Progresión asistida (ProgressionService.evaluate) ----------
const sameWeight = (a, b) => Math.abs(a - b) <= Math.max(1e-8, Math.abs(b) * 1e-10);
export const suggestionMatches = (a, b) => a.unit === b.unit && a.reps === b.reps && Math.abs(a.weight - b.weight) <= Math.max(1e-8, Math.abs(a.weight) * 1e-10);

export function evaluateProgression({ target, min: lower, max: upper, load, unilateral, equipment, source, preferredIncrement }) {
  const range = [Math.max(1, lower), Math.max(Math.max(1, lower), upper)];
  const main = (source?.sets ?? []).slice(0, Math.max(0, Math.min(target, source?.targetSets ?? target)));
  const result = (kind, explanation, sets = main) => ({ kind, load, source, sets, explanation, range });
  if (!(target > 0 && lower > 0 && upper >= lower)) return result('historyOnly', 'Revisa la prescripción antes de usar una sugerencia.', []);
  if (!main.length) return result('noHistory', 'Sin una sesión completada comparable. Registra tus valores dentro del rango objetivo.', []);
  if (!main.every((s) => Number.isFinite(s.weight) && s.weight >= 0 && s.reps > 0) || (zeroLoad(load) && !main.every((s) => s.weight === 0)))
    return result('historyOnly', 'El historial no contiene valores utilizables para sugerir una progresión.', []);
  if (load === 'assisted' || load === 'unspecified')
    return result('historyOnly', load === 'assisted'
      ? 'La asistencia no equivale a carga levantada. Revisa tus series anteriores y decide los valores.'
      : 'La semántica de carga no está definida; solo se muestran valores anteriores.');
  if (main.length !== target) return result('incomplete', 'La última sesión tiene menos series que el objetivo actual. Completa primero la prescripción.');
  if (!main.every((s) => sameWeight(s.weight, main[0].weight) && s.unit === main[0].unit))
    return result('mixedLoads', 'Usaste cargas diferentes. Conserva cada serie como referencia; no se sugiere subir carga.');
  if (main.some((s) => s.reps < lower))
    return result('belowRange', 'Intenta completar primero el rango objetivo. Mantén la carga como referencia.',
      main.map((s) => ({ ...s, reps: Math.max(lower, s.reps) })));
  if (main.every((s) => s.reps >= upper)) {
    if (zeroLoad(load)) return result('repsComplete', 'Completaste el rango de repeticiones. Mantén ese objetivo; no se añade carga externa.');
    if (unilateral || !equipment.trim() || equipment === 'Sin especificar')
      return result('historyOnly', 'Rango completado. La lateralidad o configuración requiere revisión antes de aumentar carga.');
    const inc = preferredIncrement;
    if (Number.isFinite(inc) && inc > 0 && main[0].weight + inc > main[0].weight)
      return result('increaseWithPreference',
        `Completaste el rango objetivo con ${setLabel(main[0], load)}. Incremento personal: ${display(inc)} ${main[0].unit}; vuelve a ${lower} reps. Tú decides.`,
        main.map((s) => ({ ...s, weight: s.weight + inc, reps: lower })));
    return result('increaseCandidate', 'Todas las series objetivo alcanzaron el máximo con la misma carga. No hay incremento personal definido: tú decides si aumentas.');
  }
  if (!main.every((s) => s.reps >= range[0] && s.reps <= range[1]))
    return result('historyOnly', 'Las repeticiones no siguen un rango uniforme. Usa el historial como referencia.');
  const next = main.map((s) => ({ ...s }));
  const i = next.findIndex((s) => s.reps < upper);
  next[i].reps += 1;
  const achieved = main.filter((s) => s.reps === upper).length;
  return result('addRep', `${achieved} de ${target} series alcanzaron ${upper} reps. Mantén la carga e intenta una repetición más en una serie.`, next);
}
export function progressionSummary(p) {
  if (!p.sets.length) return `Trabaja dentro de ${p.range[0]}–${p.range[1]} reps` + (zeroLoad(p.load) ? '.' : '; elige tu carga.');
  if (p.kind === 'increaseCandidate') return 'Rango completado · considera aumentar la carga';
  if (p.kind === 'historyOnly') return 'Historial como referencia, sin aumento sugerido';
  return p.sets.map((s) => setLabel(s, p.load)).join(' · ');
}
export function progressionCompact(p) {
  if (p.kind === 'increaseCandidate' || !p.sets.length) return progressionSummary(p);
  const first = p.sets[0];
  if (p.sets.every((s) => Math.abs(s.weight - first.weight) < 1e-6 && s.unit === first.unit)) {
    const loadLabel = zeroLoad(p.load) ? '' :
      `${p.load === 'bodyweightPlusLoad' ? '+' : ''}${display(first.weight)} ${first.unit}${p.load === 'dumbbellPerHand' ? '/mancuerna' : p.load === 'assisted' ? ' asistencia' : ''} · `;
    return `${loadLabel}${p.kind === 'historyOnly' ? 'Referencia' : 'Objetivo'} ${p.sets.map((s) => s.reps).join(' / ')}`;
  }
  return progressionSummary(p);
}
export const PROGRESSION_TITLES = {
  increaseCandidate: 'SUBIR · sugerencia', increaseWithPreference: 'SUBIR · sugerencia', addRep: 'MANTENER', mixedLoads: 'MANTENER',
  belowRange: 'COMPLETAR RANGO', incomplete: 'COMPLETAR RANGO', noHistory: 'SIN HISTORIAL', historyOnly: 'Tu referencia', repsComplete: 'Rango completado',
};
/** Respeta elecciones manuales: tras desviarse de la serie propuesta, repite los valores del usuario. */
export function prefill(p, index, lastConfirmed) {
  if (lastConfirmed) {
    if (!(index > 0 && p.sets[index - 1] && suggestionMatches(p.sets[index - 1], lastConfirmed))) return lastConfirmed;
  }
  return p.sets[index] ?? lastConfirmed ?? p.sets[p.sets.length - 1] ?? null;
}

// ---------- Volumen ----------
export function volume(values) {
  const ok = values.filter((v) => v.loadType === 'totalWeight' && !v.unilateral && v.repsConvention === 'total' &&
    isUnit(v.unit) && Number.isFinite(v.weight) && v.weight >= 0 && v.reps > 0);
  const sum = ok.reduce((a, v) => a + convert(v.weight, v.unit, 'kg') * v.reps, 0);
  return { value: ok.length && Number.isFinite(sum) ? sum : null, excluded: values.length - ok.length };
}
export const volumeLabel = (v) => v.value === null ? 'Volumen no disponible'
  : `${v.excluded === 0 ? 'Volumen total' : 'Volumen parcial'}: ${display(v.value)} kg·reps`;

// ---------- Periodos ----------
export const PERIODS = { week: 'Esta semana', fourWeeks: '4 semanas', threeMonths: '3 meses', sixMonths: '6 meses', year: '1 año', all: 'Todo' };
export function startOfWeek(now) {
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}
export function periodInterval(period, now = Date.now()) {
  const d = new Date(now);
  let start;
  switch (period) {
    case 'week': start = startOfWeek(now); break;
    case 'fourWeeks': start = now - 28 * 864e5; break;
    case 'threeMonths': start = new Date(d.getFullYear(), d.getMonth() - 3, d.getDate(), d.getHours(), d.getMinutes()).getTime(); break;
    case 'sixMonths': start = new Date(d.getFullYear(), d.getMonth() - 6, d.getDate(), d.getHours(), d.getMinutes()).getTime(); break;
    case 'year': start = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()).getTime(); break;
    default: start = -Infinity;
  }
  return { start, end: now + 1 };
}

// ---------- Progreso (ProgressService / CoreExperience) ----------
const chronological = (a, b) => a.date - b.date || a.confirmedAt - b.confirmedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const validSet = (s) => isUnit(s.key.unit) && Number.isFinite(s.weight) && s.weight >= 0 && s.reps > 0;
const exceeds = (value, prev) => value - prev > Math.max(0.000001, Math.abs(prev) * 0.000000001);
function convertSet(s, unit) {
  if (!isUnit(s.key.unit)) return null;
  return { ...s, key: { ...s.key, unit }, weight: convert(s.weight, s.key.unit, unit) };
}
export function e1rm(s) {
  if (!canEstimate(s.key) || !validSet(s) || s.weight <= 0 || s.reps < 1 || s.reps > 15) return null;
  const v = s.weight * (1 + s.reps / 30);
  return Number.isFinite(v) ? v : null;
}
export function metricValue(metric, s) {
  if (!validSet(s)) return null;
  if (metric === 'load') return hasLoadMetric(s.key) ? s.weight : null;
  if (metric === 'reps') return s.reps;
  return e1rm(s);
}
export const METRICS = { load: 'Carga', reps: 'Repeticiones', estimated1RM: '1RM estimado' };
export function setProgressLabel(s) {
  if (zeroLoad(s.key.loadType)) return `${s.reps} reps`;
  return `${s.key.loadType === 'bodyweightPlusLoad' ? '+' : ''}${display(s.weight)} ${keyLoadLabel(s.key)} × ${s.reps}`;
}

export function recordEvents(sets, unit) {
  const groups = new Map();
  for (const raw of sets) {
    const s = convertSet(raw, unit);
    if (!s || !validSet(s)) continue;
    const id = keyId(s.key);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(s);
  }
  const out = [];
  for (const samples of groups.values()) {
    samples.sort(chronological);
    for (const metric of ['load', 'estimated1RM']) {
      if (metric === 'load' && !hasLoadRecord(samples[0].key)) continue;
      let max = null;
      for (const s of samples) {
        const v = metricValue(metric, s);
        if (v === null) continue;
        if (max === null || exceeds(v, max)) { out.push({ set: s, metric, value: v }); max = v; }
      }
    }
  }
  return out.sort((a, b) => b.set.date - a.set.date || b.set.confirmedAt - a.set.confirmedAt || (a.set.id + a.metric < b.set.id + b.metric ? -1 : 1));
}

/** Instantánea de progreso de un perfil: series de sesiones completadas, en la unidad del perfil. */
export function buildProgress(sessions, unit) {
  const done = sessions.filter((s) => s.status === 'completed' && s.endedAt);
  const flat = done.flatMap((s) => s.sets.map((x) => convertSet(x, unit) ?? x));
  const groups = new Map();
  for (const s of flat) {
    const id = keyId(s.key);
    if (!groups.has(id)) groups.set(id, { key: s.key, id, sets: [] });
    groups.get(id).sets.push(s);
  }
  const list = [...groups.values()].map((g) => ({ ...g, sets: g.sets.sort(chronological), name: g.sets[g.sets.length - 1].name }));
  list.sort((a, b) => -chronological(a.sets[a.sets.length - 1], b.sets[b.sets.length - 1]));
  return { sessions: done.map((s) => ({ ...s, sets: s.sets.map((x) => convertSet(x, unit) ?? x) })), groups: list, records: recordEvents(flat, unit), unit };
}
export function overview(progress, interval) {
  const selected = progress.sessions.filter((s) => s.date >= interval.start && s.date < interval.end);
  const samples = selected.flatMap((s) => s.sets);
  const durations = selected.map((s) => s.endedAt && s.endedAt >= s.date ? s.endedAt - s.date : null).filter((d) => d !== null);
  const total = durations.reduce((a, b) => a + b, 0);
  return {
    workouts: selected.length, sets: samples.length, reps: samples.reduce((a, s) => a + Math.max(0, s.reps), 0),
    totalDuration: total, averageDuration: durations.length ? total / durations.length : null,
    volume: volume(samples.map((s) => ({ weight: s.weight, reps: s.reps, loadType: s.key.loadType, unit: s.key.unit, unilateral: s.key.unilateral, repsConvention: s.key.repsConvention }))),
  };
}
export function chartPoints(group, metric, interval) {
  const bySession = new Map();
  for (const s of group.sets) {
    if (s.date < interval.start || s.date >= interval.end) continue;
    const v = metricValue(metric, s);
    if (v === null) continue;
    if (!bySession.has(s.sessionID)) bySession.set(s.sessionID, []);
    bySession.get(s.sessionID).push({ set: s, value: v });
  }
  const points = [];
  for (const candidates of bySession.values()) {
    candidates.sort((a, b) => chronological(a.set, b.set));
    if (metric === 'load' && group.key.loadType === 'assisted') { points.push(candidates[candidates.length - 1]); continue; }
    points.push(candidates.reduce((best, p) => (!best || exceeds(p.value, best.value) ? p : best), null));
  }
  return points.sort((a, b) => a.set.date - b.set.date);
}

function visits(group, interval) {
  const by = new Map();
  for (const s of group.sets) {
    if (!validSet(s) || s.date < interval.start || s.date >= interval.end) continue;
    if (!by.has(s.sessionID)) by.set(s.sessionID, []);
    by.get(s.sessionID).push(s);
  }
  return [...by.values()].map((v) => v.sort((a, b) => a.order - b.order || chronological(a, b)))
    .sort((a, b) => a[0].date - b[0].date || (a[0].sessionID < b[0].sessionID ? -1 : 1));
}
function change(kind, before, after, context) {
  const delta = after - before;
  const signed = delta > 0 ? '+' : '';
  const pct = kind === 'estimated1RM' && before > 0 ? ` (${signed}${display((delta / before) * 100)} %)` : '';
  return { kind, before, after, delta, improving: exceeds(after, before), label: `${display(before)} → ${display(after)} · ${signed}${display(delta)} ${context}${pct}` };
}
const close = (a, b) => Math.abs(a - b) < 0.000001;
const maxOf = (xs) => Math.max(...xs);
function compare(before, after, key) {
  const none = { changes: [], summary: 'Sesiones no directamente comparables.' };
  if (!before.length || !after.length || ['assisted', 'unspecified'].includes(key.loadType)) return none;
  const repsOnly = zeroLoad(key.loadType);
  const changes = [];
  if (repsOnly) {
    changes.push(change('reps', maxOf(before.map((s) => s.reps)), maxOf(after.map((s) => s.reps)), 'reps por serie'));
  } else {
    const afterReps = new Set(after.map((s) => s.reps));
    const common = [...new Set(before.map((s) => s.reps))].filter((r) => afterReps.has(r)).sort((a, b) => a - b);
    const loads = common.map((r) => change('load', maxOf(before.filter((s) => s.reps === r).map((s) => s.weight)),
      maxOf(after.filter((s) => s.reps === r).map((s) => s.weight)), `${keyLoadLabel(key)} a ${r} reps`));
    if (loads.length) changes.push(loads.reduce((a, b) => (b.delta > a.delta ? b : a)));
    const reps = [...new Set(before.map((s) => s.weight))].sort((a, b) => a - b).map((w) => {
      const last = after.filter((s) => close(s.weight, w));
      if (!last.length) return null;
      return change('reps', maxOf(before.filter((s) => close(s.weight, w)).map((s) => s.reps)), maxOf(last.map((s) => s.reps)), `reps con ${display(w)} ${keyLoadLabel(key)}`);
    }).filter(Boolean);
    if (reps.length) changes.push(reps.reduce((a, b) => (b.delta > a.delta ? b : a)));
    const e1 = before.map(e1rm).filter((v) => v !== null), e2 = after.map(e1rm).filter((v) => v !== null);
    if (e1.length && e2.length) changes.push(change('estimated1RM', maxOf(e1), maxOf(e2), `${keyLoadLabel(key)} · 1RM estimado`));
  }
  const uniformB = before.every((s) => close(s.weight, before[0].weight));
  const uniformA = after.every((s) => close(s.weight, after[0].weight));
  if (before.length === after.length && uniformA && uniformB) {
    if (repsOnly || close(before[0].weight, after[0].weight)) {
      const c = change('totalReps', before.reduce((a, s) => a + s.reps, 0), after.reduce((a, s) => a + s.reps, 0),
        'reps totales' + (repsOnly ? '' : ` con ${display(before[0].weight)} ${keyLoadLabel(key)}`));
      changes.push(c);
      return { changes, summary: c.label };
    }
    const c = change('load', before[0].weight, after[0].weight, keyLoadLabel(key));
    const note = before.map((s) => s.reps).join() === after.map((s) => s.reps).join() ? '' : ' · repeticiones distintas';
    return { changes, summary: c.label + note };
  }
  return { changes, summary: changes[0]?.label ?? none.summary };
}
const shortDate = (t) => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
export const TREND_TITLES = { progressing: 'Progresando', stable: 'Estable', possiblePlateau: 'Posible estancamiento', insufficientData: 'Sin datos suficientes' };
export function trend(group, interval, related) {
  const insufficient = (m = 'Necesitas al menos dos sesiones comparables.') => ({ state: 'insufficientData', explanation: m });
  if (['assisted', 'unspecified'].includes(group.key.loadType))
    return insufficient('Historial disponible; esta semántica no permite concluir una tendencia automática.');
  const v = visits(group, interval);
  if (v.length < 2) return insufficient();
  const first = v[0], last = v[v.length - 1];
  const comparison = compare(first, last, group.key);
  const dates = `${shortDate(first[0].date)} → ${shortDate(last[0].date)}`;
  const recent = v.slice(-5);
  if (recent.length === 5) {
    const baseline = recent[0];
    const kgId = keyId(inUnit(group.key, 'kg'));
    const interrupted = related.some((s) => s.key.identity === group.key.identity && s.date >= baseline[0].date &&
      s.date <= last[0].date && keyId(inUnit(s.key, 'kg')) !== kgId);
    if (interrupted) return insufficient('Hubo un cambio de configuración; no se concluye estancamiento.');
    const total = (x) => x.reduce((a, s) => a + s.reps, 0);
    const same = recent.every((x) => x.every((s) => close(s.weight, x[0].weight)) && x.length === baseline.length &&
      close(x[0].weight, baseline[0].weight) && maxOf(x.map((s) => s.reps)) === maxOf(baseline.map((s) => s.reps)) && total(x) === total(baseline));
    if (same) {
      const values = zeroLoad(group.key.loadType) ? 'la misma mejor serie y reps totales' : 'la misma carga, mejor serie y reps totales';
      return { state: 'possiblePlateau', explanation: `5 sesiones comparables con ${values}. Sin avance detectable; revisa tus objetivos.` };
    }
  }
  const up = comparison.changes.find((c) => c.improving);
  if (up) return { state: 'progressing', explanation: `${up.label} · ${dates}` };
  if (!comparison.changes.length) return insufficient('Las sesiones no son directamente comparables.');
  if (comparison.changes.every((c) => Math.abs(c.delta) <= 0.000001))
    return { state: 'stable', explanation: `Primera y última sesión similares · ${v.length} sesiones comparables · ${dates}` };
  return insufficient('Resultados diferentes, sin una mejora concluyente. Consulta las series antes de interpretar el cambio.');
}
/** Análisis de un periodo: tendencias, récords sin repetir y eventos recientes. */
export function intelligence(progress, interval) {
  const related = progress.groups.flatMap((g) => g.sets);
  const candidates = progress.records.filter((r) => r.set.date >= interval.start && r.set.date < interval.end).sort((a, b) =>
    b.set.date - a.set.date || (a.set.sessionID === b.set.sessionID && a.metric !== b.metric ? (a.metric === 'load' ? -1 : 1) : -chronological(a.set, b.set)));
  const seenRecord = new Set();
  const records = candidates.filter((r) => { const k = keyId(r.set.key) + r.set.sessionID; if (seenRecord.has(k)) return false; seenRecord.add(k); return true; });
  const analyses = progress.groups.map((g) => ({ group: g, trend: trend(g, interval, related) }));
  const seen = new Set();
  const events = [];
  for (const r of records) {
    const id = keyId(r.set.key);
    const group = progress.groups.find((g) => g.id === id);
    if (seen.has(id) || !group) continue;
    seen.add(id);
    events.push({ group, title: r.metric === 'load' ? 'Nuevo PR' : '1RM estimado', icon: '🏆',
      detail: r.metric === 'load' ? setProgressLabel(r.set) : `${display(r.value)} ${keyLoadLabel(r.set.key)} estimados`, date: r.set.date });
  }
  for (const state of ['progressing', 'possiblePlateau']) {
    for (const a of analyses) {
      if (a.trend.state !== state || seen.has(a.group.id)) continue;
      seen.add(a.group.id);
      events.push({ group: a.group, title: TREND_TITLES[state], icon: state === 'progressing' ? '↗' : '🔍', detail: a.trend.explanation, date: a.group.sets[a.group.sets.length - 1].date });
    }
  }
  return { analyses, records, events: events.slice(0, 5), overview: overview(progress, interval) };
}

// ---------- Cuerpo ----------
export const BODY_METRICS = {
  bodyWeight: 'Peso', waist: 'Cintura', chest: 'Pecho', hips: 'Cadera', leftArm: 'Brazo izquierdo', rightArm: 'Brazo derecho',
  leftThigh: 'Muslo izquierdo', rightThigh: 'Muslo derecho', leftCalf: 'Pantorrilla izquierda', rightCalf: 'Pantorrilla derecha', neck: 'Cuello',
};
export const PHOTO_CATEGORIES = { none: 'Sin categoría', front: 'Frente', back: 'Espalda', left: 'Perfil izquierdo', right: 'Perfil derecho' };

// ---------- Biblioteca inicial (RoutineSeed) ----------
export const SEED_LIBRARY = [
  ['Press inclinado', 'Pecho', 'Sin especificar', 'unspecified'], ['Pec fly', 'Pecho', 'Sin especificar', 'unspecified'],
  ['Press banca', 'Pecho', 'Sin especificar', 'unspecified'], ['Pull-up', 'Espalda', 'Barra de dominadas', 'bodyweight'],
  ['Jalón al pecho', 'Espalda', 'Polea', 'cable'], ['Cable lateral raise', 'Hombros', 'Polea', 'cable'],
  ['Dumbbell lateral raise', 'Hombros', 'Mancuernas', 'dumbbellPerHand'], ['Pendlay row', 'Espalda', 'Barra', 'totalWeight'],
  ['Cable overhead triceps extension', 'Tríceps', 'Polea', 'cable'], ['Bayesian curl', 'Bíceps', 'Polea', 'cable'],
  ['Curl predicador', 'Bíceps', 'Sin especificar', 'unspecified'], ['Lying leg curl', 'Isquiotibiales', 'Máquina', 'machine'],
  ['Squat', 'Cuádriceps', 'Sin especificar', 'unspecified'], ['Pendulum squat', 'Cuádriceps', 'Máquina', 'machine'],
  ['Hack squat', 'Cuádriceps', 'Máquina', 'machine'], ['Prensa', 'Cuádriceps', 'Máquina', 'machine'],
  ['Romanian deadlift', 'Isquiotibiales', 'Sin especificar', 'unspecified'], ['Leg extension', 'Cuádriceps', 'Máquina', 'machine'],
  ['Hip abduction', 'Abductores', 'Máquina', 'machine'], ['Standing calf raise', 'Gemelos', 'Sin especificar', 'unspecified'],
  ['Fondos', 'Pecho', 'Paralelas', 'bodyweight'], ['Shoulder press', 'Hombros', 'Sin especificar', 'unspecified'],
  ['Close-grip lat pulldown', 'Espalda', 'Polea', 'cable'], ['Chest-supported machine row', 'Espalda', 'Máquina', 'machine'],
  ['Close-grip cable row', 'Espalda', 'Polea', 'cable'], ['Reverse butterfly', 'Hombro posterior', 'Máquina', 'machine'],
  ['Shrugs', 'Trapecio', 'Sin especificar', 'unspecified'], ['Curl martillo', 'Bíceps', 'Mancuernas', 'dumbbellPerHand'],
  ['Seated leg curl', 'Isquiotibiales', 'Máquina', 'machine'], ['Smith squat', 'Cuádriceps', 'Smith', 'machine'],
  ['Hip adduction', 'Aductores', 'Máquina', 'machine'],
];

// ---------- Colores por músculo (decoración de listas) ----------
const MUSCLE_COLORS = {
  pecho: '#ef4444', espalda: '#3b82f6', hombros: '#f59e0b', 'hombro posterior': '#f97316', trapecio: '#6366f1',
  biceps: '#8b5cf6', triceps: '#d946ef', cuadriceps: '#10b981', isquiotibiales: '#14b8a6', gluteos: '#ec4899',
  gemelos: '#06b6d4', abductores: '#84cc16', aductores: '#65a30d', abdomen: '#eab308', core: '#eab308',
  pectoral: '#ef4444', femoral: '#14b8a6', 'abdomen inferior': '#eab308', dorsal: '#3b82f6', antebrazo: '#a78bfa',
};
export const muscleColor = (muscle) => MUSCLE_COLORS[normalizedName(muscle ?? '')] ?? '#8e8e93';

// ---------- Plantillas de rutina (ejercicios de la biblioteca inicial) ----------
// [nombre del día, día de la semana, [[ejercicio, series, reps mín., reps máx.], …]]
export const ROUTINE_TEMPLATES = {
  fullBody: {
    name: 'Cuerpo completo · 3 días', detail: 'Lunes, miércoles y viernes. Ideal para empezar o con poco tiempo.',
    days: [
      ['Cuerpo completo A', 'Lunes', [['Squat', 3, 6, 8], ['Press banca', 3, 6, 8], ['Jalón al pecho', 3, 8, 10], ['Shoulder press', 2, 8, 10], ['Lying leg curl', 2, 10, 12], ['Curl martillo', 2, 10, 12]]],
      ['Cuerpo completo B', 'Miércoles', [['Romanian deadlift', 3, 6, 8], ['Press inclinado', 3, 8, 10], ['Chest-supported machine row', 3, 8, 10], ['Leg extension', 2, 10, 15], ['Cable lateral raise', 2, 12, 15], ['Cable overhead triceps extension', 2, 10, 12]]],
      ['Cuerpo completo C', 'Viernes', [['Prensa', 3, 8, 12], ['Fondos', 3, 8, 12], ['Pull-up', 3, 6, 10], ['Hip abduction', 2, 12, 15], ['Bayesian curl', 2, 10, 12], ['Standing calf raise', 3, 10, 15]]],
    ],
  },
  upperLower: {
    name: 'Torso / Pierna · 4 días', detail: 'Lunes, martes, jueves y viernes. Equilibrio entre volumen y descanso.',
    days: [
      ['Torso A', 'Lunes', [['Press banca', 3, 6, 8], ['Jalón al pecho', 3, 8, 10], ['Shoulder press', 2, 8, 10], ['Close-grip cable row', 3, 8, 12], ['Bayesian curl', 2, 10, 12], ['Cable overhead triceps extension', 2, 10, 12]]],
      ['Pierna A', 'Martes', [['Squat', 3, 6, 8], ['Romanian deadlift', 3, 8, 10], ['Leg extension', 2, 10, 15], ['Lying leg curl', 2, 10, 12], ['Standing calf raise', 3, 10, 15]]],
      ['Torso B', 'Jueves', [['Press inclinado', 3, 8, 10], ['Pull-up', 3, 6, 10], ['Pec fly', 2, 12, 15], ['Chest-supported machine row', 3, 8, 12], ['Dumbbell lateral raise', 3, 12, 15], ['Curl martillo', 2, 10, 12]]],
      ['Pierna B', 'Viernes', [['Hack squat', 3, 8, 10], ['Seated leg curl', 3, 10, 12], ['Prensa', 2, 10, 15], ['Hip abduction', 2, 12, 15], ['Hip adduction', 2, 12, 15], ['Standing calf raise', 3, 10, 15]]],
    ],
  },
  pushPullLegs: {
    name: 'Empuje / Jalón / Pierna · 3 días', detail: 'Lunes, miércoles y viernes. Cada grupo muscular una vez por semana.',
    days: [
      ['Empuje', 'Lunes', [['Press banca', 3, 6, 8], ['Press inclinado', 3, 8, 10], ['Shoulder press', 3, 8, 10], ['Cable lateral raise', 3, 12, 15], ['Fondos', 2, 8, 12], ['Cable overhead triceps extension', 3, 10, 12]]],
      ['Jalón', 'Miércoles', [['Pull-up', 3, 6, 10], ['Pendlay row', 3, 6, 8], ['Close-grip lat pulldown', 3, 10, 12], ['Reverse butterfly', 3, 12, 15], ['Bayesian curl', 3, 10, 12], ['Shrugs', 3, 10, 15]]],
      ['Pierna', 'Viernes', [['Squat', 3, 6, 8], ['Romanian deadlift', 3, 8, 10], ['Prensa', 3, 10, 12], ['Leg extension', 2, 12, 15], ['Lying leg curl', 3, 10, 12], ['Standing calf raise', 4, 10, 15]]],
    ],
  },
};

export const formatDuration = (ms) => `${Math.floor(Math.max(0, ms) / 60000)} min`;
export const formatDate = (t, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(t).toLocaleDateString('es', opts);
export const formatTime = (t) => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
