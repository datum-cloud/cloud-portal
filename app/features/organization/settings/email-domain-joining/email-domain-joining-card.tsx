import { DomainPicker } from './domain-picker';
import {
  emailDomainJoiningErrorMessage,
  emailDomainJoiningFormSchema,
  type EmailDomainJoiningFormValues,
} from './email-domain-joining.schema';
import { useOrganizationDomains } from './organization-domains';
import { BadgeStatus } from '@/components/badge/badge-status';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import { RoleFieldContent } from '@/features/organization/team/invitation-form';
import { useAccessReview } from '@/modules/rbac';
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
import { LoaderOverlay } from '@datum-cloud/datum-ui/loader-overlay';
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
 * condition. Gated behind `organizations:patch` like the settings cards.
 */
export const EmailDomainJoiningCard = ({ organization }: { organization: Organization }) => {
  const orgId = organization.name;
  const { confirm } = useConfirmationDialog();
  const [savedAt, setSavedAt] = useState<number>();
  const [saveError, setSaveError] = useState<string>();

  const { allowed: canEdit, isLoading: permLoading } = useAccessReview('organizations', 'patch', {
    group: 'resourcemanager.miloapis.com',
    name: orgId,
    scope: 'user',
  });

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
    onMutate: () => setSaveError(undefined),
    onSuccess: (_data, variables) => {
      setSavedAt(Date.now());
      if (variables === null) {
        toast.success('People can no longer join by email domain');
      } else {
        toast.success('Allowed email domains saved');
      }
    },
    onError: (error) => setSaveError(emailDomainJoiningErrorMessage(error)),
  });

  const defaultValues = useMemo<Partial<EmailDomainJoiningFormValues>>(
    () => ({
      domains: joining?.domains ?? [],
      role: joining?.roles[0]?.name ?? '',
      roleNamespace: joining?.roles[0]?.namespace ?? '',
    }),
    [joining]
  );

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
      {permLoading ? (
        <LoaderOverlay />
      ) : (
        !canEdit && (
          <RestrictedOverlay message="You don't have permission to change how people join this organization" />
        )
      )}
      <CardHeader size="sm" bordered className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">Allowed email domains</CardTitle>
        {joining && <JoiningStatusBadge status={verified?.status} />}
      </CardHeader>
      <Form.Root
        // Remount after a save so the fields show what was stored.
        key={JSON.stringify(joining ?? null)}
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
          <>
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

              <Form.Field
                name="domains"
                label="Domains"
                required
                description="Choose from the domains verified in this organization's projects.">
                {({ control }) => (
                  <DomainPicker
                    orgId={orgId}
                    domains={organizationDomains.domains}
                    isLoading={organizationDomains.isLoading}
                    failedProjects={organizationDomains.failedProjects}
                    value={toStringArray(control.value)}
                    onChange={control.change}
                    disabled={!canEdit || isSubmitting}
                  />
                )}
              </Form.Field>

              <Form.Field
                name="role"
                label="Role"
                required
                description="People who join this way get this role.">
                {(props) => (
                  <div className="sm:max-w-xs">
                    <RoleFieldContent {...props} />
                  </div>
                )}
              </Form.Field>

              {saveError && (
                <Alert variant="destructive">
                  <AlertTitle className="text-sm">Couldn&apos;t save</AlertTitle>
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            {!permLoading && canEdit && (
              <CardFooter
                bordered
                className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <div>
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
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button
                    htmlType="button"
                    type="quaternary"
                    theme="outline"
                    disabled={isSubmitting}
                    size="xs"
                    onClick={() => {
                      setSaveError(undefined);
                      form.reset();
                    }}>
                    Cancel
                  </Button>
                  <Form.Submit size="xs" loadingText="Saving" data-e2e="email-domain-joining-save">
                    {joining ? 'Save' : 'Turn on'}
                  </Form.Submit>
                </div>
              </CardFooter>
            )}
          </>
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
