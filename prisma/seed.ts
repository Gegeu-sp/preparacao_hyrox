/**
 * HYROX CONTROL — Seed da periodização científica
 * Rafael Nogueira · Temporada 2026/27 · Prova: HYROX 08–09/05/2027
 * 28 microciclos (W1 = seg 26/10/2026) · 7 mesociclos · 7 sessões/semana (domingo = ativação)
 *
 * Estrutura: Diagnóstico (W1) → GPP1 (W2-6) → GPP2 (W7-11) → SPP1 (W12-17)
 *            → SPP2 (W18-22) → COMP (W23-26) → TAPER (W27-28, prova sáb 08/05/2027)
 */
import { PrismaClient } from '@prisma/client'
import { tonnageOf } from '../src/lib/tonnage'

const db = new PrismaClient()

const DAY = 86_400_000
const PLAN_START = Date.UTC(2026, 9, 26) // segunda-feira, 26/out/2026
const RACE_DATE = Date.UTC(2027, 4, 8) // sábado, 08/05/2027

const weekStart = (w: number) => new Date(PLAN_START + (w - 1) * 7 * DAY)
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY)
const dateKey = (d: Date) => d.toISOString().slice(0, 10)
const r1 = (v: number) => Math.round(v * 10) / 10

// ---------------------------------------------------------------- tipos locais
interface ExSpec {
  name: string
  cat: string // FORCA | LPO | PLIOMETRIA | CORE | TECNICO
  sets?: number
  reps?: string
  load?: number
  tempo?: string
  rest?: string
  note?: string
}
interface StSpec {
  station: string
  label: string
  dist?: number
  reps?: number
  load?: number
  split?: number
  note?: string
}
interface RawSession {
  day: number // 1=Seg ... 7=Dom
  type: string
  title: string
  desc: string
  zone?: string
  pace?: string
  dur: number
  km?: number
  rpe: number
  ex?: ExSpec[]
  st?: StSpec[]
}

// ---------------------------------------------------------------- mesociclos
const MESOS = [
  {
    code: 'DIAG', name: 'Diagnóstico & Testes', weeks: [1, 1],
    goal: 'Estratificar capacidade aeróbia (VO₂max, VT1/VT2), força máxima, potência (CMJ) e rendimento nas estações. Calibrar zonas de FC/ritmo e cargas de toda a temporada.',
    focus: 'Teste incremental em esteira;3RM nos básicos;CMJ;TT SkiErg 1.000 m / Row 500 m;introdução técnica a sleds/carries',
    intensityNote: 'RPE 8–10 apenas nos testes; restante leve para não mascarar resultados.',
    keyWorkouts: 'Esteira incremental (ter) · 3RM + CMJ (qua) · TTs modais (sex)',
  },
  {
    code: 'GPP1', name: 'Preparatório Geral I — Base Aeróbica & Adaptação', weeks: [2, 6],
    goal: 'Construir base aeróbia ampla (Z2), adaptação anatômica de força e padrões de movimento sólidos. Consolidar a rotina de 7 dias com domingo regenerativo obrigatório.',
    focus: 'Volume Z2 progressivo (32→44 km/sem);adaptação anatômica 3–4×10–12;LPO técnico e pliometria de baixa amplitude;circuitos de capacidade de trabalho',
    intensityNote: 'RPE 4–6 · sem falha muscular · técnica antes de carga.',
    keyWorkouts: 'Longa progressiva (qui) · circuito de capacidade (sáb)',
  },
  {
    code: 'GPP2', name: 'Preparatório Geral II — Força Máxima & Limiar', weeks: [7, 11],
    goal: 'Elevar força máxima (agachamento/terra/hip) e introduzir o limiar contínuo. Iniciar adaptação específica a sleds com carga progressiva (60→80% da alvo).',
    focus: 'Força máxima 4–6 RM;2 blocos de limiar/semana;força-velocidade (trap bar jumps);sled push/pull progressivo',
    intensityNote: 'RPE 6–7 · básicos a 78–85% 1RM · 2 estímulos-chave/semana.',
    keyWorkouts: '2×10–14\u2032 no limiar (ter) · sled init + limiar final (sáb)',
  },
  {
    code: 'SPP1', name: 'Preparatório Específico I — Força-Potência & Potência Aeróbica', weeks: [12, 17],
    goal: 'Converter força em potência aplicável (máxima intenção), elevar potência aeróbia (VO₂max) e introduzir o padrão híbrido corrida+estação em ritmo controlado.',
    focus: '85–90% 1RM com máxima intenção;5–6×1.000 m em VO₂;híbrido com sleds na carga alvo;bricks 1 km + estação',
    intensityNote: 'RPE 7–8 · 3 estímulos-chave/semana (ter/qua/sáb).',
    keyWorkouts: 'Intervalados VO₂ (ter) · híbrido específico (qua) · brick race-pace (sáb)',
  },
  {
    code: 'SPP2', name: 'Preparatório Específico II — Ritmo de Prova & Híbrido', weeks: [18, 22],
    goal: 'Consolidar o ritmo de prova (4:45–4:55/km) sob pré-fadiga; volume de estações com cargas/distâncias oficiais; meia simulação ao final da fase.',
    focus: '6–8×[1 km + wall balls];sleds full distance;sandbag/BBJ em volume real;MEIA-SIM (S21)',
    intensityNote: 'RPE 8 · gestão de fadiga excêntrica: 48 h entre estímulos de lunges/BBJ.',
    keyWorkouts: 'Race-pace + wall balls (ter) · híbrido II (qua) · MEIA SIMULAÇÃO (sáb S21)',
  },
  {
    code: 'COMP', name: 'Competitivo — Simulações & Afiamento', weeks: [23, 26],
    goal: 'Afinar o rendimento específico com 2 simulações completas (raio-X de splits e logística), reduzindo volume mantendo intensidade.',
    focus: 'SIMULAÇÕES COMPLETAS (S24 e S26);blocos de 2 km em race-pace;força de manutenção 3×3;transições/roxzone',
    intensityNote: 'RPE 8–10 nos sábados · volume −25% vs pico.',
    keyWorkouts: 'SIMULAÇÃO #1 (sáb 11/04) · SIMULAÇÃO #2 — ensaio geral (sáb 25/04)',
  },
  {
    code: 'TAPER', name: 'Tapering & Pico — HYROX 8–9 Maio', weeks: [27, 28],
    goal: 'Chegar ao dia da prova com frescor máximo: redução exponencial de volume (−45% → −60%), intensidade mantida em doses curtas (priming neural/PAP) e logística perfeita.',
    focus: 'Priming PAP (2×3 a 85%);tiros curtos race-pace;sono/hidratação/viagem;domingo regenerativo mantido',
    intensityNote: 'RPE 2–6 · zero fadiga residual · FCmáx só na prova.',
    keyWorkouts: '4×1 km race-pace c/ rec. total (S27-ter) · PROVA (S28-sáb)',
  },
]

// parâmetros semanais: tipo, km-alvo, nota
const WEEK_PARAMS: Record<number, { type: string; km: number; note?: string }> = {
  1:  { type: 'TESTE', km: 24, note: 'Bateria de testes: esteira incremental, 3RM, CMJ e TTs modais — os resultados calibram zonas e cargas de toda a temporada.' },
  2:  { type: 'DESENVOLVIMENTO', km: 32 },
  3:  { type: 'DESENVOLVIMENTO', km: 36 },
  4:  { type: 'DESENVOLVIMENTO', km: 40 },
  5:  { type: 'DESENVOLVIMENTO', km: 44, note: 'Pico do GPP1 — maior volume de corrida da fase.' },
  6:  { type: 'REGENERATIVO', km: 26, note: 'Deload: volume −40%, intensidade mantida em 1 estímulo curto.' },
  7:  { type: 'DESENVOLVIMENTO', km: 44 },
  8:  { type: 'DESENVOLVIMENTO', km: 48 },
  9:  { type: 'FLEXIVEL', km: 36, note: 'Semana de Natal (flexível): prioridade Ter/Qui/Sáb — mínimo 5 sessões.' },
  10: { type: 'DESENVOLVIMENTO', km: 50, note: 'Pico do GPP2.' },
  11: { type: 'REGENERATIVO', km: 30, note: 'Deload + re-testes parciais (5 km TT / CMJ) na terça.' },
  12: { type: 'DESENVOLVIMENTO', km: 46 },
  13: { type: 'DESENVOLVIMENTO', km: 50 },
  14: { type: 'DESENVOLVIMENTO', km: 54 },
  15: { type: 'DESENVOLVIMENTO', km: 56 },
  16: { type: 'DESENVOLVIMENTO', km: 58, note: 'Pico do SPP1 — maior carga semanal do ciclo (corrida + tonelagem + híbrido).' },
  17: { type: 'REGENERATIVO', km: 36, note: 'Deload + re-teste curto de limiar em esteira (recalibrar zonas).' },
  18: { type: 'DESENVOLVIMENTO', km: 54 },
  19: { type: 'DESENVOLVIMENTO', km: 56 },
  20: { type: 'DESENVOLVIMENTO', km: 58, note: 'Pico de volume específico.' },
  21: { type: 'DESENVOLVIMENTO', km: 50, note: 'MEIA SIMULAÇÃO no sábado (4 estações + 4×1 km em ritmo de prova).' },
  22: { type: 'REGENERATIVO', km: 34, note: 'Deload regenerativo pós-meia-simulação.' },
  23: { type: 'DESENVOLVIMENTO', km: 48 },
  24: { type: 'DESENVOLVIMENTO', km: 42, note: 'SIMULAÇÃO COMPLETA #1 no sábado (11/04) — ritmo de prova + 5%.' },
  25: { type: 'DESENVOLVIMENTO', km: 36 },
  26: { type: 'DESENVOLVIMENTO', km: 34, note: 'SIMULAÇÃO COMPLETA #2 — ensaio geral (sáb 25/04, 14 dias antes da prova).' },
  27: { type: 'REGENERATIVO', km: 20, note: 'Tapering: volume −45%, intensidade em doses curtas.' },
  28: { type: 'COMPETICAO', km: 18, note: 'SEMANA DE PROVA — HYROX 08–09/05/2027 (confirmar wave/dia exato).' },
}

// pesos de distribuição de km por dia (Seg..Dom) por fase — soma = 1.0
const KM_WEIGHTS: Record<string, number[]> = {
  GPP1: [0.15, 0.20, 0.12, 0.29, 0.09, 0.15, 0],
  GPP2: [0.13, 0.20, 0.11, 0.27, 0.09, 0.20, 0],
  SPP1: [0.14, 0.22, 0.09, 0.27, 0.08, 0.20, 0],
  SPP2: [0.15, 0.21, 0.08, 0.25, 0.07, 0.24, 0],
  COMP: [0.17, 0.22, 0.09, 0.22, 0.07, 0.23, 0],
}

// ---------------------------------------------------------------- helpers de template
const ATIVACAO = (dur = 45): RawSession => ({
  day: 7,
  type: 'ATIVACAO',
  title: 'Ativação Regenerativa (Domingo)',
  desc: 'Mobilidade de quadril/tornozelo/tórax, ativação com elásticos (glúteo/escápula), 15\u2032 de bike em Z1 e educativos de corrida. Objetivo: manter o tônus e a frequência sem acumular fadiga — RPE ≤ 3.',
  zone: 'Z1',
  dur,
  rpe: 2,
  ex: [
    { name: 'Mobilidade quadril / tornozelo / tórax', cat: 'TECNICO', reps: '20\u2032' },
    { name: 'Ativação glúteo + escápula (elástico)', cat: 'CORE', reps: '15\u2032' },
    { name: 'Bike ergômetro (Z1)', cat: 'TECNICO', reps: '15\u2032' },
    { name: 'Educativos de corrida (A-skip, dribbling)', cat: 'TECNICO', sets: 4, reps: '20m' },
    { name: 'Nordic curl assistido + panturrilha (prevenção)', cat: 'CORE', sets: 2, reps: '5' },
  ],
})

function scaleKm(sessions: RawSession[], target: number, weights: number[]): void {
  // distribui o alvo semanal pelos dias conforme pesos; sessões com km fixo (simulações/prova) não são alteradas
  sessions.forEach((s) => {
    if (s.km == null && s.day <= 7) {
      s.km = r1(target * (weights[s.day - 1] ?? 0))
    }
  })
}

// ---------------------------------------------------------------- DIAG (W1)
function diagWeek(): RawSession[] {
  return [
    {
      day: 1, type: 'FORCA', title: 'Boas-vindas + Avaliação Antropométrica + Força Leve',
      desc: 'Registro de massa/composição e sessão leve de re-aclimatação aos básicos (50–55% 1RM estimado) antes dos testes de 3RM na quarta.',
      zone: 'Z2 (corrida)', dur: 75, km: 5, rpe: 4,
      ex: [
        { name: 'Agachamento livre', cat: 'FORCA', sets: 3, reps: '8', load: 52, tempo: '3-0-X' },
        { name: 'Levantamento terra (técnico)', cat: 'FORCA', sets: 3, reps: '5', load: 70 },
        { name: 'Supino reto', cat: 'FORCA', sets: 3, reps: '8', load: 40 },
        { name: 'Remada curvada', cat: 'FORCA', sets: 3, reps: '8', load: 45 },
        { name: 'Prancha frontal', cat: 'CORE', sets: 3, reps: '45s' },
      ],
    },
    {
      day: 2, type: 'TESTE', title: 'Teste Incremental em Esteira — VO₂max, VT1 e VT2',
      desc: 'Protocolo: início a 8 km/h, +1 km/h a cada 3\u2032 até exaustão voluntária; lactato capilar por estágio para determinar VT1/VT2. Resultados calibram as 5 zonas de FC/ritmo usadas em todo o ciclo.',
      zone: 'Z3→Z5', dur: 60, km: 3, rpe: 9,
      ex: [
        { name: 'Protocolo incremental (8→exaustão, +1 km/h/3\u2032)', cat: 'TECNICO', reps: '8-9 stages' },
        { name: 'Trote regenerativo pós-teste', cat: 'TECNICO', reps: '10\u2032' },
      ],
    },
    {
      day: 3, type: 'TESTE', title: 'Testes de Força Máxima (3RM) + CMJ',
      desc: '3RM em agachamento, terra, supino e remada (progressão de cargas 40→90%); CMJ com tapete de contato (5 tentativas válidas). Define as % de referência dos blocos de força.',
      dur: 70, rpe: 8,
      ex: [
        { name: 'Agachamento livre — 3RM', cat: 'FORCA', sets: 1, reps: '3', load: 95, note: '≈90% 1RM' },
        { name: 'Levantamento terra — 3RM', cat: 'FORCA', sets: 1, reps: '3', load: 125 },
        { name: 'Supino reto — 3RM', cat: 'FORCA', sets: 1, reps: '3', load: 70 },
        { name: 'Remada curvada — 3RM', cat: 'FORCA', sets: 1, reps: '3', load: 75 },
        { name: 'CMJ (tapete de contato)', cat: 'PLIOMETRIA', sets: 5, reps: '1' },
      ],
    },
    {
      day: 4, type: 'CORRIDA', title: 'Aeróbia Fácil + Strides',
      desc: 'Volume leve entre testes; 4×100 m progressivos para manter recrutamento neuromuscular.',
      zone: 'Z2', dur: 50, km: 8, rpe: 4,
    },
    {
      day: 5, type: 'TESTE', title: 'Testes Modais — 1.000 m SkiErg TT + 500 m Row TT',
      desc: 'Time-trials com recuperação completa (20\u2032): baseline de potência upper-body aeróbia. Registrar watts médios, FC pico e split/500 m.',
      dur: 50, km: 2, rpe: 9,
      st: [
        { station: 'SKIERG', label: '1.000 m — TT', dist: 1000, split: 270, note: 'alvo referencial 4:30' },
        { station: 'ROWING', label: '500 m — TT', dist: 500, split: 110, note: 'alvo referencial 1:50' },
      ],
    },
    {
      day: 6, type: 'HIBRIDO', title: 'Introdução Técnica — Sled / Carry / Sandbag + Corrida',
      desc: 'Aprender posições de sled (ângulo baixo, passos curtos e potentes), pegada de farmer e padrão de lunge com saco — cargas leves, foco 100% técnico. Corrida aeróbia de 30\u2032 no fim.',
      zone: 'Z2', dur: 90, km: 6, rpe: 5,
      st: [
        { station: 'SLED_PUSH', label: '4 × 20 m (carga leve)', dist: 80, load: 40 },
        { station: 'SLED_PULL', label: '4 × 20 m (carga leve)', dist: 80, load: 40 },
        { station: 'FARMERS', label: '3 × 40 m (2×20 kg)', dist: 120, load: 40 },
        { station: 'SANDBAG', label: '2 × 20 m (20 kg, técnico)', dist: 40, load: 20 },
      ],
    },
    ATIVACAO(),
  ]
}

// ---------------------------------------------------------------- GPP1 (W2-6)
function gpp1Week(w: number, lite: boolean): RawSession[] {
  const p = lite ? 0 : Math.min(1, (w - 2) / 3) // progressão 0..1
  const lf = lite ? 0.9 : 1 // cargas -10% no deload
  const ds = lite ? -1 : 0 // séries -1 no deload
  const s: RawSession[] = [
    {
      day: 1, type: 'FORCA', title: 'Força A — Adaptação Anatômica + Corrida Aeróbia',
      desc: 'Full-body com ênfase em cadeia posterior e anti-rotação; cargas conservadoras (55–65% 1RM) e técnica impecável. Corrida em Z2 logo após para base aeróbia.',
      zone: 'Z2', dur: lite ? 70 : 90, rpe: lite ? 4 : 5,
      ex: [
        { name: 'Agachamento livre', cat: 'FORCA', sets: 4 + ds, reps: '10', load: r1((62 + p * 6) * lf), tempo: '3-0-X', rest: '90s' },
        { name: 'Levantamento terra romeno', cat: 'FORCA', sets: 3 + ds, reps: '10', load: r1((62 + p * 8) * lf) },
        { name: 'Supino reto', cat: 'FORCA', sets: 3, reps: '10', load: r1((42 + p * 4) * lf) },
        { name: 'Remada curvada', cat: 'FORCA', sets: 3, reps: '10', load: r1((40 + p * 5) * lf) },
        { name: 'Prancha frontal c/ peso', cat: 'CORE', sets: 3, reps: '45s' },
      ],
    },
    {
      day: 2, type: 'CORRIDA', title: 'Fartlek Estruturado Z2/Z3',
      desc: '20\u2032 Z2 + 6×(2\u2032 Z3 / 2\u2032 Z2) + 10\u2032 Z2. Primeiro contato diluído com o ritmo de limiar.',
      zone: 'Z2-Z3', pace: 'Z3: 4:55–5:15/km', dur: lite ? 45 : 60, rpe: lite ? 5 : 6,
    },
    {
      day: 3, type: 'LPO', title: 'LPO Técnico + Pliometria Básica + Corrida',
      desc: 'Educativos e saltos de baixa amplitude: aprendizado neural de RFD e aterrissagem silenciosa. Corrida curta em Z2 no fim.',
      zone: 'Z2', dur: lite ? 60 : 80, rpe: 5,
      ex: [
        { name: 'A-skip / B-skip (educativos)', cat: 'TECNICO', sets: 3, reps: '30m' },
        { name: 'Agachamento salto (caixa)', cat: 'LPO', sets: 3, reps: '5', load: r1(20 * lf) },
        { name: 'Arremesso medicine ball (peito)', cat: 'LPO', sets: 4, reps: '8', load: 4 },
        { name: 'Step-up explosivo', cat: 'LPO', sets: 3, reps: '8/perna', load: r1(16 * lf) },
        { name: 'Pogo hops (tornozelo)', cat: 'PLIOMETRIA', sets: 3, reps: '20' },
        { name: 'Hurdle 30 cm', cat: 'PLIOMETRIA', sets: 3, reps: '6' },
      ],
    },
    {
      day: 4, type: 'CORRIDA', title: 'Longa Progressiva Z2',
      desc: `Volume central da semana${w >= 4 ? '; últimos 15\u2032 em Z3 (estímulo final)' : ''}. Cadência ≥ 178, FC estável — desenvolvimento de economia de corrida.`,
      zone: 'Z2', dur: lite ? 55 : 75, rpe: 5,
    },
    {
      day: 5, type: 'FORCA', title: 'Força B — Cadeia Posterior & Core + Corrida Fácil',
      desc: 'Hip drive e tração; Nordic assistido como "vacina" excêntrica (proteção de isquios). Fecha com 20\u2032 fáceis + 4 strides.',
      zone: 'Z2', dur: lite ? 65 : 85, rpe: 5,
      ex: [
        { name: 'Hip thrust', cat: 'FORCA', sets: 4 + ds, reps: '10', load: r1((95 + p * 15) * lf) },
        { name: 'Levantamento terra', cat: 'FORCA', sets: 3, reps: '8', load: r1((88 + p * 6) * lf) },
        { name: 'Flexão de braços (lastrada)', cat: 'FORCA', sets: 4, reps: '10' },
        { name: 'Nordic curl assistido', cat: 'CORE', sets: 3, reps: '5' },
        { name: 'Panturrilha em pé', cat: 'FORCA', sets: 3, reps: '15', load: r1(40 * lf) },
        { name: 'Pallof press', cat: 'CORE', sets: 3, reps: '12/lado' },
      ],
    },
    {
      day: 6, type: 'HIBRIDO', title: 'Circuito de Capacidade de Trabalho + Corrida',
      desc: '4 rounds contínuos: KB swing, farmer carry, SkiErg fácil e BBJ técnico — tolerância à fadiga multi-demandas. Corrida aeróbia de 30\u2032 no encerramento.',
      zone: 'Z2', dur: lite ? 70 : 100, rpe: lite ? 5 : 6,
      ex: [
        { name: 'Kettlebell swing', cat: 'FORCA', sets: 4, reps: '15', load: 16 },
        { name: 'Wall balls (técnica)', cat: 'FORCA', sets: 4, reps: '10', load: 6 },
        { name: 'Burpee broad jump (técnica)', cat: 'PLIOMETRIA', sets: 4, reps: '10m' },
      ],
      st: [
        { station: 'FARMERS', label: '4 × 40 m (2×20 kg)', dist: 160, load: 40 },
        { station: 'SKIERG', label: '4 × 250 m (leve)', dist: 1000 },
      ],
    },
    ATIVACAO(),
  ]
  return s
}

// ---------------------------------------------------------------- GPP2 (W7-11)
function gpp2Week(w: number, lite: boolean): RawSession[] {
  const p = lite ? 0.5 : Math.min(1, (w - 7) / 3)
  const lf = lite ? 0.9 : 1
  const s: RawSession[] = [
    {
      day: 1, type: 'FORCA', title: 'Força A — Força Máxima (Básicos) + Corrida Aeróbia',
      desc: 'Blocos de força máxima 4–6 RM (78–85% 1RM) com máxima intenção; recuperações completas. Corrida de 35\u2032 em Z2 para drenagem e base.',
      zone: 'Z2', dur: lite ? 75 : 100, rpe: lite ? 6 : 7,
      ex: [
        { name: 'Agachamento livre', cat: 'FORCA', sets: 5, reps: '4', load: r1((79 + p * 6) * lf), rest: '3\u2032' },
        { name: 'Levantamento terra convencional', cat: 'FORCA', sets: 4, reps: '4', load: r1((111 + p * 9) * lf), rest: '3\u2032' },
        { name: 'Desenvolvimento militar', cat: 'FORCA', sets: 4, reps: '5', load: r1((40 + p * 4) * lf) },
        { name: 'Remada pesada', cat: 'FORCA', sets: 4, reps: '6', load: r1((55 + p * 8) * lf) },
        { name: 'Leg press (acessório)', cat: 'FORCA', sets: 3, reps: '8', load: r1((140 + p * 20) * lf) },
        { name: 'Deadbug com carga', cat: 'CORE', sets: 3, reps: '10/lado' },
      ],
    },
    {
      day: 2, type: 'CORRIDA', title: 'Limiar Extensivo — 2 Blocos Z3',
      desc: '2×(10–14\u2032) no limiar (VT2 − 5 s/km) com 3\u2032 de trote entre blocos. Pilar do ritmo que sustentará os 8 km da prova.',
      zone: 'Z3', pace: '4:55–5:10/km', dur: lite ? 50 : 65, rpe: lite ? 6 : 7,
    },
    {
      day: 3, type: 'LPO', title: 'Força-Velocidade + Pliometria Moderada + Corrida',
      desc: 'Trap bar jumps e saltos com 30–40% 1RM — potência de quadricépite/glúteo; hurdles 50–60 cm e saltos horizontais. Corrida de 30\u2032 Z2.',
      zone: 'Z2', dur: lite ? 65 : 85, rpe: 6,
      ex: [
        { name: 'Salto com trap bar', cat: 'LPO', sets: 5, reps: '3', load: r1((45 + p * 10) * lf), rest: '2\u2032' },
        { name: 'Agachamento salto', cat: 'LPO', sets: 4, reps: '4', load: r1((30 + p * 5) * lf) },
        { name: 'Hurdle 50–60 cm', cat: 'PLIOMETRIA', sets: 4, reps: '6' },
        { name: 'Salto horizontal (bounds)', cat: 'PLIOMETRIA', sets: 3, reps: '5' },
        { name: 'A-run (mecânica de sprint)', cat: 'TECNICO', sets: 4, reps: '40m' },
      ],
    },
    {
      day: 4, type: 'CORRIDA', title: 'Longa Z2 + Progressivo Final',
      desc: '12–14 km com final de 20\u2032 em Z3 — estímulo de limiar em fadiga leve (especificidade progressiva).',
      zone: 'Z2→Z3', pace: 'final 20\u2032: 4:55–5:10/km', dur: lite ? 60 : 80, rpe: 6,
    },
    {
      day: 5, type: 'FORCA', title: 'Força B — Hip Drive & Tração + Strides',
      desc: 'Hip thrust pesado, barra fixa lastrada e RDL; fecha com 6×150 m em ritmo de stride (mecânica em fresco).',
      dur: lite ? 70 : 90, rpe: 6,
      ex: [
        { name: 'Hip thrust', cat: 'FORCA', sets: 5, reps: '5', load: r1((112 + p * 15) * lf), rest: '2\u203230\u2033' },
        { name: 'Barra fixa lastrada', cat: 'FORCA', sets: 5, reps: '3', load: r1((10 + p * 6) * lf) },
        { name: 'RDL', cat: 'FORCA', sets: 4, reps: '6', load: r1((85 + p * 10) * lf) },
        { name: 'Panturrilha em pé', cat: 'FORCA', sets: 3, reps: '12', load: r1(60 * lf) },
        { name: 'Anti-rotação (landmine)', cat: 'CORE', sets: 3, reps: '10/lado' },
      ],
    },
    {
      day: 6, type: 'HIBRIDO', title: 'Sled Init + Bloco de Limiar Final',
      desc: `Sled push/pull com carga progressiva (${lite ? 'leve' : '60→80% da alvo'}), 4–6 passagens de 20–25 m — adaptação específica sem custo excêntrico. Corrida final com 15\u2032 em Z3.`,
      zone: 'Z2→Z3', dur: lite ? 75 : 100, rpe: 7,
      st: [
        { station: 'SLED_PUSH', label: `${lite ? 4 : 4 + Math.min(2, w - 8)} × 25 m (carga ${lite ? '50' : r1(60 + p * 15)} kg)`, dist: 100, load: lite ? 50 : r1(60 + p * 15) },
        { station: 'SLED_PULL', label: `${lite ? 4 : 4 + Math.min(2, w - 8)} × 25 m (carga ${lite ? '50' : r1(60 + p * 15)} kg)`, dist: 100, load: lite ? 50 : r1(60 + p * 15) },
        { station: 'WALLBALLS', label: '4 × 12 (bola 6 kg)', reps: 48, load: 6 },
      ],
    },
    ATIVACAO(),
  ]
  return s
}

// ---------------------------------------------------------------- SPP1 (W12-17)
function spp1Week(w: number, lite: boolean): RawSession[] {
  const p = lite ? 0.5 : Math.min(1, (w - 12) / 4)
  const lf = lite ? 0.88 : 1
  const s: RawSession[] = [
    {
      day: 1, type: 'FORCA', title: 'Força-Potência A — Máxima Intenção + Corrida',
      desc: 'Agachamento a 85–90% 1RM com intenção máxima de velocidade concêntrica + trap bar jumps pesados. Corrida de 40\u2032 Z2.',
      zone: 'Z2', dur: lite ? 75 : 100, rpe: 7,
      ex: [
        { name: 'Agachamento livre', cat: 'FORCA', sets: 4, reps: '3', load: r1((85 + p * 5) * lf), rest: '3\u2032', note: 'máxima intenção' },
        { name: 'Salto com trap bar', cat: 'LPO', sets: 4, reps: '3', load: r1((50 + p * 10) * lf), rest: '2\u2032' },
        { name: 'Búlgaro (split squat)', cat: 'FORCA', sets: 3, reps: '6/perna', load: r1(24 * lf) },
        { name: 'Supino reto', cat: 'FORCA', sets: 4, reps: '5', load: r1((57 + p * 6) * lf) },
        { name: 'Remada pesada', cat: 'FORCA', sets: 4, reps: '5', load: r1((65 + p * 8) * lf) },
        { name: 'Pallof press dinâmico', cat: 'CORE', sets: 3, reps: '12/lado' },
      ],
    },
    {
      day: 2, type: 'CORRIDA', title: 'Intervalados VO₂max — 1.000 m',
      desc: `${lite ? '3×1.000 m (deload: manter toque no VO₂)' : `${5 + Math.min(1, w - 12)}×1.000 m`} entre 4:20–4:30/km com 2\u203230\u2033 de trote. Estímulo central de potência aeróbia (protocolo tipo Helgerund).`,
      zone: 'Z4', pace: '4:20–4:30/km', dur: lite ? 50 : 70, rpe: lite ? 6 : 8,
    },
    {
      day: 3, type: 'HIBRIDO', title: 'Híbrido Específico I — Sleds + Wall Balls + Corrida',
      desc: `${lite ? '4' : '6→8'} séries rotativas: sled push 20 m (carga alvo), sled pull 20 m, 10–15 wall balls e 400 m em Z3 — o padrão energético da prova com FC controlada.`,
      zone: 'Z3', dur: lite ? 70 : 95, rpe: 8,
      ex: [
        { name: 'Wall balls (nos circuitos)', cat: 'FORCA', sets: lite ? 4 : 6, reps: '12', load: 9 },
        { name: 'Pallof / core anti-rotação', cat: 'CORE', sets: 3, reps: '12/lado' },
      ],
      st: [
        { station: 'SLED_PUSH', label: `${lite ? 4 : 6} × 20 m (carga ${lite ? '85' : r1(88 + p * 14)} kg)`, dist: 120, load: lite ? 85 : r1(88 + p * 14) },
        { station: 'SLED_PULL', label: `${lite ? 4 : 6} × 20 m (carga ${lite ? '85' : r1(88 + p * 14)} kg)`, dist: 120, load: lite ? 85 : r1(88 + p * 14) },
        { station: 'SANDBAG', label: `${lite ? 2 : 3} × 20 m (20 kg)`, dist: 60, load: 20 },
      ],
    },
    {
      day: 4, type: 'CORRIDA', title: 'Longa com Bloco de Limiar',
      desc: '14–16 km em Z2 com 25\u2032 finais em Z3 — limiar em volume, moldando a resistência específica dos 8×1 km.',
      zone: 'Z2→Z3', pace: 'final 25\u2032: 4:55–5:05/km', dur: lite ? 65 : 90, rpe: 6,
    },
    {
      day: 5, type: 'LPO', title: 'Força-Potência B + Pliometria + Corrida Fácil',
      desc: 'Depth jumps (40 cm), push press e panturrilha explosiva — RFD em fresco; 6×100 m de stride no fechamento.',
      dur: lite ? 60 : 85, rpe: 6,
      ex: [
        { name: 'Depth jump 40 cm', cat: 'PLIOMETRIA', sets: 4, reps: '4' },
        { name: 'Push press', cat: 'LPO', sets: 5, reps: '3', load: r1((36 + p * 6) * lf) },
        { name: 'Hip thrust', cat: 'FORCA', sets: 4, reps: '5', load: r1((115 + p * 12) * lf) },
        { name: 'Remada pesada', cat: 'FORCA', sets: 4, reps: '5', load: r1(70 * lf) },
        { name: 'Panturrilha explosiva', cat: 'FORCA', sets: 3, reps: '10', load: r1(70 * lf) },
      ],
    },
    {
      day: 6, type: 'HIBRIDO', title: 'Brick Race-Pace — 1 km + Estação',
      desc: `${lite ? '3' : '4→5'}×[1.000 m no ritmo alvo (4:45–4:55/km) + estação rotativa — SkiErg 250 m / Row 250 m / 20 wall balls / farmer 50 m / sandbag 25 m] com 2\u2032 de recuperação. Padrão neural da prova.`,
      zone: 'Z3-Z4', pace: '4:45–4:55/km (ritmo alvo)', dur: lite ? 70 : 95, rpe: 8,
      ex: [
        { name: 'Wall balls (rotação das estações)', cat: 'FORCA', sets: 4, reps: '20', load: 9 },
        { name: 'Kettlebell swing', cat: 'FORCA', sets: 3, reps: '15', load: 20 },
      ],
      st: [
        { station: 'SKIERG', label: 'rotação: 250 m × rodadas', dist: 1250 },
        { station: 'ROWING', label: 'rotação: 250 m × rodadas', dist: 1250 },
        { station: 'FARMERS', label: 'rotação: 50 m × rodadas (2×24 kg)', dist: 250, load: 48 },
      ],
    },
    ATIVACAO(),
  ]
  return s
}

// ---------------------------------------------------------------- SPP2 (W18-22)
function spp2Week(w: number, lite: boolean): RawSession[] {
  const p = Math.min(1, (w - 18) / 3)
  const s: RawSession[] = [
    {
      day: 1, type: 'FORCA', title: 'Força Manutenção-Potência + Corrida',
      desc: 'Volume de força reduzido (conversão concluída): 3×3 a 85% + saltos pesados — manter o ganho sem custo de fadiga. Corrida 40\u2032 Z2.',
      zone: 'Z2', dur: lite ? 70 : 90, rpe: 6,
      ex: [
        { name: 'Agachamento livre', cat: 'FORCA', sets: 3, reps: '3', load: 89, rest: '3\u2032' },
        { name: 'Salto com trap bar', cat: 'LPO', sets: 4, reps: '3', load: 55 },
        { name: 'Hip thrust', cat: 'FORCA', sets: 4, reps: '5', load: 125 },
        { name: 'Barra fixa lastrada', cat: 'FORCA', sets: 4, reps: '3', load: 15 },
        { name: 'Core anti-rotação', cat: 'CORE', sets: 3, reps: '10/lado' },
      ],
    },
    {
      day: 2, type: 'CORRIDA', title: 'Race-Pace + Wall Balls (pré-fadiga)',
      desc: `${lite ? '4' : '6→8'}×[1.000 m a 4:40–4:50/km + 15–20 wall balls]. Correr "sujo": FC elevada e pré-fadiga de membros superiores — exatamente o cenário da prova.`,
      zone: 'Z3-Z4', pace: '4:40–4:50/km', dur: lite ? 50 : 70, rpe: 8,
      ex: [{ name: 'Wall balls (dentro dos intervalos)', cat: 'FORCA', sets: lite ? 4 : 6, reps: '15', load: 9 }],
    },
    {
      day: 3, type: 'HIBRIDO', title: 'Híbrido Específico II — Volume de Estações',
      desc: `${lite ? '2' : '3–4'} rounds: sled push 2×25 m (carga alvo), sled pull 2×25 m, sandbag lunges 25 m, BBJ 20 m e 25 wall balls — corrida de 3×600 m em Z3 intercalada. Volume real de prova nas estações.`,
      zone: 'Z3', dur: lite ? 70 : 95, rpe: 8,
      ex: [{ name: 'Wall balls (nos rounds)', cat: 'FORCA', sets: 4, reps: '25', load: 9 }],
      st: [
        { station: 'SLED_PUSH', label: `${lite ? 2 : 3} × 50 m (2×25 m, 102 kg — carga alvo)`, dist: lite ? 100 : 150, load: 102 },
        { station: 'SLED_PULL', label: `${lite ? 2 : 3} × 50 m (2×25 m, 102 kg)`, dist: lite ? 100 : 150, load: 102 },
        { station: 'SANDBAG', label: `${lite ? 2 : 3} × 25 m (20 kg)`, dist: lite ? 50 : 75, load: 20 },
        { station: 'BBJ', label: `${lite ? 2 : 3} × 20 m`, dist: lite ? 40 : 60 },
      ],
    },
    {
      day: 4, type: 'CORRIDA', title: 'Longa Moderada + Race Pace Final',
      desc: '12–14 km em Z2 com 15\u2032 finais no ritmo de prova — transição suave entre metabolismos.',
      zone: 'Z2→Z3', pace: 'final 15\u2032: 4:45–4:55/km', dur: lite ? 60 : 80, rpe: 6,
    },
    {
      day: 5, type: 'LPO', title: 'Potência & Mecânica de Sprint',
      desc: 'Estímulo neural curto e fresco: depth jumps, sprints mecânicos e arremessos — RFD sem fadiga acumulada. 20\u2032 de corrida fácil.',
      dur: lite ? 55 : 70, rpe: 5,
      ex: [
        { name: 'Depth jump 40 cm', cat: 'PLIOMETRIA', sets: 4, reps: '3' },
        { name: 'Sprint mecânico (flying 60 m)', cat: 'TECNICO', sets: 8, reps: '60m' },
        { name: 'Arremesso medicine ball', cat: 'LPO', sets: 4, reps: '6', load: 4 },
        { name: 'Core (Pallof + prancha dinâmica)', cat: 'CORE', sets: 3, reps: '12' },
      ],
    },
    // sábado varia
    (() => {
      if (lite) {
        return {
          day: 6, type: 'HIBRIDO', title: 'Brick Leve Regenerativo',
          desc: '2×[1 km em ritmo alvo + 2 estações leves] — manter o padrão híbrido sem custo.',
          zone: 'Z3', dur: 55, rpe: 6,
        } as RawSession
      }
      if (w === 18) {
        return {
          day: 6, type: 'HIBRIDO', title: 'Brick Longo — 8×[800 m + Estação]',
          desc: '8×[800 m a 4:45/km + estação rotativa (ski 200 m / row 200 m / 15 WB / farmer 40 m / sandbag 20 m)] c/ 90\u2033 rec. Elevada densidade específica.',
          zone: 'Z3-Z4', pace: '4:45/km', dur: 95, rpe: 8,
        } as RawSession
      }
      if (w === 19) {
        return {
          day: 6, type: 'HIBRIDO', title: 'Brick 3×[2 km + 2 Estações]',
          desc: '3×[2.000 m a 4:50/km + sled push 25 m + 20 wall balls] c/ 3\u2032 rec. Blocos longos em fadiga acumulada.',
          zone: 'Z3-Z4', pace: '4:50/km', dur: 85, rpe: 8,
          st: [
            { station: 'SLED_PUSH', label: '3 × 25 m (102 kg)', dist: 75, load: 102 },
            { station: 'WALLBALLS', label: '3 × 20 (9 kg)', reps: 60, load: 9 },
          ],
        } as RawSession
      }
      if (w === 20) {
        return {
          day: 6, type: 'HIBRIDO', title: 'Brick Pico — 8×[1 km + Estação]',
          desc: '8×[1.000 m no ritmo alvo + estação rotativa] c/ 2\u2032 rec — pico de volume específico antes da meia simulação.',
          zone: 'Z3-Z4', pace: '4:45–4:50/km', dur: 100, rpe: 8,
        } as RawSession
      }
      // W21 — MEIA SIMULAÇÃO
      return {
        day: 6, type: 'HIBRIDO', title: 'MEIA SIMULAÇÃO — 4 Estações + 4×1 km',
        desc: 'Metade da prova em ritmo controlado: SkiErg → 1 km → Sled Push → 1 km → Row → 1 km → Wall Balls → 1 km. Ensaiar transições, hidratação e pacing (não maximal).',
        zone: 'Z3-Z4', pace: 'runs 4:50–5:00/km', dur: 45, km: 6, rpe: 9,
        st: [
          { station: 'SKIERG', label: '1.000 m', dist: 1000, split: 270, note: 'alvo 4:30' },
          { station: 'RUN_1KM', label: '1.000 m', dist: 1000, split: 300 },
          { station: 'SLED_PUSH', label: '50 m (102 kg)', dist: 50, load: 102, split: 95 },
          { station: 'RUN_1KM', label: '1.000 m', dist: 1000, split: 300 },
          { station: 'ROWING', label: '1.000 m', dist: 1000, split: 265, note: 'alvo 4:25' },
          { station: 'RUN_1KM', label: '1.000 m', dist: 1000, split: 300 },
          { station: 'WALLBALLS', label: '50 reps (9 kg)', reps: 50, load: 9, split: 160 },
          { station: 'RUN_1KM', label: '1.000 m', dist: 1000, split: 300 },
        ],
      } as RawSession
    })(),
    ATIVACAO(),
  ]
  void p
  return s
}

// ---------------------------------------------------------------- COMP (W23-26)
function compWeek(w: number): RawSession[] {
  const s: RawSession[] = [
    {
      day: 1, type: 'FORCA', title: 'Potência Manutenção + Corrida',
      desc: '3×3 a 85–87% + saltos: manter força sem fadiga. Corrida 35\u2032 Z2.',
      zone: 'Z2', dur: 80, rpe: 6,
      ex: [
        { name: 'Agachamento livre', cat: 'FORCA', sets: 3, reps: '3', load: 88, rest: '3\u2032' },
        { name: 'Salto com trap bar', cat: 'LPO', sets: 4, reps: '3', load: 55 },
        { name: 'Hip thrust', cat: 'FORCA', sets: 3, reps: '5', load: 125 },
        { name: 'Remada pesada', cat: 'FORCA', sets: 3, reps: '5', load: 75 },
      ],
    },
    {
      day: 2, type: 'CORRIDA', title: 'Race-Pace com Estações',
      desc: '3×[2 km a 4:45/km + 2 estações (ski 250 m + 15 WB)] c/ 3\u2032 rec. Densidade de prova em blocos longos.',
      zone: 'Z3-Z4', pace: '4:45/km', dur: 70, rpe: 8,
      ex: [{ name: 'Wall balls (nos blocos)', cat: 'FORCA', sets: 3, reps: '15', load: 9 }],
    },
    {
      day: 3, type: 'HIBRIDO', title: 'Híbrido Curto Intenso',
      desc: '4 rounds: sled push 50 m (carga alvo) + sled pull 50 m + 25 wall balls; corrida 4×400 m em race-pace entre rounds. Intensidade de prova, volume controlado.',
      zone: 'Z3-Z4', dur: 80, rpe: 7,
      ex: [{ name: 'Wall balls (nos rounds)', cat: 'FORCA', sets: 4, reps: '25', load: 9 }],
      st: [
        { station: 'SLED_PUSH', label: '4 × 50 m (102 kg)', dist: 200, load: 102 },
        { station: 'SLED_PULL', label: '4 × 50 m (102 kg)', dist: 200, load: 102 },
      ],
    },
    {
      day: 4, type: 'CORRIDA', title: 'Aeróbia + 15\u2032 Race Pace',
      desc: '10 km fáceis com 15\u2032 finais no ritmo alvo — manter o referencial de ritmo sem custo elevado.',
      zone: 'Z2→Z3', dur: 65, rpe: 5,
    },
    {
      day: 5, type: 'LPO', title: 'Primer Neural',
      desc: 'Saltos 4×3, sprints 4×80 m e 20\u2032 fácil: manter o SNC "afiado" com custo mínimo.',
      dur: 55, rpe: 4,
      ex: [
        { name: 'Depth jump', cat: 'PLIOMETRIA', sets: 4, reps: '3' },
        { name: 'Sprint 80 m', cat: 'TECNICO', sets: 4, reps: '80m' },
        { name: 'Arremesso medicine ball', cat: 'LPO', sets: 3, reps: '6', load: 4 },
      ],
    },
    // sábado varia
    (() => {
      if (w === 23) {
        return { day: 6, type: 'HIBRIDO', title: 'Brick — 6×[1 km + Estação]', desc: '6×[1.000 m a 4:45/km + estação rotativa] c/ 2\u2032 rec. Último grande estímulo antes da simulação #1.', zone: 'Z3-Z4', pace: '4:45/km', dur: 85, rpe: 8 } as RawSession
      }
      if (w === 24) {
        return {
          day: 6, type: 'HIBRIDO', title: 'SIMULAÇÃO COMPLETA #1 — Hyrox Integral',
          desc: 'Prova completa em ritmo alvo +5%: praticar transições/roxzone, hidratação e estratégia por estação. Registrar todos os splits — a análise define os ajustes finais. Splits-alvo: runs 5:00/km.',
          zone: 'Z3-Z5', pace: 'runs 5:00/km', dur: 80, km: 8, rpe: 10,
          st: fullSimStations(1.05),
        } as RawSession
      }
      if (w === 25) {
        return { day: 6, type: 'HIBRIDO', title: 'Brick Curto — 4×[1 km + 2 Estações]', desc: '4×[1.000 m a 4:45/km + 2 estações leves] c/ 2\u2032 rec — afiar o padrão após a simulação.', zone: 'Z3-Z4', pace: '4:45/km', dur: 70, rpe: 7 } as RawSession
      }
      // W26 — simulação #2 (ensaio geral)
      return {
        day: 6, type: 'HIBRIDO', title: 'SIMULAÇÃO COMPLETA #2 — Ensaio Geral',
        desc: 'Ensaio com 100% da logística: roupa, tênis e hidratação da prova, splits nas metas finais. Último estímulo máximo (14 dias antes da prova).',
        zone: 'Z3-Z5', pace: 'runs 4:55/km', dur: 78, km: 8, rpe: 10,
        st: fullSimStations(1.0),
      } as RawSession
    })(),
    ATIVACAO(),
  ]
  return s
}

// ---------------------------------------------------------------- TAPER (W27-28)
function taperWeek(w: number): RawSession[] {
  if (w === 27) {
    return [
      { day: 1, type: 'FORCA', title: 'Força Priming (PAP) + 25\u2032 Z2', desc: '2×3 a 85% + 3×3 saltos: ativação de SNC via pós-ativação (PAP) sem fadiga residual.', zone: 'Z2', dur: 60, km: 3, rpe: 4, ex: [{ name: 'Agachamento livre', cat: 'FORCA', sets: 2, reps: '3', load: 89, rest: '3\u2032' }, { name: 'Salto com trap bar', cat: 'LPO', sets: 3, reps: '3', load: 55 }, { name: 'Hip thrust', cat: 'FORCA', sets: 2, reps: '5', load: 125 }] },
      { day: 2, type: 'CORRIDA', title: '4×1 km Race-Pace c/ Recuperação Completa', desc: '4×1.000 m a 4:45–4:50/km com 3\u2032 de trote — manter o referencial de ritmo com frescor.', zone: 'Z3-Z4', pace: '4:45–4:50/km', dur: 55, km: 6, rpe: 6 },
      { day: 3, type: 'REGEN', title: 'Regenerativo Leve', desc: 'Mobilidade + 20\u2032 de bike Z1 + hidroterapia se disponível. Sono como prioridade absoluta.', zone: 'Z1', dur: 40, rpe: 2 },
      { day: 4, type: 'CORRIDA', title: 'Aeróbia Fácil + 4 Strides', desc: '5 km em Z2 e 4 strides de 100 m — manter o tônus sem custo.', zone: 'Z2', dur: 40, km: 5, rpe: 4 },
      { day: 5, type: 'LPO', title: 'Primer Neural', desc: '3×3 saltos + 4×100 m strides: último toque de RFD antes da semana de prova.', dur: 35, km: 2, rpe: 3, ex: [{ name: 'Saltos (hurdle baixo)', cat: 'PLIOMETRIA', sets: 3, reps: '3' }] },
      { day: 6, type: 'HIBRIDO', title: 'Ensaio de Transições', desc: '2×[1 km race-pace + 2 estações (sled 25 m + 15 wall balls)] — ensaiar entrada/saída de estações e ritmo imediato pós-fadiga.', zone: 'Z3-Z4', dur: 50, km: 4, rpe: 6, st: [{ station: 'SLED_PUSH', label: '2 × 25 m (102 kg)', dist: 50, load: 102 }, { station: 'WALLBALLS', label: '2 × 15 (9 kg)', reps: 30, load: 9 }] },
      ATIVACAO(40),
    ]
  }
  // W28 — semana de prova
  return [
    { day: 1, type: 'FORCA', title: 'Priming Final', desc: 'Agachamento 2×3 a 85% + 3×3 saltos + mobilidade; 20\u2032 Z2. Efeito de PAP com cargas familiares — zero novidades.', zone: 'Z2', dur: 50, km: 4, rpe: 3, ex: [{ name: 'Agachamento livre', cat: 'FORCA', sets: 2, reps: '3', load: 89 }, { name: 'Saltos leves', cat: 'PLIOMETRIA', sets: 3, reps: '3' }] },
    { day: 2, type: 'CORRIDA', title: 'Tiros Race-Pace', desc: '5×400 m a 4:40–4:45/km com recuperação total + 15\u2032 Z2. Confiança e afinação de ritmo.', zone: 'Z3-Z4', pace: '4:40–4:45/km', dur: 45, km: 4, rpe: 5 },
    { day: 3, type: 'ATIVACAO', title: 'Ativação Leve + Mobilidade', desc: 'Bike 20\u2032 Z1, educativos e banda elástica — corpo acordado, mente tranquila.', zone: 'Z1', dur: 35, rpe: 2 },
    { day: 4, type: 'REGEN', title: 'Descanso Passivo — Viagem & Logística', desc: 'Caminhada de 20\u2032 opcional; hidratação proativa, checklist de prova (chip, roupa, nutrition) e visualização do percurso.', zone: 'Z1', dur: 30, rpe: 1 },
    { day: 5, type: 'ATIVACAO', title: 'Shake-out', desc: '15\u2032 em Z1 + 4 strides + mobilidade. Se a wave for domingo (09/05), deslocar esta sessão para sábado.', zone: 'Z1', dur: 30, km: 2, rpe: 2 },
    {
      day: 6, type: 'HIBRIDO', title: 'PROVA — HYROX 8/9 MAIO 2027',
      desc: 'Divisão Open. Estratégia: saída controlada (5:00/km nos 2 primeiros 1 km), estações em cadência constante (RPM > força), transições fluidas e hidratação nos km 3/5/7. Alvo: 1:08–1:12.',
      zone: 'Z3-Z5', pace: 'runs 4:52/km', dur: 80, km: 8, rpe: 10,
      st: fullSimStations(0.97),
    },
    { day: 7, type: 'REGEN', title: 'Recuperação Pós-Prova', desc: 'Caminhada 30\u2032 + mobilidade suave + celebração. Planejar transição pós-temporada na semana seguinte.', zone: 'Z1', dur: 40, rpe: 1 },
  ]
}

// ---------------------------------------------------------------- estações da simulação/prova
function fullSimStations(f: number): StSpec[] {
  const sp = (sec: number) => Math.round(sec * f)
  return [
    { station: 'RUN_1KM', label: '1.000 m — 1ª', dist: 1000, split: sp(295) },
    { station: 'SKIERG', label: '1.000 m', dist: 1000, split: sp(265), note: 'alvo 4:25' },
    { station: 'RUN_1KM', label: '1.000 m — 2ª', dist: 1000, split: sp(295) },
    { station: 'SLED_PUSH', label: '50 m (2×25 m)', dist: 50, load: 102, split: sp(85) },
    { station: 'RUN_1KM', label: '1.000 m — 3ª', dist: 1000, split: sp(295) },
    { station: 'SLED_PULL', label: '50 m (2×25 m)', dist: 50, load: 102, split: sp(105) },
    { station: 'RUN_1KM', label: '1.000 m — 4ª', dist: 1000, split: sp(295) },
    { station: 'BBJ', label: '80 m', dist: 80, split: sp(135) },
    { station: 'RUN_1KM', label: '1.000 m — 5ª', dist: 1000, split: sp(295) },
    { station: 'ROWING', label: '1.000 m', dist: 1000, split: sp(255), note: 'alvo 4:15' },
    { station: 'RUN_1KM', label: '1.000 m — 6ª', dist: 1000, split: sp(295) },
    { station: 'FARMERS', label: '200 m (2×100 m)', dist: 200, load: 48, split: sp(125) },
    { station: 'RUN_1KM', label: '1.000 m — 7ª', dist: 1000, split: sp(295) },
    { station: 'SANDBAG', label: '100 m (20 kg)', dist: 100, load: 20, split: sp(220) },
    { station: 'RUN_1KM', label: '1.000 m — 8ª', dist: 1000, split: sp(295) },
    { station: 'WALLBALLS', label: '100 reps (9 kg)', reps: 100, load: 9, split: sp(310) },
  ]
}

// ---------------------------------------------------------------- builder principal
function buildSessionsForWeek(w: number): RawSession[] {
  const meso = MESOS.find((m) => w >= m.weeks[0] && w <= m.weeks[1])!
  const lite = ['6', '11', '17', '22'].includes(String(w))
  switch (meso.code) {
    case 'DIAG': return diagWeek()
    case 'GPP1': return gpp1Week(w, lite)
    case 'GPP2': return gpp2Week(w, lite)
    case 'SPP1': return spp1Week(w, lite)
    case 'SPP2': return spp2Week(w, lite)
    case 'COMP': return compWeek(w)
    case 'TAPER': return taperWeek(w)
    default: return []
  }
}

// ---------------------------------------------------------------- atualiza dados de exemplo (realizado)
const TODAY_KEY = dateKey(new Date(new Date().toISOString().slice(0, 10)))

interface ActualOverride {
  status: string
  dur?: number
  km?: number
  rpe?: number
  notes?: string
  exActual?: { name: string; sets?: number; reps?: string; load?: number }[]
}

function actualFor(date: string, raw: RawSession): ActualOverride | null {
  // Segunda 26/10 — sessão leve concluída
  if (date === '2026-10-26') {
    return {
      status: 'CONCLUIDO', dur: 72, km: 5.2, rpe: 4,
      notes: 'Avaliação antropométrica registrada: 76,0 kg / 12% GC. Sessão leve conforme planejado — resposta boa.',
      exActual: [
        { name: 'Agachamento livre', sets: 3, reps: '8', load: 55 },
        { name: 'Levantamento terra (técnico)', sets: 3, reps: '5', load: 70 },
        { name: 'Supino reto', sets: 3, reps: '8', load: 40 },
        { name: 'Remada curvada', sets: 3, reps: '8', load: 47 },
      ],
    }
  }
  // Terça 27/10 — teste incremental concluído (dados de exemplo, editáveis)
  if (date === '2026-10-27') {
    return {
      status: 'CONCLUIDO', dur: 55, km: 3.1, rpe: 9,
      notes: 'Exemplo de registro — substitua pelos seus resultados reais. Resultados: VO₂max 47,2 mL/kg/min (VDOT 46); VT1 a 10,0 km/h (6:00/km, FC 152); VT2 a 11,9 km/h (5:02/km, FC 179); FCmáx 201 bpm.',
      exActual: [{ name: 'Protocolo incremental (8→exaustão, +1 km/h/3\u2032)', reps: '9 stages' }],
    }
  }
  return null
}

// ---------------------------------------------------------------- seed
async function main() {
  console.log('Limpando base…')
  await db.wellness.deleteMany()
  await db.exercise.deleteMany()
  await db.stationResult.deleteMany()
  await db.trainingSession.deleteMany()
  await db.microcycle.deleteMany()
  await db.mesocycle.deleteMany()
  await db.athlete.deleteMany()

  console.log('Criando atleta…')
  await db.athlete.create({
    data: {
      name: 'Rafael Nogueira',
      birthDate: new Date(Date.UTC(2005, 5, 10)),
      heightCm: 179,
      weightKg: 76,
      bodyFatPct: 12,
      raceName: 'HYROX — 8/9 Maio 2027',
      raceDate: new Date(RACE_DATE),
      restingHr: 52,
      maxHr: 201,
      vo2max: 47.2,
      vdot: 46,
      vt1SpeedKmh: 10.0,
      vt2SpeedKmh: 11.9,
      fiveKmPbSec: 1440,
      goalRaceTime: 4140,
      notes: 'Zonas calibradas no teste incremental de 27/10/2026 (valores editáveis). Cargas das estações conforme divisão Open M — confirmar no regulamento oficial.',
    },
  })

  for (const m of MESOS) {
    const w1 = weekStart(m.weeks[0])
    const w2 = addDays(weekStart(m.weeks[1]), 6)
    const volumeKm = m.weeks.reduce((acc, w) => acc + WEEK_PARAMS[w].km, 0)
    const meso = await db.mesocycle.create({
      data: {
        code: m.code, name: m.name, order: MESOS.indexOf(m) + 1,
        startDate: w1, endDate: w2,
        goal: m.goal, focus: m.focus, intensityNote: m.intensityNote, keyWorkouts: m.keyWorkouts,
        volumeTargetKm: volumeKm,
      },
    })
    console.log(`Mesociclo ${m.code} (${m.name}) — semanas ${m.weeks[0]}–${m.weeks[1]}`)

    for (let w = m.weeks[0]; w <= m.weeks[1]; w++) {
      const wp = WEEK_PARAMS[w]
      const ws = weekStart(w)
      const raw = buildSessionsForWeek(w)
      // distribui km conforme pesos da fase (exceto semanas com km absolutos: DIAG, TAPER)
      if (KM_WEIGHTS[m.code]) scaleKm(raw, wp.km, KM_WEIGHTS[m.code])
      const kmTotal = r1(raw.reduce((acc, s) => acc + (s.km ?? 0), 0))
      const tonnage = tonnageOf(raw.flatMap((s) => (s.ex ?? []).map((e) => ({
        setsPrescribed: e.sets, repsPrescribed: e.reps, loadPrescribedKg: e.load,
      }))))

      const micro = await db.microcycle.create({
        data: {
          mesocycleId: meso.id, weekNumber: w, startDate: ws, endDate: addDays(ws, 6),
          type: wp.type, targetKm: kmTotal, targetTonnageKg: tonnage, targetSessions: 7, note: wp.note ?? null,
        },
      })

      for (const rs of raw) {
        const date = addDays(ws, rs.day - 1)
        const key = dateKey(date)
        const ov = actualFor(key, rs)
        const tonS = tonnageOf((rs.ex ?? []).map((e) => ({ setsPrescribed: e.sets, repsPrescribed: e.reps, loadPrescribedKg: e.load })))
        const loadP = rs.rpe * rs.dur

        await db.trainingSession.create({
          data: {
            microcycleId: micro.id, date, dayIndex: rs.day, type: rs.type, title: rs.title, description: rs.desc,
            hrZone: rs.zone ?? null, paceTarget: rs.pace ?? null,
            durationPrescribedMin: rs.dur,
            durationActualMin: ov?.dur ?? null,
            kmPrescribed: rs.km ?? null,
            kmActual: ov?.km ?? null,
            tonnagePrescribedKg: tonS > 0 ? tonS : null,
            tonnageActualKg: null,
            rpePrescribed: rs.rpe,
            rpeActual: ov?.rpe ?? null,
            loadPrescribed: loadP,
            loadActual: ov && ov.dur && ov.rpe ? ov.rpe * ov.dur : null,
            status: ov?.status ?? 'PLANEJADO',
            notes: ov?.notes ?? null,
            exercises: {
              create: (rs.ex ?? []).map((e, i) => {
                const a = ov?.exActual?.find((x) => x.name === e.name)
                return {
                  order: i + 1, name: e.name, category: e.cat,
                  setsPrescribed: e.sets ?? null, repsPrescribed: e.reps ?? null,
                  loadPrescribedKg: e.load ?? null, tempo: e.tempo ?? null, rest: e.rest ?? null,
                  setsActual: a?.sets ?? null, repsActual: a?.reps ?? null, loadActualKg: a?.load ?? null,
                  notes: e.note ?? null,
                }
              }),
            },
            stations: {
              create: (rs.st ?? []).map((st, i) => ({
                order: i + 1, station: st.station, label: st.label,
                distanceM: st.dist ?? null, reps: st.reps ?? null, loadKg: st.load ?? null,
                splitPrescribedSec: st.split ?? null, splitActualSec: null, notes: st.note ?? null,
              })),
            },
          },
        })
      }
    }
  }

  // tonelagem "realizada" da sessão de segunda (a partir dos exercícios reais)
  const mon = await db.trainingSession.findFirst({
    where: { date: new Date('2026-10-26T00:00:00.000Z') },
    include: { exercises: true },
  })
  if (mon) {
    const tA = (await import('../src/lib/tonnage')).tonnageOfActual(mon.exercises)
    await db.trainingSession.update({ where: { id: mon.id }, data: { tonnageActualKg: tA } })
  }

  console.log('Registrando bem-estar de exemplo (26–27/10)…')
  await db.wellness.createMany({
    data: [
      { date: new Date('2026-10-26T00:00:00.000Z'), sleepHours: 7.5, sleepQuality: 4, soreness: 2, fatigue: 2, stress: 2, motivation: 4, restingHr: 52, hrv: 68, weightKg: 76.2, notes: 'Início do ciclo — descansado.' },
      { date: new Date('2026-10-27T00:00:00.000Z'), sleepHours: 7.0, sleepQuality: 3, soreness: 2, fatigue: 3, stress: 3, motivation: 4, restingHr: 54, hrv: 62, weightKg: 76.0, notes: 'Leve tensão pré-teste.' },
    ],
  })

  const nSessions = await db.trainingSession.count()
  const nWeeks = await db.microcycle.count()
  console.log(`✅ Seed concluído: ${nWeeks} microciclos, ${nSessions} sessões (${TODAY_KEY}).`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
