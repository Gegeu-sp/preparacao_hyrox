'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Timer, TrendingDown, TrendingUp, ShieldCheck, Footprints, Dumbbell, ArrowRightLeft, Target } from 'lucide-react'
import type { RacePredictionDTO } from '@/lib/types'

export function PredictorCards({ prediction }: { prediction: RacePredictionDTO }) {
  const isAhead = prediction.isWithinGoal

  const confidenceBadge = {
    ALTA: { label: 'Confiança Alta', classes: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400' },
    MEDIA: { label: 'Confiança Média', classes: 'border-amber-500/40 bg-amber-500/15 text-amber-400' },
    ESTIMATIVA_INICIAL: { label: 'Estimativa Fisiológica', classes: 'border-zinc-500/40 bg-zinc-500/15 text-zinc-300' },
  }[prediction.confidenceLevel]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card Principal: Tempo Realista + Delta */}
      <Card className="p-4 sm:col-span-2 border-primary/30 bg-gradient-to-br from-card to-primary/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Projeção de Prova · Cenário Realista
              </span>
              <Badge variant="outline" className={`text-[10px] font-medium ${confidenceBadge.classes}`}>
                <ShieldCheck className="mr-1 size-3" /> {confidenceBadge.label}
              </Badge>
            </div>
            <div className="mt-2 text-4xl sm:text-5xl font-black font-mono tracking-tight text-primary tnum">
              {prediction.realisticFormatted}
            </div>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Timer className="size-5" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Target className="size-3.5" /> Meta:{' '}
            <strong className="text-foreground font-mono">{prediction.targetGoalTimeFormatted}</strong>
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
              isAhead
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}
          >
            {isAhead ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
            {prediction.deltaFormatted} ({prediction.deltaPct > 0 ? `+${prediction.deltaPct}%` : `${prediction.deltaPct}%`})
          </span>
          <span className="text-muted-foreground ml-auto text-[11px]">
            {isAhead ? '✓ Dentro do objetivo' : '⚠ Necessita ganho de ritmo'}
          </span>
        </div>
      </Card>

      {/* Card Cenários: Otimista vs Conservador */}
      <Card className="p-4 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Faixa de Variação
          </span>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400" /> Cenário Otimista
              </span>
              <span className="font-mono font-bold text-sm text-foreground tnum">
                {prediction.optimisticFormatted}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-400 font-medium flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-400" /> Cenário Conservador
              </span>
              <span className="font-mono font-bold text-sm text-foreground tnum">
                {prediction.conservativeFormatted}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground border-t pt-2">
          Janela de dispersão baseada em fadiga e consistência nas transições
        </p>
      </Card>

      {/* Card Composição: Corridas vs Estações vs Roxzone */}
      <Card className="p-4 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Decomposição de Carga
          </span>
          <div className="mt-2.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Footprints className="size-3.5 text-emerald-400" /> 8 Corridas (8 km)
              </span>
              <span className="font-mono font-semibold text-foreground tnum">
                {prediction.totalRunFormatted}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Dumbbell className="size-3.5 text-amber-400" /> 8 Estações
              </span>
              <span className="font-mono font-semibold text-foreground tnum">
                {prediction.totalStationsFormatted}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <ArrowRightLeft className="size-3.5 text-zinc-400" /> Roxzone (Transições)
              </span>
              <span className="font-mono font-semibold text-foreground tnum">
                {prediction.roxzoneFormatted}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="bg-emerald-500"
            style={{ width: `${(prediction.totalRunSec / prediction.realisticTotalSec) * 100}%` }}
          />
          <div
            className="bg-amber-500"
            style={{ width: `${(prediction.totalStationsSec / prediction.realisticTotalSec) * 100}%` }}
          />
          <div
            className="bg-zinc-500"
            style={{ width: `${(prediction.roxzoneSec / prediction.realisticTotalSec) * 100}%` }}
          />
        </div>
      </Card>
    </div>
  )
}
