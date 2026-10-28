# Quickstart & Validation Guide: Simulação Preditiva Dinâmica & Evolução HYRESULT Treino a Treino

**Feature**: `004-live-periodization-evolution`  
**Date**: 2026-10-28

## 1. Pré-requisitos e Preparação

```powershell
# 1. Atualizar os dados de demonstração multi-atleta com sessões concluídas nas Semanas 1 e 2
npx tsx prisma/seed.ts

# 2. Verificar tipagem estrita e lint
npx tsc --noEmit
npm run lint
```

## 2. Roteiro de Validação End-to-End (E2E)

### Cenário A — Previsão de Prova Guiada pela Periodização (`PredictorTab`)
1. Acesse `http://localhost:3000` e abra a aba **Previsão de Prova**.
2. Verifique o novo painel **Acompanhamento da Periodização (S1 → Hoje → S28)**:
   - Deve exibir o **Tempo Inicial (Diagnóstico S1)**, o **Estado Atual Simulado (Pós-Treinos Concluídos)**, o **Tempo Esperado para a Semana Atual** e a **Meta Final S28**, com o ganho líquido em segundos já conquistado.
3. Inspecione o gráfico **Curva de Simulação das 28 Semanas (S1–S28)** comparando a curva planejada pela periodização com a simulação real executada.

### Cenário B — Análise HYRESULT Viva Treino a Treino (`HyresultTab`)
1. Abra a aba **Análise HYRESULT**.
2. Confirme que a fonte ativa padrão é **"Evolução Atual — Treino a Treino (Ao Vivo)"**.
3. Verifique a seção **Evolução Treino a Treino (Impacto de Cada Sessão)** mostrando o gráfico de queda progressiva dos 3 Pilares (`Running`, `Workouts`, `Roxzone`) e a tabela cronológica das sessões concluídas com o delta em segundos (ex.: `-12s`) de cada treino.
4. No **Gráfico Radar de 10 Eixos**, confira as 3 camadas comparativas: **Diagnóstico Inicial (S1)**, **Estado Atual (Ao Vivo)** e **Meta S28**.

### Cenário C — Reatividade ao Concluir um Novo Treino no Diário de Treino
1. Vá até a aba **Diário de Treino**, clique em qualquer sessão com status `PLANEJADO`, altere o status para `CONCLUIDO`, preencha a duração/km ou cargas/splits realizados e clique em **Salvar**.
2. Volte para **Previsão de Prova** e **Análise HYRESULT**:
   - O contador de treinos computados deve aumentar em `+1`;
   - A nova sessão deve aparecer imediatamente no topo/final da **Linha do Tempo Treino a Treino** com seu impacto em segundos calculado;
   - Os 3 Pilares, o Radar e a Curva da Periodização devem refletir a nova sessão com consistência cronométrica exata ($\text{Running} + \text{Workouts} + \text{Roxzone} = \text{Total}$).

