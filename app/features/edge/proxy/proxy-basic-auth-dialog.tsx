import {
  basicAuthSchema,
  type BasicAuthSchema,
  type BasicAuthUser,
  type HttpProxy,
  useUpdateHttpProxy,
} from '@/resources/http-proxies';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form, useFormContext } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import { InputWithAddons } from '@datum-cloud/datum-ui/input-with-addons';
import { Switch } from '@datum-cloud/datum-ui/switch';
import { toast } from '@datum-cloud/datum-ui/toast';
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
        users: (proxy.basicAuthUsernames ?? []).map((username) => ({ username, password: '' })),
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
        toast.success('AI Edge', {
          description: 'Basic Authentication updated successfully',
        });
        setOpen(false);
        onSuccess?.();
      } catch (error) {
        toast.error('AI Edge', {
          description: (error as Error).message || 'Failed to update Basic Authentication',
        });
        onError?.(error as Error);
      }
    };

    return (
      <Form.Dialog
        open={open}
        onOpenChange={setOpen}
        title="Edit Basic Authentication"
        description="Restrict access to this proxy with HTTP Basic Authentication. Credentials are hashed using SHA."
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
                <span className="text-sm">{enabled ? 'Enabled' : 'Disabled'}</span>
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
                    HTTP. Consider enabling Force HTTPS on this proxy.
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-muted-foreground text-xs">
                Passwords must be re-entered to save changes.
              </p>

              <Form.FieldArray name="users">
                {({ fields, append, remove }) => (
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.key} className="flex items-center gap-2">
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
                            />
                          )}
                        </Form.Field>

                        <Form.Field
                          name={`users.${index}.password`}
                          label={index === 0 ? 'Password' : undefined}
                          showErrors={false}
                          className="w-1/2">
                          {({ control, field }) => (
                            <InputWithAddons
                              id={field.id}
                              type={showPasswordIndex === index ? 'text' : 'password'}
                              value={(control.value as string) ?? ''}
                              onChange={(e) => control.change(e.target.value)}
                              onBlur={control.blur}
                              onFocus={control.focus}
                              placeholder="••••••••"
                              trailing={
                                <Button
                                  type="secondary"
                                  theme="borderless"
                                  size="icon"
                                  htmlType="button"
                                  className="h-5 w-5"
                                  aria-label={
                                    showPasswordIndex === index ? 'Hide password' : 'Show password'
                                  }
                                  onClick={() =>
                                    setShowPasswordIndex(showPasswordIndex === index ? null : index)
                                  }>
                                  <Icon
                                    icon={showPasswordIndex === index ? EyeOff : Eye}
                                    className="size-4"
                                  />
                                </Button>
                              }
                            />
                          )}
                        </Form.Field>
                        <Button
                          type="danger"
                          theme="borderless"
                          size="icon"
                          className="mb-0.5 self-end"
                          aria-label="Remove user"
                          onClick={() => remove(index)}>
                          <Icon icon={TrashIcon} className="size-4" />
                        </Button>
                      </div>
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
