import { SingleDatePicker } from '@/components/date-picker/single-date-picker';
import {
  machineAccountKeyCreateSchema,
  useCreateMachineAccountKey,
  type MachineAccountKeyCreateSchema,
  type CreateMachineAccountKeyResponse,
} from '@/resources/machine-accounts';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { cn } from '@datum-cloud/datum-ui/utils';
import { KeyRoundIcon, ShieldIcon } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';

export interface MachineAccountKeyFormDialogRef {
  show: () => void;
  hide: () => void;
}

interface MachineAccountKeyFormDialogProps {
  projectId: string;
  machineAccountId: string;
  machineAccountEmail: string;
  onKeyCreated?: (response: CreateMachineAccountKeyResponse) => void;
}

type KeyType = 'datum-managed' | 'user-managed';

const KEY_FORM_DEFAULTS: MachineAccountKeyCreateSchema = {
  name: '',
  type: 'datum-managed',
  publicKey: '',
  expiresAt: '',
};

interface KeyTypeCardProps {
  selected: boolean;
  onSelect: () => void;
  icon: React.ElementType;
  title: string;
  description: string;
}

function KeyTypeCard({
  selected,
  onSelect,
  icon: IconComponent,
  title,
  description,
}: KeyTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'focus-visible:ring-ring flex flex-1 flex-col gap-2 rounded-lg border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      )}>
      <div className="flex items-center gap-2">
        <IconComponent
          className={cn('size-4', selected ? 'text-primary' : 'text-muted-foreground')}
          aria-hidden="true"
        />
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <p className="text-muted-foreground text-xs">{description}</p>
    </button>
  );
}

export const MachineAccountKeyFormDialog = forwardRef<
  MachineAccountKeyFormDialogRef,
  MachineAccountKeyFormDialogProps
>(({ projectId, machineAccountId, machineAccountEmail, onKeyCreated }, ref) => {
  const [open, setOpen] = useState(false);
  const [keyType, setKeyType] = useState<KeyType>('datum-managed');

  const createMutation = useCreateMachineAccountKey(
    projectId,
    machineAccountId,
    machineAccountEmail,
    {
      onSuccess: (response) => {
        toast.success('Key created', {
          description: 'Machine account key has been created successfully.',
        });
        setOpen(false);
        onKeyCreated?.(response);
      },
      onError: (error) => {
        toast.error('Error', { description: error.message });
      },
    }
  );

  const show = useCallback(() => {
    setKeyType('datum-managed');
    setOpen(true);
  }, []);

  const hide = useCallback(() => setOpen(false), []);

  useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

  const handleSubmit = useCallback(
    async (data: MachineAccountKeyCreateSchema) => {
      createMutation.mutate({
        name: data.name,
        type: keyType,
        publicKey: keyType === 'user-managed' ? data.publicKey : undefined,
        expiresAt: data.expiresAt || undefined,
      });
    },
    [keyType, createMutation]
  );

  return (
    <Form.Dialog
      open={open}
      onOpenChange={setOpen}
      title="New Key"
      description="Add a new authentication key to this machine account."
      schema={machineAccountKeyCreateSchema}
      defaultValues={KEY_FORM_DEFAULTS}
      onSubmit={handleSubmit}
      loading={createMutation.isPending}
      submitText="Create"
      submitTextLoading="Creating..."
      className="w-full focus:ring-0 focus:outline-none sm:max-w-lg">
      <div className="space-y-6 px-5 py-5">
        <div className="flex gap-3" role="group" aria-label="Key type">
          <KeyTypeCard
            selected={keyType === 'datum-managed'}
            onSelect={() => setKeyType('datum-managed')}
            icon={KeyRoundIcon}
            title="Datum-managed key"
            description="Datum generates a secure RSA key pair. The private key is shown once at creation and never stored."
          />
          <KeyTypeCard
            selected={keyType === 'user-managed'}
            onSelect={() => setKeyType('user-managed')}
            icon={ShieldIcon}
            title="User-managed key"
            description="You generate your own key pair and provide Datum with the public key (PEM format)."
          />
        </div>

        <Form.Field name="name" label="Name" required>
          {({ control }) => (
            <Form.Input
              placeholder="my-key"
              autoFocus
              value={control.value as string}
              onChange={(e) => control.change(e.target.value)}
            />
          )}
        </Form.Field>

        {keyType === 'user-managed' && (
          <Form.Field name="publicKey" label="Public Key" required>
            {({ control }) => (
              <Form.Textarea
                rows={5}
                placeholder="Paste your RSA public key in PEM format (begins with -----BEGIN PUBLIC KEY-----)"
                value={control.value as string}
                onChange={(e) => control.change(e.target.value)}
              />
            )}
          </Form.Field>
        )}

        <Form.Field name="expiresAt" label="Expires">
          {({ control }) => (
            <SingleDatePicker
              value={control.value as string}
              onChange={(value) => control.change(value)}
              disablePast
              placeholder="Select expiration date"
            />
          )}
        </Form.Field>
      </div>
    </Form.Dialog>
  );
});

MachineAccountKeyFormDialog.displayName = 'MachineAccountKeyFormDialog';
