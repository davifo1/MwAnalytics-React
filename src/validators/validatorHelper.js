/**
 * Calcula o desvio percentual entre valor atual e recomendado
 */
export const calculateDeviation = (currentValue, recommendedValue) => {
  if (!recommendedValue || recommendedValue === 0) {
    return { percent: 0, abs: 0, isGood: true };
  }

  const current = currentValue || 0;
  const deviation = ((current - recommendedValue) / recommendedValue) * 100;
  const absDeviation = Math.abs(deviation);

  return {
    percent: deviation,
    abs: absDeviation,
    isGood: absDeviation <= 10,
    isWarning: absDeviation > 10 && absDeviation <= 30,
    isCritical: absDeviation > 30
  };
};

/**
 * Cria um validador com API fluente para adicionar erros e warnings
 * Suporta auto-fix com withFix()
 */
export const createValidator = () => {
  const issues = {
    critical: [],
    warning: [],
    all: []
  };

  let lastIssue = null; // Referência ao último issue adicionado

  return {
    addError(field, label, data) {
      const issue = {
        severity: 'critical',
        field,
        label,
        ...data,
        fixFn: null // Função de fix (opcional)
      };
      issues.critical.push(issue);
      issues.all.push(issue);
      lastIssue = issue;
      return this; // Retorna this para permitir chaining
    },

    addWarning(field, label, data) {
      const issue = {
        severity: 'warning',
        field,
        label,
        ...data,
        fixFn: null // Função de fix (opcional)
      };
      issues.warning.push(issue);
      issues.all.push(issue);
      lastIssue = issue;
      return this; // Retorna this para permitir chaining
    },

    withFix(fixFn) {
      if (lastIssue) {
        lastIssue.fixFn = fixFn;
      }
      return this; // Retorna this para permitir chaining adicional
    },

    getResult() {
      const criticalCount = issues.critical.length;
      const warningCount = issues.warning.length;

      let status = 'good';
      if (criticalCount > 0) {
        status = 'critical';
      } else if (warningCount > 0) {
        status = 'warning';
      }

      return {
        status,
        issues,
        totalIssues: issues.all.length,
        criticalCount,
        warningCount
      };
    }
  };
};
