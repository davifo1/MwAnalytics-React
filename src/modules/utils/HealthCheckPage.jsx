import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/common/container';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { checkAllPaths } from '@/services/healthCheckService';

export function HealthCheckPage() {
  usePageTitle('Health Check');

  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHealthChecks();
  }, []);

  async function loadHealthChecks() {
    try {
      setLoading(true);
      setError(null);
      const results = await checkAllPaths();
      setChecks(results);
    } catch (err) {
      console.error('Erro ao carregar health checks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getStatusIcon(check) {
    if (!check.exists) {
      return <XCircle className="size-5 text-red-600" />;
    }
    if (check.valid) {
      return <CheckCircle2 className="size-5 text-green-600" />;
    }
    return <AlertCircle className="size-5 text-yellow-600" />;
  }

  function getStatusText(check) {
    if (!check.exists) return 'Não encontrado';
    if (check.valid) return 'Válido';
    return 'Inválido';
  }

  function getStatusBadgeClass(check) {
    if (!check.exists) return 'bg-red-100 text-red-700';
    if (check.valid) return 'bg-green-100 text-green-700';
    return 'bg-yellow-100 text-yellow-700';
  }

  const allHealthy = checks.every(check => check.exists && check.valid);
  const someIssues = checks.some(check => !check.exists || !check.valid);

  return (
    <Container data-panel-id="utils-health-check">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Health Check</h1>
          <p className="text-sm text-muted-foreground">
            Verificação de paths e arquivos configurados no public/data/settings.js
          </p>
        </div>

        <Separator />

        {/* Status Summary */}
        {!loading && !error && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              {allHealthy && (
                <>
                  <CheckCircle2 className="size-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-700">
                      Todos os paths estão configurados corretamente
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {checks.length} {checks.length === 1 ? 'verificação passou' : 'verificações passaram'}
                    </p>
                  </div>
                </>
              )}
              {someIssues && (
                <>
                  <AlertCircle className="size-6 text-red-600" />
                  <div>
                    <p className="font-medium text-red-700">
                      Alguns paths não foram encontrados
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {checks.filter(c => !c.exists).length} de {checks.length}{' '}
                      {checks.filter(c => !c.exists).length === 1 ? 'verificação falhou' : 'verificações falharam'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verificando paths...</p>
            </div>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6 border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <XCircle className="size-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-700">Erro ao verificar paths</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Checks List */}
        {!loading && !error && checks.length > 0 && (
          <div className="flex flex-col gap-4">
            {checks.map((check) => (
              <Card key={check.key} className="p-4" data-panel-id={`utils-health-check-${check.key}`}>
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">{getStatusIcon(check)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-foreground">{check.label}</h3>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusBadgeClass(check)}`}>
                        {getStatusText(check)}
                      </span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700">
                        {check.type === 'directory' ? 'Diretório' : 'Arquivo'}
                      </span>
                    </div>

                    {/* Path */}
                    <p className="text-sm text-muted-foreground font-mono break-all mb-2">
                      {check.path}
                    </p>

                    {/* Description/Details */}
                    {check.description && (
                      <p className="text-sm text-foreground mb-2">
                        {check.description}
                      </p>
                    )}

                    {/* Error message */}
                    {check.error && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>Erro:</strong> {check.error}
                        </p>
                      </div>
                    )}

                    {/* World Path & Items Path - Required Files Detail */}
                    {(check.key === 'worldPath' || check.key === 'itemsPath') && check.requiredFiles && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <p className="text-xs font-medium text-gray-700 mb-2">Arquivos obrigatórios:</p>
                        <div className="grid grid-cols-1 gap-1">
                          {Object.entries(check.requiredFiles).map(([file, found]) => (
                            <div key={file} className="flex items-center gap-2 text-xs">
                              {found ? (
                                <CheckCircle2 className="size-3 text-green-600" />
                              ) : (
                                <XCircle className="size-3 text-red-600" />
                              )}
                              <span className={found ? 'text-green-700' : 'text-red-700'}>
                                {file}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        {!loading && (
          <div className="flex justify-end">
            <button
              onClick={loadHealthChecks}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
            >
              Verificar novamente
            </button>
          </div>
        )}
      </div>
    </Container>
  );
}