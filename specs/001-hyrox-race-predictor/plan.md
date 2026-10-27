# Implementation Plan: Módulo Preditivo de Tempo de Prova HYROX

**Branch**: `001-hyrox-race-predictor` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-hyrox-race-predictor/spec.md`

## Summary

O Módulo Preditivo de Tempo de Prova HYROX fornece ao atleta Rafael Nogueira e à comissão técnica uma estimativa precisa e fundamentada do tempo final de prova (ex.: 01:14:30) decomposta nos 16 segmentos oficiais (8 corridas de 1 km e 8 estações funcionais) mais o tempo de transição (Roxzone). A abordagem técnica fundamenta-se em um modelo fisiológico determinístico que combina parâmetros aeróbicos do atleta ($VO_2max$, limiares $VT1/VT2$ e $PB_{5k}$) com fatores específicos de fadiga e interferência neuromuscular induzida por cada estação (especialmente a queima de quadríceps pós-Sled Push e pós-Sandbag Lunges), alimentado pelo histórico real de testes e simulações armazenados no banco de dados SQLite.

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js & Bun runtime
**Primary Dependencies**: Next.js 16 (App Router), React 19, Prisma ORM 6, Tailwind CSS v4, shadcn/ui (Radix UI, Lucide Icons, Recharts), Zod
**Storage**: SQLite (`db/custom.db`) via Prisma Client
**Testing**: Verificação E2E local, scripts de teste de contrato de API (`curl`), linter (`bun run lint`)
**Target Platform**: Aplicação Web responsiva (desktop 1440px e mobile de treino)
**Project Type**: Web Application (Single-route SPA com App Router do Next.js)
**Performance Goals**: Tempo de cálculo de predição sub-50ms; tempo de resposta de API sub-100ms; recálculo reativo no cliente instantâneo (<16ms por frame ao mover sliders)
**Constraints**: Sem dependências externas de nuvem (execução estritamente local); paleta de cores dark esportiva (Zinc + Emerald/Amber/Lime); estrita fidelidade aos dados de prova oficiais HYROX
**Scale/Scope**: 1 atleta ativo, 28 semanas de periodização, 196 sessões, histórico de 16 splits por simulação

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Princípio I: Rigor Metodológico e Ciência do Esporte**: O modelo baseia-se em parâmetros validados ($VT1$, $VT2$, $VO_2max$) e modela o decaimento biomecânico real de corrida causado por estações de força/resistência, sem métricas arbitrárias. Preserva integralmente a comparação meta vs. projetado.
- [x] **Princípio II: Integridade e Reatividade de Dados**: O banco SQLite via Prisma é a fonte primária de calibração; os cálculos são centralizados no módulo server-side `src/lib/predictions.ts` e expostos via rota tipada `/api/predictions`.
- [x] **Princípio III: UX Esportiva de Alta Performance**: A interface adota o tema dark com acentos semânticos funcionais (Emerald para metas atingidas, Amber para atenção e Vermelho para gargalos de alto risco), com controles de edição/simulação fluídos e responsivos.
- [x] **Princípio IV: Tipagem Estrita e Validação de Contrato**: TypeScript estrito sem `any`; interfaces DTO completas em `src/lib/types.ts` e validação Zod para requisições de simulação.
- [x] **Princípio V: Simplicidade Arquitetural e Desempenho Local**: Sem microserviços adicionais; implementado como extensão natural da arquitetura Next.js App Router existente.

## Project Structure

### Documentation (this feature)

```text
specs/001-hyrox-race-predictor/
├── plan.md              # Este plano de implementação
├── research.md          # Decisões fisiológicas e arquiteturais (Fase 0)
├── data-model.md        # Entidades, DTOs e esquemas de dados (Fase 1)
├── quickstart.md        # Guia de execução e validação ponta a ponta (Fase 1)
├── contracts/           # Contratos de API e UI (Fase 1)
│   ├── api-predictions.md
│   └── ui-predictor.md
├── checklists/
│   └── requirements.md  # Checklist de qualidade da especificação
└── tasks.md             # Tarefas de implementação (Fase 2 - gerado via /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   └── predictions/
│   │       ├── route.ts              # GET /api/predictions (cálculo nominal)
│   │       └── simulate/
│   │           └── route.ts          # POST /api/predictions/simulate (cenários what-if)
│   └── page.tsx                      # Adição da aba "Previsão" e integração da UI
├── components/
│   └── training/
│       └── predictor-tab.tsx         # Componente com KPIs, tabela de 16 splits e simulador
└── lib/
    ├── predictions.ts                # Motor fisiológico determinístico e modelagem de fadiga
    └── types.ts                      # Interfaces DTO (RacePredictionDTO, SegmentPredictionSplitDTO)
```

**Structure Decision**: A feature integra-se diretamente na estrutura SPA existente em `src/app/` e `src/components/training/`, complementando os módulos analíticos já disponíveis sem gerar overhead estrutural.

## Complexity Tracking

*Nenhuma violação constitucional identificada. A implementação respeita integralmente os princípios do projeto.*
