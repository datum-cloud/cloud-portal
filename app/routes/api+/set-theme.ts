import { themeSessionResolver } from '@/utils/theme'
import { createThemeAction } from 'remix-themes'

export const action = createThemeAction(themeSessionResolver)
