import { html, useState } from '../../vendor/preact-htm.js';
import * as data from '../data.js';
import { parseBackup, restore } from '../backup.js';
import { cloud, selectProfile } from '../session.js';
import { Field, Input, DropZone, VERSION, run, toast, confirmDialog, promptDialog } from '../ui.js';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('in');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMessage('');
    const { data: result, error } = mode === 'in'
      ? await cloud.auth.signInWithPassword({ email: email.trim(), password })
      : await cloud.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: location.origin + location.pathname } });
    setBusy(false);
    if (error) { setMessage(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message); return; }
    if (mode === 'up' && !result.session) setMessage('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.');
  }
  return html`
    <div class="login">
      <img class="logo" src="icons/icon-192.png" alt="" />
      <h1 class="center" style="margin:0 0 4px">GymE&F</h1>
      <p class="center muted" style="margin:0 0 24px">Tu gimnasio, tu ritmo</p>
      <form class="card" onSubmit=${submit}>
        <${Field} label="Correo"><${Input} type="email" autocomplete="email" value=${email} onInput=${setEmail} required /><//>
        <${Field} label="Contraseña"><${Input} type="password" autocomplete=${mode === 'in' ? 'current-password' : 'new-password'} minlength="6" value=${password} onInput=${setPassword} required /><//>
        ${message && html`<p class="small" style="color:var(--danger)">${message}</p>`}
        <button class="btn primary block big" style="margin-top:16px" disabled=${busy}>${mode === 'in' ? 'Entrar' : 'Crear cuenta'}</button>
      </form>
      <button class="btn plain block" style="margin-top:12px" onClick=${() => { setMode(mode === 'in' ? 'up' : 'in'); setMessage(''); }}>
        ${mode === 'in' ? 'Crear la cuenta de la familia' : 'Ya tengo cuenta'}
      </button>
      <p class="muted small center">Una sola cuenta para toda la familia; cada quien elige su perfil al entrar.</p>
    </div>`;
}

export async function importFile(file, { confirmReplace }) {
  const text = await file.text();
  const backup = parseBackup(text);
  if (confirmReplace) {
    const ok = await confirmDialog('¿Reemplazar todos los datos?', {
      message: `Se restaurarán ${backup.profiles.length} perfiles, ${backup.sessions.length} entrenamientos y ${backup.sets.length} series. Los datos actuales de la cuenta se sustituirán.`,
      confirm: 'Reemplazar', danger: true,
    });
    if (!ok) return false;
  }
  restore(backup);
  selectProfile(null);
  toast(`Respaldo importado: ${backup.profiles.length} perfiles y ${backup.sessions.length} entrenamientos.`);
  return true;
}

export function Onboarding() {
  const [names, setNames] = useState('Fran, Eve');
  const load = (f) => run(() => importFile(f, { confirmReplace: false }));
  const pick = (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) load(f); };
  return html`
    <div class="login">
      <img class="logo" src="icons/icon-192.png" alt="" />
      <h1 class="center" style="margin:0 0 20px">Bienvenido a GymE&F</h1>
      <${DropZone} onFile=${load}>
        <div class="card stack">
          <div><div class="caps">Opción recomendada</div><b>Importar respaldo de la app iPhone</b>
            <p class="muted small" style="margin:4px 0 0">Archivo .gymbackup o .json con perfiles, rutinas, entrenamientos y configuración.</p></div>
          <label class="btn primary block">Elegir archivo de respaldo<input type="file" class="visually-hidden" onChange=${pick} /></label>
          <p class="muted small center" style="margin:0">…o arrastra el archivo desde Finder y suéltalo aquí.</p>
        </div>
      <//>
      <div class="card stack" style="margin-top:12px">
        <b>Empezar de cero</b>
        <${Field} label="Perfiles (separados por coma)"><${Input} value=${names} onInput=${setNames} /><//>
        <button class="btn block" onClick=${() => run(() => data.seedStart(names.split(',')))} disabled=${!names.trim()}>Crear perfiles y biblioteca de ejercicios</button>
      </div>
      <p class="muted small center">Versión ${VERSION}</p>
    </div>`;
}

export function ProfilePicker() {
  const list = data.profiles();
  const today = new Set(data.birthdaysToday().map((p) => p.id));
  const add = async () => {
    const name = await promptDialog('Nuevo perfil', { placeholder: 'Nombre', confirm: 'Crear' });
    if (name) run(() => data.createProfile(name));
  };
  return html`
    <div class="login">
      <img class="logo" src="icons/icon-192.png" alt="" />
      <h1 class="center" style="margin:0 0 6px">¿Quién entrena hoy?</h1>
      <p class="center muted" style="margin:0 0 20px">Elige tu perfil. Tus datos son solo tuyos.</p>
      <div class="list">
        ${list.map((p) => html`
          <button class="row" onClick=${() => selectProfile(p.id)}>
            <span class="avatar" aria-hidden="true">${p.name.slice(0, 1).toUpperCase()}</span>
            <span class="grow title">${p.name}${today.has(p.id) ? ' 🎂' : ''}</span><span class="chev">›</span>
          </button>`)}
      </div>
      <button class="btn plain block" style="margin-top:12px" onClick=${add}>+ Añadir perfil</button>
    </div>`;
}
