'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fmtClock, fmtClockHms } from '@/lib/format'
import { PHASE_META, PhaseCode } from '@/lib/constants'
import type {
  PeriodizationProgressionSummaryDTO,
  PeriodizationWeekSimulationPointDTO,
} from '@/lib/types'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { TrendingDown, CheckCircle2, Sparkles, Calendar, ArrowUpRight } from 'lucide-react'

export function PredictorPeriodizationCurve({
  progression,
  weeklyCurve,
  onGoToWeek,
}: {
  progression: PeriodizationProgressionSummaryDTO
  weeklyCurve: PeriodizationWeekSimulationPointDTO[]
  onGoToWeek?: (weekId: string) => void
}) {
  const statusStyles = {
    ADIANTADO: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    NO_ALVO: 'border-lime-500/40 bg-lime-500/15 text-lime-300',
    ATRASADO: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  }

  const allSecs = weeklyCurve.flatMap((w) => [
    w.plannedTotalSec,
    w.projectedTotalSec,
    ...(w.simulatedTotalSec != null ? [w.simulatedTotalSec] : []),
  ])
  const minSec = Math.max(2400, Math.floor((Math.min(...allSecs) - 90) / 60) * 60)
  const maxSec = Math.ceil((Math.max(...allSecs) + 90) / 60) * 60

  return (
    <Card className="border-primary/25 bg-gradient-to-br from-card via-card to-emerald-950/15">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[11px] font-bold">
                SIMULAÇÃO CONTÍNUA S1 → S28
              </Badge>
              <Badge
                variant="outline"
                className={`text-[11px] font-semibold ${statusStyles[progression.periodizationStatus]}`}
              >
                <CheckCircle2 className="mr-1 size-3" />
                {progression.periodizationStatusLabel}
              </Badge>
            </div>
            <CardTitle className="mt-2 flex items-center gap-2 text-base font-black sm:text-lg">
              <TrendingDown className="size-5 text-emerald-400" />
              Evolução da Prova Acoplada à Periodização (28 Semanas)
            </CardTitle>
            <CardDescription className="text-xs">
              Conforme cada sessão é concluída no Diário de Treino ({progression.completedSessionsCount}{' '}
              treinos executados até agora), a simulação recalcula o estado atual e reancora a curva até a
              Semana 28.
            </CardDescription>
          </div>

          {onGoToWeek && weeklyCurve.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                const cur =
                  weeklyCurve.find((w) => w.isCurrent) ??
                  weeklyCurve.find((w) => w.weekNumber === progression.currentWeekNumber) ??
                  weeklyCurve[0]
                if (cur) onGoToWeek(cur.weekId)
              }}
            >
              <Calendar className="size-3.5 text-primary" />
              Abrir S{progression.currentWeekNumber} no Diário
              <ArrowUpRight className="size-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 4 Marcos de Acompanhamento: Linha de Base S1 -> Estado Atual -> Esperado na Semana -> Meta S28 */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-background/50 p-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>1. Ponto de Partida (S1)</span>
              <Badge variant="outline" className="text-[10px]">
                Diagnóstico
              </Badge>
            </div>
            <p className="mt-1 font-mono text-xl font-black text-zinc-300">
              {progression.baselineFormatted}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Linha de base pré-periodização
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3">
            <div className="flex items-center justify-between text-[11px] text-emerald-300">
              <span className="font-bold">2. Estado Atual Simulado</span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                {progression.gainAchievedFormatted} ganhos
              </Badge>
            </div>
            <p className="mt-1 font-mono text-xl font-black text-emerald-400">
              {progression.currentSimulatedFormatted}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-200/80">
              Após {progression.completedSessionsCount} treinos concluídos ({progression.adherenceToDatePct}% aderência)
            </p>
          </div>

          <div className="rounded-xl border bg-background/50 p-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>3. Esperado na S{progression.currentWeekNumber}</span>
              <Badge variant="outline" className="text-[10px]">
                {progression.currentPhaseCode}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-xl font-black text-amber-300">
              {progression.expectedForCurrentWeekFormatted}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Delta vs curva:{' '}
              <strong
                className={
                  progression.deltaVsExpectedWeekSec <= 0 ? 'text-emerald-400' : 'text-amber-400'
                }
              >
                {progression.deltaVsExpectedWeekSec <= 0
                  ? `-${fmtClock(Math.abs(progression.deltaVsExpectedWeekSec))}`
                  : `+${fmtClock(progression.deltaVsExpectedWeekSec)}`}
              </strong>
            </p>
          </div>

          <div className="rounded-xl border border-lime-500/30 bg-lime-500/5 p-3">
            <div className="flex items-center justify-between text-[11px] text-lime-300">
              <span className="font-semibold">4. Alvo Final (Semana 28)</span>
              <Sparkles className="size-3.5 text-lime-400" />
            </div>
            <p className="mt-1 font-mono text-xl font-black text-lime-300">
              {progression.targetWeek28Formatted}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Faltam <strong className="text-foreground">{progression.remainingToGoalFormatted}</strong>{' '}
              ({progression.goalProgressPct}% do ganho atingido)
            </p>
          </div>
        </div>

        {/* Barra de progresso do ganho total planejado S1 -> S28 */}
        <div className="space-y-1.5 rounded-lg border bg-background/40 p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              Progresso conquistado rumo ao Alvo da Semana 28 (
              <strong className="text-emerald-400">{progression.gainAchievedFormatted}</strong> já
              reduzidos nos treinos realizados)
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {progression.goalProgressPct}% da evolução do ciclo
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-500"
              style={{ width: `${Math.max(4, Math.min(100, progression.goalProgressPct))}%` }}
            />
          </div>
        </div>

        {/* Gráfico ComposedChart S1 a S28 */}
        <div className="h-[290px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={weeklyCurve} margin={{ top: 10, right: 16, left: 4, bottom: 5 }}>
              <defs>
                <linearGradient id="simExecGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#a1a1aa', fontSize: 10 }}
                interval={1}
              />
              <YAxis
                domain={[minSec, maxSec]}
                tick={{ fill: '#a1a1aa', fontSize: 10 }}
                tickFormatter={(v) => fmtClockHms(Number(v))}
                width={66}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderColor: '#27272a',
                  borderRadius: '10px',
                  fontSize: '12px',
                }}
                formatter={(val: number, name: string) => [fmtClockHms(val), name]}
                labelFormatter={(label, payload) => {
                  const p = payload?.[0]?.payload as PeriodizationWeekSimulationPointDTO | undefined
                  if (!p) return String(label)
                  const phaseName =
                    PHASE_META[p.phaseCode as PhaseCode]?.label ?? p.phaseCode
                  return `Semana ${p.weekNumber} (${p.phaseCode} — ${phaseName}) · ${p.sessionsDone}/${p.sessionsTotal} treinos concluídos`
                }}
              />
              <ReferenceLine
                x={`S${progression.currentWeekNumber}`}
                stroke="#10b981"
                strokeDasharray="3 3"
                label={{
                  value: `Semana Atual (S${progression.currentWeekNumber})`,
                  fill: '#10b981',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
              <Line
                type="monotone"
                dataKey="plannedTotalSec"
                name="Curva Planejada pela Periodização"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="projectedTotalSec"
                name="Trajetória Projetada até S28 (Reancorada)"
                stroke="#a3e635"
                strokeWidth={2}
                strokeDasharray="2 3"
                dot={{ r: 2, fill: '#a3e635' }}
              />
              <Area
                type="monotone"
                dataKey="simulatedTotalSec"
                name="Simulação Real Executada (Treinos Concluídos)"
                stroke="#10b981"
                fill="url(#simExecGrad)"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 1.5, stroke: '#052e16' }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Faixa clicável das fases da periodização */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              <strong className="text-foreground">Linha Sólida Esmeralda:</strong> Estado real simulado
              pelas sessões já concluídas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-500" />
              <strong className="text-foreground">Tracejado Âmbar:</strong> Curva científica prescrita
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-lime-400" />
              <strong className="text-foreground">Pontilhado Lime:</strong> Projeção reancorada até a prova
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

