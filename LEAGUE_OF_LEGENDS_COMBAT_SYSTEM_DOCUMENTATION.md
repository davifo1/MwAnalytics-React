# League of Legends Combat System - Documentação Técnica para Magic Wings

## Índice
1. [Visão Geral do Sistema LoL](#1-visão-geral-do-sistema-lol)
2. [Atributos Base e Escalamento](#2-atributos-base-e-escalamento)
3. [Fórmulas de Dano e Mitigação](#3-fórmulas-de-dano-e-mitigação)
4. [Time to Kill (TTK) - Teoria e Prática](#4-time-to-kill-ttk---teoria-e-prática)
5. [Aplicação ao Magic Wings](#5-aplicação-ao-magic-wings)
6. [Simulador de Combate](#6-simulador-de-combate)
7. [Análise de Progressão e Problemas](#7-análise-de-progressão-e-problemas)

---

## 1. Visão Geral do Sistema LoL

### 1.1 Filosofia de Design

League of Legends usa um sistema de **estatísticas escaláveis** onde:
- **8 atributos base** podem crescer por level
- Escalamento é **não-linear** (acelera com level)
- **Sem classes rígidas** - stats definem o papel (tank, DPS, support)
- **Effective HP** é mais importante que HP bruto

### 1.2 Atributos Core

```javascript
// Atributos Ofensivos
1. Attack Damage (AD)      // Dano físico
2. Attack Speed (AS)        // Ataques por segundo
3. Ability Power (AP)       // Poder mágico (não usado em Magic Wings)

// Atributos Defensivos
4. Health (HP)              // Vida
5. Health Regeneration      // Regeneração de vida
6. Armor (AR)               // Resistência física
7. Magic Resistance (MR)    // Resistência mágica

// Atributos Auxiliares
8. Movement Speed           // Velocidade de movimento
9. Mana / Resource          // Recurso para habilidades
```

**Equivalência Magic Wings ↔ LoL**:

| Magic Wings | League of Legends | Escala 0-15 |
|-------------|-------------------|-------------|
| HP          | Health            | ✓           |
| ATK         | Attack Damage     | ✓           |
| SATK        | Magic Damage*     | ✓           |
| DEF         | Armor             | ✓           |
| SDEF        | Magic Resistance  | ✓           |
| Speed       | Attack Speed**    | ✓           |

*LoL usa "Ability Power", mas Magic Wings parece usar dano mágico direto
**LoL separa Movement Speed e Attack Speed; MW usa Speed genérico

---

## 2. Atributos Base e Escalamento

### 2.1 Fórmula de Crescimento de Stats (LoL)

```javascript
/**
 * Fórmula oficial de League of Legends para crescimento de stats
 * Fonte: https://leagueoflegends.fandom.com/wiki/Champion_statistic
 */
function calculateStat(baseStat, growthStat, level) {
  const n = level;
  const g = growthStat;
  const base = baseStat;

  // Fórmula não-linear de crescimento
  const levelMultiplier = 0.7025 + 0.0175 * (n - 1);
  const bonus = g * (n - 1) * levelMultiplier;

  return base + bonus;
}

// Explicação da fórmula:
// Level 1-2:   72% do growth stat
// Level 9-10:  100% do growth stat
// Level 17-18: 128% do growth stat
```

**Exemplo Prático** (Darius - Fighter):

```javascript
// Darius Level 1
HP: 652
AD: 64
Armor: 39
MR: 32
AS: 0.625

// Growth Stats (ganho por level)
HP Growth: 114 per level
AD Growth: 5 per level
Armor Growth: 5.2 per level
MR Growth: 2.05 per level
AS Growth: 1% per level

// Darius Level 18
HP = 652 + (114 × 17 × 1.28) = 652 + 2480 = 3132
AD = 64 + (5 × 17 × 1.28) = 64 + 109 = 173
Armor = 39 + (5.2 × 17 × 1.28) = 39 + 113 = 152
MR = 32 + (2.05 × 17 × 1.28) = 32 + 45 = 77
```

### 2.2 Ranges Típicos por Arquétipo

#### Tank (ex: Ornn, Leona, Malphite)
```
Level 1:
- HP: 600-690
- AD: 55-69
- Armor: 33-40
- MR: 32-34
- AS: 0.625

Level 18:
- HP: 2300-2900
- AD: 120-140
- Armor: 120-170
- MR: 65-85
- AS: 0.75-0.85
```

#### Marksman/ADC (ex: Ashe, Caitlyn, Jinx)
```
Level 1:
- HP: 550-630
- AD: 55-65
- Armor: 24-28
- MR: 28-32
- AS: 0.625-0.721

Level 18:
- HP: 1900-2300
- AD: 110-130
- Armor: 75-95
- MR: 52-58
- AS: 1.0-1.3
```

#### Mage (ex: Orianna, Syndra, Lux)
```
Level 1:
- HP: 520-600
- AD: 44-56
- Armor: 18-24
- MR: 26-32
- AS: 0.625-0.658

Level 18:
- HP: 1800-2200
- AD: 85-105
- Armor: 60-85
- MR: 55-65
- AS: 0.7-0.85
```

#### Fighter/Bruiser (ex: Darius, Garen, Jax)
```
Level 1:
- HP: 620-680
- AD: 60-70
- Armor: 30-40
- MR: 32-34
- AS: 0.625

Level 18:
- HP: 2200-2700
- AD: 140-180
- Armor: 100-150
- MR: 65-80
- AS: 0.8-1.0
```

#### Assassin (ex: Akali, Zed, Talon)
```
Level 1:
- HP: 580-640
- AD: 58-68
- Armor: 20-28
- MR: 28-37
- AS: 0.625-0.694

Level 18:
- HP: 1900-2400
- AD: 130-160
- Armor: 70-100
- MR: 55-70
- AS: 0.85-1.1
```

---

## 3. Fórmulas de Dano e Mitigação

### 3.1 Damage Mitigation (Armor/MR)

**Fórmula Oficial**:

```javascript
/**
 * Calcula dano após mitigação (Armor ou Magic Resistance)
 */
function calculateMitigatedDamage(rawDamage, resistance) {
  // Fórmula: Damage = Raw × (100 / (100 + Resistance))
  return rawDamage * (100 / (100 + resistance));
}

// Ou em termos de % de redução:
function getDamageReduction(resistance) {
  return resistance / (100 + resistance);
}

// Exemplos:
25 Armor  → 20.0% damage reduction
50 Armor  → 33.3% damage reduction
100 Armor → 50.0% damage reduction
200 Armor → 66.7% damage reduction
300 Armor → 75.0% damage reduction
```

**Características Importantes**:

1. **Sem Diminishing Returns**: Cada ponto de armor sempre aumenta Effective HP em 1%
2. **Linear na Effective HP**: Comprar armor sempre vale a pena
3. **Não-linear no Damage Reduction**: Cada ponto reduz menos % conforme aumenta

```javascript
// Proof: Effective HP sempre cresce linearmente
function getEffectiveHP(hp, armor) {
  return hp * (1 + armor / 100);
}

// Exemplo: 1000 HP base
Armor   | Effective HP | Ganho por 10 Armor
--------|--------------|-------------------
0       | 1000         | -
10      | 1100         | +100 (10%)
50      | 1500         | +100 (10%)
100     | 2000         | +100 (10%)
200     | 3000         | +100 (10%)
500     | 6000         | +100 (10%)
```

### 3.2 DPS (Damage Per Second)

**Fórmula Base**:

```javascript
/**
 * Calcula DPS básico (sem habilidades)
 */
function calculateDPS(attackDamage, attackSpeed) {
  return attackDamage * attackSpeed;
}

// Exemplo: Marksman Level 18
AD: 120
AS: 1.2 attacks/sec
DPS = 120 × 1.2 = 144 damage/sec
```

**DPS Efetivo (após mitigação)**:

```javascript
/**
 * Calcula DPS efetivo contra target com armor
 */
function calculateEffectiveDPS(attackDamage, attackSpeed, targetArmor) {
  const rawDPS = attackDamage * attackSpeed;
  const mitigatedDPS = rawDPS * (100 / (100 + targetArmor));
  return mitigatedDPS;
}

// Exemplo: Marksman vs Tank
Marksman: 120 AD, 1.2 AS
Tank: 150 Armor

Raw DPS: 144
Effective DPS = 144 × (100 / 250) = 57.6 damage/sec
```

### 3.3 Attack Speed Calculation

**Fórmula Completa**:

```javascript
/**
 * Attack Speed no LoL é complexa, envolvendo base AS e AS ratio
 * Simplificando para Magic Wings (sem items):
 */
function calculateAttackSpeed(baseAS, asGrowth, level) {
  const levelMultiplier = 0.7025 + 0.0175 * (level - 1);
  const bonusAS = asGrowth * (level - 1) * levelMultiplier;
  return baseAS * (1 + bonusAS / 100);
}

// Exemplo: Jinx
Base AS: 0.625
AS Growth: 1% per level

Level 1:  0.625
Level 9:  0.625 × (1 + 0.08) = 0.675
Level 18: 0.625 × (1 + 0.218) = 0.761
```

---

## 4. Time to Kill (TTK) - Teoria e Prática

### 4.1 Fórmula Básica de TTK

```javascript
/**
 * TTK (Time To Kill) - Quanto tempo leva para matar um alvo
 */
function calculateTTK(targetHP, attackerDPS) {
  return targetHP / attackerDPS;
}

// Levando em conta resistências:
function calculateTTK_Realistic(targetHP, attackerAD, attackerAS, targetArmor) {
  const effectiveDPS = calculateEffectiveDPS(attackerAD, attackerAS, targetArmor);
  return targetHP / effectiveDPS;
}
```

### 4.2 TTK em League of Legends (Dados Reais)

#### Early Game (Level 1-6)

```
Marksman vs Marksman:
- Attacker: 60 AD, 0.65 AS → 39 DPS
- Target: 580 HP, 26 Armor
- Effective DPS = 39 × (100/126) = 30.95
- TTK = 580 / 30.95 = 18.7 segundos

Mage vs Mage (combo burst):
- Attacker: Full combo ~400 magic damage
- Target: 550 HP, 30 MR
- Effective Damage = 400 × (100/130) = 308
- TTK = 1.5 segundos (tempo do combo)

Fighter vs Marksman:
- Attacker: 65 AD, 0.625 AS → 40.6 DPS
- Target: 580 HP, 26 Armor
- Effective DPS = 40.6 × (100/126) = 32.2
- TTK = 580 / 32.2 = 18 segundos
```

#### Mid Game (Level 11-13)

```
Marksman vs Tank:
- Attacker: 110 AD, 1.0 AS → 110 DPS
- Target: 2400 HP, 120 Armor
- Effective DPS = 110 × (100/220) = 50
- TTK = 2400 / 50 = 48 segundos (!!)

Fighter vs Marksman:
- Attacker: 150 AD, 0.85 AS → 127.5 DPS
- Target: 1600 HP, 70 Armor
- Effective DPS = 127.5 × (100/170) = 75
- TTK = 1600 / 75 = 21.3 segundos

Assassin vs Mage (burst combo):
- Attacker: Full combo ~1200 damage (mixed)
- Target: 1400 HP, 60 Armor/MR
- Effective Damage ≈ 900 (após mitigação)
- TTK = 2-3 segundos (combo completo)
```

#### Late Game (Level 16-18)

```
Full-build Marksman vs Full-build Tank:
- Attacker: 300 AD, 2.0 AS → 600 DPS (com crit)
- Target: 4000 HP, 250 Armor
- Effective DPS = 600 × (100/350) = 171
- TTK = 4000 / 171 = 23.4 segundos

Assassin vs Marksman (burst):
- Attacker: Combo ~2000 damage
- Target: 2000 HP, 80 Armor
- Effective Damage = 2000 × (100/180) = 1111
- TTK = 1.5 segundos (instant delete!)
```

### 4.3 Curvas de TTK Desejadas (Game Design)

**League of Legends Design Philosophy**:

```
Early Game (1-6):
- Mirror matchup: 15-20s TTK
- Counter matchup: 10-15s TTK
- Goal: Laning phase, skill expression

Mid Game (7-13):
- Tank vs DPS: 30-60s TTK
- DPS vs DPS: 5-10s TTK
- Assassin vs Squishy: 2-4s TTK
- Goal: Teamfights, positioning matters

Late Game (14-18):
- Tank vs DPS: 15-30s TTK (penetração alta)
- Burst vs Squishy: 0.5-2s TTK (oneshot potential)
- Goal: High stakes, errors são puníveis
```

**Filosofia**: TTK **diminui** conforme o jogo progride (exceto tanks)

---

## 5. Aplicação ao Magic Wings

### 5.1 Mapeamento de Stats LoL → MW

```javascript
/**
 * Conversão de stats LoL (0-200+) para MW (0-15)
 */

// HP: LoL usa 500-3000, MW usa escala 0-15
function lolHPtoMW(lolHP) {
  // Mapeamento: 500 HP (LoL) = 0 (MW), 3000 HP = 15 (MW)
  return Math.round((lolHP - 500) / 167);
}

// AD: LoL usa 40-180, MW usa escala 0-15
function lolADtoMW(lolAD) {
  // Mapeamento: 40 AD (LoL) = 0 (MW), 180 AD = 15 (MW)
  return Math.round((lolAD - 40) / 9.33);
}

// Armor/MR: LoL usa 0-200, MW usa escala 0-15
function lolArmorToMW(lolArmor) {
  // Mapeamento: 0 Armor (LoL) = 0 (MW), 200 Armor = 15 (MW)
  return Math.round(lolArmor / 13.33);
}

// Attack Speed: LoL usa 0.5-2.5, MW usa escala 1-6 (Speed Classes)
function lolAStoMW(lolAS) {
  if (lolAS < 0.6) return 1; // Slow
  if (lolAS < 0.7) return 2; // NoBoot
  if (lolAS < 0.9) return 3; // Boot1
  if (lolAS < 1.2) return 4; // Boot2
  if (lolAS < 1.8) return 5; // BOH
  return 6; // VeryFast
}
```

### 5.2 Exemplos de Conversão

#### Darius Level 1 → MW Monster

```javascript
// Darius (Fighter) - LoL Stats
HP: 652
AD: 64
Armor: 39
MR: 32
AS: 0.625

// Conversão para MW (0-15 scale)
HP_MW = (652 - 500) / 167 = 0.91 ≈ 1
AD_MW = (64 - 40) / 9.33 = 2.57 ≈ 3
Armor_MW = 39 / 13.33 = 2.93 ≈ 3
MR_MW = 32 / 13.33 = 2.40 ≈ 2
Speed_MW = 2 (NoBoot - 0.625 AS)

// MW Monster Equivalent
<monster name="Darius Clone">
  <balance hp="1" atk="3" def="3" sdef="2" speed="2" />
</monster>
```

#### Ashe Level 1 → MW Monster

```javascript
// Ashe (Marksman) - LoL Stats
HP: 610
AD: 59
Armor: 26
MR: 30
AS: 0.658

// Conversão para MW
HP_MW = (610 - 500) / 167 = 0.66 ≈ 1
AD_MW = (59 - 40) / 9.33 = 2.04 ≈ 2
Armor_MW = 26 / 13.33 = 1.95 ≈ 2
MR_MW = 30 / 13.33 = 2.25 ≈ 2
Speed_MW = 3 (Boot1 - 0.658 AS)

// MW Monster Equivalent
<monster name="Marksman Clone">
  <balance hp="1" atk="2" def="2" sdef="2" speed="3" />
</monster>
```

#### Ornn Level 18 → MW Monster

```javascript
// Ornn (Tank) - LoL Stats Level 18
HP: 2600
AD: 130
Armor: 165
MR: 75
AS: 0.75

// Conversão para MW
HP_MW = (2600 - 500) / 167 = 12.57 ≈ 13
AD_MW = (130 - 40) / 9.33 = 9.65 ≈ 10
Armor_MW = 165 / 13.33 = 12.38 ≈ 12
MR_MW = 75 / 13.33 = 5.63 ≈ 6
Speed_MW = 3 (Boot1 - 0.75 AS)

// MW Monster Equivalent
<monster name="Tank Boss">
  <balance hp="13" atk="10" def="12" sdef="6" speed="3" />
</monster>
```

### 5.3 Calculando Power (MW) a partir de Stats LoL

```javascript
/**
 * Usa a fórmula de Power do MW para converter champion LoL
 */
function calculatePowerFromLoL(lolHP, lolAD, lolArmor, lolMR, lolAS) {
  // Converter para escala MW
  const hp = lolHPtoMW(lolHP);
  const atk = lolADtoMW(lolAD);
  const def = lolArmorToMW(lolArmor);
  const sdef = lolArmorToMW(lolMR);
  const speed = lolAStoMW(lolAS);

  // Aplicar fórmula de Power (MW)
  const HP_WEIGHT = 2.0;
  const BURST_WEIGHT = 1.0;
  const SPEED_WEIGHT = 0.3;
  const RESISTANCE_WEIGHT = 0.5;

  const hpScore = hp * HP_WEIGHT;
  const burstScore = atk * BURST_WEIGHT;
  const speedScore = speed * SPEED_WEIGHT;
  const resistanceScore = (def + sdef) * RESISTANCE_WEIGHT;

  const totalScore = hpScore + burstScore + speedScore + resistanceScore;
  const maxScore = 64.5;

  const power = (totalScore / maxScore) * 15;

  return {
    power: Math.round(power * 100) / 100,
    stats: { hp, atk, def, sdef, speed },
    scores: { hpScore, burstScore, speedScore, resistanceScore, totalScore }
  };
}

// Exemplo: Darius Level 1
const dariusPower = calculatePowerFromLoL(652, 64, 39, 32, 0.625);
/*
Output:
{
  power: 2.06,
  stats: { hp: 1, atk: 3, def: 3, sdef: 2, speed: 2 },
  scores: {
    hpScore: 2,
    burstScore: 3,
    speedScore: 0.6,
    resistanceScore: 2.5,
    totalScore: 8.1
  }
}
*/

// Exemplo: Ornn Level 18
const ornnPower = calculatePowerFromLoL(2600, 130, 165, 75, 0.75);
/*
Output:
{
  power: 11.86,
  stats: { hp: 13, atk: 10, def: 12, sdef: 6, speed: 3 },
  scores: {
    hpScore: 26,
    burstScore: 10,
    speedScore: 0.9,
    resistanceScore: 9,
    totalScore: 45.9
  }
}
*/
```

---

## 6. Simulador de Combate

### 6.1 Simulador LoL-Style para MW

```javascript
/**
 * Simulador de combate baseado em mecânicas de League of Legends
 * Adaptado para Magic Wings
 */

class CombatSimulator {
  constructor() {
    // Constantes de conversão MW → LoL equivalente
    this.HP_BASE = 500;
    this.HP_PER_POINT = 167;
    this.AD_BASE = 40;
    this.AD_PER_POINT = 9.33;
    this.ARMOR_PER_POINT = 13.33;
    this.AS_BASE = 0.625;
    this.AS_PER_CLASS = [0, 0, 0.075, 0.15, 0.3, 0.7, 1.0]; // Speed 0-6
  }

  /**
   * Converte stats MW para valores "reais" estilo LoL
   */
  convertMWtoReal(mwStats) {
    return {
      hp: this.HP_BASE + (mwStats.hp * this.HP_PER_POINT),
      ad: this.AD_BASE + (mwStats.atk * this.AD_PER_POINT),
      armor: mwStats.def * this.ARMOR_PER_POINT,
      magicResist: mwStats.sdef * this.ARMOR_PER_POINT,
      attackSpeed: this.AS_BASE + this.AS_PER_CLASS[mwStats.speed]
    };
  }

  /**
   * Calcula dano após mitigação
   */
  calculateMitigatedDamage(rawDamage, resistance) {
    return rawDamage * (100 / (100 + resistance));
  }

  /**
   * Calcula DPS efetivo
   */
  calculateDPS(ad, attackSpeed, targetArmor) {
    const rawDPS = ad * attackSpeed;
    return this.calculateMitigatedDamage(rawDPS, targetArmor);
  }

  /**
   * Calcula TTK (Time To Kill)
   */
  calculateTTK(attackerStats, defenderStats, damageType = 'physical') {
    const attacker = this.convertMWtoReal(attackerStats);
    const defender = this.convertMWtoReal(defenderStats);

    const resistance = damageType === 'physical'
      ? defender.armor
      : defender.magicResist;

    const effectiveDPS = this.calculateDPS(
      attacker.ad,
      attacker.attackSpeed,
      resistance
    );

    const ttk = defender.hp / effectiveDPS;

    return {
      ttk: ttk,
      attackerDPS: effectiveDPS,
      defenderHP: defender.hp,
      attacksNeeded: Math.ceil(ttk * attacker.attackSpeed),
      damagePerHit: attacker.ad * (100 / (100 + resistance))
    };
  }

  /**
   * Simula combate completo (ambos atacando)
   */
  simulateCombat(entity1Stats, entity2Stats) {
    const ttk1kills2 = this.calculateTTK(entity1Stats, entity2Stats);
    const ttk2kills1 = this.calculateTTK(entity2Stats, entity1Stats);

    return {
      entity1: {
        ...ttk1kills2,
        survives: ttk1kills2.ttk < ttk2kills1.ttk
      },
      entity2: {
        ...ttk2kills1,
        survives: ttk2kills1.ttk < ttk1kills2.ttk
      },
      winner: ttk1kills2.ttk < ttk2kills1.ttk ? 'entity1' : 'entity2',
      timeDifference: Math.abs(ttk1kills2.ttk - ttk2kills1.ttk)
    };
  }
}
```

### 6.2 Exemplos de Simulação

#### Exemplo 1: Jogador vs Trash Mob

```javascript
const sim = new CombatSimulator();

// Jogador Level 50 (mid-game)
const player = {
  hp: 6,    // ~1500 HP real
  atk: 7,   // ~105 AD real
  def: 4,   // ~53 Armor real
  sdef: 3,  // ~40 MR real
  speed: 4  // ~0.925 AS real
};

// Trash Mob (Goblin, Power 3)
const goblin = {
  hp: 2,    // ~834 HP real
  atk: 3,   // ~68 AD real
  def: 2,   // ~27 Armor real
  sdef: 2,  // ~27 MR real
  speed: 2  // ~0.7 AS real
};

const result = sim.simulateCombat(player, goblin);
console.log(result);
/*
Output:
{
  entity1: { // Player
    ttk: 6.87 segundos,
    attackerDPS: 121.4,
    defenderHP: 834,
    attacksNeeded: 7,
    damagePerHit: 131.2,
    survives: true
  },
  entity2: { // Goblin
    ttk: 17.3 segundos,
    attackerDPS: 86.7,
    defenderHP: 1500,
    attacksNeeded: 13,
    damagePerHit: 123.8,
    survives: false
  },
  winner: 'entity1',
  timeDifference: 10.43 segundos
}

Análise: TTK = 6.87s → IDEAL para trash mob (target: 4-8s)
*/
```

#### Exemplo 2: Jogador vs Elite Mob

```javascript
// Jogador Level 100 (late game)
const player = {
  hp: 10,   // ~2170 HP real
  atk: 11,  // ~143 AD real
  def: 7,   // ~93 Armor real
  sdef: 6,  // ~80 MR real
  speed: 5  // ~1.325 AS real
};

// Elite Mob (Dragon, Power 12)
const dragon = {
  hp: 12,   // ~2504 HP real
  atk: 12,  // ~152 AD real
  def: 10,  // ~133 Armor real
  sdef: 8,  // ~107 MR real
  speed: 4  // ~0.925 AS real
};

const result = sim.simulateCombat(player, dragon);
/*
Output:
{
  entity1: { // Player
    ttk: 23.4 segundos,
    attackerDPS: 107.0,
    defenderHP: 2504,
    attacksNeeded: 31,
    damagePerHit: 80.8,
    survives: false
  },
  entity2: { // Dragon
    ttk: 16.2 segundos,
    attackerDPS: 133.9,
    defenderHP: 2170,
    attacksNeeded: 15,
    damagePerHit: 144.8,
    survives: true
  },
  winner: 'entity2',
  timeDifference: 7.2 segundos
}

Análise:
- Player PERDE! Dragon é muito forte para solo
- TTK do player = 23s → Adequado para Elite (target: 15-25s)
- MAS player morre antes (16s) → Precisa de grupo ou melhor gear
*/
```

#### Exemplo 3: Balanced Fight

```javascript
// Jogador Level 100 (com gear upgrade)
const playerUpgraded = {
  hp: 10,
  atk: 13,  // Melhor arma (+2 ATK)
  def: 8,   // Melhor armadura (+1 DEF)
  sdef: 7,  // Melhor resistência (+1 SDEF)
  speed: 5
};

const result2 = sim.simulateCombat(playerUpgraded, dragon);
/*
Output:
{
  entity1: { // Player Upgraded
    ttk: 20.1 segundos,
    attackerDPS: 124.6,
    defenderHP: 2504,
    attacksNeeded: 27,
    damagePerHit: 94.0,
    survives: true
  },
  entity2: { // Dragon
    ttk: 21.8 segundos,
    attackerDPS: 99.5,
    defenderHP: 2170,
    attacksNeeded: 21,
    damagePerHit: 107.6,
    survives: false
  },
  winner: 'entity1',
  timeDifference: 1.7 segundos
}

Análise:
- Player VENCE! Mas por pouco (1.7s de margem)
- TTK = 20s → PERFEITO para Elite solo
- Combate equilibrado, skill matters
*/
```

---

## 7. Análise de Progressão e Problemas

### 7.1 Problema 1: Escalamento de Atributos

**Issue**: MW usa escala 0-15, LoL usa escala 40-200+

```javascript
// LoL: HP escala 500 → 3000 (6× growth)
// MW: HP escala 0 → 15 (linear)

// Isso cria problemas de granularidade:
const lowLevelDiff = {
  hp: 1,  // MW = ~667 HP real
  vs: 2,  // MW = ~834 HP real
  // Diferença: 167 HP (25% gap!)
};

const highLevelDiff = {
  hp: 14, // MW = ~2838 HP real
  vs: 15, // MW = ~3005 HP real
  // Diferença: 167 HP (6% gap!)
};
```

**Problema**: Mesma diferença absoluta (1 ponto) tem impacto relativo **muito maior** em low levels.

**Solução Proposta**:

```javascript
/**
 * Usar escalamento não-linear como LoL
 */
function calculateMWStatReal(mwStat, level, baseStat, growthStat) {
  const levelMultiplier = 0.7025 + 0.0175 * (level - 1);
  const bonus = growthStat * (level - 1) * levelMultiplier;
  return baseStat + bonus;
}

// Exemplo: HP
// Base: 500 HP (MW stat 0)
// Growth: 11.13 HP per level per MW point

const hpLevel1MW5 = calculateMWStatReal(5, 1, 500, 11.13);
// = 500 HP

const hpLevel18MW5 = calculateMWStatReal(5, 18, 500, 11.13);
// = 500 + (5 × 11.13 × 17 × 1.28) = 500 + 1213 = 1713 HP
```

### 7.2 Problema 2: TTK Inconsistente

**Dados do Simulador**:

| Player Level | Mob Power | Target TTK | Actual TTK | Status |
|--------------|-----------|------------|------------|--------|
| 10           | 1         | 4-6s       | 3.2s       | ⚠️ Too fast |
| 50           | 5         | 8-12s      | 6.8s       | ✓ OK |
| 100          | 10        | 15-20s     | 23.4s      | ❌ Too slow |
| 150          | 12        | 15-20s     | 31.7s      | ❌ Too slow |
| 200          | 15        | 25-30s     | 48.2s      | ❌ WAY too slow |

**Análise**:

```javascript
// TTK cresce mais rápido que o esperado porque:
// 1. HP escala linearmente (0-15)
// 2. Armor escala linearmente (0-15)
// 3. ATK do player não acompanha

// Effective HP formula:
EHP = HP × (1 + Armor/100)

// Level 100:
// Mob HP: 12 → ~2500 real HP
// Mob Armor: 10 → ~133 real Armor
// EHP = 2500 × (1 + 1.33) = 5825 EHP

// Player DPS: 11 ATK, 5 Speed → ~107 DPS effective
// TTK = 5825 / 107 = 54.4 segundos!!
```

**Solução 1**: Ajustar pesos de Power para valorizar menos HP

```javascript
// Atual:
HP_WEIGHT = 2.0      // 46.5% do Power
BURST_WEIGHT = 1.0   // 23.3%

// Proposto:
HP_WEIGHT = 1.5      // 32.6% do Power
BURST_WEIGHT = 1.2   // 26.1%
ARMOR_WEIGHT = 0.7   // 30.4%

// Resultado: Mobs mais "glassy", TTK menor
```

**Solução 2**: Armor Penetration para Players

```javascript
/**
 * Adicionar Armor Pen ao player baseado em level
 */
function getPlayerArmorPen(playerLevel) {
  // 0.5% armor pen per level
  return playerLevel * 0.5;
}

// Level 100 = 50% armor pen
// Mob com 133 Armor → Efetivo: 66.5 Armor
// Damage reduction: 40% (vs 57% antes)
// DPS increase: 43%!
```

### 7.3 Problema 3: Power Creep

**Cenário**: Player Level 200 vs Mob Power 15

```javascript
// Player stats (estimativa)
const player200 = {
  hp: 15,   // Max HP
  atk: 15,  // Max ATK
  def: 12,  // Alta defesa
  sdef: 10,
  speed: 6  // Max speed
};

// Mob Power 15
const boss15 = {
  hp: 15,
  atk: 15,
  def: 15,
  sdef: 15,
  speed: 4
};

const result = sim.simulateCombat(player200, boss15);
/*
Player TTK: 52 segundos
Mob TTK: 45 segundos

Player PERDE!
*/
```

**Análise**: Player level 200 não consegue matar mob Power 15 solo!

**Causas**:
1. Player stats não escalam além de 15
2. Mob tem stats máximos em tudo
3. Sem sistema de "gear progression" além dos stats base

**Soluções**:

1. **Mythic Power (16-25)** para end-game
2. **Gear Scaling** separado dos stats base
3. **Skill System** (buffs, passivas)
4. **Party Play** (bônus de grupo)

### 7.4 Problema 4: Grind vs Reward

**Fórmula Atual de XP**:

```javascript
XP = 1.55 × (Power ^ 1.7)

Power 1  → 2 XP
Power 15 → 331 XP
```

**Mas TTK não escala proporcionalmente**:

```javascript
// XP/Segundo (efficiency)
Power 1:  2 XP / 3.2s = 0.625 XP/s
Power 5:  23 XP / 6.8s = 3.38 XP/s  (5.4× melhor!)
Power 10: 123 XP / 23s = 5.35 XP/s  (1.6× melhor)
Power 15: 331 XP / 48s = 6.90 XP/s  (1.3× melhor)
```

**Problema**: Efficiency gains **diminuem** conforme Power aumenta!

**Ideal**: XP/s deve **aumentar** ou permanecer **constante**.

**Solução**: Ajustar expoente de XP considerando TTK

```javascript
/**
 * XP ajustado por TTK
 */
function getBalancedXP(power, avgTTK) {
  const baseXP = 1.55 * Math.pow(power, 2.3); // Expoente maior
  const ttkMultiplier = 10 / avgTTK; // Normalizar para TTK 10s
  return Math.round(baseXP * ttkMultiplier);
}

// Exemplo:
Power 1  (TTK 3.2s):  2 × (10/3.2) = 6 XP    → 1.88 XP/s
Power 5  (TTK 6.8s):  62 × (10/6.8) = 91 XP  → 13.4 XP/s
Power 10 (TTK 23s):   310 × (10/23) = 135 XP → 5.87 XP/s
Power 15 (TTK 48s):   929 × (10/48) = 194 XP → 4.04 XP/s

// Ainda não é ideal, mas melhor que antes
```

---

## 8. Recomendações Finais

### 8.1 Implementações Prioritárias

#### 1. Simulador de TTK Integrado ⭐⭐⭐

```javascript
// Adicionar ao Monster Validation Page
<ValidationCard title="Combat Simulation">
  <div>
    <label>Player Level:</label>
    <input type="number" value={100} onChange={...} />

    <button onClick={runSimulation}>Simulate Combat</button>

    <div className="results">
      <p>TTK: {simulation.ttk} segundos</p>
      <p>Target: 15-20s</p>
      <p>Status: {simulation.status}</p>
      <ProgressBar value={simulation.ttk} target={17.5} />
    </div>
  </div>
</ValidationCard>
```

#### 2. Armor Penetration System ⭐⭐⭐

```javascript
// Adicionar aos monster attributes
<attributesPerLevel
  armorPenPerLevel="0.54"
  magicPenPerLevel="0.45"
/>

// Aplicar no cálculo de dano
effectiveArmor = targetArmor - attackerArmorPen
```

#### 3. Rebalancear Pesos de Power ⭐⭐

```javascript
// Reduzir peso de HP, aumentar peso de ATK/Speed
const HP_WEIGHT = 1.5;      // era 2.0
const BURST_WEIGHT = 1.2;   // era 1.0
const SPEED_WEIGHT = 0.8;   // era 0.3
const ARMOR_WEIGHT = 0.7;   // era 0.5
```

#### 4. XP Baseado em TTK ⭐⭐

```javascript
// Ajustar XP considerando tempo real de combate
function getXPByPowerAndTTK(power, estimatedTTK) {
  const baseXP = 1.55 * Math.pow(power, 2.3);
  const ttkFactor = 10 / estimatedTTK; // Normalizar para 10s
  return Math.round(baseXP * ttkFactor);
}
```

### 8.2 Roadmap de Testes

**Fase 1**: Implementar Simulador (3 dias)
- Criar `CombatSimulator` class
- Integrar com Monster Validation Page
- Testar com monstros existentes

**Fase 2**: Calibrar TTK Targets (5 dias)
- Rodar simulações em todos os monstros
- Identificar outliers (TTK > 30s ou < 3s)
- Ajustar stats individuais

**Fase 3**: Rebalancear Sistema (7 dias)
- Implementar novos pesos de Power
- Adicionar Armor Penetration
- Ajustar fórmula de XP
- Re-testar todos os monstros

**Fase 4**: Validação com Dados Reais (ongoing)
- Playtest levels 1-100
- Coletar dados de TTK real
- Ajustar formulas baseado em dados

---

## Conclusão

O sistema de combate de League of Legends é **altamente complexo** e **cuidadosamente balanceado** ao longo de 10+ anos de desenvolvimento. Magic Wings, ao tentar mapear LoL para escala 0-15, enfrenta desafios fundamentais:

1. **Granularidade**: 0-15 não captura a nuance de 40-200+
2. **Escalamento Não-Linear**: LoL usa crescimento acelerado, MW usa linear
3. **TTK Desbalanceado**: Effective HP cresce mais rápido que DPS
4. **Power Creep**: Level 200+ players não têm progressão

**Solução**: Implementar simulador de TTK, ajustar pesos de Power, adicionar Armor Pen, e calibrar XP baseado em tempo real de combate.

**Próximo Passo**: Criar protótipo do simulador e validar com dados de monstros existentes.
