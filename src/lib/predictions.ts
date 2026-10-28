// Motor Preditivo de Desempenho e Tempo de Prova HYROX — Dinâmico e Guiado pela Periodização
import { db } from '@/lib/db'
import {
  HYROX_OFFICIAL_SEGMENTS,
  RUN_FATIGUE_FACTORS,
  HYRESULT_DIVISION_BENCHMARKS,
  DIVISION_STATION_SPECS,
  StationCode,
} from '@/lib/constants'
import { fmtClock, fmtClockHms, fmtPace } from '@/lib/format'
import { computeLivePeriodizationEvolution } from '@/lib/live-evolution'
import type {
  HyroxDivision,
  RacePredictionDTO,
  SegmentPredictionSplitDTO,
} from '@/lib/types'

export interface AthletePredictionContext {
  athlete: {
    id: string
    name: string
    division: HyroxDivision
    vo2max: number | null
    vt1SpeedKmh: number | null
    vt2SpeedKmh: number | null
    fiveKmPbSec: number | null
    skiErg1kTtSec: number | null
    row500mTtSec: number | null
    squat3rmKg: number | null
    deadlift3rmKg: number | null
    goalRaceTime: number | null
  }
  stationHistory: Record<string, { best: number; avg: number; count: number }>
  simulationCount: number
}

/**
 * Carrega atleta (por id ou o primeiro cadastrado) e dados históricos de estações
 */
export async function getAthleteAndHistoricalSplits(athleteId?: string): Promise<AthletePredictionContext | null> {
  const athleteRow = athleteId
    ? await db.athlete.findUnique({ where: { id: athleteId } })
    : await db.athlete.findFirst({ orderBy: { createdAt: 'asc' } })

  if (!athleteRow) return null

  const division = (['OPEN_M', 'OPEN_F', 'PRO_M', 'PRO_F'].includes(athleteRow.division)
    ? athleteRow.division
    : 'OPEN_M') as HyroxDivision

  const results = await db.stationResult.findMany({
    where: {
      splitActualSec: { not: null, gt: 0 },
      session: {
        microcycle: {
          mesocycle: {
            athleteId: athleteRow.id,
          },
        },
      },
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
    athlete: {
      id: athleteRow.id,
      name: athleteRow.name,
      division,
      vo2max: athleteRow.vo2max,
      vt1SpeedKmh: athleteRow.vt1SpeedKmh,
      vt2SpeedKmh: athleteRow.vt2SpeedKmh,
      fiveKmPbSec: athleteRow.fiveKmPbSec,
      skiErg1kTtSec: athleteRow.skiErg1kTtSec,
      row500mTtSec: athleteRow.row500mTtSec,
      squat3rmKg: athleteRow.squat3rmKg,
      deadlift3rmKg: athleteRow.deadlift3rmKg,
      goalRaceTime: athleteRow.goalRaceTime,
    },
    stationHistory,
    simulationCount: Math.max(1, Math.ceil(simCount / 4)),
  }
}

export function calculateBaseRunningPace(athlete: AthletePredictionContext['athlete']): number {
  if (athlete.vt2SpeedKmh && athlete.vt2SpeedKmh > 0) {
    return Math.round((3600 / athlete.vt2SpeedKmh) * 0.96)
  }

  if (athlete.fiveKmPbSec && athlete.fiveKmPbSec > 0) {
    const pace5k = athlete.fiveKmPbSec / 5
    return Math.round(pace5k * 1.05)
  }

  if (athlete.vo2max && athlete.vo2max > 0) {
    const estimatedSpeedKmh = (athlete.vo2max - 3.5) / 3.5
    const thresholdSpeed = estimatedSpeedKmh * 0.85
    return Math.round(3600 / thresholdSpeed)
  }

  return HYRESULT_DIVISION_BENCHMARKS[athlete.division].stations.RUN_1KM.medianSec
}

export async function computeRacePrediction(athleteId?: string): Promise<RacePredictionDTO | null> {
  const [ctx, liveEvolution] = await Promise.all([
    getAthleteAndHistoricalSplits(athleteId),
    computeLivePeriodizationEvolution(athleteId),
  ])
  if (!ctx || !liveEvolution) return null

  const { athlete, stationHistory } = ctx
  const { liveState, targetW28State, progression, weeklySimulationCurve, sessionEvolution } = liveEvolution
  const targetGoalTimeSec = athlete.goalRaceTime ?? progression.targetWeek28TotalSec
  const divLoads = DIVISION_STATION_SPECS[athlete.division]

  let runIndex = 1
  const segments: SegmentPredictionSplitDTO[] = []
  const criticalStations: string[] = []
  const warnings: string[] = []

  let totalRunSec = 0
  let totalStationsSec = 0

  for (const seg of HYROX_OFFICIAL_SEGMENTS) {
    if (seg.type === 'RUN') {
      const idx = runIndex - 1
      const predictedSec = liveState.runSplits[idx] ?? calculateBaseRunningPace(athlete)
      const targetSec = targetW28State.runSplits[idx] ?? Math.round((targetGoalTimeSec * 0.52) / 8)
      const fatigueFactor = liveState.fatigueFactors[idx] ?? RUN_FATIGUE_FACTORS[runIndex] ?? 1.05
      totalRunSec += predictedSec

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
        isCritical: runIndex === 3 || runIndex === 8 || predictedSec > targetSec * 1.09,
        historicalBestSec: null,
      })

      if (runIndex === 8) {
        const dropVsRun1 = predictedSec - (liveState.runSplits[0] ?? predictedSec)
        warnings.push(
          `Corrida 8 (pós-Sandbag Lunges) projeta +${dropVsRun1}s sobre o Km 1 — os Bricks de Sábado (SPP1/SPP2) reduzem esse decaimento.`,
        )
      }

      runIndex++
    } else {
      const stCode = seg.stationCode as StationCode
      const predictedSec = liveState.workSplits[stCode] ?? 220
      const targetSec = targetW28State.workSplits[stCode] ?? Math.round(predictedSec * 0.92)
      const hist = stationHistory[stCode]
      const historicalBestSec = hist && hist.count > 0 ? hist.best : null

      totalStationsSec += predictedSec
      const isCritical = predictedSec > targetSec * 1.09

      if (isCritical) {
        criticalStations.push(seg.key)
      }

      segments.push({
        order: seg.order,
        segmentKey: seg.key,
        type: 'STATION',
        name: `${seg.name} (${divLoads.stationLoadDesc[stCode]})`,
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

  const roxzoneSec = liveState.roxSplits.reduce((a, b) => a + b, 0)
  const realisticTotalSec = totalRunSec + totalStationsSec + roxzoneSec

  // O cenário otimista projeta a evolução esperada ao concluir 100% da periodização até a Semana 28
  const optimisticTotalSec = Math.min(
    progression.targetWeek28TotalSec,
    Math.round(totalRunSec * 0.97 + totalStationsSec * 0.96 + roxzoneSec * 0.88),
  )

  const consRun = Math.round(totalRunSec * 1.035)
  const consSt = Math.round(totalStationsSec * 1.05)
  const consRox = Math.round(roxzoneSec * 1.12)
  const conservativeTotalSec = consRun + consSt + consRox

  const deltaSec = realisticTotalSec - targetGoalTimeSec
  const deltaPct = Math.round((deltaSec / targetGoalTimeSec) * 1000) / 10

  const completedCount = progression.completedSessionsCount
  const confidenceLevel: RacePredictionDTO['confidenceLevel'] =
    completedCount >= 6 ? 'ALTA' : completedCount >= 2 ? 'MEDIA' : 'ESTIMATIVA_INICIAL'

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
    simulationCountUsed: completedCount,
    criticalStations,
    warnings,
    segments,
    progression,
    weeklySimulationCurve,
    sessionEvolution,
  }
}

export { simulatePredictionScenario } from '@/lib/predictions-calc'
