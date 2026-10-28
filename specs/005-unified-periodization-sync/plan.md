# Implementation Plan: Sincronização Unificada de Dados entre Abas, Zero Treinos Pré-Confirmados e Acompanhamento da Periodização no HYRESULT

**Branch**: `005-unified-periodization-sync` | **Date**: 2026-10-28 | **Spec**: [spec.md](file:///c:/Users/MUSCULA%C3%87%C3%83O/Downloads/workspace-f9fd82ab-0436-4680-8383-a190be649738/specs/005-unified-periodization-sync/spec.md)

## Summary

Eliminar 100% dos desvios de informação entre as 5 abas da aplicação (**Painel**, **Periodização**, **Diário de Treino**, **Previsão de Prova** e **Análise HYRESULT**):
1. **Zero Treinos Pré-Confirmados**: Inicializar todos os atletas com `0` treinos concluídos (`196/196 PLANEJADO`), para que nenhum treino conte sem confirmação explícita do usuário.
2. **Confirmação 1-Clique e Auto-Preenchimento Realizado**: Ao confirmar um treino (no card do Diário ou na gaveta `SessionSheet`), preencher automaticamente os valores realizados a partir dos prescritos quando não informados manualmente; e ao reverter para `PLANEJADO`, limpar todos os valores realizados.
3. **Painel Geral Estritamente Realizado (`analytics.ts`)**: Remover o fallback para `loadPrescribed` em sessões `PLANEJADO` nos cálculos de Fitness/Fadiga/Forma e Distribuição por Modalidade.
4. **HYRESULT Acompanhando as 28 Semanas da Periodização**: Integrar a Curva Completa da Periodização (`S1 → S28`) e os marcos de todos os mesociclos (`S1`, `S6`, `S11`, `S17`, `S21`, `S24`, `S26`, `S28`) na aba **Análise HYRESULT**, mantendo paridade de `0 segundos` de diferença com a aba **Previsão de Prova**.

## Technical Context

**Language/Version**: TypeScript 5.x (Strict mode) sobre Next.js 16.4 (App Router) e React 19  
**Primary Dependencies**: Prisma ORM 6.19, Recharts 2.15, Tailwind CSS v4, Radix UI / `shadcn/ui`, Lucide Icons  
**Storage**: SQLite (`db/custom.db`) via Prisma  
**Testing**: `npx tsc --noEmit`, `npm run lint`, e verificação de paridade numérica entre as 5 abas com `0` e `N` treinos confirmados
