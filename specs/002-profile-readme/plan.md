# Implementation Plan: GitHub Profile README & Portfolio

**Feature**: `002-profile-readme`  
**Date**: 2026-10-28  
**Spec Reference**: [spec.md](spec.md)  

---

## 1. Visão Geral da Arquitetura do Documento

O arquivo `README.md` será construído no formato GitHub Flavored Markdown (GFM) com suporte a tags HTML estilizadas (`<div align="center">`, tabelas personalizadas e tags de imagem dinâmicas). O objetivo é gerar uma experiência visualmente sofisticada sem depender de scripts locais ou assets pesados em binário, garantindo renderização instantânea no GitHub e no ecossistema mobile.

### Elementos Visuais e Serviços Integrados:
- **Banner de Topo**: Capsule Render SVG com gradiente escuro esmeralda/grafite refletindo a identidade visual atlética e tecnológica.
- **Dynamic Typing SVG**: `readme-typing-svg` para apresentação fluida de títulos de atuação.
- **Badges de Tecnologias & Redes**: Shields.io no formato `for-the-badge` com ícones oficiais Simple Icons e esquema cromático refinado.
- **GitHub Stats Cards**: Integração com `github-readme-stats` e `github-readme-streak-stats` usando o tema dark esportivo coerente (`tokyonight` ou `dark`).
- **Showcase de Projetos**: Estrutura modular em cards destacando problema, solução, stack técnica e links de acesso.

---

## 2. Estrutura de Arquivos

```
/
├── README.md                          # Arquivo principal do portfólio / perfil
├── specs/
│   └── 002-profile-readme/
│       ├── spec.md                    # Especificação de requisitos
│       ├── plan.md                    # Plano de implementação
│       └── tasks.md                   # Lista de tarefas acionáveis
└── worklog.md                         # Log de execução e histórico de tarefas
```

---

## 3. Estratégia de Implementação e Verificação

1. **Configuração de Metadados e Spec Kit**:
   - Ajustar `.specify/feature.json` para rastrear `002-profile-readme`.
2. **Desenvolvimento do README.md**:
   - Cabeçalho de impacto e biografia profissional.
   - Matriz de competências técnicas com badges categorizados.
   - Apresentação estruturada dos 4 projetos-chave (Nexus Core, WhatsApp Workout, Aegis-Notifier, Hyrox Control).
   - Cards de estatísticas e métricas de atividade do GitHub.
   - Rodapé canônico e links sociais interativos.
3. **Auditoria de Links e Renderização**:
   - Garantir que todos os URLs de contato e repositórios correspondam exatamente às diretrizes fornecidas.
4. **Deploy e Versionamento**:
   - Registro em `worklog.md`.
   - Git commit e push direto para a branch `main`.
