'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { Footprints, Repeat, Flame, ArrowRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtClock } from '@/lib/format'
import { PhaseBadge } from './bits'
import type { HyresultAnalysisDTO } from '@/lib/types'

export function HyresultSplitsAndRoxzone({
  analysis,
  onJumpToPhase,
}: {
  analysis: HyresultAnalysisDTO
  onJumpToPhase: (phaseCode: string) => void
}) {
  const { runAnalytics, roxzoneAnalytics, prescription } = analysis

  const pacingLabel =
    runAnalytics.pacingStrategyClassification === 'EVEN_PACING'
      ? 'Ritmo Consistente (Even Pacing)'
      : runAnalytics.pacingStrategyClassification === 'CONTROLLED_FADE'
        ? 'Degradação Controlada (Positive Split Moderado)'
        : 'Saída Agressiva com Quebra Final (Fly & Die)'

  return (
    <div className="space-y-4">
      {/* Análise das 8 Corridas (Run Splits & Fade Index) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Footprints className="size-4 text-primary" /> Consistência de Corrida & Degradação (Runs 1–8)
              </CardTitle>
              <CardDescription className="text-xs">
                Pace médio: <strong className="text-foreground">{runAnalytics.avgPaceFormatted}</strong> · Fade Index:{' '}
                <strong className={runAnalytics.fadeIndexPct > 7 ? 'text-red-400' : 'text-emerald-400'}>
                  {runAnalytics.fadeIndexPct > 0 ? `+${runAnalytics.fadeIndexPct}%` : `${runAnalytics.fadeIndexPct}%`}
                </strong>{' '}
                ({pacingLabel})
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-300 tnum">
                Custo Pós-Sled Push (Run 3): +{runAnalytics.postSledPushDropSec}s
              </Badge>
              <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-300 tnum">
                Custo Pós-Lunges (Run 8): +{runAnalytics.postLungesDropSec}s
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={runAnalytics.splits} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(161,161,170,0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  domain={['dataMin - 20', 'dataMax + 15']}
                  tickFormatter={(v: number) => fmtClock(v)}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    fmtClock(value),
                    name === 'timeSec' ? 'Split Analisado' : 'Alvo S28',
                  ]}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload as { precedingStationLabel?: string } | undefined
                    return item?.precedingStationLabel
                      ? `${String(label)} — ${item.precedingStationLabel}`
                      : String(label)
                  }}
                  contentStyle={{
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    borderColor: 'rgba(63, 63, 70, 0.8)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <ReferenceLine
                  y={runAnalytics.avgPaceSec}
                  stroke="#a1a1aa"
                  strokeDasharray="4 4"
                  label={{ value: `Média ${fmtClock(runAnalytics.avgPaceSec)}`, position: 'insideTopRight', fontSize: 10, fill: '#a1a1aa' }}
                />
                <Bar dataKey="timeSec" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {runAnalytics.splits.map((s) => (
                    <Cell
                      key={s.runNumber}
                      fill={s.isCompromisedCritical ? '#f59e0b' : '#10b981'}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="targetTimeSec"
                  stroke="#84cc16"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="targetTimeSec"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {runAnalytics.splits.map((r) => (
              <div
                key={r.runNumber}
                className={cn(
                  'rounded-lg border p-2 text-xs',
                  r.isCompromisedCritical ? 'border-amber-500/40 bg-amber-500/5' : 'bg-muted/20',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{r.label}</span>
                  <span
                    className={cn(
                      'text-[10px] font-semibold tnum',
                      r.deviationFromMeanSec > 5
                        ? 'text-amber-400'
                        : r.deviationFromMeanSec < -3
                          ? 'text-emerald-400'
                          : 'text-muted-foreground',
                    )}
                  >
                    {r.deviationFromMeanSec >= 0 ? `+${r.deviationFromMeanSec}s` : `${r.deviationFromMeanSec}s`}
                  </span>
                </div>
                <p className="mt-0.5 text-base font-black tnum">{r.timeFormatted}</p>
                <p className="truncate text-[10px] text-muted-foreground" title={r.precedingStationLabel}>
                  {r.precedingStationLabel}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Raio-X da Roxzone + Prescrição Direta na Periodização */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Repeat className="size-4 text-primary" /> Raio-X da Roxzone (8 Transições In/Out)
            </CardTitle>
            <CardDescription className="text-xs">
              Total acumulado: <strong className="text-foreground">{roxzoneAnalytics.totalRoxzoneFormatted}</strong> · Média:{' '}
              <strong>{roxzoneAnalytics.avgPerTransitionSec}s/transição</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {roxzoneAnalytics.splits.map((rx) => (
              <div
                key={rx.transitionNumber}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs',
                  rx.efficiencyStatus === 'LENTA'
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : rx.efficiencyStatus === 'OTIMA'
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'bg-muted/20',
                )}
              >
                <div className="min-w-0 pr-2">
                  <p className="truncate font-semibold">{rx.stationLabel}</p>
                  <p className="text-[10px] text-muted-foreground">Alvo: {rx.targetSec}s</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'shrink-0 font-bold tnum',
                    rx.efficiencyStatus === 'LENTA'
                      ? 'border-amber-500/50 text-amber-300'
                      : 'border-emerald-500/40 text-emerald-400',
                  )}
                >
                  {rx.inOutFormatted}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-primary/40 lg:col-span-7">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flame className="size-4 text-primary" /> Diagnóstico Prescritivo Integrado à Periodização
                </CardTitle>
                <CardDescription className="text-xs">
                  Fase ativa do atleta: <PhaseBadge code={prescription.currentPhaseCode} /> · Gargalos prioritários:{' '}
                  <strong>{prescription.primaryLimiter}</strong> & <strong>{prescription.secondaryLimiter}</strong>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {prescription.recommendations.map((rec, i) => (
              <div key={i} className="rounded-xl border bg-muted/25 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <CheckCircle2 className="size-4 text-primary" />
                    {rec.title}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => onJumpToPhase(rec.targetPhaseCode)}
                  >
                    Ver fase <PhaseBadge code={rec.targetPhaseCode} /> <ArrowRight className="size-3" />
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{rec.finding}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-foreground/90">{rec.periodizationAction}</p>
                <p className="mt-1 text-[11px] font-semibold text-primary">
                  Sessões-chave na periodização: {rec.keyWorkoutsToFocus}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

