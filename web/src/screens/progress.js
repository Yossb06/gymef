import { html, useState } from '../../vendor/preact-htm.js';
import * as data from '../data.js';
import * as D from '../domain.js';
import { Page, Section, Row, Segmented, Stat, LineChart } from '../ui.js';

const periodState = { value: 'threeMonths' };

export function ProgressView({ owner }) {
  const [period, setPeriodRaw] = useState(periodState.value);
  const setPeriod = (p) => { periodState.value = p; setPeriodRaw(p); };
  const progress = data.progress(owner);
  const intel = D.intelligence(progress, D.periodInterval(period));
  const o = intel.overview;
  return html`
    <${Page} title="Progreso" large>
      <${Segmented} options=${D.PERIODS} value=${period} onChange=${setPeriod} />
      <div class="stats" style="margin-top:12px">
        <${Stat} value=${o.workouts} label="Entrenamientos" /><${Stat} value=${o.sets} label="Series" />
        <${Stat} value=${o.reps} label="Reps" /><${Stat} value=${o.averageDuration ? D.formatDuration(o.averageDuration) : '—'} label="Duración media" />
      </div>
      <p class="muted small">${D.volumeLabel(o.volume)}</p>
      ${intel.events.length > 0 && html`<${Section} title="Destacados">
        <div class="list">${intel.events.map((e) => html`<${Row} icon=${e.icon} title=${`${e.title} · ${e.group.name}`} sub=${e.detail} href=${`progreso/${encodeURIComponent(e.group.id)}`} />`)}</div><//>`}
      <${Section} title="Ejercicios">
        <div class="list">
          ${intel.analyses.length === 0 && html`<div class="row static muted">Completa entrenamientos para ver tu progreso.</div>`}
          ${intel.analyses.map((a) => html`<${Row} title=${a.group.name} sub=${D.keyConfigLabel(a.group.key)} href=${`progreso/${encodeURIComponent(a.group.id)}`}
            right=${html`<span class=${`badge ${a.trend.state === 'progressing' ? 'on' : ''}`}>${D.TREND_TITLES[a.trend.state]}</span>`} />`)}
        </div>
      <//>
      ${intel.records.length > 0 && html`<${Section} title="Récords del periodo">
        <div class="list">${intel.records.slice(0, 10).map((r) => html`<${Row} icon="🏆" title=${r.set.name}
          sub=${`${r.metric === 'load' ? D.setProgressLabel(r.set) : `1RM estimado ${D.display(r.value)} ${D.keyLoadLabel(r.set.key)}`} · ${D.formatDate(r.set.date)}`} />`)}</div><//>`}
    <//>`;
}

export function ExerciseProgress({ owner, id }) {
  const [metric, setMetric] = useState('load');
  const [period, setPeriod] = useState(periodState.value);
  const progress = data.progress(owner);
  const group = progress.groups.find((g) => g.id === id);
  if (!group) return html`<${Page} title="Progreso" backTo="progreso"><div class="empty">No hay series completadas para este ejercicio.</div><//>`;
  const interval = D.periodInterval(period);
  const metrics = Object.fromEntries(Object.entries(D.METRICS).filter(([m]) => group.sets.some((s) => D.metricValue(m, s) !== null)));
  const current = metrics[metric] ? metric : Object.keys(metrics)[0] ?? 'reps';
  const points = D.chartPoints(group, current, interval).map((p) => ({ x: p.set.date, y: p.value }));
  const t = D.trend(group, interval, progress.groups.flatMap((g) => g.sets));
  const records = progress.records.filter((r) => D.keyId(r.set.key) === group.id);
  const exerciseID = group.key.identity.startsWith('exercise:') ? group.key.identity.slice(9) : null;
  const suggestion = exerciseID && data.progressionForKey(owner, group.key);
  const bySession = new Map();
  for (const s of group.sets) { if (!bySession.has(s.sessionID)) bySession.set(s.sessionID, []); bySession.get(s.sessionID).push(s); }
  const visits = [...bySession.values()].sort((a, b) => b[0].date - a[0].date);
  const suffix = current === 'reps' ? ' reps' : ` ${D.keyLoadLabel(group.key)}`;
  return html`
    <${Page} title=${group.name} backTo="progreso"
      right=${exerciseID && data.exercise(exerciseID) && html`<a class="btn plain" href=${`#/ejercicio/${exerciseID}`}>Ficha</a>`}>
      <div class="card">
        <div style="font-size:20px;font-weight:700">${group.name}</div>
        <div class="small muted">${D.keyConfigLabel(group.key)}</div>
        <div style="margin-top:8px"><span class=${`badge ${t.state === 'progressing' ? 'on' : ''}`}>${D.TREND_TITLES[t.state]}</span></div>
        <div class="small muted" style="margin-top:6px">${t.explanation}</div>
      </div>
      ${suggestion && html`<div class="suggest" style="margin-top:12px"><div class="k">Próxima vez · ${suggestion[0]} · ${D.PROGRESSION_TITLES[suggestion[1].kind]}</div><b>${D.progressionCompact(suggestion[1])}</b></div>`}
      <div class="card stack" style="margin-top:12px">
        <${Segmented} options=${metrics} value=${current} onChange=${setMetric} />
        <${Segmented} options=${D.PERIODS} value=${period} onChange=${setPeriod} />
        <${LineChart} points=${points} format=${(v) => D.display(Math.round(v * 10) / 10)} />
        ${points.length > 0 && html`<div class="small muted center">Mejor valor por sesión${suffix}</div>`}
      </div>
      ${records.length > 0 && html`<${Section} title="Récords">
        <div class="list">${records.slice(0, 8).map((r) => html`<${Row} icon="🏆" title=${r.metric === 'load' ? D.setProgressLabel(r.set) : `1RM estimado ${D.display(r.value)} ${D.keyLoadLabel(r.set.key)}`} sub=${D.formatDate(r.set.date, { day: 'numeric', month: 'short', year: 'numeric' })} />`)}</div><//>`}
      <${Section} title="Sesiones">
        <div class="list">${visits.slice(0, 20).map((v) => html`<${Row} title=${D.formatDate(v[0].date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          sub=${v.sort((a, b) => a.order - b.order).map(D.setProgressLabel).join(' · ')} href=${`historial/${v[0].sessionID}`} />`)}</div>
      <//>
    <//>`;
}
