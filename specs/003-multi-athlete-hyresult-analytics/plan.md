# Implementation Plan: Gestão Multi-Atleta, Periodização Individualizada por Testes e Análise de Performance Padrão HYRESULT

**Branch**: `003-multi-athlete-hyresult-analytics` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-multi-athlete-hyresult-analytics/spec.md`

## Summary

Esta feature expande o **HYROX CONTROL** em duas frentes complementares e integradas:
1. **Arquitetura Multi-Atleta e Motor Gerador de Periodização por Testes (`src/lib/periodization-generator.ts`)**: Permite cadastrar novos atletas com sua categoria oficial HYROX (`OPEN_M`, `OPEN_F`, `PRO_M`, `PRO_F`) e resultados da bateria de testes diagnósticos (VO₂max, VDOT, VT1, VT2, FCrep/FCmáx, PB 5km, 3RM em Agachamento/Terra/Supino, CMJ, SkiErg 1.000m TT e Remo 500m TT). Ao criar ou recalibrar um atleta, o sistema gera automaticamente os 7 mesociclos, 28 microciclos e 196 sessões parametrizadas, escalonando matematicamente as zonas de treinamento (`Z1–Z5`), ritmos de corrida, cargas de musculação/LPO e pesos/splits oficiais das estações HYROX. Todas as rotas (`/api/plan`, `/api/dashboard`, `/api/wellness`, `/api/predictions`, `/api/hyresult`) passam a operar isoladamente por `athleteId`.
2. **Módulo Analítico Padrão HYRESULT (`src/lib/hyresult-analytics.ts` & `src/components/training/hyresult-tab.tsx`)**: Implementa a decomposição analítica inspirada em `https://www.hyresult.com/result/LR3MS4JI5A0E80`, desmembrando provas oficiais (incluindo o preset de referência `LR3MS4JI5A0E80` e registro de novos resultados), simulações da periodização (S21, S24, S26) e metas da Semana 28 nos **3 Pilares (Total Running vs. Total Workouts vs. Total Roxzone)**, **Percentis Comparativos por Divisão**, **Gráfico de Radar (Spider Chart)**, **Análise de Pacing & Fade Index das 8 Corridas**, **Raio-X das 8 Transições da Roxzone**, **Potencial de Economia de Tempo (*Time Savings*)** e **Diagnóstico Prescritivo conectado ao Mesociclo Atual**.

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js & Bun runtime
**Primary Dependencies**: Next.js 16 (App Router), React 19, Prisma ORM 6, Tailwind CSS v4, shadcn/ui (Radix UI, Recharts 2.15, Lucide Icons, Framer Motion), Zod
**Storage**: SQLite (`db/custom.db`) via Prisma Client (com suporte multi-atleta via chave estrangeira `athleteId`)
**Testing**: Verificação de tipagem (`tsc --noEmit`), linter (`bun run lint`), testes de contrato de API (`curl`) e validação responsiva Desktop/Mobile
**Target Platform**: Aplicação Web responsiva (Desktop 1440px e Mobile de pista/academia)
**Project Type**: Web Application (Single-route SPA com Next.js App Router)
**Performance Goals**: Geração transacional de periodização completa (28 semanas / 196 sessões) em < 800ms no SQLite local; troca de atleta ativo e carregamento do painel HYRESULT em < 100ms
**Constraints**: Execução 100% local (*Local-First*) sem dependência de APIs pagas externas; tema dark esportivo (Zinc + Emerald/Lime/Amber, zero azul/indigo); conformidade estrita com pesos e distâncias oficiais do livro de regras HYROX por divisão
**Scale/Scope**: Múltiplos atletas independentes; 28 semanas e 196 sessões por atleta; múltiplos registros de benchmarks/provas HYRESULT por atleta

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Princípio I: Rigor Metodológico e Ciência do Esporte**:
  - As zonas `Z1–Z5` são calculadas dinamicamente por atleta a partir da sua $FC_{máx}$ e velocidades de limiar ventilatório $VT_1$ e $VT_2$.
  - As cargas prescritas nos exercícios básicos e acessórios são escalonadas proporcionalmente ao 1RM estimado pela fórmula de Brzycki/Epley a partir dos testes de 3RM ($\text{1RM} \approx \text{3RM} / 0,90$) em Agachamento, Terra e Supino.
  - O *Fade Index* (degradação de ritmo nos 8 km) e os percentis HYRESULT utilizam distribuições normativas estratificadas por divisão (`OPEN_M`, `OPEN_F`, `PRO_M`, `PRO_F`).
- [x] **Princípio II: Integridade e Reatividade de Dados**:
  - O banco SQLite (`db/custom.db`) permanece como fonte única da verdade.
  - `Mesocycle`, `Wellness` e a nova entidade `HyresultRaceAnalysis` possuem vínculo relacional `athleteId` com `onDelete: Cascade`, garantindo isolamento estrito entre atletas.
  - Todos os cálculos de percentis, radar, *Fade Index*, *Time Savings* e geração de periodização rodam no servidor (`src/lib/`).
- [x] **Princípio III: UX Esportiva de Alta Performance**:
  - Seletor global de atletas e modal de cadastro/testes integrados ao cabeçalho sticky.
  - Nova aba **"Análise HYRESULT"** com estética dark esportiva (Zinc + Emerald/Lime/Amber/Red), incluindo *RadarChart* do Recharts, barras de distribuição 3 Pilares, badges de percentil (Top 5%, Top 10%, etc.) e gráfico de *Run Splits & Pace Degradation*.
- [x] **Princípio IV: Tipagem Estrita e Validação de Contrato**:
  - 100% TypeScript estrito (zero `any`), validação com esquemas Zod para criação/edição de atleta, bateria de testes e registro de resultados HYRESULT.
- [x] **Princípio V: Simplicidade Arquitetural e Desempenho Local**:
  - Nenhuma dependência externa adicionada (usa `RadarChart`, `PolarGrid`, `PolarAngleAxis`, `BarChart` e `ComposedChart` já presentes no `recharts` instalado).

## Project Structure

### Documentation (this feature)

```text
specs/003-multi-athlete-hyresult-analytics/
├── plan.md              # Este plano técnico de implementação
├── research.md          # Fase 0: Pesquisa científica, regras HYROX por divisão e anatomia HYRESULT
├── data-model.md        # Fase 1: Evolução do schema Prisma multi-atleta e DTOs
├── quickstart.md        # Fase 1: Guia de validação rápida ponta a ponta
├── contracts/           # Fase 1: Contratos de API REST e componentes UI
│   ├── api-athletes-and-hyresult.md
│   └── ui-multi-athlete-hyresult.md
├── checklists/
│   └── requirements.md  # Checklist de qualidade da especificação
└── tasks.md             # Fase 2: Lista de tarefas (/speckit-tasks)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                                  # Evolução: campos de testes no Athlete, athleteId em Mesocycle/Wellness, model HyresultRaceResult
└── seed.ts                                        # Atualizado para usar o gerador dinâmico + seed do resultado LR3MS4JI5A0E80

src/
├── app/
│   ├── api/
│   │   ├── athletes/
│   │   │   ├── route.ts                           # GET (lista atletas) + POST (cria atleta + gera periodização automática)
│   │   │   └── [id]/
│   │   │       └── route.ts                       # PATCH (atualiza testes e recalibra plano futuro) + DELETE
│   │   ├── hyresult/
│   │   │   └── route.ts                           # GET (análise HYRESULT do atleta por fonte: meta, simulação ou resultado oficial) + POST (salva/importa resultado HYRESULT)
│   │   ├── plan/
│   │   │   └── route.ts                           # Atualizado: aceita ?athleteId=... e retorna zonas dinâmicas do atleta
│   │   ├── dashboard/
│   │   │   └── route.ts                           # Atualizado: aceita ?athleteId=...
│   │   ├── wellness/
│   │   │   └── route.ts                           # Atualizado: filtra e faz upsert por athleteId + date
│   │   └── predictions/
│   │       ├── route.ts                           # Atualizado: aceita ?athleteId=...
│   │       └── simulate/
│   │           └── route.ts                       # Atualizado: aceita athleteId no payload
│   └── page.tsx                                   # Seletor global de atletas no Header, botão "Novo Atleta / Testes" e nova aba "Análise HYRESULT"
├── components/
│   └── training/
│       ├── athlete-switcher-dialog.tsx            # Seletor de atleta ativo + Dialog completo de Cadastro e Bateria de Testes Diagnósticos
│       ├── hyresult-tab.tsx                       # Aba principal de Análise HYRESULT integrada à periodização
│       ├── hyresult-radar-and-pillars.tsx         # Decomposição 3 Pilares (Run/Workouts/Roxzone) + Spider/Radar Chart de Percentis
│       ├── hyresult-splits-and-roxzone.tsx        # Análise dos 8 Run Splits (Fade Index), 8 Workouts, 8 Transições Roxzone e Time Savings
│       └── plan-tab.tsx                           # Atualizado para exibir as Zonas Z1-Z5 dinâmicas e os testes de força/ergômetros do atleta ativo
└── lib/
    ├── constants.ts                               # Tabelas oficiais de cargas HYROX por divisão (OPEN_M, OPEN_F, PRO_M, PRO_F) e curvas de percentis HYRESULT
    ├── types.ts                                   # Novos DTOs (AthleteCreateInput, HyresultAnalysisDTO, DynamicZoneDTO, etc.)
    ├── periodization-generator.ts                 # Motor determinístico que gera os 7 mesociclos, 28 semanas, sessões, cargas e zonas a partir dos testes do atleta
    ├── hyresult-analytics.ts                      # Motor analítico HYRESULT (cálculo de percentis, radar, Fade Index, Roxzone, Time Savings e prescrição por mesociclo)
    ├── analytics.ts                               # Parametrizado por athleteId
    └── predictions.ts                             # Parametrizado por athleteId e divisão do atleta
```

**Structure Decision**: A solução mantém a arquitetura monolítica *Local-First* no Next.js App Router, extraindo a lógica de criação de periodização (antes acoplada ao script `prisma/seed.ts`) para um serviço reutilizável `src/lib/periodization-generator.ts` que tanto o seed quanto a rota `POST /api/athletes` e `PATCH /api/athletes/[id]` consomem.

## Complexity Tracking

*Nenhuma violação à Constituição do projeto. Todos os gates foram aprovados sem exceções.*
