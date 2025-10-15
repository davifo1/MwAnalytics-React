import { Fragment } from 'react';
import { Container } from '@/components';
import { usePageTitle } from '@/hooks/usePageTitle';

const ClassesPage = () => {
  usePageTitle('Classes');

  return (
    <Fragment>
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="max-w-md text-center">
            <i className="ki-filled ki-user-tick text-8xl text-gray-400 mb-6"></i>
            <h2 className="text-2xl font-bold text-gray-200 mb-4">
              Gerenciador de Classes
            </h2>
            <p className="text-gray-500 mb-6">
              TODO: Implementar sistema completo de gerenciamento de classes
            </p>
            <div className="space-y-2 text-left text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <i className="ki-outline ki-check text-success"></i>
                <span>Configuração de classes base</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="ki-outline ki-check text-success"></i>
                <span>Sistema de skills e habilidades</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="ki-outline ki-check text-success"></i>
                <span>Árvore de talentos</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="ki-outline ki-check text-success"></i>
                <span>Progressão e evolução</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="ki-outline ki-check text-success"></i>
                <span>Balanceamento de stats base</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Fragment>
  );
};

export { ClassesPage };