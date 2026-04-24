import type { DnsZone } from '@/resources/dns-zones';
import { createDnsZoneSchema, useUpdateDnsZone } from '@/resources/dns-zones';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';

export const DescriptionFormCard = ({
  projectId,
  defaultValue,
}: {
  projectId: string;
  defaultValue: DnsZone;
}) => {
  const updateDnsZoneMutation = useUpdateDnsZone(projectId, defaultValue?.name ?? '', {
    onSuccess: () => {
      toast.success('DNS Zone', {
        description: 'You have successfully updated the DNS Zone description.',
      });
    },
    onError: (error: Error) => {
      toast.error('Error', {
        description: error.message ?? 'An error occurred while updating the DNS Zone description',
      });
    },
  });

  return (
    <Card className="rounded-xl pt-5 pb-4 shadow-none">
      <CardHeader>
        <CardDescription className="text-xs">
          This description is for your own reference and won&apos;t be shared externally
        </CardDescription>
      </CardHeader>
      <Form.Root
        id="description-form"
        schema={createDnsZoneSchema}
        mode="onBlur"
        defaultValues={{
          domainName: defaultValue?.domainName ?? '',
          description: defaultValue?.description ?? '',
        }}
        isSubmitting={updateDnsZoneMutation.isPending}
        onSubmit={(data) => {
          updateDnsZoneMutation.mutate({
            description: data.description ?? '',
            resourceVersion: defaultValue.resourceVersion,
          });
        }}
        className="mt-6 flex flex-col gap-10 space-y-0">
        {({ form, isSubmitting }) => (
          <>
            <CardContent className="space-y-10">
              <Form.Field name="domainName" className="hidden">
                <Form.Input type="text" placeholder="e.g. example.com" />
              </Form.Field>

              <Form.Field name="description">
                <Form.Input type="text" placeholder="e.g. Our main marketing site" autoFocus />
              </Form.Field>
            </CardContent>
            <CardFooter className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                htmlType="button"
                type="quaternary"
                theme="outline"
                disabled={isSubmitting}
                size="xs"
                className="w-full sm:w-auto"
                onClick={() => {
                  form.reset();
                }}>
                Cancel
              </Button>
              <Form.Submit size="xs" className="w-full sm:w-auto" loadingText="Saving">
                Save
              </Form.Submit>
            </CardFooter>
          </>
        )}
      </Form.Root>
    </Card>
  );
};
