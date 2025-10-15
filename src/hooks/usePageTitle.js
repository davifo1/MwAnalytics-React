import { useEffect } from 'react';

/**
 * Hook to set the page title
 * @param {string} title - The page title (will be suffixed with "| MW Server Manager")
 */
export function usePageTitle(title) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | MW Server Manager` : 'MW Server Manager';

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
