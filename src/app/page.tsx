'use client'

// HYROX CONTROL — Painel de Controle de Treinamento (Rafael Nogueira)
// Aba única em `/`: Painel · Periodização · Diário de Treino
import { useCallback, useEffect, useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Activity, Flag, Gauge, LayoutDashboard, CalendarDays, Sun, Moon, RefreshCw, TriangleAlert, Timer } from 'lucide-react'
import { DashboardTab, DashboardSkeleton } from '@/components/training/dashboard-tab'
import { PlanTab } from '@/components/training/plan-tab'
import { WeekTab } from '@/components/training/week-tab'
import { PredictorTab } from '@/components/training/predictor-tab'
import type { DashboardResponse, PlanResponse } from '@/lib/types'

export default function Home() {
  const [tab, setTab] = useState('painel')
  const [plan, setPlan] = useState<PlanResponse | null>(null)
  const [dash, setDash] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jumpWeek, setJumpWeek] = useState<{ id: string; n: number } | null>(null)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const refresh = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    try {
      const [p, d] = await Promise.all([
        fetch('/api/plan', { cache: 'no-store' }),
        fetch('/api/dashboard', { cache: 'no-store' }),
      ])
      if (!p.ok || !d.ok) throw new Error('Falha ao carregar dados do plano')
      setPlan(await p.json())
      setDash(await d.json())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado ao carregar os dados')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

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
              <p className="text-[11px] text-muted-foreground">Rafael Nogueira · Temporada 2026/27</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {plan && (
              <span className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary tnum">
                <Flag className="size-3.5" aria-hidden />
                {plan.race.daysUntil} dias · 08/05/2027
              </span>
            )}
            <Button
              variant="outline" size="icon" className="size-8"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Alternar tema"
            >
              {mounted ? (theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />) : <span className="size-4" />}
            </Button>
            <Button
              variant="outline" size="icon" className="size-8"
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
              <Button size="sm" variant="outline" onClick={() => void refresh()}>Tentar novamente</Button>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <DashboardSkeleton />
        ) : !plan || !dash ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <motion.div
            key={tab}
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
                <WeekTab key="week" plan={plan} onDataChanged={() => void refresh(true)} jumpWeek={jumpWeek} />
              </TabsContent>
              <TabsContent value="previsao" className="mt-0">
                <PredictorTab />
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
            HYROX CONTROL · controle de treinamento prescrito vs realizado · carga via sRPE (Foster), ACWR e modelo Fitness–Fadiga
          </p>
          <p className="flex items-center gap-1.5">
            <Flag className="size-3.5 text-primary" aria-hidden />
            Próximo objetivo: HYROX 08–09/05/2027 · ferramenta de apoio — ajustes sob supervisão técnica
          </p>
        </div>
      </footer>
    </div>
  )
}
