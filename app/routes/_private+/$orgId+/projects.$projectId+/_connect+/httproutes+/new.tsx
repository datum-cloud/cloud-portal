import { HttpRouteForm } from '@/features/connect/httproute/form'
import { mergeMeta, metaObject } from '@/utils/meta'
import { MetaFunction } from 'react-router'

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New HTTP Route')
})

export default function ConnectHttpRoutesNewPage() {
  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <HttpRouteForm />
    </div>
  )
}
