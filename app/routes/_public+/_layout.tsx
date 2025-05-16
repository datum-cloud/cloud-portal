import PublicLayout from '@/layouts/public/public'
import { Link, Outlet } from 'react-router'

export default function layout() {
  return (
    <PublicLayout>
      <div className="flex flex-col gap-6">
        <Outlet />
        <div className="text-muted-foreground [&_a]:hover:text-primary text-center text-xs text-balance [&_a]:underline [&_a]:underline-offset-4">
          By clicking continue, you agree to our{' '}
          <Link
            to="https://www.datum.net/terms-of-service"
            target="_blank"
            className="underline"
            rel="noreferrer">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link
            to="https://www.datum.net/privacy-policy"
            target="_blank"
            className="underline"
            rel="noreferrer">
            Privacy Policy
          </Link>
        </div>
      </div>
    </PublicLayout>
  )
}
