import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { generatePeriodizationForAthlete } from '@/lib/periodization-generator'
import type { AthleteSummaryDTO, HyroxDivision } from '@/lib/types'

export const dynamic = 'force-dynamic'

const athleteCreateSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(80),
    gender: z.enum(['M', 'F']).default('M'),
    division: z.enum(['OPEN_M', 'OPEN_F', 'PRO_M', 'PRO_F']).default('OPEN_M'),
    ageGroup: z.string().min(2).max(20).default('25-29'),
    birthDate: z.string().min(8),
    heightCm: z.number().min(120).max(230),
    weightKg: z.number().min(35).max(180),
    bodyFatPct: z.number().min(3).max(50),
    raceName: z.string().min(2).max(100).default('HYROX — 8/9 Maio 2027'),
    raceDate: z.string().min(8),
    restingHr: z.number().int().min(30).max(110).nullable().optional(),
    maxHr: z.number().int().min(120).max(230).nullable().optional(),
    vo2max: z.number().min(20).max(95).nullable().optional(),
    vdot: z.number().min(20).max(85).nullable().optional(),
    vt1SpeedKmh: z.number().min(5).max(25).nullable().optional(),
    vt2SpeedKmh: z.number().min(5).max(25).nullable().optional(),
    fiveKmPbSec: z.number().int().min(780).max(3600).nullable().optional(),
    squat3rmKg: z.number().min(15).max(350).nullable().optional(),
    deadlift3rmKg: z.number().min(15).max(350).nullable().optional(),
    bench3rmKg: z.number().min(15).max(350).nullable().optional(),
    cmjCm: z.number().min(15).max(90).nullable().optional(),
    skiErg1kTtSec: z.number().int().min(150).max(480).nullable().optional(),
    row500mTtSec: z.number().int().min(70).max(240).nullable().optional(),
    goalRaceTime: z.number().int().min(2700).max(9000).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine(
    (d) => {
      if (d.vt1SpeedKmh != null && d.vt2SpeedKmh != null) {
        return d.vt2SpeedKmh > d.vt1SpeedKmh
      }
      return true
    },
    { message: 'A velocidade de VT2 deve ser maior que VT1', path: ['vt2SpeedKmh'] },
  )

export async function GET() {
  try {
    const rows = await db.athlete.findMany({ orderBy: { createdAt: 'asc' } })
    const athletes: AthleteSummaryDTO[] = rows.map((a) => ({
      id: a.id,
      name: a.name,
      gender: (a.gender === 'F' ? 'F' : 'M') as 'M' | 'F',
      division: (['OPEN_M', 'OPEN_F', 'PRO_M', 'PRO_F'].includes(a.division) ? a.division : 'OPEN_M') as HyroxDivision,
      ageGroup: a.ageGroup,
      birthDate: a.birthDate.toISOString(),
      heightCm: a.heightCm,
      weightKg: a.weightKg,
      bodyFatPct: a.bodyFatPct,
      raceName: a.raceName,
      raceDate: a.raceDate.toISOString(),
      restingHr: a.restingHr,
      maxHr: a.maxHr,
      vo2max: a.vo2max,
      vdot: a.vdot,
      vt1SpeedKmh: a.vt1SpeedKmh,
      vt2SpeedKmh: a.vt2SpeedKmh,
      fiveKmPbSec: a.fiveKmPbSec,
      squat3rmKg: a.squat3rmKg,
      deadlift3rmKg: a.deadlift3rmKg,
      bench3rmKg: a.bench3rmKg,
      cmjCm: a.cmjCm,
      skiErg1kTtSec: a.skiErg1kTtSec,
      row500mTtSec: a.row500mTtSec,
      goalRaceTime: a.goalRaceTime,
      notes: a.notes,
    }))
    return NextResponse.json({ athletes })
  } catch (e) {
    console.error('[api/athletes GET]', e)
    return NextResponse.json({ error: 'Erro ao listar atletas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json()
    const parsed = athleteCreateSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados de cadastro ou testes inválidos', details: parsed.error.format() },
        { status: 400 },
      )
    }

    const d = parsed.data
    const birthDate = new Date(d.birthDate)
    const raceDate = new Date(d.raceDate)
    if (Number.isNaN(birthDate.getTime()) || Number.isNaN(raceDate.getTime())) {
      return NextResponse.json({ error: 'Datas de nascimento ou prova inválidas' }, { status: 400 })
    }

    const athlete = await db.athlete.create({
      data: {
        name: d.name.trim(),
        gender: d.gender,
        division: d.division,
        ageGroup: d.ageGroup,
        birthDate,
        heightCm: d.heightCm,
        weightKg: d.weightKg,
        bodyFatPct: d.bodyFatPct,
        raceName: d.raceName.trim(),
        raceDate,
        planStartDate: new Date(Date.UTC(2026, 9, 26)),
        restingHr: d.restingHr ?? null,
        maxHr: d.maxHr ?? null,
        vo2max: d.vo2max ?? null,
        vdot: d.vdot ?? null,
        vt1SpeedKmh: d.vt1SpeedKmh ?? null,
        vt2SpeedKmh: d.vt2SpeedKmh ?? null,
        fiveKmPbSec: d.fiveKmPbSec ?? null,
        squat3rmKg: d.squat3rmKg ?? null,
        deadlift3rmKg: d.deadlift3rmKg ?? null,
        bench3rmKg: d.bench3rmKg ?? null,
        cmjCm: d.cmjCm ?? null,
        skiErg1kTtSec: d.skiErg1kTtSec ?? null,
        row500mTtSec: d.row500mTtSec ?? null,
        goalRaceTime: d.goalRaceTime ?? null,
        notes: d.notes ?? null,
      },
    })

    const { generatedWeeks, generatedSessions } = await generatePeriodizationForAthlete(athlete)

    return NextResponse.json(
      {
        athlete: {
          id: athlete.id,
          name: athlete.name,
          division: athlete.division,
        },
        generatedWeeks,
        generatedSessions,
      },
      { status: 201 },
    )
  } catch (e) {
    console.error('[api/athletes POST]', e)
    return NextResponse.json({ error: 'Erro ao criar atleta e gerar periodização' }, { status: 500 })
  }
}

