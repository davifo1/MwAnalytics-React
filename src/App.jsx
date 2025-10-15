import { AppRouting } from '@/routing/app-routing';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { I18nProvider } from './providers/i18n-provider';
import { ModulesProvider } from './providers/modules-provider';
import { SettingsProvider } from './providers/settings-provider';
import { ThemeProvider } from './providers/theme-provider';
import { TooltipsProvider } from './providers/tooltips-provider';

const { BASE_URL } = import.meta.env;

export function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <I18nProvider>
          <HelmetProvider>
            <TooltipsProvider>
              <BrowserRouter basename={BASE_URL}>
                <Toaster />
                <ModulesProvider>
                  <AppRouting />
                </ModulesProvider>
              </BrowserRouter>
            </TooltipsProvider>
          </HelmetProvider>
        </I18nProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}