// Imágenes de ejercicios: las fotos de dominio público incluidas en la app y las fotos, GIFs o videos
// que la familia agrega a cada ejercicio (privados en su cuenta; se comparten entre perfiles).
import { store, newId } from './store.js';
import { normalizedName } from './domain.js';
import { UserError } from './data.js';
import { EXERCISE_IMAGES } from './exercise-images.js';
import { EXERCISE_ILLUSTRATIONS } from './exercise-illustrations.js';

// Fotos de dominio público y, para lo que no tiene foto, ilustraciones animadas propias (SVG).
const BUILT_IN = new Map(Object.entries({ ...EXERCISE_IMAGES, ...EXERCISE_ILLUSTRATIONS }).map(([name, frames]) => [normalizedName(name), frames]));
/** Fotos incluidas (inicio y final) para el ejercicio, o null. */
export const builtInFrames = (exercise) => (exercise ? BUILT_IN.get(normalizedName(exercise.name)) ?? null : null);

const MAX_GIF = 8 * 1024 * 1024;
const MAX_VIDEO = 30 * 1024 * 1024;

/** Reduce una foto a `max` px y JPEG para ahorrar espacio. */
export async function compressImage(file, max = 1600, quality = 0.82) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/** Medio propio del ejercicio (el más reciente), o null. */
export const customMedia = (exerciseID) => store.all('exerciseMedia')
  .filter((m) => m.exerciseID === exerciseID).sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
const fileName = (m) => `media/${m.id}.${m.ext}`;
export const mediaURL = (m) => store.blobURL(m.id, { name: fileName(m) });

/** Guarda una foto, GIF o video para el ejercicio y reemplaza el anterior. Las fotos se comprimen; GIF y video se guardan tal cual. */
export async function addExerciseMedia(exerciseID, file, owner) {
  if (!store.get('exercises', exerciseID)) throw new UserError('El ejercicio ya no está disponible.');
  const type = file.type || '';
  let kind, blob = file, ext, contentType = type;
  if (type === 'image/gif') {
    if (file.size > MAX_GIF) throw new UserError('El GIF pesa más de 8 MB. Elige uno más ligero.');
    kind = 'gif'; ext = 'gif';
  } else if (type.startsWith('image/')) {
    kind = 'image'; ext = 'jpg'; contentType = 'image/jpeg';
    blob = await compressImage(file, 1080, 0.8);
  } else if (type.startsWith('video/')) {
    if (file.size > MAX_VIDEO) throw new UserError('El video pesa más de 30 MB. Graba uno más corto (5–10 segundos bastan).');
    kind = 'video'; ext = (file.name.split('.').pop() || 'mp4').toLowerCase().slice(0, 5);
  } else {
    throw new UserError('Elige una foto, un GIF o un video.');
  }
  const previous = customMedia(exerciseID);
  const media = { id: newId(), exerciseID, kind, ext, contentType, createdAt: Date.now(), addedBy: owner };
  await store.saveBlob(media.id, blob, { name: fileName(media), contentType });
  store.put('exerciseMedia', media);
  if (previous) await removeExerciseMedia(previous.id);
  return media;
}
export async function removeExerciseMedia(id) {
  const m = store.get('exerciseMedia', id);
  if (!m) return;
  await store.deleteBlob(m.id, { name: fileName(m) }).catch(() => {});
  store.remove('exerciseMedia', id);
}
