import { Fragment } from 'react';
import { Container } from '@/components';
import { usePageTitle } from '@/hooks/usePageTitle';

const DashboardPage = () => {
  usePageTitle('Dashboard');

  return (
    <Fragment>
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="max-w-md text-center">
            <i className="ki-filled ki-chart-line text-8xl text-gray-400 mb-6"></i>
            <h2 className="text-2xl font-bold text-gray-200 mb-4">
              Dashboard de Estatísticas
            </h2>
            <p className="text-gray-500 mb-6">
              TODO: Implementar dashboard completo com métricas e análises do jogo
            </p>
            <div className="space-y-2 text-left text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <i className="ki-outline ki-check text-success"></i>
                <span>Métricas em tempo real</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="ki-outline ki-check text-success"></i>
                <span>Gráficos de distribuição</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="ki-outline ki-check text-success"></i>
                <span>Análise de balanceamento</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="ki-outline ki-check text-success"></i>
                <span>Relatórios exportáveis</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="ki-outline ki-check text-success"></i>
                <span>Logs e auditoria</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Fragment>
  );
};

export { DashboardPage };