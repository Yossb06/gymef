// Apariencia por perfil: modo claro/oscuro, tema de temporada y tamaño de letra.
// Se guarda en el perfil (viaja con la nube) y en este dispositivo para las pantallas previas al perfil.

export const MODES = { auto: 'Automático', light: 'Claro', dark: 'Oscuro' };
export const TEXT_SIZES = { normal: 'Normal', large: 'Grande' };

// Cada tema: acento para modo claro y oscuro (con contraste suficiente para texto), degradado de las
// tarjetas destacadas, emoji y colores de confeti.
export const THEMES = {
  classic: { name: 'Clásico', emoji: '💪', light: '#5856d6', dark: '#8b87ff', hero: ['#4f46e5', '#7c3aed', '#c026d3'], confetti: ['#7c6cff', '#c084fc', '#f472b6', '#facc15', '#34d399', '#60a5fa'] },
  halloween: { name: 'Halloween', emoji: '🎃', deco: '🦇', light: '#c2410c', dark: '#fb923c', hero: ['#1f1235', '#6b21a8', '#ea580c'], confetti: ['#f97316', '#a855f7', '#facc15', '#22c55e', '#f5f5f4'] },
  christmas: { name: 'Navidad', emoji: '🎄', deco: '❄️', light: '#b91c1c', dark: '#f87171', hero: ['#14532d', '#15803d', '#b91c1c'], confetti: ['#ef4444', '#22c55e', '#facc15', '#f8fafc', '#60a5fa'] },
  spring: { name: 'Primavera', emoji: '🌸', deco: '🌷', light: '#be185d', dark: '#f9a8d4', hero: ['#db2777', '#f472b6', '#4ade80'], confetti: ['#f472b6', '#a3e635', '#fde047', '#c4b5fd', '#67e8f9'] },
  summer: { name: 'Verano', emoji: '☀️', deco: '🌊', light: '#0e7490', dark: '#22d3ee', hero: ['#0891b2', '#06b6d4', '#f59e0b'], confetti: ['#22d3ee', '#facc15', '#fb923c', '#34d399', '#f472b6'] },
};
// Se aplica sola el día del cumpleaños de alguien de la familia (no aparece en la lista de temas).
export const BIRTHDAY_THEME = { name: 'Cumpleaños', emoji: '🎂', deco: '🎈', light: '#a21caf', dark: '#f0abfc', hero: ['#f59e0b', '#ec4899', '#8b5cf6'], confetti: ['#facc15', '#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fb923c'] };

/** Tema según la fecha: Halloween (15 oct–2 nov), Navidad (1 dic–6 ene), primavera y verano; si no, Clásico. */
export function seasonalTheme(date = new Date()) {
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  if (md >= 1015 && md <= 1102) return 'halloween';
  if (md >= 1201 || md <= 106) return 'christmas';
  if (md >= 320 && md <= 620) return 'spring';
  if (md >= 621 && md <= 922) return 'summer';
  return 'classic';
}

const CACHE_KEY = 'gymef.appearance';
export const DEFAULT_APPEARANCE = { mode: 'auto', theme: 'auto', text: 'normal' };
let current = { ...DEFAULT_APPEARANCE };
let birthday = false;
const prefersDark = matchMedia('(prefers-color-scheme: dark)');

/** El cumpleaños de alguien de la familia manda ese día, sobre cualquier otro tema. */
export const activeThemeID = (appearance = current) => (birthday ? 'birthday'
  : appearance.theme && appearance.theme !== 'auto' && THEMES[appearance.theme] ? appearance.theme : seasonalTheme());
const themeByID = (id) => (id === 'birthday' ? BIRTHDAY_THEME : THEMES[id]);
export const activeTheme = () => themeByID(activeThemeID());
export const themeEmoji = () => activeTheme().emoji;

/** Aplica la apariencia al documento (variables CSS y atributos data-*). `celebrate`: hoy cumple años alguien. */
export function applyAppearance(appearance, { celebrate = birthday } = {}) {
  current = { ...DEFAULT_APPEARANCE, ...(appearance ?? {}) };
  birthday = celebrate;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(current)); } catch {}
  const root = document.documentElement;
  const dark = current.mode === 'dark' || (current.mode === 'auto' && prefersDark.matches);
  const id = activeThemeID();
  const theme = themeByID(id);
  root.dataset.mode = dark ? 'dark' : 'light';
  root.dataset.season = id;
  root.dataset.text = current.text;
  const accent = dark ? theme.dark : theme.light;
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-soft', `color-mix(in srgb, ${accent} ${dark ? 16 : 10}%, transparent)`);
  root.style.setProperty('--hero', `linear-gradient(135deg, ${theme.hero[0]} 0%, ${theme.hero[1]} 55%, ${theme.hero[2]} 100%)`);
  root.style.setProperty('--hero-glow', theme.hero[1]);
  root.style.colorScheme = dark ? 'dark' : 'light';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#000000' : '#f2f2f7'));
}
export const confettiColors = () => activeTheme().confetti;

// Las pantallas previas al perfil usan la última apariencia de este dispositivo.
try { applyAppearance(JSON.parse(localStorage.getItem(CACHE_KEY))); } catch { applyAppearance(null); }
prefersDark.addEventListener?.('change', () => applyAppearance(current));
