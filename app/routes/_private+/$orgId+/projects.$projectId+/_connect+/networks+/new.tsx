import { routes } from '@/constants/routes'
import { NetworkForm } from '@/features/network/form'
import { getPathWithParams } from '@/utils/path'
import { useNavigate, useParams } from 'react-router'

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
