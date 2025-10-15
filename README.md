# MWServerBKO - Magic Wings Server Backoffice

Sistema desktop local para gerenciar dados do jogo Magic Wings (MMO RPG). Funciona 100% offline usando arquivos XML, LUA e OTBM como banco de dados.

## 🎮 Funcionalidades Principais

- **Gerenciamento de Monstros**: CRUD completo com editor visual
- **Balance Automático**: Sistema inteligente que calcula Power, Level, XP e Gold
- **Editor de Loot**: Gerencia drops com autocomplete de items
- **Spawn Count**: Visualiza quantas vezes cada monstro aparece no mapa
- **Item Management**: Categorização e gerenciamento de items do jogo
- **Fórmulas Configuráveis**: Ajuste todo o balanceamento via JSON
- **Preview em Tempo Real**: Veja as mudanças instantaneamente

## 🛠️ Tecnologias Necessárias

Antes de começar, você precisa ter instalado:

1. **Node.js** (versão 18 ou superior)
   - Download: https://nodejs.org/
   - Para verificar se já tem: abra o terminal e digite `node --version`

2. **Git** (opcional, mas recomendado)
   - Download: https://git-scm.com/

## 📦 Instalação

### Passo 1: Baixar o projeto

Clone o repositório ou baixe o ZIP:
```bash
git clone <url-do-repositorio>
cd MWServerBKO

Atualiza sem mudar settings: git pull --strategy-option=ours

```

### Passo 2: Instalar dependências

Abra o terminal na pasta do projeto e execute:
```bash
npm install --legacy-peer-deps
```

Aguarde alguns minutos enquanto todas as bibliotecas são instaladas.

### Passo 3: Configurar caminhos dos arquivos

Abra o arquivo `public/data/settings.json` e configure os caminhos absolutos:

```json
{
  "database": {
    "monstersPath": "C:/caminho/completo/para/pasta/monsters",
    "baldurPath": "C:/caminho/completo/para/arquivo/baldur.lua",
    "movementsPath": "C:/caminho/completo/para/arquivo/movements.xml",
    "worldPath": "C:/caminho/completo/para/pasta/world"
  }
}
```

**Importante:**
- Use barras normais `/` mesmo no Windows (não use `\`)
- Coloque o caminho COMPLETO (ex: `C:/Users/SeuNome/Documentos/...`)
- A pasta `monsters` deve conter os arquivos XML dos monstros
- A pasta `world` deve conter o arquivo `world-spawn.xml`

**Exemplo real:**
```json
{
  "database": {
    "monstersPath": "C:/Users/davif/WebstormProjects/MWServerBKO/public/data/monsters",
    "baldurPath": "C:/Users/davif/WebstormProjects/MWServerBKO/public/data/baldur.lua",
    "movementsPath": "C:/Users/davif/WebstormProjects/MWServerBKO/public/data/movements.xml",
    "worldPath": "C:/Users/davif/WebstormProjects/MWServerBKO/public/data/world"
  }
}
```

## 🚀 Como Rodar

No terminal, execute:
```bash
npm install --legacy-peer-deps
```

O sistema abrirá automaticamente no navegador em `http://localhost:5173`

## 📐 Fórmulas Chave do Sistema

Todas as fórmulas de balanceamento estão em **`src/utils/`**:

### 1. **powerCalculator.js** - Cálculo de Power (0-15)

Calcula o "poder" do monstro baseado nos atributos:

**Fórmula:**
```javascript
Power = (HP × 2.0) + (maior entre ATK e SATK × 1.0) +
        (Speed × 0.3) + ((DEF + SDEF) × 0.5)
```

**Pesos:**
- HP: 2.0 (mais importante)
- Burst (ATK ou SATK): 1.0
- Speed: 0.3
- Resistência (DEF + SDEF): 0.5

**Retorno:** Valor de 0 a 15 (normalizado)

---

### 2. **baseStatsRoleCalculator.js** - Classificação de Papel

Determina o "papel" do monstro baseado na distribuição de stats:

**Papéis possíveis:**
- `GlassCannon`: Ataque alto (90%+), HP/DEF baixos (<40%)
- `Speedster`: Speed alto (90%+) com ataque bom (60%+)
- `PhysicalAttacker`: ATK > SATK (+40%)
- `SpecialAttacker`: SATK > ATK (+40%)
- `PhysicalTank`: DEF alto (85%+) + HP bom (60%+)
- `SpecialTank`: SDEF alto (85%+) + HP bom (60%+)
- `StallOrSupport`: Ataque baixo (40%-), defesa alta (60%+)
- `BulkyOffense`: Ataque, defesa e HP balanceados (60%+)
- `MixedAttacker`: Caso padrão (balanceado)

---

### 3. **rewardsCalculator.js** - Recompensas (XP e Gold)

#### **XP Base:**
```javascript
XP = 1.55 × (Power ^ 1.7)
```
Curva exponencial: quanto maior o power, mais XP cresce

#### **Gold Base:**
```javascript
Gold = [tabela fixa por power] × 0.55
```
Tabela: `[5, 10, 50, 150, 550, 800, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000]`

#### **Multiplicador de Loot Balance:**
```javascript
Multiplicador = 1 + (loot_level × 0.0375)
```
- Loot1 = 1.0375x
- Loot2 = 1.0750x
- Loot3 = 1.1125x
- Loot4 = 1.1500x

---

### 4. **attributes_formulas.json** - Configuração de Atributos e Progressão

Arquivo de configuração em **`public/data/attributes_formulas.json`** que define valores base, limites e fórmulas de progressão por nível.

#### **Estrutura do arquivo:**

```json
{
  "max": {
    "armorPen": "60",
    "magicPen": "60"
  },
  "base": {
    "hp": "30",
    "atk": "11",
    "satk": "11",
    "armor": "2",
    "magicResist": "2",
    "armorPen": "0",
    "magicPen": "0"
  },
  "speed": {
    "slow": "134",
    "noBoot": "177",
    "boot1": "220",
    "boot2": "263",
    "boh": "306",
    "veryFast": "410",
    "none": "0"
  },
  "formulas": {
    "DefaultLevel": "(power * 15) + (power * power * 0.5)",
    "HpPerLevel": "hp * 7.3",
    "MaxATKPerLevel": "atk * 0.54",
    "MaxSATKPerLevel": "satk * 0.54",
    "PhysicalPenPerLevel": "0.15",
    "MagicPenPerLevel": "0.15",
    "ArmorPerLevel": "def * 0.09",
    "MagicResistPerLevel": "sdef * 0.09"
  }
}
```

#### **Seções:**

**1. `max`** - Valores máximos permitidos
- `armorPen`: Penetração física máxima (60)
- `magicPen`: Penetração mágica máxima (60)

**2. `base`** - Valores base iniciais dos atributos
- `hp`: HP base (30)
- `atk`: Ataque físico base (11)
- `satk`: Ataque mágico base (11)
- `armor`: Armadura base (2)
- `magicResist`: Resistência mágica base (2)
- `armorPen`: Penetração física base (0)
- `magicPen`: Penetração mágica base (0)

**3. `speed`** - Classificações de velocidade
- `slow`: Muito lento (134)
- `noBoot`: Sem botas (177)
- `boot1`: Com botas nível 1 (220)
- `boot2`: Com botas nível 2 (263)
- `boh`: Boots of Haste (306)
- `veryFast`: Muito rápido (410)
- `none`: Sem velocidade (0)

**4. `formulas`** - Fórmulas de progressão por nível

**Nível Padrão:**
```javascript
DefaultLevel = (power * 15) + (power² * 0.5)
```
Exemplo: Power 10 → Nível = (10×15) + (100×0.5) = 200

**HP por Nível:**
```javascript
HP_Final = hp * 7.3 * level
```
Exemplo: HP base 10, nível 100 → HP = 10 × 7.3 × 100 = 7,300

**Ataque Físico por Nível:**
```javascript
ATK_Max = atk * 0.54 * level
```

**Ataque Mágico por Nível:**
```javascript
SATK_Max = satk * 0.54 * level
```

**Penetração Física por Nível:**
```javascript
PhysicalPen = 0.15 * level
```
Limitado ao máximo de 60

**Penetração Mágica por Nível:**
```javascript
MagicPen = 0.15 * level
```
Limitado ao máximo de 60

**Armadura por Nível:**
```javascript
Armor = def * 0.09 * level
```

**Resistência Mágica por Nível:**
```javascript
MagicResist = sdef * 0.09 * level
```

#### **Como editar as fórmulas:**

As fórmulas são strings JavaScript que podem usar:
- Variáveis: `hp`, `atk`, `satk`, `def`, `sdef`, `power`, `level`
- Operadores: `+`, `-`, `*`, `/`, `^` (potência)
- Parênteses para ordem de operação

**Exemplo de modificação:**
```json
"DefaultLevel": "(power * 20) + (power * power * 0.8)"
```
Isso tornaria os monstros chegarem a níveis mais altos.

---

## 🐛 Problemas Comuns

### Erro ao carregar monsters
- Verifique se o `monstersPath` no settings.json está correto
- Confirme que a pasta contém arquivos XML de monstros

### Spawn count não aparece
- Verifique se o `worldPath` está configurado
- Confirme que existe o arquivo `world-spawn.xml` dentro da pasta

### Não encontra items
- O arquivo `items.xml` deve existir no path configurado em `settings.js` (`itemsPath`)
- Items de loot de monstros precisam ter `category="monsterLoot"`

**Desenvolvido com React 19 + Vite + Metronic UI**
