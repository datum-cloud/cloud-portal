import { themeSessionResolver } from '@/utils/cookies';
import { createThemeAction } from 'remix-themes';

export const ROUTE_PATH = '/api/set-theme' as const;

export const action = createThemeAction(themeSessionResolver);
