// utils/vocationalScoring.ts
// ══════════════════════════════════════════════════════════════════════════════
// Motor Matemático — Test CHASIDE Modificado V3
// ══════════════════════════════════════════════════════════════════════════════
// 98 reactivos clasificados por área (C, H, A, S, I, D, E)
// Cada área tiene exactamente 5 preguntas de tipo "interest" y 9 de tipo "aptitude"
// ══════════════════════════════════════════════════════════════════════════════

export type ChasideArea = 'C' | 'H' | 'A' | 'S' | 'I' | 'D' | 'E';

export interface ChasideQuestion {
  id: number;
  text: string;
  area: ChasideArea;
  type: 'interest' | 'aptitude';
}

export interface CareerResult {
  name: string;
  matchInterests: number;   // Match de Intereses (0-100)
  matchAptitudes: number;   // Match de Aptitudes (0-100)
  concordance: number;      // K = 100 - |I - A|
  cv: number;               // Compatibilidad Vocacional final
}

export interface AreaScore {
  area: ChasideArea;
  label: string;
  interestRaw: number;      // Puntos crudos intereses (0-5)
  aptitudeRaw: number;      // Puntos crudos aptitudes (0-9)
  interestNorm: number;     // Normalizado (0-100)
  aptitudeNorm: number;     // Normalizado (0-100)
}

export interface VocationalResult {
  areaScores: AreaScore[];
  careerRanking: CareerResult[];
  dominantAreas: ChasideArea[];   // Top 2-3 áreas
}

// ── Etiquetas de áreas ──────────────────────────────────────────────────────
const AREA_LABELS: Record<ChasideArea, string> = {
  C: 'Administrativo / Contable',
  H: 'Humanístico / Social',
  A: 'Artístico / Creativo',
  S: 'Ciencias de la Salud',
  I: 'Ingeniería / Tecnología',
  D: 'Defensa / Seguridad',
  E: 'Ciencias Exactas / Naturales',
};

// ── Los 98 reactivos ────────────────────────────────────────────────────────
export const CHASIDE_QUESTIONS: ChasideQuestion[] = [
  { id: 1, text: "¿Aceptarías trabajar escribiendo artículos en la sección económica de un diario?", area: "C", type: "aptitude" },
  { id: 2, text: "¿Te ofrecerías para organizar la despedida de soltero de uno de tus amigos?", area: "C", type: "aptitude" },
  { id: 3, text: "¿Te gustaría dirigir un proyecto de urbanización en tu provincia?", area: "A", type: "aptitude" },
  { id: 4, text: "¿A una frustración siempre opones un pensamiento positivo?", area: "S", type: "aptitude" },
  { id: 5, text: "¿Te dedicarías a socorrer a personas accidentadas o atacadas por asaltantes?", area: "D", type: "interest" },
  { id: 6, text: "¿Cuando eras chico, te interesaba saber cómo estaban construidos tus juguetes?", area: "I", type: "interest" },
  { id: 7, text: "¿Te interesan más los misterios de la naturaleza que los secretos de la tecnología?", area: "E", type: "aptitude" },
  { id: 8, text: "¿Escuchas atentamente los problemas que te plantean tus amigos?", area: "S", type: "interest" },
  { id: 9, text: "¿Te ofrecerías para explicar a tus compañeros un determinado tema que ellos no entendieron?", area: "H", type: "interest" },
  { id: 10, text: "¿Eres exigente y crítico con tu equipo de trabajo?", area: "I", type: "aptitude" },
  { id: 11, text: "¿Te atrae armar rompecabezas o puzzles?", area: "A", type: "aptitude" },
  { id: 12, text: "¿Puedes establecer la diferencia conceptual entre macroeconomía y microeconomía?", area: "C", type: "interest" },
  { id: 13, text: "¿Usar uniforme te hace sentir distinto, importante?", area: "D", type: "aptitude" },
  { id: 14, text: "¿Participarías como profesional en un espectáculo de acrobacia aérea?", area: "D", type: "aptitude" },
  { id: 15, text: "¿Organizas tu dinero de manera que te alcance hasta el próximo cobro?", area: "C", type: "aptitude" },
  { id: 16, text: "¿Convences fácilmente a otras personas sobre la validez de tus argumentos?", area: "S", type: "aptitude" },
  { id: 17, text: "¿Estás informado sobre los nuevos descubrimientos que se están realizando sobre la Teoría del Big-Bang?", area: "E", type: "interest" },
  { id: 18, text: "¿Ante una situación de emergencia, actúas rápidamente?", area: "D", type: "aptitude" },
  { id: 19, text: "¿Cuando tienes que resolver un problema matemático, perseveras hasta encontrar la solución?", area: "I", type: "interest" },
  { id: 20, text: "¿Si te convocara tu club preferido para planificar, organizar y dirigir un campo de deportes, aceptarías?", area: "C", type: "aptitude" },
  { id: 21, text: "¿Eres el que pone un toque de alegría en las fiestas?", area: "A", type: "interest" },
  { id: 22, text: "¿Crees que los detalles son tan importantes como el todo?", area: "A", type: "aptitude" },
  { id: 23, text: "¿Te sentirías a gusto trabajando en un ámbito hospitalario?", area: "S", type: "aptitude" },
  { id: 24, text: "¿Te gustaría participar para mantener el orden ante grandes desórdenes y cataclismos?", area: "D", type: "aptitude" },
  { id: 25, text: "¿Pasarías varias horas leyendo algún libro de tu interés?", area: "H", type: "interest" },
  { id: 26, text: "¿Planificas detalladamente tus trabajos antes de empezar?", area: "I", type: "aptitude" },
  { id: 27, text: "¿Entablas una relación casi personal con tu computadora?", area: "I", type: "aptitude" },
  { id: 28, text: "¿Disfrutas modelando con arcilla?", area: "A", type: "interest" },
  { id: 29, text: "¿Ayudas habitualmente a los no videntes a cruzar la calle?", area: "S", type: "aptitude" },
  { id: 30, text: "¿Consideras importante que desde la escuela primaria se fomente la actitud crítica y la participación activa?", area: "H", type: "aptitude" },
  { id: 31, text: "¿Aceptarías que las mujeres formaran parte de las fuerzas armadas bajo las mismas normas que los hombres?", area: "D", type: "interest" },
  { id: 32, text: "¿Te gustaría crear nuevas técnicas para descubrir las patologías de algunas enfermedades a través del microscopio?", area: "E", type: "aptitude" },
  { id: 33, text: "¿Participarías en una campaña de prevención contra una enfermedad epidémica?", area: "S", type: "interest" },
  { id: 34, text: "¿Te interesan los temas relacionados con el pasado y con la evolución del hombre?", area: "H", type: "interest" },
  { id: 35, text: "¿Te incluirías en un proyecto de investigación de los movimientos sísmicos y sus consecuencias?", area: "E", type: "aptitude" },
  { id: 36, text: "¿Fuera de los horarios escolares dedicas algún día de la semana a la realización de actividades físicas?", area: "A", type: "aptitude" },
  { id: 37, text: "¿Te interesan las actividades de mucha acción y de reacción rápida en situaciones imprevistas y de peligro?", area: "D", type: "aptitude" },
  { id: 38, text: "¿Te ofrecerías para colaborar como voluntario en los gabinetes espaciales de la NASA?", area: "I", type: "interest" },
  { id: 39, text: "¿Te gusta más el trabajo manual que el trabajo intelectual?", area: "A", type: "aptitude" },
  { id: 40, text: "¿Estarías dispuesto a renunciar a un momento placentero para ofrecer tu servicio como profesional?", area: "S", type: "aptitude" },
  { id: 41, text: "¿Participarías de una investigación sobre la violencia en el fútbol?", area: "H", type: "aptitude" },
  { id: 42, text: "¿Te gustaría trabajar en un laboratorio mientras estudias?", area: "E", type: "interest" },
  { id: 43, text: "¿Arriesgarías tu vida para salvar la vida de otro que no conoces?", area: "D", type: "aptitude" },
  { id: 44, text: "¿Te agradaría hacer un curso de primeros auxilios?", area: "S", type: "aptitude" },
  { id: 45, text: "¿Tolerarías empezar tantas veces como fuere necesario hasta obtener el logro deseado?", area: "A", type: "interest" },
  { id: 46, text: "¿Distribuirías tu horarios del día adecuadamente para poder hacer todo lo planeado?", area: "C", type: "aptitude" },
  { id: 47, text: "¿Harías un curso para aprender a fabricar los instrumentos y/o piezas de las máquinas o aparatos con que trabajas?", area: "I", type: "aptitude" },
  { id: 48, text: "¿Elegirías una profesión en la que tuvieras que estar algunos meses alejado de tu familia, por ejemplo el marino?", area: "D", type: "interest" },
  { id: 49, text: "¿Te radicarías en una zona agrícola-ganadera para desarrollar tus actividades como profesional?", area: "E", type: "aptitude" },
  { id: 50, text: "¿Cuando estás en un grupo trabajando, te entusiasma producir ideas originales y que sean tenidas en cuenta?", area: "A", type: "aptitude" },
  { id: 51, text: "¿Te resulta fácil coordinar un grupo de trabajo?", area: "C", type: "aptitude" },
  { id: 52, text: "¿Te resultó interesante el estudio de las ciencias biológicas?", area: "S", type: "aptitude" },
  { id: 53, text: "¿Si una gran empresa solicita un profesional como gerente de comercialización, te sentirías a gusto desempeñando ese rol?", area: "C", type: "interest" },
  { id: 54, text: "¿Te incluirías en un proyecto nacional de desarrollo de la principal fuente de recursos de tu provincia?", area: "I", type: "aptitude" },
  { id: 55, text: "¿Tienes interés por saber cuáles son las causas que determinan ciertos fenómenos, aunque saberlo no altere tu vida?", area: "E", type: "aptitude" },
  { id: 56, text: "¿Descubriste algún filósofo o escritor que haya expresado tus mismas ideas con anterioridad?", area: "H", type: "aptitude" },
  { id: 57, text: "¿Desearías que te regalen algún instrumento musical para tu cumpleaños?", area: "A", type: "interest" },
  { id: 58, text: "¿Aceptarías colaborar con el cumplimiento de las normas en lugares públicos?", area: "D", type: "aptitude" },
  { id: 59, text: "¿Crees que tus ideas son importantes, y haces todo lo posible para ponerlas en práctica?", area: "I", type: "aptitude" },
  { id: 60, text: "¿Cuando se descompone un artefacto en tu casa, te dispones rápidamente a repararlo?", area: "I", type: "interest" },
  { id: 61, text: "¿Formarías parte de un equipo de trabajo orientado a la preservación de la flora y la fauna en vías de extinción?", area: "E", type: "aptitude" },
  { id: 62, text: "¿Acostumbras a leer revistas relacionadas con los últimos avances científicos y tecnológicos en el área de la salud?", area: "S", type: "aptitude" },
  { id: 63, text: "¿Preservar las raíces culturales de nuestro país, te parece importante y necesario?", area: "H", type: "aptitude" },
  { id: 64, text: "¿Te gustaría realizar una investigación que contribuyera a hacer más justa la distribución de la riqueza?", area: "C", type: "interest" },
  { id: 65, text: "¿Te gustaría realizar tareas auxiliares en una nave, como por ejemplo izado y arriado de velas, pintura y conservación del casco, arreglo de averías, conservación de motores, etc.?", area: "D", type: "aptitude" },
  { id: 66, text: "¿Crees que un país debe poseer la más alta tecnología armamentista, a cualquier precio?", area: "D", type: "aptitude" },
  { id: 67, text: "¿La libertad y la justicia son valores fundamentales en tu vida?", area: "H", type: "aptitude" },
  { id: 68, text: "¿Aceptarías hacer una práctica pagada en una industria de productos alimenticios en el sector de control de calidad?", area: "E", type: "aptitude" },
  { id: 69, text: "¿Consideras que la salud pública debe ser prioritaria, gratuita y eficiente para todos?", area: "S", type: "aptitude" },
  { id: 70, text: "¿Te interesaría investigar sobre alguna nueva vacuna?", area: "S", type: "interest" },
  { id: 71, text: "¿En un equipo de trabajo, prefieres el rol de coordinador?", area: "C", type: "aptitude" },
  { id: 72, text: "¿En una discusión entre amigos, te ofreces como mediador?", area: "H", type: "aptitude" },
  { id: 73, text: "¿Estás de acuerdo con la formación de un cuerpo de soldados profesionales?", area: "D", type: "interest" },
  { id: 74, text: "¿Lucharías por una causa justa hasta las últimas consecuencias?", area: "H", type: "aptitude" },
  { id: 75, text: "¿Te gustaría investigar científicamente sobre cultivos agrícolas?", area: "I", type: "interest" },
  { id: 76, text: "¿Harías un nuevo diseño de una prenda pasada de moda, ante una reunión imprevista?", area: "A", type: "aptitude" },
  { id: 77, text: "¿Visitarías un observatorio astronómico para conocer en acción el funcionamiento de los aparatos?", area: "E", type: "interest" },
  { id: 78, text: "¿Dirigirías el área de importación y exportación de una empresa?", area: "C", type: "aptitude" },
  { id: 79, text: "¿Te inhibes al entrar a un lugar nuevo con gente desconocida?", area: "E", type: "aptitude" },
  { id: 80, text: "¿Te gratificaria el trabajar con niños?", area: "H", type: "interest" },
  { id: 81, text: "¿Harías el diseño de un afiche para una campaña contra el sida?", area: "A", type: "aptitude" },
  { id: 82, text: "¿Dirigirías un grupo de teatro independiente?", area: "A", type: "aptitude" },
  { id: 83, text: "¿Enviarías tu currículum a una empresa automotriz que solicita gerente para su área de producción?", area: "I", type: "aptitude" },
  { id: 84, text: "¿Participarías en un grupo de defensa internacional dentro de alguna fuerza armada?", area: "D", type: "interest" },
  { id: 85, text: "¿Te costearías tus estudios trabajando en una auditoría?", area: "C", type: "interest" },
  { id: 86, text: "¿Eres de los que defienden causas perdidas?", area: "H", type: "aptitude" },
  { id: 87, text: "¿Ante una emergencia epidémica participarías en una campaña brindando tu ayuda?", area: "S", type: "interest" },
  { id: 88, text: "¿Sabrías responder qué significa ADN y ARN?", area: "E", type: "interest" },
  { id: 89, text: "¿Elegirías una carrera cuyo instrumento de trabajo fuere la utilización de un idioma extranjero?", area: "H", type: "aptitude" },
  { id: 90, text: "¿Trabajar con objetos te resulta más gratificante que trabajar con personas?", area: "I", type: "aptitude" },
  { id: 91, text: "¿Te resultaría gratificante ser asesor contable en una empresa reconocida?", area: "C", type: "aptitude" },
  { id: 92, text: "¿Ante un llamado solidario, te ofrecerías para cuidar a un enfermo?", area: "S", type: "interest" },
  { id: 93, text: "¿Te atrae investigar sobre los misterios del universo, por ejemplo los agujeros negros?", area: "E", type: "interest" },
  { id: 94, text: "¿El trabajo individual te resulta más rápido y efectivo que el trabajo grupal?", area: "E", type: "aptitude" },
  { id: 95, text: "¿Dedicarías parte de tu tiempo a ayudar a personas de zonas carenciadas?", area: "H", type: "interest" },
  { id: 96, text: "¿Cuándo eliges tu ropa o decoras un ambiente, tienes en cuenta la combinación de los colores, las telas o el estilo de los muebles?", area: "A", type: "interest" },
  { id: 97, text: "¿Te gustaría trabajar como profesional dirigiendo la construcción de una empresa hidroeléctrica?", area: "I", type: "aptitude" },
  { id: 98, text: "¿Sabes qué es el PBI?", area: "C", type: "interest" },
];

// ── Matriz de Carreras (pesos por área) ─────────────────────────────────────
// Cada carrera tiene pesos asignados a las áreas CHASIDE.
// Solo se incluyen las áreas con peso > 0.
interface CareerWeight {
  name: string;
  weights: Partial<Record<ChasideArea, number>>;
}

const CAREER_MATRIX: CareerWeight[] = [
  { name: 'Administración',  weights: { C: 1.0, H: 0.75, E: 0.5 } },
  { name: 'Contaduría',      weights: { C: 1.0, E: 0.9,  H: 0.5 } },
  { name: 'Derecho',         weights: { H: 1.0, D: 0.9,  C: 0.5 } },
  { name: 'Pedagogía',       weights: { H: 1.0, S: 0.9,  A: 0.5 } },
  { name: 'Psicología',      weights: { H: 1.0, S: 0.9,  I: 0.5 } },
  { name: 'Mercadotecnia',   weights: { C: 0.9, H: 0.9,  A: 0.9, E: 0.5 } },
];

// ── Constantes de normalización ─────────────────────────────────────────────
const MAX_INTEREST_PER_AREA = 5;   // Cada área tiene exactamente 5 preguntas de interés
const MAX_APTITUDE_PER_AREA = 9;   // Cada área tiene exactamente 9 preguntas de aptitud

// ── Pesos de la fórmula final ───────────────────────────────────────────────
const WEIGHT_INTERESTS = 0.45;
const WEIGHT_APTITUDES = 0.45;
const WEIGHT_CONCORDANCE = 0.10;

// ══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL DE CÁLCULO
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Calcula la compatibilidad vocacional a partir de las respuestas del test.
 * 
 * @param answers - Objeto { [questionId]: boolean } con las 98 respuestas (true = Sí)
 * @returns VocationalResult con scores por área y ranking de carreras
 */
export function calculateVocationalCompatibility(
  answers: Record<number, boolean>
): VocationalResult {

  // ── Paso 1: Sumar puntos crudos por área, separados por tipo ────────────
  const rawScores: Record<ChasideArea, { interest: number; aptitude: number }> = {
    C: { interest: 0, aptitude: 0 },
    H: { interest: 0, aptitude: 0 },
    A: { interest: 0, aptitude: 0 },
    S: { interest: 0, aptitude: 0 },
    I: { interest: 0, aptitude: 0 },
    D: { interest: 0, aptitude: 0 },
    E: { interest: 0, aptitude: 0 },
  };

  CHASIDE_QUESTIONS.forEach(q => {
    if (answers[q.id] === true) {
      rawScores[q.area][q.type]++;
    }
  });

  // ── Paso 2: Normalizar cada área (0-100) ────────────────────────────────
  const areaScores: AreaScore[] = (Object.keys(rawScores) as ChasideArea[]).map(area => ({
    area,
    label: AREA_LABELS[area],
    interestRaw: rawScores[area].interest,
    aptitudeRaw: rawScores[area].aptitude,
    interestNorm: (rawScores[area].interest / MAX_INTEREST_PER_AREA) * 100,
    aptitudeNorm: (rawScores[area].aptitude / MAX_APTITUDE_PER_AREA) * 100,
  }));

  // Lookup rápido por área
  const scoreMap = new Map(areaScores.map(s => [s.area, s]));

  // ── Paso 3: Calcular match por carrera ──────────────────────────────────
  const careerRanking: CareerResult[] = CAREER_MATRIX.map(career => {
    const entries = Object.entries(career.weights) as [ChasideArea, number][];
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);

    // Promedio ponderado de Intereses
    const matchInterests = entries.reduce((sum, [area, weight]) => {
      const score = scoreMap.get(area);
      return sum + (score ? score.interestNorm * weight : 0);
    }, 0) / totalWeight;

    // Promedio ponderado de Aptitudes
    const matchAptitudes = entries.reduce((sum, [area, weight]) => {
      const score = scoreMap.get(area);
      return sum + (score ? score.aptitudeNorm * weight : 0);
    }, 0) / totalWeight;

    // ── Paso 4: Concordancia ──────────────────────────────────────────────
    const concordance = 100 - Math.abs(matchInterests - matchAptitudes);

    // ── Paso 5: Fórmula Final ─────────────────────────────────────────────
    const cv = (WEIGHT_INTERESTS * matchInterests)
             + (WEIGHT_APTITUDES * matchAptitudes)
             + (WEIGHT_CONCORDANCE * concordance);

    return {
      name: career.name,
      matchInterests: Math.round(matchInterests * 100) / 100,
      matchAptitudes: Math.round(matchAptitudes * 100) / 100,
      concordance: Math.round(concordance * 100) / 100,
      cv: Math.round(cv * 100) / 100,
    };
  });

  // ── Paso 6: Ordenar por CV descendente ──────────────────────────────────
  careerRanking.sort((a, b) => b.cv - a.cv);

  // ── Áreas dominantes (top 3 por aptitudes normalizadas) ─────────────────
  const dominantAreas = [...areaScores]
    .sort((a, b) => (b.interestNorm + b.aptitudeNorm) - (a.interestNorm + a.aptitudeNorm))
    .slice(0, 3)
    .map(s => s.area);

  return {
    areaScores,
    careerRanking,
    dominantAreas,
  };
}
