import { html, useState } from '../../vendor/preact-htm.js';
import * as data from '../data.js';
import { store } from '../store.js';
import { exportBackup } from '../backup.js';
import { cloud, selectProfile } from '../session.js';
import { Page, Section, Row, Sheet, Segmented, DropZone, VERSION, Tile, run, toast, promptDialog, confirmDialog } from '../ui.js';
import { MODES, TEXT_SIZES, THEMES, DEFAULT_APPEARANCE, seasonalTheme, applyAppearance } from '../theme.js';
import { importFile } from './start.js';
import { SyncBadge } from './home.js';
import { WeightTools } from './tools.js';

function download(text, name, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function MoreView({ owner }) {
  const me = data.profile(owner);
  const [install, setInstall] = useState(false);
  const [birthdays, setBirthdays] = useState(false);
  const [tools, setTools] = useState(false);
  const rename = async () => {
    const name = await promptDialog('Nombre del perfil', { value: me.name });
    if (name) run(() => data.renameProfile(owner, name));
  };
  const addProfile = async () => {
    const name = await promptDialog('Nuevo perfil', { placeholder: 'Nombre', confirm: 'Crear' });
    if (name) { run(() => data.createProfile(name)); toast(`Perfil ${name.trim()} creado`); }
  };
  const pick = (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) run(() => importFile(f, { confirmReplace: true })); };
  const signOut = async () => {
    const pending = store.sync.pending;
    if (await confirmDialog('¿Cerrar sesión en este dispositivo?', { message: pending ? `Hay ${pending} cambios sin subir; se perderán si cierras sesión sin conexión.` : 'Tus datos siguen en la nube.', confirm: 'Cerrar sesión', danger: !!pending }))
      await cloud.auth.signOut();
  };
  const date = new Date().toISOString().slice(0, 10);
  const look = { ...DEFAULT_APPEARANCE, ...(me.appearance ?? {}) };
  const setLook = (change) => run(() => { data.setAppearance(owner, change); applyAppearance({ ...look, ...change }); });
  const swatch = (id) => `--sw:linear-gradient(135deg, ${THEMES[id].hero.join(', ')})`;
  return html`
    <${Page} title="Más" large>
      <${Section} title=${`Perfil · ${me.name}`}>
        <div class="list">
          <${Row} title="Cambiar nombre" sub=${me.name} onClick=${rename} />
          <div class="row static"><span class="grow"><div class="title">Unidad de peso</div><div class="sub">El historial conserva sus unidades originales.</div></span>
            <${Segmented} options=${{ kg: 'kg', lb: 'lb' }} value=${me.defaultLoadUnitRaw} onChange=${(u) => run(() => data.setDefaultUnit(owner, u))} /></div>
          <${Row} icon=${html`<${Tile} name="users" color="#0a84ff" />`} title="Cambiar de perfil" onClick=${() => selectProfile(null)} />
          <${Row} icon=${html`<${Tile} name="plus" color="#30d158" />`} title="Añadir perfil" sub="Para otro miembro de la familia" onClick=${addProfile} />
          <${Row} icon=${html`<${Tile} text="🎂" color="#ec4899" />`} title="Cumpleaños de la familia"
            sub=${data.profiles().filter((p) => p.birthday).length ? data.profiles().filter((p) => p.birthday).map((p) => `${p.name} ${birthdayLabel(p.birthday)}`).join(' · ') : 'La app se pone de fiesta ese día'}
            onClick=${() => setBirthdays(true)} />
        </div>
      <//>
      <${Section} title="Apariencia de tu perfil">
        <div class="card stack">
          <div><div class="small muted" style="margin:0 4px 6px">Modo</div>
            <${Segmented} options=${MODES} value=${look.mode} onChange=${(mode) => setLook({ mode })} /></div>
          <div><div class="small muted" style="margin:0 4px 6px">Tamaño de letra</div>
            <${Segmented} options=${TEXT_SIZES} value=${look.text} onChange=${(text) => setLook({ text })} /></div>
          <div><div class="small muted" style="margin:0 4px 6px">Tema</div>
            <div class="themes">
              <button class=${`theme-card ${look.theme === 'auto' ? 'on' : ''}`} style=${swatch(seasonalTheme())} onClick=${() => setLook({ theme: 'auto' })}>
                <span class="theme-emoji">🗓️</span><b>Automático</b><span>Hoy: ${THEMES[seasonalTheme()].name}</span></button>
              ${Object.entries(THEMES).map(([id, t]) => html`
                <button class=${`theme-card ${look.theme === id ? 'on' : ''}`} style=${swatch(id)} onClick=${() => setLook({ theme: id })}>
                  <span class="theme-emoji">${t.emoji}</span><b>${t.name}</b></button>`)}
            </div></div>
          <p class="muted small" style="margin:0">Cada perfil guarda su apariencia: quien lo necesite puede usar modo claro y letra grande.</p>
        </div>
      <//>
      <${Section} title="Herramientas">
        <div class="list"><${Row} icon=${html`<${Tile} name="scale" color="#ff9f0a" />`} title="Calculadora de peso" sub="Convertir kg ↔ lb y qué discos poner en la barra" onClick=${() => setTools(true)} /></div>
      <//>
      <${Section} title="Datos y respaldos">
        <${DropZone} onFile=${(f) => run(() => importFile(f, { confirmReplace: true }))}><div class="list">
          <${Row} title="Exportar respaldo" sub="Archivo .gymbackup con todos los perfiles (sin fotos)" onClick=${() => download(exportBackup(), `gymef-${date}.gymbackup`)} />
          <${Row} title="Exportar tu historial a Excel" sub=${`Todas las series de ${me.name} en un archivo .csv`}
            onClick=${() => download(data.historyCSV(owner), `gymef-${me.name.replace(/\W+/g, '-').toLowerCase()}-${date}.csv`, 'text/csv;charset=utf-8')} />
          <label class="row" style="cursor:pointer"><span class="grow"><div class="title">Importar respaldo</div><div class="sub">Reemplaza todos los datos de la cuenta. También puedes soltar aquí el archivo.</div></span><span class="chev">›</span>
            <input type="file" class="visually-hidden" onChange=${pick} /></label>
        </div><//>
      <//>
      <${Section} title="Cuenta">
        <div class="list">
          ${store.mode === 'cloud' ? html`
            <div class="row static"><span class="grow"><div class="title">${store.user.email}</div><div class="sub"><${SyncBadge} /></div></span></div>
            ${store.sync.error && html`<div class="row static small" style="color:var(--danger)">${store.sync.error}</div>`}
            <${Row} title="Sincronizar ahora" onClick=${() => store.syncNow()} />
            <${Row} title="Cerrar sesión" onClick=${signOut} />`
          : html`<div class="row static"><span class="grow"><div class="title">Modo local</div><div class="sub">Los datos se guardan solo en este navegador. Configura Supabase para usar la nube.</div></span></div>`}
        </div>
      <//>
      <${Section} title="App">
        <div class="list"><${Row} title="Instalar en la pantalla de inicio" sub="iPhone y Android" onClick=${() => setInstall(true)} /></div>
      <//>
      <p class="muted small center" style="margin-top:24px">GymE&F web · versión ${VERSION}</p>
    <//>
    ${birthdays && html`<${BirthdaysSheet} onClose=${() => setBirthdays(false)} />`}
    ${tools && html`<${WeightTools} unit=${me.defaultLoadUnitRaw ?? 'kg'} onClose=${() => setTools(false)} />`}
    ${install && html`<${Sheet} title="Instalar" onClose=${() => setInstall(false)}>
      <div class="card stack">
        <div><b>iPhone (Safari)</b><p class="small muted" style="margin:4px 0 0">Toca Compartir ⬆︎ → «Agregar a pantalla de inicio» → Agregar.</p></div>
        <div><b>Android (Chrome)</b><p class="small muted" style="margin:4px 0 0">Toca el menú ⋮ → «Instalar app» o «Agregar a la pantalla principal».</p></div>
        <p class="small muted" style="margin:0">Se abre a pantalla completa como una app y nunca caduca.</p>
      </div>
    <//>`}`;
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const birthdayLabel = (md) => { const [m, d] = md.split('-').map(Number); return `${d} de ${MONTHS[m - 1]}`; };

/** Fecha de cumpleaños (día y mes) de cada perfil; se guarda al momento y se comparte con toda la familia. */
function BirthdaysSheet({ onClose }) {
  const save = (p, month, day) => {
    if (!month) { run(() => data.setBirthday(p.id, null)); return; }
    const d = Math.min(day || 1, DAYS_IN[month - 1]);
    run(() => data.setBirthday(p.id, `${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`));
  };
  return html`
    <${Sheet} title="Cumpleaños" onClose=${onClose}>
      <p class="muted small" style="margin-top:0">Ese día la app se pone de fiesta para todos y felicita a quien cumple años. Solo se guarda el día y el mes.</p>
      <div class="list">
        ${data.profiles().map((p) => {
          const [m, d] = p.birthday ? p.birthday.split('-').map(Number) : [0, 0];
          return html`<div class="row static birthday-row">
            <span class="grow title">${p.name}</span>
            <select class="input" aria-label=${`Día del cumpleaños de ${p.name}`} value=${d || ''} disabled=${!m} onChange=${(e) => save(p, m, Number(e.target.value))}>
              <option value="">Día</option>${Array.from({ length: m ? DAYS_IN[m - 1] : 31 }, (_, i) => html`<option value=${i + 1}>${i + 1}</option>`)}
            </select>
            <select class="input" aria-label=${`Mes del cumpleaños de ${p.name}`} value=${m || ''} onChange=${(e) => save(p, Number(e.target.value), d || 1)}>
              <option value="">Mes</option>${MONTHS.map((name, i) => html`<option value=${i + 1}>${name}</option>`)}
            </select>
          </div>`;
        })}
      </div>
    <//>`;
}
