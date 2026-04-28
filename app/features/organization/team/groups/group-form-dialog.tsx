import { createGroupSchema, useCreateGroup, type CreateGroupInput } from '@/resources/groups';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';

export interface GroupFormDialogRef {
  show: () => void;
  hide: () => void;
}

interface GroupFormDialogProps {
  orgId: string;
  onCreated?: (groupName: string) => void;
}

const CREATE_DEFAULTS: CreateGroupInput = {
  name: '',
};

export const GroupFormDialog = forwardRef<GroupFormDialogRef, GroupFormDialogProps>(
  ({ orgId, onCreated }, ref) => {
    const [open, setOpen] = useState(false);

    const createMutation = useCreateGroup(orgId, {
      onSuccess: (group) => {
        setOpen(false);
        onCreated?.(group.name);
      },
      onError: (error) => {
        toast.error('Error', { description: error.message });
      },
    });

    const show = useCallback(() => setOpen(true), []);
    const hide = useCallback(() => setOpen(false), []);

    useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

    const handleSubmit = useCallback(
      (data: CreateGroupInput) => {
        createMutation.mutate(data);
      },
      [createMutation]
    );

    return (
      <Form.Dialog
        key={open ? 'open' : 'closed'}
        open={open}
        onOpenChange={setOpen}
        title="New Group"
        description="Create a new IAM group for your organization."
        schema={createGroupSchema}
        defaultValues={CREATE_DEFAULTS}
        onSubmit={handleSubmit}
        loading={createMutation.isPending}
        submitText="Create"
        submitTextLoading="Creating..."
        className="w-full focus:ring-0 focus:outline-none sm:max-w-lg">
        <div className="space-y-5 px-5 py-5">
          <Form.Field name="name" label="Group Name" required>
            {({ control }) => (
              <>
                <Form.Input
                  placeholder="platform-engineering"
                  autoFocus
                  value={control.value as string}
                  onChange={(e) => control.change(e.target.value)}
                />
                <Form.Description>
                  Lowercase letters, numbers, and hyphens only. Must start with a letter. 3-63
                  characters.
                </Form.Description>
              </>
            )}
          </Form.Field>
        </div>
      </Form.Dialog>
    );
  }
);

GroupFormDialog.displayName = 'GroupFormDialog';
