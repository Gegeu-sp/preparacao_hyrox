'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SlidersHorizontal, RotateCcw, AlertTriangle, Sparkles } from 'lucide-react'
import type { PredictionScenarioInput } from '@/lib/types'

export function PredictorSimulator({
  warnings,
  onChange,
}: {
  warnings: string[]
  onChange: (input: PredictionScenarioInput) => void
}) {
  const [paceDelta, setPaceDelta] = useState(0)
  const [roxDelta, setRoxDelta] = useState(0)
  const [sledPushDelta, setSledPushDelta] = useState(0)
  const [sledPullDelta, setSledPullDelta] = useState(0)
  const [sandbagDelta, setSandbagDelta] = useState(0)
  const [wallballsDelta, setWallballsDelta] = useState(0)

  const applyChanges = (
    newPace = paceDelta,
    newRox = roxDelta,
    newSp = sledPushDelta,
    newSpl = sledPullDelta,
    newSb = sandbagDelta,
    newWb = wallballsDelta
  ) => {
    const stationAdjustments: Record<string, number> = {}
    if (newSp !== 0) stationAdjustments.SLED_PUSH = newSp
    if (newSpl !== 0) stationAdjustments.SLED_PULL = newSpl
    if (newSb !== 0) stationAdjustments.SANDBAG = newSb
    if (newWb !== 0) stationAdjustments.WALLBALLS = newWb

    onChange({
      basePaceAdjustmentSec: newPace,
      roxzoneAdjustmentSec: newRox,
      stationAdjustments,
    })
  }

  const handleReset = () => {
    setPaceDelta(0)
    setRoxDelta(0)
    setSledPushDelta(0)
    setSledPullDelta(0)
    setSandbagDelta(0)
    setWallballsDelta(0)
    applyChanges(0, 0, 0, 0, 0, 0)
  }

  const hasModifications =
    paceDelta !== 0 ||
    roxDelta !== 0 ||
    sledPushDelta !== 0 ||
    sledPullDelta !== 0 ||
    sandbagDelta !== 0 ||
    wallballsDelta !== 0

  return (
    <Card className="p-4 bg-muted/15 border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SlidersHorizontal className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              Simulador Tático de Ritmo (&ldquo;What-If&rdquo;)
            </h2>
            <p className="text-xs text-muted-foreground">
              Teste ajustes de pace e tempos de estação em tempo real com recálculo instantâneo
            </p>
          </div>
        </div>

        {hasModifications && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 gap-1.5 text-xs border-dashed text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" /> Resetar Ajustes
          </Button>
        )}
      </div>

      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Controle 1: Pace de Corrida Base */}
        <div className="space-y-2 rounded-lg border bg-background/60 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Pace Médio de Corrida</span>
            <span className={`font-mono font-bold ${paceDelta < 0 ? 'text-emerald-400' : paceDelta > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
              {paceDelta > 0 ? `+${paceDelta}s/km` : paceDelta < 0 ? `${paceDelta}s/km` : 'Nominal (0s)'}
            </span>
          </div>
          <Slider
            min={-30}
            max={30}
            step={1}
            value={[paceDelta]}
            onValueChange={([val]) => {
              setPaceDelta(val)
              applyChanges(val)
            }}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>-30s (Mais rápido)</span>
            <span>+30s (Conservador)</span>
          </div>
        </div>

        {/* Controle 2: Roxzone (Transições) */}
        <div className="space-y-2 rounded-lg border bg-background/60 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Eficiência na Roxzone</span>
            <span className={`font-mono font-bold ${roxDelta < 0 ? 'text-emerald-400' : roxDelta > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
              {roxDelta > 0 ? `+${roxDelta}s total` : roxDelta < 0 ? `${roxDelta}s total` : 'Nominal (0s)'}
            </span>
          </div>
          <Slider
            min={-60}
            max={60}
            step={5}
            value={[roxDelta]}
            onValueChange={([val]) => {
              setRoxDelta(val)
              applyChanges(undefined, val)
            }}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>-60s (Transição rápida)</span>
            <span>+60s (Recuperação)</span>
          </div>
        </div>

        {/* Controle 3: Sled Push */}
        <div className="space-y-2 rounded-lg border bg-background/60 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Sled Push (50m)</span>
            <span className={`font-mono font-bold ${sledPushDelta < 0 ? 'text-emerald-400' : sledPushDelta > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
              {sledPushDelta > 0 ? `+${sledPushDelta}s` : sledPushDelta < 0 ? `${sledPushDelta}s` : '0s'}
            </span>
          </div>
          <Slider
            min={-30}
            max={30}
            step={5}
            value={[sledPushDelta]}
            onValueChange={([val]) => {
              setSledPushDelta(val)
              applyChanges(undefined, undefined, val)
            }}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>-30s</span>
            <span>+30s</span>
          </div>
        </div>

        {/* Controle 4: Sled Pull */}
        <div className="space-y-2 rounded-lg border bg-background/60 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Sled Pull (50m)</span>
            <span className={`font-mono font-bold ${sledPullDelta < 0 ? 'text-emerald-400' : sledPullDelta > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
              {sledPullDelta > 0 ? `+${sledPullDelta}s` : sledPullDelta < 0 ? `${sledPullDelta}s` : '0s'}
            </span>
          </div>
          <Slider
            min={-30}
            max={30}
            step={5}
            value={[sledPullDelta]}
            onValueChange={([val]) => {
              setSledPullDelta(val)
              applyChanges(undefined, undefined, undefined, val)
            }}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>-30s</span>
            <span>+30s</span>
          </div>
        </div>

        {/* Controle 5: Sandbag Lunges */}
        <div className="space-y-2 rounded-lg border bg-background/60 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Sandbag Lunges (100m)</span>
            <span className={`font-mono font-bold ${sandbagDelta < 0 ? 'text-emerald-400' : sandbagDelta > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
              {sandbagDelta > 0 ? `+${sandbagDelta}s` : sandbagDelta < 0 ? `${sandbagDelta}s` : '0s'}
            </span>
          </div>
          <Slider
            min={-40}
            max={40}
            step={5}
            value={[sandbagDelta]}
            onValueChange={([val]) => {
              setSandbagDelta(val)
              applyChanges(undefined, undefined, undefined, undefined, val)
            }}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>-40s</span>
            <span>+40s</span>
          </div>
        </div>

        {/* Controle 6: Wall Balls */}
        <div className="space-y-2 rounded-lg border bg-background/60 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Wall Balls (100 reps)</span>
            <span className={`font-mono font-bold ${wallballsDelta < 0 ? 'text-emerald-400' : wallballsDelta > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
              {wallballsDelta > 0 ? `+${wallballsDelta}s` : wallballsDelta < 0 ? `${wallballsDelta}s` : '0s'}
            </span>
          </div>
          <Slider
            min={-30}
            max={30}
            step={5}
            value={[wallballsDelta]}
            onValueChange={([val]) => {
              setWallballsDelta(val)
              applyChanges(undefined, undefined, undefined, undefined, undefined, val)
            }}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>-30s</span>
            <span>+30s</span>
          </div>
        </div>
      </div>

      {/* Advertências e Avisos Fisiológicos */}
      {warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {warnings.map((warn, i) => (
            <Alert key={i} className="border-amber-500/30 bg-amber-500/10 py-2.5">
              <AlertTriangle className="size-4 text-amber-400" />
              <AlertTitle className="text-xs font-semibold text-amber-300">Aviso Tático Fisiológico</AlertTitle>
              <AlertDescription className="text-xs text-amber-200/90">{warn}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {hasModifications && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-md px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-primary font-medium">
            <Sparkles className="size-3.5" /> Cenário simulado ativo
          </span>
          <span>Os valores acima alteram a projeção em tempo real sem gravar no banco de dados</span>
        </div>
      )}
    </Card>
  )
}
