'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { Footprints, Dumbbell, Repeat, Trophy, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtClock } from '@/lib/format'
import type { HyresultAnalysisDTO } from '@/lib/types'

export function HyresultRadarAndPillars({ analysis }: { analysis: HyresultAnalysisDTO }) {
  const { overall, pillars, radarData, stationAnalytics } = analysis

  const pillarColor: Record<string, string> = {
    RUNNING: 'bg-emerald-500',
    WORKOUTS: 'bg-lime-500',
    ROXZONE: 'bg-amber-500',
  }

  return (
    <div className="space-y-4">
      {/* Resumo Oficial HYRESULT + Barra Proporcional dos 3 Pilares */}
      <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary text-primary-foreground text-[11px] font-bold">
                  HYRESULT #{analysis.activeSource.resultCode}
                </Badge>
                {analysis.activeSource.sourceType === 'LIVE_EVOLUTION' && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[11px] font-bold">
                    AO VIVO · {analysis.progression.completedSessionsCount} TREINOS COMPUTADOS
                  </Badge>
                )}
                <Badge variant="outline" className="text-[11px]">
                  {analysis.divisionLabel} · {analysis.ageGroup}
                </Badge>
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-[11px] text-emerald-400">
                  {overall.overallRankBadge}
                </Badge>
                <Badge variant="outline" className="border-lime-500/40 bg-lime-500/10 text-[11px] text-lime-300">
                  {analysis.progression.gainAchievedFormatted} vs Diagnóstico S1
                </Badge>
              </div>
              <CardTitle className="mt-1.5 text-lg font-black sm:text-xl">
                {analysis.activeSource.title}
              </CardTitle>
              <CardDescription className="text-xs">
                Arquétipo: <strong className="text-foreground">{overall.athleteProfileArchetype}</strong> · Economia imediata nos gargalos:{' '}
                <strong className="text-primary">−{analysis.prescription.timeSavingsFormatted}</strong>
              </CardDescription>
            </div>

            <div className="flex items-center gap-4 rounded-xl border bg-background/80 px-4 py-2.5">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tempo Total</p>
                <p className="text-2xl font-black tracking-tight tnum text-foreground">
                  {overall.totalTimeFormatted}
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Meta S28</p>
                <p className="text-base font-bold tnum text-primary">{overall.goalTimeFormatted}</p>
                <p
                  className={cn(
                    'text-[11px] font-semibold tnum',
                    overall.deltaVsGoalSec <= 0 ? 'text-emerald-500' : 'text-amber-500',
                  )}
                >
                  {overall.deltaVsGoalSec <= 0
                    ? `-${fmtClock(Math.abs(overall.deltaVsGoalSec))} abaixo da meta`
                    : `+${fmtClock(overall.deltaVsGoalSec)} até a meta`}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Barra horizontal empilhada dos 3 pilares */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>Decomposição Oficial dos 3 Pilares HYRESULT (Corrida vs. Workouts vs. Roxzone)</span>
              <span className="tnum">100% = {overall.totalTimeFormatted}</span>
            </div>
            <div className="flex h-6 w-full overflow-hidden rounded-lg border">
              {pillars.map((p) => (
                <div
                  key={p.key}
                  style={{ width: `${p.sharePct}%` }}
                  className={cn(
                    'flex items-center justify-center px-1.5 text-[10px] font-bold text-zinc-950 transition-all',
                    pillarColor[p.key],
                  )}
                  title={`${p.label}: ${p.timeFormatted} (${p.sharePct}%)`}
                >
                  <span className="truncate">{p.sharePct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3 Cartões de Pilares */}
          <div className="grid gap-3 md:grid-cols-3">
            {pillars.map((p) => {
              const Icon = p.key === 'RUNNING' ? Footprints : p.key === 'WORKOUTS' ? Dumbbell : Repeat
              const deltaPositive = p.deltaSec > 0
              return (
                <div key={p.key} className="rounded-xl border bg-card/90 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <Icon className="size-4 text-primary" />
                      {p.label}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] tnum',
                        p.percentile >= 75
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : p.percentile >= 50
                            ? 'border-lime-500/40 bg-lime-500/10 text-lime-400'
                            : 'border-amber-500/40 bg-amber-500/10 text-amber-400',
                      )}
                    >
                      P{p.percentile} · {p.rankLabel.split(' ')[0]} {p.rankLabel.split(' ')[1]}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <p className="text-2xl font-black tnum">{p.timeFormatted}</p>
                    <span className="text-xs font-semibold tnum text-muted-foreground">
                      {p.sharePct}% da prova
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Alvo S28: {fmtClock(p.targetTimeSec)}</span>
                    <span className={cn('font-semibold tnum', deltaPositive ? 'text-amber-500' : 'text-emerald-500')}>
                      {deltaPositive ? `+${fmtClock(p.deltaSec)}` : `-${fmtClock(Math.abs(p.deltaSec))}`} vs alvo
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Radar 10 Eixos + Ranking de Percentis por Estação */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4 text-primary" /> Radar HYRESULT — Perfil Simétrico (Percentis)
            </CardTitle>
            <CardDescription className="text-xs">
              Comparação do percentil atual do atleta na divisão ({analysis.divisionLabel}) vs. Alvo de Pico na Semana 28
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                  <PolarGrid stroke="rgba(161, 161, 170, 0.25)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Alvo Semana 28 (Periodização)"
                    dataKey="targetPercentile"
                    stroke="#84cc16"
                    fill="#84cc16"
                    fillOpacity={0.14}
                    strokeDasharray="4 4"
                  />
                  <Radar
                    name="Diagnóstico Inicial (S1)"
                    dataKey="baselinePercentile"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.1}
                    strokeDasharray="2 2"
                  />
                  <Radar
                    name={`Estado Ativo (${analysis.activeSource.resultCode})`}
                    dataKey="athletePercentile"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.38}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(24, 24, 27, 0.95)',
                      borderColor: 'rgba(63, 63, 70, 0.8)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Benchmark de Percentis por Estação & Time Savings</CardTitle>
                <CardDescription className="text-xs">
                  Ponto forte: <strong className="text-emerald-400">{stationAnalytics.strongestStation}</strong> · Gargalo prioritário:{' '}
                  <strong className="text-amber-400">{stationAnalytics.weakestStation}</strong>
                </CardDescription>
              </div>
              <Badge variant="outline" className="gap-1 border-primary/40 text-xs text-primary">
                <TrendingDown className="size-3.5" /> Ganho potencial: −{analysis.prescription.timeSavingsFormatted}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {stationAnalytics.splits.map((st) => {
              const barColor =
                st.status === 'ELITE'
                  ? 'bg-emerald-500'
                  : st.status === 'FORTE'
                    ? 'bg-lime-500'
                    : st.status === 'MEDIANO'
                      ? 'bg-amber-500'
                      : 'bg-red-500'

              return (
                <div key={st.stationCode} className="space-y-1 rounded-lg border bg-muted/20 p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded bg-muted font-bold tnum text-[10px]">
                        {st.order}
                      </span>
                      <span className="font-semibold">{st.label}</span>
                      <span className="hidden text-[11px] text-muted-foreground sm:inline">
                        ({st.officialLoadDesc})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 tnum">
                      <span className="font-bold text-foreground">{st.timeFormatted}</span>
                      <span className="text-[11px] text-muted-foreground">/ alvo {st.targetFormatted}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'px-1.5 py-0 text-[10px]',
                          st.status === 'ELITE' || st.status === 'FORTE'
                            ? 'border-emerald-500/40 text-emerald-400'
                            : st.status === 'MEDIANO'
                              ? 'border-amber-500/40 text-amber-400'
                              : 'border-red-500/40 text-red-400',
                        )}
                      >
                        P{st.percentile} (Top {Math.max(1, 100 - st.percentile)}%)
                      </Badge>
                      {st.timeSavingsPotentialSec > 5 && (
                        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0 text-[10px]">
                          −{st.timeSavingsPotentialSec}s potencial
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full transition-all', barColor)}
                        style={{ width: `${st.percentile}%` }}
                      />
                    </div>
                    <span className="text-[10px] tnum text-muted-foreground">
                      Mediana div: {fmtClock(st.divisionMedianSec)} · Top 10%: {fmtClock(st.divisionTop10Sec)}
                    </span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

