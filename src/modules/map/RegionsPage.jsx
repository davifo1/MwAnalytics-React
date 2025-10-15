import { useEffect, useState } from 'react';
import { Container } from '@/components/common/container';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Award, Info, Leaf } from 'lucide-react';
import { getRegions, getCollectiblesByRegion } from '@/services/regionsService';
import { getTierColor } from '@/utils/tierUtils';

export function RegionsPage() {
  usePageTitle('Regions');

  const [regions, setRegions] = useState([]);
  const [regionsAnalysis, setRegionsAnalysis] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRegions();
  }, []);

  async function loadRegions() {
    try {
      setLoading(true);
      setLoadingProgress(0);
      setError(null);

      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      const [regionsData, analysisData] = await Promise.all([
        getRegions(),
        getCollectiblesByRegion()
      ]);

      clearInterval(progressInterval);
      setLoadingProgress(100);

      const analysisMap = new Map(
        (analysisData.regions || []).map(region => [region.region, region])
      );

      const mergedRegions = regionsData.map(region => {
        const analysis = analysisMap.get(region.description);

        return {
          region: region.name,
          name: region.name,
          description: region.description,
          recommendedLevel: region.recommendedLevel,
          color: region.color,
          items: analysis?.items || [],
          tierSummary: analysis?.tierSummary || { basic: 0, epic: 0, legendary: 0 },
          totalItems: analysis?.totalItems || 0
        };
      });

      setRegions(regionsData);
      setRegionsAnalysis(mergedRegions);
    } catch (err) {
      console.error('Erro ao carregar regiões:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectRegion(regionData) {
    setSelectedRegion(regionData);
  }

  return (
    <Container data-panel-id="map-regions">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-gray-100">Regiões do Mapa</h1>
          <p className="text-sm text-gray-400">
            Visualize coletáveis e informações de spawn por região
          </p>
        </div>

        {/* Loading Progress Bar */}
        {loading && (
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="py-3">
              <div className="flex items-center gap-4">
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">Analyzing map regions...</span>
                    <span className="text-xs text-gray-500">{loadingProgress}%</span>
                  </div>
                  <Progress value={loadingProgress} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="bg-red-900/20 border-red-700">
            <CardContent className="py-3">
              <p className="text-red-400 text-sm">Erro ao carregar regiões: {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Painéis Horizontais */}
        {!error && (
          <div className="flex gap-4 h-[calc(100vh-240px)]" data-panel-id="map-regions-layout">
            {/* Painel Esquerdo - Lista de Regiões */}
            <div className="w-[50%] min-w-[500px] h-full" data-panel-id="map-regions-list">
              <Card className="h-full flex flex-col bg-gray-900 border-gray-700">
                <CardHeader className="py-3 flex-shrink-0 border-b border-gray-700">
                  <CardHeading>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-200">Resumo das Regiões</span>
                      <Badge variant="secondary" className="bg-gray-700 text-gray-200 ml-4">
                        {regionsAnalysis.length} regiões
                      </Badge>
                    </div>
                  </CardHeading>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full">
                    <div className="flex flex-col gap-2 p-4">
                      {regionsAnalysis.map((region) => {
                        const isSelected = selectedRegion?.region === region.region;

                        return (
                          <Card
                            key={region.region}
                            className={`cursor-pointer transition-all bg-gray-800 border-gray-700 hover:border-blue-500 ${
                              isSelected ? 'border-blue-500 bg-gray-800/80 shadow-lg shadow-blue-500/20' : ''
                            }`}
                            onClick={() => handleSelectRegion(region)}
                            data-panel-id={`map-regions-item-${region.region}`}
                          >
                            <CardContent className="p-3">
                              <div className="flex flex-col gap-2">
                                {/* Header da região */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    <MapPin className="size-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-medium text-gray-100 text-sm truncate">
                                        {region.description}
                                      </h3>
                                    </div>
                                  </div>
                                  {region.recommendedLevel && (
                                    <Badge className="bg-blue-600 text-blue-100 text-xs flex-shrink-0">
                                      Lv {region.recommendedLevel}
                                    </Badge>
                                  )}
                                </div>

                                {/* Separador */}
                                <div className="h-px bg-gray-700" />

                                {/* Tier Summary */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Leaf className="size-3.5 text-gray-400" />
                                  <span className="text-xs text-gray-400">Coletáveis:</span>
                                  {region.totalItems > 0 ? (
                                    <>
                                      {region.tierSummary.basic > 0 && (
                                        <Badge className={`${getTierColor('basic')} text-xs px-2 py-0`}>
                                          Basic: {region.tierSummary.basic}
                                        </Badge>
                                      )}
                                      {region.tierSummary.epic > 0 && (
                                        <Badge className={`${getTierColor('epic')} text-xs px-2 py-0`}>
                                          Epic: {region.tierSummary.epic}
                                        </Badge>
                                      )}
                                      {region.tierSummary.legendary > 0 && (
                                        <Badge className={`${getTierColor('legendary')} text-xs px-2 py-0`}>
                                          Legendary: {region.tierSummary.legendary}
                                        </Badge>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-xs text-gray-500 italic">Nenhum coletável</span>
                                  )}
                                </div>

                                {/* Spawn Info */}
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Info className="size-3.5" />
                                  <span>Spawn info coming soon</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {regionsAnalysis.length === 0 && !loading && (
                        <Card className="bg-gray-800 border-gray-700">
                          <CardContent className="p-8">
                            <p className="text-center text-gray-400 text-sm">
                              Nenhuma região encontrada
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Painel Direito - Detalhes da Região */}
            <div className="w-[50%] min-w-[500px] h-full" data-panel-id="map-regions-details">
              <Card className="h-full flex flex-col bg-gray-900 border-gray-700">
                <CardHeader className="py-3 flex-shrink-0 border-b border-gray-700">
                  <CardHeading>
                    <span className="text-sm font-medium text-gray-200">Detalhes da Região</span>
                  </CardHeading>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  {!selectedRegion ? (
                    <div className="h-full flex items-center justify-center p-8">
                      <div className="flex flex-col items-center gap-4 text-center max-w-md">
                        <div className="p-4 rounded-full bg-gray-800">
                          <MapPin className="size-8 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-gray-300 font-medium mb-1">Nenhuma região selecionada</p>
                          <p className="text-sm text-gray-500">
                            Clique em uma região à esquerda para ver seus detalhes e coletáveis
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="h-full">
                      <div className="flex flex-col gap-4 p-4">
                        {/* Header da Região Selecionada */}
                        <Card className="bg-gray-800 border-gray-700">
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h3 className="text-base font-semibold text-gray-100 mb-1">
                                    {selectedRegion.description}
                                  </h3>
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <MapPin className="size-3.5" />
                                    <span>ID: {selectedRegion.region}</span>
                                  </div>
                                </div>
                                {selectedRegion.recommendedLevel && (
                                  <Badge className="bg-blue-600 text-blue-100">
                                    Level {selectedRegion.recommendedLevel}
                                  </Badge>
                                )}
                              </div>

                              <div className="h-px bg-gray-700" />

                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Award className="size-4 text-blue-400" />
                                  <span className="text-sm text-gray-300">
                                    <span className="font-semibold text-gray-100">{selectedRegion.totalItems}</span> coletáveis
                                  </span>
                                </div>
                                <div className="h-4 w-px bg-gray-700" />
                                <div className="flex items-center gap-2">
                                  <Leaf className="size-4 text-green-400" />
                                  <span className="text-sm text-gray-300">
                                    <span className="font-semibold text-gray-100">{selectedRegion.items?.length || 0}</span> únicos
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Lista de Coletáveis */}
                        <Card className="bg-gray-800 border-gray-700">
                          <CardHeader className="py-2 border-b border-gray-700">
                            <CardHeading>
                              <span className="text-sm font-medium text-gray-200">Coletáveis Únicos</span>
                            </CardHeading>
                          </CardHeader>
                          <CardContent className="p-2">
                            {selectedRegion.items && selectedRegion.items.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {[...selectedRegion.items]
                                  .sort((a, b) => {
                                    // Tier priority mapping
                                    const tierPriority = {
                                      legendary: 3,
                                      epic: 2,
                                      basic: 1
                                    };

                                    const aTier = tierPriority[a.tier?.toLowerCase()] || 0;
                                    const bTier = tierPriority[b.tier?.toLowerCase()] || 0;

                                    // First sort by tier (descending)
                                    if (bTier !== aTier) return bTier - aTier;

                                    // Then sort by count (descending)
                                    return b.count - a.count;
                                  })
                                  .map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between p-2 rounded bg-gray-900 border border-gray-700 hover:border-gray-600 transition-colors"
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <Leaf className="size-3.5 text-green-400 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-100 text-sm truncate">
                                          {item.name}
                                        </p>
                                        <p className="text-xs text-gray-500">ID: {item.id}</p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <Badge className={`${getTierColor(item.tier)} text-xs px-1.5 py-0`}>
                                        {item.tier}
                                      </Badge>
                                      <span className="text-sm font-semibold text-blue-400 min-w-[45px] text-right">
                                        {item.count}x
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-12">
                                <Leaf className="size-12 text-gray-700 mx-auto mb-3" />
                                <p className="text-sm text-gray-400">
                                  Nenhum coletável encontrado nesta região
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
