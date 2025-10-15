/**
 * Calcula o valor base de Power baseado nos atributos do monstro
 *
 * @param {number} hp - Health Points do monstro
 * @param {number} atk - Attack do monstro
 * @param {number} satk - Special Attack do monstro
 * @param {number} def - Defense do monstro
 * @param {number} sdef - Special Defense do monstro
 * @param {boolean} hostile - Se o monstro é hostil
 * @param {boolean} hostileWhenAttacked - Se o monstro fica hostil quando atacado
 * @param {number} speedClassification - Classificação de velocidade (valor numérico)
 * @returns {number} Valor de Power calculado (0-15)
 */
export function getPowerBaseByAttrPoints(hp, atk, satk, def, sdef, hostile, hostileWhenAttacked, speedClassification) {
  // Se não é hostil, retorna 0
  if (!hostile && !hostileWhenAttacked) return 0;

  const maxPoints = 15;

  // Pesos
  const hpWeight = 2.0;
  const burstWeight = 1.0;
  const speedWeight = 0.3;
  const resistanceWeight = 0.5;

  // Componentes
  const hpScore = (hp || 0) * hpWeight;
  const burstScore = Math.max(atk || 0, satk || 0) * burstWeight;
  const speedScore = (speedClassification || 0) * speedWeight;
  const resistanceScore = ((def || 0) + (sdef || 0)) * resistanceWeight;

  const totalScore = hpScore + burstScore + speedScore + resistanceScore;

  // Pontuação máxima possível
  const maxScore =
    (maxPoints * hpWeight) +
    (maxPoints * burstWeight) +
    (maxPoints * speedWeight) +
    ((maxPoints + maxPoints) * resistanceWeight);

  // Normalização
  let normalizedDifficulty = maxScore > 0 ? (totalScore / maxScore) * maxPoints : 0;

  // Clamp entre 0 e 15, com 2 casas decimais
  const result = Math.min(Math.max(normalizedDifficulty, 0), maxPoints);
  return parseFloat(result.toFixed(2));
}

