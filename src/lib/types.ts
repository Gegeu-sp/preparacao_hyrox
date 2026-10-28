// Tipos compartilhados entre API (server) e componentes (client)

export type HyroxDivision = 'OPEN_M' | 'OPEN_F' | 'PRO_M' | 'PRO_F'

export interface DynamicZoneDTO {
  zone: string
  name: string
  pctHrMax: string
  hrBpm: string
  pace: string
  purpose: string
}

export interface AthleteDTO {
  id: string
  name: string
  gender: 'M' | 'F'
  division: HyroxDivision
  ageGroup: string
  birthDate: string
  heightCm: number
  weightKg: number
  bodyFatPct: number
  raceName: string
  raceDate: string
  restingHr: number | null
  maxHr: number | null
  vo2max: number | null
  vdot: number | null
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
  notes: string | null
  age: number
  zones: DynamicZoneDTO[]
}

export interface AthleteSummaryDTO {
  id: string
  name: string
  gender: 'M' | 'F'
  division: HyroxDivision
  ageGroup: string
  birthDate: string
  heightCm: number
  weightKg: number
  bodyFatPct: number
  raceName: string
  raceDate: string
  restingHr: number | null
  maxHr: number | null
  vo2max: number | null
  vdot: number | null
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
  notes: string | null
}

export interface ExerciseDTO {
  id: string
  order: number
  name: string
  category: string
  setsPrescribed: number | null
  repsPrescribed: string | null
  loadPrescribedKg: number | null
  tempo: string | null
  rest: string | null
  setsActual: number | null
  repsActual: string | null
  loadActualKg: number | null
  notes: string | null
}

export interface StationDTO {
  id: string
  order: number
  station: string
  label: string
  distanceM: number | null
  reps: number | null
  loadKg: number | null
  splitPrescribedSec: number | null
  splitActualSec: number | null
  hrAvg: number | null
  notes: string | null
}

export interface SessionDTO {
  id: string
  microcycleId: string
  weekNumber: number
  date: string
  dayIndex: number
  type: string
  title: string
  description: string
  hrZone: string | null
  paceTarget: string | null
  durationPrescribedMin: number
  durationActualMin: number | null
  kmPrescribed: number | null
  kmActual: number | null
  tonnagePrescribedKg: number | null
  tonnageActualKg: number | null
  rpePrescribed: number | null
  rpeActual: number | null
  loadPrescribed: number | null
  loadActual: number | null
  status: string
  notes: string | null
  coachNote: string | null
  exercises: ExerciseDTO[]
  stations: StationDTO[]
}

export interface WeekSummaryDTO {
  id: string
  weekNumber: number
  startDate: string
  endDate: string
  type: string
  note: string | null
  targetKm: number
  targetTonnageKg: number
  targetSessions: number
  phaseCode: string
  mesoName: string
  kmP: number
  kmA: number
  tonnageP: number
  tonnageA: number
  loadP: number
  loadA: number
  sessionsDone: number
  sessionsTotal: number
  adherencePct: number | null
  isCurrent: boolean
  isPast: boolean
  isFuture: boolean
}

export interface MesocycleDTO {
  id: string
  code: string
  name: string
  order: number
  startDate: string
  endDate: string
  goal: string
  focus: string
  volumeTargetKm: number
  intensityNote: string
  keyWorkouts: string
  weeks: WeekSummaryDTO[]
}

export interface PlanResponse {
  athlete: AthleteDTO
  race: { name: string; date: string; daysUntil: number }
  mesocycles: MesocycleDTO[]
  weeks: WeekSummaryDTO[]
  currentWeek: WeekSummaryDTO | null
}

export interface WeekDetailResponse {
  week: WeekSummaryDTO
  sessions: SessionDTO[]
}

export interface WeeklySeriesPoint {
  weekNumber: number
  label: string
  startDate: string
  phaseCode: string
  kmP: number
  kmA: number | null
  tonnageP: number
  tonnageA: number | null
  loadP: number
  loadA: number | null
  adherencePct: number | null
  isFuture: boolean
}

export interface CurvePoint {
  weekNumber: number
  label: string
  load: number
  fitness: number
  fatigue: number
  form: number
  isFuture: boolean
}

export interface WellnessDTO {
  date: string
  sleepHours: number | null
  sleepQuality: number | null
  soreness: number | null
  fatigue: number | null
  stress: number | null
  motivation: number | null
  restingHr: number | null
  hrv: number | null
  weightKg: number | null
  notes: string | null
}

export interface DashboardResponse {
  kpis: {
    daysUntilRace: number
    weekNumber: number
    phaseCode: string
    completedSessionsTotal: number
    plannedSessionsTotal: number
    adherenceWeekPct: number | null
    adherenceOverallPct: number | null
    kmWeekP: number
    kmWeekA: number
    tonnageWeekP: number
    tonnageWeekA: number
    acuteLoad: number
    chronicLoad: number
    acwr: number | null
    fitness: number
    fatigue: number
    form: number
    monotonicity: number | null
    strain: number | null
  }
  weekly: WeeklySeriesPoint[]
  curve: CurvePoint[]
  modalitySplit: { type: string; load: number; pct: number }[]
  wellness: WellnessDTO[]
  alerts: string[]
}

export interface SessionPatchPayload {
  status?: string
  durationPrescribedMin?: number
  durationActualMin?: number | null
  kmPrescribed?: number | null
  kmActual?: number | null
  tonnagePrescribedKg?: number | null
  tonnageActualKg?: number | null
  rpePrescribed?: number | null
  rpeActual?: number | null
  paceTarget?: string | null
  hrZone?: string | null
  notes?: string | null
  coachNote?: string | null
  exercises?: {
    id: string
    setsPrescribed?: number | null
    repsPrescribed?: string | null
    loadPrescribedKg?: number | null
    tempo?: string | null
    rest?: string | null
    setsActual?: number | null
    repsActual?: string | null
    loadActualKg?: number | null
  }[]
  stations?: {
    id: string
    splitPrescribedSec?: number | null
    splitActualSec?: number | null
    hrAvg?: number | null
    notes?: string | null
  }[]
}

// ---------- Preditor de Tempo de Prova HYROX ----------

export type SegmentType = 'RUN' | 'STATION' | 'ROXZONE'

export interface SegmentPredictionSplitDTO {
  order: number
  segmentKey: string
  type: SegmentType
  name: string
  distanceM: number | null
  reps: number | null
  predictedSec: number
  predictedFormatted: string
  targetSec: number | null
  targetFormatted: string | null
  paceMinKmFormatted: string | null
  fatigueFactorApplied: number
  isCritical: boolean
  historicalBestSec: number | null
}

export interface SessionEvolutionPointDTO {
  index: number
  sessionId: string | null
  weekId: string | null
  date: string
  dateFormatted: string
  weekNumber: number
  phaseCode: string
  sessionType: string
  sessionTitle: string
  stimulusSummary: string
  primaryFocus: 'BASELINE' | 'RUNNING' | 'STRENGTH' | 'STATIONS' | 'RECOVERY'
  executionQualityPct: number
  totalRunSec: number
  totalWorkSec: number
  totalRoxSec: number
  totalTimeSec: number
  totalTimeFormatted: string
  deltaFromPrevSec: number
  cumulativeGainSec: number
  overallPercentile: number
  fadeIndexPct: number
}

export interface PeriodizationWeekSimulationPointDTO {
  weekId: string
  weekNumber: number
  label: string
  phaseCode: string
  weekType: string
  isCurrent: boolean
  isExecuted: boolean
  sessionsDone: number
  sessionsTotal: number
  adherencePct: number | null
  plannedTotalSec: number
  plannedFormatted: string
  simulatedTotalSec: number | null
  simulatedFormatted: string | null
  projectedTotalSec: number
  projectedFormatted: string
  plannedRunSec: number
  plannedWorkSec: number
  plannedRoxSec: number
  activeRunSec: number
  activeWorkSec: number
  activeRoxSec: number
}

export interface PeriodizationProgressionSummaryDTO {
  currentWeekNumber: number
  currentPhaseCode: string
  currentPhaseName: string
  completedSessionsCount: number
  totalPlannedSessionsToDate: number
  adherenceToDatePct: number
  baselineTotalSec: number
  baselineFormatted: string
  currentSimulatedTotalSec: number
  currentSimulatedFormatted: string
  expectedForCurrentWeekSec: number
  expectedForCurrentWeekFormatted: string
  targetWeek28TotalSec: number
  targetWeek28Formatted: string
  gainAchievedSec: number
  gainAchievedFormatted: string
  remainingToGoalSec: number
  remainingToGoalFormatted: string
  goalProgressPct: number
  deltaVsExpectedWeekSec: number
  periodizationStatus: 'ADIANTADO' | 'NO_ALVO' | 'ATRASADO'
  periodizationStatusLabel: string
}

export interface RacePredictionDTO {
  generatedAt: string
  athleteName: string
  targetGoalTimeSec: number
  targetGoalTimeFormatted: string
  realisticTotalSec: number
  realisticFormatted: string
  optimisticTotalSec: number
  optimisticFormatted: string
  conservativeTotalSec: number
  conservativeFormatted: string
  totalRunSec: number
  totalRunFormatted: string
  totalStationsSec: number
  totalStationsFormatted: string
  roxzoneSec: number
  roxzoneFormatted: string
  deltaSec: number
  deltaFormatted: string
  deltaPct: number
  isWithinGoal: boolean
  confidenceLevel: 'ALTA' | 'MEDIA' | 'ESTIMATIVA_INICIAL'
  simulationCountUsed: number
  criticalStations: string[]
  warnings: string[]
  segments: SegmentPredictionSplitDTO[]
  progression: PeriodizationProgressionSummaryDTO
  weeklySimulationCurve: PeriodizationWeekSimulationPointDTO[]
  sessionEvolution: SessionEvolutionPointDTO[]
}

export interface PredictionScenarioInput {
  athleteId?: string
  basePaceAdjustmentSec?: number
  stationAdjustments?: Record<string, number>
  roxzoneAdjustmentSec?: number
  customGoalTimeSec?: number
}

// ---------- Análise de Performance Padrão HYRESULT ----------

export type HyresultSourceType =
  | 'LIVE_EVOLUTION'
  | 'HYRESULT_OFFICIAL'
  | 'PERIODIZATION_MILESTONE'
  | 'SIMULATION_W21'
  | 'SIMULATION_W24'
  | 'SIMULATION_W26'
  | 'TARGET_W28'

export interface HyresultPillarBreakdownDTO {
  label: 'Corrida (Runs 1–8)' | 'Workouts (8 Estações)' | 'Roxzone (Transições)'
  key: 'RUNNING' | 'WORKOUTS' | 'ROXZONE'
  timeSec: number
  timeFormatted: string
  sharePct: number
  percentile: number // 1..99 (ex.: 88 = Top 12%)
  rankLabel: string
  targetTimeSec: number
  deltaSec: number
}

export interface HyresultStationSplitDTO {
  order: number
  stationCode: string
  label: string
  officialLoadDesc: string
  timeSec: number
  timeFormatted: string
  targetTimeSec: number
  targetFormatted: string
  divisionMedianSec: number
  divisionTop10Sec: number
  percentile: number // 1..99
  targetPercentile: number
  status: 'ELITE' | 'FORTE' | 'MEDIANO' | 'LIMITADOR'
  timeSavingsPotentialSec: number
}

export interface HyresultRunSplitDTO {
  runNumber: number // 1..8
  label: string
  precedingStationLabel: string
  timeSec: number
  timeFormatted: string
  targetTimeSec: number
  paceRatioVsRun1: number
  deviationFromMeanSec: number
  isCompromisedCritical: boolean
}

export interface HyresultRoxzoneSplitDTO {
  transitionNumber: number // 1..8
  stationLabel: string
  inOutSec: number
  inOutFormatted: string
  targetSec: number
  efficiencyStatus: 'OTIMA' | 'NORMAL' | 'LENTA'
}

export interface HyresultPeriodizationPrescriptionDTO {
  currentPhaseCode: string
  currentPhaseName: string
  primaryLimiter: string
  secondaryLimiter: string
  timeSavingsTotalSec: number
  timeSavingsFormatted: string
  recommendations: {
    area: 'RUNNING_PACING' | 'STATION_STRENGTH' | 'STATION_ENGINE' | 'ROXZONE_TRANSITION'
    title: string
    finding: string
    periodizationAction: string
    keyWorkoutsToFocus: string
    targetPhaseCode: string
  }[]
}

export interface HyresultAnalysisDTO {
  athleteId: string
  athleteName: string
  division: HyroxDivision
  divisionLabel: string
  ageGroup: string
  activeSource: {
    id: string
    sourceType: HyresultSourceType
    resultCode: string
    title: string
    date: string
  }
  availableSources: {
    id: string
    sourceType: HyresultSourceType
    resultCode: string
    title: string
    date: string
    totalTimeFormatted: string
  }[]
  overall: {
    totalTimeSec: number
    totalTimeFormatted: string
    goalTimeSec: number
    goalTimeFormatted: string
    deltaVsGoalSec: number
    overallPercentile: number
    overallRankBadge: string
    athleteProfileArchetype: string
  }
  pillars: HyresultPillarBreakdownDTO[]
  radarData: {
    subject: string
    fullMark: number
    baselinePercentile: number
    athletePercentile: number
    targetPercentile: number
  }[]
  runAnalytics: {
    avgPaceSec: number
    avgPaceFormatted: string
    bestRunSec: number
    worstRunSec: number
    fadeIndexPct: number
    pacingStrategyClassification: 'EVEN_PACING' | 'CONTROLLED_FADE' | 'FLY_AND_DIE'
    postSledPushDropSec: number
    postLungesDropSec: number
    splits: HyresultRunSplitDTO[]
  }
  stationAnalytics: {
    strongestStation: string
    weakestStation: string
    splits: HyresultStationSplitDTO[]
  }
  roxzoneAnalytics: {
    totalRoxzoneSec: number
    totalRoxzoneFormatted: string
    avgPerTransitionSec: number
    splits: HyresultRoxzoneSplitDTO[]
  }
  prescription: HyresultPeriodizationPrescriptionDTO
  progression: PeriodizationProgressionSummaryDTO
  weeklySimulationCurve: PeriodizationWeekSimulationPointDTO[]
  sessionEvolution: SessionEvolutionPointDTO[]
}
