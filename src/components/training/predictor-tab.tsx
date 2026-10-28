'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, TriangleAlert, Info } from 'lucide-react'
import { PredictorCards } from '@/components/training/predictor-cards'
import { PredictorPeriodizationCurve } from '@/components/training/predictor-periodization-curve'
import { PredictorSegmentsTable } from '@/components/training/predictor-segments-table'
import { PredictorSimulator } from '@/components/training/predictor-simulator'
import { simulatePredictionScenario } from '@/lib/predictions-calc'
import type { RacePredictionDTO, PredictionScenarioInput } from '@/lib/types'

export function PredictorTab({
  athleteId,
  refreshKey,
  onGoToWeek,
}: {
  athleteId?: string
  refreshKey?: number
  onGoToWeek?: (weekId: string) => void
}) {
  const [basePrediction, setBasePrediction] = useState<RacePredictionDTO | null>(null)
  const [activePrediction, setActivePrediction] = useState<RacePredictionDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPrediction = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const qs = athleteId ? `?athleteId=${encodeURIComponent(athleteId)}` : ''
      const res = await fetch(`/api/predictions${qs}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Não foi possível calcular a previsão de prova')
      const data: RacePredictionDTO = await res.json()
      setBasePrediction(data)
      setActivePrediction(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados preditivos')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [athleteId])

  useEffect(() => {
    void loadPrediction(refreshKey !== undefined && refreshKey > 0)
  }, [loadPrediction, refreshKey])

  const handleScenarioChange = (input: PredictionScenarioInput) => {
    if (!basePrediction) return
    const simulated = simulatePredictionScenario(basePrediction, input)
    setActivePrediction(simulated)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-36 rounded-xl sm:col-span-2" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  if (error || !activePrediction) {
    return (
      <Alert variant="destructive">
        <TriangleAlert className="size-4" />
        <AlertTitle>Erro na Previsão de Prova</AlertTitle>
        <AlertDescription className="flex items-center gap-2">
          {error ?? 'Dados não disponíveis'}
          <Button size="sm" variant="outline" onClick={() => void loadPrediction()}>
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight text-foreground sm:text-xl">
            Projeção e Simulação Dinâmica da Periodização — {activePrediction.athleteName}
          </h2>
          <p className="text-xs text-muted-foreground">
            Motor acoplado à execução real dos treinos ({activePrediction.progression.completedSessionsCount} sessões concluídas ·{' '}
            <span className="font-semibold text-emerald-400">
              {activePrediction.progression.gainAchievedFormatted}
            </span>{' '}
            conquistados desde a S1)
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadPrediction(true)}
          disabled={refreshing}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Recalcular com Diário de Treino
        </Button>
      </div>

      <PredictorCards prediction={activePrediction} />

      <PredictorPeriodizationCurve
        progression={activePrediction.progression}
        weeklyCurve={activePrediction.weeklySimulationCurve}
        onGoToWeek={onGoToWeek}
      />

      <PredictorSimulator
        warnings={activePrediction.warnings}
        onChange={handleScenarioChange}
      />

      <PredictorSegmentsTable
        segments={activePrediction.segments}
        roxzoneFormatted={activePrediction.roxzoneFormatted}
        roxzoneSec={activePrediction.roxzoneSec}
        realisticFormatted={activePrediction.realisticFormatted}
        realisticTotalSec={activePrediction.realisticTotalSec}
      />

      <div className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
        <Info className="size-4 shrink-0 text-primary mt-0.5" />
        <div>
          <strong>Metodologia Esportiva Contínua</strong>: A previsão evolui automaticamente a cada treino marcado como Concluído, Parcial ou Ajustado no Diário de Treino. Sessões de Corrida calibram o pace base e o Fade Index; sessões de Força/Tonelagem reduzem os tempos de Sleds/Farmers/Lunges e protegem as corridas 3 e 8; sessões Híbridas atualizam diretamente os splits de estações e a Roxzone.
        </div>
      </div>
    </div>
  )
}
