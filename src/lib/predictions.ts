// Motor Preditivo de Desempenho e Tempo de Prova HYROX
// Implementa os Princípios I (Sports Science) e II (Data Integrity) da Constituição
import { db } from '@/lib/db'
import {
  HYROX_OFFICIAL_SEGMENTS,
  RUN_FATIGUE_FACTORS,
  DEFAULT_ROXZONE_SEC,
  STATION_NORMATIVE_SECONDS_OPEN_M,
  StationCode,
} from '@/lib/constants'
import { fmtClock, fmtClockHms, fmtPace } from '@/lib/format'
import type {
  RacePredictionDTO,
  SegmentPredictionSplitDTO,
  PredictionScenarioInput,
} from '@/lib/types'

export interface AthletePredictionContext {
  athlete: {
    name: string
    vo2max: number | null
    vt1SpeedKmh: number | null
    vt2SpeedKmh: number | null
    fiveKmPbSec: number | null
    goalRaceTime: number | null
  }
  stationHistory: Record<string, { best: number; avg: number; count: number }>
  simulationCount: number
}

/**
 * Carrega atleta e dados históricos de estações do banco SQLite
 */
export async function getAthleteAndHistoricalSplits(): Promise<AthletePredictionContext | null> {
  const athlete = await db.athlete.findFirst({
    select: {
      name: true,
      vo2max: true,
      vt1SpeedKmh: true,
      vt2SpeedKmh: true,
      fiveKmPbSec: true,
      goalRaceTime: true,
    },
  })

  if (!athlete) return null

  // Carrega splits de estações realizados
  const results = await db.stationResult.findMany({
    where: {
      splitActualSec: { not: null, gt: 0 },
    },
    select: {
      station: true,
      splitActualSec: true,
      splitPrescribedSec: true,
      session: {
        select: {
          type: true,
        },
      },
    },
  })

  const history: Record<string, { best: number; avg: number; count: number; sum: number }> = {}
  let simCount = 0

  for (const r of results) {
    if (!r.splitActualSec) continue
    if (r.session.type === 'TESTE' || r.session.type === 'HIBRIDO') {
      simCount++
    }
    const cur = history[r.station]
    if (!cur) {
      history[r.station] = {
        best: r.splitActualSec,
        avg: r.splitActualSec,
        count: 1,
        sum: r.splitActualSec,
      }
    } else {
      cur.count++
      cur.sum += r.splitActualSec
      cur.avg = Math.round(cur.sum / cur.count)
      if (r.splitActualSec < cur.best) {
        cur.best = r.splitActualSec
      }
    }
  }

  const stationHistory: Record<string, { best: number; avg: number; count: number }> = {}
  for (const [k, v] of Object.entries(history)) {
    stationHistory[k] = { best: v.best, avg: v.avg, count: v.count }
  }

  return {
    athlete,
    stationHistory,
    simulationCount: Math.floor(simCount / 8),
  }
}

/**
 * Calcula a velocidade base de corrida (em segundos por km)
 */
export function calculateBaseRunningPace(athlete: AthletePredictionContext['athlete']): number {
  // 1. Se possuir VT2 (limiar anaeróbico), é o ritmo ótimo de sustentação do Hyrox
  if (athlete.vt2SpeedKmh && athlete.vt2SpeedKmh > 0) {
    // Ex.: 11.9 km/h -> 3600 / 11.9 = ~302.5s (~5:02/km)
    // Para prova pura de 8km com quebras, o pace base de corrida 1 fresca é cerca de 95% do limiar
    return Math.round((3600 / athlete.vt2SpeedKmh) * 0.96)
  }

  // 2. Se possuir 5km PB
  if (athlete.fiveKmPbSec && athlete.fiveKmPbSec > 0) {
    const pace5k = athlete.fiveKmPbSec / 5
    // Pace base Hyrox ~5% mais conservador que 5km all-out
    return Math.round(pace5k * 1.05)
  }

  // 3. Fallback por VO2max (estimativa vVO2max)
  if (athlete.vo2max && athlete.vo2max > 0) {
    const estimatedSpeedKmh = (athlete.vo2max - 3.5) / 3.5 // aproximação de Léger/Mercier
    const thresholdSpeed = estimatedSpeedKmh * 0.85
    return Math.round(3600 / thresholdSpeed)
  }

  // Padrão geral Open Masculino: 4:50/km (290s)
  return 290
}

/**
 * Computa a previsão de prova integral
 */
export async function computeRacePrediction(): Promise<RacePredictionDTO | null> {
  const ctx = await getAthleteAndHistoricalSplits()
  if (!ctx) return null

  const { athlete, stationHistory, simulationCount } = ctx
  const basePaceSec = calculateBaseRunningPace(athlete)
  const targetGoalTimeSec = athlete.goalRaceTime ?? 4500 // default 01:15:00

  // Gera os 16 segmentos nominais
  let runIndex = 1
  const segments: SegmentPredictionSplitDTO[] = []
  const criticalStations: string[] = []
  const warnings: string[] = []

  let totalRunSec = 0
  let totalStationsSec = 0

  for (const seg of HYROX_OFFICIAL_SEGMENTS) {
    if (seg.type === 'RUN') {
      const fatigueFactor = RUN_FATIGUE_FACTORS[runIndex] ?? 1.05
      const predictedSec = Math.round(basePaceSec * fatigueFactor)
      totalRunSec += predictedSec

      // Meta proporcional (distribuição equilibrada)
      const targetSec = Math.round((targetGoalTimeSec * 0.52 / 8) * (fatigueFactor / 1.05))

      segments.push({
        order: seg.order,
        segmentKey: seg.key,
        type: 'RUN',
        name: `${seg.name} (1.000 m)`,
        distanceM: seg.distanceM ?? 1000,
        reps: null,
        predictedSec,
        predictedFormatted: fmtClock(predictedSec),
        targetSec,
        targetFormatted: fmtClock(targetSec),
        paceMinKmFormatted: fmtPace(predictedSec),
        fatigueFactorApplied: fatigueFactor,
        isCritical: fatigueFactor >= 1.12, // runs pós-sled e pós-sandbag
        historicalBestSec: null,
      })

      if (runIndex === 8) {
        warnings.push('Corrida 8 projeta decaimento de +15% de pace devido à fadiga excêntrica do Sandbag')
      }

      runIndex++
    } else {
      // Estação Funcional
      const stCode = seg.stationCode as StationCode
      const normativeSec = STATION_NORMATIVE_SECONDS_OPEN_M[stCode] ?? 240
      const hist = stationHistory[stCode]

      let predictedSec = normativeSec
      let historicalBestSec: number | null = null

      if (hist && hist.count > 0) {
        historicalBestSec = hist.best
        // Ponderação: 60% média recente + 40% melhor histórico
        predictedSec = Math.round(hist.avg * 0.6 + hist.best * 0.4)
      }

      totalStationsSec += predictedSec
      const targetSec = Math.round(normativeSec * 0.95)
      const isCritical = predictedSec > targetSec * 1.12

      if (isCritical) {
        criticalStations.push(seg.key)
      }

      segments.push({
        order: seg.order,
        segmentKey: seg.key,
        type: 'STATION',
        name: `${seg.name} (${seg.description})`,
        distanceM: seg.distanceM ?? null,
        reps: seg.reps ?? null,
        predictedSec,
        predictedFormatted: fmtClock(predictedSec),
        targetSec,
        targetFormatted: fmtClock(targetSec),
        paceMinKmFormatted: null,
        fatigueFactorApplied: 1.0,
        isCritical,
        historicalBestSec,
      })
    }
  }

  const roxzoneSec = DEFAULT_ROXZONE_SEC
  const realisticTotalSec = totalRunSec + totalStationsSec + roxzoneSec

  // Cenário Otimista: -2.5% corrida, -3% estações, -15% roxzone
  const optRun = Math.round(totalRunSec * 0.975)
  const optSt = Math.round(totalStationsSec * 0.97)
  const optRox = Math.round(roxzoneSec * 0.85)
  const optimisticTotalSec = optRun + optSt + optRox

  // Cenário Conservador: +3.5% corrida, +5% estações, +15% roxzone
  const consRun = Math.round(totalRunSec * 1.035)
  const consSt = Math.round(totalStationsSec * 1.05)
  const consRox = Math.round(roxzoneSec * 1.15)
  const conservativeTotalSec = consRun + consSt + consRox

  const deltaSec = realisticTotalSec - targetGoalTimeSec
  const deltaPct = Math.round((deltaSec / targetGoalTimeSec) * 1000) / 10

  const confidenceLevel: RacePredictionDTO['confidenceLevel'] =
    simulationCount >= 2 ? 'ALTA' : simulationCount === 1 ? 'MEDIA' : 'ESTIMATIVA_INICIAL'

  return {
    generatedAt: new Date().toISOString(),
    athleteName: athlete.name,
    targetGoalTimeSec,
    targetGoalTimeFormatted: fmtClockHms(targetGoalTimeSec),
    realisticTotalSec,
    realisticFormatted: fmtClockHms(realisticTotalSec),
    optimisticTotalSec,
    optimisticFormatted: fmtClockHms(optimisticTotalSec),
    conservativeTotalSec,
    conservativeFormatted: fmtClockHms(conservativeTotalSec),
    totalRunSec,
    totalRunFormatted: fmtClockHms(totalRunSec),
    totalStationsSec,
    totalStationsFormatted: fmtClockHms(totalStationsSec),
    roxzoneSec,
    roxzoneFormatted: fmtClockHms(roxzoneSec),
    deltaSec,
    deltaFormatted: deltaSec >= 0 ? `+${fmtClockHms(deltaSec)}` : `-${fmtClockHms(Math.abs(deltaSec))}`,
    deltaPct,
    isWithinGoal: deltaSec <= 0,
    confidenceLevel,
    simulationCountUsed: simulationCount,
    criticalStations,
    warnings,
    segments,
  }
}

export { simulatePredictionScenario } from '@/lib/predictions-calc'

