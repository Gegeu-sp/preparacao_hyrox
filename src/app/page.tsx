'use client'

// HYROX CONTROL — Painel de Controle de Treinamento Multi-Atleta + Análise HYRESULT
import { useCallback, useEffect, useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  Activity,
  Flag,
  Gauge,
  LayoutDashboard,
  CalendarDays,
  Sun,
  Moon,
  RefreshCw,
  TriangleAlert,
  Timer,
  BarChart3,
} from 'lucide-react'
import { DashboardTab, DashboardSkeleton } from '@/components/training/dashboard-tab'
import { PlanTab } from '@/components/training/plan-tab'
import { WeekTab } from '@/components/training/week-tab'
import { PredictorTab } from '@/components/training/predictor-tab'
import { HyresultTab } from '@/components/training/hyresult-tab'
import { AthleteSwitcherDialog } from '@/components/training/athlete-switcher-dialog'
import { DIVISION_META } from '@/lib/constants'
import { fmtDateShort } from '@/lib/format'
import type { AthleteSummaryDTO, DashboardResponse, PlanResponse } from '@/lib/types'

export default function Home() {
  const [tab, setTab] = useState('painel')
  const [athletes, setAthletes] = useState<AthleteSummaryDTO[]>([])
  const [activeAthleteId, setActiveAthleteId] = useState<string | undefined>(undefined)
  const [plan, setPlan] = useState<PlanResponse | null>(null)
  const [dash, setDash] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [jumpWeek, setJumpWeek] = useState<{ id: string; n: number } | null>(null)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const refresh = useCallback(
    async (silent = false, overrideAthleteId?: string) => {
      if (silent) setRefreshing(true)
      else setLoading(true)
      try {
        const targetId = overrideAthleteId ?? activeAthleteId
        const qs = targetId ? `?athleteId=${encodeURIComponent(targetId)}` : ''
        const [athRes, p, d] = await Promise.all([
          fetch('/api/athletes', { cache: 'no-store' }),
          fetch(`/api/plan${qs}`, { cache: 'no-store' }),
          fetch(`/api/dashboard${qs}`, { cache: 'no-store' }),
        ])
        if (!p.ok || !d.ok) throw new Error('Falha ao carregar dados do plano')
        const athJson = athRes.ok ? await athRes.json() : { athletes: [] }
        const planData: PlanResponse = await p.json()
        const dashData: DashboardResponse = await d.json()

        setAthletes(athJson.athletes ?? [])
        setActiveAthleteId(planData.athlete.id)
        setPlan(planData)
        setDash(dashData)
        if (silent) setRefreshVersion((v) => v + 1)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro inesperado ao carregar os dados')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [activeAthleteId],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleSelectAthlete = (newAthleteId: string) => {
    setActiveAthleteId(newAthleteId)
    void refresh(false, newAthleteId)
  }

  const goToWeek = (weekId: string) => {
    setTab('diario')
    setJumpWeek((j) => ({ id: weekId, n: (j?.n ?? 0) + 1 }))
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* header */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="size-5" aria-hidden />
            </span>
            <div className="leading-tight">
              <h1 className="text-base font-black tracking-tight sm:text-lg">HYROX CONTROL</h1>
              <p className="text-[11px] text-muted-foreground">
                {plan
                  ? `${plan.athlete.name} · ${DIVISION_META[plan.athlete.division]?.short ?? plan.athlete.division}`
                  : 'Periodização & Telemetria HYRESULT'}
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {plan && (
              <AthleteSwitcherDialog
                athletes={athletes}
                activeAthlete={plan.athlete}
                onSelectAthlete={handleSelectAthlete}
                onAthletesChanged={(selectId) => void refresh(true, selectId)}
              />
            )}

            {plan && dash && (
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 tnum md:flex">
                <Gauge className="size-3.5" aria-hidden />
                S{dash.kpis.weekNumber} ({dash.kpis.phaseCode}) · {dash.kpis.completedSessionsTotal}/{dash.kpis.plannedSessionsTotal} treinos confirmados
              </span>
            )}

            {plan && (
              <span className="hidden items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary tnum lg:flex">
                <Flag className="size-3.5" aria-hidden />
                {plan.race.daysUntil} dias · {fmtDateShort(plan.race.date)}
              </span>
            )}
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Alternar tema"
            >
              {mounted ? theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" /> : <span className="size-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => void refresh(true)}
              aria-label="Atualizar dados"
              disabled={refreshing}
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="h-9 w-full justify-start overflow-x-auto sm:w-auto">
              <TabsTrigger value="painel" className="gap-1.5 text-xs sm:text-sm">
                <LayoutDashboard className="size-3.5" /> Painel
              </TabsTrigger>
              <TabsTrigger value="plano" className="gap-1.5 text-xs sm:text-sm">
                <CalendarDays className="size-3.5" /> Periodização
              </TabsTrigger>
              <TabsTrigger value="diario" className="gap-1.5 text-xs sm:text-sm">
                <Gauge className="size-3.5" /> Diário de Treino
              </TabsTrigger>
              <TabsTrigger value="previsao" className="gap-1.5 text-xs sm:text-sm">
                <Timer className="size-3.5" /> Previsão de Prova
              </TabsTrigger>
              <TabsTrigger value="hyresult" className="gap-1.5 text-xs sm:text-sm">
                <BarChart3 className="size-3.5" /> Análise HYRESULT
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* conteúdo */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:py-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <TriangleAlert className="size-4" />
            <AlertTitle>Não foi possível carregar o painel</AlertTitle>
            <AlertDescription className="flex items-center gap-2">
              {error}
              <Button size="sm" variant="outline" onClick={() => void refresh()}>
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <DashboardSkeleton />
        ) : !plan || !dash ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <motion.div
            key={`${tab}-${plan.athlete.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <Tabs value={tab} onValueChange={setTab}>
              <TabsContent value="painel" className="mt-0">
                <DashboardTab dash={dash} plan={plan} onDataChanged={() => void refresh(true)} />
              </TabsContent>
              <TabsContent value="plano" className="mt-0">
                <PlanTab plan={plan} onGoToWeek={goToWeek} />
              </TabsContent>
              <TabsContent value="diario" className="mt-0">
                <WeekTab
                  key={`week-${plan.athlete.id}`}
                  plan={plan}
                  onDataChanged={() => void refresh(true)}
                  jumpWeek={jumpWeek}
                />
              </TabsContent>
              <TabsContent value="previsao" className="mt-0">
                <PredictorTab
                  athleteId={plan.athlete.id}
                  refreshKey={refreshVersion}
                  onGoToWeek={goToWeek}
                />
              </TabsContent>
              <TabsContent value="hyresult" className="mt-0">
                <HyresultTab
                  athleteId={plan.athlete.id}
                  plan={plan}
                  refreshKey={refreshVersion}
                  onGoToWeek={goToWeek}
                />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </main>

      {/* footer fixo */}
      <footer className="mt-auto border-t bg-card/60">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-[11px] text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Activity className="size-3.5 text-primary" aria-hidden />
            HYROX CONTROL · gestão multi-atleta · periodização calibrada por testes · telemetria padrão HYRESULT
          </p>
          <p className="flex items-center gap-1.5">
            <Flag className="size-3.5 text-primary" aria-hidden />
            {plan ? `Objetivo: ${plan.race.name} (${fmtDateShort(plan.race.date)})` : 'Temporada HYROX 2026/27'} · supervisão técnica
          </p>
        </div>
      </footer>
    </div>
  )
}
