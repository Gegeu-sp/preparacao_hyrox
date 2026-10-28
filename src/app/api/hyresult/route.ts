import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { computeHyresultAnalysis } from '@/lib/hyresult-analytics'

export const dynamic = 'force-dynamic'

const hyresultPostSchema = z.object({
  athleteId: z.string().min(1),
  resultCode: z.string().min(4).max(32).default('LR3MS4JI5A0E80'),
  eventName: z.string().min(2).max(100).default('HYROX Official Result'),
  eventDate: z.string().optional(),
  runSplits: z.array(z.number().int().min(150).max(600)).length(8),
  workSplits: z.object({
    SKIERG: z.number().int().min(60).max(900),
    SLED_PUSH: z.number().int().min(60).max(900),
    SLED_PULL: z.number().int().min(60).max(900),
    BBJ: z.number().int().min(60).max(900),
    ROWING: z.number().int().min(60).max(900),
    FARMERS: z.number().int().min(60).max(900),
    SANDBAG: z.number().int().min(60).max(900),
    WALLBALLS: z.number().int().min(60).max(900),
  }),
  roxSplits: z.array(z.number().int().min(15).max(180)).length(8),
  notes: z.string().max(500).nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const athleteId = req.nextUrl.searchParams.get('athleteId') ?? undefined
    const sourceId = req.nextUrl.searchParams.get('sourceId') ?? undefined

    const analysis = await computeHyresultAnalysis(athleteId, sourceId)
    if (!analysis) {
      return NextResponse.json({ error: 'Atleta ou análise HYRESULT não encontrados' }, { status: 404 })
    }

    return NextResponse.json(analysis)
  } catch (e) {
    console.error('[api/hyresult GET]', e)
    return NextResponse.json({ error: 'Erro ao processar análise HYRESULT' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json()
    const parsed = hyresultPostSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Splits HYRESULT inválidos', details: parsed.error.format() },
        { status: 400 },
      )
    }

    const d = parsed.data
    const athlete = await db.athlete.findUnique({ where: { id: d.athleteId } })
    if (!athlete) {
      return NextResponse.json({ error: 'Atleta não encontrado' }, { status: 404 })
    }

    const totalRunSec = d.runSplits.reduce((a, b) => a + b, 0)
    const totalWorkSec = Object.values(d.workSplits).reduce((a, b) => a + b, 0)
    const totalRoxSec = d.roxSplits.reduce((a, b) => a + b, 0)
    const totalTimeSec = totalRunSec + totalWorkSec + totalRoxSec

    const created = await db.hyresultRaceResult.create({
      data: {
        athleteId: athlete.id,
        resultCode: d.resultCode.trim().toUpperCase(),
        eventName: d.eventName.trim(),
        eventDate: d.eventDate ? new Date(d.eventDate) : new Date(),
        division: athlete.division,
        ageGroup: athlete.ageGroup,
        totalTimeSec,
        totalRunSec,
        totalWorkSec,
        totalRoxSec,
        runSplitsJson: JSON.stringify(d.runSplits),
        workSplitsJson: JSON.stringify(d.workSplits),
        roxSplitsJson: JSON.stringify(d.roxSplits),
        notes: d.notes ?? null,
      },
    })

    const analysis = await computeHyresultAnalysis(athlete.id, created.id)
    return NextResponse.json(analysis, { status: 201 })
  } catch (e) {
    console.error('[api/hyresult POST]', e)
    return NextResponse.json({ error: 'Erro ao salvar resultado HYRESULT' }, { status: 500 })
  }
}

