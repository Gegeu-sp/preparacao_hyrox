// Motor Analítico de Performance Padrão HYRESULT — Com Evolução Treino a Treino (Ao Vivo)
// Computa Decomposição nos 3 Pilares, Percentis por Divisão, Spider/Radar 10 Eixos (3 camadas),
// Consistência de Pacing & Fade Index (Runs 1-8), Raio-X da Roxzone (8 transições),
// Economia Potencial de Tempo (Time Savings), Linha do Tempo Treino a Treino e Prescrição na Periodização.
import { db } from '@/lib/db'
import {
  DIVISION_META,
  DIVISION_STATION_SPECS,
  HYRESULT_DIVISION_BENCHMARKS,
  NormativeCurve,
  PHASE_META,
  PhaseCode,
  STATION_META,
  StationCode,
} from '@/lib/constants'
import { fmtClock, fmtClockHms, fmtPace } from '@/lib/format'
import { deriveCalibrationFactors } from '@/lib/periodization-generator'
import {
  computeLivePeriodizationEvolution,
  interpolateSplits,
  WEEKLY_ADAPTATION_PROGRESS,
} from '@/lib/live-evolution'
import type {
  HyresultAnalysisDTO,
  HyresultPeriodizationPrescriptionDTO,
  HyresultPillarBreakdownDTO,
  HyresultRoxzoneSplitDTO,
  HyresultRunSplitDTO,
  HyresultSourceType,
  HyresultStationSplitDTO,
  HyroxDivision,
} from '@/lib/types'

const WORKOUT_STATION_ORDER: StationCode[] = [
  'SKIERG',
  'SLED_PUSH',
  'SLED_PULL',
  'BBJ',
  'ROWING',
  'FARMERS',
  'SANDBAG',
  'WALLBALLS',
]

const PRECEDING_STATION_FOR_RUN: Record<number, string> = {
  1: 'Largada (Fresco)',
  2: 'Pós-SkiErg (1.000m)',
  3: 'Pós-Sled Push (Trenó Empurrar)',
  4: 'Pós-Sled Pull (Trenó Puxar)',
  5: 'Pós-Burpee Broad Jumps (80m)',
  6: 'Pós-Rowing (1.000m)',
  7: 'Pós-Farmers Carry (200m)',
  8: 'Pós-Sandbag Lunges (100m)',
}

/**
 * Converte um tempo (em segundos) em um Percentil (1..99) frente à curva normativa da divisão.
 * Menor tempo = Maior percentil (ex.: 90 = Top 10%).
 */
export function timeToPercentile(timeSec: number, curve: NormativeCurve): number {
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

/**
 * Converte um percentil alvo (1..99) de volta para tempo estimado na curva da divisão
 */
export function percentileToTime(percentile: number, curve: NormativeCurve): number {
  if (percentile >= 90) {
    return Math.round(curve.top10Sec * (1 - ((percentile - 90) / 10) * 0.08))
  }
  if (percentile >= 50) {
    const ratio = (percentile - 50) / 40
    return Math.round(curve.medianSec - ratio * (curve.medianSec - curve.top10Sec))
  }
  const ratio = Math.max(0, (percentile - 20) / 30)
  return Math.round(curve.bottom20Sec - ratio * (curve.bottom20Sec - curve.medianSec))
}

export function percentileRankLabel(percentile: number): string {
  const topPct = Math.max(1, 100 - percentile)
  if (percentile >= 90) return `Top ${topPct}% (Elite da Divisão)`
  if (percentile >= 75) return `Top ${topPct}% (Forte)`
  if (percentile >= 50) return `Top ${topPct}% (Acima da Mediana)`
  return `Top ${topPct}% (Gargalo de Tempo)`
}

interface RawExtractedSource {
  id: string
  sourceType: HyresultSourceType
  resultCode: string
  title: string
  date: string
  runSplits: number[] // 8 runs
  workSplits: Record<StationCode, number>
  roxSplits: number[] // 8 transitions
}

/**
 * Constrói uma fonte de dados a partir de uma semana da periodização (S21, S24, S26 ou S28)
 */
function buildSourceFromSession(
  weekNumber: number,
  sourceType: HyresultSourceType,
  sessionDate: Date,
  stations: { station: string; splitPrescribedSec: number | null; splitActualSec: number | null }[],
  fallbackRunPaceSec: number,
  divBench: typeof HYRESULT_DIVISION_BENCHMARKS['OPEN_M'],
): RawExtractedSource {
  const runRows = stations.filter((s) => s.station === 'RUN_1KM')
  const hasActuals = stations.some((s) => s.splitActualSec != null && s.splitActualSec > 0)

  const runFactors = [0.97, 0.99, 1.07, 1.02, 1.03, 1.01, 1.00, 1.09]
  const runSplits: number[] = []
  for (let i = 0; i < 8; i++) {
    const r = runRows[i] ?? runRows[i % Math.max(1, runRows.length)]
    const baseVal = r?.splitActualSec ?? r?.splitPrescribedSec ?? fallbackRunPaceSec
    runSplits.push(Math.round(baseVal * (hasActuals && runRows.length === 8 ? 1 : runFactors[i])))
  }

  const workSplits = {} as Record<StationCode, number>
  for (const stCode of WORKOUT_STATION_ORDER) {
    const row = stations.find((s) => s.station === stCode)
    const val = row?.splitActualSec ?? row?.splitPrescribedSec ?? divBench.stations[stCode].medianSec
    workSplits[stCode] = weekNumber === 21 && stCode === 'WALLBALLS' ? val * 2 : val
  }

  const baseRox = weekNumber === 28 ? 35 : weekNumber === 26 ? 38 : 42
  const roxSplits = [
    baseRox - 3,
    baseRox + 4,
    baseRox + 6,
    baseRox + 1,
    baseRox,
    baseRox - 2,
    baseRox + 5,
    baseRox + 2,
  ]

  const titles: Record<number, string> = {
    21: `Semana 21 — Meia-Simulação (${hasActuals ? 'Realizado' : 'Prescrito'})`,
    24: `Semana 24 — Simulação Completa #1 (${hasActuals ? 'Realizado' : 'Prescrito'})`,
    26: `Semana 26 — Simulação Completa #2 (${hasActuals ? 'Realizado' : 'Prescrito'})`,
    28: `Semana 28 — Alvo Final da Periodização (Prova HYROX)`,
  }

  return {
    id: `week-${weekNumber}`,
    sourceType,
    resultCode: `PLAN-W${weekNumber}`,
    title: titles[weekNumber] ?? `Semana ${weekNumber}`,
    date: sessionDate.toISOString(),
    runSplits,
    workSplits,
    roxSplits,
  }
}

export async function computeHyresultAnalysis(
  requestedAthleteId?: string,
  requestedSourceId?: string,
): Promise<HyresultAnalysisDTO | null> {
  const [athlete, liveEvolution] = await Promise.all([
    requestedAthleteId
      ? db.athlete.findUnique({ where: { id: requestedAthleteId } })
      : db.athlete.findFirst({ orderBy: { createdAt: 'asc' } }),
    computeLivePeriodizationEvolution(requestedAthleteId),
  ])

  if (!athlete || !liveEvolution) return null

  const division = (['OPEN_M', 'OPEN_F', 'PRO_M', 'PRO_F'].includes(athlete.division)
    ? athlete.division
    : 'OPEN_M') as HyroxDivision
  const divBench = HYRESULT_DIVISION_BENCHMARKS[division]
  const divSpec = DIVISION_STATION_SPECS[division]
  const cal = deriveCalibrationFactors(athlete)

  const [hyresultRecords, microcycles] = await Promise.all([
    db.hyresultRaceResult.findMany({
      where: { athleteId: athlete.id },
      orderBy: { createdAt: 'desc' },
    }),
    db.microcycle.findMany({
      where: { mesocycle: { athleteId: athlete.id } },
      include: {
        mesocycle: true,
        sessions: {
          where: { dayIndex: 6 },
          include: { stations: { orderBy: { order: 'asc' } } },
        },
      },
      orderBy: { weekNumber: 'asc' },
    }),
  ])

  const sources: RawExtractedSource[] = []

  // 1. FONTE PRIMÁRIA PADRÃO: Evolução Atual — Periodização Ao Vivo
  const latestSessionPoint = liveEvolution.sessionEvolution[liveEvolution.sessionEvolution.length - 1]
  sources.push({
    id: 'live-evolution',
    sourceType: 'LIVE_EVOLUTION',
    resultCode: `LIVE-S${liveEvolution.progression.currentWeekNumber}`,
    title: `Evolução Atual — Periodização Ao Vivo (${liveEvolution.progression.completedSessionsCount} treinos confirmados)`,
    date: latestSessionPoint?.date ?? new Date().toISOString(),
    runSplits: [...liveEvolution.liveState.runSplits],
    workSplits: { ...liveEvolution.liveState.workSplits },
    roxSplits: [...liveEvolution.liveState.roxSplits],
  })

  // 2. Resultados oficiais HYRESULT (ex.: LR3MS4JI5A0E80 — Baseline ou Importados)
  for (const rec of hyresultRecords) {
    let runSplits: number[] = []
    let workSplits = {} as Record<StationCode, number>
    let roxSplits: number[] = []
    try {
      runSplits = JSON.parse(rec.runSplitsJson)
      workSplits = JSON.parse(rec.workSplitsJson)
      roxSplits = JSON.parse(rec.roxSplitsJson)
    } catch {
      runSplits = new Array(8).fill(cal.runRacePaceSec)
    }
    sources.push({
      id: rec.id,
      sourceType: 'HYRESULT_OFFICIAL',
      resultCode: rec.resultCode,
      title: `${rec.eventName} (#${rec.resultCode})`,
      date: rec.eventDate.toISOString(),
      runSplits,
      workSplits,
      roxSplits,
    })
  }

  // 3. Marcos de Todos os Mesociclos da Periodização (GPP1, GPP2, SPP1, SPP2, COMP, TAPER)
  const periodizationMilestones: {
    wNum: number
    sType: HyresultSourceType
    title: string
  }[] = [
    { wNum: 6, sType: 'PERIODIZATION_MILESTONE', title: 'Semana 6 — Fim do GPP1 (Base Aeróbica & Adaptação)' },
    { wNum: 11, sType: 'PERIODIZATION_MILESTONE', title: 'Semana 11 — Fim do GPP2 (Força Máxima & Limiar)' },
    { wNum: 17, sType: 'PERIODIZATION_MILESTONE', title: 'Semana 17 — Fim do SPP1 (Potência & Corrida Comprometida)' },
    { wNum: 21, sType: 'SIMULATION_W21', title: 'Semana 21 — Meia-Simulação (Fim do SPP2)' },
    { wNum: 24, sType: 'SIMULATION_W24', title: 'Semana 24 — Simulação Completa #1 (COMP)' },
    { wNum: 26, sType: 'SIMULATION_W26', title: 'Semana 26 — Simulação Completa #2 (COMP)' },
    { wNum: 28, sType: 'TARGET_W28', title: 'Semana 28 — Alvo Final da Periodização (Prova HYROX)' },
  ]

  for (const ms of periodizationMilestones) {
    const micro = microcycles.find((m) => m.weekNumber === ms.wNum)
    const satSession = micro?.sessions[0]
    const hasActualStations =
      satSession?.stations.some((st) => st.splitActualSec != null && st.splitActualSec > 0) ?? false

    if (satSession && hasActualStations && satSession.stations.length >= 8) {
      sources.push(
        buildSourceFromSession(
          ms.wNum,
          ms.sType,
          satSession.date,
          satSession.stations,
          cal.runRacePaceSec,
          divBench,
        ),
      )
    } else {
      const prog = WEEKLY_ADAPTATION_PROGRESS[ms.wNum] ?? { run: 1, work: 1, rox: 1 }
      const interp =
        ms.wNum === 28
          ? liveEvolution.targetW28State
          : interpolateSplits(liveEvolution.baselineState, liveEvolution.targetW28State, prog)
      sources.push({
        id: `week-${ms.wNum}`,
        sourceType: ms.sType,
        resultCode: `PLAN-S${ms.wNum}`,
        title: ms.title,
        date: (satSession?.date ?? micro?.endDate ?? athlete.raceDate).toISOString(),
        runSplits: [...interp.runSplits],
        workSplits: { ...interp.workSplits },
        roxSplits: [...interp.roxSplits],
      })
    }
  }

  const targetW28Source =
    sources.find((s) => s.sourceType === 'TARGET_W28') ?? {
      id: 'week-28',
      sourceType: 'TARGET_W28' as const,
      resultCode: 'PLAN-S28',
      title: 'Semana 28 — Alvo Final da Periodização (Prova HYROX)',
      date: athlete.raceDate.toISOString(),
      runSplits: [...liveEvolution.targetW28State.runSplits],
      workSplits: { ...liveEvolution.targetW28State.workSplits },
      roxSplits: [...liveEvolution.targetW28State.roxSplits],
    }

  const active =
    (requestedSourceId ? sources.find((s) => s.id === requestedSourceId) : undefined) ?? sources[0]

  // Somas cronométricas exatas (consistência 100%)
  const totalRunSec = active.runSplits.reduce((a, b) => a + b, 0)
  const totalWorkSec = WORKOUT_STATION_ORDER.reduce((a, code) => a + (active.workSplits[code] ?? 200), 0)
  const totalRoxSec = active.roxSplits.reduce((a, b) => a + b, 0)
  const totalTimeSec = totalRunSec + totalWorkSec + totalRoxSec

  const baselineRunTotalSec = liveEvolution.baselineState.runSplits.reduce((a, b) => a + b, 0)
  const baselineRoxTotalSec = liveEvolution.baselineState.roxSplits.reduce((a, b) => a + b, 0)

  const targetTotalRunSec = targetW28Source.runSplits.reduce((a, b) => a + b, 0)
  const targetTotalWorkSec = WORKOUT_STATION_ORDER.reduce(
    (a, code) => a + (targetW28Source.workSplits[code] ?? 200),
    0,
  )
  const targetTotalRoxSec = targetW28Source.roxSplits.reduce((a, b) => a + b, 0)
  const goalTimeSec = athlete.goalRaceTime ?? targetTotalRunSec + targetTotalWorkSec + targetTotalRoxSec

  const overallPercentile = timeToPercentile(totalTimeSec, divBench.totalTime)
  const runPercentile = timeToPercentile(totalRunSec, divBench.totalRun)
  const workPercentile = timeToPercentile(totalWorkSec, divBench.totalWorkouts)
  const roxPercentile = timeToPercentile(totalRoxSec, divBench.totalRoxzone)

  // 3 Pilares
  const pillars: HyresultPillarBreakdownDTO[] = [
    {
      label: 'Corrida (Runs 1–8)',
      key: 'RUNNING',
      timeSec: totalRunSec,
      timeFormatted: fmtClockHms(totalRunSec),
      sharePct: Math.round((totalRunSec / totalTimeSec) * 1000) / 10,
      percentile: runPercentile,
      rankLabel: percentileRankLabel(runPercentile),
      targetTimeSec: targetTotalRunSec,
      deltaSec: totalRunSec - targetTotalRunSec,
    },
    {
      label: 'Workouts (8 Estações)',
      key: 'WORKOUTS',
      timeSec: totalWorkSec,
      timeFormatted: fmtClockHms(totalWorkSec),
      sharePct: Math.round((totalWorkSec / totalTimeSec) * 1000) / 10,
      percentile: workPercentile,
      rankLabel: percentileRankLabel(workPercentile),
      targetTimeSec: targetTotalWorkSec,
      deltaSec: totalWorkSec - targetTotalWorkSec,
    },
    {
      label: 'Roxzone (Transições)',
      key: 'ROXZONE',
      timeSec: totalRoxSec,
      timeFormatted: fmtClockHms(totalRoxSec),
      sharePct: Math.round((totalRoxSec / totalTimeSec) * 1000) / 10,
      percentile: roxPercentile,
      rankLabel: percentileRankLabel(roxPercentile),
      targetTimeSec: targetTotalRoxSec,
      deltaSec: totalRoxSec - targetTotalRoxSec,
    },
  ]

  // Análise das 8 Estações + Time Savings
  const rawStationPercentiles = WORKOUT_STATION_ORDER.map((code) =>
    timeToPercentile(active.workSplits[code] ?? 240, divBench.stations[code]),
  )
  const sortedPercentiles = [...rawStationPercentiles].sort((a, b) => a - b)
  const medianAthleteStationPercentile = Math.max(
    65,
    sortedPercentiles[Math.floor(sortedPercentiles.length / 2)] ?? 68,
  )

  const stationSplits: HyresultStationSplitDTO[] = WORKOUT_STATION_ORDER.map((code, idx) => {
    const tSec = active.workSplits[code] ?? 240
    const targetSec = targetW28Source.workSplits[code] ?? Math.round(tSec * 0.93)
    const curve = divBench.stations[code]
    const pct = timeToPercentile(tSec, curve)
    const targetPct = timeToPercentile(targetSec, curve)
    const status: HyresultStationSplitDTO['status'] =
      pct >= 80 ? 'ELITE' : pct >= 60 ? 'FORTE' : pct >= 42 ? 'MEDIANO' : 'LIMITADOR'

    const benchmarkTimeAtMedianPct = percentileToTime(medianAthleteStationPercentile, curve)
    const savings = Math.max(0, tSec - Math.min(targetSec, benchmarkTimeAtMedianPct))

    return {
      order: idx + 1,
      stationCode: code,
      label: STATION_META[code].label,
      officialLoadDesc: divSpec.stationLoadDesc[code],
      timeSec: tSec,
      timeFormatted: fmtClock(tSec),
      targetTimeSec: targetSec,
      targetFormatted: fmtClock(targetSec),
      divisionMedianSec: curve.medianSec,
      divisionTop10Sec: curve.top10Sec,
      percentile: pct,
      targetPercentile: targetPct,
      status,
      timeSavingsPotentialSec: savings,
    }
  })

  const sortedByPct = [...stationSplits].sort((a, b) => b.percentile - a.percentile)
  const strongestStation = sortedByPct[0]?.label ?? 'SkiErg'
  const weakestStation = sortedByPct[sortedByPct.length - 1]?.label ?? 'Wall Balls'

  // Radar de 10 eixos com 3 camadas (Diagnóstico Inicial S1 vs Fonte Ativa/Ao Vivo vs Meta S28)
  const baselineRunPct = timeToPercentile(baselineRunTotalSec, divBench.totalRun)
  const baselineRoxPct = timeToPercentile(baselineRoxTotalSec, divBench.totalRoxzone)
  const targetRunPct = timeToPercentile(targetTotalRunSec, divBench.totalRun)
  const targetRoxPct = timeToPercentile(targetTotalRoxSec, divBench.totalRoxzone)

  const radarData = [
    {
      subject: 'Corrida (8km)',
      fullMark: 100,
      baselinePercentile: baselineRunPct,
      athletePercentile: runPercentile,
      targetPercentile: targetRunPct,
    },
    ...stationSplits.map((st) => {
      const code = st.stationCode as StationCode
      const baseStSec = liveEvolution.baselineState.workSplits[code] ?? st.timeSec
      const baseStPct = timeToPercentile(baseStSec, divBench.stations[code])
      return {
        subject: st.label
          .replace('Burpee Broad Jumps', 'BBJ')
          .replace("Farmer's Carry", 'Farmers')
          .replace('Sandbag Lunges', 'Lunges'),
        fullMark: 100,
        baselinePercentile: baseStPct,
        athletePercentile: st.percentile,
        targetPercentile: st.targetPercentile,
      }
    }),
    {
      subject: 'Roxzone',
      fullMark: 100,
      baselinePercentile: baselineRoxPct,
      athletePercentile: roxPercentile,
      targetPercentile: targetRoxPct,
    },
  ]

  // Análise de Pacing & Fade Index das 8 Corridas
  const avgPaceSec = Math.round(totalRunSec / 8)
  const run1Sec = active.runSplits[0] ?? avgPaceSec
  const first2Avg = ((active.runSplits[0] ?? avgPaceSec) + (active.runSplits[1] ?? avgPaceSec)) / 2
  const last3Avg =
    ((active.runSplits[5] ?? avgPaceSec) +
      (active.runSplits[6] ?? avgPaceSec) +
      (active.runSplits[7] ?? avgPaceSec)) /
    3
  const fadeIndexPct = Math.round(((last3Avg - first2Avg) / Math.max(1, first2Avg)) * 1000) / 10

  const pacingStrategyClassification: HyresultAnalysisDTO['runAnalytics']['pacingStrategyClassification'] =
    fadeIndexPct <= 3.5 ? 'EVEN_PACING' : fadeIndexPct <= 7.5 ? 'CONTROLLED_FADE' : 'FLY_AND_DIE'

  const runSplitsDTO: HyresultRunSplitDTO[] = active.runSplits.map((sec, i) => ({
    runNumber: i + 1,
    label: `Run ${i + 1}`,
    precedingStationLabel: PRECEDING_STATION_FOR_RUN[i + 1] ?? '',
    timeSec: sec,
    timeFormatted: fmtClock(sec),
    targetTimeSec: targetW28Source.runSplits[i] ?? cal.runRacePaceSec,
    paceRatioVsRun1: Math.round((sec / Math.max(1, run1Sec)) * 100) / 100,
    deviationFromMeanSec: sec - avgPaceSec,
    isCompromisedCritical: i + 1 === 3 || i + 1 === 8,
  }))

  // Raio-X das 8 Transições da Roxzone
  const roxSplitsDTO: HyresultRoxzoneSplitDTO[] = active.roxSplits.map((sec, i) => {
    const stCode = WORKOUT_STATION_ORDER[i]
    const targetRox = targetW28Source.roxSplits[i] ?? 36
    return {
      transitionNumber: i + 1,
      stationLabel: `Rox ${i + 1} · ${STATION_META[stCode].label}`,
      inOutSec: sec,
      inOutFormatted: `${sec}s`,
      targetSec: targetRox,
      efficiencyStatus: sec <= 38 ? 'OTIMA' : sec <= 45 ? 'NORMAL' : 'LENTA',
    }
  })

  // Arquétipo do Atleta segundo o perfil HYRESULT
  const athleteProfileArchetype =
    runPercentile >= workPercentile + 8
      ? 'Motor Aeróbio Dominante / Gargalo de Força Específica'
      : workPercentile >= runPercentile + 8
        ? 'Potência em Estações / Déficit de Sustentação de Corrida'
        : 'Atleta Híbrido Equilibrado (Padrão HYROX)'

  const currentPhaseCode = (liveEvolution.progression.currentPhaseCode ?? 'DIAG') as PhaseCode
  const currentPhaseName = PHASE_META[currentPhaseCode]?.label ?? 'Diagnóstico'

  const weakestTwo = [...stationSplits].sort((a, b) => a.percentile - b.percentile).slice(0, 2)
  const roxSavings = Math.max(0, totalRoxSec - targetTotalRoxSec)
  const topSavingsTotal =
    weakestTwo.reduce((acc, s) => acc + s.timeSavingsPotentialSec, 0) + roxSavings

  const recommendations: HyresultPeriodizationPrescriptionDTO['recommendations'] = [
    {
      area: 'RUNNING_PACING',
      title: `Controle de Fade Index (${fadeIndexPct > 0 ? `+${fadeIndexPct}%` : `${fadeIndexPct}%`}) & Corrida Comprometida`,
      finding: `Run 3 (pós-Sled Push: ${fmtClock(active.runSplits[2] ?? avgPaceSec)}) e Run 8 (pós-Lunges: ${fmtClock(active.runSplits[7] ?? avgPaceSec)}) concentram a maior perda de pace sobre o km inicial (${fmtClock(run1Sec)}).`,
      periodizationAction:
        'Priorizar blocos de limiar Z3 ao final das corridas longas (GPP2/SPP1) e os Bricks 1 km + Estação (SPP1/SPP2) para ensinar o corpo a limpar lactato correndo em Z3 logo após sobrecarga de quadríceps.',
      keyWorkoutsToFocus: 'Quinta (Longa Z2→Z3) e Sábado (Brick Race-Pace 1 km + Estação)',
      targetPhaseCode: 'SPP1',
    },
    {
      area: 'STATION_STRENGTH',
      title: `Elevação de Percentil em ${weakestTwo[0]?.label ?? 'Sled Pull'} (P${weakestTwo[0]?.percentile ?? 45}) e ${weakestTwo[1]?.label ?? 'Wall Balls'} (P${weakestTwo[1]?.percentile ?? 48})`,
      finding: `As estações mais deficitárias frente à divisão ${DIVISION_META[division].short} têm potencial de economia direta de ${fmtClock((weakestTwo[0]?.timeSavingsPotentialSec ?? 25) + (weakestTwo[1]?.timeSavingsPotentialSec ?? 25))}.`,
      periodizationAction:
        'Em GPP2, sustentar progressão de força máxima (4–6 RM no Terra/Agachamento/Hip Thrust) e Sled Init. Em SPP2, executar Wall Balls sob pré-fadiga ventilatória (séries de 25 reps ininterruptas).',
      keyWorkoutsToFocus: 'Segunda (Força A Básicos) e Quarta (Híbrido Específico Sleds + Wall Balls)',
      targetPhaseCode: 'SPP2',
    },
    {
      area: 'ROXZONE_TRANSITION',
      title: `Disciplina de Transição na Roxzone (${fmtClock(totalRoxSec)} · ${Math.round((totalRoxSec / totalTimeSec) * 1000) / 10}% da prova)`,
      finding: `Média de ${Math.round(totalRoxSec / 8)}s por transição. Reduzir as passagens lentas (>45s) para o padrão de 36–38s gera ganho líquido de ${fmtClock(roxSavings)} sem custo metabólico extra.`,
      periodizationAction:
        'Nas simulações das Semanas 21, 24 e 26, proibir caminhada nos primeiros 15 metros após sair da estação: iniciar em trote imediato de recuperação ativa (Z2) até estabilizar a ventilação.',
      keyWorkoutsToFocus: 'Sábados das Semanas 21, 24 e 26 (Simulações e Ensaio de Transições)',
      targetPhaseCode: 'COMP',
    },
  ]

  return {
    athleteId: athlete.id,
    athleteName: athlete.name,
    division,
    divisionLabel: DIVISION_META[division].label,
    ageGroup: athlete.ageGroup,
    activeSource: {
      id: active.id,
      sourceType: active.sourceType,
      resultCode: active.resultCode,
      title: active.title,
      date: active.date,
    },
    availableSources: sources.map((s) => {
      const tRun = s.runSplits.reduce((a, b) => a + b, 0)
      const tWork = WORKOUT_STATION_ORDER.reduce((a, c) => a + (s.workSplits[c] ?? 200), 0)
      const tRox = s.roxSplits.reduce((a, b) => a + b, 0)
      return {
        id: s.id,
        sourceType: s.sourceType,
        resultCode: s.resultCode,
        title: s.title,
        date: s.date,
        totalTimeFormatted: fmtClockHms(tRun + tWork + tRox),
      }
    }),
    overall: {
      totalTimeSec,
      totalTimeFormatted: fmtClockHms(totalTimeSec),
      goalTimeSec,
      goalTimeFormatted: fmtClockHms(goalTimeSec),
      deltaVsGoalSec: totalTimeSec - goalTimeSec,
      overallPercentile,
      overallRankBadge: percentileRankLabel(overallPercentile),
      athleteProfileArchetype,
    },
    pillars,
    radarData,
    runAnalytics: {
      avgPaceSec,
      avgPaceFormatted: fmtPace(avgPaceSec),
      bestRunSec: Math.min(...active.runSplits),
      worstRunSec: Math.max(...active.runSplits),
      fadeIndexPct,
      pacingStrategyClassification,
      postSledPushDropSec: (active.runSplits[2] ?? avgPaceSec) - run1Sec,
      postLungesDropSec: (active.runSplits[7] ?? avgPaceSec) - run1Sec,
      splits: runSplitsDTO,
    },
    stationAnalytics: {
      strongestStation,
      weakestStation,
      splits: stationSplits,
    },
    roxzoneAnalytics: {
      totalRoxzoneSec: totalRoxSec,
      totalRoxzoneFormatted: fmtClock(totalRoxSec),
      avgPerTransitionSec: Math.round(totalRoxSec / 8),
      splits: roxSplitsDTO,
    },
    prescription: {
      currentPhaseCode,
      currentPhaseName,
      primaryLimiter: weakestTwo[0]?.label ?? 'Sled Pull',
      secondaryLimiter: weakestTwo[1]?.label ?? 'Wall Balls',
      timeSavingsTotalSec: topSavingsTotal,
      timeSavingsFormatted: fmtClock(topSavingsTotal),
      recommendations,
    },
    progression: liveEvolution.progression,
    weeklySimulationCurve: liveEvolution.weeklySimulationCurve,
    sessionEvolution: liveEvolution.sessionEvolution,
  }
}
