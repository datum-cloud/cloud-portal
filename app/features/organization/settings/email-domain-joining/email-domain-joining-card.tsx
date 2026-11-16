import { DomainPicker } from './domain-picker';
import {
  emailDomainJoiningErrorMessage,
  emailDomainJoiningFormSchema,
  type EmailDomainJoiningFormValues,
} from './email-domain-joining.schema';
import { useOrganizationDomains } from './organization-domains';
import { BadgeStatus } from '@/components/badge/badge-status';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { OwnerOnlyNote } from '@/features/organization/settings/owner-only-note';
import { RoleFieldContent } from '@/features/organization/team/invitation-form';
import { isEmailDomainOffer, useInvitations } from '@/resources/invitations';
import {
  type Organization,
  type OrganizationEmailDomainJoining,
  useOrganization,
  useUpdateOrganizationEmailDomainJoining,
} from '@/resources/organizations';
import { toStringArray } from '@/utils/helpers/form-value.helper';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useMemo, useState } from 'react';

/** How long to poll for milo's EmailDomainsVerified condition after a save. */
const RECHECK_WINDOW_MS = 30_000;
const RECHECK_INTERVAL_MS = 3_000;

/**
 * Edits `Organization.spec.emailDomainJoining`: the email domains whose people
 * may join without an invitation, and the role they get. Milo checks each
 * domain against the verified Domains in the organization's projects, rejects
 * public email providers, and reports the result in the EmailDomainsVerified
 * condition. Only the organization's owners can edit (`canEdit`); everyone
 * else sees the fields and buttons disabled.
 */
export const EmailDomainJoiningCard = ({
  organization,
  canEdit,
}: {
  organization: Organization;
  canEdit: boolean;
}) => {
  const orgId = organization.name;
  const { confirm } = useConfirmationDialog();
  const [savedAt, setSavedAt] = useState<number>();

  // Milo sets the condition shortly after a save, so poll for a little while.
  const { data: org = organization } = useOrganization(orgId, {
    initialData: organization,
    refetchInterval: () =>
      savedAt !== undefined && Date.now() - savedAt < RECHECK_WINDOW_MS
        ? RECHECK_INTERVAL_MS
        : false,
  });
  const joining = org.emailDomainJoining;
  const organizationDomains = useOrganizationDomains(orgId);
  const verified = org.emailDomainsVerified;

  const { data: invitations = [] } = useInvitations(orgId, { enabled: !!joining });
  const pendingOffers = useMemo(
    () =>
      invitations.filter(
        (invitation) => invitation.state === 'Pending' && isEmailDomainOffer(invitation)
      ).length,
    [invitations]
  );

  const update = useUpdateOrganizationEmailDomainJoining(orgId, {
    onSuccess: (_data, variables) => {
      setSavedAt(Date.now());
      if (variables === null) {
        toast.success('People can no longer join by email domain');
      } else {
        toast.success('Allowed email domains saved');
      }
    },
    onError: (error) => {
      toast.error("Couldn't save allowed email domains", {
        description: emailDomainJoiningErrorMessage(error),
      });
    },
  });

  const defaultValues = useMemo<Partial<EmailDomainJoiningFormValues>>(
    () => ({
      domains: joining?.domains ?? [],
      role: joining?.roles[0]?.name ?? '',
      roleNamespace: joining?.roles[0]?.namespace ?? '',
    }),
    [joining]
  );

  // What the owner has picked since the form last loaded, for enabling Cancel.
  // The form's own isDirty can't be used: the domain list is set without an
  // input, so the adapter reports it changed before anyone touches it. The
  // draft belongs to one saved setting (formKey) and is dropped when it changes.
  const formKey = JSON.stringify(joining ?? null);
  const [draft, setDraft] = useState<{ key: string; domains?: string[]; role?: string }>({
    key: formKey,
  });
  const current = draft.key === formKey ? draft : { key: formKey };
  const savedDomains = defaultValues.domains ?? [];
  const isDirty =
    (current.domains !== undefined &&
      (current.domains.length !== savedDomains.length ||
        current.domains.some((domain) => !savedDomains.includes(domain)))) ||
    (current.role !== undefined && current.role !== (defaultValues.role ?? ''));

  const turnOff = () =>
    confirm({
      title: 'Turn off email domain joining',
      description: (
        <span>
          People at {joining?.domains.join(', ')} will need an invitation to join. Offers they
          haven&apos;t accepted yet are withdrawn. Current members keep their access.
        </span>
      ),
      submitText: 'Turn off',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: false,
      onSubmit: async () => {
        await update.mutateAsync(null);
      },
    });

  return (
    <Card size="sm" sectioned className="relative">
      <CardHeader size="sm" bordered className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">Allowed email domains</CardTitle>
        {joining && <JoiningStatusBadge status={verified?.status} />}
      </CardHeader>
      <Form.Root
        // Remount after a save so the fields show what was stored.
        key={formKey}
        name="update-email-domain-joining"
        id="update-email-domain-joining-form"
        schema={emailDomainJoiningFormSchema}
        mode="onBlur"
        defaultValues={defaultValues}
        isSubmitting={update.isPending}
        onSubmit={(values) => {
          const next: OrganizationEmailDomainJoining = {
            domains: values.domains,
            roles: [{ name: values.role, namespace: values.roleNamespace || undefined }],
          };
          update.mutate(next);
        }}
        className="flex flex-col space-y-0">
        {({ form, isSubmitting }) => (
          <fieldset disabled={!canEdit} className="contents">
            <CardContent className="flex flex-col gap-6">
              <Text as="p" size="sm" textColor="muted">
                Anyone who signs in with a confirmed email address at these domains can join this
                organization without an invitation. Owners get an email when someone joins.
              </Text>

              {joining && verified?.status === 'False' && (
                <Alert variant="warning">
                  <AlertTitle className="text-sm">People can&apos;t join right now</AlertTitle>
                  <AlertDescription>{verified.message}</AlertDescription>
                </Alert>
              )}

              {joining && pendingOffers > 0 && (
                <Text as="p" size="sm">
                  {pendingOffers === 1
                    ? '1 person at these domains hasn’t joined yet.'
                    : `${pendingOffers} people at these domains haven’t joined yet.`}
                </Text>
              )}

              {/* Two columns on wide screens, like the Contact card. Each hint
                  sits under its label rather than in `description`, so the
                  columns line up and the domain list's unverified toggle
                  doesn't separate the hint from its label. */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr] lg:gap-8">
                <Form.Field name="domains" label="Domains" required>
                  {({ control }) => (
                    <div className="flex flex-col gap-2">
                      <Text as="p" size="xs" textColor="muted">
                        Choose from the domains verified in this organization&apos;s projects.
                      </Text>
                      <DomainPicker
                        orgId={orgId}
                        domains={organizationDomains.domains}
                        isLoading={organizationDomains.isLoading}
                        failedProjects={organizationDomains.failedProjects}
                        value={toStringArray(control.value)}
                        onChange={(domains) => {
                          control.change(domains);
                          setDraft({ ...current, domains });
                        }}
                        disabled={!canEdit || isSubmitting}
                      />
                    </div>
                  )}
                </Form.Field>

                <Form.Field name="role" label="Role" required>
                  {({ control, ...rest }) => (
                    <div className="flex flex-col gap-2">
                      <Text as="p" size="xs" textColor="muted">
                        People who join this way get this role.
                      </Text>
                      <RoleFieldContent
                        {...rest}
                        control={{
                          ...control,
                          change: (role: unknown) => {
                            control.change(role);
                            setDraft({ ...current, role: typeof role === 'string' ? role : '' });
                          },
                        }}
                      />
                    </div>
                  )}
                </Form.Field>
              </div>
            </CardContent>
            <CardFooter
              bordered
              className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <div className="flex">
                {joining && (
                  <Button
                    htmlType="button"
                    type="danger"
                    theme="outline"
                    size="xs"
                    disabled={isSubmitting}
                    onClick={() => void turnOff()}
                    data-e2e="email-domain-joining-turn-off">
                    Turn off
                  </Button>
                )}
                {!canEdit && <OwnerOnlyNote />}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  htmlType="button"
                  type="quaternary"
                  theme="outline"
                  disabled={isSubmitting || !isDirty}
                  size="xs"
                  onClick={() => {
                    form.reset();
                    setDraft({ key: formKey });
                  }}>
                  Cancel
                </Button>
                <Form.Submit size="xs" loadingText="Saving" data-e2e="email-domain-joining-save">
                  {joining ? 'Save' : 'Turn on'}
                </Form.Submit>
              </div>
            </CardFooter>
          </fieldset>
        )}
      </Form.Root>
    </Card>
  );
};

function JoiningStatusBadge({ status }: { status?: 'True' | 'False' | 'Unknown' }) {
  if (status === 'True') {
    return <BadgeStatus status="active" label="On" />;
  }
  if (status === 'False') {
    return <BadgeStatus status="suspended" label="Paused" />;
  }
  return <BadgeStatus status="pending" label="Checking" />;
}
