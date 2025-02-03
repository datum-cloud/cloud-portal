import type { Theme, ThemeExtended } from '@/hooks/useTheme'
import { useSubmit, useFetcher } from '@remix-run/react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { ROUTE_PATH as THEME_PATH } from '@/routes/resources+/update-theme'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { useOptimisticThemeMode } from '@/hooks/useTheme'

export function ThemeSwitcher({
  userPreference,
  triggerClass,
}: {
  userPreference?: Theme | null
  triggerClass?: string
}) {
  const submit = useSubmit()
  const optimisticMode = useOptimisticThemeMode()
  const mode = optimisticMode ?? userPreference ?? 'system'
  const themes: ThemeExtended[] = ['light', 'dark', 'system']

  return (
    <Select
      defaultValue={mode}
      onValueChange={(theme) =>
        submit(
          { theme },
          {
            method: 'POST',
            action: THEME_PATH,
            navigate: false,
            fetcherKey: 'theme-fetcher',
          },
        )
      }>
      <SelectTrigger className={triggerClass ?? ''}>
        <div className="flex items-center gap-2">
          {mode === 'light' ? (
            <Sun className="size-[14px]" />
          ) : mode === 'dark' ? (
            <Moon className="size-[14px]" />
          ) : (
            <Monitor className="size-[14px]" />
          )}
          <span className="text-sm font-medium">
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {themes.map((theme) => (
          <SelectItem
            key={theme}
            value={theme}
            className={`text-sm font-medium text-primary/60 ${mode === theme && 'text-primary'}`}>
            {theme && theme.charAt(0).toUpperCase() + theme.slice(1)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ThemeSwitcherHome() {
  const fetcher = useFetcher({ key: 'theme-fetcher' })
  const themes: ThemeExtended[] = ['light', 'dark', 'system']

  return (
    <fetcher.Form method="POST" action={THEME_PATH} className="flex gap-3">
      {themes.map((theme) => (
        <button key={theme} type="submit" name="theme" value={theme}>
          {theme === 'light' ? (
            <Sun className="h-4 w-4 text-primary/80 hover:text-primary" />
          ) : theme === 'dark' ? (
            <Moon className="h-4 w-4 text-primary/80 hover:text-primary" />
          ) : (
            <Monitor className="h-4 w-4 text-primary/80 hover:text-primary" />
          )}
        </button>
      ))}
    </fetcher.Form>
  )
}
