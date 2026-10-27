'use client'

// Gráficos do painel — recharts via wrapper shadcn/ui
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Area, Line, LineChart, Pie, PieChart,
  ReferenceLine, XAxis, YAxis,
} from 'recharts'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { CurvePoint, WeeklySeriesPoint, WellnessDTO } from '@/lib/types'
import { PHASE_SOLID } from './bits'
import { fmtKm, fmtClock } from '@/lib/format'
import { SESSION_TYPE_META, type SessionType } from '@/lib/constants'

// ---------------------------------------------------------------- Prescrito vs Realizado
const volumeConfig = (metric: string): ChartConfig => ({
  prescrito: { label: 'Prescrito', color: 'var(--chart-4)' },
  realizado: { label: 'Realizado', color: 'var(--chart-1)' },
  metric: { label: metric },
})

export function VolumeChart({ data, metric }: { data: WeeklySeriesPoint[]; metric: 'km' | 'ton' | 'load' }) {
  const keyP = metric === 'km' ? 'kmP' : metric === 'ton' ? 'tonnageP' : 'loadP'
  const keyA = metric === 'km' ? 'kmA' : metric === 'ton' ? 'tonnageA' : 'loadA'
  const unit = metric === 'km' ? 'km' : metric === 'ton' ? 't' : 'UA (sRPE)'
  const digits = metric === 'km' ? 1 : 0
  const div = metric === 'ton' ? 1000 : 1

  const rows = data.map((d) => ({
    label: `S${d.weekNumber}`,
    prescrito: Math.round(((d as unknown as Record<string, number>)[keyP] / div) * 10) / 10,
    realizado: (d as unknown as Record<string, number | null>)[keyA] != null
      ? Math.round((((d as unknown as Record<string, number | null>)[keyA] as number) / div) * 10) / 10
      : null,
    phase: d.phaseCode,
    fut: d.isFuture,
  }))

  return (
    <ChartContainer config={volumeConfig(unit)} className="h-[280px] w-full">
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={2}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} minTickGap={12} interval="preserveStartEnd" />
        <YAxis tickLine={false} axisLine={false} width={44} />
        <ChartTooltip
          cursor={false}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const row = payload[0]?.payload as { phase: string; fut: boolean }
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-xl">
                <p className="mb-1 font-semibold">{label} · {row.phase}{row.fut ? ' (planejado)' : ''}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 tnum">
                  <span className="text-muted-foreground">Prescrito:</span>
                  <span className="text-right font-medium">{payload.find((p) => p.dataKey === 'prescrito')?.value?.toLocaleString('pt-BR')} {unit}</span>
                  <span className="text-muted-foreground">Realizado:</span>
                  <span className="text-right font-medium text-primary">
                    {payload.find((p) => p.dataKey === 'realizado')?.value?.toLocaleString('pt-BR') ?? '—'} {unit}
                  </span>
                </div>
              </div>
            )
          }}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="prescrito" fill="var(--color-prescrito)" radius={[3, 3, 0, 0]} maxBarSize={14} fillOpacity={0.55} />
        <Bar dataKey="realizado" fill="var(--color-realizado)" radius={[3, 3, 0, 0]} maxBarSize={14} />
      </BarChart>
    </ChartContainer>
  )
}

// ---------------------------------------------------------------- Curva de carga & fadiga
const curveConfig: ChartConfig = {
  load: { label: 'Carga semanal (UA)', color: 'var(--chart-4)' },
  fitness: { label: 'Fitness (42d)', color: 'var(--chart-1)' },
  fatigue: { label: 'Fadiga (7d)', color: 'var(--chart-3)' },
  form: { label: 'Forma', color: 'var(--chart-2)' },
}

export function LoadCurveChart({ data }: { data: CurvePoint[] }) {
  const rows = data.map((d) => ({ ...d, isFuture: d.isFuture }))
  return (
    <ChartContainer config={curveConfig} className="h-[300px] w-full">
      <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} minTickGap={12} interval="preserveStartEnd" />
        <YAxis tickLine={false} axisLine={false} width={44} />
        <ChartTooltip
          cursor={{ stroke: 'var(--border)' }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const d = payload[0]?.payload as CurvePoint
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-xl">
                <p className="mb-1 font-semibold">{label}{d.isFuture ? ' · projeção' : ''}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 tnum">
                  <span className="text-muted-foreground">Carga:</span><span className="text-right font-medium">{d.load.toLocaleString('pt-BR')} UA</span>
                  <span className="text-muted-foreground">Fitness:</span><span className="text-right font-medium text-[var(--chart-1)]">{d.fitness.toLocaleString('pt-BR')}</span>
                  <span className="text-muted-foreground">Fadiga:</span><span className="text-right font-medium text-[var(--chart-3)]">{d.fatigue.toLocaleString('pt-BR')}</span>
                  <span className="text-muted-foreground">Forma:</span><span className="text-right font-medium text-[var(--chart-2)]">{d.form.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            )
          }}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Area type="monotone" dataKey="load" stroke="var(--color-load)" strokeWidth={1.5} fill="url(#loadFill)" />
        <Line type="monotone" dataKey="fitness" stroke="var(--color-fitness)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="fatigue" stroke="var(--color-fatigue)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="form" stroke="var(--color-form)" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
      </ComposedChart>
    </ChartContainer>
  )
}

// ---------------------------------------------------------------- Aderência
export function AdherenceChart({ data }: { data: WeeklySeriesPoint[] }) {
  const rows = data
    .filter((d) => !d.isFuture && d.adherencePct != null)
    .map((d) => ({ label: `S${d.weekNumber}`, aderencia: d.adherencePct as number }))
  return (
    <ChartContainer
      config={{ aderencia: { label: 'Aderência (%)', color: 'var(--chart-1)' } } satisfies ChartConfig}
      className="h-[220px] w-full"
    >
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} minTickGap={10} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={44} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ReferenceLine y={90} stroke="var(--chart-2)" strokeDasharray="4 3" />
        <Bar dataKey="aderencia" radius={[3, 3, 0, 0]} maxBarSize={26}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.aderencia >= 90 ? 'var(--chart-1)' : r.aderencia >= 70 ? 'var(--chart-2)' : 'var(--chart-3)'} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

// ---------------------------------------------------------------- Distribuição por modalidade
const MODALITY_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-5)', 'var(--primary)', 'var(--chart-4)', 'oklch(0.6 0.02 286)']

export function ModalityChart({ data }: { data: { type: string; load: number; pct: number }[] }) {
  const rows = data.filter((d) => d.load > 0)
  const pieConfig: ChartConfig = { carga: { label: 'Carga (UA)' } }
  if (!rows.length) {
    return <p className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">Sem carga registrada nos últimos 28 dias.</p>
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <ChartContainer
        config={pieConfig}
        className="h-[170px] w-full"
      >
        <PieChart>
          <ChartTooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const p = payload[0]
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-xl tnum">
                <p className="font-semibold">{p.name}</p>
                <p className="text-muted-foreground">{(p.value as number).toLocaleString('pt-BR')} UA · {Math.round((p as unknown as { payload?: { pct?: number } }).payload?.pct ?? 0)}%</p>
              </div>
            )
          }} />
          <Pie data={rows} dataKey="load" nameKey="type" innerRadius={45} outerRadius={68} paddingAngle={2} strokeWidth={0}>
            {rows.map((_, i) => <Cell key={i} fill={MODALITY_COLORS[i % MODALITY_COLORS.length]} />)}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="mt-1 w-full space-y-1">
        {rows.map((r, i) => (
          <li key={r.type} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 truncate">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: MODALITY_COLORS[i % MODALITY_COLORS.length] }} />
              <span className="truncate">{SESSION_TYPE_META[r.type as SessionType]?.label ?? r.type}</span>
            </span>
            <span className="tnum text-muted-foreground shrink-0">{r.pct}% · {r.load.toLocaleString('pt-BR')} UA</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------- Sparkline de bem-estar
export function WellnessSpark({ data, dataKey, color, label, invert }: {
  data: WellnessDTO[]; dataKey: keyof WellnessDTO; color: string; label: string; invert?: boolean
}) {
  const rows = [...data].reverse().map((d) => ({
    day: String(new Date(d.date).getUTCDate()),
    v: d[dataKey] as number | null,
  })).filter((r) => r.v != null)
  if (rows.length < 2) {
    return <div className="flex h-[64px] items-center justify-center text-xs text-muted-foreground">{label}: dados insuficientes</div>
  }
  const sparkConfig: ChartConfig = { v: { label, color } }
  return (
    <div>
      <p className="mb-0.5 text-[11px] text-muted-foreground">{label}</p>
      <ChartContainer config={sparkConfig} className="h-[56px] w-full">
        <LineChart data={rows} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <ChartTooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="rounded border bg-popover px-2 py-1 text-xs shadow tnum">
                {label}: {payload[0].value as number}
              </div>
            )
          }} />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
        </LineChart>
      </ChartContainer>
    </div>
  )
}

// fase sólida export re-export para conveniência
export { PHASE_SOLID }

// helpers de formatação usados nos tooltips dos tabs
export { fmtKm, fmtClock }
