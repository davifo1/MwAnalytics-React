import { useState, useEffect, useMemo } from 'react';
import { Container } from '@/components';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardHeader, CardContent, CardHeading } from '@/components/ui/card';
import { BarChart3, ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { loadAllMonsters } from '@/services/monsterService';
import { calculateBaseStatsRole } from '@/utils/baseStatsRoleCalculator';

const MonstersMetricsPage = () => {
  usePageTitle('Monsters Metrics');

  const [monsters, setMonsters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função para obter valor numérico do speed
  const getSpeedValue = (speedType) => {
    const speedMap = {
      'Slow': 1,
      'NoBoot': 2,
      'Boot1': 3,
      'Boot2': 4,
      'BOH': 5,
      'VeryFast': 6,
      'None': 0
    };
    return speedMap[speedType] || 0;
  };

  useEffect(() => {
    loadMonsterData();
  }, []);

  const loadMonsterData = async () => {
    setLoading(true);
    try {
      const data = await loadAllMonsters();
      if (data && data.length > 0) {
        // Adiciona baseStatsRole calculado se não existir
        const monstersWithRole = data.map(m => ({
          ...m,
          baseStatsRole: m.baseStatsRole || calculateBaseStatsRole(
            m.hp || 0,
            m.atk || 0,
            m.satk || 0,
            m.def || 0,
            m.sdef || 0,
            getSpeedValue(m.speedType || 'None')
          )
        }));
        setMonsters(monstersWithRole);
      }
    } catch (error) {
      console.error('Erro ao carregar monstros:', error);
    } finally {
      setLoading(false);
    }
  };

  // Dados para gráfico de Map Role
  const mapRoleData = useMemo(() => {
    const roleCount = {};
    monsters.forEach(m => {
      const role = m.mapRole || 'None';
      roleCount[role] = (roleCount[role] || 0) + 1;
    });

    return Object.entries(roleCount)
      .map(([role, count]) => ({ name: role, count }))
      .sort((a, b) => b.count - a.count);
  }, [monsters]);

  // Dados para gráfico de Base Stats Role (filtrando map roles específicos)
  const baseStatsRoleData = useMemo(() => {
    const excludedMapRoles = ['Scenery', 'Trash', 'Boss', 'Tower', 'Custom'];
    const filteredMonsters = monsters.filter(m =>
      !excludedMapRoles.includes(m.mapRole || 'None')
    );

    const roleCount = {};
    filteredMonsters.forEach(m => {
      const role = m.baseStatsRole || 'None';
      roleCount[role] = (roleCount[role] || 0) + 1;
    });

    return {
      data: Object.entries(roleCount)
        .map(([role, count]) => ({
          name: role.replace(/([A-Z])/g, ' $1').trim(), // Adiciona espaços entre palavras
          count
        }))
        .sort((a, b) => b.count - a.count),
      totalMonsters: filteredMonsters.length
    };
  }, [monsters]);

  // Dados para histograma de Power
  const powerDistributionData = useMemo(() => {
    const ranges = [
      { min: 0, max: 2, label: '0-2', count: 0 },
      { min: 2, max: 4, label: '2-4', count: 0 },
      { min: 4, max: 6, label: '4-6', count: 0 },
      { min: 6, max: 8, label: '6-8', count: 0 },
      { min: 8, max: 10, label: '8-10', count: 0 },
      { min: 10, max: 12, label: '10-12', count: 0 },
      { min: 12, max: 15, label: '12-15', count: 0 },
      { min: 15, max: 999, label: '15+', count: 0 }
    ];

    monsters.forEach(m => {
      const power = parseFloat(m.power) || 0;
      const range = ranges.find(r => power >= r.min && power < r.max);
      if (range) range.count++;
    });

    return ranges.filter(r => r.count > 0).map(r => ({
      name: r.label,
      count: r.count
    }));
  }, [monsters]);

  // Cores para os gráficos
  const COLORS = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#f97316', // orange-500
    '#6366f1', // indigo-500
  ];

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded p-2">
          <p className="text-sm text-gray-300">{label}</p>
          <p className="text-sm font-bold text-blue-400">
            {payload[0].value} monstros
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Container>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">Carregando dados...</p>
            </div>
          </CardHeader>
        </Card>
      </Container>
    );
  }

  return (
    <>
      {/* Header Compacto estilo Demo6 */}
      <Container>
        <div className="pb-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-3">
            <Link to="/dashboard" className="hover:text-gray-200 transition-colors">
              <Home className="size-3.5" />
            </Link>
            <ChevronRight className="size-3.5" />
            <Link to="/monsters" className="hover:text-gray-200 transition-colors">
              Monstros
            </Link>
            <ChevronRight className="size-3.5" />
            <span className="text-gray-200">Métricas</span>
          </div>

          {/* Título */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-100">
                Métricas de Monstros
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Análise estatística e visualizações dos dados
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 pb-8">
          {/* Gráfico de Map Role */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between w-full mb-6">
                <div>
                  <CardHeading className="text-lg">Distribuição por Map Role</CardHeading>
                  <p className="text-sm text-gray-400 mt-1">
                    Quantidade de monstros em cada categoria de mapa
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Total de monstros</span>
                  <span className="text-lg font-semibold text-gray-300">{monsters.length}</span>
                </div>
              </div>
              {mapRoleData.length > 0 ? (
                <div style={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={mapRoleData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="name"
                        stroke="#9CA3AF"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        fontSize={12}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        {mapRoleData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-gray-500">Nenhum dado disponível</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Base Stats Role */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between w-full mb-6">
                <div>
                  <CardHeading className="text-lg">Distribuição por Base Stats Role</CardHeading>
                  <p className="text-sm text-gray-400 mt-1">
                    Análise de papéis de combate (excluindo Scenery, Trash, Boss, Tower e Custom)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Monstros analisados</span>
                  <span className="text-lg font-semibold text-gray-300">{baseStatsRoleData.totalMonsters}</span>
                </div>
              </div>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={baseStatsRoleData.data} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="name"
                      stroke="#9CA3AF"
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                      {baseStatsRoleData.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Histograma de Power */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between w-full mb-6">
                <div>
                  <CardHeading className="text-lg">Distribuição de Power</CardHeading>
                  <p className="text-sm text-gray-400 mt-1">
                    Histograma mostrando a distribuição de dificuldade dos monstros
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Total de monstros</span>
                  <span className="text-lg font-semibold text-gray-300">{monsters.length}</span>
                </div>
              </div>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={powerDistributionData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="name"
                      stroke="#9CA3AF"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </>
  );
};

export default MonstersMetricsPage;