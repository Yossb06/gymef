// Cliente de Supabase (si config.js lo define) y perfil activo de este dispositivo.
import { store } from './store.js';

const config = window.GYMEF_CONFIG ?? {};
export const cloud = config.supabaseUrl && config.supabaseAnonKey && window.supabase
  ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

const PROFILE_KEY = () => `gymef.activeProfile.${store.user?.id ?? 'local'}`;
export const activeProfileID = () => { try { return localStorage.getItem(PROFILE_KEY()); } catch { return null; } };
export function selectProfile(id) {
  try { id ? localStorage.setItem(PROFILE_KEY(), id) : localStorage.removeItem(PROFILE_KEY()); } catch {}
  window.dispatchEvent(new Event('gymef-profile'));
}
