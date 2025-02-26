import type { ActionFunctionArgs } from 'react-router'
import { redirect } from 'react-router'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { ThemeSchema, setTheme } from '@/hooks/useTheme'
import { CustomError } from '@/utils/errorHandle'

export const ROUTE_PATH = '/api/update-theme' as const

export async function action({ request }: ActionFunctionArgs) {
  const formData = Object.fromEntries(await request.formData())
  const { theme, redirectTo } = ThemeSchema.parse(formData)

  const responseInit = {
    headers: { 'Set-Cookie': setTheme(theme) },
  }

  if (redirectTo) {
    return redirect(safeRedirect(redirectTo), responseInit)
  } else {
    return new CustomError('No redirect URL provided', 200)
  }
}
