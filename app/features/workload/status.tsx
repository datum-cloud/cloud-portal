import { StatusBadge } from '@/components/status-badge/status-badge'
import {
  ControlPlaneStatus,
  IControlPlaneStatus,
} from '@/resources/interfaces/control-plane.interface'
import { ROUTE_PATH as WORKLOAD_STATUS_ROUTE_PATH } from '@/routes/api+/workloads+/status'
import { useEffect, useRef, useState } from 'react'
import { useFetcher } from 'react-router'

export const WorkloadStatus = ({
  currentStatus,
  projectId,
  workloadId,
  type = 'dot',
  showTooltip = true,
  badgeClassName,
}: {
  currentStatus?: IControlPlaneStatus
  projectId?: string
  workloadId?: string
  type?: 'dot' | 'badge'
  showTooltip?: boolean
  badgeClassName?: string
}) => {
  const fetcher = useFetcher({ key: `workload-status-${workloadId}` })
  const intervalRef = useRef<NodeJS.Timeout>(null)
  const [status, setStatus] = useState<IControlPlaneStatus>()

  const loadStatus = () => {
    if (projectId && workloadId) {
      fetcher.load(
        `${WORKLOAD_STATUS_ROUTE_PATH}?projectId=${projectId}&workloadId=${workloadId}`,
      )
    }
  }

  useEffect(() => {
    setStatus(currentStatus)

    // Only set up polling if we have the required IDs
    if (!projectId || !workloadId) {
      return
    }

    // Initial load if:
    // 1. No current status exists, or
    // 2. Current status is pending
    if (!currentStatus || currentStatus?.isReady === ControlPlaneStatus.Pending) {
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
  }, [projectId, workloadId])

  useEffect(() => {
    if (fetcher.data) {
      const { isReady } = fetcher.data as IControlPlaneStatus

      setStatus(fetcher.data)
      if (
        (isReady === ControlPlaneStatus.Success ||
          isReady === ControlPlaneStatus.Error) &&
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
        fetcher.data?.isReady === ControlPlaneStatus.Success ? 'Active' : undefined
      }
    />
  ) : (
    <></>
  )
}
