import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateFormat } from '@/components/date-format/date-format';
import { MoreActions } from '@/components/more-actions/more-actions';
import { PageTitle } from '@/components/page-title/page-title';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EditSecretKeys } from '@/features/secret/form/edit/edit-keys';
import { SecretGeneralCard } from '@/features/secret/form/overview/general-card';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import { ROUTE_PATH as SECRET_ACTIONS_ROUTE_PATH } from '@/routes/api/secrets';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { ClockIcon, TrashIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useFetcher, useParams, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Edit</span>,
};

export default function EditSecret() {
  const secret = useRouteLoaderData('secret-detail');
  const { projectId } = useParams();

  const fetcher = useFetcher();
  const { confirm } = useConfirmationDialog();

  const deleteSecret = async () => {
    await confirm({
      title: 'Delete Secret',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{secret.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        await fetcher.submit(
          {
            secretId: secret.name ?? '',
            projectId: projectId ?? '',
            redirectUri: getPathWithParams(paths.project.detail.config.secrets.root, {
              projectId,
            }),
          },
          {
            action: SECRET_ACTIONS_ROUTE_PATH,
            method: 'DELETE',
          }
        );
      },
    });
  };

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
          title={(secret as ISecretControlResponse)?.name ?? 'Secret'}
          description={
            <div className="flex items-center gap-1">
              <ClockIcon className="text-muted-foreground h-4 w-4" />
              <DateFormat
                className="text-muted-foreground text-sm"
                date={(secret as ISecretControlResponse)?.createdAt ?? ''}
              />
              <span className="text-muted-foreground text-sm">
                (
                {formatDistanceToNow(
                  new Date((secret as ISecretControlResponse)?.createdAt ?? ''),
                  {
                    addSuffix: true,
                  }
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
                    icon: <TrashIcon />,
                    action: deleteSecret,
                  },
                ]}
              />
            </motion.div>
          }
        />
      </motion.div>
      <Tabs defaultValue="overview" className="w-full gap-6">
        <div className="mx-auto w-full max-w-6xl">
          <TabsList className="grid w-[250px] grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="keys">Key-value pairs</TabsTrigger>
          </TabsList>
        </div>
        <div className="mx-auto w-full max-w-6xl">
          <TabsContent value="overview">
            <div className="w-full max-w-1/2">
              <SecretGeneralCard secret={secret} />
            </div>
          </TabsContent>
          <TabsContent value="keys" className="max-h-screen min-h-[700px]">
            <EditSecretKeys projectId={projectId ?? ''} defaultValue={secret} />
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  );
}
