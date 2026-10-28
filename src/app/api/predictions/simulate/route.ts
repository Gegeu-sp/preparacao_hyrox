import { NextResponse } from 'next/server'
import { z } from 'zod'
import { computeRacePrediction, simulatePredictionScenario } from '@/lib/predictions'

export const dynamic = 'force-dynamic'

const simulateSchema = z.object({
  athleteId: z.string().optional(),
  basePaceAdjustmentSec: z.number().min(-60).max(60).optional(),
  stationAdjustments: z.record(z.string(), z.number().min(-120).max(120)).optional(),
  roxzoneAdjustmentSec: z.number().min(-120).max(120).optional(),
  customGoalTimeSec: z.number().min(3000).max(7200).optional(),
})

export async function POST(req: Request) {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 })
  }

  try {
    const parsed = simulateSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Parâmetros de simulação inválidos', details: parsed.error.format() }, { status: 400 })
    }

    const base = await computeRacePrediction(parsed.data.athleteId)
    if (!base) {
      return NextResponse.json({ error: 'Atleta não encontrado para simulação' }, { status: 404 })
    }

    const updated = simulatePredictionScenario(base, parsed.data)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[api/predictions/simulate] Erro na simulação:', error)
    return NextResponse.json({ error: 'Erro interno ao simular cenário' }, { status: 500 })
  }
}
