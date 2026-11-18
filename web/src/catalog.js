// Nombres en español y alternativas por si el gimnasio no tiene el equipo.
// Las fotos de las alternativas salen de Scripts/fetch-exercise-images.py (dominio público).
import { normalizedName } from './domain.js';

// Nombre original → nombre en español (solo para mostrar; los datos guardados no cambian).
const SPANISH = {
  'Pec fly': 'Aperturas en máquina', 'Pull-up': 'Dominadas', 'Cable lateral raise': 'Elevación lateral en polea',
  'Dumbbell lateral raise': 'Elevación lateral con mancuernas', 'Pendlay row': 'Remo Pendlay con barra',
  'Cable overhead triceps extension': 'Extensión de tríceps sobre la cabeza en polea', 'Bayesian curl': 'Curl bayesiano en polea',
  'Lying leg curl': 'Curl femoral acostado', 'Squat': 'Sentadilla con barra', 'Pendulum squat': 'Sentadilla péndulo',
  'Hack squat': 'Sentadilla hack', 'Romanian deadlift': 'Peso muerto rumano', 'Leg extension': 'Extensión de cuádriceps',
  'Hip abduction': 'Abductores en máquina', 'Hip adduction': 'Aductores en máquina', 'Standing calf raise': 'Elevación de talones de pie',
  'Shoulder press': 'Press de hombro', 'Close-grip lat pulldown': 'Jalón al pecho con agarre cerrado',
  'Chest-supported machine row': 'Remo en máquina con apoyo de pecho', 'Close-grip cable row': 'Remo sentado en polea',
  'Reverse butterfly': 'Pájaro en máquina', 'Shrugs': 'Encogimientos de hombros', 'Seated leg curl': 'Curl femoral sentado',
  'Sitting Leg Curl': 'Curl femoral sentado', 'Smith squat': 'Sentadilla en máquina Smith', 'Ab crunch': 'Crunch abdominal en polea',
  'Leg raises': 'Elevación de piernas colgado', 'Goblet saquat': 'Sentadilla goblet',
};
const SPANISH_BY_KEY = new Map(Object.entries(SPANISH).map(([k, v]) => [normalizedName(k), v]));
export const spanishName = (name) => SPANISH_BY_KEY.get(normalizedName(name ?? '')) ?? null;

let useSpanish = false;
/** Activa o desactiva los nombres en español (preferencia del perfil activo). */
export const setSpanishNames = (on) => { useSpanish = !!on; };
/** Nombre para mostrar de un ejercicio según la preferencia del perfil. */
export const N = (name) => (useSpanish && spanishName(name)) || name;

// Nombre → nombre en inglés, y otras palabras con que la gente lo busca (también español de México).
// Así se encuentra cualquier ejercicio escribiendo en español o en inglés, sin importar cómo se muestren los nombres.
const ENGLISH = {
  'Aperturas con mancuernas': 'Dumbbell flyes', 'Cruce de poleas': 'Cable crossover', 'Flexiones': 'Push-ups pushups',
  'Press de pecho en máquina': 'Machine chest press', 'Press de banca con mancuernas': 'Dumbbell bench press',
  'Press inclinado con mancuerna': 'Incline dumbbell press', 'Remo con mancuerna a una mano': 'One-arm dumbbell row',
  'Remo invertido': 'Inverted row', 'Dominadas supinas': 'Chin-up chinup', 'Sentadilla búlgara con mancuernas': 'Bulgarian split squat',
  'Zancadas con mancuernas': 'Dumbbell lunges', 'Sentadilla con mancuernas': 'Dumbbell squat', 'Sentadilla goblet': 'Goblet squat',
  'Peso muerto rumano con mancuernas': 'Dumbbell Romanian deadlift', 'Hip thrust con barra': 'Barbell hip thrust',
  'Puente de glúteo a una pierna': 'Single-leg glute bridge', 'Curl femoral con pelota': 'Ball leg curl',
  'Extensiones de espalda': 'Back extension hyperextension', 'Elevación de talones sentado': 'Seated calf raise',
  'Press de hombro con mancuernas': 'Dumbbell shoulder press', 'Elevación lateral con banda': 'Band lateral raise',
  'Pájaro con mancuernas': 'Rear delt fly reverse fly', 'Extensión de tríceps con mancuerna': 'Dumbbell overhead triceps extension',
  'Jalón de tríceps en polea': 'Triceps pushdown', 'Fondos en banco': 'Bench dips', 'Curl con barra': 'Barbell curl',
  'Curl con mancuernas': 'Dumbbell curl', 'Aductores con banda': 'Band hip adduction', 'Crunch abdominal': 'Crunches',
  'Elevación de piernas en banco': 'Lying leg raise', 'Press banca en Smith': 'Smith machine bench press',
  'Press inclinado en Smith': 'Smith machine incline press', 'Press inclinado en máquina': 'Machine incline chest press',
  'Press de pecho en polea': 'Cable chest press', 'Aperturas inclinadas con mancuernas': 'Incline dumbbell flyes',
  'Aperturas en polea baja': 'Low cable fly', 'Sentadilla frontal': 'Front squat', 'Press militar con barra': 'Barbell overhead press military press',
  'Press de hombro en Smith': 'Smith machine shoulder press', 'Curl en máquina predicador': 'Machine preacher curl',
  'Curl martillo en polea': 'Cable hammer curl rope', 'Press francés con barra Z': 'EZ bar skull crusher',
  'Elevación de talones con mancuernas': 'Dumbbell calf raise', 'Elevación de talones en prensa': 'Leg press calf raise',
  'Remo T': 'T-bar row', 'Remo con mancuernas inclinado': 'Bent-over dumbbell row', 'Encogimientos con barra': 'Barbell shrug',
  'Encogimientos en polea': 'Cable shrug', 'Subidas al banco con mancuernas': 'Dumbbell step-up', 'Crunch en máquina': 'Ab crunch machine',
  'Jalón al pecho': 'Lat pulldown', 'Press banca': 'Bench press', 'Press inclinado': 'Incline bench press', 'Curl predicador': 'Preacher curl',
  'Prensa': 'Leg press', 'Fondos': 'Dips', 'Curl martillo': 'Hammer curl',
  'Caminadora': 'Treadmill', 'Bicicleta estática': 'Stationary bike exercise bike', 'Bicicleta reclinada': 'Recumbent bike',
  'Elíptica': 'Elliptical', 'Escaladora': 'Stair climber stairmaster', 'Máquina de remo': 'Rowing machine rower', 'Saltar la cuerda': 'Jump rope',
};
const ALIASES = {
  'Extensiones de espalda': 'espalda baja lumbar lumbares hiperextensiones banco romano', 'Crunch en máquina': 'abdominal abdominales maquina de abdomen',
  'Crunch abdominal': 'abdominales abdomen', 'Ab crunch': 'abdominales abdomen', 'Leg raises': 'abdominales abdomen bajo',
  'Elevación de piernas en banco': 'abdominales abdomen bajo', 'Flexiones': 'lagartijas', 'Pull-up': 'barra fija', 'Squat': 'sentadilla libre',
  'Prensa': 'prensa de piernas', 'Hip abduction': 'gluteo medio', 'Standing calf raise': 'pantorrillas', 'Elevación de talones sentado': 'pantorrillas',
  'Elevación de talones con mancuernas': 'pantorrillas', 'Elevación de talones en prensa': 'pantorrillas', 'Shrugs': 'trapecio',
  'Hip thrust con barra': 'empuje de cadera', 'Remo T': 'remo en t',
  'Caminadora': 'correr caminar trotar cinta', 'Bicicleta estática': 'bici spinning', 'Bicicleta reclinada': 'bici',
  'Escaladora': 'escaleras', 'Máquina de remo': 'remo ergometro', 'Saltar la cuerda': 'comba brincar',
};
const ENGLISH_BY_KEY = new Map(Object.entries(ENGLISH).map(([k, v]) => [normalizedName(k), v]));
const ALIASES_BY_KEY = new Map(Object.entries(ALIASES).map(([k, v]) => [normalizedName(k), v]));
/** Texto extra para encontrar un ejercicio en español o en inglés. */
export const searchAliases = (name) => {
  const key = normalizedName(name ?? '');
  return [spanishName(name), ENGLISH_BY_KEY.get(key), ALIASES_BY_KEY.get(key)].filter(Boolean).join(' ');
};

// Catálogo: ejercicios que se agregan a la biblioteca al elegirlos (en el buscador o como variación).
// [nombre, músculo, equipo, tipo de carga, reps por lado]
export const ALT_LIBRARY = [
  ['Aperturas con mancuernas', 'Pecho', 'Mancuernas', 'dumbbellPerHand', false],
  ['Cruce de poleas', 'Pecho', 'Polea', 'cable', false],
  ['Flexiones', 'Pecho', 'Peso corporal', 'bodyweight', false],
  ['Press de pecho en máquina', 'Pecho', 'Máquina', 'machine', false],
  ['Press de banca con mancuernas', 'Pecho', 'Mancuernas', 'dumbbellPerHand', false],
  ['Press inclinado con mancuerna', 'Pecho', 'Mancuernas', 'dumbbellPerHand', false],
  ['Remo con mancuerna a una mano', 'Espalda', 'Mancuerna', 'dumbbellPerHand', true],
  ['Remo invertido', 'Espalda', 'Barra baja o Smith', 'bodyweight', false],
  ['Dominadas supinas', 'Espalda', 'Barra de dominadas', 'bodyweight', false],
  ['Sentadilla búlgara con mancuernas', 'Cuádriceps', 'Mancuernas y banco', 'dumbbellPerHand', true],
  ['Zancadas con mancuernas', 'Cuádriceps', 'Mancuernas', 'dumbbellPerHand', true],
  ['Sentadilla con mancuernas', 'Cuádriceps', 'Mancuernas', 'dumbbellPerHand', false],
  ['Sentadilla goblet', 'Cuádriceps', 'Mancuerna', 'totalWeight', false],
  ['Peso muerto rumano con mancuernas', 'Isquiotibiales', 'Mancuernas', 'dumbbellPerHand', false],
  ['Hip thrust con barra', 'Glúteos', 'Barra y banco', 'totalWeight', false],
  ['Puente de glúteo a una pierna', 'Glúteos', 'Peso corporal', 'bodyweight', true],
  ['Curl femoral con pelota', 'Isquiotibiales', 'Pelota de estabilidad', 'noExternalLoad', false],
  ['Extensiones de espalda', 'Espalda baja', 'Banco romano', 'bodyweight', false],
  ['Elevación de talones sentado', 'Gemelos', 'Máquina', 'machine', false],
  ['Press de hombro con mancuernas', 'Hombros', 'Mancuernas', 'dumbbellPerHand', false],
  ['Elevación lateral con banda', 'Hombros', 'Banda elástica', 'noExternalLoad', false],
  ['Face pull', 'Hombro posterior', 'Polea', 'cable', false],
  ['Pájaro con mancuernas', 'Hombro posterior', 'Mancuernas', 'dumbbellPerHand', false],
  ['Extensión de tríceps con mancuerna', 'Tríceps', 'Mancuerna', 'totalWeight', false],
  ['Jalón de tríceps en polea', 'Tríceps', 'Polea con cuerda', 'cable', false],
  ['Fondos en banco', 'Tríceps', 'Banco', 'bodyweight', false],
  ['Curl con barra', 'Bíceps', 'Barra', 'totalWeight', false],
  ['Curl con mancuernas', 'Bíceps', 'Mancuernas', 'dumbbellPerHand', false],
  ['Aductores con banda', 'Aductores', 'Banda elástica', 'noExternalLoad', true],
  ['Crunch abdominal', 'Abdomen', 'Peso corporal', 'bodyweight', false],
  ['Crunch en máquina', 'Abdomen', 'Máquina', 'machine', false],
  ['Elevación de piernas en banco', 'Abdomen', 'Banco', 'bodyweight', false],
  ['Press banca en Smith', 'Pecho', 'Máquina Smith', 'machine', false],
  ['Press inclinado en Smith', 'Pecho', 'Máquina Smith', 'machine', false],
  ['Press inclinado en máquina', 'Pecho', 'Máquina', 'machine', false],
  ['Press de pecho en polea', 'Pecho', 'Polea', 'cable', false],
  ['Aperturas inclinadas con mancuernas', 'Pecho', 'Mancuernas', 'dumbbellPerHand', false],
  ['Aperturas en polea baja', 'Pecho', 'Polea', 'cable', false],
  ['Sentadilla frontal', 'Cuádriceps', 'Barra', 'totalWeight', false],
  ['Press militar con barra', 'Hombros', 'Barra', 'totalWeight', false],
  ['Press de hombro en Smith', 'Hombros', 'Máquina Smith', 'machine', false],
  ['Curl en máquina predicador', 'Bíceps', 'Máquina', 'machine', false],
  ['Curl martillo en polea', 'Bíceps', 'Polea con cuerda', 'cable', false],
  ['Press francés con barra Z', 'Tríceps', 'Barra Z', 'totalWeight', false],
  ['Elevación de talones con mancuernas', 'Gemelos', 'Mancuernas', 'dumbbellPerHand', false],
  ['Elevación de talones en prensa', 'Gemelos', 'Prensa', 'machine', false],
  ['Remo T', 'Espalda', 'Barra T', 'totalWeight', false],
  ['Remo con mancuernas inclinado', 'Espalda', 'Mancuernas', 'dumbbellPerHand', false],
  ['Encogimientos con barra', 'Trapecio', 'Barra', 'totalWeight', false],
  ['Encogimientos en polea', 'Trapecio', 'Polea', 'cable', false],
  ['Subidas al banco con mancuernas', 'Cuádriceps', 'Mancuernas y banco', 'dumbbellPerHand', true],
  // Cardio: se anotan minutos y, si se quiere, distancia.
  ['Caminadora', 'Cardio', 'Caminadora', 'cardio', false],
  ['Bicicleta estática', 'Cardio', 'Bicicleta', 'cardio', false],
  ['Bicicleta reclinada', 'Cardio', 'Bicicleta reclinada', 'cardio', false],
  ['Elíptica', 'Cardio', 'Elíptica', 'cardio', false],
  ['Escaladora', 'Cardio', 'Escaladora', 'cardio', false],
  ['Máquina de remo', 'Cardio', 'Máquina de remo', 'cardio', false],
  ['Saltar la cuerda', 'Cardio', 'Cuerda', 'cardio', false],
];
const ALT_BY_KEY = new Map(ALT_LIBRARY.map((row) => [normalizedName(row[0]), row]));
export const altEntry = (name) => ALT_BY_KEY.get(normalizedName(name)) ?? null;

// Ejercicio → variaciones con otro equipo (la más parecida primero). La relación funciona en ambos sentidos.
const VARIATIONS = {
  'Press banca': ['Press de banca con mancuernas', 'Press banca en Smith', 'Press de pecho en máquina', 'Press de pecho en polea', 'Flexiones'],
  'Press inclinado': ['Press inclinado con mancuerna', 'Press inclinado en Smith', 'Press inclinado en máquina', 'Flexiones'],
  'Press inclinado con mancuerna': ['Press inclinado en Smith', 'Press inclinado en máquina'],
  'Pec fly': ['Aperturas con mancuernas', 'Aperturas inclinadas con mancuernas', 'Cruce de poleas', 'Aperturas en polea baja'],
  'Fondos': ['Fondos en banco', 'Flexiones', 'Press de banca con mancuernas'],
  'Pull-up': ['Dominadas supinas', 'Jalón al pecho', 'Remo invertido'],
  'Jalón al pecho': ['Close-grip lat pulldown', 'Dominadas supinas', 'Remo con mancuerna a una mano'],
  'Close-grip lat pulldown': ['Dominadas supinas', 'Remo con mancuerna a una mano'],
  'Pendlay row': ['Remo con mancuernas inclinado', 'Remo T', 'Remo con mancuerna a una mano', 'Remo invertido'],
  'Chest-supported machine row': ['Remo T', 'Remo con mancuerna a una mano', 'Close-grip cable row'],
  'Close-grip cable row': ['Remo con mancuerna a una mano', 'Remo invertido'],
  'Reverse butterfly': ['Face pull', 'Pájaro con mancuernas'],
  'Cable lateral raise': ['Dumbbell lateral raise', 'Elevación lateral con banda'],
  'Dumbbell lateral raise': ['Elevación lateral con banda'],
  'Shoulder press': ['Press de hombro con mancuernas', 'Press militar con barra', 'Press de hombro en Smith'],
  'Shrugs': ['Encogimientos con barra', 'Encogimientos en polea'],
  'Cable overhead triceps extension': ['Extensión de tríceps con mancuerna', 'Press francés con barra Z', 'Jalón de tríceps en polea', 'Fondos en banco'],
  'Bayesian curl': ['Curl con mancuernas', 'Curl con barra', 'Curl martillo'],
  'Curl predicador': ['Curl en máquina predicador', 'Curl con barra', 'Curl con mancuernas'],
  'Curl martillo': ['Curl martillo en polea', 'Curl con mancuernas', 'Curl con barra'],
  'Squat': ['Sentadilla frontal', 'Smith squat', 'Sentadilla goblet', 'Sentadilla con mancuernas', 'Prensa'],
  'Pendulum squat': ['Hack squat', 'Prensa', 'Sentadilla búlgara con mancuernas'],
  'Hack squat': ['Prensa', 'Smith squat', 'Sentadilla goblet'],
  'Smith squat': ['Hack squat', 'Sentadilla goblet'],
  'Sentadilla máquina hammer': ['Hack squat', 'Prensa', 'Smith squat'],
  'Prensa': ['Sentadilla búlgara con mancuernas', 'Zancadas con mancuernas', 'Subidas al banco con mancuernas'],
  'Goblet saquat': ['Sentadilla con mancuernas', 'Squat', 'Sentadilla búlgara con mancuernas'],
  'Leg extension': ['Sentadilla búlgara con mancuernas', 'Zancadas con mancuernas', 'Subidas al banco con mancuernas'],
  'Romanian deadlift': ['Peso muerto rumano con mancuernas', 'Extensiones de espalda', 'Hip thrust con barra'],
  'Lying leg curl': ['Seated leg curl', 'Curl femoral con pelota', 'Peso muerto rumano con mancuernas'],
  'Seated leg curl': ['Curl femoral con pelota'],
  'Sitting Leg Curl': ['Lying leg curl', 'Curl femoral con pelota'],
  'Hip abduction': ['Puente de glúteo a una pierna', 'Hip thrust con barra'],
  'Hip adduction': ['Aductores con banda', 'Zancadas con mancuernas'],
  'Standing calf raise': ['Elevación de talones con mancuernas', 'Elevación de talones en prensa', 'Elevación de talones sentado'],
  'Ab crunch': ['Crunch en máquina', 'Crunch abdominal', 'Elevación de piernas en banco'],
  'Crunch en máquina': ['Crunch abdominal', 'Elevación de piernas en banco'],
  'Leg raises': ['Elevación de piernas en banco', 'Crunch abdominal'],
  'Caminadora': ['Elíptica', 'Bicicleta estática', 'Escaladora'],
  'Bicicleta estática': ['Bicicleta reclinada', 'Elíptica'],
  'Máquina de remo': ['Elíptica', 'Saltar la cuerda'],
};
const LINKS = new Map();
const link = (a, b) => {
  const key = normalizedName(a);
  if (!LINKS.has(key)) LINKS.set(key, []);
  if (normalizedName(a) !== normalizedName(b) && !LINKS.get(key).some((n) => normalizedName(n) === normalizedName(b))) LINKS.get(key).push(b);
};
for (const [base, list] of Object.entries(VARIATIONS)) for (const v of list) { link(base, v); link(v, base); }
/** Nombres de las variaciones de un ejercicio (incluye las relaciones inversas). */
export const variationNames = (name) => LINKS.get(normalizedName(name ?? '')) ?? [];
