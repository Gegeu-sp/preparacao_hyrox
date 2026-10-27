<!--
=== Sync Impact Report ===
- Version change: 0.0.0 (Template Inicial) → 1.0.0
- List of modified principles:
  * [PRINCIPLE_1_NAME] → I. Rigor Metodológico e Ciência do Esporte (Sports Science First)
  * [PRINCIPLE_2_NAME] → II. Integridade e Reatividade de Dados (Data Integrity & Server-Side Analytics)
  * [PRINCIPLE_3_NAME] → III. UX Esportiva de Alta Performance (Athlete-Centric UI/UX)
  * [PRINCIPLE_4_NAME] → IV. Tipagem Estrita e Validação de Contrato (Strict Typing & Validation)
  * [PRINCIPLE_5_NAME] → V. Simplicidade Arquitetural e Desempenho Local (Local-First Simplicity)
- Added sections:
  * Diretrizes Tecnológicas e Padrões da Stack
  * Fluxo de Desenvolvimento e Garantia de Qualidade
- Removed sections: Nenhuma
- Follow-up TODOs: Nenhum placeholder pendente
==========================
-->

# HYROX CONTROL Constitution

## Core Principles

### I. Rigor Metodológico e Ciência do Esporte (Sports Science First)
Todos os cálculos de carga, prontidão, fadiga e aderência DEVEM seguir formulações científicas
consolidadas (sRPE de Foster, modelo EWMA 42:7 de Banister para fitness/fadiga, ACWR 7:28 e zonas
ventilatórias VT1/VT2 baseadas em testes incrementais). Nenhuma métrica ou recomendação DEVE ser
inferida sem rastreabilidade e fórmula explícita. A integridade do comparativo entre planejamento
(Prescrito) e execução real (Realizado) DEVE ser mantida inviolável em todas as sessões.

### II. Integridade e Reatividade de Dados (Data Integrity & Server-Side Analytics)
O banco de dados SQLite gerenciado via Prisma é a única fonte da verdade (Single Source of Truth).
Todos os cálculos agregados de volume, tonelagem (Σ séries × reps × carga) e carga sRPE DEVEM ser
processados ou validados no backend (`src/lib/analytics.ts` e rotas `/api/*`), impedindo deriva de
estado entre cliente e banco. Qualquer mutação em sessões, exercícios ou estações DEVE acionar o
recálculo imediato e idempotente dos indicadores dependentes.

### III. UX Esportiva de Alta Performance (Athlete-Centric UI/UX)
A interface DEVE proporcionar visualização clara e imediata do status de prontidão e do plano do
atleta. O design system DEVE aderir rigorosamente ao tema dark esportivo com base neutra (Zinc) e
acentos semânticos (Emerald para concluído/ótimo, Amber/Yellow para atenção, Lime para destaques),
excluindo o uso de esquemas de cor genéricos (como tons azuis/indigo descontextualizados). Todas as
telas e componentes de edição rápida (Sheets e Dialogs) DEVEM ser responsivos e otimizados tanto
para desktop quanto para uso mobile no ambiente de treino.

### IV. Tipagem Estrita e Validação de Contrato (Strict Typing & Validation)
O projeto DEVE manter tipagem estrita no TypeScript em 100% da base; o uso de `any` é estritamente
proibido. Como o SQLite não possui suporte a enums nativos, todos os campos de domínio categorizados
(tipos de sessão, status, fases e estações Hyrox) DEVEM ser validados contra esquemas Zod e as
constantes tipadas centrais (`src/lib/constants.ts`). Payloads de requisição e resposta de APIs
DEVEM ser fortemente tipados.

### V. Simplicidade Arquitetural e Desempenho Local (Local-First Simplicity)
A arquitetura DEVE preservar o modelo SPA no Next.js App Router com baixa complexidade de
infraestrutura. Consultas e mutações locais no banco SQLite DEVEM responder em tempo sub-100ms.
Novas dependências externas DEVEM ser estritamente justificadas pelo princípio YAGNI (You Aren't
Gonna Need It), evitando abstrações prematuras ou acoplamento a serviços de terceiros sem
necessidade esportiva ou operacional explícita.

## Diretrizes Tecnológicas e Padrões da Stack
A aplicação é construída sobre Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4,
shadcn/ui (Radix UI, Recharts, Lucide Icons) e Prisma ORM 6 com SQLite local (`db/custom.db`).
Formatações numéricas e cronológicas DEVEM respeitar a localidade `pt-BR` e os padrões atléticos
(mm:ss para splits de estações Hyrox, km com 1 casa decimal, tonelagem em kg). Modificações no
modelo de dados DEVEM ser aplicadas via comandos Prisma oficiais (`db:push` ou `db:migrate`).

## Fluxo de Desenvolvimento e Garantia de Qualidade
Todo código produzido DEVE ser verificado contra as regras de lint (`bun run lint` ou `npm run lint`)
sem introduzir avisos ou erros residuais. Qualquer nova funcionalidade visual DEVE ser validada em
múltiplos viewports (desktop 1440px e mobile). Tarefas e decisões de implementação DEVEM manter
rastreabilidade documental através do Spec Kit e/ou registros em `worklog.md`.

## Governance
Esta Constituição é a referência normativa máxima para todas as decisões de produto, arquitetura e
código do HYROX CONTROL. Nenhuma convenção ou atalho técnico pode violar os princípios aqui
estabelecidos. Emendas constitucionais exigem atualização documentada da versão semântica (MAJOR
para alteração de princípios fundamentais, MINOR para adições de seções ou princípios, PATCH para
refinamentos e correções textuais). Todas as especificações geradas via Spec Kit DEVEM ser auditadas
contra esta Constituição.

**Version**: 1.0.0 | **Ratified**: 2026-10-27 | **Last Amended**: 2026-10-27
