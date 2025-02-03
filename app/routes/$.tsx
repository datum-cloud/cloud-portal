import type { MetaFunction } from '@remix-run/node'
import { HelpCircle } from 'lucide-react'
import { SITE_CONFIG } from '@/constants/brand'
import { GenericErrorBoundary } from '@/components/misc/ErrorBoundary'

export const meta: MetaFunction = () => {
  return [{ title: `${SITE_CONFIG.siteTitle} - 404 Not Found!` }]
}

export async function loader() {
  throw new Response('Not found', { status: 404 })
}

export default function NotFound() {
  // Due to the loader, this component will never be rendered,
  // but as a good practice, ErrorBoundary will be returned.
  return <ErrorBoundary />
}

export function ErrorBoundary() {
  return (
    <GenericErrorBoundary
      statusHandlers={{
        404: () => (
          <div className="flex h-screen w-full flex-col items-center justify-center gap-8 rounded-md bg-card px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card hover:border-primary/40">
              <HelpCircle className="h-8 w-8 stroke-[1.5px] text-primary/60" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-2xl font-medium text-primary">Whoops!</p>
              <p className="text-center text-lg font-normal text-primary/60">
                Nothing here yet!
              </p>
            </div>
          </div>
        ),
      }}
    />
  )
}
