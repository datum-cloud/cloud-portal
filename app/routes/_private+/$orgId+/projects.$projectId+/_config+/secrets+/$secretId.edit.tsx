import { DateFormat } from '@/components/date-format/date-format';
import { MoreActions } from '@/components/more-actions/more-actions';
import { PageTitle } from '@/components/page-title/page-title';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { routes } from '@/constants/routes';
import { EditSecretKeys } from '@/features/secret/form/edit/edit-keys';
import { EditSecretMetadata } from '@/features/secret/form/edit/edit-metadata';
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider';
import { createSecretsControl } from '@/resources/control-plane/secrets.control';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import { ROUTE_PATH as SECRET_ACTIONS_ROUTE_PATH } from '@/routes/api+/config+/secrets+/actions';
import { CustomError } from '@/utils/errorHandle';
import { mergeMeta, metaObject } from '@/utils/meta';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { ArrowLeft, ClockIcon } from 'lucide-react';
import { motion } from 'motion/react';
import {
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  useLoaderData,
  useParams,
  useSubmit,
} from 'react-router';

export const handle = {
  breadcrumb: (data: ISecretControlResponse) => <span>{data.name}</span>,
};

export const meta: MetaFunction = mergeMeta(({ data }) => {
  return metaObject(`Edit ${(data as ISecretControlResponse)?.name}`);
});

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { projectId, secretId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const secretControl = createSecretsControl(controlPlaneClient as Client);

  if (!projectId || !secretId) {
    throw new CustomError('Project ID and secret ID are required', 400);
  }

  const secret = await secretControl.detail(projectId, secretId);

  return secret;
};

export default function EditSecret() {
  const secret = useLoaderData<typeof loader>();
  const { orgId, projectId, secretId } = useParams();

  const submit = useSubmit();
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
        await submit(
          {
            secretId: secret.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            action: SECRET_ACTIONS_ROUTE_PATH,
            method: 'DELETE',
            fetcherKey: 'secret-resources',
            navigate: false,
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
              <Button variant="outline" size="sm">
                <Link
                  className="flex items-center gap-2"
                  to={getPathWithParams(routes.projects.config.secrets.root, {
                    orgId,
                    projectId,
                    secretId,
                  })}>
                  <ArrowLeft className="size-4" />
                  Return to List
                </Link>
              </Button>
              <MoreActions
                className="border-input bg-background hover:bg-accent hover:text-accent-foreground size-9 rounded-md border px-3"
                actions={[
                  {
                    key: 'delete',
                    label: 'Delete',
                    variant: 'destructive',
                    action: deleteSecret,
                  },
                ]}
              />
            </motion.div>
          }
        />
      </motion.div>
      <Tabs defaultValue="metadata" className="w-full gap-6">
        <div className="mx-auto w-full max-w-6xl">
          <TabsList className="grid w-[250px] grid-cols-2">
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="keys">Key-value pairs</TabsTrigger>
          </TabsList>
        </div>
        <div className="mx-auto w-full max-w-6xl">
          <TabsContent value="metadata">
            <div className="w-full max-w-3xl">
              <EditSecretMetadata projectId={projectId ?? ''} defaultValue={secret} />
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
