const fs = require('fs');
const path = require('path');

// Load settings to get the correct monsters path
const settingsPath = path.join(__dirname, 'public', 'data', 'settings.js');
const settings = require(settingsPath).default;
const monstersPath = settings.database.monstersPath;

console.log('Using monsters path from settings.js:', monstersPath);

const files = fs.readdirSync(monstersPath).filter(f => f.endsWith('.xml'));

const monsters = [];
files.forEach(file => {
  const content = fs.readFileSync(path.join(monstersPath, file), 'utf8');
  const nameMatch = content.match(/name="([^"]+)"/);
  const balanceMatch = content.match(/<balance[^>]*power="([^"]+)"[^>]*defaultLevel="([^"]+)"/);

  if (nameMatch && balanceMatch) {
    const power = parseFloat(balanceMatch[1]);
    const level = parseInt(balanceMatch[2]);

    monsters.push({
      name: nameMatch[1],
      power: power,
      level: level,
      ratio: level / power
    });
  }
});

// Ordenar por power
monsters.sort((a, b) => a.power - b.power);

console.log('=== ANÁLISE POWER x LEVEL ===');
console.log('Total de monstros:', monsters.length);

// Estatísticas gerais
const avgRatio = monsters.reduce((sum, m) => sum + m.ratio, 0) / monsters.length;
const minRatio = Math.min(...monsters.map(m => m.ratio));
const maxRatio = Math.max(...monsters.map(m => m.ratio));

console.log('\n=== ESTATÍSTICAS GERAIS ===');
console.log('Ratio médio (Level/Power):', avgRatio.toFixed(2));
console.log('Ratio mínimo:', minRatio.toFixed(2));
console.log('Ratio máximo:', maxRatio.toFixed(2));

// Análise por faixas
console.log('\n=== ANÁLISE POR FAIXAS DE POWER ===');
const ranges = [
  { min: 0, max: 2, monsters: [] },
  { min: 2, max: 4, monsters: [] },
  { min: 4, max: 6, monsters: [] },
  { min: 6, max: 8, monsters: [] },
  { min: 8, max: 10, monsters: [] },
  { min: 10, max: 12, monsters: [] },
  { min: 12, max: 15, monsters: [] }
];

monsters.forEach(m => {
  const range = ranges.find(r => m.power >= r.min && m.power < r.max)
    || ranges[ranges.length - 1];
  if (range) range.monsters.push(m);
});

ranges.forEach(r => {
  if (r.monsters.length > 0) {
    const avgRatio = r.monsters.reduce((sum, m) => sum + m.ratio, 0) / r.monsters.length;
    const avgLevel = r.monsters.reduce((sum, m) => sum + m.level, 0) / r.monsters.length;
    const avgPower = r.monsters.reduce((sum, m) => sum + m.power, 0) / r.monsters.length;
    console.log(`Power ${r.min}-${r.max}: ${r.monsters.length} monstros`);
    console.log(`  Power médio: ${avgPower.toFixed(2)}`);
    console.log(`  Level médio: ${avgLevel.toFixed(0)}`);
    console.log(`  Ratio médio: ${avgRatio.toFixed(2)}`);
  }
});

// Testar diferentes fórmulas
console.log('\n=== TESTE DE FÓRMULAS ===');

const formulas = [
  {
    name: 'Quadrática original',
    formula: 'level = (power * 15) + (power² * 0.5)',
    calculate: (p) => (p * 15) + (p * p * 0.5)
  },
  {
    name: 'Quadrática ajustada v1',
    formula: 'level = (power * 14) + (power² * 0.6)',
    calculate: (p) => (p * 14) + (p * p * 0.6)
  },
  {
    name: 'Quadrática ajustada v2',
    formula: 'level = (power * 13) + (power² * 0.7)',
    calculate: (p) => (p * 13) + (p * p * 0.7)
  },
  {
    name: 'Quadrática ajustada v3',
    formula: 'level = (power * 12) + (power² * 0.8)',
    calculate: (p) => (p * 12) + (p * p * 0.8)
  },
  {
    name: 'Quadrática com ajuste fino',
    formula: 'level = (power * 13.5) + (power² * 0.65)',
    calculate: (p) => (p * 13.5) + (p * p * 0.65)
  },
  {
    name: 'Quadrática com base',
    formula: 'level = 5 + (power * 12) + (power² * 0.7)',
    calculate: (p) => 5 + (p * 12) + (p * p * 0.7)
  }
];

let bestFormula = null;
let bestError = Infinity;

// Filtrar monstros com power zero para evitar divisão por zero
const validMonsters = monsters.filter(m => m.power > 0);

formulas.forEach(f => {
  let totalError = 0;
  let errors = [];
  validMonsters.forEach(m => {
    const predicted = Math.round(f.calculate(m.power));
    const error = Math.abs(predicted - m.level);
    totalError += error;
    errors.push(error);
  });

  const avgError = totalError / validMonsters.length;
  const maxError = Math.max(...errors);
  const medianError = errors.sort((a, b) => a - b)[Math.floor(errors.length / 2)];

  console.log(`\n${f.name}:`);
  console.log(`  Fórmula: ${f.formula}`);
  console.log(`  Erro médio: ${avgError.toFixed(2)}`);
  console.log(`  Erro mediano: ${medianError}`);
  console.log(`  Erro máximo: ${maxError}`);

  if (avgError < bestError) {
    bestError = avgError;
    bestFormula = f;
  }
});

// Mostrar exemplos com a melhor fórmula
console.log('\n=== MELHOR FÓRMULA ===');
console.log(`${bestFormula.name}: ${bestFormula.formula}`);
console.log(`Erro médio: ${bestError.toFixed(2)}`);

console.log('\n=== TABELA DE CONVERSÃO (MELHOR FÓRMULA) ===');
const samples = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 11, 12, 13, 14, 15];
samples.forEach(power => {
  const level = Math.round(bestFormula.calculate(power));
  console.log(`Power ${power.toFixed(1).padStart(4)} -> Level ${level}`);
});

// Mostrar comparação com valores reais
console.log('\n=== COMPARAÇÃO COM VALORES REAIS (AMOSTRA) ===');
const sampleMonsters = validMonsters.filter((m, i) => i % 10 === 0); // Pegar 1 a cada 10
sampleMonsters.forEach(m => {
  const predicted = Math.round(bestFormula.calculate(m.power));
  const error = predicted - m.level;
  const errorSign = error >= 0 ? '+' : '';
  console.log(`${m.name.padEnd(20)} | Power: ${m.power.toFixed(1).padStart(4)} | Real: ${m.level.toString().padStart(3)} | Calc: ${predicted.toString().padStart(3)} | Erro: ${errorSign}${error}`);
});