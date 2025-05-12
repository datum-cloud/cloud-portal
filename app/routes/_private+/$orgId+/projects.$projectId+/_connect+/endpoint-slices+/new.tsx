import { EndpointSliceForm } from '@/features/connect/endpoint-slice/form'
import { mergeMeta, metaObject } from '@/utils/meta'
import { MetaFunction } from 'react-router'

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Endpoint Slice')
})

export default function ConnectEndpointSlicesNewPage() {
  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <EndpointSliceForm />
    </div>
  )
}
