import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { serializeSession } from '@/app/api/weeks/[id]/route'
import { tonnageOf, tonnageOfActual } from '@/lib/tonnage'
import type { SessionDTO, SessionPatchPayload } from '@/lib/types'

export const dynamic = 'force-dynamic'

const num = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const s = await db.trainingSession.findUnique({ where: { id }, include: { exercises: true, stations: true, microcycle: true } })
    if (!s) return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    const dto: SessionDTO = { ...serializeSession(s), weekNumber: s.microcycle.weekNumber }
    return NextResponse.json(dto)
  } catch (e) {
    console.error('[api/sessions GET]', e)
    return NextResponse.json({ error: 'Erro ao carregar sessão' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = (await req.json()) as SessionPatchPayload

    const session = await db.trainingSession.findUnique({ where: { id }, include: { exercises: true } })
    if (!session) return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })

    // 1) campos escalares
    const data: Record<string, unknown> = {}
    if (body.status !== undefined) data.status = body.status
    if (body.durationPrescribedMin !== undefined) data.durationPrescribedMin = num(body.durationPrescribedMin) ?? 0
    if (body.durationActualMin !== undefined) data.durationActualMin = num(body.durationActualMin)
    if (body.kmPrescribed !== undefined) data.kmPrescribed = num(body.kmPrescribed)
    if (body.kmActual !== undefined) data.kmActual = num(body.kmActual)
    if (body.tonnagePrescribedKg !== undefined) data.tonnagePrescribedKg = num(body.tonnagePrescribedKg)
    if (body.tonnageActualKg !== undefined) data.tonnageActualKg = num(body.tonnageActualKg)
    if (body.rpePrescribed !== undefined) data.rpePrescribed = num(body.rpePrescribed)
    if (body.rpeActual !== undefined) data.rpeActual = num(body.rpeActual)
    if (body.paceTarget !== undefined) data.paceTarget = body.paceTarget
    if (body.hrZone !== undefined) data.hrZone = body.hrZone
    if (body.notes !== undefined) data.notes = body.notes
    if (body.coachNote !== undefined) data.coachNote = body.coachNote

    // 2) exercícios (edição livre de cargas/séries/reps — prescrito e realizado)
    if (body.exercises?.length) {
      for (const ex of body.exercises) {
        const exData: Record<string, unknown> = {}
        if (ex.setsPrescribed !== undefined) exData.setsPrescribed = num(ex.setsPrescribed)
        if (ex.repsPrescribed !== undefined) exData.repsPrescribed = ex.repsPrescribed
        if (ex.loadPrescribedKg !== undefined) exData.loadPrescribedKg = num(ex.loadPrescribedKg)
        if (ex.tempo !== undefined) exData.tempo = ex.tempo
        if (ex.rest !== undefined) exData.rest = ex.rest
        if (ex.setsActual !== undefined) exData.setsActual = num(ex.setsActual)
        if (ex.repsActual !== undefined) exData.repsActual = ex.repsActual
        if (ex.loadActualKg !== undefined) exData.loadActualKg = num(ex.loadActualKg)
        if (Object.keys(exData).length) {
          await db.exercise.update({ where: { id: ex.id }, data: exData }).catch(() => null)
        }
      }
      // retonelagem a partir dos exercícios atualizados
      const updated = await db.exercise.findMany({ where: { sessionId: id } })
      data.tonnagePrescribedKg = tonnageOf(updated)
      const tA = tonnageOfActual(updated)
      if (tA != null) data.tonnageActualKg = tA
    }

    // 3) estações (splits prescrito/realizado + FC média)
    if (body.stations?.length) {
      for (const st of body.stations) {
        const stData: Record<string, unknown> = {}
        if (st.splitPrescribedSec !== undefined) stData.splitPrescribedSec = num(st.splitPrescribedSec)
        if (st.splitActualSec !== undefined) stData.splitActualSec = num(st.splitActualSec)
        if (st.hrAvg !== undefined) stData.hrAvg = num(st.hrAvg)
        if (st.notes !== undefined) stData.notes = st.notes
        if (Object.keys(stData).length) {
          await db.stationResult.update({ where: { id: st.id }, data: stData }).catch(() => null)
        }
      }
    }

    // 4) recalcula cargas sRPE = RPE × duração
    const finalScalars = {
      durationPrescribedMin: (data.durationPrescribedMin as number | undefined) ?? session.durationPrescribedMin,
      durationActualMin: (data.durationActualMin as number | null | undefined) ?? session.durationActualMin,
      rpePrescribed: (data.rpePrescribed as number | null | undefined) ?? session.rpePrescribed,
      rpeActual: (data.rpeActual as number | null | undefined) ?? session.rpeActual,
    }
    data.loadPrescribed =
      finalScalars.rpePrescribed != null && finalScalars.durationPrescribedMin
        ? Math.round(finalScalars.rpePrescribed * finalScalars.durationPrescribedMin)
        : null
    data.loadActual =
      finalScalars.rpeActual != null && finalScalars.durationActualMin
        ? Math.round(finalScalars.rpeActual * finalScalars.durationActualMin)
        : null

    await db.trainingSession.update({ where: { id }, data })

    const updated = await db.trainingSession.findUnique({
      where: { id },
      include: { exercises: true, stations: true, microcycle: true },
    })
    if (!updated) return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    const dto: SessionDTO = { ...serializeSession(updated), weekNumber: updated.microcycle.weekNumber }
    return NextResponse.json(dto)
  } catch (e) {
    console.error('[api/sessions PATCH]', e)
    return NextResponse.json({ error: 'Erro ao salvar a sessão' }, { status: 500 })
  }
}
