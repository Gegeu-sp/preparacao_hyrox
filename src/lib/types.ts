// Tipos compartilhados entre API (server) e componentes (client)

export interface AthleteDTO {
  name: string
  birthDate: string
  heightCm: number
  weightKg: number
  bodyFatPct: number
  restingHr: number | null
  maxHr: number | null
  vo2max: number | null
  vdot: number | null
  vt1SpeedKmh: number | null
  vt2SpeedKmh: number | null
  fiveKmPbSec: number | null
  goalRaceTime: number | null
  notes: string | null
  age: number
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
}

export interface PredictionScenarioInput {
  basePaceAdjustmentSec?: number
  stationAdjustments?: Record<string, number>
  roxzoneAdjustmentSec?: number
  customGoalTimeSec?: number
}

