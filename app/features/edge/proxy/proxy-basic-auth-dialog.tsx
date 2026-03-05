import { type BasicAuthUser, type HttpProxy, useUpdateHttpProxy } from '@/resources/http-proxies';
import { toast } from '@datum-ui/components';
import { Form } from '@datum-ui/components/form';
import { Input } from '@datum-ui/components/form/primitives/input';
import { Switch } from '@shadcn/ui/switch';
import { Eye, EyeOff, PlusIcon, Trash2Icon } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { z } from 'zod';

const basicAuthSchema = z
  .object({
    enabled: z.preprocess((val) => {
      if (typeof val === 'boolean') return val;
      return val === 'true' || val === 'on';
    }, z.boolean().default(false)),
    // Field-level types only — validation rules are in superRefine so hidden
    // rows (when enabled=false) don't block form submission.
    users: z.array(z.object({ username: z.string(), password: z.string() })).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.enabled) return;

    if (!data.users || data.users.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one user is required when authentication is enabled',
        path: ['users'],
      });
      return;
    }

    data.users.forEach((user, i) => {
      if (!user.username) {
        ctx.addIssue({
          code: 'custom',
          message: 'Username is required',
          path: ['users', i, 'username'],
        });
      } else if (user.username.length > 64) {
        ctx.addIssue({
          code: 'custom',
          message: 'Username must be 64 characters or less',
          path: ['users', i, 'username'],
        });
      } else if (/[\s:]/.test(user.username)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Username must not contain spaces or colons',
          path: ['users', i, 'username'],
        });
      }
      if (user.password.length < 4) {
        ctx.addIssue({
          code: 'custom',
          message: 'Password must be at least 4 characters',
          path: ['users', i, 'password'],
        });
      }
    });

    const names = data.users.map((u) => u.username);
    names.forEach((name, i) => {
      if (names.indexOf(name) !== i) {
        ctx.addIssue({
          code: 'custom',
          message: `Username "${name}" is already used`,
          path: ['users', i, 'username'],
        });
      }
    });
  });

type BasicAuthSchema = z.infer<typeof basicAuthSchema>;

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
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                  <strong>Warning:</strong> Force HTTPS is not enabled. Credentials will be
                  transmitted in plaintext over HTTP. Consider enabling Force HTTPS on this proxy.
                </div>
              )}

              <p className="text-muted-foreground text-xs">
                Passwords must be re-entered to save changes.
              </p>

              <Form.FieldArray name="users">
                {({ fields, append, remove }) => (
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.key} className="flex items-start gap-2">
                        <Form.Field
                          name={`users.${index}.username`}
                          label={index === 0 ? 'Username' : undefined}
                          className="flex-1">
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
                        <div className="relative flex-1">
                          <Form.Field
                            name={`users.${index}.password`}
                            label={index === 0 ? 'Password' : undefined}
                            className="flex-1">
                            {({ control }) => (
                              <Input
                                type={showPasswordIndex === index ? 'text' : 'password'}
                                value={(control.value as string) ?? ''}
                                onChange={(e) => control.change(e.target.value)}
                                onBlur={control.blur}
                                onFocus={control.focus}
                                placeholder="••••••••"
                                className="pr-8"
                              />
                            )}
                          </Form.Field>
                          <button
                            type="button"
                            className={`text-muted-foreground hover:text-foreground absolute right-2 transition-colors ${index === 0 ? 'top-8' : 'top-1'}`}
                            onClick={() =>
                              setShowPasswordIndex(showPasswordIndex === index ? null : index)
                            }>
                            {showPasswordIndex === index ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                        <button
                          type="button"
                          className={`text-muted-foreground hover:text-destructive transition-colors ${index === 0 ? 'mt-6' : 'mt-1'}`}
                          onClick={() => remove(index)}>
                          <Trash2Icon className="size-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => append({ username: '', password: '' })}
                      className="text-primary hover:text-primary/80 flex items-center gap-1.5 text-sm transition-colors">
                      <PlusIcon className="size-4" />
                      Add User
                    </button>
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
