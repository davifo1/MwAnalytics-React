# Importante: Isolamento de Sistemas

**CRÍTICO**: Economia, Progressão e Desafio devem ser ajustáveis independentemente!

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│    ECONOMIA     │      │   PROGRESSÃO    │      │     DESAFIO     │
│     (Gold)      │◄────►│      (XP)       │◄────►│    (HP/DPS)     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        ↓                        ↓                         ↓
    Inflação                Grind Time                Dificuldade
    Deflação                Retention                 Frustração
```

**Por quê isso importa:**
- Os MMOs de sucesso isolam **economia** (recompensas) de **progressão** de personagem (XP) e de **desafio** (stats dos mobs)
- Isso permite ajustar cada eixo **independentemente** sem colapsar os outros sistemas
- Exemplo: Você pode aumentar XP sem quebrar a economia, ou reduzir dificuldade sem afetar retenção

# Curva de gold/valor do loot

```js
/**
 * Calcula o valor de cada Gold Coin recebido por Kill.
 *
 * @param {number} power - Potência do jogador.
 * @return {number} Valor aproximado do Gold Coin por Kill.
 */
export function getGoldCoinPerKillByPower(power) {
    const L0 = 3;        // valor base no early (ajuste ao seu "P0")
    const r  = 1.40;     // crescimento geométrico principal (1.38–1.50)
    const λ  = 0.015;    // booster linear suave para “encher” o midgame (0–0.02)

    // soft-cap logístico para frear o fim sem matar o “uau”
    const pS = 10;       // onde começa a suavizar (P12 é bom)
    const w  = 2.4;      // largura da transição (2–3 = suave)
    const d  = 0.2;     // força do freio no late (0.2–0.4)

    const soft = 1 / (1 + Math.exp((power - pS) / w)); // ~1 no early, ~0 no late
    const damp = 1 - d * (1 - soft);                   // 1→(1-d) depois do pS
    const multiplier = 14;

    return Math.round((L0 * Math.pow(r, power) * (1 + λ * power) * damp) * multiplier) - 39;
}
```
*Observação importante:
O grind (prática de repetir uma ação) de um level 200 em comparacão ao level 100 tem que ser ligeiramente maior.

# Curva XP
`Math.round(1.55 * Math.pow(power, 1.7))`<br>
Para XP e dificuldade: use curvas de potência (1.3–1.7), calibradas por TTK (Time To Kill - Tempo para matar) e custos por minuto.


# TTK
TTK curto (3–5s) → sensação de poder, combate dinâmico.
(bom para mobs fracos ou grind rápido)
TTK médio (7–12s) → desafio equilibrado, tempo para usar habilidades e reagir.
TTK longo (15–30s) → combate tático ou boss fight.

*Aqui leva em consideração a defesa e HP dos Monstros.<br>
`monsterHP  = Math.round( H0 * power ** 1.5 );`

# Defina um alvo de TTK  - usar simulação inicialmente e ideal dados reais
TTK (Time To Kill) = tempo médio que o jogador leva para matar uma criatura (ou ser morto por ela).

`TTK = Vida do Inimigo / DPS Efetivo do Jogador`

Antes de ajustar valores, decida o tempo médio desejado por categoria de monstro.

| Tipo        | Exemplo           | TTK alvo |
|-------------|-------------------|----------|
| Trash mob   | Rotworm, Goblin   | 4–6s     |
| Mid mob     | Cyclops, Dragon Hatchling | 8–12s |
| Elite       | Dragon, Giant, Lich | 15–20s  |
| Boss        | Ashmunrah, Behemoth | 25–40s  |

*Levar em consideração o player evolui seus equipamentos e level.

# Custo por Minuto (CPM) - usar simulação inicialmente e ideal dados reais
O Custo por Minuto (CPM) mede quanto o jogador gasta para se manter vivo e eficiente por minuto de combate.

`CPM = (Custo total por sessão) / (Duração da sessão em minutos)`<br>
ele deve refletir todo o gasto necessário para se manter ativo e eficiente em combate, o que inclui mortes, imbuements, bless, repairs, etc.
Jogadores devem lucrar entre 40% e 70% do gasto dependendo da vocação e zona.
Isso mantém o ciclo de ouro saudável: o ouro entra via loot, mas sai via consumo.

`Ideal: CPM ≈ base * (power ^ 1.2)`

CPM (Custo por Minuto) deve seguir uma curva em “S” (sigmoidal ou logística), e não apenas uma potência (power^1.2), porque o custo não cresce linearmente no tempo do jogador real — ele acelera no midgame (fase de dominância) e depois estabiliza no endgame (fase de maestria).

| Fase                      | Power/Level       | Economia real      | Justificativa                                         |
| ------------------------- | ----------------- | ------------------ | ----------------------------------------------------- |
| 🟢 **Early (Power 1–4)**  | Jogador iniciante | CPM cresce devagar | Ele ainda morre pouco, usa menos consumíveis          |
| 🟠 **Mid (Power 5–10)**   | Jogador dominante | CPM cresce rápido  | Mais dano, hunts longas, gasta mais potions e repairs |
| 🔵 **Late (Power 11–15)** | Jogador veterano  | CPM estabiliza     | Build otimizada, usa buffs, menos desperdício         |


*Aqui leva em consideração a defesa e HP dos Monstros.<br>
`monsterDPS = Math.round( D0 * power ** 1.3 );`

## Qual é o “melhor botão” para calibrar CPM

| Opção                                           | Vantagens                                                             | Desvantagens                                               | Quando usar                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| 🧴 **Consumíveis (reagentes, poções, repairs)** | Ajuste **rápido e previsível** — muda custo sem afetar TTK            | Afeta todos igualmente (pode punir classes com custo alto) | Quando o **loop econômico** está desequilibrado mas o combate está bom |
| ⚔️ **Força dos monstros (HP/dano)**             | Ajuste **profundo** — muda consumo indiretamente (potions por minuto) | Rebalanceia todo o combate; pode quebrar XP/h e TTK        | Quando o combate está **muito fácil/difícil** em todas as classes      |
