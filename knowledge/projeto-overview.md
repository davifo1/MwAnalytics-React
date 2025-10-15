# Magic Wings Server Backoffice - Visão Geral

## Informações do Projeto

### Nome e Tema
- **Nome**: Magic Wings
- **Tema**: Fantasia Medieval
- **Tipo**: MMO RPG (Unity)
- **Ambiente**: Aplicação Desktop Local (Offline)

### Stack Definida
- **Frontend**: React com JavaScript (sem TypeScript)
- **Build Tool**: Vite
- **UI Template**: Metronic v9.2.9 Demo 6 (Dark Mode)
- **CSS Framework**: Tailwind CSS (configurado no Metronic)
- **Backend**: Node.js local
- **Database**: Arquivos XML locais

## Módulos do Sistema

### Fase 1 - Módulos Core
1. **Gerenciador de Items**
   - CRUD completo de items do jogo
   - Categorização e filtros avançados
   - Editor de atributos e propriedades
   - Preview visual

2. **Gerenciador de Monstros**
   - CRUD de monstros/criaturas
   - Sistema de drops e loot tables
   - Configuração de spawn e comportamento
   - Stats e balanceamento

3. **Gerenciador de Classes**
   - Configuração de classes jogáveis
   - Sistema de skills e árvore de talentos
   - Progressão e requisitos
   - Balanceamento de stats base

4. **Dashboard de Estatísticas**
   - Visualização em tempo real
   - Gráficos e métricas do jogo
   - Análise de balanceamento
   - Relatórios exportáveis

## Princípios de Desenvolvimento

### Para IA/Claude
1. **Usar APENAS componentes do Metronic Demo 6**
2. **JavaScript puro, sem TypeScript**
3. **Estrutura baseada em Vite + React**
4. **Dark mode como padrão**
5. **Todos dados em XML local**
6. **Offline-first, sem dependências externas**

### Estrutura de Pastas
```
MWServerBKO/
├── knowledge/          # Documentação completa
├── metronic-v9.2.9/   # Template de referência
├── src/               # Código fonte
│   ├── modules/       # Módulos do sistema
│   ├── components/    # Componentes React
│   ├── layouts/       # Layouts Metronic
│   └── data/          # XMLs do jogo
└── package.json
```