import { themeSessionResolver } from '@/utils/cookies/theme';
import { createThemeAction } from 'remix-themes';

export const action = createThemeAction(themeSessionResolver);
