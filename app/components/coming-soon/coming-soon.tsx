import { Logo } from '@/components/logo/logo'
import { useTheme } from '@/hooks/useTheme'

export const ComingSoon = () => {
  const theme = useTheme()

  return (
    <div className="flex h-full w-full flex-col items-center justify-center space-y-2 p-8 text-center">
      <Logo asIcon width={64} theme={theme} className="mb-4" />
      <h2 className="text-2xl font-semibold">Coming Soon</h2>
      <p className="text-muted-foreground">
        This feature is currently under development. Check back later!
      </p>
    </div>
  )
}
