import { ThemeSchema, setTheme } from '@/hooks/useTheme'
import type { ActionFunctionArgs } from 'react-router'
import { data } from 'react-router'

export const ROUTE_PATH = '/api/update-theme' as const

export async function action({ request }: ActionFunctionArgs) {
  const formData = Object.fromEntries(await request.formData())
  const { theme } = ThemeSchema.parse(formData)

  return data(
    { success: true },
    {
      headers: {
        'Set-Cookie': setTheme(theme),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    },
  )
}
