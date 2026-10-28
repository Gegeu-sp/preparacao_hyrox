// Motor Gerador de Periodização Científica Parametrizada pelos Testes do Atleta
// Escala zonas (Z1-Z5), ritmos, cargas de 3RM (Agachamento/Terra/Supino), pesos oficiais da divisão e splits de estações
import { db } from '@/lib/db'
import { tonnageOf } from '@/lib/tonnage'
import { DIVISION_STATION_SPECS, HR_ZONES } from '@/lib/constants'
import { fmtClock } from '@/lib/format'
import type { DynamicZoneDTO, HyroxDivision } from '@/lib/types'

const DAY = 86_400_000
const DEFAULT_PLAN_START = Date.UTC(2026, 9, 26) // segunda-feira, 26/out/2026
const r1 = (v: number) => Math.round(v * 10) / 10
const roundLoad25 = (v: number) => Math.max(2, Math.round(v / 2.5) * 2.5)

export interface AthleteTestCalibrationInput {
  id: string
  name: string
  gender: string
  division: string
  weightKg: number
  raceName: string
  raceDate: Date
  planStartDate?: Date
  restingHr: number | null
  maxHr: number | null
  vo2max: number | null
  vt1SpeedKmh: number | null
  vt2SpeedKmh: number | null
  fiveKmPbSec: number | null
  squat3rmKg: number | null
  deadlift3rmKg: number | null
  bench3rmKg: number | null
  cmjCm: number | null
  skiErg1kTtSec: number | null
  row500mTtSec: number | null
  goalRaceTime: number | null
}

interface CalibrationFactors {
  division: HyroxDivision
  vt1Kmh: number
  vt2Kmh: number
  maxHr: number
  squat3rm: number
  deadlift3rm: number
  bench3rm: number
  squatScale: number
  hingeScale: number
  upperScale: number
  volumeKmScale: number
  skiTargetSec: number
  rowTargetSec: number
  runRacePaceSec: number
  paceZ2Str: string
  paceZ3Str: string
  paceZ4Str: string
  paceRaceStr: string
}

/**
 * Deriva os fatores matemáticos de calibração a partir dos testes diagnósticos do atleta
 */
export function deriveCalibrationFactors(a: AthleteTestCalibrationInput): CalibrationFactors {
  const div = (['OPEN_M', 'OPEN_F', 'PRO_M', 'PRO_F'].includes(a.division) ? a.division : 'OPEN_M') as HyroxDivision
  const isFemale = a.gender === 'F' || div.endsWith('_F')

  // Velocidade de 5km ou estimativa por VO2max
  const v5k =
    a.fiveKmPbSec && a.fiveKmPbSec > 0
      ? 18000 / a.fiveKmPbSec
      : a.vo2max && a.vo2max > 0
        ? (a.vo2max - 3.5) / 3.5
        : isFemale
          ? 11.4
          : 12.5

  const vt2Kmh = a.vt2SpeedKmh && a.vt2SpeedKmh > 0 ? a.vt2SpeedKmh : r1(v5k * 0.93)
  const vt1Kmh = a.vt1SpeedKmh && a.vt1SpeedKmh > 0 ? a.vt1SpeedKmh : r1(vt2Kmh * 0.84)
  const maxHr = a.maxHr && a.maxHr > 120 ? a.maxHr : 198

  // Testes de 3RM (ou estimativa antropométrica segura caso o atleta ainda não tenha feito o teste de força)
  const squat3rm = a.squat3rmKg && a.squat3rmKg > 0 ? a.squat3rmKg : roundLoad25(a.weightKg * (isFemale ? 1.05 : 1.25))
  const deadlift3rm = a.deadlift3rmKg && a.deadlift3rmKg > 0 ? a.deadlift3rmKg : roundLoad25(a.weightKg * (isFemale ? 1.35 : 1.65))
  const bench3rm = a.bench3rmKg && a.bench3rmKg > 0 ? a.bench3rmKg : roundLoad25(a.weightKg * (isFemale ? 0.65 : 0.92))

  // Referência base da matriz: Agachamento 95kg, Terra 125kg, Supino 70kg
  const squatScale = Math.max(0.45, Math.min(2.2, squat3rm / 95))
  const hingeScale = Math.max(0.45, Math.min(2.2, deadlift3rm / 125))
  const upperScale = Math.max(0.45, Math.min(2.2, bench3rm / 70))

  // Escala de volume semanal de corrida (base VT2 = 11.9 km/h)
  const volumeKmScale = Math.max(0.75, Math.min(1.25, vt2Kmh / 11.9))

  // Paces por zona (em segundos por km)
  const z2FastSec = Math.round(3600 / (vt1Kmh * 1.02))
  const z2SlowSec = Math.round(3600 / (vt1Kmh * 0.89))
  const z3FastSec = Math.round(3600 / vt2Kmh)
  const z3SlowSec = z2FastSec
  const z4FastSec = Math.round(3600 / (vt2Kmh * 1.09))
  const z4SlowSec = z3FastSec
  const runRacePaceSec = Math.round(z3FastSec * 0.98)

  const paceZ2Str = `${fmtClock(z2FastSec)}–${fmtClock(z2SlowSec)}/km`
  const paceZ3Str = `${fmtClock(z3FastSec)}–${fmtClock(z3SlowSec)}/km`
  const paceZ4Str = `${fmtClock(z4FastSec)}–${fmtClock(z4SlowSec)}/km`
  const paceRaceStr = `${fmtClock(Math.max(180, runRacePaceSec - 5))}–${fmtClock(runRacePaceSec + 5)}/km`

  // Ergômetros (SkiErg 1000m TT e Row 500m TT -> 1000m em prova)
  const skiTargetSec = a.skiErg1kTtSec && a.skiErg1kTtSec > 0 ? Math.round(a.skiErg1kTtSec * 1.04) : isFemale ? 275 : 250
  const rowTargetSec = a.row500mTtSec && a.row500mTtSec > 0 ? Math.round(a.row500mTtSec * 2.18) : isFemale ? 280 : 252

  return {
    division: div,
    vt1Kmh,
    vt2Kmh,
    maxHr,
    squat3rm,
    deadlift3rm,
    bench3rm,
    squatScale,
    hingeScale,
    upperScale,
    volumeKmScale,
    skiTargetSec,
    rowTargetSec,
    runRacePaceSec,
    paceZ2Str,
    paceZ3Str,
    paceZ4Str,
    paceRaceStr,
  }
}

/**
 * Calcula as 5 zonas de treinamento (Z1-Z5) personalizadas para o atleta
 */
export function computeDynamicZones(a: {
  maxHr: number | null
  vt1SpeedKmh: number | null
  vt2SpeedKmh: number | null
  fiveKmPbSec: number | null
  vo2max: number | null
  gender?: string
  division?: string
}): DynamicZoneDTO[] {
  if (!a.maxHr && !a.vt1SpeedKmh && !a.vt2SpeedKmh && !a.fiveKmPbSec) {
    return HR_ZONES
  }
  const cal = deriveCalibrationFactors({
    id: 'temp',
    name: 'temp',
    gender: a.gender ?? 'M',
    division: a.division ?? 'OPEN_M',
    weightKg: 75,
    raceName: '',
    raceDate: new Date(),
    restingHr: 55,
    maxHr: a.maxHr,
    vo2max: a.vo2max,
    vt1SpeedKmh: a.vt1SpeedKmh,
    vt2SpeedKmh: a.vt2SpeedKmh,
    fiveKmPbSec: a.fiveKmPbSec,
    squat3rmKg: null,
    deadlift3rmKg: null,
    bench3rmKg: null,
    cmjCm: null,
    skiErg1kTtSec: null,
    row500mTtSec: null,
    goalRaceTime: null,
  })

  const hr = (pct: number) => Math.round(cal.maxHr * pct)
  const z1SlowPace = fmtClock(Math.round(3600 / (cal.vt1Kmh * 0.89)))
  const z4FastPace = fmtClock(Math.round(3600 / (cal.vt2Kmh * 1.09)))

  return [
    {
      zone: 'Z1',
      name: 'Recuperação',
      pctHrMax: '< 70%',
      hrBpm: `< ${hr(0.7)}`,
      pace: `> ${z1SlowPace}/km`,
      purpose: 'Regeneração, retorno pós-estações',
    },
    {
      zone: 'Z2',
      name: 'Aeróbia extensiva',
      pctHrMax: '70–80%',
      hrBpm: `${hr(0.7)}–${hr(0.8)}`,
      pace: cal.paceZ2Str,
      purpose: 'Volume aeróbio, economia de corrida, base',
    },
    {
      zone: 'Z3',
      name: 'Limiar moderado',
      pctHrMax: '80–90%',
      hrBpm: `${hr(0.8)}–${hr(0.9)}`,
      pace: cal.paceZ3Str,
      purpose: 'Tempo-run no/below VT2 — ritmo dominante do Hyrox',
    },
    {
      zone: 'Z4',
      name: 'Limiar alto / VO₂',
      pctHrMax: '90–95%',
      hrBpm: `${hr(0.9)}–${hr(0.95)}`,
      pace: cal.paceZ4Str,
      purpose: 'Intervalados VO₂max (5×1.000 m)',
    },
    {
      zone: 'Z5',
      name: 'Máxima',
      pctHrMax: '> 95%',
      hrBpm: `> ${hr(0.95)}`,
      pace: `< ${z4FastPace}/km`,
      purpose: 'Tiros curtos, simulações e prova',
    },
  ]
}

// ---------------------------------------------------------------- tipos internos de geração
interface ExSpec {
  name: string
  cat: string
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
  day: number
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

const MESOS = [
  {
    code: 'DIAG', name: 'Diagnóstico & Testes', weeks: [1, 1],
    goal: 'Estratificar capacidade aeróbia (VO₂max, VT1/VT2), força máxima (3RM), potência (CMJ) e rendimento nas estações. Calibrar zonas de FC/ritmo e cargas de toda a temporada.',
    focus: 'Teste incremental em esteira;3RM nos básicos;CMJ;TT SkiErg 1.000 m / Row 500 m;introdução técnica a sleds/carries',
    intensityNote: 'RPE 8–10 apenas nos testes; restante leve para não mascarar resultados.',
    keyWorkouts: 'Esteira incremental (ter) · 3RM + CMJ (qua) · TTs modais (sex)',
  },
  {
    code: 'GPP1', name: 'Preparatório Geral I — Base Aeróbica & Adaptação', weeks: [2, 6],
    goal: 'Construir base aeróbia ampla (Z2), adaptação anatômica de força e padrões de movimento sólidos. Consolidar a rotina de 7 dias com domingo regenerativo obrigatório.',
    focus: 'Volume Z2 progressivo;adaptação anatômica 3–4×10–12;LPO técnico e pliometria de baixa amplitude;circuitos de capacidade de trabalho',
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
    goal: 'Consolidar o ritmo de prova sob pré-fadiga; volume de estações com cargas/distâncias oficiais da divisão; meia simulação ao final da fase.',
    focus: '6–8×[1 km + wall balls];sleds full distance;sandbag/BBJ em volume real;MEIA-SIM (S21)',
    intensityNote: 'RPE 8 · gestão de fadiga excêntrica: 48 h entre estímulos de lunges/BBJ.',
    keyWorkouts: 'Race-pace + wall balls (ter) · híbrido II (qua) · MEIA SIMULAÇÃO (sáb S21)',
  },
  {
    code: 'COMP', name: 'Competitivo — Simulações & Afiamento', weeks: [23, 26],
    goal: 'Afinar o rendimento específico com 2 simulações completas (raio-X de splits no padrão HYRESULT e logística), reduzindo volume mantendo intensidade.',
    focus: 'SIMULAÇÕES COMPLETAS (S24 e S26);blocos de 2 km em race-pace;força de manutenção 3×3;transições/roxzone',
    intensityNote: 'RPE 8–10 nos sábados · volume −25% vs pico.',
    keyWorkouts: 'SIMULAÇÃO #1 (sáb S24) · SIMULAÇÃO #2 — ensaio geral (sáb S26)',
  },
  {
    code: 'TAPER', name: 'Tapering & Pico — Semana de Prova HYROX', weeks: [27, 28],
    goal: 'Chegar ao dia da prova com frescor máximo: redução exponencial de volume (−45% → −60%), intensidade mantida em doses curtas (priming neural/PAP) e logística perfeita.',
    focus: 'Priming PAP (2×3 a 85%);tiros curtos race-pace;sono/hidratação/viagem;domingo regenerativo mantido',
    intensityNote: 'RPE 2–6 · zero fadiga residual · FCmáx só na prova.',
    keyWorkouts: '4×1 km race-pace c/ rec. total (S27-ter) · PROVA (S28-sáb)',
  },
]

const WEEK_PARAMS: Record<number, { type: string; km: number; note?: string }> = {
  1:  { type: 'TESTE', km: 24, note: 'Bateria de testes: esteira incremental, 3RM, CMJ e TTs modais — os resultados calibram zonas e cargas de toda a temporada.' },
  2:  { type: 'DESENVOLVIMENTO', km: 32 },
  3:  { type: 'DESENVOLVIMENTO', km: 36 },
  4:  { type: 'DESENVOLVIMENTO', km: 40 },
  5:  { type: 'DESENVOLVIMENTO', km: 44, note: 'Pico do GPP1 — maior volume de corrida da fase.' },
  6:  { type: 'REGENERATIVO', km: 26, note: 'Deload: volume −40%, intensidade mantida em 1 estímulo curto.' },
  7:  { type: 'DESENVOLVIMENTO', km: 44 },
  8:  { type: 'DESENVOLVIMENTO', km: 48 },
  9:  { type: 'FLEXIVEL', km: 36, note: 'Semana flexível: prioridade Ter/Qui/Sáb — mínimo 5 sessões.' },
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
  24: { type: 'DESENVOLVIMENTO', km: 42, note: 'SIMULAÇÃO COMPLETA #1 no sábado — ritmo de prova + 5% (análise HYRESULT).' },
  25: { type: 'DESENVOLVIMENTO', km: 36 },
  26: { type: 'DESENVOLVIMENTO', km: 34, note: 'SIMULAÇÃO COMPLETA #2 — ensaio geral (14 dias antes da prova).' },
  27: { type: 'REGENERATIVO', km: 20, note: 'Tapering: volume −45%, intensidade em doses curtas.' },
  28: { type: 'COMPETICAO', km: 18, note: 'SEMANA DE PROVA — HYROX Oficial.' },
}

const KM_WEIGHTS: Record<string, number[]> = {
  GPP1: [0.15, 0.20, 0.12, 0.29, 0.09, 0.15, 0],
  GPP2: [0.13, 0.20, 0.11, 0.27, 0.09, 0.20, 0],
  SPP1: [0.14, 0.22, 0.09, 0.27, 0.08, 0.20, 0],
  SPP2: [0.15, 0.21, 0.08, 0.25, 0.07, 0.24, 0],
  COMP: [0.17, 0.22, 0.09, 0.22, 0.07, 0.23, 0],
}

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
  sessions.forEach((s) => {
    if (s.km == null && s.day <= 7) {
      s.km = r1(target * (weights[s.day - 1] ?? 0))
    }
  })
}

function fullSimStations(f: number, cal: CalibrationFactors): StSpec[] {
  const sp = (sec: number) => Math.round(sec * f)
  const spec = DIVISION_STATION_SPECS[cal.division]
  const runSplit = sp(cal.runRacePaceSec)
  const skiSplit = sp(cal.skiTargetSec)
  const rowSplit = sp(cal.rowTargetSec)
  // Escala das estações de força pela relação força/peso inversa (atleta mais forte = split mais rápido)
  const strFactor = 1 / Math.max(0.8, Math.min(1.25, (cal.squatScale + cal.hingeScale) / 2))

  return [
    { station: 'RUN_1KM', label: '1.000 m — 1ª', dist: 1000, split: runSplit },
    { station: 'SKIERG', label: '1.000 m', dist: 1000, split: skiSplit, note: `alvo ${fmtClock(skiSplit)}` },
    { station: 'RUN_1KM', label: '1.000 m — 2ª', dist: 1000, split: runSplit },
    { station: 'SLED_PUSH', label: `50 m (2×25 m · ${spec.sledPushKg} kg)`, dist: 50, load: spec.sledPushKg, split: sp(Math.round(145 * strFactor)) },
    { station: 'RUN_1KM', label: '1.000 m — 3ª', dist: 1000, split: sp(Math.round(cal.runRacePaceSec * 1.05)) },
    { station: 'SLED_PULL', label: `50 m (2×25 m · ${spec.sledPullKg} kg)`, dist: 50, load: spec.sledPullKg, split: sp(Math.round(195 * strFactor)) },
    { station: 'RUN_1KM', label: '1.000 m — 4ª', dist: 1000, split: runSplit },
    { station: 'BBJ', label: '80 m', dist: 80, split: sp(Math.round(cal.runRacePaceSec * 0.82)) },
    { station: 'RUN_1KM', label: '1.000 m — 5ª', dist: 1000, split: runSplit },
    { station: 'ROWING', label: '1.000 m', dist: 1000, split: rowSplit, note: `alvo ${fmtClock(rowSplit)}` },
    { station: 'RUN_1KM', label: '1.000 m — 6ª', dist: 1000, split: runSplit },
    { station: 'FARMERS', label: `200 m (2×${spec.farmersEachKg} kg)`, dist: 200, load: spec.farmersTotalKg, split: sp(Math.round(125 * strFactor)) },
    { station: 'RUN_1KM', label: '1.000 m — 7ª', dist: 1000, split: runSplit },
    { station: 'SANDBAG', label: `100 m (${spec.sandbagKg} kg)`, dist: 100, load: spec.sandbagKg, split: sp(Math.round(235 * strFactor)) },
    { station: 'RUN_1KM', label: '1.000 m — 8ª', dist: 1000, split: sp(Math.round(cal.runRacePaceSec * 1.06)) },
    { station: 'WALLBALLS', label: `100 reps (${spec.wallBallKg} kg)`, reps: 100, load: spec.wallBallKg, split: sp(Math.round(295 * strFactor)) },
  ]
}

function buildSessionsForWeek(w: number, cal: CalibrationFactors): RawSession[] {
  const meso = MESOS.find((m) => w >= m.weeks[0] && w <= m.weeks[1])!
  const lite = ['6', '11', '17', '22'].includes(String(w))
  const spec = DIVISION_STATION_SPECS[cal.division]
  const sq = (base: number) => roundLoad25(base * cal.squatScale)
  const hg = (base: number) => roundLoad25(base * cal.hingeScale)
  const up = (base: number) => roundLoad25(base * cal.upperScale)

  switch (meso.code) {
    case 'DIAG':
      return [
        {
          day: 1, type: 'FORCA', title: 'Boas-vindas + Avaliação Antropométrica + Força Leve',
          desc: 'Registro de massa/composição e sessão leve de re-aclimatação aos básicos (50–55% 1RM estimado) antes dos testes de 3RM na quarta.',
          zone: 'Z2 (corrida)', pace: cal.paceZ2Str, dur: 75, km: 5, rpe: 4,
          ex: [
            { name: 'Agachamento livre', cat: 'FORCA', sets: 3, reps: '8', load: sq(52), tempo: '3-0-X' },
            { name: 'Levantamento terra (técnico)', cat: 'FORCA', sets: 3, reps: '5', load: hg(70) },
            { name: 'Supino reto', cat: 'FORCA', sets: 3, reps: '8', load: up(40) },
            { name: 'Remada curvada', cat: 'FORCA', sets: 3, reps: '8', load: up(45) },
            { name: 'Prancha frontal', cat: 'CORE', sets: 3, reps: '45s' },
          ],
        },
        {
          day: 2, type: 'TESTE', title: 'Teste Incremental em Esteira — VO₂max, VT1 e VT2',
          desc: `Protocolo incremental para determinar VT1 (${cal.vt1Kmh} km/h) e VT2 (${cal.vt2Kmh} km/h). Resultados calibram as 5 zonas de FC/ritmo usadas em todo o ciclo.`,
          zone: 'Z3→Z5', dur: 60, km: 3, rpe: 9,
          ex: [
            { name: 'Protocolo incremental (8→exaustão, +1 km/h/3\u2032)', cat: 'TECNICO', reps: '8-9 stages' },
            { name: 'Trote regenerativo pós-teste', cat: 'TECNICO', reps: '10\u2032' },
          ],
        },
        {
          day: 3, type: 'TESTE', title: 'Testes de Força Máxima (3RM) + CMJ',
          desc: '3RM em agachamento, terra, supino e remada; CMJ com tapete de contato (5 tentativas válidas). Define as % de referência dos blocos de força.',
          dur: 70, rpe: 8,
          ex: [
            { name: 'Agachamento livre — 3RM', cat: 'FORCA', sets: 1, reps: '3', load: cal.squat3rm, note: '≈90% 1RM' },
            { name: 'Levantamento terra — 3RM', cat: 'FORCA', sets: 1, reps: '3', load: cal.deadlift3rm },
            { name: 'Supino reto — 3RM', cat: 'FORCA', sets: 1, reps: '3', load: cal.bench3rm },
            { name: 'Remada curvada — 3RM', cat: 'FORCA', sets: 1, reps: '3', load: up(75) },
            { name: 'CMJ (tapete de contato)', cat: 'PLIOMETRIA', sets: 5, reps: '1' },
          ],
        },
        {
          day: 4, type: 'CORRIDA', title: 'Aeróbia Fácil + Strides',
          desc: 'Volume leve entre testes; 4×100 m progressivos para manter recrutamento neuromuscular.',
          zone: 'Z2', pace: cal.paceZ2Str, dur: 50, km: 8, rpe: 4,
        },
        {
          day: 5, type: 'TESTE', title: 'Testes Modais — 1.000 m SkiErg TT + 500 m Row TT',
          desc: 'Time-trials com recuperação completa (20\u2032): baseline de potência upper-body aeróbia. Registrar watts médios, FC pico e split/500 m.',
          dur: 50, km: 2, rpe: 9,
          st: [
            { station: 'SKIERG', label: '1.000 m — TT', dist: 1000, split: Math.round(cal.skiTargetSec / 1.04), note: `alvo ${fmtClock(Math.round(cal.skiTargetSec / 1.04))}` },
            { station: 'ROWING', label: '500 m — TT', dist: 500, split: Math.round(cal.rowTargetSec / 2.18), note: `alvo ${fmtClock(Math.round(cal.rowTargetSec / 2.18))}` },
          ],
        },
        {
          day: 6, type: 'HIBRIDO', title: 'Introdução Técnica — Sled / Carry / Sandbag + Corrida',
          desc: 'Aprender posições de sled (ângulo baixo, passos curtos e potentes), pegada de farmer e padrão de lunge com saco — cargas leves, foco 100% técnico.',
          zone: 'Z2', pace: cal.paceZ2Str, dur: 90, km: 6, rpe: 5,
          st: [
            { station: 'SLED_PUSH', label: '4 × 20 m (carga técnica)', dist: 80, load: Math.round(spec.sledPushKg * 0.45), split: 158 },
            { station: 'SLED_PULL', label: '4 × 20 m (carga técnica)', dist: 80, load: Math.round(spec.sledPullKg * 0.5), split: 218 },
            { station: 'FARMERS', label: `3 × 40 m (2×${spec.farmersEachKg} kg)`, dist: 120, load: spec.farmersTotalKg, split: 122 },
            { station: 'SANDBAG', label: `2 × 20 m (${spec.sandbagKg} kg, técnico)`, dist: 40, load: spec.sandbagKg, split: 254 },
          ],
        },
        ATIVACAO(),
      ]

    case 'GPP1': {
      const p = lite ? 0 : Math.min(1, (w - 2) / 3)
      const lf = lite ? 0.9 : 1
      const ds = lite ? -1 : 0
      return [
        {
          day: 1, type: 'FORCA', title: 'Força A — Adaptação Anatômica + Corrida Aeróbia',
          desc: 'Full-body com ênfase em cadeia posterior e anti-rotação; cargas conservadoras (55–65% 1RM) e técnica impecável. Corrida em Z2 logo após.',
          zone: 'Z2', pace: cal.paceZ2Str, dur: lite ? 70 : 90, rpe: lite ? 4 : 5,
          ex: [
            { name: 'Agachamento livre', cat: 'FORCA', sets: 4 + ds, reps: '10', load: sq((62 + p * 6) * lf), tempo: '3-0-X', rest: '90s' },
            { name: 'Levantamento terra romeno', cat: 'FORCA', sets: 3 + ds, reps: '10', load: hg((62 + p * 8) * lf) },
            { name: 'Supino reto', cat: 'FORCA', sets: 3, reps: '10', load: up((42 + p * 4) * lf) },
            { name: 'Remada curvada', cat: 'FORCA', sets: 3, reps: '10', load: up((40 + p * 5) * lf) },
            { name: 'Prancha frontal c/ peso', cat: 'CORE', sets: 3, reps: '45s' },
          ],
        },
        {
          day: 2, type: 'CORRIDA', title: 'Fartlek Estruturado Z2/Z3',
          desc: '20\u2032 Z2 + 6×(2\u2032 Z3 / 2\u2032 Z2) + 10\u2032 Z2. Primeiro contato diluído com o ritmo de limiar.',
          zone: 'Z2-Z3', pace: `Z3: ${cal.paceZ3Str}`, dur: lite ? 45 : 60, rpe: lite ? 5 : 6,
        },
        {
          day: 3, type: 'LPO', title: 'LPO Técnico + Pliometria Básica + Corrida',
          desc: 'Educativos e saltos de baixa amplitude: aprendizado neural de RFD e aterrissagem silenciosa. Corrida curta em Z2 no fim.',
          zone: 'Z2', pace: cal.paceZ2Str, dur: lite ? 60 : 80, rpe: 5,
          ex: [
            { name: 'A-skip / B-skip (educativos)', cat: 'TECNICO', sets: 3, reps: '30m' },
            { name: 'Agachamento salto (caixa)', cat: 'LPO', sets: 3, reps: '5', load: sq(20 * lf) },
            { name: 'Arremesso medicine ball (peito)', cat: 'LPO', sets: 4, reps: '8', load: spec.wallBallKg },
            { name: 'Step-up explosivo', cat: 'LPO', sets: 3, reps: '8/perna', load: sq(16 * lf) },
            { name: 'Pogo hops (tornozelo)', cat: 'PLIOMETRIA', sets: 3, reps: '20' },
            { name: 'Hurdle 30 cm', cat: 'PLIOMETRIA', sets: 3, reps: '6' },
          ],
        },
        {
          day: 4, type: 'CORRIDA', title: 'Longa Progressiva Z2',
          desc: `Volume central da semana${w >= 4 ? '; últimos 15\u2032 em Z3 (estímulo final)' : ''}. Cadência ≥ 178, FC estável — desenvolvimento de economia de corrida.`,
          zone: 'Z2', pace: cal.paceZ2Str, dur: lite ? 55 : 75, rpe: 5,
        },
        {
          day: 5, type: 'FORCA', title: 'Força B — Cadeia Posterior & Core + Corrida Fácil',
          desc: 'Hip drive e tração; Nordic assistido como proteção excêntrica de isquiotibiais. Fecha com 20\u2032 fáceis + 4 strides.',
          zone: 'Z2', pace: cal.paceZ2Str, dur: lite ? 65 : 85, rpe: 5,
          ex: [
            { name: 'Hip thrust', cat: 'FORCA', sets: 4 + ds, reps: '10', load: hg((95 + p * 15) * lf) },
            { name: 'Levantamento terra', cat: 'FORCA', sets: 3, reps: '8', load: hg((88 + p * 6) * lf) },
            { name: 'Flexão de braços (lastrada)', cat: 'FORCA', sets: 4, reps: '10' },
            { name: 'Nordic curl assistido', cat: 'CORE', sets: 3, reps: '5' },
            { name: 'Panturrilha em pé', cat: 'FORCA', sets: 3, reps: '15', load: sq(40 * lf) },
            { name: 'Pallof press', cat: 'CORE', sets: 3, reps: '12/lado' },
          ],
        },
        {
          day: 6, type: 'HIBRIDO', title: 'Circuito de Capacidade de Trabalho + Corrida',
          desc: '4 rounds contínuos: KB swing, farmer carry, SkiErg fácil e BBJ técnico — tolerância à fadiga multi-demandas.',
          zone: 'Z2', pace: cal.paceZ2Str, dur: lite ? 70 : 100, rpe: lite ? 5 : 6,
          ex: [
            { name: 'Kettlebell swing', cat: 'FORCA', sets: 4, reps: '15', load: spec.farmersEachKg },
            { name: 'Wall balls (técnica)', cat: 'FORCA', sets: 4, reps: '10', load: spec.wallBallKg },
            { name: 'Burpee broad jump (técnica)', cat: 'PLIOMETRIA', sets: 4, reps: '10m' },
          ],
          st: [
            { station: 'FARMERS', label: `4 × 40 m (2×${spec.farmersEachKg} kg)`, dist: 160, load: spec.farmersTotalKg },
            { station: 'SKIERG', label: '4 × 250 m (leve)', dist: 1000 },
          ],
        },
        ATIVACAO(),
      ]
    }

    case 'GPP2': {
      const p = lite ? 0.5 : Math.min(1, (w - 7) / 3)
      const lf = lite ? 0.9 : 1
      return [
        {
          day: 1, type: 'FORCA', title: 'Força A — Força Máxima (Básicos) + Corrida Aeróbia',
          desc: 'Blocos de força máxima 4–6 RM (78–85% 1RM) com máxima intenção; recuperações completas. Corrida de 35\u2032 em Z2.',
          zone: 'Z2', pace: cal.paceZ2Str, dur: lite ? 75 : 100, rpe: lite ? 6 : 7,
          ex: [
            { name: 'Agachamento livre', cat: 'FORCA', sets: 5, reps: '4', load: sq((79 + p * 6) * lf), rest: '3\u2032' },
            { name: 'Levantamento terra convencional', cat: 'FORCA', sets: 4, reps: '4', load: hg((111 + p * 9) * lf), rest: '3\u2032' },
            { name: 'Desenvolvimento militar', cat: 'FORCA', sets: 4, reps: '5', load: up((40 + p * 4) * lf) },
            { name: 'Remada pesada', cat: 'FORCA', sets: 4, reps: '6', load: up((55 + p * 8) * lf) },
            { name: 'Leg press (acessório)', cat: 'FORCA', sets: 3, reps: '8', load: sq((140 + p * 20) * lf) },
            { name: 'Deadbug com carga', cat: 'CORE', sets: 3, reps: '10/lado' },
          ],
        },
        {
          day: 2, type: 'CORRIDA', title: 'Limiar Extensivo — 2 Blocos Z3',
          desc: '2×(10–14\u2032) no limiar (VT2) com 3\u2032 de trote entre blocos. Pilar do ritmo que sustentará os 8 km da prova.',
          zone: 'Z3', pace: cal.paceZ3Str, dur: lite ? 50 : 65, rpe: lite ? 6 : 7,
        },
        {
          day: 3, type: 'LPO', title: 'Força-Velocidade + Pliometria Moderada + Corrida',
          desc: 'Trap bar jumps e saltos com 30–40% 1RM — potência de quadríceps/glúteo; hurdles 50–60 cm e saltos horizontais.',
          zone: 'Z2', pace: cal.paceZ2Str, dur: lite ? 65 : 85, rpe: 6,
          ex: [
            { name: 'Salto com trap bar', cat: 'LPO', sets: 5, reps: '3', load: hg((45 + p * 10) * lf), rest: '2\u2032' },
            { name: 'Agachamento salto', cat: 'LPO', sets: 4, reps: '4', load: sq((30 + p * 5) * lf) },
            { name: 'Hurdle 50–60 cm', cat: 'PLIOMETRIA', sets: 4, reps: '6' },
            { name: 'Salto horizontal (bounds)', cat: 'PLIOMETRIA', sets: 3, reps: '5' },
            { name: 'A-run (mecânica de sprint)', cat: 'TECNICO', sets: 4, reps: '40m' },
          ],
        },
        {
          day: 4, type: 'CORRIDA', title: 'Longa Z2 + Progressivo Final',
          desc: 'Longa aeróbia com final de 20\u2032 em Z3 — estímulo de limiar em fadiga leve (especificidade progressiva).',
          zone: 'Z2→Z3', pace: `final 20\u2032: ${cal.paceZ3Str}`, dur: lite ? 60 : 80, rpe: 6,
        },
        {
          day: 5, type: 'FORCA', title: 'Força B — Hip Drive & Tração + Strides',
          desc: 'Hip thrust pesado, barra fixa lastrada e RDL; fecha com 6×150 m em ritmo de stride (mecânica em fresco).',
          dur: lite ? 70 : 90, rpe: 6,
          ex: [
            { name: 'Hip thrust', cat: 'FORCA', sets: 5, reps: '5', load: hg((112 + p * 15) * lf), rest: '2\u203230\u2033' },
            { name: 'Barra fixa lastrada', cat: 'FORCA', sets: 5, reps: '3', load: up((10 + p * 6) * lf) },
            { name: 'RDL', cat: 'FORCA', sets: 4, reps: '6', load: hg((85 + p * 10) * lf) },
            { name: 'Panturrilha em pé', cat: 'FORCA', sets: 3, reps: '12', load: sq(60 * lf) },
            { name: 'Anti-rotação (landmine)', cat: 'CORE', sets: 3, reps: '10/lado' },
          ],
        },
        {
          day: 6, type: 'HIBRIDO', title: 'Sled Init + Bloco de Limiar Final',
          desc: `Sled push/pull com carga progressiva (${lite ? 'leve' : '60→80% da alvo da divisão'}), 4–6 passagens de 25 m. Corrida final com 15\u2032 em Z3.`,
          zone: 'Z2→Z3', pace: cal.paceZ3Str, dur: lite ? 75 : 100, rpe: 7,
          st: [
            { station: 'SLED_PUSH', label: `4 × 25 m (progressão ${cal.division})`, dist: 100, load: Math.round(spec.sledPushKg * (lite ? 0.6 : 0.7 + p * 0.15)) },
            { station: 'SLED_PULL', label: `4 × 25 m (progressão ${cal.division})`, dist: 100, load: Math.round(spec.sledPullKg * (lite ? 0.6 : 0.7 + p * 0.15)) },
            { station: 'WALLBALLS', label: `4 × 12 (bola ${spec.wallBallKg} kg)`, reps: 48, load: spec.wallBallKg },
          ],
        },
        ATIVACAO(),
      ]
    }

    case 'SPP1': {
      const p = lite ? 0.5 : Math.min(1, (w - 12) / 4)
      const lf = lite ? 0.88 : 1
      return [
        {
          day: 1, type: 'FORCA', title: 'Força-Potência A — Máxima Intenção + Corrida',
          desc: 'Agachamento a 85–90% 1RM com intenção máxima de velocidade concêntrica + trap bar jumps pesados. Corrida de 40\u2032 Z2.',
          zone: 'Z2', pace: cal.paceZ2Str, dur: lite ? 75 : 100, rpe: 7,
          ex: [
            { name: 'Agachamento livre', cat: 'FORCA', sets: 4, reps: '3', load: sq((85 + p * 5) * lf), rest: '3\u2032', note: 'máxima intenção' },
            { name: 'Salto com trap bar', cat: 'LPO', sets: 4, reps: '3', load: hg((50 + p * 10) * lf), rest: '2\u2032' },
            { name: 'Búlgaro (split squat)', cat: 'FORCA', sets: 3, reps: '6/perna', load: sq(24 * lf) },
            { name: 'Supino reto', cat: 'FORCA', sets: 4, reps: '5', load: up((57 + p * 6) * lf) },
            { name: 'Remada pesada', cat: 'FORCA', sets: 4, reps: '5', load: up((65 + p * 8) * lf) },
            { name: 'Pallof press dinâmico', cat: 'CORE', sets: 3, reps: '12/lado' },
          ],
        },
        {
          day: 2, type: 'CORRIDA', title: 'Intervalados VO₂max — 1.000 m',
          desc: `${lite ? '3×1.000 m (deload)' : `${5 + Math.min(1, w - 12)}×1.000 m`} em Z4 (${cal.paceZ4Str}) com 2\u203230\u2033 de trote. Estímulo central de potência aeróbia.`,
          zone: 'Z4', pace: cal.paceZ4Str, dur: lite ? 50 : 70, rpe: lite ? 6 : 8,
        },
        {
          day: 3, type: 'HIBRIDO', title: 'Híbrido Específico I — Sleds + Wall Balls + Corrida',
          desc: `${lite ? '4' : '6→8'} séries rotativas: sled push 20 m, sled pull 20 m, 12–15 wall balls e 400 m em Z3 — padrão energético da prova.`,
          zone: 'Z3', pace: cal.paceZ3Str, dur: lite ? 70 : 95, rpe: 8,
          ex: [
            { name: 'Wall balls (nos circuitos)', cat: 'FORCA', sets: lite ? 4 : 6, reps: '12', load: spec.wallBallKg },
            { name: 'Pallof / core anti-rotação', cat: 'CORE', sets: 3, reps: '12/lado' },
          ],
          st: [
            { station: 'SLED_PUSH', label: `${lite ? 4 : 6} × 20 m (${spec.sledPushKg} kg)`, dist: 120, load: spec.sledPushKg },
            { station: 'SLED_PULL', label: `${lite ? 4 : 6} × 20 m (${spec.sledPullKg} kg)`, dist: 120, load: spec.sledPullKg },
            { station: 'SANDBAG', label: `${lite ? 2 : 3} × 20 m (${spec.sandbagKg} kg)`, dist: 60, load: spec.sandbagKg },
          ],
        },
        {
          day: 4, type: 'CORRIDA', title: 'Longa com Bloco de Limiar',
          desc: 'Longa em Z2 com 25\u2032 finais em Z3 — limiar em volume, moldando a resistência específica dos 8×1 km.',
          zone: 'Z2→Z3', pace: `final 25\u2032: ${cal.paceZ3Str}`, dur: lite ? 65 : 90, rpe: 6,
        },
        {
          day: 5, type: 'LPO', title: 'Força-Potência B + Pliometria + Corrida Fácil',
          desc: 'Depth jumps (40 cm), push press e panturrilha explosiva — RFD em fresco; 6×100 m de stride no fechamento.',
          dur: lite ? 60 : 85, rpe: 6,
          ex: [
            { name: 'Depth jump 40 cm', cat: 'PLIOMETRIA', sets: 4, reps: '4' },
            { name: 'Push press', cat: 'LPO', sets: 5, reps: '3', load: up((36 + p * 6) * lf) },
            { name: 'Hip thrust', cat: 'FORCA', sets: 4, reps: '5', load: hg((115 + p * 12) * lf) },
            { name: 'Remada pesada', cat: 'FORCA', sets: 4, reps: '5', load: up(70 * lf) },
            { name: 'Panturrilha explosiva', cat: 'FORCA', sets: 3, reps: '10', load: sq(70 * lf) },
          ],
        },
        {
          day: 6, type: 'HIBRIDO', title: 'Brick Race-Pace — 1 km + Estação',
          desc: `${lite ? '3' : '4→5'}×[1.000 m no ritmo alvo (${cal.paceRaceStr}) + estação rotativa] com 2\u2032 de recuperação.`,
          zone: 'Z3-Z4', pace: `${cal.paceRaceStr} (ritmo alvo)`, dur: lite ? 70 : 95, rpe: 8,
          ex: [
            { name: 'Wall balls (rotação das estações)', cat: 'FORCA', sets: 4, reps: '20', load: spec.wallBallKg },
            { name: 'Kettlebell swing', cat: 'FORCA', sets: 3, reps: '15', load: spec.farmersEachKg },
          ],
          st: [
            { station: 'SKIERG', label: 'rotação: 250 m × rodadas', dist: 1250 },
            { station: 'ROWING', label: 'rotação: 250 m × rodadas', dist: 1250 },
            { station: 'FARMERS', label: `rotação: 50 m × rodadas (2×${spec.farmersEachKg} kg)`, dist: 250, load: spec.farmersTotalKg },
          ],
        },
        ATIVACAO(),
      ]
    }

    case 'SPP2': {
      return [
        {
          day: 1, type: 'FORCA', title: 'Força Manutenção-Potência + Corrida',
          desc: 'Volume de força reduzido (conversão concluída): 3×3 a 85% + saltos pesados — manter o ganho sem custo de fadiga. Corrida 40\u2032 Z2.',
          zone: 'Z2', pace: cal.paceZ2Str, dur: lite ? 70 : 90, rpe: 6,
          ex: [
            { name: 'Agachamento livre', cat: 'FORCA', sets: 3, reps: '3', load: sq(89), rest: '3\u2032' },
            { name: 'Salto com trap bar', cat: 'LPO', sets: 4, reps: '3', load: hg(55) },
            { name: 'Hip thrust', cat: 'FORCA', sets: 4, reps: '5', load: hg(125) },
            { name: 'Barra fixa lastrada', cat: 'FORCA', sets: 4, reps: '3', load: up(15) },
            { name: 'Core anti-rotação', cat: 'CORE', sets: 3, reps: '10/lado' },
          ],
        },
        {
          day: 2, type: 'CORRIDA', title: 'Race-Pace + Wall Balls (pré-fadiga)',
          desc: `${lite ? '4' : '6→8'}×[1.000 m a ${cal.paceRaceStr} + 15–20 wall balls]. Correr sob pré-fadiga ventilatória e de ombros.`,
          zone: 'Z3-Z4', pace: cal.paceRaceStr, dur: lite ? 50 : 70, rpe: 8,
          ex: [{ name: 'Wall balls (dentro dos intervalos)', cat: 'FORCA', sets: lite ? 4 : 6, reps: '15', load: spec.wallBallKg }],
        },
        {
          day: 3, type: 'HIBRIDO', title: 'Híbrido Específico II — Volume de Estações',
          desc: `${lite ? '2' : '3–4'} rounds: sled push 2×25 m, sled pull 2×25 m, sandbag lunges 25 m, BBJ 20 m e 25 wall balls — corrida de 3×600 m em Z3 intercalada.`,
          zone: 'Z3', pace: cal.paceZ3Str, dur: lite ? 70 : 95, rpe: 8,
          ex: [{ name: 'Wall balls (nos rounds)', cat: 'FORCA', sets: 4, reps: '25', load: spec.wallBallKg }],
          st: [
            { station: 'SLED_PUSH', label: `${lite ? 2 : 3} × 50 m (${spec.sledPushKg} kg)`, dist: lite ? 100 : 150, load: spec.sledPushKg },
            { station: 'SLED_PULL', label: `${lite ? 2 : 3} × 50 m (${spec.sledPullKg} kg)`, dist: lite ? 100 : 150, load: spec.sledPullKg },
            { station: 'SANDBAG', label: `${lite ? 2 : 3} × 25 m (${spec.sandbagKg} kg)`, dist: lite ? 50 : 75, load: spec.sandbagKg },
            { station: 'BBJ', label: `${lite ? 2 : 3} × 20 m`, dist: lite ? 40 : 60 },
          ],
        },
        {
          day: 4, type: 'CORRIDA', title: 'Longa Moderada + Race Pace Final',
          desc: '12–14 km em Z2 com 15\u2032 finais no ritmo de prova — transição suave entre metabolismos.',
          zone: 'Z2→Z3', pace: `final 15\u2032: ${cal.paceRaceStr}`, dur: lite ? 60 : 80, rpe: 6,
        },
        {
          day: 5, type: 'LPO', title: 'Potência & Mecânica de Sprint',
          desc: 'Estímulo neural curto e fresco: depth jumps, sprints mecânicos e arremessos — RFD sem fadiga acumulada.',
          dur: lite ? 55 : 70, rpe: 5,
          ex: [
            { name: 'Depth jump 40 cm', cat: 'PLIOMETRIA', sets: 4, reps: '3' },
            { name: 'Sprint mecânico (flying 60 m)', cat: 'TECNICO', sets: 8, reps: '60m' },
            { name: 'Arremesso medicine ball', cat: 'LPO', sets: 4, reps: '6', load: spec.wallBallKg },
            { name: 'Core (Pallof + prancha dinâmica)', cat: 'CORE', sets: 3, reps: '12' },
          ],
        },
        (() => {
          if (lite) {
            return {
              day: 6, type: 'HIBRIDO', title: 'Brick Leve Regenerativo',
              desc: '2×[1 km em ritmo alvo + 2 estações leves] — manter o padrão híbrido sem custo.',
              zone: 'Z3', pace: cal.paceRaceStr, dur: 55, rpe: 6,
            } as RawSession
          }
          if (w === 18) {
            return {
              day: 6, type: 'HIBRIDO', title: 'Brick Longo — 8×[800 m + Estação]',
              desc: '8×[800 m em ritmo alvo + estação rotativa] c/ 90\u2033 rec. Elevada densidade específica.',
              zone: 'Z3-Z4', pace: cal.paceRaceStr, dur: 95, rpe: 8,
            } as RawSession
          }
          if (w === 19) {
            return {
              day: 6, type: 'HIBRIDO', title: 'Brick 3×[2 km + 2 Estações]',
              desc: '3×[2.000 m em ritmo alvo + sled push 25 m + 20 wall balls] c/ 3\u2032 rec.',
              zone: 'Z3-Z4', pace: cal.paceRaceStr, dur: 85, rpe: 8,
              st: [
                { station: 'SLED_PUSH', label: `3 × 25 m (${spec.sledPushKg} kg)`, dist: 75, load: spec.sledPushKg },
                { station: 'WALLBALLS', label: `3 × 20 (${spec.wallBallKg} kg)`, reps: 60, load: spec.wallBallKg },
              ],
            } as RawSession
          }
          if (w === 20) {
            return {
              day: 6, type: 'HIBRIDO', title: 'Brick Pico — 8×[1 km + Estação]',
              desc: '8×[1.000 m no ritmo alvo + estação rotativa] c/ 2\u2032 rec — pico de volume específico antes da meia simulação.',
              zone: 'Z3-Z4', pace: cal.paceRaceStr, dur: 100, rpe: 8,
            } as RawSession
          }
          return {
            day: 6, type: 'HIBRIDO', title: 'MEIA SIMULAÇÃO — 4 Estações + 4×1 km',
            desc: 'Metade da prova em ritmo controlado: SkiErg → 1 km → Sled Push → 1 km → Row → 1 km → Wall Balls → 1 km.',
            zone: 'Z3-Z4', pace: `runs ${cal.paceRaceStr}`, dur: 45, km: 6, rpe: 9,
            st: [
              { station: 'SKIERG', label: '1.000 m', dist: 1000, split: cal.skiTargetSec, note: `alvo ${fmtClock(cal.skiTargetSec)}` },
              { station: 'RUN_1KM', label: '1.000 m', dist: 1000, split: cal.runRacePaceSec },
              { station: 'SLED_PUSH', label: `50 m (${spec.sledPushKg} kg)`, dist: 50, load: spec.sledPushKg, split: 145 },
              { station: 'RUN_1KM', label: '1.000 m', dist: 1000, split: cal.runRacePaceSec },
              { station: 'ROWING', label: '1.000 m', dist: 1000, split: cal.rowTargetSec, note: `alvo ${fmtClock(cal.rowTargetSec)}` },
              { station: 'RUN_1KM', label: '1.000 m', dist: 1000, split: cal.runRacePaceSec },
              { station: 'WALLBALLS', label: `50 reps (${spec.wallBallKg} kg)`, reps: 50, load: spec.wallBallKg, split: 155 },
              { station: 'RUN_1KM', label: '1.000 m', dist: 1000, split: cal.runRacePaceSec },
            ],
          } as RawSession
        })(),
        ATIVACAO(),
      ]
    }

    case 'COMP':
      return [
        {
          day: 1, type: 'FORCA', title: 'Potência Manutenção + Corrida',
          desc: '3×3 a 85–87% + saltos: manter força sem fadiga. Corrida 35\u2032 Z2.',
          zone: 'Z2', pace: cal.paceZ2Str, dur: 80, rpe: 6,
          ex: [
            { name: 'Agachamento livre', cat: 'FORCA', sets: 3, reps: '3', load: sq(88), rest: '3\u2032' },
            { name: 'Salto com trap bar', cat: 'LPO', sets: 4, reps: '3', load: hg(55) },
            { name: 'Hip thrust', cat: 'FORCA', sets: 3, reps: '5', load: hg(125) },
            { name: 'Remada pesada', cat: 'FORCA', sets: 3, reps: '5', load: up(75) },
          ],
        },
        {
          day: 2, type: 'CORRIDA', title: 'Race-Pace com Estações',
          desc: '3×[2 km em ritmo de prova + 2 estações (ski 250 m + 15 WB)] c/ 3\u2032 rec.',
          zone: 'Z3-Z4', pace: cal.paceRaceStr, dur: 70, rpe: 8,
          ex: [{ name: 'Wall balls (nos blocos)', cat: 'FORCA', sets: 3, reps: '15', load: spec.wallBallKg }],
        },
        {
          day: 3, type: 'HIBRIDO', title: 'Híbrido Curto Intenso',
          desc: '4 rounds: sled push 50 m + sled pull 50 m + 25 wall balls; corrida 4×400 m em race-pace entre rounds.',
          zone: 'Z3-Z4', pace: cal.paceRaceStr, dur: 80, rpe: 7,
          ex: [{ name: 'Wall balls (nos rounds)', cat: 'FORCA', sets: 4, reps: '25', load: spec.wallBallKg }],
          st: [
            { station: 'SLED_PUSH', label: `4 × 50 m (${spec.sledPushKg} kg)`, dist: 200, load: spec.sledPushKg },
            { station: 'SLED_PULL', label: `4 × 50 m (${spec.sledPullKg} kg)`, dist: 200, load: spec.sledPullKg },
          ],
        },
        {
          day: 4, type: 'CORRIDA', title: 'Aeróbia + 15\u2032 Race Pace',
          desc: '10 km fáceis com 15\u2032 finais no ritmo alvo — manter o referencial de ritmo sem custo elevado.',
          zone: 'Z2→Z3', pace: cal.paceRaceStr, dur: 65, rpe: 5,
        },
        {
          day: 5, type: 'LPO', title: 'Primer Neural',
          desc: 'Saltos 4×3, sprints 4×80 m e 20\u2032 fácil: manter o SNC "afiado" com custo mínimo.',
          dur: 55, rpe: 4,
          ex: [
            { name: 'Depth jump', cat: 'PLIOMETRIA', sets: 4, reps: '3' },
            { name: 'Sprint 80 m', cat: 'TECNICO', sets: 4, reps: '80m' },
            { name: 'Arremesso medicine ball', cat: 'LPO', sets: 3, reps: '6', load: spec.wallBallKg },
          ],
        },
        (() => {
          if (w === 23) {
            return { day: 6, type: 'HIBRIDO', title: 'Brick — 6×[1 km + Estação]', desc: '6×[1.000 m em race-pace + estação rotativa] c/ 2\u2032 rec.', zone: 'Z3-Z4', pace: cal.paceRaceStr, dur: 85, rpe: 8 } as RawSession
          }
          if (w === 24) {
            return {
              day: 6, type: 'HIBRIDO', title: 'SIMULAÇÃO COMPLETA #1 — Hyrox Integral',
              desc: 'Prova completa em ritmo alvo +5%: praticar transições/roxzone, hidratação e estratégia por estação. Análise completa no painel HYRESULT.',
              zone: 'Z3-Z5', pace: `runs ${fmtClock(Math.round(cal.runRacePaceSec * 1.04))}/km`, dur: 80, km: 8, rpe: 10,
              st: fullSimStations(1.05, cal),
            } as RawSession
          }
          if (w === 25) {
            return { day: 6, type: 'HIBRIDO', title: 'Brick Curto — 4×[1 km + 2 Estações]', desc: '4×[1.000 m em race-pace + 2 estações leves] c/ 2\u2032 rec.', zone: 'Z3-Z4', pace: cal.paceRaceStr, dur: 70, rpe: 7 } as RawSession
          }
          return {
            day: 6, type: 'HIBRIDO', title: 'SIMULAÇÃO COMPLETA #2 — Ensaio Geral',
            desc: 'Ensaio com 100% da logística: roupa, tênis e hidratação da prova, splits nas metas finais (14 dias antes da prova).',
            zone: 'Z3-Z5', pace: `runs ${fmtClock(cal.runRacePaceSec)}/km`, dur: 78, km: 8, rpe: 10,
            st: fullSimStations(1.0, cal),
          } as RawSession
        })(),
        ATIVACAO(),
      ]

    case 'TAPER':
      if (w === 27) {
        return [
          { day: 1, type: 'FORCA', title: 'Força Priming (PAP) + 25\u2032 Z2', desc: '2×3 a 85% + 3×3 saltos: ativação de SNC via pós-ativação (PAP) sem fadiga residual.', zone: 'Z2', pace: cal.paceZ2Str, dur: 60, km: 3, rpe: 4, ex: [{ name: 'Agachamento livre', cat: 'FORCA', sets: 2, reps: '3', load: sq(89), rest: '3\u2032' }, { name: 'Salto com trap bar', cat: 'LPO', sets: 3, reps: '3', load: hg(55) }, { name: 'Hip thrust', cat: 'FORCA', sets: 2, reps: '5', load: hg(125) }] },
          { day: 2, type: 'CORRIDA', title: '4×1 km Race-Pace c/ Recuperação Completa', desc: '4×1.000 m em ritmo de prova com 3\u2032 de trote — manter o referencial de ritmo com frescor.', zone: 'Z3-Z4', pace: cal.paceRaceStr, dur: 55, km: 6, rpe: 6 },
          { day: 3, type: 'REGEN', title: 'Regenerativo Leve', desc: 'Mobilidade + 20\u2032 de bike Z1 + recuperação passiva.', zone: 'Z1', dur: 40, rpe: 2 },
          { day: 4, type: 'CORRIDA', title: 'Aeróbia Fácil + 4 Strides', desc: '5 km em Z2 e 4 strides de 100 m — manter o tônus sem custo.', zone: 'Z2', pace: cal.paceZ2Str, dur: 40, km: 5, rpe: 4 },
          { day: 5, type: 'LPO', title: 'Primer Neural', desc: '3×3 saltos + 4×100 m strides: último toque de RFD antes da semana de prova.', dur: 35, km: 2, rpe: 3, ex: [{ name: 'Saltos (hurdle baixo)', cat: 'PLIOMETRIA', sets: 3, reps: '3' }] },
          { day: 6, type: 'HIBRIDO', title: 'Ensaio de Transições (Roxzone)', desc: '2×[1 km race-pace + 2 estações (sled 25 m + 15 wall balls)] — ensaiar entrada/saída de Roxzone.', zone: 'Z3-Z4', pace: cal.paceRaceStr, dur: 50, km: 4, rpe: 6, st: [{ station: 'SLED_PUSH', label: `2 × 25 m (${spec.sledPushKg} kg)`, dist: 50, load: spec.sledPushKg }, { station: 'WALLBALLS', label: `2 × 15 (${spec.wallBallKg} kg)`, reps: 30, load: spec.wallBallKg }] },
          ATIVACAO(40),
        ]
      }
      return [
        { day: 1, type: 'FORCA', title: 'Priming Final', desc: 'Agachamento 2×3 a 85% + 3×3 saltos + mobilidade; 20\u2032 Z2. Efeito de PAP com cargas familiares.', zone: 'Z2', pace: cal.paceZ2Str, dur: 50, km: 4, rpe: 3, ex: [{ name: 'Agachamento livre', cat: 'FORCA', sets: 2, reps: '3', load: sq(89) }, { name: 'Saltos leves', cat: 'PLIOMETRIA', sets: 3, reps: '3' }] },
        { day: 2, type: 'CORRIDA', title: 'Tiros Race-Pace', desc: '5×400 m em ritmo de prova com recuperação total + 15\u2032 Z2.', zone: 'Z3-Z4', pace: cal.paceRaceStr, dur: 45, km: 4, rpe: 5 },
        { day: 3, type: 'ATIVACAO', title: 'Ativação Leve + Mobilidade', desc: 'Bike 20\u2032 Z1, educativos e banda elástica — corpo acordado, mente tranquila.', zone: 'Z1', dur: 35, rpe: 2 },
        { day: 4, type: 'REGEN', title: 'Descanso Passivo — Viagem & Logística', desc: 'Caminhada de 20\u2032 opcional; hidratação proativa, checklist de prova e visualização dos splits HYRESULT.', zone: 'Z1', dur: 30, rpe: 1 },
        { day: 5, type: 'ATIVACAO', title: 'Shake-out', desc: '15\u2032 em Z1 + 4 strides + mobilidade.', zone: 'Z1', dur: 30, km: 2, rpe: 2 },
        {
          day: 6, type: 'HIBRIDO', title: `PROVA — ${cal.division.replace('_', ' ')}`,
          desc: `Estratégia calibrada nos testes: saída controlada (${fmtClock(cal.runRacePaceSec)}/km), estações em cadência constante e Roxzone eficiente (< 40s/transição).`,
          zone: 'Z3-Z5', pace: `runs ${fmtClock(cal.runRacePaceSec)}/km`, dur: 80, km: 8, rpe: 10,
          st: fullSimStations(0.97, cal),
        },
        { day: 7, type: 'REGEN', title: 'Recuperação Pós-Prova', desc: 'Caminhada 30\u2032 + mobilidade suave + celebração.', zone: 'Z1', dur: 40, rpe: 1 },
      ]

    default:
      return []
  }
}

/**
 * Gera os 7 mesociclos, 28 microciclos, 196 sessões e benchmark HYRESULT inicial para um atleta
 */
export async function generatePeriodizationForAthlete(
  athlete: AthleteTestCalibrationInput,
  options?: { seedSampleActuals?: boolean; createBenchmarkLR3?: boolean },
): Promise<{ generatedWeeks: number; generatedSessions: number }> {
  const cal = deriveCalibrationFactors(athlete)
  const planStartMs = athlete.planStartDate ? athlete.planStartDate.getTime() : DEFAULT_PLAN_START
  const weekStart = (w: number) => new Date(planStartMs + (w - 1) * 7 * DAY)
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY)

  // Remove periodização anterior deste atleta caso exista
  await db.mesocycle.deleteMany({ where: { athleteId: athlete.id } })

  let generatedWeeks = 0
  let generatedSessions = 0

  for (const m of MESOS) {
    const w1 = weekStart(m.weeks[0])
    const w2 = addDays(weekStart(m.weeks[1]), 6)
    const volumeKm = r1(
      m.weeks.reduce((acc, w) => {
        const baseKm = WEEK_PARAMS[w].km
        return acc + (KM_WEIGHTS[m.code] ? baseKm * cal.volumeKmScale : baseKm)
      }, 0),
    )

    const meso = await db.mesocycle.create({
      data: {
        athleteId: athlete.id,
        code: m.code,
        name: m.name,
        order: MESOS.indexOf(m) + 1,
        startDate: w1,
        endDate: w2,
        goal: m.goal,
        focus: m.focus,
        intensityNote: m.intensityNote,
        keyWorkouts: m.keyWorkouts,
        volumeTargetKm: volumeKm,
      },
    })

    for (let w = m.weeks[0]; w <= m.weeks[1]; w++) {
      const wp = WEEK_PARAMS[w]
      const ws = weekStart(w)
      const raw = buildSessionsForWeek(w, cal)
      const targetWeekKm = KM_WEIGHTS[m.code] ? r1(wp.km * cal.volumeKmScale) : wp.km
      if (KM_WEIGHTS[m.code]) scaleKm(raw, targetWeekKm, KM_WEIGHTS[m.code])

      const kmTotal = r1(raw.reduce((acc, s) => acc + (s.km ?? 0), 0))
      const tonnage = tonnageOf(
        raw.flatMap((s) =>
          (s.ex ?? []).map((e) => ({
            setsPrescribed: e.sets,
            repsPrescribed: e.reps,
            loadPrescribedKg: e.load,
          })),
        ),
      )

      const micro = await db.microcycle.create({
        data: {
          mesocycleId: meso.id,
          weekNumber: w,
          startDate: ws,
          endDate: addDays(ws, 6),
          type: wp.type,
          targetKm: kmTotal,
          targetTonnageKg: tonnage,
          targetSessions: 7,
          note: wp.note ?? null,
        },
      })
      generatedWeeks++

      for (const rs of raw) {
        const date = addDays(ws, rs.day - 1)
        const tonS = tonnageOf(
          (rs.ex ?? []).map((e) => ({
            setsPrescribed: e.sets,
            repsPrescribed: e.reps,
            loadPrescribedKg: e.load,
          })),
        )
        const loadP = rs.rpe * rs.dur

        let status = 'PLANEJADO'
        let durA: number | null = null
        let kmA: number | null = null
        let rpeA: number | null = null
        let notes: string | null = null
        let tonA: number | null = null

        if (options?.seedSampleActuals && w === 1 && rs.day <= 6) {
          status = 'CONCLUIDO'
          if (rs.day === 1) {
            durA = 72
            kmA = 5.2
            rpeA = 4
            tonA = Math.round(tonS * 1.04)
            notes = `Avaliação antropométrica registrada: ${athlete.weightKg} kg. Força leve executada com ótima velocidade de barra.`
          } else if (rs.day === 2) {
            durA = 56
            kmA = 3.4
            rpeA = 9
            notes = `Teste incremental concluído: VO₂max ${athlete.vo2max ?? 47.2} mL/kg/min; VT1 ${cal.vt1Kmh} km/h; VT2 ${cal.vt2Kmh} km/h; FCmáx ${cal.maxHr} bpm.`
          } else if (rs.day === 3) {
            durA = 68
            rpeA = 8
            tonA = Math.round((tonS || 900) * 1.05)
            notes = `Bateria 3RM consolidada: Agachamento ${cal.squat3rm} kg · Terra ${cal.deadlift3rm} kg · Supino ${cal.bench3rm} kg.`
          } else if (rs.day === 4) {
            durA = 47
            kmA = 8.3
            rpeA = 4
            notes = `Rodagem aeróbia Z2 fluida com 4 strides finais em ritmo forte.`
          } else if (rs.day === 5) {
            durA = 48
            kmA = 2.1
            rpeA = 9
            notes = `Time-trials de ergômetros concluídos abaixo do alvo previsto (SkiErg 1k e Remo 500m).`
          } else if (rs.day === 6) {
            durA = 86
            kmA = 6.3
            rpeA = 5
            notes = `Sessão híbrida técnica concluída com excelente mecânica de Sled Push/Pull, Farmers e Lunges.`
          }
        }

        await db.trainingSession.create({
          data: {
            microcycleId: micro.id,
            date,
            dayIndex: rs.day,
            type: rs.type,
            title: rs.title,
            description: rs.desc,
            hrZone: rs.zone ?? null,
            paceTarget: rs.pace ?? null,
            durationPrescribedMin: rs.dur,
            durationActualMin: durA,
            kmPrescribed: rs.km ?? null,
            kmActual: kmA,
            tonnagePrescribedKg: tonS > 0 ? tonS : null,
            tonnageActualKg: tonA,
            rpePrescribed: rs.rpe,
            rpeActual: rpeA,
            loadPrescribed: loadP,
            loadActual: durA && rpeA ? durA * rpeA : null,
            status,
            notes,
            exercises: {
              create: (rs.ex ?? []).map((e, i) => ({
                order: i + 1,
                name: e.name,
                category: e.cat,
                setsPrescribed: e.sets ?? null,
                repsPrescribed: e.reps ?? null,
                loadPrescribedKg: e.load ?? null,
                tempo: e.tempo ?? null,
                rest: e.rest ?? null,
                setsActual: status === 'CONCLUIDO' ? (e.sets ?? null) : null,
                repsActual: status === 'CONCLUIDO' ? (e.reps ?? null) : null,
                loadActualKg:
                  status === 'CONCLUIDO' && e.load != null ? roundLoad25(e.load * 1.03) : null,
                notes: e.note ?? null,
              })),
            },
            stations: {
              create: (rs.st ?? []).map((st, i) => ({
                order: i + 1,
                station: st.station,
                label: st.label,
                distanceM: st.dist ?? null,
                reps: st.reps ?? null,
                loadKg: st.load ?? null,
                splitPrescribedSec: st.split ?? null,
                splitActualSec:
                  status === 'CONCLUIDO' && st.split != null
                    ? Math.round(st.split * 0.98)
                    : null,
                notes: st.note ?? null,
              })),
            },
          },
        })
        generatedSessions++
      }
    }
  }

  // Cria registro de resultado HYRESULT inicial (LR3MS4JI5A0E80 para o atleta principal ou baseline diagnóstico para novos atletas)
  const existingHyresult = await db.hyresultRaceResult.count({ where: { athleteId: athlete.id } })
  if (existingHyresult === 0) {
    const baseRun = Math.round(cal.runRacePaceSec * 1.02)
    // Curva realista de prova com degradação natural no km 3 (pós-Sled Push) e km 8 (pós-Lunges)
    const runSplits = [
      Math.round(baseRun * 0.96),
      Math.round(baseRun * 1.00),
      Math.round(baseRun * 1.09),
      Math.round(baseRun * 1.04),
      Math.round(baseRun * 1.05),
      Math.round(baseRun * 1.03),
      Math.round(baseRun * 1.02),
      Math.round(baseRun * 1.11),
    ]
    const simSt = fullSimStations(1.06, cal)
    const stOf = (code: string, dft: number) => simSt.find((s) => s.station === code)?.split ?? dft
    const workSplits = {
      SKIERG: stOf('SKIERG', 252),
      SLED_PUSH: stOf('SLED_PUSH', 168),
      SLED_PULL: stOf('SLED_PULL', 238),
      BBJ: stOf('BBJ', 262),
      ROWING: stOf('ROWING', 256),
      FARMERS: stOf('FARMERS', 128),
      SANDBAG: stOf('SANDBAG', 278),
      WALLBALLS: stOf('WALLBALLS', 326),
    }
    const roxSplits = [36, 46, 48, 43, 41, 38, 49, 44]
    const totalRunSec = runSplits.reduce((a, b) => a + b, 0)
    const totalWorkSec = Object.values(workSplits).reduce((a, b) => a + b, 0)
    const totalRoxSec = roxSplits.reduce((a, b) => a + b, 0)

    await db.hyresultRaceResult.create({
      data: {
        athleteId: athlete.id,
        resultCode: options?.createBenchmarkLR3 ? 'LR3MS4JI5A0E80' : `HYR-${athlete.id.slice(-6).toUpperCase()}`,
        eventName: options?.createBenchmarkLR3
          ? 'HYROX Official Result — #LR3MS4JI5A0E80 (Baseline Diagnóstico)'
          : `Baseline Diagnóstico HYRESULT — ${athlete.name}`,
        eventDate: new Date('2026-10-18T00:00:00.000Z'),
        division: cal.division,
        ageGroup: '20-24',
        totalTimeSec: totalRunSec + totalWorkSec + totalRoxSec,
        totalRunSec,
        totalWorkSec,
        totalRoxSec,
        runSplitsJson: JSON.stringify(runSplits),
        workSplitsJson: JSON.stringify(workSplits),
        roxSplitsJson: JSON.stringify(roxSplits),
        notes: 'Análise de referência integrada à periodização (3 Pilares: Running, Workouts e Roxzone).',
      },
    })
  }

  return { generatedWeeks, generatedSessions }
}

/**
 * Recalibra apenas as sessões futuras (status "PLANEJADO") após re-teste do atleta
 */
export async function recalibrateFutureSessionsForAthlete(athlete: AthleteTestCalibrationInput): Promise<number> {
  const cal = deriveCalibrationFactors(athlete)
  const microcycles = await db.microcycle.findMany({
    where: { mesocycle: { athleteId: athlete.id } },
    include: { sessions: { include: { exercises: true, stations: true } } },
  })

  let updatedSessionsCount = 0

  for (const micro of microcycles) {
    const rawWeek = buildSessionsForWeek(micro.weekNumber, cal)
    for (const session of micro.sessions) {
      if (session.status !== 'PLANEJADO') continue
      const template = rawWeek.find((r) => r.day === session.dayIndex)
      if (!template) continue

      for (const ex of session.exercises) {
        const tEx = template.ex?.find((e) => e.name === ex.name) ?? template.ex?.[ex.order - 1]
        if (tEx && tEx.load != null) {
          await db.exercise.update({
            where: { id: ex.id },
            data: { loadPrescribedKg: tEx.load },
          })
        }
      }

      for (const st of session.stations) {
        const tSt = template.st?.[st.order - 1]
        if (tSt) {
          await db.stationResult.update({
            where: { id: st.id },
            data: {
              loadKg: tSt.load ?? st.loadKg,
              splitPrescribedSec: tSt.split ?? st.splitPrescribedSec,
              label: tSt.label,
            },
          })
        }
      }

      const newTon = tonnageOf(
        (template.ex ?? []).map((e) => ({
          setsPrescribed: e.sets,
          repsPrescribed: e.reps,
          loadPrescribedKg: e.load,
        })),
      )

      await db.trainingSession.update({
        where: { id: session.id },
        data: {
          paceTarget: template.pace ?? session.paceTarget,
          tonnagePrescribedKg: newTon > 0 ? newTon : session.tonnagePrescribedKg,
        },
      })
      updatedSessionsCount++
    }
  }

  return updatedSessionsCount
}

