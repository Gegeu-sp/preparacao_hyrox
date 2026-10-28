'use client'

// Dashboard — KPIs, Prescrito vs Realizado, curva de carga/fadiga, aderência,
// distribuição por modalidade e bem-estar
import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CalendarDays, Flag, Gauge, HeartPulse, MapPin, TrendingUp, TriangleAlert, Dumbbell, Activity, Scale,
} from 'lucide-react'
import { fmtKm, fmtTon, fmtDateShort } from '@/lib/format'
import { KpiCard, PhaseBadge } from './bits'
import { VolumeChart, LoadCurveChart, AdherenceChart, ModalityChart, WellnessSpark } from './charts'
import { WellnessDialog } from './wellness-dialog'
import type { DashboardResponse, PlanResponse } from '@/lib/types'

export function DashboardTab({ dash, plan, onDataChanged }: {
  dash: DashboardResponse
  plan: PlanResponse
  onDataChanged: () => void
}) {
  const [metric, setMetric] = useState<'km' | 'ton' | 'load'>('km')
  const [wellOpen, setWellOpen] = useState(false)

  const k = dash.kpis
  const todayWell = dash.wellness[0] ?? null
  const raceDate = plan.race.date

  const acwrTone = k.acwr == null ? 'zinc' : k.acwr > 1.3 ? 'red' : k.acwr < 0.8 ? 'amber' : 'primary'
  const formHint = k.form < -80 ? 'fadiga elevada — priorize recuperação' : k.form > 20 ? 'fresco — janela para qualidade' : 'equilíbrio carga-recuperação'

  const raceTarget = useMemo(() => plan.athlete.goalRaceTime, [plan])

  return (
    <div className="space-y-4">
      {/* alertas */}
      {dash.alerts.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {dash.alerts.map((a, i) => (
            <Alert key={i} variant={i === 0 ? 'destructive' : 'default'} className="py-2.5">
              <TriangleAlert className="size-4" />
              <AlertDescription className="text-xs leading-relaxed">{a}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Dias para a prova" icon={CalendarDays}
          value={k.daysUntilRace}
          sub={<>{plan.race.name} · {fmtDateShort(raceDate)}</>}
          accent="primary"
        />
        <KpiCard
          label="Semana atual" icon={Flag}
          value={`W${k.weekNumber}`}
          sub={<PhaseBadge code={k.phaseCode} />}
          accent="zinc"
        />
        <KpiCard
          label="Aderência (semana)" icon={Activity}
          value={k.adherenceWeekPct != null ? `${k.adherenceWeekPct}%` : '0%'}
          sub={`${k.completedSessionsTotal}/${k.plannedSessionsTotal} treinos confirmados`}
          progress={k.adherenceWeekPct ?? 0}
          accent="primary"
        />
        <KpiCard
          label="Km na semana" icon={MapPin}
          value={<>{fmtKm(k.kmWeekA)}<span className="text-sm font-normal text-muted-foreground"> / {fmtKm(k.kmWeekP)}</span></>}
          sub="realizado / prescrito"
          accent="primary"
        />
        <KpiCard
          label="ACWR (7d : 28d)" icon={Gauge}
          value={k.acwr != null ? k.acwr.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
          sub={`agudo ${k.acuteLoad} · crônico ${k.chronicLoad} UA`}
          accent={acwrTone as 'primary' | 'red' | 'amber' | 'zinc'}
        />
        <KpiCard
          label="Forma (Fitness−Fadiga)" icon={TrendingUp}
          value={k.form.toLocaleString('pt-BR')}
          sub={formHint}
          accent={k.form < -80 ? 'red' : 'primary'}
        />
      </div>

      {/* gráficos */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Prescrito vs Realizado — volume semanal ({plan.athlete.name})</CardTitle>
                <CardDescription>28 microciclos · {metric === 'km' ? 'quilometragem de corrida' : metric === 'ton' ? 'tonelagem de força/LPO' : 'carga interna (sRPE = RPE × min)'}</CardDescription>
              </div>
              <Tabs value={metric} onValueChange={(v) => setMetric(v as typeof metric)}>
                <TabsList className="h-8">
                  <TabsTrigger value="km" className="text-xs">Km</TabsTrigger>
                  <TabsTrigger value="ton" className="text-xs">Tonelagem</TabsTrigger>
                  <TabsTrigger value="load" className="text-xs">Carga sRPE</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <VolumeChart data={dash.weekly} metric={metric} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Curva de carga e fadiga (Fitness–Fadiga)</CardTitle>
            <CardDescription>
              Carga semanal (realizado; projeção a partir da semana {k.weekNumber}) com EWMA de 42d (fitness) e 7d (fadiga).
              {k.strain != null && ` Strain semanal: ${k.strain.toLocaleString('pt-BR')} · monotonicidade ${k.monotonicity?.toLocaleString('pt-BR')}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoadCurveChart data={dash.curve} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Aderência ao plano</CardTitle>
              <CardDescription>
                % de cumprimento por semana (concluído = 1 · parcial/ajustado = 0,6 · linha = meta 90%)
                {k.adherenceOverallPct != null && ` · geral: ${k.adherenceOverallPct}%`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dash.weekly.some((w) => w.adherencePct != null && !w.isFuture)
                ? <AdherenceChart data={dash.weekly} />
                : <p className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">Conclua sessões para visualizar a aderência.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribuição por modalidade</CardTitle>
              <CardDescription>Carga interna dos últimos 28 dias por tipo de sessão</CardDescription>
            </CardHeader>
            <CardContent>
              <ModalityChart data={dash.modalitySplit} />
            </CardContent>
          </Card>
        </div>

        {/* bem-estar */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base"><HeartPulse className="size-4 text-red-500" /> Bem-estar & recuperação ({plan.athlete.name})</CardTitle>
                <CardDescription>
                  {todayWell
                    ? `Último registro: ${todayWell.date.split('-').reverse().join('/')} · sono ${todayWell.sleepHours ?? '—'}h · dor ${todayWell.soreness ?? '—'}/5 · fadiga ${todayWell.fatigue ?? '—'}/5 · HRV ${todayWell.hrv ?? '—'} ms`
                    : 'Registre diariamente: sono, DOMS, fadiga, estresse, motivação, FC repouso e HRV.'}
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setWellOpen(true)}>
                <HeartPulse className="size-3.5" />
                {todayWell ? 'Editar hoje' : 'Registrar hoje'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <WellnessSpark data={dash.wellness} dataKey="hrv" label="HRV (ms)" color="var(--chart-1)" />
              <WellnessSpark data={dash.wellness} dataKey="restingHr" label="FC repouso (bpm)" color="var(--chart-3)" />
              <WellnessSpark data={dash.wellness} dataKey="soreness" label="Dor muscular (1–5)" color="var(--chart-2)" />
              <WellnessSpark data={dash.wellness} dataKey="fatigue" label="Fadiga (1–5)" color="var(--chart-3)" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Scale className="size-3.5" /> Peso: {todayWell?.weightKg != null ? `${todayWell.weightKg.toLocaleString('pt-BR')} kg` : `${plan.athlete.weightKg.toLocaleString('pt-BR')} kg`}</span>
              <span className="flex items-center gap-1"><Dumbbell className="size-3.5" /> Tonelagem semanal: {fmtTon(k.tonnageWeekA)} / {fmtTon(k.tonnageWeekP)} t</span>
              <span className="flex items-center gap-1"><Flag className="size-3.5" /> Meta de prova: {raceTarget ? `${Math.floor(raceTarget / 60)}:${String(raceTarget % 60).padStart(2, '0')}` : '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <WellnessDialog
        open={wellOpen}
        onOpenChange={setWellOpen}
        athleteId={plan.athlete.id}
        initial={todayWell}
        onSaved={onDataChanged}
      />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}
