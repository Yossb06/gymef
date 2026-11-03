// Guías breves de técnica para la biblioteca inicial (texto propio; funcionan sin conexión).
// Clave: nombre normalizado del ejercicio. steps = cómo hacerlo; tips = errores comunes o claves.
import { normalizedName } from './domain.js';

const GUIDES = {
  'Press inclinado': {
    steps: ['Banco a 30–45°. Pies firmes en el suelo y omóplatos juntos y hacia abajo.', 'Baja la barra o las mancuernas controlando hasta la parte alta del pecho.', 'Empuja hacia arriba y un poco hacia atrás, sin despegar la espalda del banco.'],
    tips: ['Codos a unos 45° del cuerpo, no abiertos en cruz.', 'Muñecas rectas, encima de los codos.'],
  },
  'Pec fly': {
    steps: ['Siéntate con la espalda pegada al respaldo y los codos ligeramente flexionados.', 'Junta los brazos al frente en un arco amplio, apretando el pecho.', 'Regresa despacio hasta sentir estiramiento en el pecho, sin pasar de la línea de los hombros.'],
    tips: ['Mantén la misma flexión de codo todo el recorrido: no es un press.', 'No dejes que los hombros se vayan hacia adelante.'],
  },
  'Press banca': {
    steps: ['Acuéstate con los ojos bajo la barra, omóplatos juntos y una ligera curva en la espalda baja.', 'Agarre un poco más ancho que los hombros. Baja la barra a la mitad del pecho.', 'Empuja con fuerza manteniendo glúteos y espalda alta pegados al banco.'],
    tips: ['Usa un compañero o seguros si vas pesado.', 'No rebotes la barra en el pecho.'],
  },
  'Pull-up': {
    steps: ['Cuélgate con las manos un poco más abiertas que los hombros y el cuerpo firme.', 'Lleva los codos hacia abajo y atrás hasta que la barbilla pase la barra.', 'Baja controlado hasta estirar casi por completo los brazos.'],
    tips: ['Evita balancearte o patear.', 'Si aún no sale una completa, usa banda o máquina asistida.'],
  },
  'Jalón al pecho': {
    steps: ['Ajusta el soporte de muslos para no levantarte. Pecho alto.', 'Jala la barra hacia la parte alta del pecho llevando los codos hacia abajo.', 'Sube despacio hasta estirar los brazos y sentir la espalda.'],
    tips: ['No te eches muy atrás para mover más peso.', 'Piensa en llevar los codos a los bolsillos.'],
  },
  'Cable lateral raise': {
    steps: ['Polea baja a un lado; toma el agarre con la mano contraria, cruzando frente al cuerpo.', 'Sube el brazo hacia el costado hasta la altura del hombro, codo ligeramente flexionado.', 'Baja lento resistiendo la polea.'],
    tips: ['Sin encoger el hombro hacia la oreja.', 'El codo guía el movimiento, no la mano.'],
  },
  'Dumbbell lateral raise': {
    steps: ['De pie, mancuernas a los lados y una ligera inclinación al frente.', 'Eleva los brazos hacia los costados hasta la altura de los hombros.', 'Baja controlado, sin dejar caer el peso.'],
    tips: ['Usa un peso que puedas controlar sin balanceo.', 'Codos un poco flexionados y por delante del cuerpo.'],
  },
  'Pendlay row': {
    steps: ['Barra en el suelo. Torso casi paralelo al suelo, espalda recta, rodillas flexionadas.', 'Jala la barra explosivo hacia la parte baja del pecho.', 'Regrésala al suelo en cada repetición y vuelve a fijar la posición.'],
    tips: ['La espalda no se redondea ni se levanta para ayudar.', 'Aprieta los omóplatos arriba.'],
  },
  'Cable overhead triceps extension': {
    steps: ['De espaldas a la polea, cuerda por detrás de la cabeza y un pie adelantado.', 'Extiende los codos llevando la cuerda al frente y arriba.', 'Regresa despacio hasta sentir estiramiento detrás del brazo.'],
    tips: ['Los codos se quedan apuntando al frente, sin abrirse.', 'El torso no se mueve.'],
  },
  'Bayesian curl': {
    steps: ['De espaldas a la polea baja, brazo estirado un poco por detrás del cuerpo.', 'Flexiona el codo subiendo la mano hacia el hombro.', 'Baja despacio hasta estirar todo el brazo.'],
    tips: ['El codo se queda fijo, sin ir hacia adelante.', 'Da un paso al frente para tener tensión desde abajo.'],
  },
  'Curl predicador': {
    steps: ['Apoya la parte de atrás del brazo en el cojín, axila pegada al borde.', 'Sube la barra o mancuerna flexionando el codo.', 'Baja controlado hasta casi estirar, sin bloquear de golpe.'],
    tips: ['La parte baja es la más exigente: no la sueltes.', 'No despegues el brazo del cojín.'],
  },
  'Lying leg curl': {
    steps: ['Boca abajo, rodillas justo fuera del borde del banco y rodillo sobre los tobillos.', 'Flexiona las rodillas llevando los talones hacia los glúteos.', 'Baja despacio hasta casi estirar.'],
    tips: ['La cadera se queda pegada al banco.', 'Sin impulso ni rebote abajo.'],
  },
  'Squat': {
    steps: ['Pies al ancho de los hombros, puntas un poco hacia afuera. Barra sobre la espalda alta.', 'Baja llevando la cadera atrás y abajo, rodillas en la línea de los pies.', 'Sube empujando el suelo, con el pecho alto.'],
    tips: ['Talones siempre apoyados.', 'Baja hasta donde mantengas la espalda neutra.'],
  },
  'Pendulum squat': {
    steps: ['Espalda pegada al respaldo, pies a la mitad de la plataforma.', 'Baja profundo controlando, rodillas hacia adelante.', 'Empuja con todo el pie para subir.'],
    tips: ['No bloquees las rodillas arriba.', 'Mantén la espalda baja pegada al respaldo.'],
  },
  'Hack squat': {
    steps: ['Espalda y hombros contra los soportes, pies al ancho de los hombros.', 'Baja hasta que los muslos queden al menos paralelos.', 'Sube empujando con todo el pie.'],
    tips: ['Pies más abajo = más cuádriceps; más arriba = más glúteo.', 'Sin despegar los talones.'],
  },
  'Prensa': {
    steps: ['Espalda y glúteos pegados al asiento, pies al ancho de los hombros.', 'Baja la plataforma flexionando las rodillas hacia el pecho.', 'Empuja hasta casi estirar, sin bloquear las rodillas.'],
    tips: ['Si la cadera se despega del asiento, bajaste demasiado.', 'Rodillas en línea con las puntas de los pies.'],
  },
  'Romanian deadlift': {
    steps: ['De pie con la barra o mancuernas, rodillas un poco flexionadas.', 'Lleva la cadera hacia atrás bajando el peso pegado a las piernas.', 'Sube apretando glúteos cuando sientas estiramiento atrás de los muslos.'],
    tips: ['Espalda recta todo el tiempo: el movimiento es de cadera.', 'El peso no se separa de las piernas.'],
  },
  'Leg extension': {
    steps: ['Rodillas alineadas con el eje de la máquina; el rodillo sobre los tobillos.', 'Extiende las piernas hasta casi estirar y aprieta el muslo.', 'Baja despacio.'],
    tips: ['Agárrate de las manijas para no levantarte del asiento.', 'Sin patadas ni golpes al bajar.'],
  },
  'Hip abduction': {
    steps: ['Siéntate con la espalda apoyada y las almohadillas por fuera de las rodillas.', 'Abre las piernas hacia afuera de forma controlada.', 'Regresa despacio sin dejar que choquen las placas.'],
    tips: ['Inclinarte un poco al frente trabaja más el glúteo.', 'Mantén una pausa breve con las piernas abiertas.'],
  },
  'Standing calf raise': {
    steps: ['Puntas de los pies en un escalón o plataforma, talones al aire.', 'Baja los talones hasta sentir estiramiento.', 'Sube lo más alto posible y aguanta un segundo.'],
    tips: ['Rodillas casi estiradas y sin rebotar.', 'Recorrido completo vale más que más peso.'],
  },
  'Fondos': {
    steps: ['Apóyate en las paralelas con los brazos estirados y el cuerpo firme.', 'Baja flexionando los codos hasta que los hombros queden a la altura de los codos.', 'Empuja hacia arriba hasta estirar los brazos.'],
    tips: ['Inclinarte al frente trabaja más pecho; recto, más tríceps.', 'Si te molesta el hombro, no bajes tanto.'],
  },
  'Shoulder press': {
    steps: ['Sentado con la espalda apoyada, peso a la altura de los hombros.', 'Empuja hacia arriba hasta casi estirar los brazos.', 'Baja controlado hasta la altura de las orejas o la barbilla.'],
    tips: ['No arquees de más la espalda baja.', 'Antebrazos verticales, debajo de las muñecas.'],
  },
  'Close-grip lat pulldown': {
    steps: ['Agarre cerrado (triángulo o barra estrecha), pecho alto.', 'Jala hacia la parte alta del pecho llevando los codos pegados al cuerpo.', 'Sube despacio hasta estirar la espalda.'],
    tips: ['Sin balancear el torso.', 'Siente cómo se estira la espalda arriba.'],
  },
  'Chest-supported machine row': {
    steps: ['Pecho apoyado en el cojín, brazos estirados al frente.', 'Jala las manijas llevando los codos hacia atrás.', 'Aprieta los omóplatos y regresa despacio.'],
    tips: ['El pecho no se despega del cojín.', 'Sin encoger los hombros.'],
  },
  'Close-grip cable row': {
    steps: ['Sentado, rodillas un poco flexionadas, espalda recta y agarre cerrado.', 'Jala hacia el abdomen llevando los codos atrás.', 'Estira los brazos al frente dejando que los omóplatos se separen.'],
    tips: ['El torso apenas se mueve: no remes con la espalda baja.', 'Pausa breve con el agarre pegado al cuerpo.'],
  },
  'Reverse butterfly': {
    steps: ['Pecho contra el respaldo de la máquina, brazos al frente.', 'Abre los brazos hacia atrás en un arco amplio.', 'Regresa despacio sin que choquen las placas.'],
    tips: ['Usa poco peso y siente la parte de atrás del hombro.', 'Codos ligeramente flexionados y fijos.'],
  },
  'Shrugs': {
    steps: ['De pie con mancuernas o barra, brazos estirados.', 'Sube los hombros hacia las orejas lo más alto que puedas.', 'Aguanta un segundo y baja despacio.'],
    tips: ['Sube recto, sin girar los hombros en círculo.', 'Los brazos no se doblan.'],
  },
  'Curl martillo': {
    steps: ['De pie con mancuernas, palmas mirándose entre sí.', 'Sube flexionando los codos sin girar las muñecas.', 'Baja controlado hasta estirar.'],
    tips: ['Codos pegados al cuerpo.', 'Sin balanceo del torso.'],
  },
  'Seated leg curl': {
    steps: ['Rodillas alineadas con el eje y el rodillo de arriba bien ajustado sobre los muslos.', 'Lleva los talones hacia abajo y atrás.', 'Regresa despacio hasta casi estirar.'],
    tips: ['Inclinarte un poco al frente estira más el músculo.', 'Sin impulso.'],
  },
  'Smith squat': {
    steps: ['Barra sobre la espalda alta, pies un poco adelantados respecto a la barra.', 'Baja controlado hasta muslos paralelos o un poco más.', 'Sube empujando con todo el pie.'],
    tips: ['Pon los seguros de la máquina a la altura correcta.', 'Rodillas en línea con los pies.'],
  },
  'Hip adduction': {
    steps: ['Siéntate con las almohadillas por dentro de las rodillas.', 'Cierra las piernas apretando la parte interna del muslo.', 'Abre despacio hasta sentir estiramiento.'],
    tips: ['No dejes que las placas choquen al abrir.', 'Mantén la espalda apoyada.'],
  },
};

const BY_NAME = new Map(Object.entries(GUIDES).map(([name, guide]) => [normalizedName(name), guide]));

/** Guía del ejercicio de la biblioteca (por nombre), o null si es un ejercicio propio. */
export const guideFor = (exercise) => (exercise ? BY_NAME.get(normalizedName(exercise.name)) ?? null : null);

/** Búsqueda de video de técnica (solo necesita internet al tocarla). */
export const videoURL = (exercise) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise.name} técnica correcta ejercicio`)}`;
