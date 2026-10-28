// Analytics server-side: resumos semanais, sRPE (Foster), ACWR, Fitness-Fadiga (EWMA),
// monotonicidade/strain, aderência e distribuição por modalidade — 100% sincronizado com os treinos confirmados.
import { db } from '@/lib/db'
import { dateKey } from '@/lib/format'
import type {
  DashboardResponse,
  WeekSummaryDTO,
  WellnessDTO,
} from '@/lib/types'

const DAY = 86_400_000
const DONE = ['CONCLUIDO', 'PARCIAL', 'AJUSTADO']

export function todayUtc(): Date {
  const n = new Date()
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()))
}

export function statusWeight(status: string): number {
  if (status === 'CONCLUIDO') return 1
  if (status === 'PARCIAL' || status === 'AJUSTADO') return 0.6
  return 0
}

type SessionRow = {
  date: Date
  dayIndex: number
  type: string
  status: string
  kmPrescribed: number | null
  kmActual: number | null
  tonnagePrescribedKg: number | null
  tonnageActualKg: number | null
  loadPrescribed: number | null
  loadActual: number | null
  durationPrescribedMin: number
  durationActualMin: number | null
}

type WeekRow = {
  id: string
  weekNumber: number
  startDate: Date
  endDate: Date
  type: string
  note: string | null
  targetKm: number
  targetTonnageKg: number
  targetSessions: number
  mesocycleId: string
  mesocycle: { code: string; name: string; athleteId: string }
  sessions: SessionRow[]
}

export async function loadWeeks(athleteId?: string): Promise<WeekRow[]> {
  return (await db.microcycle.findMany({
    where: athleteId ? { mesocycle: { athleteId } } : undefined,
    orderBy: { weekNumber: 'asc' },
    include: { mesocycle: true, sessions: { orderBy: { dayIndex: 'asc' } } },
  })) as unknown as WeekRow[]
}

// ---------------------------------------------------------------- resumo semanal
export function weekSummary(w: WeekRow, today: Date): WeekSummaryDTO {
  const tKey = dateKey(today)
  const kmP = w.sessions.reduce((a, s) => a + (s.kmPrescribed ?? 0), 0)
  const kmA = w.sessions.reduce(
    (a, s) => (DONE.includes(s.status) ? a + (s.kmActual ?? s.kmPrescribed ?? 0) : a),
    0,
  )
  const tonP = w.sessions.reduce((a, s) => a + (s.tonnagePrescribedKg ?? 0), 0)
  const tonA = w.sessions.reduce(
    (a, s) => (DONE.includes(s.status) ? a + (s.tonnageActualKg ?? s.tonnagePrescribedKg ?? 0) : a),
    0,
  )
  const loadP = w.sessions.reduce((a, s) => a + (s.loadPrescribed ?? 0), 0)
  const loadA = w.sessions.reduce(
    (a, s) => (DONE.includes(s.status) ? a + (s.loadActual ?? s.loadPrescribed ?? 0) : a),
    0,
  )
  const done = w.sessions.filter((s) => DONE.includes(s.status)).length

  const isCurrent = dateKey(w.startDate) <= tKey && tKey <= dateKey(w.endDate)
  const isPast = dateKey(w.endDate) < tKey
  const isFuture = dateKey(w.startDate) > tKey && done === 0

  let adherencePct: number | null = null
  if (done > 0 || isPast || isCurrent) {
    adherencePct = Math.round(
      (w.sessions.reduce((a, s) => a + statusWeight(s.status), 0) / Math.max(1, w.targetSessions)) *
        100,
    )
  }

  return {
    id: w.id,
    weekNumber: w.weekNumber,
    startDate: w.startDate.toISOString(),
    endDate: w.endDate.toISOString(),
    type: w.type,
    note: w.note,
    targetKm: Math.round(w.targetKm * 10) / 10,
    targetTonnageKg: w.targetTonnageKg,
    targetSessions: w.targetSessions,
    phaseCode: w.mesocycle.code,
    mesoName: w.mesocycle.name,
    kmP: Math.round(kmP * 10) / 10,
    kmA: Math.round(kmA * 10) / 10,
    tonnageP: Math.round(tonP),
    tonnageA: Math.round(tonA),
    loadP,
    loadA,
    sessionsDone: done,
    sessionsTotal: w.sessions.length,
    adherencePct,
    isCurrent,
    isPast,
    isFuture,
  }
}

// ---------------------------------------------------------------- dashboard
export async function computeDashboard(requestedAthleteId?: string): Promise<DashboardResponse> {
  const today = todayUtc()
  const tKey = dateKey(today)

  const athlete = requestedAthleteId
    ? await db.athlete.findUnique({ where: { id: requestedAthleteId } })
    : await db.athlete.findFirst({ orderBy: { createdAt: 'asc' } })

  const activeAthleteId = athlete?.id

  const [weeks, wellnessRows] = await Promise.all([
    loadWeeks(activeAthleteId),
    db.wellness.findMany({
      where: activeAthleteId ? { athleteId: activeAthleteId } : undefined,
      orderBy: { date: 'desc' },
      take: 14,
    }),
  ])

  const sessions = weeks.flatMap((w) => w.sessions)
  const completedSessionsTotal = sessions.filter((s) => DONE.includes(s.status)).length
  const plannedSessionsTotal = sessions.length

  const planStart = weeks[0]?.startDate ?? today
  const planEnd = weeks[weeks.length - 1]?.endDate ?? today
  const nDays = Math.max(1, Math.round((planEnd.getTime() - planStart.getTime()) / DAY) + 1)

  // ---- Série diária estritamente realizada vs prescrita (sRPE)
  const dailyA = new Array<number>(nDays).fill(0)
  const dailyP = new Array<number>(nDays).fill(0)
  const idxOf = (d: Date) => Math.round((d.getTime() - planStart.getTime()) / DAY)

  let lastConfirmedDayIdx = -1
  for (const s of sessions) {
    const i = idxOf(s.date)
    if (i < 0 || i >= nDays) continue
    dailyP[i] += s.loadPrescribed ?? 0
    if (DONE.includes(s.status)) {
      dailyA[i] += s.loadActual ?? s.loadPrescribed ?? 0
      if (i > lastConfirmedDayIdx) lastConfirmedDayIdx = i
    }
  }

  const calIdx = Math.min(nDays - 1, Math.max(0, idxOf(today)))
  const tIdx = Math.max(calIdx, lastConfirmedDayIdx >= 0 ? lastConfirmedDayIdx : 0)

  // EWMA Fitness (42d) / Fadiga (7d) calculada sobre a carga realizada até tIdx e projetada após tIdx
  const blendedForCurve = dailyA.map((a, i) => (i <= tIdx ? a : dailyP[i]))
  const L42 = 2 / 43
  const L7 = 2 / 8
  const fitness: number[] = []
  const fatigue: number[] = []
  let f = 0
  let ft = 0
  for (let i = 0; i < nDays; i++) {
    f += L42 * (blendedForCurve[i] - f)
    ft += L7 * (blendedForCurve[i] - ft)
    fitness.push(Math.round(f * 10) / 10)
    fatigue.push(Math.round(ft * 10) / 10)
  }
  const form = fitness.map((v, i) => Math.round((v - fatigue[i]) * 10) / 10)

  // ---- Semanal
  const weekly = weeks.map((w) => {
    const s = weekSummary(w, today)
    const i0 = idxOf(w.startDate)
    const i1 = Math.min(nDays - 1, idxOf(w.endDate))
    const load = s.isFuture ? s.loadP : s.loadA
    return { s, i0, i1, load }
  })

  // ---- KPIs estritamente sobre o que foi confirmado/realizado até tIdx
  const acute = dailyA.slice(Math.max(0, tIdx - 6), tIdx + 1).reduce((a, b) => a + b, 0)
  const chronicWin = dailyA.slice(Math.max(0, tIdx - 27), tIdx + 1)
  const chronic = chronicWin.length ? chronicWin.reduce((a, b) => a + b, 0) / chronicWin.length : 0
  const acwr = chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : null

  // Determina a semana ativa (semana atual do calendário ou última semana com treinos confirmados)
  const executedWeeks = weekly.filter((w) => w.s.sessionsDone > 0)
  const highestExecutedWeek =
    executedWeeks.length > 0 ? executedWeeks[executedWeeks.length - 1].s : null
  const calendarWeek = weekly.find((x) => x.s.isCurrent)?.s ?? weekly[0]?.s ?? null
  const currentWeekSum =
    highestExecutedWeek &&
    calendarWeek &&
    highestExecutedWeek.weekNumber >= calendarWeek.weekNumber
      ? highestExecutedWeek
      : (calendarWeek ?? highestExecutedWeek)

  const elapsedOrActiveSessions = sessions.filter(
    (s) => dateKey(s.date) <= tKey || DONE.includes(s.status),
  )
  const adherenceOverall =
    elapsedOrActiveSessions.length > 0
      ? Math.round(
          (elapsedOrActiveSessions.reduce((a, s) => a + statusWeight(s.status), 0) /
            elapsedOrActiveSessions.length) *
            100,
        )
      : 0

  // Monotonicidade/strain da última semana com sessões realizadas (Foster)
  const lastDone = [...weeks]
    .reverse()
    .find((w) => w.sessions.some((s) => DONE.includes(s.status)))
  let monotonicity: number | null = null
  let strain: number | null = null
  if (lastDone) {
    const i0 = idxOf(lastDone.startDate)
    const i1 = idxOf(lastDone.endDate)
    const d = dailyA.slice(i0, i1 + 1)
    const mean = d.reduce((a, b) => a + b, 0) / d.length
    const sd = Math.sqrt(d.reduce((a, b) => a + (b - mean) ** 2, 0) / d.length)
    if (sd > 0) {
      monotonicity = Math.round((mean / sd) * 100) / 100
      strain = Math.round(monotonicity * mean * d.length)
    }
  }

  // ---- Distribuição por modalidade: estritamente sobre sessões CONFIRMADAS (sem misturar PLANEJADO)
  const modMap = new Map<string, number>()
  for (const s of sessions) {
    if (!DONE.includes(s.status)) continue
    const load = s.loadActual ?? s.loadPrescribed ?? 0
    modMap.set(s.type, (modMap.get(s.type) ?? 0) + load)
  }
  const modTotal = [...modMap.values()].reduce((a, b) => a + b, 0)
  const modalitySplit = [...modMap.entries()]
    .map(([type, load]) => ({
      type,
      load: Math.round(load),
      pct: modTotal > 0 ? Math.round((load / modTotal) * 100) : 0,
    }))
    .sort((a, b) => b.load - a.load)

  // ---- Alertas
  const alerts: string[] = []
  if (completedSessionsTotal === 0) {
    alerts.push(
      'Nenhum treino confirmado ainda no ciclo (0/196). Vá ao Diário de Treino e confirme as sessões realizadas para iniciar a simulação ao vivo.',
    )
  }
  const hasHistory = completedSessionsTotal >= 7
  if (hasHistory && acwr != null && acwr > 1.3) {
    alerts.push(
      `Carga aguda elevada: ACWR ${acwr.toFixed(2)} (janela de segurança 0,8–1,3). Priorize recuperação.`,
    )
  }
  if (hasHistory && acwr != null && acwr < 0.8 && chronic > 0) {
    alerts.push(
      `Carga aguda baixa: ACWR ${acwr.toFixed(2)} — risco de perda de forma se prolongado (destreino).`,
    )
  }
  const lastWell = wellnessRows[0]
  if (lastWell) {
    if ((lastWell.soreness ?? 0) >= 4) {
      alerts.push(
        `Dor muscular elevada (${lastWell.soreness}/5) em ${dateKey(lastWell.date)} — avalie trocar qualidade por volume leve.`,
      )
    }
    if ((lastWell.fatigue ?? 0) >= 4) {
      alerts.push(
        `Fadiga percebida alta (${lastWell.fatigue}/5) — considere reduzir a sessão-chave da semana.`,
      )
    }
    if ((lastWell.hrv ?? 99) < 45) {
      alerts.push(
        `HRV baixo (${lastWell.hrv} ms) — sinal de estresse autonômico; ajuste a intensidade do dia.`,
      )
    }
  }

  return {
    kpis: {
      daysUntilRace: athlete ? Math.round((athlete.raceDate.getTime() - today.getTime()) / DAY) : 0,
      weekNumber: currentWeekSum?.weekNumber ?? 1,
      phaseCode: currentWeekSum?.phaseCode ?? 'DIAG',
      completedSessionsTotal,
      plannedSessionsTotal,
      adherenceWeekPct: currentWeekSum?.adherencePct ?? 0,
      adherenceOverallPct: adherenceOverall,
      kmWeekP: currentWeekSum?.kmP ?? 0,
      kmWeekA: currentWeekSum?.kmA ?? 0,
      tonnageWeekP: currentWeekSum?.tonnageP ?? 0,
      tonnageWeekA: currentWeekSum?.tonnageA ?? 0,
      acuteLoad: acute,
      chronicLoad: Math.round(chronic),
      acwr,
      fitness: completedSessionsTotal > 0 ? (fitness[tIdx] ?? 0) : 0,
      fatigue: completedSessionsTotal > 0 ? (fatigue[tIdx] ?? 0) : 0,
      form: completedSessionsTotal > 0 ? (form[tIdx] ?? 0) : 0,
      monotonicity,
      strain,
    },
    weekly: weekly.map(({ s }) => ({
      weekNumber: s.weekNumber,
      label: `S${s.weekNumber}`,
      startDate: s.startDate,
      phaseCode: s.phaseCode,
      kmP: s.kmP,
      kmA: s.isFuture ? null : s.kmA,
      tonnageP: s.tonnageP,
      tonnageA: s.isFuture ? null : s.tonnageA,
      loadP: s.loadP,
      loadA: s.isFuture ? null : s.loadA,
      adherencePct: s.adherencePct,
      isFuture: s.isFuture,
    })),
    curve: weekly.map(({ s, i0, i1, load }) => ({
      weekNumber: s.weekNumber,
      label: `S${s.weekNumber}`,
      load: Math.round(load),
      fitness: fitness[i1] ?? fitness[i0] ?? 0,
      fatigue: fatigue[i1] ?? fatigue[i0] ?? 0,
      form: form[i1] ?? form[i0] ?? 0,
      isFuture: s.isFuture,
    })),
    modalitySplit,
    wellness: wellnessRows.map(
      (w): WellnessDTO => ({
        date: dateKey(w.date),
        sleepHours: w.sleepHours,
        sleepQuality: w.sleepQuality,
        soreness: w.soreness,
        fatigue: w.fatigue,
        stress: w.stress,
        motivation: w.motivation,
        restingHr: w.restingHr,
        hrv: w.hrv,
        weightKg: w.weightKg,
        notes: w.notes,
      }),
    ),
    alerts,
  }
}
