import { themeSessionResolver } from '@/modules/cookie/theme.server';
import { createThemeAction } from 'remix-themes';

export const ROUTE_PATH = '/api/set-theme' as const;

export const action = createThemeAction(themeSessionResolver);
