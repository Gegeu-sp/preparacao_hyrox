import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { recalibrateFutureSessionsForAthlete } from '@/lib/periodization-generator'

export const dynamic = 'force-dynamic'

const athletePatchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  gender: z.enum(['M', 'F']).optional(),
  division: z.enum(['OPEN_M', 'OPEN_F', 'PRO_M', 'PRO_F']).optional(),
  ageGroup: z.string().min(2).max(20).optional(),
  birthDate: z.string().optional(),
  heightCm: z.number().min(120).max(230).optional(),
  weightKg: z.number().min(35).max(180).optional(),
  bodyFatPct: z.number().min(3).max(50).optional(),
  raceName: z.string().min(2).max(100).optional(),
  raceDate: z.string().optional(),
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
  recalibrateFutureSessions: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const raw = await req.json()
    const parsed = athletePatchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.format() }, { status: 400 })
    }

    const d = parsed.data
    const existing = await db.athlete.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Atleta não encontrado' }, { status: 404 })
    }

    const updated = await db.athlete.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name.trim() } : {}),
        ...(d.gender !== undefined ? { gender: d.gender } : {}),
        ...(d.division !== undefined ? { division: d.division } : {}),
        ...(d.ageGroup !== undefined ? { ageGroup: d.ageGroup } : {}),
        ...(d.birthDate !== undefined ? { birthDate: new Date(d.birthDate) } : {}),
        ...(d.heightCm !== undefined ? { heightCm: d.heightCm } : {}),
        ...(d.weightKg !== undefined ? { weightKg: d.weightKg } : {}),
        ...(d.bodyFatPct !== undefined ? { bodyFatPct: d.bodyFatPct } : {}),
        ...(d.raceName !== undefined ? { raceName: d.raceName.trim() } : {}),
        ...(d.raceDate !== undefined ? { raceDate: new Date(d.raceDate) } : {}),
        ...(d.restingHr !== undefined ? { restingHr: d.restingHr } : {}),
        ...(d.maxHr !== undefined ? { maxHr: d.maxHr } : {}),
        ...(d.vo2max !== undefined ? { vo2max: d.vo2max } : {}),
        ...(d.vdot !== undefined ? { vdot: d.vdot } : {}),
        ...(d.vt1SpeedKmh !== undefined ? { vt1SpeedKmh: d.vt1SpeedKmh } : {}),
        ...(d.vt2SpeedKmh !== undefined ? { vt2SpeedKmh: d.vt2SpeedKmh } : {}),
        ...(d.fiveKmPbSec !== undefined ? { fiveKmPbSec: d.fiveKmPbSec } : {}),
        ...(d.squat3rmKg !== undefined ? { squat3rmKg: d.squat3rmKg } : {}),
        ...(d.deadlift3rmKg !== undefined ? { deadlift3rmKg: d.deadlift3rmKg } : {}),
        ...(d.bench3rmKg !== undefined ? { bench3rmKg: d.bench3rmKg } : {}),
        ...(d.cmjCm !== undefined ? { cmjCm: d.cmjCm } : {}),
        ...(d.skiErg1kTtSec !== undefined ? { skiErg1kTtSec: d.skiErg1kTtSec } : {}),
        ...(d.row500mTtSec !== undefined ? { row500mTtSec: d.row500mTtSec } : {}),
        ...(d.goalRaceTime !== undefined ? { goalRaceTime: d.goalRaceTime } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
      },
    })

    let recalibratedSessions = 0
    if (d.recalibrateFutureSessions !== false) {
      recalibratedSessions = await recalibrateFutureSessionsForAthlete(updated)
    }

    return NextResponse.json({
      athlete: updated,
      recalibratedSessions,
    })
  } catch (e) {
    console.error('[api/athletes/[id] PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar atleta e recalibrar plano' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const count = await db.athlete.count()
    if (count <= 1) {
      return NextResponse.json({ error: 'Não é possível remover o único atleta do sistema' }, { status: 400 })
    }
    await db.athlete.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/athletes/[id] DELETE]', e)
    return NextResponse.json({ error: 'Erro ao remover atleta' }, { status: 500 })
  }
}

