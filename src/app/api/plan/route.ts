import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { loadWeeks, todayUtc, weekSummary } from '@/lib/analytics'
import type { MesocycleDTO, PlanResponse, WeekSummaryDTO } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const today = todayUtc()
    const [athlete, weeks, mesos] = await Promise.all([
      db.athlete.findFirst(),
      loadWeeks(),
      db.mesocycle.findMany({ orderBy: { order: 'asc' } }),
    ])
    if (!athlete) return NextResponse.json({ error: 'Atleta não encontrado' }, { status: 404 })

    const summaries: WeekSummaryDTO[] = weeks.map((w) => weekSummary(w, today))

    const mesocycles: MesocycleDTO[] = mesos.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      order: m.order,
      startDate: m.startDate.toISOString(),
      endDate: m.endDate.toISOString(),
      goal: m.goal,
      focus: m.focus,
      volumeTargetKm: m.volumeTargetKm,
      intensityNote: m.intensityNote,
      keyWorkouts: m.keyWorkouts,
      weeks: summaries.filter((s) => s.phaseCode === m.code),
    }))

    const age = Math.floor((today.getTime() - athlete.birthDate.getTime()) / (365.25 * 86_400_000))

    const payload: PlanResponse = {
      athlete: {
        name: athlete.name,
        birthDate: athlete.birthDate.toISOString(),
        heightCm: athlete.heightCm,
        weightKg: athlete.weightKg,
        bodyFatPct: athlete.bodyFatPct,
        restingHr: athlete.restingHr,
        maxHr: athlete.maxHr,
        vo2max: athlete.vo2max,
        vdot: athlete.vdot,
        vt1SpeedKmh: athlete.vt1SpeedKmh,
        vt2SpeedKmh: athlete.vt2SpeedKmh,
        fiveKmPbSec: athlete.fiveKmPbSec,
        goalRaceTime: athlete.goalRaceTime,
        notes: athlete.notes,
        age,
      },
      race: {
        name: athlete.raceName,
        date: athlete.raceDate.toISOString(),
        daysUntil: Math.round((athlete.raceDate.getTime() - today.getTime()) / 86_400_000),
      },
      mesocycles,
      weeks: summaries,
      currentWeek: summaries.find((w) => w.isCurrent) ?? null,
    }

    return NextResponse.json(payload)
  } catch (e) {
    console.error('[api/plan]', e)
    return NextResponse.json({ error: 'Erro ao carregar o plano' }, { status: 500 })
  }
}
