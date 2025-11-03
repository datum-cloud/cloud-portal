import { NetworksForm } from './network/networks-form';
import { PlacementsForm } from './placement/placements-form';
import { RuntimeForm } from './runtime/runtime-form';
import { StoragesForm } from './storage/storages-form';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { MetadataForm } from '@/components/metadata/metadata-form';
import { BOOT_IMAGES } from '@/features/workload/constants';
import { WorkloadHelper } from '@/features/workload/helper';
import { useIsPending } from '@/hooks/useIsPending';
import { useApp } from '@/providers/app.provider';
import { IWorkloadControlResponse } from '@/resources/interfaces/workload.interface';
import { MetadataSchema } from '@/resources/schemas/metadata.schema';
import {
  updateWorkloadSchema,
  NewWorkloadSchema,
  PlacementsSchema,
  RuntimeSchema,
  UpdateWorkloadSchema,
} from '@/resources/schemas/workload.schema';
import { ROUTE_PATH as WORKLOADS_ACTIONS_ROUTE_PATH } from '@/routes/api/workloads';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { FormProvider, getFormProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button } from '@datum-ui/components';
import {
  CardDescription,
  CardHeader,
  CardTitle,
  Card,
  CardContent,
  CardFooter,
} from '@shadcn/ui/card';
import { Cpu, HardDrive, Layers, Network, Server } from 'lucide-react';
import { Fragment, cloneElement, useEffect, useState } from 'react';
import { Form, useNavigate, useSubmit } from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

const sections = [
  {
    id: 'metadata',
    label: 'Metadata',
    description: 'Define essential information and labels for your workload resource.',
    icon: () => <Layers />,
  },
  {
    id: 'runtime',
    label: 'Runtime',
    description: 'Configure instance type and choose between Container or VM runtime environments.',
    icon: () => <Cpu />,
  },
  {
    id: 'networks',
    label: 'Network Interfaces',
    description:
      'Configure network interfaces for your workload instances, including network selection and IP family options.',
    icon: () => <Network />,
  },
  {
    id: 'storages',
    label: 'Storages',
    description: 'Add storage volumes with names and sizes.',
    icon: () => <HardDrive />,
  },
  {
    id: 'placements',
    label: 'Placements',
    description: 'Choose where to deploy your workload and set up scaling options.',
    icon: () => <Server />,
  },
];

export const WorkloadUpdateForm = ({
  projectId,
  defaultValue,
}: {
  projectId?: string;
  defaultValue?: IWorkloadControlResponse;
}) => {
  const { orgId } = useApp();
  const csrf = useAuthenticityToken();
  const submit = useSubmit();
  const navigate = useNavigate();
  const isPending = useIsPending();
  const { confirm } = useConfirmationDialog();

  const [formattedValues, setFormattedValues] = useState<NewWorkloadSchema>();

  const initialValues = {
    runtime: {
      instanceType: 'datumcloud/d1-standard-2',
      virtualMachine: {
        bootImage: BOOT_IMAGES[0],
        sshKey: undefined,
      },
    },
    networks: [],
    storages: [],
    placements: [{ name: undefined, cityCode: undefined, minimumReplicas: 1 }],
  };

  const [form, fields] = useForm({
    id: 'workload-form',
    constraint: getZodConstraint(updateWorkloadSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    defaultValue: initialValues,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: updateWorkloadSchema });
    },
    onSubmit(event, { submission }) {
      event.preventDefault();

      const data: any = submission?.status === 'success' ? submission.value : {};

      // Get the form element
      const formElement = event.currentTarget as HTMLFormElement;

      const payload: NewWorkloadSchema = {
        metadata: {
          name: data?.name,
          labels: data?.labels,
          annotations: data?.annotations,
        },
        runtime: {
          instanceType: data?.instanceType,
          runtimeType: data?.runtimeType,
          virtualMachine: data?.virtualMachine,
          containers: data?.containers,
        },
        networks: data?.networks,
        storages: data?.storages,
        placements: data?.placements,
      };

      // Submit the form using the Remix submit function
      // This will trigger the action defined in the route
      submit(
        { ...payload, csrf: csrf as string, resourceVersion: data?.resourceVersion },
        {
          method: 'POST',
          action: formElement.getAttribute('action') || undefined,
          encType: 'application/json',
          replace: true,
        }
      );
    },
  });

  const deleteWorkload = async () => {
    await confirm({
      title: 'Delete Workload',
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
      confirmInputPlaceholder: 'Type the workload name to confirm deletion',
      confirmValue: defaultValue?.name ?? 'delete',
      onSubmit: async () => {
        await submit(
          {
            workloadId: defaultValue?.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            action: WORKLOADS_ACTIONS_ROUTE_PATH,
            method: 'DELETE',
            fetcherKey: 'workload-resources',
            navigate: false,
          }
        );
      },
    });
  };

  useEffect(() => {
    // Process default values when they exist to populate the form
    if (defaultValue) {
      const { metadata, runtime, ...rest } = WorkloadHelper.mappingSpecToForm(defaultValue);

      form.update({
        ...metadata,
        ...runtime,
        ...rest,
      });

      // Update form with the mapped values
      setFormattedValues({
        metadata,
        runtime,
        ...rest,
      });
    }
  }, [defaultValue]);

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
          method="POST"
          autoComplete="off"
          className="flex flex-col gap-6">
          <input type="hidden" name="resourceVersion" value={defaultValue?.resourceVersion} />

          <CardContent>
            <nav aria-label="Workload Steps" className="group">
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

                      {section.id === 'runtime' && (
                        <RuntimeForm
                          isEdit
                          projectId={projectId}
                          defaultValue={formattedValues?.runtime}
                          fields={fields as unknown as ReturnType<typeof useForm<RuntimeSchema>>[1]}
                        />
                      )}

                      {section.id === 'networks' && (
                        <NetworksForm
                          projectId={projectId}
                          defaultValue={{ networks: formattedValues?.networks ?? [] }}
                          fields={
                            fields as unknown as ReturnType<typeof useForm<UpdateWorkloadSchema>>[1]
                          }
                        />
                      )}

                      {section.id === 'storages' && (
                        <StoragesForm
                          isEdit
                          defaultValue={{ storages: formattedValues?.storages ?? [] }}
                          fields={
                            fields as unknown as ReturnType<typeof useForm<UpdateWorkloadSchema>>[1]
                          }
                        />
                      )}

                      {section.id === 'placements' && (
                        <PlacementsForm
                          isEdit
                          projectId={projectId}
                          fields={fields as ReturnType<typeof useForm<PlacementsSchema>>[1]}
                          defaultValue={{
                            placements: formattedValues?.placements ?? [],
                          }}
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
              type="button"
              variant="destructive"
              onClick={deleteWorkload}
              disabled={isPending}>
              Delete
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="link"
                disabled={isPending}
                onClick={() => {
                  navigate(
                    getPathWithParams(paths.projects.deploy.workloads.root, {
                      projectId,
                      orgId,
                    })
                  );
                }}>
                Return to List
              </Button>
              <Button variant="default" type="submit" disabled={isPending} isLoading={isPending}>
                {isPending ? `Saving` : `Save`}
              </Button>
            </div>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
