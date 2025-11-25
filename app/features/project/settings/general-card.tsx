import { Field } from '@/components/field/field';
import { TextCopyBox } from '@/components/text-copy/text-copy-box';
import { useIsPending } from '@/hooks/useIsPending';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { updateProjectSchema } from '@/resources/schemas/project.schema';
import { FormProvider, getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button, CardHeader, CardTitle, Col, Row } from '@datum-ui/components';
import { Card, CardContent, CardFooter } from '@datum-ui/components';
import { Input } from '@datum-ui/components';
import { useEffect } from 'react';
import { useFetcher } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';

/**
 * Project General Settings Card Component
 * Displays and allows editing of general project settings
 */
export const ProjectGeneralCard = ({ project }: { project: IProjectControlResponse }) => {
  const formId = 'project-form';
  const fetcher = useFetcher({ key: formId });
  const isPending = useIsPending({ formId, fetcherKey: formId });

  const [form, fields] = useForm({
    id: formId,
    constraint: getZodConstraint(updateProjectSchema.pick({ description: true })),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: updateProjectSchema.pick({ description: true }),
      });
    },
  });

  const setValue = () => {
    form.update({
      value: {
        description: project?.description ?? '',
      },
    });
  };

  // Update form when organization data changes
  useEffect(() => {
    if (project) {
      setValue();
    }
  }, [project]);

  return (
    <Card className="py-4">
      <FormProvider context={form.context}>
        <CardHeader className="border-b px-5 pb-4">
          <CardTitle>Project Info</CardTitle>
        </CardHeader>
        <fetcher.Form
          method="POST"
          autoComplete="off"
          {...getFormProps(form)}
          className="flex flex-col gap-5">
          <CardContent className="space-y-5 px-5">
            <AuthenticityTokenInput />

            <Row gutter={16}>
              <Col span={8}>
                <Field isRequired label="Description" errors={fields.description?.errors}>
                  <Input
                    placeholder="e.g. My Project"
                    {...getInputProps(fields.description, { type: 'text' })}
                  />
                </Field>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Field label="Resource Name">
                  <TextCopyBox value={project?.name ?? ''} />
                </Field>
              </Col>
            </Row>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t px-5 pt-4">
            {/* <Button type="button" variant="link" disabled={isPending} onClick={handleReset}>
              Cancel
            </Button> */}
            <Button htmlType="submit" disabled={isPending || !form.valid} loading={isPending}>
              {isPending ? 'Saving' : 'Save'}
            </Button>
          </CardFooter>
        </fetcher.Form>
      </FormProvider>
    </Card>
  );
};
