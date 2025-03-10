import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { ROUTE_PATH as THEME_PATH } from '@/routes/api+/update-theme'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useSubmit } from 'react-router'

export const ThemeSwitcher = () => {
  const theme = useTheme()
  const submit = useSubmit()

  const handleClick = () => {
    const mode = theme === 'dark' ? 'light' : 'dark'
    submit(
      { theme: mode },
      {
        method: 'POST',
        action: THEME_PATH,
        navigate: false,
        fetcherKey: 'theme-fetcher',
        replace: true,
        preventScrollReset: true,
        flushSync: true,
      },
    )
  }

  return (
    <div className="fixed right-6 bottom-6">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 rounded-full shadow-sm"
        onClick={handleClick}>
        {theme === 'dark' ? (
          <MoonIcon className="size-4" />
        ) : (
          <SunIcon className="size-4" />
        )}
      </Button>
    </div>
  )
}
