import { SelectGroup } from '@/components/select-group/select-group';
import { SelectMember } from '@/components/select-member/select-member';
import { SelectProject } from '@/components/select-project/select-project';
import { SelectRole } from '@/components/select-role/select-role';
import { POLICY_RESOURCES } from '@/features/policy-binding/form/constants';
import { SelectResource } from '@/features/policy-binding/form/select-resource';
import { useApp } from '@/providers/app.provider';
import {
  type CreatePolicyBindingInput,
  type NewPolicyBindingSchema,
  type PolicyBinding,
  PolicyBindingSubjectKind,
  newPolicyBindingSchema,
  useCreatePolicyBinding,
  useUpdatePolicyBinding,
} from '@/resources/policy-bindings';
import { useProject } from '@/resources/projects';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import { toast } from '@datum-cloud/datum-ui/toast';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';

const CREATE_DEFAULTS: NewPolicyBindingSchema = {
  resource: {
    ref: 'resourcemanager.miloapis.com-project',
    name: '',
    namespace: '',
    uid: '',
  },
  role: '',
  roleNamespace: '',
  subjects: [{ kind: PolicyBindingSubjectKind.User, name: '', uid: '' }],
};

// --- Internal sub-components ---

function ResourceSection({ isEdit }: { isEdit: boolean }) {
  const { orgId, organization } = useApp();
  const resourceName = Form.useField('resource.name');
  const resourceNamespace = Form.useField('resource.namespace');
  const resourceUid = Form.useField('resource.uid');
  const refValue = Form.useWatch<string>('resource.ref');

  const [currentRef, setCurrentRef] = useState<{ label: string; kind: string }>();

  return (
    <div className="flex w-full gap-4">
      <Form.Field name="resource.ref" label="Resource Name" required className="w-1/2">
        {({ control }) => (
          <SelectResource
            disabled={isEdit}
            defaultValue={control.value as string}
            onValueChange={(value) => {
              control.change(value);
              setCurrentRef(POLICY_RESOURCES[value as keyof typeof POLICY_RESOURCES]);

              if (value === 'resourcemanager.miloapis.com-organization') {
                resourceName.control.change(organization?.name ?? '');
                resourceNamespace.control.change(organization?.namespace ?? '');
                resourceUid.control.change(organization?.uid ?? '');
              } else {
                resourceName.control.change('');
                resourceNamespace.control.change('');
                resourceUid.control.change('');
              }
            }}
          />
        )}
      </Form.Field>

      <Form.Field
        name="resource.name"
        label={currentRef?.kind ?? 'Project'}
        required
        className="w-1/2">
        {({ control }) => (
          <>
            {refValue === 'resourcemanager.miloapis.com-project' && (
              <SelectProject
                disabled={isEdit}
                orgId={orgId ?? ''}
                defaultValue={control.value as string}
                onSelect={(value) => {
                  control.change(value.value);
                  resourceNamespace.control.change(value.namespace);
                  resourceUid.control.change(value.uid);
                }}
              />
            )}

            {refValue === 'resourcemanager.miloapis.com-organization' && (
              <Input readOnly value={organization?.name ?? ''} />
            )}
          </>
        )}
      </Form.Field>
    </div>
  );
}

function HiddenResourceFields({
  resource,
}: {
  resource: { ref: string; name: string; namespace?: string; uid?: string };
}) {
  return (
    <>
      <input type="hidden" name="resource.ref" value={resource.ref} onChange={() => {}} />
      <input type="hidden" name="resource.name" value={resource.name} onChange={() => {}} />
      <input
        type="hidden"
        name="resource.namespace"
        value={resource.namespace}
        onChange={() => {}}
      />
      <input type="hidden" name="resource.uid" value={resource.uid} onChange={() => {}} />
    </>
  );
}

function RoleSection({ isEdit }: { isEdit: boolean }) {
  const roleNamespace = Form.useField('roleNamespace');

  return (
    <div className="flex w-full gap-4">
      <Form.Field name="role" label="Role" required className="w-1/2">
        {({ control }) => (
          <SelectRole
            disabled={isEdit}
            defaultValue={control.value as string}
            modal
            onSelect={(value) => {
              control.change(value.value);
              roleNamespace.control.change(value.namespace);
            }}
          />
        )}
      </Form.Field>
      <div className="w-1/2" />
    </div>
  );
}

function SubjectRow({
  index,
  onRemove,
  canRemove,
}: {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { orgId } = useApp();
  const kindValue = Form.useWatch<string>(`subjects.${index}.kind`);
  const subjectUid = Form.useField(`subjects.${index}.uid`);

  return (
    <div className="relative flex items-center gap-2 rounded-md border p-4">
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full gap-4">
          <Form.Field name={`subjects.${index}.kind`} label="Type" required className="w-1/3">
            <Form.Combobox
              options={Object.values(PolicyBindingSubjectKind).map((kind) => ({
                value: kind,
                label: kind,
              }))}
            />
          </Form.Field>

          <Form.Field name={`subjects.${index}.name`} label="Subject" required className="w-2/3">
            {({ control }) => (
              <>
                {kindValue === PolicyBindingSubjectKind.User && (
                  <SelectMember
                    orgId={orgId ?? ''}
                    defaultValue={control.value as string}
                    onSelect={(value) => {
                      control.change(value.value);
                      subjectUid.control.change(value.uid);
                    }}
                  />
                )}

                {kindValue === PolicyBindingSubjectKind.Group && (
                  <SelectGroup
                    orgId={orgId ?? ''}
                    defaultValue={control.value as string}
                    onSelect={(value) => {
                      control.change(value.value);
                      subjectUid.control.change(value.uid);
                    }}
                  />
                )}
              </>
            )}
          </Form.Field>
        </div>
      </div>

      {canRemove && (
        <Button
          htmlType="button"
          type="quaternary"
          theme="borderless"
          size="small"
          className="text-destructive relative top-2 w-fit"
          onClick={onRemove}
          aria-label={`Remove subject ${index + 1}`}>
          <Icon icon={Trash2Icon} className="size-4" />
        </Button>
      )}
    </div>
  );
}

function SubjectsSection() {
  return (
    <Form.FieldArray name="subjects">
      {({ fields, append, remove }) => (
        <div className="flex flex-col gap-3">
          <label className="text-foreground/80 text-xs font-semibold">Subjects</label>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <SubjectRow
                key={field.key}
                index={index}
                onRemove={() => remove(index)}
                canRemove={fields.length > 1}
              />
            ))}
          </div>

          <Button
            htmlType="button"
            type="quaternary"
            theme="outline"
            size="small"
            className="ml-1 w-fit"
            onClick={() => append({ kind: PolicyBindingSubjectKind.User, name: '', uid: '' })}>
            <Icon icon={PlusIcon} className="size-4" />
            Add
          </Button>
        </div>
      )}
    </Form.FieldArray>
  );
}

// --- Main dialog component ---

export interface PolicyBindingFormDialogRef {
  show: (initialValues?: PolicyBinding) => void;
  hide: () => void;
}

interface PolicyBindingFormDialogProps {
  orgId: string;
  scope?: 'org' | 'project';
  projectId?: string;
  /** When provided, subjects section is hidden and this subject is always used. */
  subject?: { kind: string; name: string; uid?: string };
}

export const PolicyBindingFormDialog = forwardRef<
  PolicyBindingFormDialogRef,
  PolicyBindingFormDialogProps
>(({ orgId, scope = 'org', projectId, subject }, ref) => {
  const [open, setOpen] = useState(false);
  const [defaultValues, setDefaultValues] = useState<NewPolicyBindingSchema>(CREATE_DEFAULTS);
  const [editName, setEditName] = useState('');

  const { data: project } = useProject(scope === 'project' ? (projectId ?? '') : '', {
    enabled: scope === 'project' && !!projectId,
  });

  const isEdit = !!editName;

  const onSuccess = () => {
    toast.success('Role', {
      description: isEdit
        ? 'Role has been updated successfully'
        : 'Role has been created successfully',
    });
    setOpen(false);
  };
  const onError = (error: Error) => toast.error('Error', { description: error.message });

  const createMutation = useCreatePolicyBinding(orgId, { onSuccess, onError });
  const updateMutation = useUpdatePolicyBinding(orgId, editName, { onSuccess, onError });

  const show = useCallback(
    (initialValues?: PolicyBinding) => {
      if (initialValues?.uid) {
        setEditName(initialValues.name);
        setDefaultValues({
          resource: {
            ref: `${initialValues.resourceSelector?.resourceRef?.apiGroup?.toLowerCase() ?? ''}-${initialValues.resourceSelector?.resourceRef?.kind.toLowerCase() ?? ''}`,
            name: initialValues.resourceSelector?.resourceRef?.name ?? '',
            namespace: initialValues.resourceSelector?.resourceRef?.namespace ?? '',
            uid: initialValues.resourceSelector?.resourceRef?.uid ?? '',
          },
          role: initialValues.roleRef?.name ?? '',
          roleNamespace: initialValues.roleRef?.namespace ?? '',
          subjects: initialValues.subjects.map((s) => ({
            kind: s.kind,
            name: s.name ?? '',
            uid: s.uid ?? '',
          })),
        });
      } else {
        setEditName('');
        const baseDefaults =
          scope === 'project'
            ? {
                ...CREATE_DEFAULTS,
                resource: {
                  ref: 'resourcemanager.miloapis.com-project',
                  name: projectId ?? '',
                  namespace: project?.namespace ?? '',
                  uid: project?.uid ?? '',
                },
              }
            : CREATE_DEFAULTS;
        setDefaultValues(
          subject
            ? {
                ...baseDefaults,
                subjects: [{ kind: subject.kind, name: subject.name, uid: subject.uid ?? '' }],
              }
            : baseDefaults
        );
      }
      setOpen(true);
    },
    [scope, projectId, project, subject]
  );

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = useCallback(
    async (data: NewPolicyBindingSchema) => {
      const input: CreatePolicyBindingInput = {
        resource: {
          ref: data.resource.ref,
          name: data.resource.name,
          namespace: data.resource.namespace,
          uid: data.resource.uid,
        },
        role: data.role,
        roleNamespace: data.roleNamespace,
        subjects: data.subjects.map((s) => ({
          kind: s.kind as 'User' | 'Group' | 'MachineAccount',
          name: s.name,
          uid: s.uid,
        })),
      };

      if (isEdit) {
        updateMutation.mutate(input);
      } else {
        createMutation.mutate(input);
      }
    },
    [isEdit, createMutation, updateMutation]
  );

  return (
    <Form.Dialog
      key={open ? `open-${editName || 'create'}` : 'closed'}
      open={open}
      onOpenChange={setOpen}
      title={isEdit ? 'Edit Role' : 'New Role'}
      description={
        isEdit ? 'Edit the role with the new values below.' : 'Create a new role to get started.'
      }
      schema={newPolicyBindingSchema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      loading={isPending}
      submitText={isEdit ? 'Save' : 'Create'}
      submitTextLoading={isEdit ? 'Saving...' : 'Creating...'}
      className="w-full focus:ring-0 focus:outline-none sm:max-w-2xl">
      <div className="space-y-8 px-5 py-5">
        {scope === 'project' ? (
          <HiddenResourceFields resource={defaultValues.resource} />
        ) : (
          <ResourceSection isEdit={isEdit} />
        )}
        <RoleSection isEdit={isEdit} />
        {subject ? (
          <>
            <input type="hidden" name="subjects[0].kind" value={subject.kind} onChange={() => {}} />
            <input type="hidden" name="subjects[0].name" value={subject.name} onChange={() => {}} />
            <input
              type="hidden"
              name="subjects[0].uid"
              value={subject.uid ?? ''}
              onChange={() => {}}
            />
          </>
        ) : (
          <SubjectsSection />
        )}
      </div>
    </Form.Dialog>
  );
});

PolicyBindingFormDialog.displayName = 'PolicyBindingFormDialog';
