import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { serializeSession } from '@/app/api/weeks/[id]/route'
import { tonnageOf, tonnageOfActual } from '@/lib/tonnage'
import type { SessionDTO, SessionPatchPayload } from '@/lib/types'

export const dynamic = 'force-dynamic'

const DONE_STATUSES = ['CONCLUIDO', 'PARCIAL', 'AJUSTADO']

const num = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const s = await db.trainingSession.findUnique({
      where: { id },
      include: { exercises: true, stations: true, microcycle: true },
    })
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

    const session = await db.trainingSession.findUnique({
      where: { id },
      include: { exercises: true, stations: true },
    })
    if (!session) return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })

    const targetStatus = body.status ?? session.status
    const isConfirmed = DONE_STATUSES.includes(targetStatus)
    const isCleared = targetStatus === 'PLANEJADO' || targetStatus === 'NAO_REALIZADO'
    const partialFactor = targetStatus === 'PARCIAL' ? 0.75 : 1.0

    // 1) Campos escalares prescritos e realizados
    const data: Record<string, unknown> = {}
    if (body.status !== undefined) data.status = body.status
    if (body.durationPrescribedMin !== undefined) {
      data.durationPrescribedMin = num(body.durationPrescribedMin) ?? 0
    }
    if (body.kmPrescribed !== undefined) data.kmPrescribed = num(body.kmPrescribed)
    if (body.tonnagePrescribedKg !== undefined) {
      data.tonnagePrescribedKg = num(body.tonnagePrescribedKg)
    }
    if (body.rpePrescribed !== undefined) data.rpePrescribed = num(body.rpePrescribed)
    if (body.paceTarget !== undefined) data.paceTarget = body.paceTarget
    if (body.hrZone !== undefined) data.hrZone = body.hrZone
    if (body.notes !== undefined) data.notes = body.notes
    if (body.coachNote !== undefined) data.coachNote = body.coachNote

    const durP =
      (data.durationPrescribedMin as number | undefined) ?? session.durationPrescribedMin
    const kmP =
      data.kmPrescribed !== undefined ? (data.kmPrescribed as number | null) : session.kmPrescribed
    const rpeP =
      data.rpePrescribed !== undefined
        ? (data.rpePrescribed as number | null)
        : session.rpePrescribed

    if (isCleared) {
      // Ao voltar para PLANEJADO ou NAO_REALIZADO, limpa 100% dos campos realizados
      data.durationActualMin = null
      data.kmActual = null
      data.tonnageActualKg = null
      data.rpeActual = null
      data.loadActual = null

      await Promise.all([
        db.exercise.updateMany({
          where: { sessionId: id },
          data: { setsActual: null, repsActual: null, loadActualKg: null },
        }),
        db.stationResult.updateMany({
          where: { sessionId: id },
          data: { splitActualSec: null, hrAvg: null },
        }),
      ])
    } else {
      // Atualização normal ou confirmação (CONCLUIDO / PARCIAL / AJUSTADO)
      const rawDurA =
        body.durationActualMin !== undefined
          ? num(body.durationActualMin)
          : session.durationActualMin
      const rawKmA = body.kmActual !== undefined ? num(body.kmActual) : session.kmActual
      const rawRpeA = body.rpeActual !== undefined ? num(body.rpeActual) : session.rpeActual

      data.durationActualMin =
        rawDurA != null ? rawDurA : isConfirmed ? Math.round(durP * partialFactor) : null
      data.kmActual =
        rawKmA != null
          ? rawKmA
          : isConfirmed && kmP != null
            ? Math.round(kmP * partialFactor * 10) / 10
            : null
      data.rpeActual = rawRpeA != null ? rawRpeA : isConfirmed ? (rpeP ?? 5) : null

      // 2) Exercícios (prescrito e realizado, com auto-preenchimento se confirmado)
      if (body.exercises?.length) {
        for (const ex of body.exercises) {
          const currentEx = session.exercises.find((e) => e.id === ex.id)
          const setsP =
            ex.setsPrescribed !== undefined
              ? num(ex.setsPrescribed)
              : (currentEx?.setsPrescribed ?? null)
          const repsP =
            ex.repsPrescribed !== undefined
              ? ex.repsPrescribed
              : (currentEx?.repsPrescribed ?? null)
          const loadP =
            ex.loadPrescribedKg !== undefined
              ? num(ex.loadPrescribedKg)
              : (currentEx?.loadPrescribedKg ?? null)

          const rawSetsA =
            ex.setsActual !== undefined ? num(ex.setsActual) : (currentEx?.setsActual ?? null)
          const rawRepsA =
            ex.repsActual !== undefined ? ex.repsActual : (currentEx?.repsActual ?? null)
          const rawLoadA =
            ex.loadActualKg !== undefined ? num(ex.loadActualKg) : (currentEx?.loadActualKg ?? null)

          const exData: Record<string, unknown> = {
            setsPrescribed: setsP,
            repsPrescribed: repsP,
            loadPrescribedKg: loadP,
            setsActual: rawSetsA != null ? rawSetsA : isConfirmed ? setsP : null,
            repsActual: rawRepsA != null && rawRepsA !== '' ? rawRepsA : isConfirmed ? repsP : null,
            loadActualKg: rawLoadA != null ? rawLoadA : isConfirmed ? loadP : null,
          }
          if (ex.tempo !== undefined) exData.tempo = ex.tempo
          if (ex.rest !== undefined) exData.rest = ex.rest

          await db.exercise.update({ where: { id: ex.id }, data: exData }).catch(() => null)
        }
      } else if (isConfirmed && session.exercises.length > 0) {
        // Confirmação rápida de 1 clique: preenche realizados dos exercícios a partir dos prescritos
        for (const currentEx of session.exercises) {
          await db.exercise
            .update({
              where: { id: currentEx.id },
              data: {
                setsActual: currentEx.setsActual ?? currentEx.setsPrescribed,
                repsActual: currentEx.repsActual ?? currentEx.repsPrescribed,
                loadActualKg: currentEx.loadActualKg ?? currentEx.loadPrescribedKg,
              },
            })
            .catch(() => null)
        }
      }

      const updatedExercises = await db.exercise.findMany({ where: { sessionId: id } })
      if (updatedExercises.length > 0) {
        const tonP = tonnageOf(updatedExercises)
        data.tonnagePrescribedKg = tonP > 0 ? tonP : session.tonnagePrescribedKg
        const tA = tonnageOfActual(updatedExercises)
        data.tonnageActualKg =
          tA != null && tA > 0
            ? tA
            : isConfirmed && tonP > 0
              ? Math.round(tonP * partialFactor)
              : null
      } else if (body.tonnageActualKg !== undefined) {
        data.tonnageActualKg = num(body.tonnageActualKg)
      } else if (isConfirmed && session.tonnagePrescribedKg != null) {
        data.tonnageActualKg =
          session.tonnageActualKg ?? Math.round(session.tonnagePrescribedKg * partialFactor)
      }

      // 3) Estações (splits prescrito/realizado + auto-preenchimento se confirmado)
      if (body.stations?.length) {
        for (const st of body.stations) {
          const currentSt = session.stations.find((s) => s.id === st.id)
          const splitP =
            st.splitPrescribedSec !== undefined
              ? num(st.splitPrescribedSec)
              : (currentSt?.splitPrescribedSec ?? null)
          const rawSplitA =
            st.splitActualSec !== undefined
              ? num(st.splitActualSec)
              : (currentSt?.splitActualSec ?? null)

          const stData: Record<string, unknown> = {
            splitPrescribedSec: splitP,
            splitActualSec: rawSplitA != null ? rawSplitA : isConfirmed ? splitP : null,
          }
          if (st.hrAvg !== undefined) stData.hrAvg = num(st.hrAvg)
          if (st.notes !== undefined) stData.notes = st.notes

          await db.stationResult.update({ where: { id: st.id }, data: stData }).catch(() => null)
        }
      } else if (isConfirmed && session.stations.length > 0) {
        for (const currentSt of session.stations) {
          if (currentSt.splitActualSec == null && currentSt.splitPrescribedSec != null) {
            await db.stationResult
              .update({
                where: { id: currentSt.id },
                data: { splitActualSec: currentSt.splitPrescribedSec },
              })
              .catch(() => null)
          }
        }
      }
    }

    // 4) Recalcula cargas sRPE = RPE × duração
    const finalDurP =
      (data.durationPrescribedMin as number | undefined) ?? session.durationPrescribedMin
    const finalDurA =
      data.durationActualMin !== undefined
        ? (data.durationActualMin as number | null)
        : session.durationActualMin
    const finalRpeP =
      data.rpePrescribed !== undefined
        ? (data.rpePrescribed as number | null)
        : session.rpePrescribed
    const finalRpeA =
      data.rpeActual !== undefined ? (data.rpeActual as number | null) : session.rpeActual

    data.loadPrescribed =
      finalRpeP != null && finalDurP ? Math.round(finalRpeP * finalDurP) : null
    data.loadActual =
      !isCleared && finalRpeA != null && finalDurA ? Math.round(finalRpeA * finalDurA) : null

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
