# Implementation Plan: Simulação Preditiva Dinâmica Guiada pela Periodização & Evolução HYRESULT Treino a Treino

**Branch**: `004-live-periodization-evolution` | **Date**: 2026-10-28 | **Spec**: [spec.md](file:///c:/Users/MUSCULA%C3%87%C3%83O/Downloads/workspace-f9fd82ab-0436-4680-8383-a190be649738/specs/004-live-periodization-evolution/spec.md)

**Input**: Feature specification from `/specs/004-live-periodization-evolution/spec.md`

## Summary

Acoplar o motor de **Previsão de Prova HYROX** (`src/lib/predictions.ts`) e a **Análise HYRESULT** (`src/lib/hyresult-analytics.ts`) à execução real da periodização de 28 semanas treino a treino. A solução introduz o motor analítico unificado `src/lib/live-evolution.ts`, que percorre cronologicamente cada sessão concluída (`CONCLUIDO` / `MODIFICADO`) pelo atleta, avalia a qualidade de execução em Corrida (pace realizado vs. zona prescrita), Força (tonelagem/carga realizada vs. prescrita) e Estações/Híbridos (splits reais normalizados), e gera:
1. O **Estado Atual Ao Vivo (`LIVE_EVOLUTION`)** nos 8 splits de corrida, 8 estações e 8 transições de Roxzone;
2. A **Linha do Tempo Treino a Treino (`SessionEvolutionPointDTO[]`)** detalhando quantos segundos cada sessão concluída economizou na projeção HYRESULT;
3. A **Curva de Simulação Semanal da Periodização (`PeriodizationWeekSimulationPointDTO[]` de S1 a S28)** comparando a curva planejada, a simulação real executada e a trajetória reancorada até a prova.

## Technical Context

**Language/Version**: TypeScript 5.x (Strict mode, zero `any`) sobre Node.js / Next.js 16.4 (App Router) e React 19  
**Primary Dependencies**: Prisma ORM 6.19 (`@prisma/client`), Recharts 2.15, Tailwind CSS v4, Radix UI / `shadcn/ui`, Lucide Icons  
**Storage**: SQLite local (`db/custom.db`) via Prisma ORM (sem necessidade de migração destrutiva; aproveita integralmente `TrainingSession`, `Exercise`, `StationResult`, `Microcycle`, `Mesocycle` e `HyresultRaceResult`)  
**Testing**: `npx tsc --noEmit`, `npm run lint`, e verificação E2E das séries temporais e consistência cronométrica ($\text{Running} + \text{Workouts} + \text{Roxzone} = \text{Total}$)  
**Target Platform**: Web Application (Desktop 1440px + Mobile responsivo em tema dark esportivo)  
**Project Type**: Full-stack Next.js App Router SPA com motores analíticos server-side  
**Performance Goals**: Cálculo completo dos 28 microciclos + série treino a treino em `< 50ms` no servidor local SQLite  
**Constraints**: Paleta estrita Dark Sport UI (`zinc` + `emerald`, `lime`, `amber`, `rose`; proibido azul/indigo); consistência cronométrica exata de 0s de erro entre a soma dos 3 pilares e o tempo total em todos os pontos da série  
**Scale/Scope**: Multi-atleta (28 semanas / 196 sessões por atleta), impactando `src/lib/types.ts`, `src/lib/live-evolution.ts` (novo), `src/lib/predictions.ts`, `src/lib/hyresult-analytics.ts`, `prisma/seed.ts` e os componentes de `PredictorTab` e `HyresultTab`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **I. Rigor Metodológico e Ciência do Esporte (Sports Science First)**: **PASS** — A evolução treino a treino normaliza o ritmo de corrida pela zona ventilatória prescrita da sessão (`Z1–Z4`), pondera a tonelagem muscular ($\Sigma \text{séries} \times \text{reps} \times \text{carga}$) sobre as estações de força (`Sleds`, `Farmers`, `Lunges`, `Wall Balls`) e aplica suavização exponencial aos splits reais de estações.
2. **II. Integridade e Reatividade de Dados (Data Integrity & Server-Side Analytics)**: **PASS** — Todo o cálculo da curva de 28 semanas e dos snapshots treino a treino ocorre no servidor (`src/lib/live-evolution.ts`), consumindo diretamente o SQLite via Prisma e reagindo imediatamente a qualquer `PATCH /api/sessions/[id]`.
3. **III. UX Esportiva de Alta Performance (Athlete-Centric UI/UX)**: **PASS** — Todos os novos gráficos e cartões utilizam exclusivamente `zinc`, `emerald`, `lime`, `amber` e `rose`, sem tons azuis ou indigo.
4. **IV. Tipagem Estrita e Validação de Contrato (Strict Typing & Validation)**: **PASS** — Interfaces `SessionEvolutionPointDTO`, `PeriodizationWeekSimulationPointDTO` e `PeriodizationProgressionSummaryDTO` estritamente tipadas em `src/lib/types.ts` sem uso de `any`.
5. **V. Simplicidade Arquitetural e Desempenho Local (Local-First Simplicity)**: **PASS** — Zero novas dependências externas; reutiliza `recharts` e `shadcn/ui` já instalados.

## Project Structure

### Documentation (this feature)

```text
specs/004-live-periodization-evolution/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api-live-evolution.md
│   └── ui-live-evolution.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
prisma/
└── seed.ts                                                 # Enriquecido com sessões concluídas nas Semanas 1 e 2 (Corrida, Força, Híbrido/Bricks)

src/
├── app/
│   └── page.tsx                                            # Sincronização automática de Previsão e HYRESULT ao salvar sessões no Diário
├── components/
│   └── training/
│       ├── predictor-periodization-curve.tsx               # NOVO: Curva de Simulação S1-S28 + Painel de Progresso na Periodização
│       ├── predictor-tab.tsx                               # Integrado com PredictorPeriodizationCurve e navegação para semanas
│       ├── hyresult-evolution-timeline.tsx                 # NOVO: Gráfico e Feed de Evolução Treino a Treino (impacto de cada sessão)
│       ├── hyresult-radar-and-pillars.tsx                  # Radar de 10 Eixos atualizado com 3 camadas (Diagnóstico S1 vs Ao Vivo vs Meta S28)
│       └── hyresult-tab.tsx                                # Fonte padrão LIVE_EVOLUTION + integração com HyresultEvolutionTimeline
└── lib/
    ├── types.ts                                            # Novos DTOs de evolução treino a treino e curva semanal
    ├── live-evolution.ts                                   # NOVO: Motor unificado de simulação da periodização (S1-S28) e evolução sessão a sessão
    ├── predictions.ts                                      # Acoplado ao estado atual e curva semanal de live-evolution.ts
    └── hyresult-analytics.ts                               # Acoplado à fonte LIVE_EVOLUTION e timeline treino a treino de live-evolution.ts
```

**Structure Decision**: Centralizar a lógica de evolução temporal e simulação sessão a sessão em `src/lib/live-evolution.ts` para que tanto `computeRacePrediction()` quanto `computeHyresultAnalysis()` compartilhem exatamente os mesmos cálculos e garantam consistência de 100% entre as abas **Previsão de Prova** e **Análise HYRESULT**.

## Complexity Tracking

Nenhuma violação da Constituição. Tabela de justificativa não aplicável.
