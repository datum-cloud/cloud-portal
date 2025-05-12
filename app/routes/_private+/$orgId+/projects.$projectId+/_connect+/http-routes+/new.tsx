import { HttpRouteForm } from '@/features/connect/http-route/form'
import { mergeMeta, metaObject } from '@/utils/meta'
import { MetaFunction, useParams } from 'react-router'

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New HTTP Route')
})

export default function ConnectHttpRoutesNewPage() {
  const { projectId } = useParams()
  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <HttpRouteForm projectId={projectId} />
    </div>
  )
}
