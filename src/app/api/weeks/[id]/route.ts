import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { loadWeeks, todayUtc, weekSummary } from '@/lib/analytics'
import type { SessionDTO, WeekDetailResponse } from '@/lib/types'
import type { Exercise, StationResult, TrainingSession } from '@prisma/client'

export const dynamic = 'force-dynamic'

type FullSession = TrainingSession & { exercises: Exercise[]; stations: StationResult[] }

export function serializeSession(s: FullSession): SessionDTO {
  return {
    id: s.id,
    microcycleId: s.microcycleId,
    weekNumber: 0, // preenchido pelo chamador
    date: s.date.toISOString(),
    dayIndex: s.dayIndex,
    type: s.type,
    title: s.title,
    description: s.description,
    hrZone: s.hrZone,
    paceTarget: s.paceTarget,
    durationPrescribedMin: s.durationPrescribedMin,
    durationActualMin: s.durationActualMin,
    kmPrescribed: s.kmPrescribed,
    kmActual: s.kmActual,
    tonnagePrescribedKg: s.tonnagePrescribedKg,
    tonnageActualKg: s.tonnageActualKg,
    rpePrescribed: s.rpePrescribed,
    rpeActual: s.rpeActual,
    loadPrescribed: s.loadPrescribed,
    loadActual: s.loadActual,
    status: s.status,
    notes: s.notes,
    coachNote: s.coachNote,
    exercises: [...s.exercises]
      .sort((a, b) => a.order - b.order)
      .map((e) => ({
        id: e.id, order: e.order, name: e.name, category: e.category,
        setsPrescribed: e.setsPrescribed, repsPrescribed: e.repsPrescribed,
        loadPrescribedKg: e.loadPrescribedKg, tempo: e.tempo, rest: e.rest,
        setsActual: e.setsActual, repsActual: e.repsActual, loadActualKg: e.loadActualKg,
        notes: e.notes,
      })),
    stations: [...s.stations]
      .sort((a, b) => a.order - b.order)
      .map((st) => ({
        id: st.id, order: st.order, station: st.station, label: st.label,
        distanceM: st.distanceM, reps: st.reps, loadKg: st.loadKg,
        splitPrescribedSec: st.splitPrescribedSec, splitActualSec: st.splitActualSec,
        hrAvg: st.hrAvg, notes: st.notes,
      })),
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const today = todayUtc()
    const weeks = await loadWeeks()
    const w = weeks.find((x) => x.id === id || String(x.weekNumber) === id)
    if (!w) return NextResponse.json({ error: 'Semana não encontrada' }, { status: 404 })

    const sessionsRaw = await db.trainingSession.findMany({
      where: { microcycleId: w.id },
      include: { exercises: true, stations: true },
      orderBy: { dayIndex: 'asc' },
    })

    const payload: WeekDetailResponse = {
      week: weekSummary(w, today),
      sessions: sessionsRaw.map((s) => ({ ...serializeSession(s), weekNumber: w.weekNumber })),
    }
    return NextResponse.json(payload)
  } catch (e) {
    console.error('[api/weeks]', e)
    return NextResponse.json({ error: 'Erro ao carregar a semana' }, { status: 500 })
  }
}
