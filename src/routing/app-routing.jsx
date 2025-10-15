import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { AppRoutingSetup } from './app-routing-setup';

export function AppRouting() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);

  return <AppRoutingSetup />;
}