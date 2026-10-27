import { NextResponse } from 'next/server'
import { computeRacePrediction } from '@/lib/predictions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const prediction = await computeRacePrediction()
    if (!prediction) {
      return NextResponse.json({ error: 'Atleta não encontrado para cálculo preditivo' }, { status: 404 })
    }

    return NextResponse.json(prediction)
  } catch (error) {
    console.error('[api/predictions] Erro ao calcular previsão:', error)
    return NextResponse.json({ error: 'Erro interno ao calcular previsão de prova' }, { status: 500 })
  }
}
