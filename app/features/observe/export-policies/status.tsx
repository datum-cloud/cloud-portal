import { StatusBadge } from '@/components/status-badge/status-badge'
import {
  ControlPlaneStatus,
  IControlPlaneStatus,
} from '@/resources/interfaces/control-plane.interface'
import { ROUTE_PATH as EXPORT_POLICY_STATUS_ROUTE_PATH } from '@/routes/api+/observe+/status'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFetcher } from 'react-router'

export const ExportPolicyStatus = ({
  currentStatus,
  projectId,
  id,
  type = 'dot',
  showTooltip = true,
  badgeClassName,
}: {
  currentStatus?: IControlPlaneStatus
  projectId?: string
  id?: string
  type?: 'dot' | 'badge'
  showTooltip?: boolean
  badgeClassName?: string
}) => {
  const fetcher = useFetcher({ key: `export-policy-status-${projectId}` })
  const intervalRef = useRef<NodeJS.Timeout>(null)
  const [status, setStatus] = useState<IControlPlaneStatus>(
    currentStatus ?? {
      status: ControlPlaneStatus.Pending,
      message: '',
    },
  )

  const loadStatus = (exportPolicyId: string) => {
    if (projectId && exportPolicyId) {
      fetcher.load(
        `${EXPORT_POLICY_STATUS_ROUTE_PATH}?projectId=${projectId}&id=${exportPolicyId}`,
      )
    }
  }

  const sinkMessages = useMemo(() => {
    if (status?.sinks) {
      return status.sinks
        .filter(
          (sink: { conditions?: Array<{ status: string }> }) =>
            sink.conditions?.[0]?.status === 'False',
        )
        .map(
          (sink: { conditions?: Array<{ message: string }> }) =>
            sink.conditions?.[0]?.message,
        )
    }
    return []
  }, [status])

  useEffect(() => {
    if (currentStatus) {
      setStatus(currentStatus)

      if (
        currentStatus?.status === ControlPlaneStatus.Success ||
        currentStatus?.status === ControlPlaneStatus.Error
      ) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [currentStatus])

  useEffect(() => {
    // Only set up polling if we have the required IDs
    if (!projectId || !id) {
      return
    }

    // Initial load if:
    // 1. No current status exists, or
    // 2. Current status is pending
    if (currentStatus?.status === ControlPlaneStatus.Pending) {
      loadStatus(id)

      // Set up polling interval
      intervalRef.current = setInterval(() => loadStatus(id), 10000)
    }

    // Clean up interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [id, projectId])

  useEffect(() => {
    if (fetcher.data) {
      const { status } = fetcher.data as IControlPlaneStatus
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
        fetcher.data?.status === ControlPlaneStatus.Success ? (
          'Active'
        ) : (
          <>
            {fetcher.data?.message && <p>{status.message}</p>}
            {sinkMessages.length > 0 && (
              <ul className="mt-1 list-disc pl-4 text-left">
                {sinkMessages.map((message: string, index: number) => (
                  <li key={index} className="capitalize">
                    {message}
                  </li>
                ))}
              </ul>
            )}
          </>
        )
      }
    />
  ) : (
    <></>
  )
}
