import { script } from './script';
import * as React from 'react';

interface ThemeScriptProps {
  forcedTheme?: string;
  storageKey?: string;
  attribute?: string | string[];
  enableSystem?: boolean;
  enableColorScheme?: boolean;
  defaultTheme?: string;
  value?: Record<string, string>;
  themes?: string[];
  nonce?: string;
  scriptProps?: {
    [key: string]: any;
  };
}

export const ThemeScript = React.memo(function ThemeScript({
  forcedTheme,
  storageKey = 'theme',
  attribute = 'data-theme',
  enableSystem = true,
  enableColorScheme = true,
  defaultTheme = 'system',
  value,
  themes = ['light', 'dark'],
  nonce,
  scriptProps,
}: ThemeScriptProps) {
  const scriptArgs = JSON.stringify([
    attribute,
    storageKey,
    defaultTheme,
    forcedTheme,
    themes,
    value,
    enableSystem,
    enableColorScheme,
  ]).slice(1, -1);

  return (
    <script
      {...scriptProps}
      suppressHydrationWarning
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: `(${script.toString()})(${scriptArgs})` }}
    />
  );
});
