import { themeSessionResolver } from '@/modules/cookie/theme.server'
import { createThemeAction } from 'remix-themes'

export const action = createThemeAction(themeSessionResolver)
