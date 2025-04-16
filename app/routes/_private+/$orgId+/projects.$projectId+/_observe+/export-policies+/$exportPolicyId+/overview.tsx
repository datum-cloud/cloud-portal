import { DateFormat } from '@/components/date-format/date-format'
import { MoreActions } from '@/components/more-actions/more-actions'
import { PageTitle } from '@/components/page-title/page-title'
import { ExportPolicyGeneralCard } from '@/features/observe/export-policies/general-card'
import { WorkloadSinksTable } from '@/features/observe/export-policies/sinks-table'
import { WorkloadSourcesTable } from '@/features/observe/export-policies/sources-table'
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { createExportPoliciesControl } from '@/resources/control-plane/export-policies.control'
import { IExportPolicyControlResponse } from '@/resources/interfaces/policy.interface'
import { ROUTE_PATH as EXPORT_POLICIES_ACTIONS_ROUTE_PATH } from '@/routes/api+/observe+/actions'
import { CustomError } from '@/utils/errorHandle'
import { mergeMeta, metaObject } from '@/utils/meta'
import { Client } from '@hey-api/client-axios'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import { motion } from 'framer-motion'
import { ClockIcon } from 'lucide-react'
import {
  AppLoadContext,
  LoaderFunctionArgs,
  MetaFunction,
  data,
  useLoaderData,
  useParams,
  useSubmit,
} from 'react-router'

export const meta: MetaFunction<typeof loader> = mergeMeta(({ data }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { exportPolicy } = data as any
  return metaObject(
    `${(exportPolicy as IExportPolicyControlResponse)?.name || 'Export Policy'} Overview`,
  )
})

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, exportPolicyId } = params

  const { controlPlaneClient } = context as AppLoadContext

  const exportPoliciesControl = createExportPoliciesControl(controlPlaneClient as Client)

  if (!projectId || !exportPolicyId) {
    throw new CustomError('Project ID and export policy ID are required', 400)
  }

  const exportPolicy = await exportPoliciesControl.detail(projectId, exportPolicyId)

  if (!exportPolicy) {
    throw new CustomError('Export policy not found', 404)
  }

  return data(exportPolicy)
}

export default function ExportPolicyOverview() {
  const exportPolicy = useLoaderData<typeof loader>()

  const submit = useSubmit()
  const { confirm } = useConfirmationDialog()
  const { orgId, projectId } = useParams()

  // revalidate every 10 seconds to keep deployment list fresh
  useRevalidateOnInterval({ enabled: true, interval: 10000 })

  const deleteExportPolicy = async () => {
    await confirm({
      title: 'Delete Export Policy',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{exportPolicy?.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${exportPolicy?.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the export policy name to confirm deletion',
      confirmValue: exportPolicy?.name ?? 'delete',
      onSubmit: async () => {
        await submit(
          {
            exportPolicyId: exportPolicy?.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            action: EXPORT_POLICIES_ACTIONS_ROUTE_PATH,
            method: 'DELETE',
            fetcherKey: 'export-policy-resources',
            navigate: false,
          },
        )
      },
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex w-full flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PageTitle
          title={(exportPolicy as IExportPolicyControlResponse)?.name ?? 'Export Policy'}
          description={
            <div className="flex items-center gap-1">
              <ClockIcon className="text-muted-foreground h-4 w-4" />
              <DateFormat
                className="text-muted-foreground text-sm"
                date={(exportPolicy as IExportPolicyControlResponse)?.createdAt ?? ''}
              />
              <span className="text-muted-foreground text-sm">
                (
                {formatDistanceToNow(
                  new Date(
                    (exportPolicy as IExportPolicyControlResponse)?.createdAt ?? '',
                  ),
                  {
                    addSuffix: true,
                  },
                )}
                )
              </span>
            </div>
          }
          actions={
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="flex items-center gap-2">
              <MoreActions
                className="border-input bg-background hover:bg-accent hover:text-accent-foreground size-9 rounded-md border px-3"
                actions={[
                  {
                    key: 'delete',
                    label: 'Delete',
                    variant: 'destructive',
                    action: deleteExportPolicy,
                  },
                ]}
              />
            </motion.div>
          }
        />
      </motion.div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="w-1/2">
          <ExportPolicyGeneralCard exportPolicy={exportPolicy} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}>
          <WorkloadSourcesTable data={exportPolicy.sources ?? []} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}>
          <WorkloadSinksTable
            data={exportPolicy.sinks ?? []}
            status={exportPolicy.status ?? {}}
          />
        </motion.div>
      </div>
    </motion.div>
  )
}
