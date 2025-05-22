import { StatusBadge } from '@/components/status-badge/status-badge'
import { useApp } from '@/providers/app.provider'
import {
  ControlPlaneStatus,
  IControlPlaneStatus,
} from '@/resources/interfaces/control-plane.interface'
import { ROUTE_PATH as PROJECT_STATUS_ROUTE_PATH } from '@/routes/api+/projects+/status'
import { useEffect, useRef, useState } from 'react'
import { useFetcher } from 'react-router'

export const ProjectStatus = ({
  currentStatus,
  projectId,
  type = 'dot',
  showTooltip = true,
  badgeClassName,
}: {
  currentStatus?: IControlPlaneStatus
  projectId?: string
  type?: 'dot' | 'badge'
  showTooltip?: boolean
  badgeClassName?: string
}) => {
  const { orgId } = useApp()
  const fetcher = useFetcher({ key: `project-status-${projectId}` })
  const intervalRef = useRef<NodeJS.Timeout>(null)
  const [status, setStatus] = useState<IControlPlaneStatus>()

  const loadStatus = () => {
    if (projectId && orgId) {
      fetcher.load(`${PROJECT_STATUS_ROUTE_PATH}?projectId=${projectId}&orgId=${orgId}`)
    }
  }

  useEffect(() => {
    setStatus(currentStatus)

    // Only set up polling if we have the required IDs
    if (!projectId || !orgId) {
      return
    }

    // Initial load if:
    // 1. No current status exists, or
    // 2. Current status is pending
    if (!currentStatus || currentStatus?.status === ControlPlaneStatus.Pending) {
      loadStatus()

      // Set up polling interval
      intervalRef.current = setInterval(loadStatus, 10000)
    }

    // Clean up interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [projectId, orgId])

  useEffect(() => {
    if (fetcher.data) {
      const { status } = fetcher.data as IControlPlaneStatus

      setStatus(fetcher.data)
      if (
        (status === ControlPlaneStatus.Success || status === ControlPlaneStatus.Error) &&
        intervalRef.current
      ) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetcher.data])

  return status ? (
    <StatusBadge
      status={status}
      type={type}
      showTooltip={showTooltip}
      badgeClassName={badgeClassName}
      tooltipText={
        fetcher.data?.status === ControlPlaneStatus.Success ? 'Active' : undefined
      }
    />
  ) : (
    <></>
  )
}
