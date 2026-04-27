import {
  machineAccountCreateSchema,
  machineAccountUpdateSchema,
  useCreateMachineAccount,
  useUpdateMachineAccount,
  type MachineAccount,
  type MachineAccountCreateSchema,
  type MachineAccountUpdateSchema,
} from '@/resources/machine-accounts';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { cn } from '@datum-cloud/datum-ui/utils';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';

export interface MachineAccountFormDialogRef {
  show: (initialValues?: MachineAccount) => void;
  hide: () => void;
}

interface MachineAccountFormDialogProps {
  projectId: string;
  onCreated?: (account: MachineAccount) => void;
}

const CREATE_DEFAULTS: MachineAccountCreateSchema = {
  name: '',
  displayName: '',
};

function NamePreview({ projectId }: { projectId: string }) {
  const name = Form.useWatch<string>('name');

  return (
    <p className={cn('mt-1 text-xs', name ? 'text-muted-foreground' : 'text-muted-foreground/50')}>
      Identity email:{' '}
      <span className="font-mono">
        {name || '<name>'}@{projectId}.iam.datumapis.com
      </span>
    </p>
  );
}

export const MachineAccountFormDialog = forwardRef<
  MachineAccountFormDialogRef,
  MachineAccountFormDialogProps
>(({ projectId, onCreated }, ref) => {
  const [open, setOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [defaultValues, setDefaultValues] = useState<MachineAccountCreateSchema>(CREATE_DEFAULTS);

  const isEdit = !!editName;

  const createMutation = useCreateMachineAccount(projectId, {
    onSuccess: (newAccount) => {
      toast.success('Machine account', {
        description: 'Machine account has been created successfully.',
      });
      setOpen(false);
      onCreated?.(newAccount);
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const updateMutation = useUpdateMachineAccount(projectId, editName, {
    onSuccess: () => {
      toast.success('Machine account', {
        description: 'Machine account has been updated successfully.',
      });
      setOpen(false);
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const show = useCallback((initialValues?: MachineAccount) => {
    if (initialValues?.uid) {
      setEditName(initialValues.name);
      setDefaultValues({
        name: initialValues.name,
        displayName: initialValues.displayName ?? '',
      });
    } else {
      setEditName('');
      setDefaultValues(CREATE_DEFAULTS);
    }
    setOpen(true);
  }, []);

  const hide = useCallback(() => setOpen(false), []);

  useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = useCallback(
    async (data: MachineAccountCreateSchema | MachineAccountUpdateSchema) => {
      if (isEdit) {
        updateMutation.mutate({ displayName: data.displayName });
      } else {
        createMutation.mutate(data as MachineAccountCreateSchema);
      }
    },
    [isEdit, createMutation, updateMutation]
  );

  return (
    <Form.Dialog
      key={open ? `open-${editName || 'create'}` : 'closed'}
      open={open}
      onOpenChange={setOpen}
      title={isEdit ? 'Edit Machine Account' : 'New Machine Account'}
      description={
        isEdit
          ? 'Edit the machine account with the new values below.'
          : 'Create a new machine account to get started.'
      }
      schema={isEdit ? machineAccountUpdateSchema : machineAccountCreateSchema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      loading={isPending}
      submitText={isEdit ? 'Save' : 'Create'}
      submitTextLoading={isEdit ? 'Saving...' : 'Creating...'}
      className="w-full focus:ring-0 focus:outline-none sm:max-w-lg">
      <div className="space-y-5 px-5 py-5">
        <Form.Field name="name" label="Name" required={!isEdit} disabled={isEdit}>
          {({ control }) => (
            <>
              <Form.Input
                placeholder="my-machine-account"
                autoFocus={!isEdit}
                value={control.value as string}
                onChange={(e) => control.change(e.target.value)}
                disabled={isEdit}
              />
              {!isEdit && <NamePreview projectId={projectId} />}
            </>
          )}
        </Form.Field>

        <Form.Field name="displayName" label="Display Name">
          {({ control }) => (
            <Form.Input
              placeholder="My Machine Account"
              value={control.value as string}
              onChange={(e) => control.change(e.target.value)}
            />
          )}
        </Form.Field>
      </div>
    </Form.Dialog>
  );
});

MachineAccountFormDialog.displayName = 'MachineAccountFormDialog';
