// Pruebas de las reglas puras, portadas de GymEFTests (ProgressionTests, ProgressTests, CoreExperienceTests).
// Abrir web/tests/index.html con el servidor local para ejecutarlas.
import * as D from '../src/domain.js';

export function run() {
  const fails = []; let n = 0;
  const eq = (a, b, msg) => { n++; if (JSON.stringify(a) !== JSON.stringify(b)) fails.push(`${msg}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
  const ok = (c, msg) => { n++; if (!c) fails.push(msg); };
  const close = (x, y) => x !== null && Math.abs(x - y) < 1e-6;

  // ---- Progresión asistida
  const result = (reps, { weights, load = 'totalWeight', unilateral = false, equipment = 'Barra', historicalTarget = 3 } = {}) => {
    const sets = reps.map((r, i) => ({ weight: weights?.[i] ?? (D.zeroLoad(load) ? 0 : 80), reps: r, unit: 'kg' }));
    return D.evaluateProgression({ target: 3, min: 6, max: 8, load, unilateral, equipment,
      source: sets.length ? { sessionID: 'x', date: 0, sets, targetSets: historicalTarget } : null });
  };
  let v = result([8, 8, 7]);
  eq(v.kind, 'addRep', 'addRep'); eq(v.sets.map((s) => s.reps), [8, 8, 8], 'addRep reps'); ok(v.explanation.includes('2 de 3'), 'addRep texto');
  eq(result([8, 7, 7]).sets.map((s) => s.reps), [8, 8, 7], 'addRep una serie');
  v = result([8, 8, 8]); eq(v.kind, 'increaseCandidate', 'subir'); ok(v.explanation.includes('tú decides'), 'subir texto');
  v = result([8, 5, 6]); eq(v.kind, 'belowRange', 'bajo rango'); eq(v.sets.map((s) => s.reps), [8, 6, 6], 'bajo rango reps');
  v = result([]); eq(v.kind, 'noHistory', 'sin historial'); eq(D.prefill(v, 0, null), null, 'sin historial prefill');
  for (const load of ['bodyweight', 'noExternalLoad']) {
    v = result([8, 8, 7], { load });
    eq(v.sets.map((s) => s.weight), [0, 0, 0], `${load} peso`); ok(!D.progressionSummary(v).includes('kg'), `${load} sin kg`);
    eq(result([8, 8, 8], { load }).kind, 'repsComplete', `${load} completo`);
  }
  ok(D.progressionSummary(result([8, 8, 7], { weights: [10, 10, 10], load: 'bodyweightPlusLoad' })).includes('+10 kg'), 'lastre');
  eq(result([8, 8, 8], { load: 'bodyweightPlusLoad' }).kind, 'increaseCandidate', 'lastre subir');
  ok(D.progressionSummary(result([8, 8, 7], { weights: [30, 30, 30], load: 'dumbbellPerHand' })).includes('30 kg/mancuerna'), 'mancuerna');
  for (const load of ['assisted', 'unspecified']) {
    v = result([8, 8, 8], { load }); eq(v.kind, 'historyOnly', `${load} referencia`); eq(v.sets.map((s) => s.reps), [8, 8, 8], `${load} reps`);
  }
  eq(result([8, 8, 8, 1], { weights: [80, 80, 80, 40] }).kind, 'increaseCandidate', 'series extra');
  eq(result([8, 8, 8], { historicalTarget: 2 }).kind, 'incomplete', 'prescripción cambiada');
  eq(result([8, 8]).kind, 'incomplete', 'faltan series');
  eq(result([8, 8, 7], { weights: [80, 75, 75] }).kind, 'mixedLoads', 'cargas mixtas');
  eq(result([8, 8, 8], { unilateral: true }).kind, 'historyOnly', 'unilateral');
  eq(result([8, 8, 8], { equipment: 'Sin especificar' }).kind, 'historyOnly', 'sin equipo');
  for (const load of ['machine', 'cable']) eq(result([8, 8, 8], { load }).kind, 'increaseCandidate', `${load} subir`);
  v = result([8, 7, 7]);
  eq(D.prefill(v, 0, null), { weight: 80, reps: 8, unit: 'kg' }, 'prefill 0');
  eq(D.prefill(v, 2, { weight: 80, reps: 8, unit: 'kg' }), { weight: 80, reps: 7, unit: 'kg' }, 'prefill 2');
  const manual = { weight: 75, reps: 6, unit: 'kg' };
  eq(D.prefill(v, 1, manual), manual, 'respeta manual'); eq(D.prefill(v, 3, manual), manual, 'manual en extra');
  ok(result([8, 0, 8]).sets.length === 0, 'reps inválidas'); ok(result([8, 8, 8], { weights: [NaN, 80, 80] }).sets.length === 0, 'peso NaN');
  v = D.evaluateProgression({ target: 3, min: 6, max: 8, load: 'totalWeight', unilateral: false, equipment: 'Barra', preferredIncrement: 2.5,
    source: { sets: [8, 8, 8].map((r) => ({ weight: 80, reps: r, unit: 'kg' })), targetSets: 3 } });
  eq(v.kind, 'increaseWithPreference', 'incremento personal'); eq(v.sets.map((s) => [s.weight, s.reps]), [[82.5, 6], [82.5, 6], [82.5, 6]], 'incremento personal series');

  // ---- Récords, 1RM, gráficas y volumen
  const day = 1780000000000;
  const key = (o = {}) => ({ identity: 'exercise:O', loadType: 'totalWeight', equipment: 'Barra', unit: 'kg', unilateral: false, repsConvention: 'total', ...o });
  let seq = 0;
  const sample = ({ session = `s${++seq}`, load = 'totalWeight', weight = 60, reps = 10, time = 0, equipment = 'Barra', unit = 'kg', unilateral = false, convention = 'total', identity } = {}) => ({
    id: `id${++seq}`, sessionID: session, date: day + time * 1000, confirmedAt: day + (time + 60) * 1000,
    key: key({ loadType: load, equipment, unit, unilateral, repsConvention: convention, ...(identity ? { identity } : {}) }), name: 'Press', weight, reps, order: 1,
  });
  ok(close(D.e1rm(sample()), 80), 'Epley 80'); ok(close(D.e1rm(sample({ reps: 1 })), 62), 'Epley 62'); ok(close(D.e1rm(sample({ reps: 15 })), 90), 'Epley 90');
  for (const reps of [0, 16, 100]) eq(D.e1rm(sample({ reps })), null, `Epley reps ${reps}`);
  for (const weight of [0, -1, Infinity, NaN]) eq(D.e1rm(sample({ weight })), null, `Epley peso ${weight}`);
  ok(close(D.e1rm(sample({ load: 'dumbbellPerHand', weight: 30 })), 40), '1RM mancuerna');
  for (const load of Object.keys(D.LOAD_TYPES)) if (!['totalWeight', 'dumbbellPerHand'].includes(load)) eq(D.e1rm(sample({ load })), null, `sin 1RM ${load}`);
  eq(D.e1rm(sample({ unilateral: true })), null, 'sin 1RM unilateral');
  const first = sample({ load: 'machine', weight: 80 }), tied = sample({ load: 'machine', weight: 80, reps: 15, time: 10 }), next = sample({ load: 'machine', weight: 85, time: 20 });
  let recs = D.recordEvents([next, tied, first], 'kg').filter((r) => r.metric === 'load');
  eq(recs.map((r) => r.set.id).sort(), [first.id, next.id].sort(), 'PR de carga'); eq(recs[0].set.id, next.id, 'PR más reciente primero');
  const f2 = sample({ weight: 60, reps: 10 }), tie = sample({ weight: 75, reps: 2, time: 10 });
  eq(D.recordEvents([tie, f2], 'kg').filter((r) => r.metric === 'estimated1RM').map((r) => r.set.id), [f2.id], 'empate 1RM no repite');
  const values = [sample({ load: 'machine' }), sample({ load: 'machine', equipment: 'Otra máquina' }), sample({ load: 'cable' }), sample({ load: 'dumbbellPerHand' }),
    sample({ load: 'machine', unilateral: true, convention: 'perSide' }), sample({ load: 'machine', time: -1, unit: 'lb' }), sample({ load: 'machine', identity: 'another' })];
  const prog = D.buildProgress(values.map((s) => ({ id: s.sessionID, date: s.date, endedAt: s.date + 1800000, status: 'completed', sets: [s] })), 'kg');
  eq(prog.groups.length, values.length - 1, 'compatibilidad grupos'); eq(prog.records.filter((r) => r.metric === 'load').length, values.length, 'compatibilidad PR');
  const low = sample({ session: 'A', weight: 60, reps: 10 }), high = sample({ session: 'A', weight: 65, reps: 8 }), later = sample({ weight: 70, time: 3600 });
  const all = { start: day - 100000, end: day + 1e8 }, group = { key: low.key, sets: [low, high, later] };
  eq(D.chartPoints(group, 'load', all).map((p) => p.value), [65, 70], 'gráfica un punto por sesión');
  eq(D.chartPoints(group, 'reps', all)[0].set.weight, 60, 'gráfica reps');
  const as1 = sample({ session: 'B', load: 'assisted', weight: 50 }), as2 = sample({ session: 'B', load: 'assisted', weight: 30, time: 10 });
  eq(D.recordEvents([as1, as2], 'kg').length, 0, 'asistencia sin PR');
  eq(D.chartPoints({ key: as1.key, sets: [as1, as2] }, 'load', all).map((p) => p.value), [30], 'asistencia última serie');
  const vol = D.volume(Object.keys(D.LOAD_TYPES).map((loadType) => ({ weight: 32.5, reps: 8, loadType, unit: 'kg', unilateral: false, repsConvention: 'total' })));
  eq(vol.value, 260, 'volumen'); eq(vol.excluded, Object.keys(D.LOAD_TYPES).length - 1, 'volumen excluidas');

  // ---- Tendencias
  const now = Date.now();
  const visit = (w, reps, days, custom) => {
    const s = `v${++seq}`;
    return reps.map((r, i) => ({ id: `x${++seq}`, sessionID: s, date: now - days * 864e5, confirmedAt: now - days * 864e5 + i, key: custom ?? key(), name: 'Press', weight: w, reps: r, order: i + 1 }));
  };
  const trend = (sets, related = [], custom) => D.trend({ key: custom ?? key(), sets }, { start: now - 400 * 864e5, end: now + 1 }, [...sets, ...related]);
  eq(trend(visit(80, [8], 1)).state, 'insufficientData', 'una sesión');
  let t = trend([...visit(70, [8], 30), ...visit(80, [8], 1)]); eq(t.state, 'progressing', 'más carga'); ok(t.explanation.includes('a 8 reps'), 'más carga texto');
  t = trend([...visit(80, [6], 30), ...visit(80, [9], 1)]); eq(t.state, 'progressing', 'más reps'); ok(t.explanation.includes('reps con 80'), 'más reps texto');
  eq(trend([...visit(80, [8, 8, 7], 30), ...visit(80, [8, 8, 7], 1)]).state, 'stable', 'estable');
  eq(trend([...visit(80, [8], 30), ...visit(40, [8], 1)]).state, 'insufficientData', 'baja de carga');
  const sessions = [35, 28, 21, 14, 7].flatMap((d) => visit(80, [8, 8, 7], d));
  eq(trend(sessions.slice(0, -3)).state, 'stable', '4 sesiones iguales'); eq(trend(sessions).state, 'possiblePlateau', 'estancamiento');
  eq(trend([...visit(60, [8, 8, 7], 50), ...sessions]).state, 'possiblePlateau', 'estancamiento con historial');
  eq(trend(sessions, visit(80, [8], 10, key({ loadType: 'machine', equipment: 'Máquina' }))).state, 'insufficientData', 'cambio de configuración');
  eq(trend([...sessions, ...visit(85, [8, 8, 7], 1)]).state, 'progressing', 'sale del estancamiento');
  const body = key({ identity: 'pull-up', loadType: 'bodyweight' });
  eq(trend([...visit(0, [10], 7, body), ...visit(0, [12], 1, body)], [], body).state, 'progressing', 'peso corporal progresa');
  const flat = trend([35, 28, 21, 14, 7].flatMap((d) => visit(0, [10], d, body)), [], body);
  eq(flat.state, 'possiblePlateau', 'peso corporal estancado'); ok(!flat.explanation.includes('carga'), 'peso corporal sin «carga»');
  for (const load of ['assisted', 'unspecified']) {
    const c = key({ loadType: load, equipment: 'Máquina' });
    eq(trend([...visit(30, [8], 30, c), ...visit(40, [8], 1, c)], [], c).state, 'insufficientData', `tendencia ${load}`);
  }
  return { tests: n, failures: fails };
}
