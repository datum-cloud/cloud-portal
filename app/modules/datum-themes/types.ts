import type { ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export type Attribute = 'class' | `data-${string}`;

export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  themes?: string[];
  forcedTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  enableColorScheme?: boolean;
  attribute?: Attribute | Attribute[];
  value?: Record<string, string>;
  nonce?: string;
  scriptProps?: {
    [key: string]: any;
  };
}

export interface UseThemeProps {
  theme?: Theme;
  setTheme: (theme: Theme | ((theme: Theme) => Theme)) => void;
  forcedTheme?: Theme;
  resolvedTheme?: Theme;
  themes: string[];
  systemTheme?: 'light' | 'dark';
}
