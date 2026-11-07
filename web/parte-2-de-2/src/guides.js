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


// Variaciones con otro equipo (ver catalog.js).
const VARIATION_GUIDES = {
  'Aperturas con mancuernas': { steps: ['Acostado en banco plano, mancuernas arriba del pecho con las palmas enfrentadas.', 'Abre los brazos en arco con los codos un poco flexionados hasta sentir el pecho estirado.', 'Cierra el arco apretando el pecho hasta juntar las mancuernas.'], tips: ['No bajes más allá de la línea de los hombros.'] },
  'Aperturas inclinadas con mancuernas': { steps: ['Banco a 30°, mancuernas arriba con las palmas enfrentadas.', 'Abre los brazos en arco con los codos un poco flexionados.', 'Cierra apretando la parte alta del pecho.'], tips: ['Peso ligero y movimiento controlado.'] },
  'Cruce de poleas': { steps: ['Poleas altas, un paso al frente y el torso un poco inclinado.', 'Junta las manos frente al pecho en un arco amplio.', 'Regresa despacio hasta sentir el pecho estirado.'], tips: ['Codos un poco flexionados y fijos.'] },
  'Aperturas en polea baja': { steps: ['Poleas abajo, un paso al frente y pecho alto.', 'Sube las manos en arco hasta la altura de los hombros, juntándolas.', 'Baja despacio por el mismo camino.'], tips: ['Enfoca el esfuerzo en la parte alta del pecho.'] },
  'Flexiones': { steps: ['Manos un poco más abiertas que los hombros y el cuerpo recto de cabeza a talones.', 'Baja el pecho hasta casi tocar el suelo con los codos a unos 45°.', 'Empuja hasta estirar los brazos.'], tips: ['Si cuestan, apoya las rodillas o las manos en un banco.'] },
  'Press de pecho en máquina': { steps: ['Ajusta el asiento para que las manijas queden a la altura del pecho.', 'Empuja hasta casi estirar los brazos.', 'Regresa despacio sin dejar que las placas choquen.'], tips: ['Espalda pegada al respaldo todo el tiempo.'] },
  'Press de banca con mancuernas': { steps: ['Acostado en banco plano, mancuernas a los lados del pecho.', 'Empuja hacia arriba juntándolas un poco al final.', 'Baja controlado hasta sentir el pecho estirado.'], tips: ['Omóplatos juntos y pies firmes en el suelo.'] },
  'Press inclinado con mancuerna': { steps: ['Banco a 30–45°, mancuernas a la altura del pecho alto.', 'Empuja hacia arriba juntándolas un poco.', 'Baja controlado hasta sentir estiramiento.'], tips: ['Codos a unos 45° del cuerpo.'] },
  'Press banca en Smith': { steps: ['Banco plano bajo la barra, que debe bajar a la mitad del pecho.', 'Gira la barra para soltar los seguros y baja controlado.', 'Empuja hasta casi estirar y vuelve a trabar al terminar.'], tips: ['Ajusta los topes de seguridad antes de empezar.'] },
  'Press inclinado en Smith': { steps: ['Banco a 30–45° bajo la barra, que baja a la parte alta del pecho.', 'Suelta los seguros y baja controlado.', 'Empuja hacia arriba y traba al terminar.'], tips: ['Pon los topes un poco arriba del pecho.'] },
  'Press inclinado en máquina': { steps: ['Ajusta el asiento para que las manijas queden a la altura del pecho alto.', 'Empuja hacia arriba y al frente.', 'Regresa despacio.'], tips: ['Mantén el pecho alto y la espalda apoyada.'] },
  'Press de pecho en polea': { steps: ['Poleas a la altura del pecho, un pie adelantado.', 'Empuja las manijas al frente hasta casi estirar los brazos.', 'Regresa despacio hasta sentir el pecho estirado.'], tips: ['El torso no se mueve; trabajan los brazos y el pecho.'] },
  'Remo con mancuerna a una mano': { steps: ['Una mano y una rodilla en el banco, espalda recta.', 'Jala la mancuerna hacia la cadera llevando el codo atrás.', 'Baja controlado hasta estirar el brazo.'], tips: ['No gires el torso para subir más peso.'] },
  'Remo con mancuernas inclinado': { steps: ['De pie, torso inclinado casi paralelo al suelo y espalda recta.', 'Jala las dos mancuernas hacia la cadera.', 'Baja controlado.'], tips: ['Rodillas un poco flexionadas y espalda baja firme.'] },
  'Remo T': { steps: ['Pies a los lados de la barra, torso inclinado y espalda recta.', 'Jala el agarre hacia el pecho bajo llevando los codos atrás.', 'Baja hasta estirar los brazos sin redondear la espalda.'], tips: ['Aprieta los omóplatos arriba.'] },
  'Remo invertido': { steps: ['Cuélgate de una barra baja con el cuerpo recto y los talones en el suelo.', 'Lleva el pecho hacia la barra juntando los omóplatos.', 'Baja controlado.'], tips: ['Entre más horizontal estés, más difícil.'] },
  'Dominadas supinas': { steps: ['Cuélgate con las palmas hacia ti, al ancho de los hombros.', 'Sube hasta pasar la barbilla sobre la barra.', 'Baja controlado hasta casi estirar los brazos.'], tips: ['Trabajan más bíceps que las dominadas normales.'] },
  'Sentadilla búlgara con mancuernas': { steps: ['Un pie adelante y el empeine del otro sobre un banco detrás de ti.', 'Baja la rodilla de atrás hacia el suelo con el torso firme.', 'Sube empujando con el pie de adelante.'], tips: ['Haz todas las repeticiones de un lado y luego cambia.'] },
  'Zancadas con mancuernas': { steps: ['De pie con mancuernas a los lados.', 'Da un paso largo al frente y baja hasta que la rodilla de atrás casi toque el suelo.', 'Empuja con el pie de adelante para volver.'], tips: ['Rodilla de adelante en línea con el pie.'] },
  'Subidas al banco con mancuernas': { steps: ['Frente a un banco o cajón, mancuernas a los lados.', 'Sube un pie completo al banco y empuja con esa pierna para subir.', 'Baja controlado con la misma pierna.'], tips: ['No te impulses con la pierna de abajo.'] },
  'Sentadilla con mancuernas': { steps: ['De pie con mancuernas a los lados, pies al ancho de los hombros.', 'Baja llevando la cadera atrás con el pecho alto.', 'Sube empujando el suelo.'], tips: ['Talones apoyados todo el tiempo.'] },
  'Sentadilla goblet': { steps: ['Sostén una mancuerna vertical pegada al pecho.', 'Baja entre las piernas con los codos por dentro de las rodillas.', 'Sube con el pecho alto.'], tips: ['Muy buena para aprender a sentadillar.'] },
  'Sentadilla frontal': { steps: ['Barra apoyada al frente de los hombros, codos altos.', 'Baja con el torso muy erguido.', 'Sube empujando con todo el pie.'], tips: ['Si cuesta el agarre, cruza los brazos sobre la barra.'] },
  'Peso muerto rumano con mancuernas': { steps: ['De pie con mancuernas al frente de los muslos, rodillas un poco flexionadas.', 'Lleva la cadera atrás bajando las mancuernas pegadas a las piernas.', 'Sube apretando los glúteos.'], tips: ['Espalda recta: el movimiento es de cadera.'] },
  'Hip thrust con barra': { steps: ['Espalda alta apoyada en un banco, barra sobre la cadera con un cojín.', 'Empuja la cadera hacia arriba hasta alinear el cuerpo.', 'Aprieta los glúteos un segundo y baja.'], tips: ['Barbilla hacia el pecho y pies firmes.'] },
  'Puente de glúteo a una pierna': { steps: ['Boca arriba, una rodilla flexionada y la otra pierna estirada.', 'Sube la cadera empujando con el talón apoyado.', 'Baja despacio.'], tips: ['Haz un lado completo y luego el otro.'] },
  'Curl femoral con pelota': { steps: ['Boca arriba con los talones sobre la pelota y la cadera arriba.', 'Lleva la pelota hacia ti flexionando las rodillas.', 'Estira despacio sin bajar la cadera.'], tips: ['Brazos en el suelo para mantener el equilibrio.'] },
  'Extensiones de espalda': { steps: ['En el banco romano, cadera apoyada y talones sujetos.', 'Baja el torso doblando la cadera.', 'Sube hasta alinear el cuerpo, sin pasarte hacia atrás.'], tips: ['Brazos cruzados en el pecho; con disco para más peso.'] },
  'Elevación de talones sentado': { steps: ['Sentado con las almohadillas sobre los muslos y las puntas en la plataforma.', 'Baja los talones hasta sentir estiramiento.', 'Sube lo más alto posible.'], tips: ['Trabaja más el sóleo (parte baja de la pantorrilla).'] },
  'Elevación de talones con mancuernas': { steps: ['De pie con mancuernas a los lados, puntas en un escalón.', 'Baja los talones hasta sentir estiramiento.', 'Sube lo más alto posible y aguanta un segundo.'], tips: ['Recorrido completo, sin rebotes.'] },
  'Elevación de talones en prensa': { steps: ['En la prensa, solo las puntas de los pies en la orilla de la plataforma.', 'Empuja con las puntas estirando los tobillos.', 'Regresa despacio hasta sentir estiramiento.'], tips: ['No dobles las rodillas; no sueltes los seguros si no hace falta.'] },
  'Press de hombro con mancuernas': { steps: ['Sentado con respaldo, mancuernas a la altura de los hombros.', 'Empuja hacia arriba hasta casi juntar las mancuernas.', 'Baja controlado.'], tips: ['Sin arquear de más la espalda.'] },
  'Press militar con barra': { steps: ['De pie o sentado, barra a la altura de la clavícula.', 'Empuja hacia arriba pasando la barra cerca de la cara.', 'Baja controlado al punto de inicio.'], tips: ['Aprieta glúteos y abdomen para no arquear la espalda.'] },
  'Press de hombro en Smith': { steps: ['Banco con respaldo bajo la barra, que baja frente a la cara.', 'Suelta los seguros y empuja hasta casi estirar.', 'Baja controlado y traba al terminar.'], tips: ['Ajusta los topes antes de empezar.'] },
  'Elevación lateral con banda': { steps: ['Pisa la banda y toma un extremo en cada mano.', 'Sube los brazos a los lados hasta la altura de los hombros.', 'Baja despacio.'], tips: ['Para más tensión, pisa la banda con los pies más separados.'] },
  'Face pull': { steps: ['Polea alta con cuerda, toma un extremo en cada mano.', 'Jala hacia la cara separando las manos y llevando los codos atrás y arriba.', 'Regresa despacio.'], tips: ['Peso ligero: es para la parte de atrás del hombro.'] },
  'Pájaro con mancuernas': { steps: ['Pecho apoyado en un banco inclinado o torso inclinado de pie.', 'Abre los brazos hacia los lados con los codos un poco flexionados.', 'Baja despacio.'], tips: ['Usa poco peso y no encojas los hombros.'] },
  'Extensión de tríceps con mancuerna': { steps: ['Sostén una mancuerna con ambas manos detrás de la cabeza.', 'Estira los brazos hacia arriba.', 'Baja despacio hasta sentir estiramiento.'], tips: ['Codos apuntando al frente, sin abrirse.'] },
  'Press francés con barra Z': { steps: ['Acostado en banco, barra Z arriba con los brazos estirados.', 'Baja la barra hacia la frente doblando solo los codos.', 'Estira los brazos de nuevo.'], tips: ['Los codos no se mueven; usa un peso controlable.'] },
  'Jalón de tríceps en polea': { steps: ['Polea alta con cuerda, codos pegados al cuerpo.', 'Empuja hacia abajo hasta estirar los brazos, separando un poco la cuerda.', 'Sube despacio hasta que los codos queden a 90°.'], tips: ['Solo se mueven los antebrazos.'] },
  'Fondos en banco': { steps: ['Manos en la orilla de un banco detrás de ti, piernas al frente.', 'Baja doblando los codos hasta unos 90°.', 'Empuja hasta estirar los brazos.'], tips: ['Con las rodillas flexionadas es más fácil.'] },
  'Curl con barra': { steps: ['De pie, barra con las palmas hacia el frente al ancho de los hombros.', 'Sube flexionando los codos sin moverlos.', 'Baja controlado.'], tips: ['Sin balancear el torso.'] },
  'Curl con mancuernas': { steps: ['De pie con mancuernas a los lados, palmas hacia el frente.', 'Sube flexionando los codos, girando un poco la muñeca hacia afuera.', 'Baja controlado.'], tips: ['Puedes alternar brazos.'] },
  'Curl en máquina predicador': { steps: ['Ajusta el asiento para que la axila quede en el borde del cojín.', 'Flexiona los codos subiendo las manijas.', 'Baja despacio hasta casi estirar.'], tips: ['No despegues los brazos del cojín.'] },
  'Curl martillo en polea': { steps: ['Polea baja con cuerda, palmas enfrentadas.', 'Sube flexionando los codos pegados al cuerpo.', 'Baja despacio.'], tips: ['La polea mantiene tensión todo el recorrido.'] },
  'Encogimientos con barra': { steps: ['De pie con la barra al frente, brazos estirados.', 'Sube los hombros hacia las orejas.', 'Aguanta un segundo y baja despacio.'], tips: ['Sube recto, sin girar los hombros.'] },
  'Encogimientos en polea': { steps: ['Frente a una polea baja con barra o manijas.', 'Sube los hombros hacia las orejas.', 'Baja despacio.'], tips: ['Brazos estirados todo el tiempo.'] },
  'Aductores con banda': { steps: ['Banda atada a un poste a la altura del tobillo, por dentro de la pierna.', 'Lleva la pierna hacia la otra cruzando un poco.', 'Regresa despacio.'], tips: ['Sostente de algo para el equilibrio.'] },
  'Crunch abdominal': { steps: ['Boca arriba con las rodillas flexionadas y los pies en el suelo.', 'Sube los hombros del suelo apretando el abdomen.', 'Baja despacio.'], tips: ['No jales el cuello con las manos.'] },
  'Elevación de piernas en banco': { steps: ['Acostado en un banco, sujétate detrás de la cabeza.', 'Sube las piernas casi rectas hasta la vertical.', 'Baja despacio sin tocar el banco.'], tips: ['Espalda baja pegada al banco.'] },
};
for (const [name, guide] of Object.entries(VARIATION_GUIDES)) GUIDES[name] = guide;

const BY_NAME = new Map(Object.entries(GUIDES).map(([name, guide]) => [normalizedName(name), guide]));


// ---------- Músculos y cuidados por tipo de movimiento ----------
// primary: músculos principales; secondary: los que ayudan o estabilizan; safety: consejos para evitar lesiones.
const PATTERNS = {
  pressPecho: { about: 'Empuje horizontal: el ejercicio base para el pecho.', primary: ['Pecho (pectoral mayor)'], secondary: ['Tríceps', 'Hombro frontal'],
    safety: ['Con barra pesada usa los topes de seguridad o pide a alguien que te asista.', 'Codos a unos 45° del cuerpo, no en cruz: abrirlos de más sobrecarga el hombro.', 'Omóplatos juntos y hacia abajo todo el movimiento para proteger los hombros.', 'Baja controlado; rebotar la barra en el pecho puede lastimar costillas y hombros.'] },
  pressInclinado: { about: 'Press con el banco inclinado: enfatiza la parte alta del pecho.', primary: ['Pecho alto'], secondary: ['Hombro frontal', 'Tríceps'],
    safety: ['Inclinación de 30–45°: más inclinado se vuelve ejercicio de hombro.', 'Baja a la parte alta del pecho, nunca hacia el cuello.', 'Glúteos y espalda en el banco: no arquees para empujar más.'] },
  aperturas: { about: 'Aislamiento del pecho con un movimiento en arco.', primary: ['Pecho'], secondary: ['Hombro frontal'],
    safety: ['Peso moderado: con los brazos abiertos el hombro está en una posición delicada.', 'Codos un poco flexionados y fijos; no los estires por completo.', 'No bajes más allá de la línea de los hombros, sobre todo si te molestan.'] },
  fondos: { about: 'Empuje con tu peso en paralelas: pecho bajo y tríceps.', primary: ['Pecho bajo', 'Tríceps'], secondary: ['Hombro frontal'],
    safety: ['Baja solo hasta que el hombro quede a la altura del codo; más profundo estresa el hombro.', 'Hombros abajo, lejos de las orejas.', 'Si duele la parte frontal del hombro, cambia por flexiones o press con mancuernas.'] },
  fondosBanco: { about: 'Variante sencilla de fondos que trabaja sobre todo el tríceps.', primary: ['Tríceps'], secondary: ['Hombro frontal', 'Pecho'],
    safety: ['Manos cerca de la cadera y espalda pegada al banco.', 'No pases de 90° en el codo: más abajo carga mucho el frente del hombro.', 'Si tienes molestias de hombro, mejor usa el jalón de tríceps en polea.'] },
  jalonVertical: { about: 'Jalón vertical: da amplitud a la espalda.', primary: ['Dorsal ancho (espalda)'], secondary: ['Bíceps', 'Espalda media', 'Antebrazo'],
    safety: ['Empieza cada repetición bajando los hombros (lejos de las orejas) antes de doblar los codos.', 'Jala hacia el pecho, nunca por detrás de la nuca.', 'Baja controlado: soltarte de golpe tensa codos y hombros.'] },
  remo: { about: 'Jalón horizontal: grosor de la espalda y mejor postura.', primary: ['Espalda media (dorsal, romboides, trapecio medio)'], secondary: ['Bíceps', 'Hombro posterior', 'Espalda baja (estabiliza)'],
    safety: ['Espalda neutra: si se redondea, baja el peso.', 'En remos inclinados, rodillas un poco flexionadas y abdomen firme para cuidar la espalda baja.', 'Jala con los codos y aprieta los omóplatos; no uses el impulso del torso.'] },
  lateral: { about: 'Da anchura a los hombros.', primary: ['Hombro lateral (deltoides medio)'], secondary: ['Trapecio superior'],
    safety: ['Sube solo hasta la altura de los hombros.', 'Peso ligero y controlado: balancearte pasa el trabajo a la espalda y arriesga el hombro.', 'Si te molesta el hombro, gira un poco los pulgares hacia arriba.'] },
  posterior: { about: 'Parte de atrás del hombro: equilibra tanto ejercicio de empuje y mejora la postura.', primary: ['Hombro posterior'], secondary: ['Espalda media', 'Manguito rotador'],
    safety: ['Usa poco peso: son músculos pequeños.', 'No encojas los hombros hacia las orejas.', 'Hacerlo seguido ayuda a prevenir lesiones de hombro por el press.'] },
  pressHombro: { about: 'Empuje vertical: hombros fuertes y estables.', primary: ['Hombros (frontal y lateral)'], secondary: ['Tríceps', 'Trapecio superior', 'Abdomen (estabiliza)'],
    safety: ['No arquees la espalda baja: aprieta abdomen y glúteos o usa respaldo.', 'Baja a la altura de la barbilla u orejas; nunca por detrás de la nuca.', 'Si te duele el hombro al subir, usa mancuernas con las palmas enfrentadas.'] },
  trapecio: { about: 'Trabaja la parte alta de la espalda y el cuello.', primary: ['Trapecio superior'], secondary: ['Antebrazo (agarre)'],
    safety: ['Sube y baja en línea recta; no gires los hombros en círculo.', 'Cuello neutro, mirando al frente.', 'Usa correas si el agarre falla antes que el trapecio.'] },
  curl: { about: 'Flexión del codo: el ejercicio clásico de bíceps.', primary: ['Bíceps'], secondary: ['Braquial', 'Antebrazo'],
    safety: ['Codos quietos junto al cuerpo; balancearte carga la espalda baja.', 'Baja hasta casi estirar, sin dejar caer el peso de golpe.', 'Si la barra recta molesta las muñecas, usa barra Z o mancuernas.'] },
  curlMartillo: { about: 'Curl con las palmas enfrentadas: bíceps y antebrazo.', primary: ['Braquial y braquiorradial (antebrazo)'], secondary: ['Bíceps'],
    safety: ['Muñecas firmes y en línea con el antebrazo.', 'Sin balanceo del torso.', 'Buena opción si el curl normal molesta muñecas o codos.'] },
  triceps: { about: 'Extensión del codo: la parte de atrás del brazo.', primary: ['Tríceps'], secondary: ['Antebrazo (estabiliza)'],
    safety: ['Calienta los codos con una serie ligera: el tríceps carga mucho esa articulación.', 'Codos fijos, sin abrirlos.', 'En extensiones sobre la cabeza o press francés, baja controlado; si duele el codo, usa la polea.'] },
  sentadilla: { about: 'El ejercicio base de pierna: cuádriceps y glúteos.', primary: ['Cuádriceps', 'Glúteos'], secondary: ['Aductores', 'Isquiotibiales', 'Espalda baja y abdomen (estabilizan)'],
    safety: ['Rodillas siguiendo la dirección de los pies; que no se vayan hacia adentro.', 'Baja solo hasta donde mantengas la espalda neutra y los talones apoyados.', 'Con peso alto, usa los seguros del rack o la máquina.', 'Abdomen firme antes de bajar: protege la espalda baja.'] },
  sentadillaMaquina: { about: 'Sentadilla guiada por la máquina: mucho trabajo de cuádriceps con la espalda apoyada.', primary: ['Cuádriceps'], secondary: ['Glúteos', 'Aductores'],
    safety: ['Espalda y cadera pegadas al respaldo todo el tiempo.', 'No bloquees las rodillas arriba: deja una ligera flexión.', 'Si la cadera se despega o la espalda baja se redondea al bajar, reduce el recorrido.', 'Usa los seguros de la máquina al empezar y al terminar.'] },
  unilateralPierna: { about: 'Trabajo de una pierna a la vez: fuerza, equilibrio y corrige diferencias entre lados.', primary: ['Cuádriceps', 'Glúteos'], secondary: ['Isquiotibiales', 'Aductores', 'Estabilizadores de cadera'],
    safety: ['Empieza con poco peso: el equilibrio es parte del ejercicio.', 'Rodilla de adelante alineada con el pie.', 'Apóyate en algo si pierdes el equilibrio.'] },
  bisagra: { about: 'Bisagra de cadera: la parte de atrás de la pierna y los glúteos.', primary: ['Isquiotibiales', 'Glúteos'], secondary: ['Espalda baja', 'Antebrazo (agarre)'],
    safety: ['El movimiento es de cadera: espalda recta en todo momento.', 'Baja solo hasta sentir estiramiento atrás de los muslos; si la espalda se redondea, bajaste de más.', 'Peso pegado a las piernas.'] },
  gluteo: { about: 'Extensión de cadera: el mejor trabajo directo de glúteos.', primary: ['Glúteos'], secondary: ['Isquiotibiales', 'Abdomen'],
    safety: ['Sube hasta alinear cadera y torso, sin arquear la espalda baja.', 'Usa un cojín en la barra para no lastimar la cadera.', 'Barbilla hacia el pecho para mantener la columna neutra.'] },
  curlFemoral: { about: 'Flexión de rodilla: aísla los isquiotibiales.', primary: ['Isquiotibiales'], secondary: ['Gemelos'],
    safety: ['Ajusta la máquina: rodilla alineada con el eje.', 'Movimiento controlado, sin impulso: los isquiotibiales se lesionan con tirones.', 'Calienta con una serie ligera.'] },
  extensionCuadriceps: { about: 'Extensión de rodilla: aísla el cuádriceps.', primary: ['Cuádriceps'], secondary: [],
    safety: ['Rodilla alineada con el eje de la máquina y rodillo sobre los tobillos.', 'Sube controlado y no dejes caer el peso.', 'Si molesta la rodilla, reduce el peso o el recorrido.'] },
  abductores: { about: 'Abre las piernas: glúteo medio, clave para la estabilidad de cadera y rodilla.', primary: ['Glúteo medio (abductores)'], secondary: ['Glúteo mayor'],
    safety: ['Movimiento lento y controlado, sin rebotes.', 'Espalda apoyada.', 'Ajusta la apertura inicial a un rango cómodo.'] },
  aductores: { about: 'Cierra las piernas: la cara interna del muslo.', primary: ['Aductores'], secondary: [],
    safety: ['Empieza con una apertura cómoda; no fuerces el estiramiento.', 'Movimiento controlado: los aductores se tiran con movimientos bruscos.', 'Calienta con una serie ligera.'] },
  gemelos: { about: 'Elevación de talones: pantorrillas.', primary: ['Gemelos y sóleo (pantorrilla)'], secondary: [],
    safety: ['Recorrido completo y sin rebotes abajo, para cuidar el tendón de Aquiles.', 'Sube el peso poco a poco.', 'Pies firmes en la orilla del escalón o plataforma.'] },
  crunch: { about: 'Flexión del tronco: abdomen.', primary: ['Abdomen'], secondary: ['Oblicuos'],
    safety: ['No jales el cuello con las manos.', 'Movimiento corto y controlado, exhalando al subir.', 'Si molesta la espalda baja, reduce el recorrido.'] },
  elevacionPiernas: { about: 'Sube las piernas: abdomen bajo.', primary: ['Abdomen bajo', 'Flexores de cadera'], secondary: ['Oblicuos'],
    safety: ['Sin balanceo, sobre todo si estás colgado.', 'Con las rodillas flexionadas es más fácil y seguro al empezar.', 'Baja despacio.'] },
};
const PATTERN_OF = {
  pressPecho: ['Press banca', 'Press de banca con mancuernas', 'Press banca en Smith', 'Press de pecho en máquina', 'Press de pecho en polea', 'Flexiones'],
  pressInclinado: ['Press inclinado', 'Press inclinado con mancuerna', 'Press inclinado en Smith', 'Press inclinado en máquina'],
  aperturas: ['Pec fly', 'Aperturas con mancuernas', 'Aperturas inclinadas con mancuernas', 'Cruce de poleas', 'Aperturas en polea baja'],
  fondos: ['Fondos'], fondosBanco: ['Fondos en banco'],
  jalonVertical: ['Pull-up', 'Dominadas supinas', 'Jalón al pecho', 'Close-grip lat pulldown'],
  remo: ['Pendlay row', 'Chest-supported machine row', 'Close-grip cable row', 'Remo con mancuerna a una mano', 'Remo con mancuernas inclinado', 'Remo T', 'Remo invertido'],
  lateral: ['Cable lateral raise', 'Dumbbell lateral raise', 'Elevación lateral con banda'],
  posterior: ['Reverse butterfly', 'Face pull', 'Pájaro con mancuernas'],
  pressHombro: ['Shoulder press', 'Press de hombro con mancuernas', 'Press militar con barra', 'Press de hombro en Smith'],
  trapecio: ['Shrugs', 'Encogimientos con barra', 'Encogimientos en polea'],
  curl: ['Bayesian curl', 'Curl predicador', 'Curl con barra', 'Curl con mancuernas', 'Curl en máquina predicador'],
  curlMartillo: ['Curl martillo', 'Curl martillo en polea'],
  triceps: ['Cable overhead triceps extension', 'Extensión de tríceps con mancuerna', 'Press francés con barra Z', 'Jalón de tríceps en polea'],
  sentadilla: ['Squat', 'Smith squat', 'Sentadilla frontal', 'Sentadilla goblet', 'Goblet saquat', 'Sentadilla con mancuernas'],
  sentadillaMaquina: ['Pendulum squat', 'Hack squat', 'Prensa', 'Sentadilla máquina hammer'],
  unilateralPierna: ['Sentadilla búlgara con mancuernas', 'Zancadas con mancuernas', 'Subidas al banco con mancuernas'],
  bisagra: ['Romanian deadlift', 'Peso muerto rumano con mancuernas', 'Extensiones de espalda'],
  gluteo: ['Hip thrust con barra', 'Puente de glúteo a una pierna'],
  curlFemoral: ['Lying leg curl', 'Seated leg curl', 'Sitting Leg Curl', 'Curl femoral con pelota'],
  extensionCuadriceps: ['Leg extension'],
  abductores: ['Hip abduction'], aductores: ['Hip adduction', 'Aductores con banda'],
  gemelos: ['Standing calf raise', 'Elevación de talones sentado', 'Elevación de talones con mancuernas', 'Elevación de talones en prensa'],
  crunch: ['Ab crunch', 'Crunch abdominal'], elevacionPiernas: ['Leg raises', 'Elevación de piernas en banco'],
};
const PATTERN_BY_NAME = new Map(Object.entries(PATTERN_OF).flatMap(([key, names]) => names.map((n) => [normalizedName(n), PATTERNS[key]])));

/** Reglas generales para entrenar sin lastimarse (se muestran en todos los ejercicios). */
export const SAFETY_GENERAL = [
  'Calienta 5–10 minutos y haz 1–2 series ligeras antes de las de trabajo.',
  'Primero la técnica, luego el peso: sube la carga solo si todas las repeticiones salen limpias.',
  'Ardor o cansancio en el músculo es normal; dolor agudo, punzante o en la articulación no lo es: detente.',
  'Exhala al hacer el esfuerzo y no aguantes la respiración en series largas.',
  'Si una molestia dura más de unos días, consulta a un profesional de la salud.',
];
/** Músculos y cuidados del ejercicio; para ejercicios propios usa su músculo principal. */
export function bodyInfo(exercise) {
  const pattern = exercise ? PATTERN_BY_NAME.get(normalizedName(exercise.name)) : null;
  if (pattern) return pattern;
  const muscle = exercise?.primaryMuscle && exercise.primaryMuscle !== 'Sin especificar' ? exercise.primaryMuscle : null;
  return { about: null, primary: muscle ? [muscle] : [], secondary: [], safety: [] };
}

/** Guía del ejercicio de la biblioteca (por nombre), o null si es un ejercicio propio. */
export const guideFor = (exercise) => (exercise ? BY_NAME.get(normalizedName(exercise.name)) ?? null : null);

/** Búsqueda de video de técnica (solo necesita internet al tocarla). */
export const videoURL = (exercise) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise.name} técnica correcta ejercicio`)}`;
