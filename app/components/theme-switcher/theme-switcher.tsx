import { Button } from '@/components/ui/button'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme, Theme } from 'remix-themes'

export const ThemeSwitcher = () => {
  const [theme, setTheme] = useTheme()

  return (
    <div className="fixed right-6 bottom-6">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 rounded-full shadow-sm"
        onClick={() => setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)}>
        {theme === Theme.DARK ? (
          <MoonIcon className="size-4" />
        ) : (
          <SunIcon className="size-4" />
        )}
      </Button>
    </div>
  )
}
