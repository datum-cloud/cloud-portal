import { TextCopyBox } from '@/components/text-copy/text-copy-box';
import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { updateProjectSchema } from '@/resources/schemas/project.schema';
import { ROUTE_PATH as PROJECT_UPDATE_ACTION } from '@/routes/api/projects/$id';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, CardHeader, CardTitle, Col, Row, toast } from '@datum-ui/components';
import { Card, CardContent, CardFooter } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

/**
 * Project General Settings Card Component
 * Displays and allows editing of general project settings
 */
export const ProjectGeneralCard = ({ project }: { project: IProjectControlResponse }) => {
  const fetcher = useDatumFetcher({
    key: 'update-project',
    onSuccess: () => {
      toast.success('Project', {
        description: 'The Project has been updated successfully',
      });
    },
    onError: (data) => {
      toast.error('Project', {
        description: data.error || 'Failed to update project',
      });
    },
  });
  const csrf = useAuthenticityToken();
  return (
    <Card className="gap-0 rounded-xl py-0 shadow-none">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">Project Info</CardTitle>
      </CardHeader>
      <Form.Root
        id="update-project-form"
        schema={updateProjectSchema.pick({ description: true })}
        defaultValues={{
          description: project?.description ?? '',
        }}
        isSubmitting={fetcher.state !== 'idle'}
        onSubmit={(data) => {
          const payload = {
            ...data,
            csrf: csrf as string,
          };

          fetcher.submit(payload, {
            method: 'PATCH',
            action: getPathWithParams(PROJECT_UPDATE_ACTION, { id: project?.name }),
            encType: 'application/json',
          });
        }}
        className="flex flex-col space-y-0">
        {({ form, isSubmitting }) => (
          <>
            <CardContent className="space-y-5 px-5 py-4">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Field name="description" label="Project name" required>
                    <Form.Input placeholder="e.g. My Project" />
                  </Form.Field>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <div className="flex flex-col space-y-2">
                    <label className="text-xs font-medium">Resource ID</label>
                    <TextCopyBox value={project?.name ?? ''} />
                  </div>
                </Col>
              </Row>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t px-5 py-4">
              <Button
                htmlType="button"
                type="quaternary"
                theme="outline"
                disabled={isSubmitting}
                size="xs"
                onClick={() => {
                  form.update({
                    value: {
                      description: project?.description ?? '',
                    },
                  });
                }}>
                Cancel
              </Button>
              <Form.Submit size="xs" loadingText="Saving">
                Save
              </Form.Submit>
            </CardFooter>
          </>
        )}
      </Form.Root>
    </Card>
  );
};
