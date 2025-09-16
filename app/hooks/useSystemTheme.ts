import { useEffect, useState } from 'react';

/**
 * Custom hook to detect system theme changes using matchMedia
 *
 * @returns {boolean} isDarkMode - Whether the system is currently in dark mode
 *
 * @example
 * ```tsx
 * const isDarkMode = useSystemTheme();
 *
 * return (
 *   <div className={isDarkMode ? 'dark-theme' : 'light-theme'}>
 *     Current theme: {isDarkMode ? 'Dark' : 'Light'}
 *   </div>
 * );
 * ```
 */
export function useSystemTheme(): boolean {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') return;

    // Create media query matcher for dark mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Set initial state
    setIsDarkMode(mediaQuery.matches);

    // Create event handler for theme changes
    const handleThemeChange = (event: MediaQueryListEvent) => {
      setIsDarkMode(event.matches);
    };

    // Add listener for theme changes
    mediaQuery.addEventListener('change', handleThemeChange);

    // Cleanup listener on unmount
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []);

  return isDarkMode;
}
