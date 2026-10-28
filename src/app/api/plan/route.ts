import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { loadWeeks, todayUtc, weekSummary } from '@/lib/analytics'
import { computeDynamicZones } from '@/lib/periodization-generator'
import type { HyroxDivision, MesocycleDTO, PlanResponse, WeekSummaryDTO } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const today = todayUtc()
    const requestedAthleteId = req.nextUrl.searchParams.get('athleteId') ?? undefined

    const athlete = requestedAthleteId
      ? await db.athlete.findUnique({ where: { id: requestedAthleteId } })
      : await db.athlete.findFirst({ orderBy: { createdAt: 'asc' } })

    if (!athlete) return NextResponse.json({ error: 'Atleta não encontrado' }, { status: 404 })

    const [weeks, mesos] = await Promise.all([
      loadWeeks(athlete.id),
      db.mesocycle.findMany({ where: { athleteId: athlete.id }, orderBy: { order: 'asc' } }),
    ])

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
    const division = (['OPEN_M', 'OPEN_F', 'PRO_M', 'PRO_F'].includes(athlete.division)
      ? athlete.division
      : 'OPEN_M') as HyroxDivision

    const zones = computeDynamicZones({
      maxHr: athlete.maxHr,
      vt1SpeedKmh: athlete.vt1SpeedKmh,
      vt2SpeedKmh: athlete.vt2SpeedKmh,
      fiveKmPbSec: athlete.fiveKmPbSec,
      vo2max: athlete.vo2max,
      gender: athlete.gender,
      division: athlete.division,
    })

    const payload: PlanResponse = {
      athlete: {
        id: athlete.id,
        name: athlete.name,
        gender: (athlete.gender === 'F' ? 'F' : 'M') as 'M' | 'F',
        division,
        ageGroup: athlete.ageGroup,
        birthDate: athlete.birthDate.toISOString(),
        heightCm: athlete.heightCm,
        weightKg: athlete.weightKg,
        bodyFatPct: athlete.bodyFatPct,
        raceName: athlete.raceName,
        raceDate: athlete.raceDate.toISOString(),
        restingHr: athlete.restingHr,
        maxHr: athlete.maxHr,
        vo2max: athlete.vo2max,
        vdot: athlete.vdot,
        vt1SpeedKmh: athlete.vt1SpeedKmh,
        vt2SpeedKmh: athlete.vt2SpeedKmh,
        fiveKmPbSec: athlete.fiveKmPbSec,
        squat3rmKg: athlete.squat3rmKg,
        deadlift3rmKg: athlete.deadlift3rmKg,
        bench3rmKg: athlete.bench3rmKg,
        cmjCm: athlete.cmjCm,
        skiErg1kTtSec: athlete.skiErg1kTtSec,
        row500mTtSec: athlete.row500mTtSec,
        goalRaceTime: athlete.goalRaceTime,
        notes: athlete.notes,
        age,
        zones,
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
