# Sistema de Loot de Monstros - Magic Wings

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Sistema de Power](#sistema-de-power)
3. [Sistema de Level Default](#sistema-de-level-default)
4. [Sistema de Resource Balance](#sistema-de-resource-balance)
5. [Sistema de Budget (Gold Per Level)](#sistema-de-budget-gold-per-level)
6. [Sistema de Unlock Level](#sistema-de-unlock-level)
7. [Sistema de Prioridade de Unlock](#sistema-de-prioridade-de-unlock)
8. [Sistema de Legendary Drop](#sistema-de-legendary-drop)
9. [Sistema de Race Items](#sistema-de-race-items)
10. [Fluxo de Trabalho](#fluxo-de-trabalho)

---

## Visão Geral

O sistema de loot de monstros no Magic Wings é baseado em uma economia balanceada onde o **Power** do monstro determina todos os aspectos de recompensas. O objetivo é garantir que:

- Monstros tem level (nível), e pode ser encontrado no mapa em diferentes areas com níveis diferentes, quanto maior o nível mais forte
- Monstros mais poderosos dão recompensas melhores
- O progresso do jogador é consistente e previsível
- Items são desbloqueados gradualmente conforme o jogador evolui
- O balanceamento pode ser ajustado de forma centralizada

### ⚠️ Conceito Importante: Níveis

**Default Level** = Nível DO MONSTRO (não do jogador!)
- É uma propriedade do monstro baseada no Power
- Usado para calcular o budget de loot
- Monstros mais fortes têm MAIOR budget per level
- Isso permite que items mais valiosos desbloqueiem em unlock levels mais baixos
- Pprogressão controlada: budget não cresce tão explosivamente quanto o gold direto (porque está dividido pelo defaultLevel)

**Unlock Level** = Threshold numérico (não é nível do jogador!)
- Define a ordem/momento em que items desbloqueiam
- Calculado baseado no custo acumulado vs budget do monstro
- É apenas um contador sequencial (0, 50, 100, 200, etc)

---

## Sistema de Power

### Conceito
O **Power** é o valor central que determina a força de um monstro e todas as suas recompensas. É uma escala de **0 a 15**.

### Valores de Referência
- **Power 0-3**: Monstros iniciais (Rat, Spider, Wolf)
- **Power 4-7**: Monstros intermediários (Orc, Cyclops, Minotaur)
- **Power 8-11**: Monstros avançados (Dragon, Demon, Hero)
- **Power 12-15**: Monstros end-game (Dragon Lord, Fury, Juggernaut)

### Impacto do Power
1. **XP Base**: `1.55 * (power ^ 1.7)` - Crescimento exponencial
2. **Gold per Kill**: Tabela fixa de valores (5 → 8000 gold)
3. **Default Level**: Nível do monstro (usado para cálculo de budget)
4. **Budget per Level**: Orçamento de loot por nível do monstro

**Arquivo de referência**: `src/utils/rewardsCalculator.js`

---

## Sistema de Level Default

### Conceito
Cada monstro tem um **Default Level** (nível do monstro) baseado no seu Power. Este valor representa:
- O nível do monstro no mundo do jogo
- Base para cálculo de budget de loot (quanto mais alto o level, menor o budget per level)
- Referência para balanceamento de spawn e progressão

### Cálculo
```javascript
// Fórmula em powerCalculator.js
getRecommendedDefaultLevel(power)
```

### Exemplo
- Power 4 → Default Level ~20
- Power 8 → Default Level ~50
- Power 12 → Default Level ~100

**Regra de Negócio**: Quanto maior o Power, maior o Default Level recomendado.

---

## Sistema de Resource Balance

### Conceito
Permite ajustar a distribuição entre **XP** e **Loot** que um monstro fornece, mantendo o valor total constante.

### Valores Possíveis
- **Equals**: 50% XP / 50% Loot (padrão)
- **Exp1 a Exp4**: Mais XP, menos Loot
- **Loot1 a Loot4**: Mais Loot, menos XP

### Multiplicadores de Loot
```javascript
// Fórmula: 1 + (level * 0.0375)
Loot0 = 1.0    (100%)
Loot1 = 1.0375 (103.75%)
Loot2 = 1.075  (107.5%)
Loot3 = 1.1125 (111.25%)
Loot4 = 1.15   (115%)
```

### Aplicação
- Monstros Boss: Geralmente **Loot3** ou **Loot4**
- Monstros comuns de farm: **Loot1** ou **Loot2**
- Monstros de XP: **Exp1** ou **Exp2**

**Arquivo de referência**: `src/utils/rewardsCalculator.js` (getBalanceMultiplier)

---

## Sistema de Budget (Gold Per Level)

### Conceito
O **Budget per Level** é o orçamento de loot que um monstro distribui **por nível do próprio monstro**. É a base para calcular unlock levels.

A lógica é: quanto maior o level do monstro, menor o budget per level (pois o gold total já é alto). Isso garante progressão controlada de items.

### Cálculo
```javascript
budgetPerLevel = (goldPerKill / defaultLevel) * balanceMultiplier
```

### Exemplo Prático
**Warlock (Power 8, Loot2)**
- Gold per Kill: 1100
- Default Level: 50 (nível do monstro)
- Balance Multiplier: 1.075 (Loot2)
- **Budget per Level**: (1100 / 50) * 1.075 = **23.65 gp/level**

### Interpretação
O budget de 23.65 gp/level é usado como threshold para distribuir items no loot:
- Cada item tem um valor esperado
- Quando o custo acumulado ultrapassa o budget, incrementa o unlock level
- Isso cria uma progressão controlada baseada no nível/força do monstro

**Arquivo de referência**: `src/utils/rewardsCalculator.js` (getGoldPerLevelByPower)

---

## Sistema de Unlock Level

### Conceito
Cada item no loot tem um **Unlock Level** - um valor numérico que determina a ordem/momento em que ele começa a dropar. **Não é o nível do jogador**, mas sim um threshold baseado no custo acumulado dos items versus o budget do monstro.

### Cálculo
O unlock level é calculado baseado no **custo acumulado** dos items versus o **budget per level**:

1. Items são ordenados por prioridade (ver próxima seção)
2. Para cada item, soma-se seu valor esperado ao custo acumulado
3. Enquanto custo acumulado > budget per level:
   - Incrementa o unlock level
   - Reduz o custo acumulado pelo budget

### Fórmula do Valor Esperado
```javascript
expectedValue = itemValue * (chance / 100) * quantity
```

Onde:
- **itemValue**: valuation ou sellPrice do item
- **chance**: % de drop (0-100)
- **quantity**: metade do countMax (ou 1 se countMax = 1)

### Exemplo Prático
**Warlock (budget = 23.65 gp/level)**

| Item | Valor | Chance | Qty | Expected Value | Custo Acumulado | Unlock Level |
|------|-------|--------|-----|----------------|-----------------|--------------|
| wind | 10 | 4% | 2 | 0.8 | 0.8 | 0 |
| warlock beard | 500 | 5% | 1 | 25 | 25.8 | 116 |
| energy gem | 100 | 2% | 1 | 2 | 27.8 | 154 |

**Arquivo de referência**: `src/utils/unlockLevelCalculator.js`

### Configuração
- **MAX_UNLOCK_LEVEL**: Define o cap máximo de unlock (ou -1 para ilimitado)
- Localização: `src/utils/unlockLevelCalculator.js` (linha 6)

---

## Sistema de Prioridade de Unlock

### Conceito
A ordem em que os items são desbloqueados segue uma hierarquia de prioridade. Items mais importantes desbloqueiam primeiro.

### Ordem de Prioridade (do primeiro ao último unlock)

1. **Items tier: basic ou common**
   - Basic desbloqueia antes de common
   - Garante que items básicos estejam sempre disponíveis

2. **Items com bko_origin = MainMatLegendary**
   - Materiais principais para craft lendário
   - Prioridade alta para progressão de equipamento

3. **Items com bko_origin = SecondaryMatLegendary**
   - Materiais secundários para craft lendário
   - Depois dos principais

4. **Demais items ordenados por valor esperado**
   - **MENOR valor primeiro** = unlocks antes
   - Items baratos desbloqueiam primeiro
   - Items caros desbloqueiam depois

### Exemplo de Ordenação
```
1. Wind (tier: common, valor: 10) → Unlock Level 0
2. Warlock Beard (origin: MainMatLegendary) → Unlock Level 116
3. Energy Gem (valor esperado: 2) → Unlock Level 154
4. Orange (valor esperado: 62.5) → Unlock Level 202
5. Seed of the Gods (valor esperado: 300) → Unlock Level 598
```

### Sincronização Crítica
⚠️ **IMPORTANTE**: Sempre que a função `sortLootItemsByPriority()` mudar:
1. Atualizar código em: `src/utils/unlockLevelCalculator.js`
2. Atualizar tooltip em: `src/components/MonsterLootTable.jsx` (linhas 94-103)
3. Atualizar esta documentação

**Arquivo de referência**: `src/utils/unlockLevelCalculator.js` (sortLootItemsByPriority)

---

## Sistema de Legendary Drop

### Conceito
Items lendários usam um sistema de drop específico baseado em:
- Tempo de farm esperado
- Quantidade de materiais necessários
- Ajuste por power do monstro

### Constantes do Sistema

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| KILL_PER_HOUR | 120 | Monstros mortos por hora |
| POWER_BASE | 4 | Power de referência base |
| TIME_TO_DROP_30_IN_HOURS | 9 | Horas para dropar 30 materiais |
| TOTAL_MAIN_MATERIALS | 30 | Materiais necessários para craft |
| POWER_ADJUSTMENT_MULTIPLIER | 0.2 | 20% de ajuste por power |

### Cálculo de Chance de Drop

```javascript
// 1. Total de monstros mortos
totalKills = KILL_PER_HOUR * TIME_TO_DROP_30_IN_HOURS
// 120 * 9 = 1080 monstros

// 2. Chance base
baseDropChance = (TOTAL_MAIN_MATERIALS / totalKills) * 100
// (30 / 1080) * 100 = 2.78%

// 3. Ajuste por power
adjustedDropChance = baseDropChance * (1 + (monsterPower - POWER_BASE) * 0.2)
```

### Exemplos por Power

| Power | Ajuste | Chance Final |
|-------|--------|--------------|
| 4 (base) | 1.0x | 2.78% |
| 6 | 1.4x | 3.89% |
| 8 | 1.8x | 5.00% |
| 10 | 2.2x | 6.11% |
| 12 | 2.6x | 7.22% |

### Regra de Negócio
- Monstros mais fortes dropam materiais lendários com maior frequência
- O tempo total para completar um craft se mantém próximo de 9 horas
- O valor salvo no XML é multiplicado por 1000 (5% = 5000)

**Arquivo de referência**: `src/utils/legendaryDropCalculator.js`

---

## Sistema de Race Items

### Conceito
Cada raça de monstro pode dropar items específicos baseados em:
- Categoria do loot (gem, imbuement, consumables, etc)
- Tier do item (basic, common, rare, legendary)
- Power range do monstro

### Estrutura de Configuração

**Arquivo**: `public/data/loot-monster/loot-category-tiers.json`

```json
{
  "gem": {
    "basic": ["small ruby", "small sapphire"],
    "common": ["ruby", "sapphire"],
    "rare": ["perfect ruby", "perfect sapphire"]
  }
}
```

**Arquivo**: `public/data/loot-monster/race-drops.json`

```json
{
  "Humanoid": {
    "consumables": [
      { "itemName": "wind", "tier": "basic", "powerRange": [0, 15], "chance": 4000 },
      { "itemName": "seed of the gods", "tier": "legendary", "powerRange": [8, 15], "chance": 2000 }
    ]
  }
}
```

### Power Range
- Define em qual range de power o item pode dropar
- Exemplo: `[8, 15]` = apenas monstros com power 8 ou superior
- Permite progressão de items conforme força do monstro

### Processo de Adição Automática
1. Identifica a raça do monstro
2. Busca items configurados para aquela raça
3. Verifica se power do monstro está no range do item
4. Verifica se tier do item é compatível com power
5. Adiciona item com chance configurada
6. **Recalcula unlock levels** após adicionar

**Endpoints relacionados**:
- `/api/monsters/add-race-items` (vite.config.js linha 505)
- `/api/monsters/update-unlock-levels` (vite.config.js linha 391)

---

## Fluxo de Trabalho

### 1. Criação de Novo Monstro

```
1. Define Power (0-15)
   ↓
2. Sistema calcula automaticamente:
   - XP base
   - Gold per kill
   - Default level
   - Budget per level
   ↓
3. Define Resource Balance (Equals/Loot1-4/Exp1-4)
   ↓
4. Adiciona loot items manualmente
   ↓
5. Sistema calcula unlock levels (REC)
   ↓
6. Aplica unlock levels recomendados
```

### 2. Balanceamento de Loot

```
1. Ajusta Power se recompensas estão erradas
   ↓
2. Ajusta Resource Balance para Loot/XP
   ↓
3. Adiciona/Remove items do loot
   ↓
4. Recalcula unlock levels (botão REC)
   ↓
5. Verifica valores esperados na coluna Value
   ↓
6. Salva mudanças
```

### 3. Adição em Massa (Race Items)

```
1. Filtra monstros desejados
   ↓
2. Clica "Add Race Items to All"
   ↓
3. Sistema para cada monstro:
   - Remove items antigos da categoria
   - Adiciona novos items por raça/tier/power
   - Recalcula unlock levels automaticamente
   ↓
4. Verifica resultados
```

### 4. Bulk Update de Unlock Levels

```
1. Seleciona monstros
   ↓
2. Clica "Bulk Actions" → "Recalculate Unlock Levels"
   ↓
3. Sistema:
   - Carrega loot de cada monstro
   - Calcula unlock levels usando função centralizada
   - Salva novos valores no XML
   ↓
4. Unlock levels atualizados
```

---

## Regras de Negócio Críticas

### ⚠️ Sempre Recalcular Unlock Levels Após:
1. Adicionar ou remover items do loot
2. Mudar chance ou countMax de items
3. Mudar Resource Balance do monstro
4. Mudar Power do monstro
5. Executar "Add Race Items to All"
6. Importar configurações (Equip Build Primary)

### ⚠️ Sincronização de Prioridade
A função `sortLootItemsByPriority()` é usada em:
1. Cálculo de unlock levels (REC)
2. Add Race Items to All
3. Exibição da loot table
4. Recálculo em massa

**Se mudar a prioridade, atualizar**:
- Código: `src/utils/unlockLevelCalculator.js`
- Tooltip: `src/components/MonsterLootTable.jsx`
- Documentação: Este arquivo

### ⚠️ Valores no XML
- **Chance**: Salvo como valor * 1000 (5% = 5000)
- **Unlock Level**: Valor direto (100 = level 100)
- **Gold Coins**: NÃO tem unlock level (sempre 0)

---

## Fórmulas de Referência Rápida

### XP Base
```
xp = 1.55 * (power ^ 1.7)
```

### Gold per Kill
```
Tabela fixa: [5, 10, 50, 150, 550, 800, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 8000]
goldPerKill = valores[power] * 0.55
```

### Budget per Level
```
budgetPerLevel = (goldPerKill / defaultLevel) * balanceMultiplier
```

### Balance Multiplier
```
Loot: 1 + (level * 0.0375)  // level = 1 a 4
Exp:  1 - (level * 0.0375)  // level = 1 a 4
```

### Valor Esperado de Item
```
expectedValue = itemValue * (chance / 100) * quantidade
quantidade = countMax === 1 ? 1 : floor(countMax / 2)
```

### Unlock Level
```
cumulativeCost = 0
currentLevel = 0

for each item (ordenado por prioridade):
  cumulativeCost += expectedValue

  while cumulativeCost > budgetPerLevel:
    currentLevel++
    cumulativeCost -= budgetPerLevel

  item.unlockLevel = currentLevel
```

### Legendary Drop Chance
```
baseChance = (30 / (120 * 9)) * 100 = 2.78%
adjustedChance = baseChance * (1 + (power - 4) * 0.2)
```

---

## Arquivos de Código Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/utils/rewardsCalculator.js` | Cálculos de XP, Gold, Budget, Balance |
| `src/utils/unlockLevelCalculator.js` | Ordenação e cálculo de unlock levels |
| `src/utils/legendaryDropCalculator.js` | Sistema de drop lendário |
| `src/utils/powerCalculator.js` | Cálculo de default level |
| `src/services/monsterService.js` | Parsing de XML e lógica de monstros |
| `vite.config.js` | Endpoints de API (add race items, update unlock levels) |
| `src/components/MonsterLootTable.jsx` | UI da tabela de loot |
| `src/modules/monsters/MonsterDetailsOptimized.jsx` | Tela de edição de monstros |

---

## Configurações JSON

| Arquivo | Propósito |
|---------|-----------|
| `public/data/loot-monster/loot-category-tiers.json` | Define items por categoria e tier |
| `public/data/loot-monster/race-drops.json` | Define drops por raça de monstro |
| `public/data/equip-build-primary-pref.json` | Configuração de materiais lendários |

---

## Melhorias Futuras Sugeridas

### 1. Sistema de Validação Automática
- Validar que unlock levels estão dentro do esperado
- Alertar se valor total de loot excede budget significativamente
- Verificar consistência entre REC e valores salvos

### 2. Presets de Resource Balance
- Templates prontos para tipos de monstro (Boss, Farm, XP)
- Aplicação em massa de presets

### 3. Simulador de Economia
- Calcular gold/hora por monstro
- Projetar inflação baseado em spawns
- Balanceamento de itens raros

### 4. Dashboard de Métricas
- Distribuição de unlock levels por power
- Comparação de rewards entre monstros similares
- Gaps na progressão de items

### 5. Sistema de Histórico
- Rastrear mudanças em Power e Resource Balance
- Comparar impacto de alterações
- Rollback de mudanças problemáticas

---

**Última atualização**: 2025-10-05
**Versão do sistema**: 1.0
**Autor**: Sistema de documentação automática
