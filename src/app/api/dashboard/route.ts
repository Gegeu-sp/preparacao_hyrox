import { NextRequest, NextResponse } from 'next/server'
import { computeDashboard } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const athleteId = req.nextUrl.searchParams.get('athleteId') ?? undefined
    const payload = await computeDashboard(athleteId)
    return NextResponse.json(payload)
  } catch (e) {
    console.error('[api/dashboard]', e)
    return NextResponse.json({ error: 'Erro ao calcular o painel' }, { status: 500 })
  }
}
