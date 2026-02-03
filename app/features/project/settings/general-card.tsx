import { useApp } from '@/providers/app.provider';
import type { Project } from '@/resources/projects';
import { updateProjectSchema, useUpdateProject } from '@/resources/projects';
import { Button, CardHeader, CardTitle, toast } from '@datum-ui/components';
import { Card, CardContent, CardFooter } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';

/**
 * Project General Settings Card Component
 * Displays and allows editing of general project settings
 */
export const ProjectGeneralCard = ({ project }: { project: Project }) => {
  const { setProject } = useApp();

  const updateMutation = useUpdateProject(project?.name ?? '', {
    onSuccess: (updatedProject) => {
      setProject(updatedProject);
      toast.success('Project', {
        description: 'The Project has been updated successfully',
      });
    },
    onError: (error) => {
      toast.error('Project', {
        description: error.message || 'Failed to update project',
      });
    },
  });

  return (
    <Card className="gap-0 rounded-xl py-0 shadow-none">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">Project Info</CardTitle>
      </CardHeader>
      <Form.Root
        name="update-project"
        id="update-project-form"
        schema={updateProjectSchema.pick({ description: true, name: true })}
        defaultValues={{
          description: project?.description ?? '',
          name: project?.name ?? '',
        }}
        isSubmitting={updateMutation.isPending}
        onSubmit={(data) => {
          updateMutation.mutate({
            description: data.description,
          });
        }}
        className="flex flex-col space-y-0">
        {({ form, isSubmitting }) => (
          <>
            <CardContent className="px-5 py-4">
              <div className="flex max-w-sm flex-col gap-5">
                <Form.Field name="description" label="Project name" required>
                  <Form.Input placeholder="e.g. My Project" />
                </Form.Field>

                <Form.Field name="name" label="Resource ID">
                  <Form.CopyBox />
                </Form.Field>
              </div>
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
                      name: project?.name ?? '',
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
