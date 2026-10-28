'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { PlusCircle, RefreshCw, TriangleAlert, BarChart3, Loader2 } from 'lucide-react'
import { HyresultRadarAndPillars } from './hyresult-radar-and-pillars'
import { HyresultEvolutionTimeline } from './hyresult-evolution-timeline'
import { HyresultSplitsAndRoxzone } from './hyresult-splits-and-roxzone'
import { PredictorPeriodizationCurve } from './predictor-periodization-curve'
import type { HyresultAnalysisDTO, PlanResponse } from '@/lib/types'

export function HyresultTab({
  athleteId,
  plan,
  refreshKey,
  onGoToWeek,
}: {
  athleteId: string
  plan: PlanResponse
  refreshKey?: number
  onGoToWeek: (weekId: string) => void
}) {
  const [analysis, setAnalysis] = useState<HyresultAnalysisDTO | null>(null)
  const [sourceId, setSourceId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal de importação / registro de resultado HYRESULT
  const [importOpen, setImportOpen] = useState(false)
  const [savingImport, setSavingImport] = useState(false)
  const [resultCode, setResultCode] = useState('LR3MS4JI5A0E80')
  const [eventName, setEventName] = useState('HYROX Official Result — LR3MS4JI5A0E80')
  const [eventDate, setEventDate] = useState('2026-10-18')
  const [runSplitsStr, setRunSplitsStr] = useState('275, 286, 308, 295, 299, 294, 291, 314')
  const [skiSec, setSkiSec] = useState('246')
  const [sledPushSec, setSledPushSec] = useState('165')
  const [sledPullSec, setSledPullSec] = useState('232')
  const [bbjSec, setBbjSec] = useState('258')
  const [rowSec, setRowSec] = useState('252')
  const [farmersSec, setFarmersSec] = useState('124')
  const [sandbagSec, setSandbagSec] = useState('268')
  const [wallballsSec, setWallballsSec] = useState('318')
  const [roxAvgSec, setRoxAvgSec] = useState('42')

  const loadAnalysis = useCallback(
    async (selectedSource?: string, silent = false) => {
      if (silent) setRefreshing(true)
      else setLoading(true)
      try {
        const params = new URLSearchParams({ athleteId })
        if (selectedSource) params.set('sourceId', selectedSource)
        const res = await fetch(`/api/hyresult?${params.toString()}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('Falha ao carregar análise HYRESULT')
        const data: HyresultAnalysisDTO = await res.json()
        setAnalysis(data)
        setSourceId(data.activeSource.id)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro inesperado na análise HYRESULT')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [athleteId],
  )

  useEffect(() => {
    setSourceId('')
    void loadAnalysis(undefined, false)
  }, [athleteId, loadAnalysis])

  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      void loadAnalysis(sourceId || undefined, true)
    }
  }, [refreshKey, sourceId, loadAnalysis])

  async function handleSaveImport() {
    const runs = runSplitsStr
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n >= 150 && n <= 600)

    if (runs.length !== 8) {
      toast.error('Informe exatamente 8 splits de corrida válidos em segundos (entre 150 e 600s).')
      return
    }

    const baseRox = Math.max(15, Math.min(180, Number(roxAvgSec) || 42))
    const roxSplits = [
      baseRox - 4,
      baseRox + 3,
      baseRox + 5,
      baseRox + 1,
      baseRox,
      baseRox - 2,
      baseRox + 4,
      baseRox + 1,
    ]

    setSavingImport(true)
    try {
      const res = await fetch('/api/hyresult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId,
          resultCode: resultCode.trim() || 'LR3MS4JI5A0E80',
          eventName: eventName.trim() || 'HYROX Official Result',
          eventDate,
          runSplits: runs,
          workSplits: {
            SKIERG: Number(skiSec) || 246,
            SLED_PUSH: Number(sledPushSec) || 165,
            SLED_PULL: Number(sledPullSec) || 232,
            BBJ: Number(bbjSec) || 258,
            ROWING: Number(rowSec) || 252,
            FARMERS: Number(farmersSec) || 124,
            SANDBAG: Number(sandbagSec) || 268,
            WALLBALLS: Number(wallballsSec) || 318,
          },
          roxSplits,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao importar resultado HYRESULT')
      setAnalysis(data)
      setSourceId(data.activeSource.id)
      setImportOpen(false)
      toast.success(`Resultado HYRESULT #${data.activeSource.resultCode} analisado e vinculado à periodização!`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar resultado HYRESULT')
    } finally {
      setSavingImport(false)
    }
  }

  function handleJumpToPhase(phaseCode: string) {
    const targetMeso = plan.mesocycles.find((m) => m.code === phaseCode)
    const firstWeek = targetMeso?.weeks[0] ?? plan.weeks[0]
    if (firstWeek) {
      onGoToWeek(firstWeek.id)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-80 rounded-xl lg:col-span-5" />
          <Skeleton className="h-80 rounded-xl lg:col-span-7" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <Alert variant="destructive">
        <TriangleAlert className="size-4" />
        <AlertTitle>Erro ao carregar Análise HYRESULT</AlertTitle>
        <AlertDescription className="flex items-center gap-2">
          {error ?? 'Dados indisponíveis'}
          <Button size="sm" variant="outline" onClick={() => void loadAnalysis()}>
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-5">
      {/* Barra de Controle HYRESULT */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/60 p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <BarChart3 className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-black tracking-tight sm:text-base">
              Telemetria & Periodização HYRESULT (S1 → S28) — {analysis.athleteName}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Sincronizado 100% com o Diário de Treino ({analysis.progression.completedSessionsCount} / {analysis.progression.totalPlannedSessionsToDate} treinos confirmados até S{analysis.progression.currentWeekNumber} ·{' '}
              <span className="font-semibold text-emerald-400">
                {analysis.progression.gainAchievedFormatted}
              </span>{' '}
              conquistados), Marcos das Fases (GPP1 a TAPER) e Benchmark #LR3MS4JI5A0E80
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={sourceId}
            onValueChange={(val) => {
              setSourceId(val)
              void loadAnalysis(val, true)
            }}
          >
            <SelectTrigger className="h-8 w-[260px] text-xs font-semibold sm:w-[320px]">
              <SelectValue placeholder="Selecionar resultado / simulação" />
            </SelectTrigger>
            <SelectContent>
              {analysis.availableSources.map((src) => (
                <SelectItem key={src.id} value={src.id} className="text-xs">
                  {src.title} — {src.totalTimeFormatted}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setImportOpen(true)}
          >
            <PlusCircle className="size-3.5 text-primary" />
            Registrar Resultado HYRESULT
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => void loadAnalysis(sourceId, true)}
            disabled={refreshing}
            aria-label="Atualizar análise"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Blocos 1 e 2: 3 Pilares + Radar 10 Eixos + Ranking de Percentis */}
      <HyresultRadarAndPillars analysis={analysis} />

      {/* Curva da Periodização S1 → S28 Integrada ao HYRESULT */}
      <PredictorPeriodizationCurve
        progression={analysis.progression}
        weeklyCurve={analysis.weeklySimulationCurve}
        onGoToWeek={onGoToWeek}
      />

      {/* Bloco de Evolução Treino a Treino (Série Histórica + Feed de Impacto das Sessões) */}
      <HyresultEvolutionTimeline
        progression={analysis.progression}
        sessionEvolution={analysis.sessionEvolution}
        firstWeekId={plan.weeks[0]?.id}
        onGoToWeek={onGoToWeek}
      />

      {/* Blocos 3 e 4: Run Splits & Fade Index + Raio-X Roxzone + Prescrição na Periodização */}
      <HyresultSplitsAndRoxzone analysis={analysis} onJumpToPhase={handleJumpToPhase} />

      {/* Modal de Importação / Registro de Resultado HYRESULT */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" /> Importar / Registrar Resultado HYRESULT
            </DialogTitle>
            <DialogDescription className="text-xs">
              Insira o código do resultado (ex.: <code>LR3MS4JI5A0E80</code>) e os splits em segundos para gerar o radar de percentis e as prescrições na periodização de <strong>{analysis.athleteName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="hyr-code">Código HYRESULT</Label>
                <Input id="hyr-code" value={resultCode} onChange={(e) => setResultCode(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="hyr-ev">Evento / Simulação</Label>
                <Input id="hyr-ev" value={eventName} onChange={(e) => setEventName(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="hyr-dt">Data do Resultado</Label>
                <Input id="hyr-dt" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hyr-rox">Média por Transição Roxzone (s)</Label>
                <Input id="hyr-rox" type="number" value={roxAvgSec} onChange={(e) => setRoxAvgSec(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="hyr-runs">8 Splits de Corrida 1 km (segundos separados por vírgula)</Label>
              <Input
                id="hyr-runs"
                value={runSplitsStr}
                onChange={(e) => setRunSplitsStr(e.target.value)}
                placeholder="275, 286, 308, 295, 299, 294, 291, 314"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">1. SkiErg (s)</Label>
                <Input type="number" value={skiSec} onChange={(e) => setSkiSec(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">2. Sled Push (s)</Label>
                <Input type="number" value={sledPushSec} onChange={(e) => setSledPushSec(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">3. Sled Pull (s)</Label>
                <Input type="number" value={sledPullSec} onChange={(e) => setSledPullSec(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">4. BBJ 80m (s)</Label>
                <Input type="number" value={bbjSec} onChange={(e) => setBbjSec(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">5. Rowing (s)</Label>
                <Input type="number" value={rowSec} onChange={(e) => setRowSec(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">6. Farmers (s)</Label>
                <Input type="number" value={farmersSec} onChange={(e) => setFarmersSec(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">7. Lunges (s)</Label>
                <Input type="number" value={sandbagSec} onChange={(e) => setSandbagSec(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">8. Wall Balls (s)</Label>
                <Input type="number" value={wallballsSec} onChange={(e) => setWallballsSec(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setImportOpen(false)} disabled={savingImport}>
                Cancelar
              </Button>
              <Button onClick={handleSaveImport} disabled={savingImport} className="gap-1.5">
                {savingImport && <Loader2 className="size-4 animate-spin" />}
                Analisar no Padrão HYRESULT
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

