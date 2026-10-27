# Quickstart & Guia de Validação: Módulo Preditivo HYROX

**Feature**: `001-hyrox-race-predictor`
**Data**: 2026-10-27

Este guia descreve os cenários de teste e comandos executáveis para validar o funcionamento do módulo preditivo de ponta a ponta.

---

## 1. Pré-Requisitos

1. Banco de dados inicializado com os dados do atleta Rafael Nogueira (`db/custom.db`).
2. Servidor de desenvolvimento Next.js ativo na porta 3000 (ou iniciado via `bun run dev` / `npm run dev`).
3. Verificação de contratos: [api-predictions.md](contracts/api-predictions.md) e [data-model.md](data-model.md).

---

## 2. Cenários de Validação

### Cenário 1: Consulta da Projeção Base via API
**Objetivo**: Validar se o endpoint `GET /api/predictions` retorna os cálculos coerentes com o perfil do atleta.

**Comando de Teste**:
```bash
curl -s http://localhost:3000/api/predictions | jq .
```

**Resultado Esperado**:
- Status HTTP `200 OK`.
- Campo `targetGoalTimeSec` presente e correspondente à meta do atleta (~01:15:00 = 4500s).
- Campos `realisticTotalSec`, `optimisticTotalSec` e `conservativeTotalSec` calculados, com `optimisticTotalSec < realisticTotalSec < conservativeTotalSec`.
- Array `segments` com exatamente 16 itens mais soma coerente com `totalRunSec` e `totalStationsSec`.
- Erro absoluto de consistência igual a 0: `realisticTotalSec == totalRunSec + totalStationsSec + roxzoneSec`.

---

### Cenário 2: Simulação Interativa "What-If"
**Objetivo**: Validar se ajustes manuais de pace de corrida e tempos de estação são processados com consistência.

**Comando de Teste**:
```bash
curl -s -X POST http://localhost:3000/api/predictions/simulate \
  -H "Content-Type: application/json" \
  -d '{"basePaceAdjustmentSec": -10, "stationAdjustments": {"SLED_PUSH": -15}}' | jq .
```

**Resultado Esperado**:
- Status HTTP `200 OK`.
- Tempo de corrida total reduzido em 80s ($-10\text{s} \times 8\text{ corridas}$).
- Tempo da estação Sled Push reduzido em 15s.
- `realisticTotalSec` recalculado refletindo a economia de 95s no total.

---

### Cenário 3: Validação da Interface do Usuário
**Objetivo**: Garantir que a renderização visual respeita o design system e as regras esportivas.

**Passos**:
1. Abrir a aplicação em `http://localhost:3000`.
2. Acessar a aba **Previsão de Prova**.
3. Verificar a exibição do tempo total projetado e o delta em relação à meta (badge verde/âmbar).
4. Conferir a tabela dos 16 segmentos ordenada cronologicamente (Corrida 1 → SkiErg → Corrida 2 → Sled Push ... → Wall Balls).
5. Mover o controle deslizante de ajuste de pace de corrida e verificar que a projeção na tela é recalculada instantaneamente sem recarregar a página.
