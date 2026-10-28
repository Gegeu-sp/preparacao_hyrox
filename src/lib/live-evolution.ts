// Motor Unificado de Simulação da Periodização (S1–S28) e Evolução HYRESULT Treino a Treino
// Integra o estado diagnóstico inicial (S1 / #LR3MS4JI5A0E80), a curva científica dos 7 mesociclos
// e cada sessão concluída (Corrida, Força/Tonelagem, Bricks Híbridos e Simulações) em tempo real.
import { db } from '@/lib/db'
import {
  HYRESULT_DIVISION_BENCHMARKS,
  NormativeCurve,
  PHASE_META,
  PhaseCode,
  RUN_FATIGUE_FACTORS,
  STATION_META,
  StationCode,
} from '@/lib/constants'
import { fmtClock, fmtClockHms, fmtDateShort, fmtPace } from '@/lib/format'
import { deriveCalibrationFactors } from '@/lib/periodization-generator'
import type {
  HyroxDivision,
  PeriodizationProgressionSummaryDTO,
  PeriodizationWeekSimulationPointDTO,
  SessionEvolutionPointDTO,
} from '@/lib/types'

export const WORKOUT_STATION_ORDER: StationCode[] = [
  'SKIERG',
  'SLED_PUSH',
  'SLED_PULL',
  'BBJ',
  'ROWING',
  'FARMERS',
  'SANDBAG',
  'WALLBALLS',
]

/**
 * Curva científica de adaptação acumulada (0.00 na Semana 1 -> 1.00 na Semana 28)
 * Modela os 7 mesociclos (DIAG, GPP1, GPP2, SPP1, SPP2, COMP, TAPER) e deloads (W6, W11, W17, W22)
 */
export const WEEKLY_ADAPTATION_PROGRESS: Record<number, { run: number; work: number; rox: number }> = {
  1: { run: 0.0, work: 0.0, rox: 0.0 }, // DIAG
  2: { run: 0.05, work: 0.04, rox: 0.03 }, // GPP1
  3: { run: 0.10, work: 0.08, rox: 0.06 },
  4: { run: 0.15, work: 0.13, rox: 0.09 },
  5: { run: 0.20, work: 0.18, rox: 0.12 },
  6: { run: 0.24, work: 0.22, rox: 0.15 }, // Deload 1 (supercompensação inicial)
  7: { run: 0.28, work: 0.27, rox: 0.19 }, // GPP2 (força máx + sled init)
  8: { run: 0.33, work: 0.33, rox: 0.23 },
  9: { run: 0.36, work: 0.37, rox: 0.26 }, // Semana Natal
  10: { run: 0.41, work: 0.43, rox: 0.30 },
  11: { run: 0.46, work: 0.48, rox: 0.35 }, // Deload 2
  12: { run: 0.51, work: 0.53, rox: 0.41 }, // SPP1 (corrida comprometida + bricks)
  13: { run: 0.56, work: 0.58, rox: 0.47 },
  14: { run: 0.61, work: 0.63, rox: 0.53 },
  15: { run: 0.65, work: 0.68, rox: 0.59 },
  16: { run: 0.69, work: 0.72, rox: 0.64 },
  17: { run: 0.73, work: 0.76, rox: 0.69 }, // Deload 3
  18: { run: 0.77, work: 0.80, rox: 0.74 }, // SPP2 (densidade competitiva)
  19: { run: 0.80, work: 0.84, rox: 0.78 },
  20: { run: 0.83, work: 0.87, rox: 0.82 },
  21: { run: 0.86, work: 0.90, rox: 0.86 }, // Meia-Simulação W21
  22: { run: 0.89, work: 0.92, rox: 0.89 }, // Deload 4
  23: { run: 0.91, work: 0.94, rox: 0.91 }, // COMP
  24: { run: 0.94, work: 0.96, rox: 0.94 }, // Simulação Completa #1
  25: { run: 0.95, work: 0.97, rox: 0.96 },
  26: { run: 0.97, work: 0.98, rox: 0.98 }, // Simulação Completa #2
  27: { run: 0.99, work: 0.99, rox: 0.99 }, // TAPER
  28: { run: 1.0, work: 1.0, rox: 1.0 }, // PROVA HYROX
}

export function timeToPercentileCurve(timeSec: number, curve: NormativeCurve): number {
  if (timeSec <= curve.top10Sec * 0.9) return 99
  if (timeSec <= curve.top10Sec) {
    const ratio = (curve.top10Sec - timeSec) / Math.max(1, curve.top10Sec * 0.1)
    return Math.min(99, Math.round(90 + ratio * 9))
  }
  if (timeSec <= curve.medianSec) {
    const ratio = (curve.medianSec - timeSec) / Math.max(1, curve.medianSec - curve.top10Sec)
    return Math.round(50 + ratio * 40)
  }
  if (timeSec <= curve.bottom20Sec) {
    const ratio = (curve.bottom20Sec - timeSec) / Math.max(1, curve.bottom20Sec - curve.medianSec)
    return Math.round(20 + ratio * 30)
  }
  const tail = Math.max(
    1,
    20 - Math.round(((timeSec - curve.bottom20Sec) / Math.max(1, curve.bottom20Sec * 0.25)) * 18),
  )
  return Math.max(1, Math.min(19, tail))
}

export interface SplitStateVector {
  runSplits: number[] // 8 runs (sec)
  workSplits: Record<StationCode, number> // 8 stations (sec)
  roxSplits: number[] // 8 transitions (sec)
  fatigueFactors: number[] // 8 run fatigue multipliers
}

export interface LivePeriodizationEvolutionResult {
  athlete: {
    id: string
    name: string
    division: HyroxDivision
    ageGroup: string
    raceDate: Date
    goalRaceTime: number | null
    vt1SpeedKmh: number | null
    vt2SpeedKmh: number | null
    vo2max: number | null
    fiveKmPbSec: number | null
    skiErg1kTtSec: number | null
    row500mTtSec: number | null
    squat3rmKg: number | null
    deadlift3rmKg: number | null
  }
  baselineState: SplitStateVector
  liveState: SplitStateVector
  targetW28State: SplitStateVector
  progression: PeriodizationProgressionSummaryDTO
  weeklySimulationCurve: PeriodizationWeekSimulationPointDTO[]
  sessionEvolution: SessionEvolutionPointDTO[]
}

function sumSplits(state: SplitStateVector) {
  const totalRunSec = state.runSplits.reduce((a, b) => a + b, 0)
  const totalWorkSec = WORKOUT_STATION_ORDER.reduce((a, code) => a + (state.workSplits[code] ?? 200), 0)
  const totalRoxSec = state.roxSplits.reduce((a, b) => a + b, 0)
  return {
    totalRunSec,
    totalWorkSec,
    totalRoxSec,
    totalTimeSec: totalRunSec + totalWorkSec + totalRoxSec,
  }
}

function computeFadeIndexPct(runSplits: number[]): number {
  const avg = runSplits.reduce((a, b) => a + b, 0) / 8
  const first2 = ((runSplits[0] ?? avg) + (runSplits[1] ?? avg)) / 2
  const last3 = ((runSplits[5] ?? avg) + (runSplits[6] ?? avg) + (runSplits[7] ?? avg)) / 3
  return Math.round(((last3 - first2) / Math.max(1, first2)) * 1000) / 10
}

export function interpolateSplits(
  baseline: SplitStateVector,
  target: SplitStateVector,
  progress: { run: number; work: number; rox: number },
): SplitStateVector {
  const runSplits = baseline.runSplits.map((b, i) => {
    const t = target.runSplits[i] ?? b
    return Math.round(b - (b - t) * progress.run)
  })
  const workSplits = {} as Record<StationCode, number>
  for (const code of WORKOUT_STATION_ORDER) {
    const b = baseline.workSplits[code] ?? 220
    const t = target.workSplits[code] ?? b
    workSplits[code] = Math.round(b - (b - t) * progress.work)
  }
  const roxSplits = baseline.roxSplits.map((b, i) => {
    const t = target.roxSplits[i] ?? b
    return Math.round(b - (b - t) * progress.rox)
  })
  const fatigueFactors = baseline.fatigueFactors.map((b, i) => {
    const t = target.fatigueFactors[i] ?? b
    return Math.round((b - (b - t) * progress.run) * 1000) / 1000
  })
  return { runSplits, workSplits, roxSplits, fatigueFactors }
}

/**
 * Calcula toda a evolução treino a treino e a curva semanal S1-S28 de um atleta
 */
export async function computeLivePeriodizationEvolution(
  requestedAthleteId?: string,
): Promise<LivePeriodizationEvolutionResult | null> {
  const athleteRow = requestedAthleteId
    ? await db.athlete.findUnique({ where: { id: requestedAthleteId } })
    : await db.athlete.findFirst({ orderBy: { createdAt: 'asc' } })

  if (!athleteRow) return null

  const division = (['OPEN_M', 'OPEN_F', 'PRO_M', 'PRO_F'].includes(athleteRow.division)
    ? athleteRow.division
    : 'OPEN_M') as HyroxDivision
  const divBench = HYRESULT_DIVISION_BENCHMARKS[division]
  const cal = deriveCalibrationFactors(athleteRow)

  const [hyresultRecords, microcycles] = await Promise.all([
    db.hyresultRaceResult.findMany({
      where: { athleteId: athleteRow.id },
      orderBy: { eventDate: 'asc' },
    }),
    db.microcycle.findMany({
      where: { mesocycle: { athleteId: athleteRow.id } },
      include: {
        mesocycle: true,
        sessions: {
          include: {
            exercises: { orderBy: { order: 'asc' } },
            stations: { orderBy: { order: 'asc' } },
          },
          orderBy: { dayIndex: 'asc' },
        },
      },
      orderBy: { weekNumber: 'asc' },
    }),
  ])

  // 1. Extrai o Alvo Final da Semana 28 (Target W28)
  const w28Micro = microcycles.find((m) => m.weekNumber === 28)
  const w28SatSession = w28Micro?.sessions.find((s) => s.dayIndex === 6)
  const w28Stations = w28SatSession?.stations ?? []
  const w28RunRows = w28Stations.filter((s) => s.station === 'RUN_1KM')

  const targetRunFactors = [0.97, 0.99, 1.05, 1.01, 1.02, 1.01, 1.00, 1.07]
  const targetRunSplits: number[] = []
  for (let i = 0; i < 8; i++) {
    const r = w28RunRows[i] ?? w28RunRows[0]
    const baseSec = r?.splitPrescribedSec ?? cal.runRacePaceSec
    targetRunSplits.push(Math.round(baseSec * targetRunFactors[i]))
  }

  const targetWorkSplits = {} as Record<StationCode, number>
  for (const code of WORKOUT_STATION_ORDER) {
    const stRow = w28Stations.find((s) => s.station === code)
    targetWorkSplits[code] =
      stRow?.splitPrescribedSec ?? Math.round(divBench.stations[code].medianSec * 0.92)
  }

  const targetRoxSplits = [32, 39, 41, 36, 35, 33, 40, 37]
  const targetW28State: SplitStateVector = {
    runSplits: targetRunSplits,
    workSplits: targetWorkSplits,
    roxSplits: targetRoxSplits,
    fatigueFactors: targetRunFactors,
  }

  // 2. Extrai o Estado Inicial de Linha de Base (Diagnóstico S1 ou #LR3MS4JI5A0E80)
  let baselineRunSplits: number[] = []
  let baselineWorkSplits = {} as Record<StationCode, number>
  let baselineRoxSplits: number[] = []
  const baselineFatigueFactors = [
    RUN_FATIGUE_FACTORS[1] ?? 1.0,
    RUN_FATIGUE_FACTORS[2] ?? 1.02,
    RUN_FATIGUE_FACTORS[3] ?? 1.12,
    RUN_FATIGUE_FACTORS[4] ?? 1.08,
    RUN_FATIGUE_FACTORS[5] ?? 1.09,
    RUN_FATIGUE_FACTORS[6] ?? 1.07,
    RUN_FATIGUE_FACTORS[7] ?? 1.06,
    RUN_FATIGUE_FACTORS[8] ?? 1.15,
  ]

  const initialRecord = hyresultRecords[0]
  if (initialRecord) {
    try {
      baselineRunSplits = JSON.parse(initialRecord.runSplitsJson)
      baselineWorkSplits = JSON.parse(initialRecord.workSplitsJson)
      baselineRoxSplits = JSON.parse(initialRecord.roxSplitsJson)
    } catch {
      baselineRunSplits = []
    }
  }

  if (baselineRunSplits.length !== 8) {
    // Sintetiza linha de base diagnóstica S1 a partir dos testes iniciais (pré-adaptação das 28 semanas)
    baselineRunSplits = targetRunSplits.map((t, i) =>
      Math.round(t * (i === 2 || i === 7 ? 1.095 : 1.065)),
    )
    for (const code of WORKOUT_STATION_ORDER) {
      baselineWorkSplits[code] = Math.round(targetWorkSplits[code] * 1.11)
    }
    baselineRoxSplits = [39, 46, 49, 44, 43, 41, 47, 45]
  }

  // Garante que todas as estações na linha de base são maiores ou iguais ao alvo S28
  for (const code of WORKOUT_STATION_ORDER) {
    if (!baselineWorkSplits[code] || baselineWorkSplits[code] <= targetWorkSplits[code]) {
      baselineWorkSplits[code] = Math.round(targetWorkSplits[code] * 1.09)
    }
  }

  const baselineState: SplitStateVector = {
    runSplits: [...baselineRunSplits],
    workSplits: { ...baselineWorkSplits },
    roxSplits: [...baselineRoxSplits],
    fatigueFactors: [...baselineFatigueFactors],
  }

  const baselineTotals = sumSplits(baselineState)
  const targetTotals = sumSplits(targetW28State)

  // Margem total de ganho planejada pela periodização entre S1 e S28
  const totalPlannedRunDrop = baselineState.runSplits.map((b, i) => Math.max(4, b - targetW28State.runSplits[i]))
  const totalPlannedWorkDrop = {} as Record<StationCode, number>
  for (const code of WORKOUT_STATION_ORDER) {
    totalPlannedWorkDrop[code] = Math.max(5, baselineState.workSplits[code] - targetW28State.workSplits[code])
  }
  const totalPlannedRoxDrop = baselineState.roxSplits.map((b, i) => Math.max(2, b - targetW28State.roxSplits[i]))

  // 3. Processamento Cronológico Treino a Treino (Session-by-Session Evolution)
  const liveRunExact = baselineState.runSplits.map((v) => v)
  const liveWorkExact = { ...baselineState.workSplits }
  const liveRoxExact = baselineState.roxSplits.map((v) => v)
  const liveFatigue = [...baselineState.fatigueFactors]

  const sessionEvolution: SessionEvolutionPointDTO[] = [
    {
      index: 0,
      sessionId: null,
      weekId: microcycles[0]?.id ?? null,
      date: (microcycles[0]?.startDate ?? athleteRow.planStartDate).toISOString(),
      dateFormatted: fmtDateShort(microcycles[0]?.startDate ?? athleteRow.planStartDate),
      weekNumber: 1,
      phaseCode: 'DIAG',
      sessionType: 'BASELINE',
      sessionTitle: initialRecord
        ? `Linha de Base HYRESULT (#${initialRecord.resultCode})`
        : 'Diagnóstico Inicial — Bateria de Testes (S1)',
      stimulusSummary: `VT2 ${(athleteRow.vt2SpeedKmh ?? 11.5).toFixed(1)} km/h · 3RM Agach. ${athleteRow.squat3rmKg ?? 90} kg / Terra ${athleteRow.deadlift3rmKg ?? 120} kg`,
      primaryFocus: 'BASELINE',
      executionQualityPct: 100,
      totalRunSec: baselineTotals.totalRunSec,
      totalWorkSec: baselineTotals.totalWorkSec,
      totalRoxSec: baselineTotals.totalRoxSec,
      totalTimeSec: baselineTotals.totalTimeSec,
      totalTimeFormatted: fmtClockHms(baselineTotals.totalTimeSec),
      deltaFromPrevSec: 0,
      cumulativeGainSec: 0,
      overallPercentile: timeToPercentileCurve(baselineTotals.totalTimeSec, divBench.totalTime),
      fadeIndexPct: computeFadeIndexPct(baselineState.runSplits),
    },
  ]

  // Estado simulado ao final de cada microciclo executado
  const weekEndSimulatedMap = new Map<number, SplitStateVector>()
  let prevTotalTimeSec = baselineTotals.totalTimeSec
  let completedSessionsCount = 0

  for (const micro of microcycles) {
    const wNum = micro.weekNumber
    const prevProg = WEEKLY_ADAPTATION_PROGRESS[Math.max(1, wNum - 1)] ?? { run: 0, work: 0, rox: 0 }
    const currProg = WEEKLY_ADAPTATION_PROGRESS[wNum] ?? { run: 1, work: 1, rox: 1 }

    // Ganho planejado para esta semana inteira (com piso mínimo na S1 para refletir o impacto imediato dos primeiros treinos)
    const weekRunBudget = Math.max(0.028, currProg.run - prevProg.run)
    const weekWorkBudget = Math.max(0.028, currProg.work - prevProg.work)
    const weekRoxBudget = Math.max(0.022, currProg.rox - prevProg.rox)

    for (const sess of micro.sessions) {
      const isExecuted =
        sess.status === 'CONCLUIDO' || sess.status === 'PARCIAL' || sess.status === 'AJUSTADO'
      if (!isExecuted) continue

      completedSessionsCount++

      // Avalia a qualidade de execução (Q_k) e o foco primário da sessão
      let qualityPct = 100
      let primaryFocus: SessionEvolutionPointDTO['primaryFocus'] = 'RUNNING'
      let stimulusParts: string[] = []

      // Pesos de contribuição da sessão dentro da semana
      let runWeight = 0.08
      let workWeight = 0.08
      let roxWeight = 0.08
      const stationSpecificBoost: Partial<Record<StationCode, number>> = {}

      if (sess.type === 'CORRIDA') {
        primaryFocus = 'RUNNING'
        runWeight = 0.36
        workWeight = 0.06
        roxWeight = 0.14

        const kmA = sess.kmActual ?? sess.kmPrescribed ?? 0
        const kmP = sess.kmPrescribed ?? kmA
        const durA = sess.durationActualMin ?? sess.durationPrescribedMin ?? 45
        const durP = sess.durationPrescribedMin ?? durA

        const volRatio = kmP > 0 ? Math.min(1.2, Math.max(0.75, kmA / kmP)) : 1.0
        const paceRatio =
          kmA > 0 && kmP > 0 && durA > 0 && durP > 0
            ? Math.min(1.2, Math.max(0.8, (durP / kmP) / (durA / kmA)))
            : 1.0

        qualityPct = Math.round((volRatio * 0.45 + paceRatio * 0.55) * 100)
        const actualPaceSecPerKm =
          kmA > 0 ? Math.round((durA * 60) / kmA) : Math.round(cal.runRacePaceSec * 1.12)
        stimulusParts.push(`${kmA.toFixed(1)} km @ ${fmtPace(actualPaceSecPerKm)}`)
        if (sess.hrZone) stimulusParts.push(sess.hrZone)
      } else if (sess.type === 'FORCA') {
        primaryFocus = 'STRENGTH'
        runWeight = 0.12 // Melhora economia de corrida e resistência excêntrica (Run 3 e Run 8)
        workWeight = 0.32
        roxWeight = 0.08

        const tonA = sess.tonnageActualKg ?? sess.tonnagePrescribedKg ?? 0
        const tonP = sess.tonnagePrescribedKg ?? tonA
        const tonRatio = tonP > 0 ? Math.min(1.22, Math.max(0.8, tonA / tonP)) : 1.02
        qualityPct = Math.round(tonRatio * 100)

        // Estações diretamente beneficiadas pela força máxima e resistência muscular
        stationSpecificBoost.SLED_PUSH = 1.35 * tonRatio
        stationSpecificBoost.SLED_PULL = 1.35 * tonRatio
        stationSpecificBoost.FARMERS = 1.25 * tonRatio
        stationSpecificBoost.SANDBAG = 1.3 * tonRatio
        stationSpecificBoost.WALLBALLS = 1.2 * tonRatio

        if (tonA > 0) {
          stimulusParts.push(`Tonelagem ${Math.round(tonA).toLocaleString('pt-BR')} kg (${qualityPct}% P)`)
        }
        const topEx = sess.exercises.find((e) => (e.loadActualKg ?? e.loadPrescribedKg ?? 0) > 0)
        if (topEx) {
          const load = topEx.loadActualKg ?? topEx.loadPrescribedKg ?? 0
          stimulusParts.push(`${topEx.name.split(' ')[0]} ${load} kg`)
        }
      } else if (sess.type === 'HIBRIDO' || sess.type === 'TESTE') {
        primaryFocus = 'STATIONS'
        runWeight = 0.34
        workWeight = 0.42
        roxWeight = 0.38

        const actualStations = sess.stations.filter(
          (st) => st.splitActualSec != null && st.splitActualSec > 0,
        )
        if (actualStations.length > 0) {
          const ratios: number[] = []
          const stSummaries: string[] = []
          for (const st of actualStations) {
            const pSec = st.splitPrescribedSec ?? st.splitActualSec!
            const aSec = st.splitActualSec!
            const ratio = pSec > 0 ? Math.min(1.25, Math.max(0.8, pSec / aSec)) : 1.02
            ratios.push(ratio)

            if (st.station === 'RUN_1KM') {
              runWeight = 0.44
              stSummaries.push(`Run ${fmtClock(aSec)}`)
            } else {
              const code = st.station as StationCode
              if (WORKOUT_STATION_ORDER.includes(code)) {
                stationSpecificBoost[code] = 1.75 * ratio
                // Atualiza diretamente com suavização exponencial usando a razão real vs prescrito sobre a curva da estação
                const plannedProg = currProg.work
                const expectedStationNow =
                  baselineState.workSplits[code] - totalPlannedWorkDrop[code] * plannedProg
                const impliedFullSplit = Math.round(expectedStationNow * (aSec / Math.max(1, pSec)))
                liveWorkExact[code] =
                  liveWorkExact[code] * 0.62 + Math.min(liveWorkExact[code] - 1, impliedFullSplit) * 0.38
                stSummaries.push(`${STATION_META[code].label} ${fmtClock(aSec)}`)
              }
            }
          }
          const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length
          qualityPct = Math.round(avgRatio * 100)
          stimulusParts.push(stSummaries.slice(0, 3).join(' · '))
        } else {
          const durA = sess.durationActualMin ?? sess.durationPrescribedMin ?? 50
          const durP = sess.durationPrescribedMin ?? durA
          qualityPct = durP > 0 ? Math.min(115, Math.max(85, Math.round((durA / durP) * 100))) : 102
          if (sess.kmActual && sess.kmActual > 0) {
            stimulusParts.push(`${sess.kmActual.toFixed(1)} km híbrido`)
          }
        }
      } else {
        // RECUPERACAO / Mobilidade (dissipa fadiga aguda e melhora prontidão/Roxzone)
        primaryFocus = 'RECOVERY'
        runWeight = 0.1
        workWeight = 0.08
        roxWeight = 0.18
        qualityPct = 100
        stimulusParts.push(`Regenerativo ${sess.durationActualMin ?? sess.durationPrescribedMin ?? 30} min`)
      }

      if (sess.rpeActual != null) {
        stimulusParts.push(`RPE ${sess.rpeActual}`)
      }
      if (stimulusParts.length === 0) {
        stimulusParts.push(`${sess.durationActualMin ?? sess.durationPrescribedMin} min executados`)
      }

      const qualityMultiplier = Math.max(0.45, Math.min(1.35, qualityPct / 100))

      // Aplica evolução incremental nos 8 splits de corrida (com ganho extra em Run 3 e Run 8 nos treinos de Força e Bricks)
      for (let i = 0; i < 8; i++) {
        const isCompromisedRun = i === 2 || i === 7
        const compromisedBoost =
          isCompromisedRun && (sess.type === 'FORCA' || sess.type === 'HIBRIDO') ? 1.25 : 1.0
        const dropSec =
          totalPlannedRunDrop[i] * weekRunBudget * runWeight * qualityMultiplier * compromisedBoost
        liveRunExact[i] = Math.max(targetW28State.runSplits[i] - 4, liveRunExact[i] - dropSec)
      }

      // Aplica evolução incremental nas 8 estações HYROX
      for (const code of WORKOUT_STATION_ORDER) {
        const boost = stationSpecificBoost[code] ?? 1.0
        const dropSec = totalPlannedWorkDrop[code] * weekWorkBudget * workWeight * qualityMultiplier * boost
        liveWorkExact[code] = Math.max(
          targetW28State.workSplits[code] - 5,
          liveWorkExact[code] - dropSec,
        )
      }

      // Aplica evolução incremental nas 8 transições da Roxzone
      for (let i = 0; i < 8; i++) {
        const dropSec = totalPlannedRoxDrop[i] * weekRoxBudget * roxWeight * qualityMultiplier
        liveRoxExact[i] = Math.max(targetW28State.roxSplits[i] - 2, liveRoxExact[i] - dropSec)
      }

      // Atualiza fatores de fadiga das corridas comprometidas
      for (let i = 0; i < 8; i++) {
        const baseF = baselineState.fatigueFactors[i]
        const targF = targetW28State.fatigueFactors[i]
        const stepF = (baseF - targF) * weekRunBudget * runWeight * qualityMultiplier
        liveFatigue[i] = Math.max(targF, Math.round((liveFatigue[i] - stepF) * 1000) / 1000)
      }

      const snapRunSplits = liveRunExact.map((v) => Math.round(v))
      const snapWorkSplits = {} as Record<StationCode, number>
      for (const code of WORKOUT_STATION_ORDER) {
        snapWorkSplits[code] = Math.round(liveWorkExact[code])
      }
      const snapRoxSplits = liveRoxExact.map((v) => Math.round(v))

      const snapTotals = sumSplits({
        runSplits: snapRunSplits,
        workSplits: snapWorkSplits,
        roxSplits: snapRoxSplits,
        fatigueFactors: [...liveFatigue],
      })

      const deltaFromPrevSec = snapTotals.totalTimeSec - prevTotalTimeSec
      prevTotalTimeSec = snapTotals.totalTimeSec

      sessionEvolution.push({
        index: sessionEvolution.length,
        sessionId: sess.id,
        weekId: micro.id,
        date: sess.date.toISOString(),
        dateFormatted: fmtDateShort(sess.date),
        weekNumber: wNum,
        phaseCode: micro.mesocycle.code,
        sessionType: sess.type,
        sessionTitle: sess.title,
        stimulusSummary: stimulusParts.join(' · '),
        primaryFocus,
        executionQualityPct: qualityPct,
        totalRunSec: snapTotals.totalRunSec,
        totalWorkSec: snapTotals.totalWorkSec,
        totalRoxSec: snapTotals.totalRoxSec,
        totalTimeSec: snapTotals.totalTimeSec,
        totalTimeFormatted: fmtClockHms(snapTotals.totalTimeSec),
        deltaFromPrevSec,
        cumulativeGainSec: baselineTotals.totalTimeSec - snapTotals.totalTimeSec,
        overallPercentile: timeToPercentileCurve(snapTotals.totalTimeSec, divBench.totalTime),
        fadeIndexPct: computeFadeIndexPct(snapRunSplits),
      })
    }

    // Se a semana teve sessões concluídas, registra o snapshot consolidado ao final da semana
    const doneInWeek = micro.sessions.filter(
      (s) => s.status === 'CONCLUIDO' || s.status === 'PARCIAL' || s.status === 'AJUSTADO',
    ).length
    if (doneInWeek > 0) {
      const wRun = liveRunExact.map((v) => Math.round(v))
      const wWork = {} as Record<StationCode, number>
      for (const code of WORKOUT_STATION_ORDER) {
        wWork[code] = Math.round(liveWorkExact[code])
      }
      const wRox = liveRoxExact.map((v) => Math.round(v))
      weekEndSimulatedMap.set(wNum, {
        runSplits: wRun,
        workSplits: wWork,
        roxSplits: wRox,
        fatigueFactors: [...liveFatigue],
      })
    }
  }

  // Estado atual vivo consolidado (após todas as sessões concluídas)
  const liveState: SplitStateVector = {
    runSplits: liveRunExact.map((v) => Math.round(v)),
    workSplits: WORKOUT_STATION_ORDER.reduce((acc, code) => {
      acc[code] = Math.round(liveWorkExact[code])
      return acc
    }, {} as Record<StationCode, number>),
    roxSplits: liveRoxExact.map((v) => Math.round(v)),
    fatigueFactors: [...liveFatigue],
  }
  const liveTotals = sumSplits(liveState)

  // Determina a semana atual na linha do tempo ou a última semana com sessões executadas
  const todayStr = new Date().toISOString().slice(0, 10)
  const calendarCurrentMicro = microcycles.find(
    (m) =>
      m.startDate.toISOString().slice(0, 10) <= todayStr &&
      todayStr <= m.endDate.toISOString().slice(0, 10),
  )
  const highestExecutedWeek =
    weekEndSimulatedMap.size > 0 ? Math.max(...Array.from(weekEndSimulatedMap.keys())) : 1
  const activeWeekNumber = Math.max(calendarCurrentMicro?.weekNumber ?? 1, highestExecutedWeek)
  const activeMicro = microcycles.find((m) => m.weekNumber === activeWeekNumber) ?? microcycles[0]

  // 4. Constrói a Curva Semanal das 28 Semanas (Planejado vs Simulado Real vs Projetado Reancorado)
  const activeWeekProg = WEEKLY_ADAPTATION_PROGRESS[activeWeekNumber] ?? {
    run: 0.05,
    work: 0.04,
    rox: 0.03,
  }

  const weeklySimulationCurve: PeriodizationWeekSimulationPointDTO[] = microcycles.map((micro) => {
    const wNum = micro.weekNumber
    const prog = WEEKLY_ADAPTATION_PROGRESS[wNum] ?? { run: 1, work: 1, rox: 1 }
    const plannedState = interpolateSplits(baselineState, targetW28State, prog)
    const plannedTotals = sumSplits(plannedState)

    const sessionsDone = micro.sessions.filter(
      (s) => s.status === 'CONCLUIDO' || s.status === 'PARCIAL' || s.status === 'AJUSTADO',
    ).length
    const sessionsTotal = micro.sessions.length
    const adherencePct = sessionsDone > 0 ? Math.round((sessionsDone / sessionsTotal) * 100) : null

    const simulatedState = weekEndSimulatedMap.get(wNum)
    const isExecuted = simulatedState != null

    // Para semanas futuras, reancora a projeção a partir do liveState atual até o alvo S28
    const remainingProg = {
      run:
        wNum <= activeWeekNumber
          ? 0
          : (prog.run - activeWeekProg.run) / Math.max(0.01, 1 - activeWeekProg.run),
      work:
        wNum <= activeWeekNumber
          ? 0
          : (prog.work - activeWeekProg.work) / Math.max(0.01, 1 - activeWeekProg.work),
      rox:
        wNum <= activeWeekNumber
          ? 0
          : (prog.rox - activeWeekProg.rox) / Math.max(0.01, 1 - activeWeekProg.rox),
    }

    const projectedState =
      simulatedState ??
      (wNum <= activeWeekNumber
        ? liveState
        : interpolateSplits(liveState, targetW28State, remainingProg))
    const projectedTotals = sumSplits(projectedState)
    const simulatedTotals = simulatedState ? sumSplits(simulatedState) : null

    return {
      weekId: micro.id,
      weekNumber: wNum,
      label: `S${wNum}`,
      phaseCode: micro.mesocycle.code,
      weekType: micro.type,
      isCurrent: wNum === activeWeekNumber,
      isExecuted,
      sessionsDone,
      sessionsTotal,
      adherencePct,
      plannedTotalSec: plannedTotals.totalTimeSec,
      plannedFormatted: fmtClockHms(plannedTotals.totalTimeSec),
      simulatedTotalSec: simulatedTotals ? simulatedTotals.totalTimeSec : null,
      simulatedFormatted: simulatedTotals ? fmtClockHms(simulatedTotals.totalTimeSec) : null,
      projectedTotalSec: projectedTotals.totalTimeSec,
      projectedFormatted: fmtClockHms(projectedTotals.totalTimeSec),
      plannedRunSec: plannedTotals.totalRunSec,
      plannedWorkSec: plannedTotals.totalWorkSec,
      plannedRoxSec: plannedTotals.totalRoxSec,
      activeRunSec: projectedTotals.totalRunSec,
      activeWorkSec: projectedTotals.totalWorkSec,
      activeRoxSec: projectedTotals.totalRoxSec,
    }
  })

  // 5. Resumo de Acompanhamento da Periodização (Progression Summary)
  const currentWeekCurvePoint =
    weeklySimulationCurve.find((w) => w.weekNumber === activeWeekNumber) ?? weeklySimulationCurve[0]

  // Expectativa da periodização proporcional às sessões já realizadas na semana atual
  const prevWeekPoint =
    weeklySimulationCurve.find((w) => w.weekNumber === Math.max(1, activeWeekNumber - 1)) ??
    weeklySimulationCurve[0]
  const currentWeekFraction =
    currentWeekCurvePoint && currentWeekCurvePoint.sessionsTotal > 0
      ? currentWeekCurvePoint.sessionsDone / currentWeekCurvePoint.sessionsTotal
      : 0
  const prevExpectedSec =
    activeWeekNumber === 1 ? baselineTotals.totalTimeSec : prevWeekPoint.plannedTotalSec
  const fullWeekExpectedSec =
    activeWeekNumber === 1
      ? Math.round(
          baselineTotals.totalTimeSec -
            (baselineTotals.totalTimeSec - targetTotals.totalTimeSec) * 0.035,
        )
      : currentWeekCurvePoint.plannedTotalSec

  const expectedForCurrentWeekSec =
    completedSessionsCount === 0
      ? baselineTotals.totalTimeSec
      : Math.round(
          prevExpectedSec - (prevExpectedSec - fullWeekExpectedSec) * Math.max(0.15, currentWeekFraction),
        )

  const gainAchievedSec = baselineTotals.totalTimeSec - liveTotals.totalTimeSec
  const totalPlannedCycleGainSec = Math.max(1, baselineTotals.totalTimeSec - targetTotals.totalTimeSec)
  const remainingToGoalSec = Math.max(0, liveTotals.totalTimeSec - targetTotals.totalTimeSec)
  const goalProgressPct = Math.min(
    100,
    Math.max(0, Math.round((gainAchievedSec / totalPlannedCycleGainSec) * 1000) / 10),
  )

  const deltaVsExpectedWeekSec = liveTotals.totalTimeSec - expectedForCurrentWeekSec
  const periodizationStatus: PeriodizationProgressionSummaryDTO['periodizationStatus'] =
    completedSessionsCount === 0
      ? 'NO_ALVO'
      : deltaVsExpectedWeekSec <= -6
        ? 'ADIANTADO'
        : deltaVsExpectedWeekSec <= 15
          ? 'NO_ALVO'
          : 'ATRASADO'

  const periodizationStatusLabel =
    completedSessionsCount === 0
      ? `0 treinos confirmados · Ponto de Partida S1 (${PHASE_META[(activeMicro?.mesocycle.code ?? 'DIAG') as PhaseCode]?.short ?? 'DIAG'})`
      : periodizationStatus === 'ADIANTADO'
        ? `Adiantado (${fmtClock(Math.abs(deltaVsExpectedWeekSec))} mais rápido que a curva S${activeWeekNumber})`
        : periodizationStatus === 'NO_ALVO'
          ? `No Alvo da Periodização (Semana ${activeWeekNumber} · ${PHASE_META[(activeMicro?.mesocycle.code ?? 'DIAG') as PhaseCode]?.short ?? 'DIAG'})`
          : `Atenção: +${fmtClock(Math.abs(deltaVsExpectedWeekSec))} acima do previsto na S${activeWeekNumber}`

  const totalPlannedSessionsToDate = microcycles
    .filter((m) => m.weekNumber <= activeWeekNumber)
    .reduce((acc, m) => acc + m.sessions.length, 0)
  const adherenceToDatePct =
    completedSessionsCount === 0
      ? 0
      : totalPlannedSessionsToDate > 0
        ? Math.min(100, Math.round((completedSessionsCount / totalPlannedSessionsToDate) * 100))
        : 0

  const currentPhaseCode = (activeMicro?.mesocycle.code ?? 'DIAG') as PhaseCode

  const progression: PeriodizationProgressionSummaryDTO = {
    currentWeekNumber: activeWeekNumber,
    currentPhaseCode,
    currentPhaseName: PHASE_META[currentPhaseCode]?.label ?? 'Diagnóstico',
    completedSessionsCount,
    totalPlannedSessionsToDate,
    adherenceToDatePct,
    baselineTotalSec: baselineTotals.totalTimeSec,
    baselineFormatted: fmtClockHms(baselineTotals.totalTimeSec),
    currentSimulatedTotalSec: liveTotals.totalTimeSec,
    currentSimulatedFormatted: fmtClockHms(liveTotals.totalTimeSec),
    expectedForCurrentWeekSec,
    expectedForCurrentWeekFormatted: fmtClockHms(expectedForCurrentWeekSec),
    targetWeek28TotalSec: targetTotals.totalTimeSec,
    targetWeek28Formatted: fmtClockHms(targetTotals.totalTimeSec),
    gainAchievedSec,
    gainAchievedFormatted:
      gainAchievedSec >= 0 ? `-${fmtClock(gainAchievedSec)}` : `+${fmtClock(Math.abs(gainAchievedSec))}`,
    remainingToGoalSec,
    remainingToGoalFormatted: fmtClock(remainingToGoalSec),
    goalProgressPct,
    deltaVsExpectedWeekSec,
    periodizationStatus,
    periodizationStatusLabel,
  }

  return {
    athlete: {
      id: athleteRow.id,
      name: athleteRow.name,
      division,
      ageGroup: athleteRow.ageGroup,
      raceDate: athleteRow.raceDate,
      goalRaceTime: athleteRow.goalRaceTime,
      vt1SpeedKmh: athleteRow.vt1SpeedKmh,
      vt2SpeedKmh: athleteRow.vt2SpeedKmh,
      vo2max: athleteRow.vo2max,
      fiveKmPbSec: athleteRow.fiveKmPbSec,
      skiErg1kTtSec: athleteRow.skiErg1kTtSec,
      row500mTtSec: athleteRow.row500mTtSec,
      squat3rmKg: athleteRow.squat3rmKg,
      deadlift3rmKg: athleteRow.deadlift3rmKg,
    },
    baselineState,
    liveState,
    targetW28State,
    progression,
    weeklySimulationCurve,
    sessionEvolution,
  }
}
