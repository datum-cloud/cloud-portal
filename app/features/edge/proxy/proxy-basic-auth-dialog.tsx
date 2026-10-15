import { showMutationErrorToast } from '@/modules/quota';
import {
  basicAuthSchema,
  type BasicAuthSchema,
  type BasicAuthUser,
  type HttpProxy,
  useUpdateHttpProxy,
} from '@/resources/http-proxies';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form, useField, useFormContext } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import { InputWithAddons } from '@datum-cloud/datum-ui/input-with-addons';
import { Switch } from '@datum-cloud/datum-ui/switch';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Eye, EyeOff, PlusIcon, TrashIcon, TriangleAlert } from 'lucide-react';
import { forwardRef, useCallback, useMemo, useImperativeHandle, useState } from 'react';

const FRIENDLY_ERROR_MAP: Record<string, string> = {
  'Invalid input: expected string, received undefined':
    'Please enter a username and password for each user.',
  'expected string, received undefined': 'Please enter a username and password for each user.',
};

function toFriendlyError(message: string): string {
  return FRIENDLY_ERROR_MAP[message] ?? message;
}

/** Collects and displays all errors for the users array in one block (used with showErrors={false} on item fields). */
function UsersArrayErrors() {
  const { fields } = useFormContext();
  const errors = useMemo(() => {
    const list: string[] = [];
    const usersField = (
      fields as Record<string, { errors?: string[]; getFieldList?: () => unknown[] }>
    )?.['users'];
    if (usersField?.errors?.length) list.push(...usersField.errors);
    const userList = usersField?.getFieldList?.() ?? [];
    for (let i = 0; i < userList.length; i++) {
      const item = userList[i] as { getFieldset?: () => Record<string, { errors?: string[] }> };
      const set = item?.getFieldset?.() ?? {};
      ['username', 'password'].forEach((key) => {
        const f = set[key];
        if (f?.errors?.length) list.push(...f.errors);
      });
    }
    return [...new Set(list)].map(toFriendlyError);
  }, [fields]);
  if (errors.length === 0) return null;
  return (
    <ul className="text-destructive space-y-1 text-xs font-medium" role="alert" aria-live="polite">
      {errors.map((error) => (
        <li key={error} className="text-wrap">
          {error}
        </li>
      ))}
    </ul>
  );
}

interface BasicAuthUserRowProps {
  index: number;
  showPassword: boolean;
  onTogglePassword: () => void;
  onRemove: () => void;
}

/**
 * One username/password row. Users loaded from the server carry their
 * original username in a hidden field, so a blank password keeps the stored one.
 */
function BasicAuthUserRow({
  index,
  showPassword,
  onTogglePassword,
  onRemove,
}: BasicAuthUserRowProps) {
  const { field: originalUsernameField } = useField(`users.${index}.originalUsername`);
  const originalUsername = originalUsernameField.value as string | undefined;

  return (
    <div className="flex items-center gap-2">
      {originalUsername && (
        <input
          type="hidden"
          name={originalUsernameField.name}
          value={originalUsername}
          onChange={() => {}}
        />
      )}
      <Form.Field
        name={`users.${index}.username`}
        label={index === 0 ? 'Username' : undefined}
        showErrors={false}
        className="w-1/2">
        {({ control }) => (
          <Input
            value={(control.value as string) ?? ''}
            onChange={(e) => control.change(e.target.value)}
            onBlur={control.blur}
            onFocus={control.focus}
            placeholder="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        )}
      </Form.Field>

      <Form.Field
        name={`users.${index}.password`}
        label={index === 0 ? 'Password' : undefined}
        showErrors={false}
        className="w-1/2">
        {({ control, field }) => {
          const value = (control.value as string) ?? '';
          return (
            <InputWithAddons
              id={field.id}
              type={showPassword ? 'text' : 'password'}
              value={value}
              onChange={(e) => control.change(e.target.value)}
              onBlur={control.blur}
              onFocus={control.focus}
              placeholder={originalUsername ? 'Unchanged' : 'password'}
              autoComplete="new-password"
              trailing={
                // Nothing to reveal until a password is typed.
                value ? (
                  <Button
                    type="secondary"
                    theme="borderless"
                    size="icon"
                    htmlType="button"
                    className="h-5 w-5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={onTogglePassword}>
                    <Icon icon={showPassword ? EyeOff : Eye} className="size-4" />
                  </Button>
                ) : undefined
              }
            />
          );
        }}
      </Form.Field>
      <Button
        type="danger"
        theme="borderless"
        size="icon"
        className="mb-0.5 self-end"
        aria-label="Remove user"
        onClick={onRemove}>
        <Icon icon={TrashIcon} className="size-4" />
      </Button>
    </div>
  );
}

export interface ProxyBasicAuthDialogRef {
  show: (proxy: HttpProxy) => void;
  hide: () => void;
}

interface ProxyBasicAuthDialogProps {
  projectId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const ProxyBasicAuthDialog = forwardRef<ProxyBasicAuthDialogRef, ProxyBasicAuthDialogProps>(
  function ProxyBasicAuthDialog({ projectId, onSuccess, onError }, ref) {
    const [open, setOpen] = useState(false);
    const [proxyName, setProxyName] = useState('');
    const [defaultValues, setDefaultValues] = useState<Partial<BasicAuthSchema>>();
    const [showHttpsWarning, setShowHttpsWarning] = useState(false);
    const [showPasswordIndex, setShowPasswordIndex] = useState<number | null>(null);
    const [enabled, setEnabled] = useState(false);

    const updateMutation = useUpdateHttpProxy(projectId, proxyName);

    const show = useCallback((proxy: HttpProxy) => {
      setProxyName(proxy.name);
      setShowHttpsWarning(proxy.enableHttpRedirect !== true);
      const isEnabled = proxy.basicAuthEnabled ?? false;
      setEnabled(isEnabled);
      setDefaultValues({
        enabled: isEnabled,
        users: (proxy.basicAuthUsernames ?? []).map((username) => ({
          username,
          password: '',
          originalUsername: username,
        })),
      });
      setShowPasswordIndex(null);
      setOpen(true);
    }, []);

    const hide = useCallback(() => {
      setOpen(false);
    }, []);

    useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

    const handleSubmit = async (data: BasicAuthSchema) => {
      try {
        const users: BasicAuthUser[] | undefined = data.enabled ? data.users : undefined;
        await updateMutation.mutateAsync({ basicAuth: { users } });
        toast.success('Application Load Balancer', {
          description: 'Basic Authentication updated successfully',
        });
        setOpen(false);
        onSuccess?.();
      } catch (error) {
        showMutationErrorToast(error, {
          fallbackTitle: 'Application Load Balancer',
          fallbackDescription: (error as Error).message || 'Failed to update Basic Authentication',
          scope: 'project',
          projectId,
        });
        onError?.(error as Error);
      }
    };

    return (
      <Form.Dialog
        open={open}
        onOpenChange={setOpen}
        title="Edit Basic Authentication"
        description="Restrict access to this ALB with HTTP Basic Authentication. Credentials are hashed using SHA."
        schema={basicAuthSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitText="Save"
        submitTextLoading="Saving..."
        className="w-full focus:ring-0 focus:outline-none sm:max-w-2xl">
        <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <Form.Field name="enabled" label="Enable Basic Authentication?" required>
            {({ control }) => (
              <div className="flex items-center gap-2">
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => {
                    control.change(String(checked));
                    setEnabled(checked);
                  }}
                />
                <Text>{enabled ? 'Enabled' : 'Disabled'}</Text>
              </div>
            )}
          </Form.Field>

          {enabled && (
            <div className="space-y-3">
              {showHttpsWarning && (
                <Alert variant="warning">
                  <TriangleAlert className="size-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    Force HTTPS is not enabled. Credentials will be transmitted in plaintext over
                    HTTP. Consider enabling Force HTTPS on this ALB.
                  </AlertDescription>
                </Alert>
              )}

              <Text as="p" size="xs" textColor="muted">
                Leave a password blank to keep it unchanged.
              </Text>

              <Form.FieldArray name="users">
                {({ fields, append, remove }) => (
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <BasicAuthUserRow
                        key={field.key}
                        index={index}
                        showPassword={showPasswordIndex === index}
                        onTogglePassword={() =>
                          setShowPasswordIndex(showPasswordIndex === index ? null : index)
                        }
                        onRemove={() => remove(index)}
                      />
                    ))}
                    <UsersArrayErrors />
                    <Button
                      type="secondary"
                      theme="outline"
                      size="small"
                      className="w-fit gap-1.5"
                      onClick={() => append({ username: '', password: '' })}>
                      <Icon icon={PlusIcon} className="size-4" />
                      Add User
                    </Button>
                  </div>
                )}
              </Form.FieldArray>
            </div>
          )}
        </div>
      </Form.Dialog>
    );
  }
);

ProxyBasicAuthDialog.displayName = 'ProxyBasicAuthDialog';
