import type { ProxyRoute } from '@/resources/http-proxies';
import { Form } from '@datum-cloud/datum-ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { z } from 'zod';

const PATH_TYPES = [
  { value: 'PathPrefix', label: 'Prefix', hint: 'Matches this path and everything under it' },
  { value: 'Exact', label: 'Exact', hint: 'Matches only this exact path' },
  {
    value: 'RegularExpression',
    label: 'Regex',
    hint: 'Matches paths against a regular expression',
  },
] as const;

const routeFormSchema = z.object({
  pathType: z.enum(['PathPrefix', 'Exact', 'RegularExpression']).default('PathPrefix'),
  path: z.string().min(1, 'A path is required'),
});

type RouteFormSchema = z.infer<typeof routeFormSchema>;

export interface ProxyRouteDialogRef {
  /** Omit `route` to add a new one. */
  show: (route?: ProxyRoute) => void;
  hide: () => void;
}

function PathTypeField() {
  return (
    <Form.Field name="pathType" label="Match">
      {({ control }) => (
        <Select value={(control.value as string) ?? 'PathPrefix'} onValueChange={control.change}>
          <SelectTrigger data-e2e="alb-route-path-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PATH_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <span className="flex flex-col items-start">
                  <span>{type.label}</span>
                  <span className="text-muted-foreground text-xs">{type.hint}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Form.Field>
  );
}

export const ProxyRouteDialog = forwardRef<
  ProxyRouteDialogRef,
  {
    /** Existing routes, so a duplicate path can be rejected before saving. */
    routes: ProxyRoute[];
    onSubmit: (values: RouteFormSchema, original?: ProxyRoute) => Promise<void>;
    saving?: boolean;
  }
>(({ routes, onSubmit, saving }, ref) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProxyRoute | undefined>();
  const [defaultValues, setDefaultValues] = useState<Partial<RouteFormSchema>>();

  const show = useCallback((route?: ProxyRoute) => {
    setEditing(route);
    setDefaultValues({
      pathType: route?.pathType ?? 'PathPrefix',
      path: route?.path ?? '/',
    });
    setOpen(true);
  }, []);

  const hide = useCallback(() => setOpen(false), []);
  useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

  // Two routes matching the same path make the second unreachable, so reject
  // it here rather than letting the user save something that never fires.
  const schema = routeFormSchema.superRefine((value, ctx) => {
    const clash = routes.some(
      (r) => !r.isRedirect && r.key !== editing?.key && (r.path ?? '/') === value.path
    );
    if (clash) {
      ctx.addIssue({
        code: 'custom',
        path: ['path'],
        message: 'Another route already matches this path.',
      });
    }
  });

  const handleSubmit = async (data: RouteFormSchema) => {
    await onSubmit(data, editing);
    setOpen(false);
  };

  return (
    <Form.Dialog
      open={open}
      onOpenChange={setOpen}
      title={editing ? 'Edit route' : 'Add route'}
      description="A route matches requests by path and sends them to its own pool of backends."
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      loading={saving}
      submitText={editing ? 'Save' : 'Add route'}
      submitTextLoading="Saving..."
      className="w-full sm:max-w-xl">
      <div className="flex flex-col gap-5">
        <PathTypeField />
        <Form.Field name="path" label="Path" required>
          <Form.Input
            placeholder="e.g. /api"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Form.Field>
      </div>
    </Form.Dialog>
  );
});

ProxyRouteDialog.displayName = 'ProxyRouteDialog';
