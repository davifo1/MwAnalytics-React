import { calculateRecommendedAttributes as calculateRecommendedAttributesFromCalculator } from '@/utils/attributesBaseCalculator';

// Validate that formula only contains safe operations
const validateFormula = (formula) => {
  // Allow only specific characters and functions
  const allowedPattern = /^[\d\s+\-*/().,a-z]+$/i;
  const allowedFunctions = ['min', 'max', 'Math.min', 'Math.max', 'Math.floor', 'Math.ceil', 'Math.round'];
  const allowedVariables = ['atk', 'satk', 'def', 'sdef', 'hp', 'speed', 'power'];

  if (!allowedPattern.test(formula)) {
    return false;
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /eval/i,
    /function/i,
    /require/i,
    /import/i,
    /export/i,
    /window/i,
    /document/i,
    /alert/i,
    /console/i,
    /fetch/i,
    /ajax/i,
    /\$/,
    /\[/,
    /\]/,
    /\{/,
    /\}/,
    /;/,
    /`/,
    /\\/
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(formula)) {
      return false;
    }
  }

  return true;
};

// Safely evaluate formula with given stats
const evaluateFormula = (formula, stats) => {
  if (!validateFormula(formula)) {
    throw new Error(`Fórmula inválida ou insegura: ${formula}`);
  }

  // Create safe evaluation context
  const { atk = 0, satk = 0, def = 0, sdef = 0, hp = 0, speed = 0, power = 1 } = stats;

  // Build safe evaluation string
  let safeFormula = formula;

  // Replace variables with their values
  safeFormula = safeFormula.replace(/\batk\b/g, atk);
  safeFormula = safeFormula.replace(/\bsatk\b/g, satk);
  safeFormula = safeFormula.replace(/\bdef\b/g, def);
  safeFormula = safeFormula.replace(/\bsdef\b/g, sdef);
  safeFormula = safeFormula.replace(/\bhp\b/g, hp);
  safeFormula = safeFormula.replace(/\bspeed\b/g, speed);
  safeFormula = safeFormula.replace(/\bpower\b/g, power);

  // Replace min/max with Math.min/Math.max
  safeFormula = safeFormula.replace(/\bmin\(/g, 'Math.min(');
  safeFormula = safeFormula.replace(/\bmax\(/g, 'Math.max(');

  try {
    // Use Function constructor for safer evaluation than eval
    const result = new Function('Math', `return ${safeFormula}`)(Math);

    if (typeof result !== 'number' || isNaN(result)) {
      throw new Error('Fórmula não retornou um número válido');
    }

    return parseFloat(result.toFixed(2));
  } catch (error) {
    throw new Error(`Erro ao avaliar fórmula "${formula}": ${error.message}`);
  }
};

/**
 * Hook for attribute formulas - now simplified to use attributesBaseCalculator
 * @deprecated Most functionality moved to attributesBaseCalculator.js
 */
export const useAttributeFormulas = () => {
  const calculateRecommendedAttributes = (stats) => {
    return calculateRecommendedAttributesFromCalculator(stats);
  };

  return {
    formulas: {}, // Empty for backwards compatibility
    calculateRecommendedAttributes,
    isLoading: false,
    error: null
  };
};