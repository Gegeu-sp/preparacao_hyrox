'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fmtClock, fmtClockHms } from '@/lib/format'
import type {
  PeriodizationProgressionSummaryDTO,
  SessionEvolutionPointDTO,
} from '@/lib/types'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import {
  Activity,
  ArrowUpRight,
  Dumbbell,
  Footprints,
  Flame,
  HeartPulse,
  TrendingDown,
} from 'lucide-react'

const FOCUS_META: Record<
  SessionEvolutionPointDTO['primaryFocus'],
  { label: string; colorClass: string }
> = {
  BASELINE: {
    label: 'Linha de Base S1',
    colorClass: 'border-zinc-500/40 bg-zinc-500/15 text-zinc-300',
  },
  RUNNING: {
    label: 'Motor Aeróbio & Pacing',
    colorClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
  STRENGTH: {
    label: 'Força & Tonelagem',
    colorClass: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  },
  STATIONS: {
    label: 'Workouts & Roxzone',
    colorClass: 'border-lime-500/40 bg-lime-500/15 text-lime-300',
  },
  RECOVERY: {
    label: 'Regeneração & Forma',
    colorClass: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  },
}

function FocusIcon({ focus }: { focus: SessionEvolutionPointDTO['primaryFocus'] }) {
  if (focus === 'RUNNING') return <Footprints className="size-3.5 text-emerald-400" />
  if (focus === 'STRENGTH') return <Dumbbell className="size-3.5 text-amber-400" />
  if (focus === 'STATIONS') return <Flame className="size-3.5 text-lime-400" />
  if (focus === 'RECOVERY') return <HeartPulse className="size-3.5 text-emerald-300" />
  return <Activity className="size-3.5 text-zinc-400" />
}

export function HyresultEvolutionTimeline({
  progression,
  sessionEvolution,
  firstWeekId,
  onGoToWeek,
}: {
  progression: PeriodizationProgressionSummaryDTO
  sessionEvolution: SessionEvolutionPointDTO[]
  firstWeekId?: string
  onGoToWeek: (weekId: string) => void
}) {
  const chartData = sessionEvolution.map((pt) => ({
    ...pt,
    xLabel: pt.index === 0 ? 'S1 Base' : `#${pt.index} (${pt.dateFormatted})`,
  }))

  const allTotals = sessionEvolution.map((p) => p.totalTimeSec)
  const minTime = Math.max(2400, Math.floor((Math.min(...allTotals) - 45) / 30) * 30)
  const maxTime = Math.ceil((Math.max(...allTotals) + 45) / 30) * 30

  // Lista na tabela em ordem reversa (treino mais recente no topo) mantendo o ponto 0 no final
  const feedRows = [...sessionEvolution].reverse()

  return (
    <Card className="border-emerald-500/25 bg-gradient-to-br from-card via-card to-emerald-950/15">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[11px] font-bold">
                TELEMETRIA VIVA TREINO A TREINO
              </Badge>
              <Badge variant="outline" className="text-[11px] text-lime-300 border-lime-500/30">
                {progression.completedSessionsCount} / {progression.totalPlannedSessionsToDate} treinos confirmados até S{progression.currentWeekNumber} ·{' '}
                {progression.gainAchievedFormatted} economizados desde a S1
              </Badge>
            </div>
            <CardTitle className="mt-2 flex items-center gap-2 text-base font-black sm:text-lg">
              <TrendingDown className="size-5 text-emerald-400" />
              Evolução HYRESULT Treino a Treino (Impacto Real de Cada Sessão)
            </CardTitle>
            <CardDescription className="text-xs">
              Cada treino concluído no Diário de Treino (Corrida, Força/Tonelagem, Testes ou Bricks Híbridos)
              recalcula os 3 Pilares (Running, Workouts e Roxzone), o Fade Index e o Percentil na divisão.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-background/60 px-3.5 py-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Linha de Base → Hoje → Meta S28
              </p>
              <p className="font-mono text-xs font-bold">
                <span className="text-zinc-400">{progression.baselineFormatted}</span>
                {' → '}
                <span className="text-emerald-400 font-black">
                  {progression.currentSimulatedFormatted}
                </span>
                {' → '}
                <span className="text-lime-300">{progression.targetWeek28Formatted}</span>
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Gráfico de Evolução Treino a Treino (#0 Baseline -> #N Último Treino) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-xl border bg-background/40 p-3 lg:col-span-7">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold">
                Queda do Tempo Total HYRESULT & Elevação de Percentil por Sessão Executada
              </p>
              <span className="text-[11px] text-muted-foreground">
                Eixo Esquerdo: Tempo Total · Eixo Direito: Percentil da Divisão
              </span>
            </div>
            <div className="h-[245px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="hyrLiveEvoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="xLabel" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                  <YAxis
                    yAxisId="time"
                    domain={[minTime, maxTime]}
                    tick={{ fill: '#10b981', fontSize: 10 }}
                    tickFormatter={(v) => fmtClockHms(Number(v))}
                    width={64}
                  />
                  <YAxis
                    yAxisId="pct"
                    orientation="right"
                    domain={[30, 99]}
                    tick={{ fill: '#a3e635', fontSize: 10 }}
                    tickFormatter={(v) => `P${v}`}
                    width={38}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      borderRadius: '10px',
                      fontSize: '12px',
                    }}
                    formatter={(val: number, name: string) => {
                      if (name.includes('Percentil')) return [`P${val} (Top ${100 - val}%)`, name]
                      return [fmtClockHms(val), name]
                    }}
                    labelFormatter={(_, payload) => {
                      const pt = payload?.[0]?.payload as SessionEvolutionPointDTO | undefined
                      if (!pt) return ''
                      return `${pt.index === 0 ? 'Diagnóstico Inicial' : `Treino #${pt.index} (S${pt.weekNumber} · ${pt.dateFormatted})`}: ${pt.sessionTitle}`
                    }}
                  />
                  <Area
                    yAxisId="time"
                    type="monotone"
                    dataKey="totalTimeSec"
                    name="Tempo Total HYRESULT Simulado"
                    stroke="#10b981"
                    fill="url(#hyrLiveEvoGrad)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981' }}
                  />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="overallPercentile"
                    name="Percentil Geral na Divisão"
                    stroke="#a3e635"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={{ r: 3, fill: '#a3e635' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resumo de Evolução dos 3 Pilares desde a Linha de Base S1 */}
          <div className="flex flex-col justify-between rounded-xl border bg-background/40 p-3.5 lg:col-span-5">
            <div>
              <p className="text-xs font-bold">
                Decomposição do Ganho Conquistado nos Treinos ({progression.gainAchievedFormatted})
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Comparação direta entre o Diagnóstico Inicial (#0) e o Estado Atual (#{sessionEvolution.length - 1})
              </p>

              {(() => {
                const basePt = sessionEvolution[0]
                const currPt = sessionEvolution[sessionEvolution.length - 1] ?? basePt
                const runGain = basePt.totalRunSec - currPt.totalRunSec
                const workGain = basePt.totalWorkSec - currPt.totalWorkSec
                const roxGain = basePt.totalRoxSec - currPt.totalRoxSec
                const fadeDrop =
                  Math.round((basePt.fadeIndexPct - currPt.fadeIndexPct) * 10) / 10

                return (
                  <div className="mt-3 space-y-2.5">
                    <div className="flex items-center justify-between rounded-lg border bg-card/60 px-3 py-2 text-xs">
                      <span className="flex items-center gap-2 font-semibold">
                        <Footprints className="size-3.5 text-emerald-400" />
                        Corrida (8 × 1 km)
                      </span>
                      <div className="text-right font-mono">
                        <span className="text-muted-foreground">
                          {fmtClockHms(basePt.totalRunSec)} →{' '}
                        </span>
                        <strong className="text-foreground">{fmtClockHms(currPt.totalRunSec)}</strong>
                        <Badge className="ml-2 bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                          -{fmtClock(Math.max(0, runGain))}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border bg-card/60 px-3 py-2 text-xs">
                      <span className="flex items-center gap-2 font-semibold">
                        <Flame className="size-3.5 text-lime-400" />
                        Workouts (8 Estações)
                      </span>
                      <div className="text-right font-mono">
                        <span className="text-muted-foreground">
                          {fmtClockHms(basePt.totalWorkSec)} →{' '}
                        </span>
                        <strong className="text-foreground">{fmtClockHms(currPt.totalWorkSec)}</strong>
                        <Badge className="ml-2 bg-lime-500/15 text-lime-300 border-lime-500/30 text-[10px]">
                          -{fmtClock(Math.max(0, workGain))}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border bg-card/60 px-3 py-2 text-xs">
                      <span className="flex items-center gap-2 font-semibold">
                        <Activity className="size-3.5 text-amber-400" />
                        Roxzone (8 Transições)
                      </span>
                      <div className="text-right font-mono">
                        <span className="text-muted-foreground">
                          {fmtClock(basePt.totalRoxSec)} →{' '}
                        </span>
                        <strong className="text-foreground">{fmtClock(currPt.totalRoxSec)}</strong>
                        <Badge className="ml-2 bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">
                          -{fmtClock(Math.max(0, roxGain))}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs">
                      <span className="text-muted-foreground">
                        Evolução do Fade Index & Percentil Geral
                      </span>
                      <span className="font-mono font-bold text-emerald-300">
                        P{basePt.overallPercentile} → P{currPt.overallPercentile} (Fade{' '}
                        {fadeDrop >= 0 ? `-${fadeDrop}%` : `+${Math.abs(fadeDrop)}%`})
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Feed Cronológico de Impacto por Sessão Concluída */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Histórico de Impacto Treino a Treino ({progression.completedSessionsCount} treinos confirmados + Linha de Base S1)
            </h4>
            <span className="text-[11px] text-muted-foreground">
              Conclua ou edite qualquer treino no Diário de Treino para adicionar um novo marco ao vivo
            </span>
          </div>

          {progression.completedSessionsCount === 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs">
              <div>
                <p className="font-bold text-amber-300">
                  0 treinos confirmados até o momento — Estado Inicial da Periodização (S1)
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Nenhum treino foi pré-marcado automaticamente. Confirme o seu primeiro treino no Diário de Treino para iniciar a evolução treino a treino no Painel, Periodização, Previsão de Prova e HYRESULT.
                </p>
              </div>
              {firstWeekId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/15 text-xs font-semibold text-amber-200 hover:bg-amber-500/25"
                  onClick={() => onGoToWeek(firstWeekId)}
                >
                  Confirmar 1º Treino na Semana 1
                  <ArrowUpRight className="ml-1 size-3.5" />
                </Button>
              )}
            </div>
          )}

          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {feedRows.map((pt) => {
              const focusMeta = FOCUS_META[pt.primaryFocus]
              const isBaseline = pt.index === 0
              return (
                <div
                  key={pt.sessionId ?? 'baseline-0'}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                    pt.index === sessionEvolution.length - 1 && !isBaseline
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'bg-background/40 hover:bg-background/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-card font-mono text-xs font-black">
                      #{pt.index}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          S{pt.weekNumber} · {pt.phaseCode} · {pt.dateFormatted}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] ${focusMeta.colorClass}`}>
                          <span className="mr-1 inline-flex">
                            <FocusIcon focus={pt.primaryFocus} />
                          </span>
                          {focusMeta.label}
                        </Badge>
                        {!isBaseline && (
                          <Badge variant="outline" className="text-[10px] text-zinc-300">
                            Execução {pt.executionQualityPct}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-bold text-foreground">{pt.sessionTitle}</p>
                      <p className="text-[11px] text-muted-foreground">{pt.stimulusSummary}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isBaseline && (
                          <Badge
                            className={
                              pt.deltaFromPrevSec <= 0
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]'
                            }
                          >
                            {pt.deltaFromPrevSec <= 0
                              ? `-${fmtClock(Math.abs(pt.deltaFromPrevSec))}`
                              : `+${fmtClock(pt.deltaFromPrevSec)}`}
                          </Badge>
                        )}
                        <span className="text-sm font-black text-foreground">
                          {pt.totalTimeFormatted}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Run {fmtClockHms(pt.totalRunSec)} · Work {fmtClockHms(pt.totalWorkSec)} · Rox{' '}
                        {fmtClock(pt.totalRoxSec)} · <strong className="text-lime-300">P{pt.overallPercentile}</strong>
                      </p>
                    </div>

                    {pt.weekId && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0"
                        onClick={() => onGoToWeek(pt.weekId!)}
                        title={`Abrir Semana ${pt.weekNumber} no Diário`}
                      >
                        <ArrowUpRight className="size-4 text-primary" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
