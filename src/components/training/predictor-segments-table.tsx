'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Footprints, Dumbbell, AlertTriangle, ArrowRightLeft, CheckCircle2 } from 'lucide-react'
import type { SegmentPredictionSplitDTO } from '@/lib/types'

export function PredictorSegmentsTable({
  segments,
  roxzoneFormatted,
  roxzoneSec,
  realisticFormatted,
  realisticTotalSec,
}: {
  segments: SegmentPredictionSplitDTO[]
  roxzoneFormatted: string
  roxzoneSec: number
  realisticFormatted: string
  realisticTotalSec: number
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-muted/20">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
            Decomposição dos 16 Segmentos Oficiais HYROX
          </h2>
          <p className="text-xs text-muted-foreground">
            8 trechos de corrida de 1.000 m intercalados com 8 estações funcionais + Roxzone
          </p>
        </div>
        <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md">
          Soma Total: <strong className="text-primary font-bold">{realisticFormatted}</strong>
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 text-center font-bold">#</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead className="text-right font-bold">Projeção</TableHead>
              <TableHead className="text-center">Pace / Detalhe</TableHead>
              <TableHead className="text-center">Fadiga Residual</TableHead>
              <TableHead className="text-center">Histórico</TableHead>
              <TableHead className="text-center">Status / Risco</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((seg) => {
              const isRun = seg.type === 'RUN'
              const delta = seg.targetSec != null ? seg.predictedSec - seg.targetSec : null
              const isAhead = delta != null && delta <= 0

              return (
                <TableRow
                  key={seg.segmentKey}
                  className={seg.isCritical ? 'bg-amber-500/5 hover:bg-amber-500/10' : undefined}
                >
                  <TableCell className="text-center font-mono font-bold text-muted-foreground">
                    {seg.order}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-md ${
                          isRun ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {isRun ? <Footprints className="size-3.5" /> : <Dumbbell className="size-3.5" />}
                      </span>
                      <div>
                        <div className="font-semibold text-foreground">{seg.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {isRun ? 'Corrida contínua 1.000m' : seg.distanceM ? `${seg.distanceM}m` : `${seg.reps} reps`}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground tnum">
                    {seg.targetFormatted ?? '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground text-sm tnum">
                    {seg.predictedFormatted}
                  </TableCell>
                  <TableCell className="text-center">
                    {isRun && seg.paceMinKmFormatted ? (
                      <Badge variant="outline" className="font-mono text-[11px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        {seg.paceMinKmFormatted}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {isRun ? (
                      <span
                        className={`text-[11px] font-mono font-medium ${
                          seg.fatigueFactorApplied >= 1.10
                            ? 'text-amber-400 font-bold'
                            : 'text-muted-foreground'
                        }`}
                      >
                        +{Math.round((seg.fatigueFactorApplied - 1) * 100)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground tnum">
                    {seg.historicalBestSec != null ? `${Math.floor(seg.historicalBestSec / 60)}:${String(seg.historicalBestSec % 60).padStart(2, '0')}` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {seg.isCritical ? (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/40 font-semibold gap-1">
                        <AlertTriangle className="size-3" /> Crítico
                      </Badge>
                    ) : isAhead ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 className="size-3" /> No ritmo
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Normal</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}

            {/* Linha Roxzone */}
            <TableRow className="bg-muted/15 font-medium border-t-2">
              <TableCell className="text-center font-mono text-muted-foreground">→</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-zinc-500/20 text-zinc-300">
                    <ArrowRightLeft className="size-3.5" />
                  </span>
                  <div>
                    <div className="font-bold text-foreground">Roxzone (Tempo de Transições)</div>
                    <div className="text-[10px] text-muted-foreground">8 passagens entre corridas e estações funcionais</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground tnum">05:00</TableCell>
              <TableCell className="text-right font-mono font-bold text-foreground text-sm tnum">
                {roxzoneFormatted}
              </TableCell>
              <TableCell className="text-center text-muted-foreground text-[11px]">~40s / transição</TableCell>
              <TableCell className="text-center text-muted-foreground text-[11px]">—</TableCell>
              <TableCell className="text-center text-muted-foreground text-[11px]">—</TableCell>
              <TableCell className="text-center text-muted-foreground text-[11px]">Transição</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="border-t px-4 py-3 bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
        <span>Fatores de fadiga calibrados com base na interferência de membros inferiores e superiores</span>
        <span className="font-mono font-bold text-foreground">
          Tempo Total: {realisticFormatted} ({Math.round(realisticTotalSec / 60)} min)
        </span>
      </div>
    </Card>
  )
}
