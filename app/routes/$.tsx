import { GenericErrorBoundary } from '@/components/misc/ErrorBoundary'
import { CustomError } from '@/utils/errorHandle'
import { mergeMeta, metaObject } from '@/utils/meta'
import { HelpCircle } from 'lucide-react'
import type { MetaFunction } from 'react-router'

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('404 Not Found')
})

export async function loader() {
  throw new CustomError('Not found', 404)
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
          <div className="bg-card flex h-screen w-full flex-col items-center justify-center gap-8 rounded-md px-6">
            <div className="border-border bg-card hover:border-primary/40 flex h-16 w-16 items-center justify-center rounded-2xl border">
              <HelpCircle className="text-primary/60 h-8 w-8 stroke-[1.5px]" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-primary text-2xl font-medium">Whoops!</p>
              <p className="text-primary/60 text-center text-lg font-normal">
                Nothing here yet!
              </p>
            </div>
          </div>
        ),
      }}
    />
  )
}
