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
} from '@/resources/export-policies';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { FormStepper, FormStep } from '@datum-cloud/datum-ui/form/stepper';
import type { StepConfig } from '@datum-cloud/datum-ui/form/stepper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { LoaderOverlay } from '@datum-cloud/datum-ui/loader-overlay';
import { cn } from '@datum-cloud/datum-ui/utils';
import { FileIcon, Layers, Terminal } from 'lucide-react';
import React, { useMemo } from 'react';
import { Form as RouterForm, useNavigate, useSubmit } from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

// Step configurations with custom UI metadata
const stepConfigs: (StepConfig & {
  icon: () => React.ReactElement;
  preview: (values?: any) => React.ReactElement;
})[] = [
  {
    id: 'metadata',
    label: 'Metadata',
    description: 'Define essential information and labels for your export policy resource.',
    schema: metadataSchema,
    icon: () => <Icon icon={Layers} />,
    preview: (values?: any) => <MetadataPreview values={values?.metadata as MetadataSchema} />,
  },
  {
    id: 'sources',
    label: 'Sources',
    description:
      'Configure source settings for your Kubernetes export policy in source management.',
    schema: exportPolicySourcesSchema,
    preview: (values?: any) => (
      <SourcesPreview values={values?.sources as ExportPolicySourcesSchema} />
    ),
    icon: () => <Icon icon={FileIcon} />,
  },
  {
    id: 'sinks',
    label: 'Sinks',
    description: 'Configure sink settings for your Kubernetes export policy in sink management.',
    schema: exportPolicySinksSchema,
    preview: (values?: any) => <SinksPreview values={values?.sinks as ExportPolicySinksSchema} />,
    icon: () => <Icon icon={Terminal} />,
  },
];

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

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined;
  }, [defaultValue]);

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
      },
    ],
  };

  const handleComplete = async (data: Record<string, unknown>) => {
    // Restructure flat merged data -> NewExportPolicySchema
    const formatted: NewExportPolicySchema = {
      metadata: {
        name: data.name as string,
        labels: data.labels as string[],
        annotations: data.annotations as string[],
      },
      sources: data.sources as NewExportPolicySchema['sources'],
      sinks: data.sinks as NewExportPolicySchema['sinks'],
    };

    const payload: NewExportPolicySchema & { csrf: string; resourceVersion?: string } = {
      ...formatted,
      csrf: csrf as string,
      ...(isEdit && { resourceVersion: defaultValue?.resourceVersion }),
    };

    submit(payload, {
      method: 'POST',
      encType: 'application/json',
      replace: true,
    });
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
      <FormStepper
        steps={stepConfigs}
        onComplete={handleComplete}
        formComponent={RouterForm}
        defaultValues={initialValues}
        id="export-policy-form"
        className="flex flex-col gap-6">
        {({ steps, current, isFirst, isLast, prev, getStepData }) => (
          <CardContent className="relative">
            {isPending && (
              <LoaderOverlay message={`${isEdit ? 'Saving' : 'Creating'} export policy...`} />
            )}
            <nav aria-label="Export Policy Steps" className="group">
              <ol className="relative ml-4 border-s border-gray-200 dark:border-gray-700 dark:text-gray-400">
                {steps.map((step, index, array) => {
                  const stepConfig = stepConfigs.find((s) => s.id === step.id)!;
                  const isActive = current.id === step.id;

                  return (
                    <React.Fragment key={step.id}>
                      <li
                        className={cn('ms-7', index < array.length - 1 && !isActive ? 'mb-4' : '')}>
                        <span className="absolute -start-4 flex size-8 items-center justify-center rounded-full bg-gray-100 ring-4 ring-white dark:bg-gray-700 dark:ring-gray-900">
                          {React.cloneElement(
                            stepConfig.icon() as React.ReactElement<{ className?: string }>,
                            { className: 'size-3.5 text-gray-600 dark:text-gray-500' }
                          )}
                        </span>
                        <div className="flex flex-col gap-1 pt-1.5">
                          <p className="text-base leading-tight font-medium">{step.label}</p>
                          <p className="text-muted-foreground text-sm">{step.description}</p>
                        </div>
                      </li>
                      {isActive && !isPending ? (
                        <div className="flex-1 py-6 pl-7">
                          <FormStep id={step.id}>
                            {step.id === 'metadata' && <MetadataForm isEdit={isEdit} />}
                            {step.id === 'sources' && <SourcesForm isEdit={isEdit} />}
                            {step.id === 'sinks' && (
                              <SinksForm
                                projectId={projectId}
                                isEdit={isEdit}
                                sourceList={
                                  getStepData('sources')?.sources as ExportPolicySourceFieldSchema[]
                                }
                              />
                            )}
                          </FormStep>

                          <div className="mt-4 flex items-center justify-end gap-2 border-t pt-4">
                            <Button
                              htmlType="button"
                              type="quaternary"
                              theme="borderless"
                              onClick={() => {
                                if (isFirst) {
                                  navigate(-1);
                                } else {
                                  prev();
                                }
                              }}>
                              {isFirst ? 'Return to List' : 'Back'}
                            </Button>
                            <Form.Submit disabled={isPending} loading={isPending}>
                              {isLast ? (isEdit ? 'Save' : 'Create') : 'Next'}
                            </Form.Submit>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 px-7 pb-6">
                          {stepConfig.preview(
                            // Build preview data from step metadata
                            Object.fromEntries(steps.map((s) => [s.id, getStepData(s.id)]))
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </ol>
            </nav>
          </CardContent>
        )}
      </FormStepper>
    </Card>
  );
};
