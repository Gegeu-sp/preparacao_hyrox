import { NextResponse } from 'next/server'
import { computeDashboard } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await computeDashboard()
    return NextResponse.json(payload)
  } catch (e) {
    console.error('[api/dashboard]', e)
    return NextResponse.json({ error: 'Erro ao calcular o painel' }, { status: 500 })
  }
}
