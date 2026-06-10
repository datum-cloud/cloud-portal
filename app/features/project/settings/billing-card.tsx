import { getBillingAccountDisplayName } from '@/features/billing';
import {
  useBillingAccountBindings,
  useBillingAccountBindingsWatch,
  useCreateBillingAccountBinding,
} from '@/resources/billing-account-bindings';
import { useBillingAccounts, useBillingAccountsWatch } from '@/resources/billing-accounts';
import type { Project } from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { toast } from '@datum-cloud/datum-ui/toast';
import { ArrowRightIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { z } from 'zod';

const projectBillingSchema = z.object({
  billingAccountName: z
    .string({ error: 'Pick a billing account to charge this project to' })
    .min(1, 'Pick a billing account to charge this project to'),
});

type ProjectBillingValues = z.infer<typeof projectBillingSchema>;

interface ProjectBillingCardProps {
  project: Project;
  /**
   * The org the project lives under. The card needs this to scope
   * its billing-account and binding queries — projects without an
   * org id render a disabled state (defensive — shouldn't happen in
   * practice).
   */
  orgId: string | undefined;
}

/**
 * Project ↔ billing-account binding card.
 *
 * Renders the project's currently-active `BillingAccountBinding` and
 * the picker for switching it to any account in the same org. Save
 * creates a new binding — the controller marks the previous one
 * `Superseded` automatically because bindings are immutable.
 *
 * Cross-org bindings (where the funding account lives in a different
 * org) are surfaced read-only: the picker hides the dropdown and
 * shows the resource id with a deep-link to the cross-org detail
 * page, since this card only knows about accounts in `orgId`'s
 * namespace.
 *
 * All data flow goes through the resource layer — `useBillingAccounts`
 * + `useBillingAccountBindings` for reads, the matching `useXxxWatch`
 * hooks for live updates, and `useCreateBillingAccountBinding` for
 * the rebind mutation. Watch events keep the picker accurate even if
 * the org-level billing page rebinds the same project in a different
 * tab.
 */
export const ProjectBillingCard = ({ project, orgId }: ProjectBillingCardProps) => {
  const accountsQuery = useBillingAccounts(orgId);
  const bindingsQuery = useBillingAccountBindings(orgId);

  useBillingAccountsWatch(orgId);
  useBillingAccountBindingsWatch(orgId);

  const accounts = accountsQuery.data ?? [];
  const bindings = bindingsQuery.data ?? [];

  // Project bindings are immutable, so multiple historical entries
  // can exist for the same `projectRef`. Pick the active one.
  const currentBinding = useMemo(
    () =>
      bindings.find(
        (b) =>
          b.spec?.projectRef?.name === project.name &&
          (!b.status?.phase || b.status.phase === 'Active')
      ),
    [bindings, project.name]
  );

  const savedBindingName = currentBinding?.spec?.billingAccountRef?.name ?? '';
  const currentAccount = accounts.find((a) => a.metadata?.name === savedBindingName);
  // Cross-org binding — the funding account isn't in our list, so we
  // can't render its display name but we can still link to it.
  const isCrossOrgBinding = !currentAccount && savedBindingName.length > 0;

  const createBindingMutation = useCreateBillingAccountBinding({
    onSuccess: (_binding, input) => {
      const target = accounts.find((a) => a.metadata?.name === input.billingAccountName);
      toast.success('Billing account updated', {
        description: target
          ? `${project.displayName ?? project.name} will be billed against ${getBillingAccountDisplayName(target)}.`
          : 'The change will apply to upcoming invoices.',
      });
    },
    onError: (error) => {
      toast.error('Could not update billing', {
        description: error.message || 'Please try again.',
      });
    },
  });

  const handleSubmit = async (values: ProjectBillingValues) => {
    if (!orgId) return;
    await createBindingMutation.mutateAsync({
      orgId,
      projectName: project.name,
      billingAccountName: values.billingAccountName,
    });
  };

  const noAccountsAvailable = !accountsQuery.isLoading && accounts.length === 0;

  // `Form.Root` snapshots `defaultValues` at mount, so we can't let it
  // initialize until the binding has resolved — otherwise a direct
  // navigation (cold caches, org id still resolving from the project
  // context) mounts the form with an empty selection and never picks
  // up the saved account once the query lands. Gate on a resolved org
  // and settled reads, then mount the form with the real default.
  const isLoading = !orgId || accountsQuery.isLoading || bindingsQuery.isLoading;

  return (
    <Card className="gap-0 rounded-xl py-0 shadow-none">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">Billing account</CardTitle>
      </CardHeader>
      {isLoading ? (
        <>
          <CardContent className="px-5 py-4">
            <div className="flex max-w-md flex-col gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3 w-40" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t px-5 py-4">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </CardFooter>
        </>
      ) : (
        <Form.Root
          name="project-billing"
          id="project-billing-form"
          schema={projectBillingSchema}
          mode="onBlur"
          defaultValues={{ billingAccountName: savedBindingName }}
          onSubmit={handleSubmit}
          className="flex flex-col space-y-0">
          {({ form, isSubmitting }) => (
            <>
              <CardContent className="px-5 py-4">
                <div className="flex max-w-md flex-col gap-3">
                  <Form.Field
                    name="billingAccountName"
                    label="Charge invoices to"
                    description="Usage from this project will appear on the chosen account's monthly invoice."
                    required>
                    <Form.Select
                      placeholder={
                        isCrossOrgBinding
                          ? 'Funded by an account in another org'
                          : noAccountsAvailable
                            ? 'No billing accounts in this org yet'
                            : 'Select a billing account'
                      }
                      disabled={isCrossOrgBinding || noAccountsAvailable}>
                      {accounts.map((account) => (
                        <Form.SelectItem
                          key={account.metadata?.name}
                          value={account.metadata?.name ?? ''}
                          disabled={!account.metadata?.name}>
                          {getBillingAccountDisplayName(account)}
                        </Form.SelectItem>
                      ))}
                    </Form.Select>
                  </Form.Field>

                  {savedBindingName && (
                    <Link
                      to={getPathWithParams(paths.account.billing.detail.root, {
                        billingAccountId: savedBindingName,
                      })}
                      className="text-primary hover:text-primary/80 inline-flex w-fit items-center gap-1 text-xs font-medium">
                      View{' '}
                      {currentAccount ? getBillingAccountDisplayName(currentAccount) : 'account'}
                      <Icon icon={ArrowRightIcon} className="size-3" />
                    </Link>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t px-5 py-4">
                <Button
                  htmlType="button"
                  type="quaternary"
                  theme="outline"
                  size="xs"
                  disabled={isSubmitting}
                  onClick={() => form.reset()}>
                  Cancel
                </Button>
                <Form.Submit
                  size="xs"
                  loadingText="Saving"
                  disabled={isCrossOrgBinding || noAccountsAvailable}>
                  Save
                </Form.Submit>
              </CardFooter>
            </>
          )}
        </Form.Root>
      )}
    </Card>
  );
};
