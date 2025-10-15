import { useEffect } from 'react';

/**
 * Hook to set the page title
 * @param {string} title - The page title (will be suffixed with "| MW Analytics")
 */
export function usePageTitle(title) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | MW Analytics` : 'MW Analytics';

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
