import { useMemo } from 'react';
import { Container } from '@/components';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getHpPerLevel } from '@/utils/attributesBaseCalculator';
import { getGoldCoinPerKillByPower, getBaseExpByPower, getCPM } from '@/utils/rewardsCalculator';

const CoreCurvesPage = () => {
  usePageTitle('Core Curves');

  // Gera dados para power de 0 a 15 com step de 0.5
  const data = useMemo(() => {
    const points = [];
    for (let power = 0; power <= 15; power += 0.5) {
      // HP cresce de 1 a 15 conforme power cresce
      const hp = getHpPerLevel(power, power);
      const gold = getGoldCoinPerKillByPower(power);
      const exp = getBaseExpByPower(power);
      const cpm = getCPM(power);

      points.push({
        power: parseFloat(power.toFixed(1)),
        hp,
        gold,
        exp,
        cpm,
      });
    }
    return points;
  }, []);

  // Calcula valores normalizados (0-100%)
  const normalizedData = useMemo(() => {
    if (data.length === 0) return [];

    // Encontra min/max de cada métrica
    const hpValues = data.map(d => d.hp);
    const goldValues = data.map(d => d.gold);
    const expValues = data.map(d => d.exp);
    const cpmValues = data.map(d => d.cpm);

    const minHp = Math.min(...hpValues);
    const maxHp = Math.max(...hpValues);
    const minGold = Math.min(...goldValues);
    const maxGold = Math.max(...goldValues);
    const minExp = Math.min(...expValues);
    const maxExp = Math.max(...expValues);
    const minCpm = Math.min(...cpmValues);
    const maxCpm = Math.max(...cpmValues);

    // Normaliza cada ponto e adiciona linha linear de comparação
    return data.map((d, index) => ({
      power: d.power,
      hpNormalized: ((d.hp - minHp) / (maxHp - minHp)) * 100,
      goldNormalized: ((d.gold - minGold) / (maxGold - minGold)) * 100,
      expNormalized: ((d.exp - minExp) / (maxExp - minExp)) * 100,
      cpmNormalized: ((d.cpm - minCpm) / (maxCpm - minCpm)) * 100,
      // Linha linear de comparação (0-100%)
      linearReference: (index / (data.length - 1)) * 100,
      // Mantém valores originais para tooltip
      hp: d.hp,
      gold: d.gold,
      exp: d.exp,
      cpm: d.cpm,
    }));
  }, [data]);

  // Custom tooltip para mostrar valores reais e normalizados
  const CustomTooltip = ({ active, payload, label, showReal = false }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-gray-900 border border-gray-700 rounded p-3 shadow-lg">
        <p className="text-sm font-semibold text-gray-200 mb-2">Power: {label}</p>
        {payload.map((entry, index) => {
          const dataPoint = entry.payload;
          let realValue = '';
          let normalizedValue = entry.value;

          if (entry.dataKey === 'hpNormalized') {
            realValue = `HP: ${dataPoint.hp.toFixed(2)}`;
          } else if (entry.dataKey === 'goldNormalized') {
            realValue = `Gold: ${dataPoint.gold}`;
          } else if (entry.dataKey === 'expNormalized') {
            realValue = `XP: ${dataPoint.exp}`;
          } else if (entry.dataKey === 'cpmNormalized') {
            realValue = `CPM: ${dataPoint.cpm}`;
          } else if (entry.dataKey === 'linearReference') {
            realValue = 'Linear';
          } else if (entry.dataKey === 'hp') {
            realValue = `${entry.value.toFixed(2)}`;
          } else if (entry.dataKey === 'gold') {
            realValue = `${entry.value}`;
          } else if (entry.dataKey === 'exp') {
            realValue = `${entry.value}`;
          } else if (entry.dataKey === 'cpm') {
            realValue = `${entry.value}`;
          }

          return (
            <div key={index} className="flex items-center gap-2 text-xs mb-1">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-300">
                {entry.name}: {showReal ? realValue : `${normalizedValue.toFixed(1)}%`}
              </span>
              {!showReal && realValue && (
                <span className="text-gray-500">({realValue})</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Container className="max-w-full" data-panel-id="game-design-core-curves-page">
      <div className="space-y-6">
        {/* Gráfico 1: Valores Normalizados */}
        <Card data-panel-id="core-curves-normalized-chart">
          <CardHeader>
            <CardHeading>
              Core Curves - Normalized (0-100%)
            </CardHeading>
            <p className="text-sm text-gray-400 mt-1">
              Compara a intensidade de crescimento de cada curva ao longo dos níveis de power.
              Todas as curvas são normalizadas para a escala 0-100% para facilitar a comparação.
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={normalizedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="power"
                  label={{ value: 'Power', position: 'insideBottom', offset: -5 }}
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis
                  label={{ value: 'Normalized Value (%)', angle: -90, position: 'insideLeft' }}
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="linearReference"
                  name="Linear Reference"
                  stroke="#6B7280"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="hpNormalized"
                  name="HP per Level (hp=power)"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="goldNormalized"
                  name="Gold per Kill"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="expNormalized"
                  name="Base XP"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="cpmNormalized"
                  name="CPM (Cost per Minute)"
                  stroke="#EC4899"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Informações Adicionais */}
        <Card data-panel-id="core-curves-info">
          <CardHeader>
            <CardHeading>Sobre as Curvas</CardHeading>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded bg-gray-500 mt-1" />
                <div>
                  <span className="font-semibold">Linear Reference:</span> Linha de referência linear (crescimento constante) para comparação com as curvas exponenciais.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded bg-green-500 mt-1" />
                <div>
                  <span className="font-semibold">HP per Level:</span> Calculado com hp crescendo de 1 a 15 (hp=power) usando a fórmula{' '}
                  <code className="bg-gray-800 px-1 py-0.5 rounded text-xs">
                    11 + (hp × power^1.05)
                  </code>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded bg-amber-500 mt-1" />
                <div>
                  <span className="font-semibold">Gold per Kill:</span> Usa crescimento geométrico com soft-cap logístico para balancear early/mid/late game.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded bg-blue-500 mt-1" />
                <div>
                  <span className="font-semibold">Base XP:</span> Calculado com curva de potência{' '}
                  <code className="bg-gray-800 px-1 py-0.5 rounded text-xs">
                    1.55 × power^1.7
                  </code>{' '}
                  para progressão exponencial.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded bg-pink-500 mt-1" />
                <div>
                  <span className="font-semibold">CPM (Cost per Minute):</span> Curva sigmoidal em "S" que representa o custo por minuto para manter o jogador vivo e eficiente com transição suave em power ~8.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
};

export { CoreCurvesPage };
