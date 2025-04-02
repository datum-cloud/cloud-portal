import { routes } from '@/constants/routes'
import { NetworkForm } from '@/features/network/form'
import { mergeMeta, metaObject } from '@/utils/meta'
import { getPathWithParams } from '@/utils/path'
import { MetaFunction, useNavigate, useParams } from 'react-router'

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Network')
})

export default function ProjectConnectNetworksNew() {
  const { projectId, orgId } = useParams()
  const navigate = useNavigate()

  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <NetworkForm
        projectId={projectId}
        onSuccess={() => {
          navigate(
            getPathWithParams(routes.projects.networks.root, {
              orgId,
              projectId,
            }),
          )
        }}
      />
    </div>
  )
}
