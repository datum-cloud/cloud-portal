import { SinksForm } from './sink/sinks-form';
import { SinksPreview } from './sink/sinks-preview';
import { SourcesForm } from './source/sources-form';
import { SourcesPreview } from './source/sources-preview';
import { MetadataForm } from '@/components/metadata/metadata-form';
import { MetadataPreview } from '@/components/metadata/metadata-preview';
import { useIsPending } from '@/hooks/useIsPending';
import { MetadataSchema, metadataSchema } from '@/resources/base';
import {
  ExportPolicySinkTypeEnum,
  ExportPolicySourceTypeEnum,
  IExportPolicyControlResponse,
} from '@/resources/export-policies';
import {
  exportPolicySourcesSchema,
  exportPolicySinksSchema,
  NewExportPolicySchema,
  ExportPolicySourcesSchema,
  ExportPolicySinksSchema,
  ExportPolicySourceFieldSchema,
  UpdateExportPolicySchema,
} from '@/resources/export-policies';
import { FormProvider, getFormProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button } from '@datum-ui/components';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { LoaderOverlay } from '@datum-ui/components/loader-overlay';
import { cn } from '@shadcn/lib/utils';
import { defineStepper } from '@stepperize/react';
import { FileIcon, Layers, Terminal } from 'lucide-react';
import React, { useMemo } from 'react';
import { Form, useNavigate, useSubmit } from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

const { useStepper, steps } = defineStepper(
  {
    id: 'metadata',
    label: 'Metadata',
    description: 'Define essential information and labels for your export policy resource.',
    icon: () => <Icon icon={Layers} />,
    schema: metadataSchema,
    preview: (values?: any) => <MetadataPreview values={values?.metadata as MetadataSchema} />,
  },
  {
    id: 'sources',
    label: 'Sources',
    description:
      'Configure source settings for your Kubernetes export policy in source management.',
    icon: () => <Icon icon={FileIcon} />,
    schema: exportPolicySourcesSchema,
    preview: (values?: any) => (
      <SourcesPreview values={values?.sources as ExportPolicySourcesSchema} />
    ),
  },
  {
    id: 'sinks',
    label: 'Sinks',
    description: 'Configure sink settings for your Kubernetes export policy in sink management.',
    icon: () => <Icon icon={Terminal} />,
    schema: exportPolicySinksSchema,
    preview: (values?: any) => <SinksPreview values={values?.sinks as ExportPolicySinksSchema} />,
  }
);

export const ExportPolicyStepperForm = ({
  projectId,
  defaultValue,
}: {
  projectId?: string;
  defaultValue?: IExportPolicyControlResponse;
}) => {
  const submit = useSubmit();
  const navigate = useNavigate();
  const isPending = useIsPending();
  const csrf = useAuthenticityToken();

  const initialValues = {
    sources: [
      {
        name: undefined,
        type: ExportPolicySourceTypeEnum.METRICS,
        metricQuery: '{}',
      },
    ],
    sinks: [
      {
        name: undefined,
        type: ExportPolicySinkTypeEnum.PROMETHEUS,
        authentication: {
          authType: undefined,
          secretName: undefined,
        },
      },
    ],
  };

  const stepper = useStepper({ initialMetadata: initialValues });

  const [form, fields] = useForm({
    id: 'export-policy-form',
    constraint: getZodConstraint(stepper.state.current.data.schema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onBlur',
    defaultValue: initialValues,
    onValidate({ formData }) {
      const parsed = parseWithZod(formData, { schema: stepper.state.current.data.schema });
      if (parsed.status === 'success') {
        stepper.metadata.set(stepper.state.current.data.id, parsed.value ?? {});
      }
      return parsed;
    },
    onSubmit(event, { submission }) {
      event.preventDefault();
      event.stopPropagation();
      const data = submission?.status === 'success' ? submission.value : {};

      if (stepper.state.isLast) {
        // Collect all metadata from all steps
        const allMetadata: any = stepper.state.all.reduce((acc, step) => {
          const stepMetadata = stepper.metadata.get(step.id);
          return { ...acc, ...(stepMetadata || {}) };
        }, {});

        const formatted: NewExportPolicySchema = {
          metadata: {
            name: allMetadata.name,
            labels: allMetadata.labels,
            annotations: allMetadata.annotations,
          },
          sources: allMetadata.sources,
          sinks: allMetadata.sinks,
          ...data,
        };

        // When we reach the last step, submit the complete form data to the server
        // using the Remix form submission mechanism with FormData

        // Since we've already called preventDefault() at the top of the handler,
        // we need to manually trigger the form submission to Remix
        const formElement = event.currentTarget as HTMLFormElement;

        const payload = {
          ...formatted,
          csrf: csrf as string,
        };

        if (isEdit) {
          Object.assign(payload, {
            resourceVersion: defaultValue?.resourceVersion,
          });
        }

        // Submit the form using the Remix submit function
        // This will trigger the action defined in the route
        submit(payload, {
          method: 'POST',
          action: formElement.getAttribute('action') || undefined,
          encType: 'application/json',
          replace: true,
        });
      } else {
        stepper.navigation.next();
      }
    },
  });

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined;
  }, [defaultValue]);

  const handleBack = () => {
    if (stepper.state.isFirst) {
      navigate(-1);
    } else {
      stepper.navigation.prev();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Update' : 'Create a new'} export policy</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the export policy with the new values below.'
            : 'Create a new export policy to get started with Datum Cloud.'}
        </CardDescription>
      </CardHeader>
      <FormProvider context={form.context}>
        <Form
          {...getFormProps(form)}
          id={form.id}
          method="POST"
          autoComplete="off"
          className="flex flex-col gap-6">
          <CardContent className="relative">
            {isPending && (
              <LoaderOverlay message={`${isEdit ? 'Saving' : 'Creating'} export policy...`} />
            )}
            <nav aria-label="Export Policy Steps" className="group">
              <ol className="relative ml-4 border-s border-gray-200 dark:border-gray-700 dark:text-gray-400">
                {steps.map((step, index, array) => (
                  <React.Fragment key={step.id}>
                    <li
                      className={cn(
                        'ms-7',
                        index < array.length - 1 && stepper.state.current.data.id !== step.id
                          ? 'mb-4'
                          : ''
                      )}>
                      <span className="absolute -start-4 flex size-8 items-center justify-center rounded-full bg-gray-100 ring-4 ring-white dark:bg-gray-700 dark:ring-gray-900">
                        {React.cloneElement(step.icon(), {
                          className: 'size-3.5 text-gray-600 dark:text-gray-500',
                        })}
                      </span>
                      <div className="flex flex-col gap-1 pt-1.5">
                        <p className="text-base leading-tight font-medium">{step.label}</p>
                        <p className="text-muted-foreground text-sm">{step.description}</p>
                      </div>
                    </li>
                    {stepper.state.current.data.id === step.id && !isPending ? (
                      <div className="flex-1 py-6 pl-7">
                        {stepper.flow.switch({
                          metadata: () => (
                            <MetadataForm
                              isEdit={isEdit}
                              defaultValue={stepper.metadata.get('metadata') as MetadataSchema}
                              fields={
                                fields as unknown as ReturnType<typeof useForm<MetadataSchema>>[1]
                              }
                            />
                          ),
                          sources: () => (
                            <SourcesForm
                              isEdit={isEdit}
                              fields={
                                fields as unknown as ReturnType<
                                  typeof useForm<UpdateExportPolicySchema>
                                >[1]
                              }
                              defaultValue={
                                stepper.metadata.get('sources') as ExportPolicySourcesSchema
                              }
                            />
                          ),
                          sinks: () => (
                            <SinksForm
                              projectId={projectId}
                              isEdit={isEdit}
                              fields={
                                fields as unknown as ReturnType<
                                  typeof useForm<UpdateExportPolicySchema>
                                >[1]
                              }
                              defaultValue={
                                stepper.metadata.get('sinks') as ExportPolicySinksSchema
                              }
                              sourceList={
                                stepper.metadata.get('sources')
                                  ?.sources as ExportPolicySourceFieldSchema[]
                              }
                            />
                          ),
                        })}

                        <div className="mt-4 flex items-center justify-end gap-2 border-t pt-4">
                          <div className="flex items-center gap-2">
                            <Button type="quaternary" theme="borderless" onClick={handleBack}>
                              {stepper.state.isFirst ? 'Return to List' : 'Back'}
                            </Button>
                            <Button htmlType="submit" disabled={isPending} loading={isPending}>
                              {stepper.state.isLast ? (isEdit ? 'Save' : 'Create') : 'Next'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 px-7 pb-6">{step.preview(stepper.metadata)}</div>
                    )}
                  </React.Fragment>
                ))}
              </ol>
            </nav>
          </CardContent>
        </Form>
      </FormProvider>
    </Card>
  );
};
