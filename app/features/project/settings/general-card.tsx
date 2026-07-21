import { useApp } from '@/providers/app.provider';
import type { Project } from '@/resources/projects';
import { projectKeys, updateProjectSchema, useUpdateProject } from '@/resources/projects';
import { Button } from '@datum-cloud/datum-ui/button';
import { CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Project General Settings Card Component
 * Displays and allows editing of general project settings
 */
export const ProjectGeneralCard = ({ project }: { project: Project }) => {
  const { setProject } = useApp();
  const queryClient = useQueryClient();

  const updateMutation = useUpdateProject(project?.name ?? '', {
    onSuccess: (updatedProject) => {
      setProject(updatedProject);
      toast.success('Project', {
        description: 'The Project has been updated successfully',
      });
      if (updatedProject.organizationId) {
        queryClient.invalidateQueries({
          queryKey: projectKeys.list(updatedProject.organizationId),
        });
      }
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
        mode="onBlur"
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
                  <Form.Input data-e2e="edit-project-name-input" placeholder="e.g. My Project" />
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
                data-e2e="edit-project-cancel"
                disabled={isSubmitting}
                size="xs"
                onClick={() => {
                  form.reset();
                }}>
                Cancel
              </Button>
              <Form.Submit size="xs" loadingText="Saving" data-e2e="edit-project-save">
                Save
              </Form.Submit>
            </CardFooter>
          </>
        )}
      </Form.Root>
    </Card>
  );
};
