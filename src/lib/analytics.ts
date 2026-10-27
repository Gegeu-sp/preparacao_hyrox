// Analytics server-side: resumos semanais, sRPE (Foster), ACWR, Fitness-Fadiga (EWMA),
// monotonicidade/strain, aderência e distribuição por modalidade.
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

// ---------------------------------------------------------------- tipos prisma (inferidos)
type SessionRow = {
  date: Date; dayIndex: number; type: string; status: string
  kmPrescribed: number | null; kmActual: number | null
  tonnagePrescribedKg: number | null; tonnageActualKg: number | null
  loadPrescribed: number | null; loadActual: number | null
  durationPrescribedMin: number; durationActualMin: number | null
}
type WeekRow = {
  id: string; weekNumber: number; startDate: Date; endDate: Date; type: string
  note: string | null; targetKm: number; targetTonnageKg: number; targetSessions: number
  mesocycleId: string
  mesocycle: { code: string; name: string }
  sessions: SessionRow[]
}

export async function loadWeeks(): Promise<WeekRow[]> {
  return (await db.microcycle.findMany({
    orderBy: { weekNumber: 'asc' },
    include: { mesocycle: true, sessions: { orderBy: { dayIndex: 'asc' } } },
  })) as unknown as WeekRow[]
}

// ---------------------------------------------------------------- resumo semanal
export function weekSummary(w: WeekRow, today: Date): WeekSummaryDTO {
  const tKey = dateKey(today)
  const kmP = w.sessions.reduce((a, s) => a + (s.kmPrescribed ?? 0), 0)
  const kmA = w.sessions.reduce((a, s) => (DONE.includes(s.status) ? a + (s.kmActual ?? 0) : a), 0)
  const tonP = w.sessions.reduce((a, s) => a + (s.tonnagePrescribedKg ?? 0), 0)
  const tonA = w.sessions.reduce((a, s) => (DONE.includes(s.status) ? a + (s.tonnageActualKg ?? 0) : a), 0)
  const loadP = w.sessions.reduce((a, s) => a + (s.loadPrescribed ?? 0), 0)
  const loadA = w.sessions.reduce((a, s) => (DONE.includes(s.status) ? a + (s.loadActual ?? 0) : a), 0)
  const done = w.sessions.filter((s) => statusWeight(s.status) > 0).length

  const isCurrent = dateKey(w.startDate) <= tKey && tKey <= dateKey(w.endDate)
  const isPast = dateKey(w.endDate) < tKey
  const isFuture = dateKey(w.startDate) > tKey

  let adherencePct: number | null = null
  if (isPast) {
    adherencePct = Math.round((w.sessions.reduce((a, s) => a + statusWeight(s.status), 0) / w.targetSessions) * 100)
  } else if (isCurrent) {
    // aderência parcial da semana: apenas dias já decorridos
    const elapsed = w.sessions.filter((s) => dateKey(s.date) <= tKey)
    if (elapsed.length > 0) {
      adherencePct = Math.round((elapsed.reduce((a, s) => a + statusWeight(s.status), 0) / elapsed.length) * 100)
    }
  }

  return {
    id: w.id, weekNumber: w.weekNumber,
    startDate: w.startDate.toISOString(), endDate: w.endDate.toISOString(),
    type: w.type, note: w.note,
    targetKm: Math.round(w.targetKm * 10) / 10, targetTonnageKg: w.targetTonnageKg,
    targetSessions: w.targetSessions,
    phaseCode: w.mesocycle.code, mesoName: w.mesocycle.name,
    kmP: Math.round(kmP * 10) / 10, kmA: Math.round(kmA * 10) / 10,
    tonnageP: Math.round(tonP), tonnageA: Math.round(tonA),
    loadP, loadA, sessionsDone: done, sessionsTotal: w.sessions.length,
    adherencePct, isCurrent, isPast, isFuture,
  }
}

// ---------------------------------------------------------------- dashboard
export async function computeDashboard(): Promise<DashboardResponse> {
  const today = todayUtc()
  const tKey = dateKey(today)
  const [weeks, athlete, wellnessRows] = await Promise.all([
    loadWeeks(),
    db.athlete.findFirst(),
    db.wellness.findMany({ orderBy: { date: 'desc' }, take: 14 }),
  ])

  const sessions = weeks.flatMap((w) => w.sessions)
  const planStart = weeks[0]?.startDate ?? today
  const planEnd = weeks[weeks.length - 1]?.endDate ?? today
  const nDays = Math.max(1, Math.round((planEnd.getTime() - planStart.getTime()) / DAY) + 1)

  // ---- série diária (carga sRPE)
  const dailyA = new Array<number>(nDays).fill(0)
  const dailyP = new Array<number>(nDays).fill(0)
  const idxOf = (d: Date) => Math.round((d.getTime() - planStart.getTime()) / DAY)
  for (const s of sessions) {
    const i = idxOf(s.date)
    if (i < 0 || i >= nDays) continue
    dailyP[i] += s.loadPrescribed ?? 0
    if (DONE.includes(s.status)) dailyA[i] += s.loadActual ?? 0
  }
  const tIdx = Math.min(nDays - 1, Math.max(0, idxOf(today)))
  // carga "efetiva": realizado até hoje; prescrito para o futuro (projeção)
  const blended = dailyA.map((a, i) => (i <= tIdx ? a : dailyP[i]))

  // ---- EWMA fitness (42d) / fadiga (7d) — modelo fitness-fatigue (Banister)
  const L42 = 2 / 43
  const L7 = 2 / 8
  const fitness: number[] = []
  const fatigue: number[] = []
  let f = 0, ft = 0
  for (let i = 0; i < nDays; i++) {
    f += L42 * (blended[i] - f)
    ft += L7 * (blended[i] - ft)
    fitness.push(Math.round(f * 10) / 10)
    fatigue.push(Math.round(ft * 10) / 10)
  }
  const form = fitness.map((v, i) => Math.round((v - fatigue[i]) * 10) / 10)

  // ---- semanal
  const weekly = weeks.map((w) => {
    const s = weekSummary(w, today)
    const i0 = idxOf(w.startDate)
    const i1 = Math.min(nDays - 1, idxOf(w.endDate))
    const load = blended.slice(i0, i1 + 1).reduce((a, b) => a + b, 0)
    return { s, i0, i1, load }
  })

  // ---- KPIs
  const acute = blended.slice(Math.max(0, tIdx - 6), tIdx + 1).reduce((a, b) => a + b, 0)
  const chronicWin = blended.slice(Math.max(0, tIdx - 27), tIdx + 1)
  const chronic = chronicWin.length ? chronicWin.reduce((a, b) => a + b, 0) / chronicWin.length : 0
  const acwr = chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : null

  const elapsedSessions = sessions.filter((s) => dateKey(s.date) <= tKey)
  const adherenceOverall =
    elapsedSessions.length > 0
      ? Math.round((elapsedSessions.reduce((a, s) => a + statusWeight(s.status), 0) / elapsedSessions.length) * 100)
      : null

  // monotonicidade/strain da última semana completa (Foster)
  const lastDone = [...weeks].reverse().find((w) => dateKey(w.endDate) < tKey)
  let monotonicity: number | null = null
  let strain: number | null = null
  if (lastDone) {
    const i0 = idxOf(lastDone.startDate)
    const i1 = idxOf(lastDone.endDate)
    const d = blended.slice(i0, i1 + 1)
    const mean = d.reduce((a, b) => a + b, 0) / d.length
    const sd = Math.sqrt(d.reduce((a, b) => a + (b - mean) ** 2, 0) / d.length)
    if (sd > 0) {
      monotonicity = Math.round((mean / sd) * 100) / 100
      strain = Math.round(monotonicity * mean * d.length)
    }
  }

  // ---- distribuição por modalidade (28 dias)
  const from = new Date(today.getTime() - 27 * DAY)
  const modMap = new Map<string, number>()
  for (const s of sessions) {
    if (s.date < from || s.date > today) continue
    const load = s.status === 'NAO_REALIZADO' ? 0 : s.loadActual ?? s.loadPrescribed ?? 0
    modMap.set(s.type, (modMap.get(s.type) ?? 0) + load)
  }
  const modTotal = [...modMap.values()].reduce((a, b) => a + b, 0)
  const modalitySplit = [...modMap.entries()]
    .map(([type, load]) => ({ type, load: Math.round(load), pct: modTotal > 0 ? Math.round((load / modTotal) * 100) : 0 }))
    .sort((a, b) => b.load - a.load)

  // ---- alertas
  const alerts: string[] = []
  const hasHistory = tIdx >= 13 // ACWR só é interpretável com ≥2 semanas de histórico
  if (hasHistory && acwr != null && acwr > 1.3) alerts.push(`Carga aguda elevada: ACWR ${acwr.toFixed(2)} (janela de segurança 0,8–1,3). Priorize recuperação.`)
  if (hasHistory && acwr != null && acwr < 0.8 && chronic > 0) alerts.push(`Carga aguda baixa: ACWR ${acwr.toFixed(2)} — risco de perda de forma se prolongado (destreino).`)
  const lastWell = wellnessRows[0]
  if (lastWell) {
    if ((lastWell.soreness ?? 0) >= 4) alerts.push(`Dor muscular elevada (${lastWell.soreness}/5) em ${dateKey(lastWell.date)} — avalie trocar qualidade por volume leve.`)
    if ((lastWell.fatigue ?? 0) >= 4) alerts.push(`Fadiga percebida alta (${lastWell.fatigue}/5) — considere reduzir a sessão-chave da semana.`)
    if ((lastWell.hrv ?? 99) < 45) alerts.push(`HRV baixo (${lastWell.hrv} ms) — sinal de estresse autonômico; ajuste a intensidade do dia.`)
  }
  const lastWeekSum = weekly.find((x) => x.s.isPast)
  if (lastWeekSum?.s.adherencePct != null && lastWeekSum.s.adherencePct < 70) {
    alerts.push(`Aderência da última semana completa: ${lastWeekSum.s.adherencePct}% — repriorize as sessões-chave (Ter/Qui/Sáb).`)
  }

  const currentWeekSum = weekly.find((x) => x.s.isCurrent)?.s ?? null

  return {
    kpis: {
      daysUntilRace: athlete ? Math.round((athlete.raceDate.getTime() - today.getTime()) / DAY) : 0,
      weekNumber: currentWeekSum?.weekNumber ?? 1,
      phaseCode: currentWeekSum?.phaseCode ?? 'DIAG',
      adherenceWeekPct: currentWeekSum?.adherencePct ?? null,
      adherenceOverallPct: adherenceOverall,
      kmWeekP: currentWeekSum?.kmP ?? 0,
      kmWeekA: currentWeekSum?.kmA ?? 0,
      tonnageWeekP: currentWeekSum?.tonnageP ?? 0,
      tonnageWeekA: currentWeekSum?.tonnageA ?? 0,
      acuteLoad: acute,
      chronicLoad: Math.round(chronic),
      acwr,
      fitness: fitness[tIdx] ?? 0,
      fatigue: fatigue[tIdx] ?? 0,
      form: form[tIdx] ?? 0,
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
        sleepHours: w.sleepHours, sleepQuality: w.sleepQuality, soreness: w.soreness,
        fatigue: w.fatigue, stress: w.stress, motivation: w.motivation,
        restingHr: w.restingHr, hrv: w.hrv, weightKg: w.weightKg, notes: w.notes,
      }),
    ),
    alerts,
  }
}
