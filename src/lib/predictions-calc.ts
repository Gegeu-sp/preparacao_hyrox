// Funções puras de cálculo e simulação do Preditor HYROX (Client & Server safe)
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

/**
 * Recalcula a projeção aplicando deltas do simulador "What-If"
 * Função pura e idempotente (pode rodar no browser ou no Node)
 */
export function simulatePredictionScenario(
  base: RacePredictionDTO,
  input: PredictionScenarioInput
): RacePredictionDTO {
  const paceDelta = input.basePaceAdjustmentSec ?? 0
  const stationAdjustments = input.stationAdjustments ?? {}
  const roxzoneDelta = input.roxzoneAdjustmentSec ?? 0
  const targetGoalTimeSec = input.customGoalTimeSec ?? base.targetGoalTimeSec

  let totalRunSec = 0
  let totalStationsSec = 0

  const segments: SegmentPredictionSplitDTO[] = base.segments.map((seg) => {
    if (seg.type === 'RUN') {
      const deltaApplied = Math.round(paceDelta * seg.fatigueFactorApplied)
      const predictedSec = Math.max(180, seg.predictedSec + deltaApplied)
      totalRunSec += predictedSec

      return {
        ...seg,
        predictedSec,
        predictedFormatted: fmtClock(predictedSec),
        paceMinKmFormatted: fmtPace(predictedSec),
      }
    } else {
      const adj = stationAdjustments[seg.segmentKey] ?? 0
      const predictedSec = Math.max(60, seg.predictedSec + adj)
      totalStationsSec += predictedSec

      return {
        ...seg,
        predictedSec,
        predictedFormatted: fmtClock(predictedSec),
      }
    }
  })

  const roxzoneSec = Math.max(180, base.roxzoneSec + roxzoneDelta)
  const realisticTotalSec = totalRunSec + totalStationsSec + roxzoneSec

  const optimisticTotalSec = Math.round(
    totalRunSec * 0.975 + totalStationsSec * 0.97 + roxzoneSec * 0.85
  )
  const conservativeTotalSec = Math.round(
    totalRunSec * 1.035 + totalStationsSec * 1.05 + roxzoneSec * 1.15
  )

  const deltaSec = realisticTotalSec - targetGoalTimeSec
  const deltaPct = Math.round((deltaSec / targetGoalTimeSec) * 1000) / 10

  const warnings = [...base.warnings]
  if (paceDelta < -15 && !warnings.some(w => w.includes('aceleração excessiva'))) {
    warnings.unshift('Alerta de ritmo: aceleração excessiva (>15s/km) acarreta alto risco de quebra nos Lunges')
  }

  return {
    ...base,
    generatedAt: new Date().toISOString(),
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
    warnings,
    segments,
  }
}
