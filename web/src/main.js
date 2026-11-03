import { html, render, useState, useEffect } from '../vendor/preact-htm.js';
import { store } from './store.js';
import * as data from './data.js';
import { useStore, useHash, DialogHost, Icon } from './ui.js';
import { Login, Onboarding, ProfilePicker } from './screens/start.js';
import { Home } from './screens/home.js';
import { SessionView, ExerciseView } from './screens/workout.js';
import { RoutinesList, RoutineDetail, DayDetail } from './screens/routines.js';
import { Library, ExerciseDetail } from './screens/exercises.js';
import { HistoryList, HistoryDetail } from './screens/history.js';
import { ProgressView, ExerciseProgress } from './screens/progress.js';
import { BodyView } from './screens/body.js';
import { MoreView } from './screens/more.js';
import { cloud, activeProfileID } from './session.js';
import { applyAppearance } from './theme.js';

const TABS = [['', 'Inicio', 'home'], ['rutinas', 'Rutinas', 'routines'], ['progreso', 'Progreso', 'progress'], ['historial', 'Historial', 'history'], ['mas', 'Más', 'more']];
function TabBar({ current }) {
  return html`
    <div class="tabbar"><nav>
      ${TABS.map(([path, label, icon]) => html`
        <a href=${`#/${path}`} class=${current === path ? 'on' : ''} aria-current=${current === path ? 'page' : undefined}>
          <span class="ti"><${Icon} name=${icon} size=${24} /></span>${label}
        </a>`)}
    </nav></div>`;
}

function Router({ owner }) {
  const [screen, a] = useHash();
  const props = { owner, id: a };
  const view = {
    '': () => html`<${Home} ...${props} />`,
    entreno: () => (a ? html`<${ExerciseView} ...${props} />` : html`<${SessionView} ...${props} />`),
    rutinas: () => html`<${RoutinesList} ...${props} />`,
    rutina: () => html`<${RoutineDetail} ...${props} />`,
    dia: () => html`<${DayDetail} ...${props} />`,
    ejercicios: () => html`<${Library} ...${props} />`,
    ejercicio: () => html`<${ExerciseDetail} ...${props} />`,
    historial: () => (a ? html`<${HistoryDetail} ...${props} />` : html`<${HistoryList} ...${props} />`),
    progreso: () => (a ? html`<${ExerciseProgress} ...${props} />` : html`<${ProgressView} ...${props} />`),
    cuerpo: () => html`<${BodyView} ...${props} />`,
    mas: () => html`<${MoreView} ...${props} />`,
  }[screen ?? ''] ?? (() => html`<${Home} ...${props} />`);
  const showTabs = TABS.some(([p]) => p === (screen ?? '')) && !a;
  return html`${view()}${showTabs && html`<${TabBar} current=${screen ?? ''} />`}`;
}

function Main() {
  useStore();
  const [, set] = useState(0);
  useEffect(() => {
    const on = () => set((x) => x + 1);
    addEventListener('gymef-profile', on);
    return () => removeEventListener('gymef-profile', on);
  }, []);
  if (store.isEmpty()) {
    // Un teléfono nuevo sin conexión aún no ha descargado la cuenta: no ofrecer importar encima de datos existentes.
    if (store.mode === 'cloud' && !store.lastPulled) {
      return html`<div class="login"><div class="card center stack">
        <b>Descargando tus datos…</b>
        <p class="muted small" style="margin:0">${store.sync.state === 'syncing' ? 'Un momento.' : 'No hay conexión. Conéctate a internet para descargar tu cuenta la primera vez.'}</p>
        <button class="btn block" onClick=${() => store.syncNow()}>Reintentar</button>
      </div></div>`;
    }
    return html`<${Onboarding} />`;
  }
  const owner = activeProfileID();
  if (!owner || !data.profile(owner)) return html`<${ProfilePicker} />`;
  applyAppearance(data.profile(owner).appearance, { celebrate: data.birthdaysToday().length > 0 });
  return html`<${Router} owner=${owner} key=${owner} />`;
}

function App() {
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState(null);
  useEffect(() => {
    let current = null;
    async function openFor(session) {
      if (!cloud) { await store.open({ mode: 'local' }); setPhase('ready'); return; }
      if (!session) { if (current) { store.close(); current = null; } setPhase('login'); return; }
      if (current === session.user.id) return;
      current = session.user.id;
      setPhase('loading');
      await store.open({ mode: 'cloud', client: cloud, user: session.user });
      setPhase('ready');
    }
    const start = async () => {
      try {
        if (!cloud) return openFor(null);
        const { data: { session } } = await cloud.auth.getSession();
        await openFor(session);
        cloud.auth.onAuthStateChange((_event, next) => { openFor(next).catch(setError); });
      } catch (e) { setError(e); }
    };
    start();
  }, []);
  if (error) return html`<div class="login"><div class="card center"><h3>No se pudo abrir el almacenamiento.</h3><p class="muted">${String(error.message ?? error)}</p><p class="muted small">Tus datos no se han borrado. Recarga la página.</p></div></div>`;
  if (phase === 'loading') return html`<div class="login"><p class="center muted">Cargando…</p></div>`;
  if (phase === 'login') return html`<${Login} />`;
  return html`<${Main} />`;
}

render(html`<${App} /><${DialogHost} />`, document.getElementById('app'));

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    // La app instalada puede quedar abierta días: busca versión nueva cada vez que vuelve a primer plano.
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}
