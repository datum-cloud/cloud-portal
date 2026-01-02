import { SinksForm } from './sink/sinks-form';
import { SourcesForm } from './source/sources-form';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { MetadataForm } from '@/components/metadata/metadata-form';
import { MetadataSchema } from '@/resources/base';
import {
  ExportPolicyAuthenticationType,
  ExportPolicySinkTypeEnum,
  ExportPolicySourceTypeEnum,
  IExportPolicyControlResponse,
  useUpdateExportPolicy,
  useDeleteExportPolicy,
  type UpdateExportPolicyInput,
} from '@/resources/export-policies';
import {
  ExportPolicySinkFieldSchema,
  ExportPolicySourceFieldSchema,
  NewExportPolicySchema,
  UpdateExportPolicySchema,
  updateExportPolicySchema,
} from '@/resources/export-policies';
import { paths } from '@/utils/config/paths.config';
import { convertObjectToLabels } from '@/utils/helpers/object.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useForm, FormProvider, getFormProps } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button, toast } from '@datum-ui/components';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardFooter,
  CardTitle,
} from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { has } from 'es-toolkit/compat';
import { FileIcon, Layers, Terminal } from 'lucide-react';
import { Fragment, cloneElement, useMemo } from 'react';
import { useNavigate, Form } from 'react-router';

const sections = [
  {
    id: 'metadata',
    label: 'Metadata',
    description: 'Define essential information and labels for your export policy resource.',
    icon: () => <Icon icon={Layers} />,
  },
  {
    id: 'sources',
    label: 'Sources',
    description:
      'Configure source settings for your Kubernetes export policy in source management.',
    icon: () => <Icon icon={FileIcon} />,
  },
  {
    id: 'sinks',
    label: 'Sinks',
    description: 'Configure sink settings for your Kubernetes export policy in sink management.',
    icon: () => <Icon icon={Terminal} />,
  },
];

export const ExportPolicyUpdateForm = ({
  projectId,
  defaultValue,
}: {
  projectId?: string;
  defaultValue?: IExportPolicyControlResponse;
}) => {
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  const updateMutation = useUpdateExportPolicy(projectId ?? '', defaultValue?.name ?? '', {
    onSuccess: () => {
      toast.success('Export policy updated successfully', {
        description: 'You have successfully updated an export policy.',
      });
      navigate(
        getPathWithParams(paths.project.detail.metrics.exportPolicies.root, {
          projectId,
        })
      );
    },
    onError: (error) => {
      toast.error('Error', {
        description: error.message || 'Failed to update export policy',
      });
    },
  });

  const deleteMutation = useDeleteExportPolicy(projectId ?? '', {
    onSuccess: () => {
      toast.success('Export policy deleted successfully', {
        description: 'You have successfully deleted an export policy.',
      });
      navigate(
        getPathWithParams(paths.project.detail.metrics.exportPolicies.root, {
          projectId,
        })
      );
    },
    onError: (error) => {
      toast.error('Error', {
        description: error.message || 'Failed to delete export policy',
      });
    },
  });

  const isPending = updateMutation.isPending || deleteMutation.isPending;

  const [form, fields] = useForm({
    id: 'export-policy-form',
    constraint: getZodConstraint(updateExportPolicySchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: updateExportPolicySchema });
    },
    onSubmit(event, { submission }) {
      event.preventDefault();
      event.stopPropagation();

      const data: any = submission?.status === 'success' ? submission.value : {};

      const updateInput: UpdateExportPolicyInput = {
        metadata: {
          name: data?.name,
          labels: data?.labels,
          annotations: data?.annotations,
        },
        sources: data?.sources ?? [],
        sinks: data?.sinks ?? [],
        resourceVersion: data?.resourceVersion,
      };

      updateMutation.mutate(updateInput);
    },
  });

  const formattedValues: NewExportPolicySchema | undefined = useMemo(() => {
    if (defaultValue) {
      const metadata = {
        name: defaultValue?.name ?? '',
        labels: convertObjectToLabels(defaultValue?.labels ?? {}),
        annotations: convertObjectToLabels(defaultValue?.annotations ?? {}),
      };

      const sources: ExportPolicySourceFieldSchema[] = (defaultValue?.sources ?? []).map(
        (source) => ({
          name: source.name ?? '',
          type: has(source, 'metrics')
            ? ExportPolicySourceTypeEnum.METRICS
            : ExportPolicySourceTypeEnum.METRICS, // the else value will be used default value
          metricQuery: source.metrics?.metricsql ?? '{}',
        })
      );

      const sinks: ExportPolicySinkFieldSchema[] = (defaultValue?.sinks ?? []).map((sink) => {
        let prometheusRemoteWrite = undefined;
        if (has(sink.target, 'prometheusRemoteWrite')) {
          const {
            authentication: promAuth,
            endpoint = '',
            batch,
            retry,
          } = sink?.target.prometheusRemoteWrite ?? {};

          let authentication = undefined;
          if (has(promAuth, 'basicAuth')) {
            authentication = {
              authType: ExportPolicyAuthenticationType.BASIC_AUTH,
              secretName: (promAuth as any)?.basicAuth?.secretRef?.name ?? '',
            };
          }

          prometheusRemoteWrite = {
            authentication,
            endpoint,
            batch: {
              maxSize: batch?.maxSize ?? 100,
              timeout: Number((batch?.timeout ?? '').replace('s', '')),
            },
            retry: {
              backoffDuration: Number((retry?.backoffDuration ?? '').replace('s', '')),
              maxAttempts: Number(retry?.maxAttempts),
            },
          };
        }

        return {
          name: sink.name ?? '',
          type: has(sink, 'prometheusRemoteWrite')
            ? ExportPolicySinkTypeEnum.PROMETHEUS
            : ExportPolicySinkTypeEnum.PROMETHEUS,
          sources: sink.sources ?? [],
          prometheusRemoteWrite,
        };
      });

      return { metadata, sources, sinks };
    }
    return undefined;
  }, [defaultValue]);

  const deleteExportPolicy = async () => {
    await confirm({
      title: 'Delete Export Policy',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{defaultValue?.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${defaultValue?.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the export policy name to confirm deletion',
      confirmValue: defaultValue?.name ?? 'delete',
      onSubmit: async () => {
        deleteMutation.mutate(defaultValue?.name ?? '');
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update workload</CardTitle>
        <CardDescription>Update the workload with the new values below.</CardDescription>
      </CardHeader>
      <FormProvider context={form.context}>
        <Form
          {...getFormProps(form)}
          id={form.id}
          autoComplete="off"
          className="flex flex-col gap-6">
          <input type="hidden" name="resourceVersion" value={defaultValue?.resourceVersion} />

          <CardContent>
            <nav aria-label="Export Policy Steps" className="group">
              <ol className="relative ml-4 border-s border-gray-200 dark:border-gray-700 dark:text-gray-400">
                {sections.map((section) => (
                  <Fragment key={section.id}>
                    <li className="ms-7">
                      <span className="absolute -start-4 flex size-8 items-center justify-center rounded-full bg-gray-100 ring-4 ring-white dark:bg-gray-700 dark:ring-gray-900">
                        {cloneElement(section.icon(), {
                          className: 'size-3.5 text-gray-600 dark:text-gray-500',
                        })}
                      </span>
                      <div className="flex flex-col gap-1 pt-1.5">
                        <p className="text-base leading-tight font-medium">{section.label}</p>
                        <p className="text-muted-foreground text-sm">{section.description}</p>
                      </div>
                    </li>
                    <div className="flex-1 py-6 pl-7">
                      {section.id === 'metadata' && (
                        <MetadataForm
                          isEdit
                          defaultValue={formattedValues?.metadata}
                          fields={
                            fields as unknown as ReturnType<typeof useForm<MetadataSchema>>[1]
                          }
                        />
                      )}

                      {section.id === 'sources' && (
                        <SourcesForm
                          isEdit
                          fields={
                            fields as unknown as ReturnType<
                              typeof useForm<UpdateExportPolicySchema>
                            >[1]
                          }
                          defaultValue={{ sources: formattedValues?.sources ?? [] }}
                        />
                      )}

                      {section.id === 'sinks' && (
                        <SinksForm
                          isEdit
                          projectId={projectId}
                          fields={
                            fields as unknown as ReturnType<
                              typeof useForm<UpdateExportPolicySchema>
                            >[1]
                          }
                          defaultValue={{ sinks: formattedValues?.sinks ?? [] }}
                        />
                      )}
                    </div>
                  </Fragment>
                ))}
              </ol>
            </nav>
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            <Button
              type="danger"
              theme="solid"
              onClick={() => deleteExportPolicy()}
              disabled={isPending}>
              Delete
            </Button>
            <div className="flex gap-2">
              <Button
                type="quaternary"
                theme="borderless"
                disabled={isPending}
                onClick={() => {
                  navigate(
                    getPathWithParams(paths.project.detail.metrics.exportPolicies.root, {
                      projectId,
                    })
                  );
                }}>
                Return to List
              </Button>
              <Button htmlType="submit" disabled={isPending} loading={isPending}>
                {isPending ? `Saving` : `Save`}
              </Button>
            </div>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
