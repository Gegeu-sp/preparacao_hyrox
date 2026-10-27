import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { dateKey } from '@/lib/format'
import { todayUtc } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await db.wellness.findMany({ orderBy: { date: 'desc' }, take: 30 })
    return NextResponse.json(
      rows.map((w) => ({
        date: dateKey(w.date), sleepHours: w.sleepHours, sleepQuality: w.sleepQuality,
        soreness: w.soreness, fatigue: w.fatigue, stress: w.stress, motivation: w.motivation,
        restingHr: w.restingHr, hrv: w.hrv, weightKg: w.weightKg, notes: w.notes,
      })),
    )
  } catch (e) {
    console.error('[api/wellness GET]', e)
    return NextResponse.json({ error: 'Erro ao carregar bem-estar' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    const dstr: string = typeof b.date === 'string' && b.date ? b.date : dateKey(todayUtc())
    const date = new Date(`${dstr}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Data inválida' }, { status: 400 })

    const int = (v: unknown): number | null => {
      if (v == null || v === '') return null
      const n = Number(v)
      return Number.isNaN(n) ? null : Math.round(n)
    }
    const float = (v: unknown): number | null => {
      if (v == null || v === '') return null
      const n = Number(v)
      return Number.isNaN(n) ? null : Math.round(n * 10) / 10
    }

    const data = {
      sleepHours: float(b.sleepHours),
      sleepQuality: int(b.sleepQuality),
      soreness: int(b.soreness),
      fatigue: int(b.fatigue),
      stress: int(b.stress),
      motivation: int(b.motivation),
      restingHr: int(b.restingHr),
      hrv: int(b.hrv),
      weightKg: float(b.weightKg),
      notes: typeof b.notes === 'string' && b.notes ? b.notes : null,
    }

    const row = await db.wellness.upsert({ where: { date }, create: { date, ...data }, update: data })
    return NextResponse.json({ ok: true, date: dateKey(row.date) })
  } catch (e) {
    console.error('[api/wellness POST]', e)
    return NextResponse.json({ error: 'Erro ao registrar bem-estar' }, { status: 500 })
  }
}
