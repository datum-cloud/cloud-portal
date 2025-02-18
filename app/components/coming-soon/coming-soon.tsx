import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router'
import { routes } from '@/constants/routes'
import { HomeIcon } from 'lucide-react'
import { LogoIcon } from '@/components/logo/logo-icon'
export const ComingSoon = ({ showBackButton = true }: { showBackButton?: boolean }) => {
  const theme = useTheme()

  return (
    <div className="flex h-full w-full flex-col items-center justify-center space-y-2 p-8 text-center">
      <LogoIcon width={64} theme={theme} className="mb-4" />
      <h2 className="text-2xl font-semibold">Coming Soon</h2>
      <p className="text-muted-foreground">
        This feature is currently under development. Check back later!
      </p>

      {showBackButton && (
        <Link to={routes.home}>
          <Button>
            <HomeIcon className="size-4" />
            Back to Home
          </Button>
        </Link>
      )}
    </div>
  )
}
