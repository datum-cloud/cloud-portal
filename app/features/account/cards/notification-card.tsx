import {
  isNoopPlan,
  planSubscriptionSave,
  subscriptionTicks,
  type SubscriptionSavePlan,
  type SubscriptionState,
} from './notification-subscriptions';
import {
  NotificationSettingsCard,
  NotificationSettingsCardSkeleton,
} from '@/components/notification-settings';
import type { NotificationPreference } from '@/components/notification-settings';
import {
  createNotificationContactGroupMembershipRemovalService,
  createNotificationContactGroupMembershipService,
  notificationContactGroupMembershipKeys,
  notificationContactGroupMembershipRemovalKeys,
  notificationScopeKey,
  useCreateNotificationContactGroupMembership,
  useCreateNotificationContactGroupMembershipRemoval,
  useNotificationContactGroupMemberships,
  useNotificationContactGroupMembershipRemovals,
  useNotificationContactGroups,
  useNotificationContacts,
  useDeleteNotificationContactGroupMembershipRemoval,
  DEFAULT_NOTIFICATION_NAMESPACE,
  type NotificationScope,
} from '@/resources/notifications';
import { generateId } from '@/utils/helpers/text.helper';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

/**
 * How many rounds of writes one save may make. The second round exists so a
 * list that answered before the controller finished the first round still
 * ends up matching the boxes; a third would only spin against a control plane
 * that is not settling.
 */
const MAX_WRITE_ROUNDS = 2;

export const AccountNotificationSettingsCard = () => {
  const scope = useMemo((): NotificationScope => ({ type: 'user' }), []);
  const scopeKey = notificationScopeKey(scope);
  const queryClient = useQueryClient();

  const { data: contactGroups } = useNotificationContactGroups(scope);
  const { data: contactGroupMemberships } = useNotificationContactGroupMemberships(scope);
  const { data: contactGroupMembershipRemovals } =
    useNotificationContactGroupMembershipRemovals(scope);
  const { data: contacts } = useNotificationContacts(scope);

  // Mutations report through the single toast this card raises once the save
  // has settled, so none of them announce a step of their own.
  const createMembership = useCreateNotificationContactGroupMembership(scope);
  const createRemoval = useCreateNotificationContactGroupMembershipRemoval(scope);
  const deleteRemoval = useDeleteNotificationContactGroupMembershipRemoval(scope);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const contactGroupPreferences: NotificationPreference[] = useMemo(
    () =>
      (contactGroups ?? []).map((contactGroup) => ({
        name: contactGroup.name,
        label: contactGroup.displayName,
        description: contactGroup.description ?? '',
      })),
    [contactGroups]
  );

  const schema = useMemo((): z.ZodObject<Record<string, z.ZodType<boolean>>> => {
    const shape = Object.fromEntries(
      (contactGroups ?? []).map((group) => [group.name, z.boolean().default(false)])
    ) as Record<string, z.ZodType<boolean>>;

    return z.object(shape);
  }, [contactGroups]);

  const groupNames = useMemo(() => (contactGroups ?? []).map((g) => g.name), [contactGroups]);

  const defaultValues = useMemo(
    () =>
      subscriptionTicks(groupNames, {
        memberships: contactGroupMemberships ?? [],
        removals: contactGroupMembershipRemovals ?? [],
      }),
    [groupNames, contactGroupMemberships, contactGroupMembershipRemovals]
  );

  // The form seeds itself from `defaultValues` once, at mount. Remounting it
  // on a change is what puts the boxes back in step with what is stored after
  // a save; holding the key still while submitting keeps the form from
  // disappearing under its own in-flight save.
  const storedKey = useMemo(
    () =>
      Object.entries(defaultValues)
        .map(([name, on]) => `${name}:${on ? 1 : 0}`)
        .join('|'),
    [defaultValues]
  );
  const [formKey, setFormKey] = useState(storedKey);
  useEffect(() => {
    if (isSubmitting) return;
    setFormKey(storedKey);
  }, [isSubmitting, storedKey]);

  const contactContext = useMemo(() => {
    const contactName = contacts?.[0]?.name;
    const namespace = contacts?.[0]?.namespace;
    return { contactName, namespace };
  }, [contacts]);

  const isReady =
    !!contactGroups &&
    contactGroupMemberships !== undefined &&
    contactGroupMembershipRemovals !== undefined;

  /**
   * What the control plane holds right now. Read on every pass rather than
   * taken from the render: a save decided from state captured before the last
   * one finished is the whole of issue #1696.
   */
  const readStored = useCallback(async (): Promise<SubscriptionState> => {
    // Called rather than fetched through the query cache: `fetchQuery` would
    // hand back a request that a mutation's invalidate already had in flight,
    // and this has to be an answer from after the write it follows.
    const [memberships, removals] = await Promise.all([
      createNotificationContactGroupMembershipService().list(scope),
      createNotificationContactGroupMembershipRemovalService().list(scope),
    ]);

    // Seeding the cache is what re-seeds the form: the boxes read from these
    // two queries.
    queryClient.setQueryData(
      notificationContactGroupMembershipKeys.list(scopeKey, DEFAULT_NOTIFICATION_NAMESPACE),
      memberships
    );
    queryClient.setQueryData(
      notificationContactGroupMembershipRemovalKeys.list(scopeKey, DEFAULT_NOTIFICATION_NAMESPACE),
      removals
    );

    return { memberships, removals };
  }, [queryClient, scope, scopeKey]);

  const handleSubmit = async (data: Record<string, boolean>) => {
    const { contactName, namespace: contactNamespace } = contactContext;

    if (!contactName || !contactNamespace) {
      toast.error('Unable to update notification groups', {
        description: 'No contact was found for this user.',
      });
      return;
    }

    const groupNamespaceByName = new Map(
      (contactGroups ?? []).map((g) => [g.name, g.namespace] as const)
    );
    const createdMemberships = new Set<string>();

    const applyPlan = async (plan: SubscriptionSavePlan) => {
      // One write at a time, in plan order: a group's removal has to be gone
      // before its membership is created, or the create is blocked.
      for (const removal of plan.deleteRemovals) {
        await deleteRemoval.mutateAsync({
          name: removal.name,
          namespace: removal.namespace ?? groupNamespaceByName.get(removal.contactGroupName),
        });
      }

      for (const contactGroupName of plan.createMemberships) {
        await createMembership.mutateAsync({
          name: generateId(contactGroupName),
          contactGroupName,
          contactName,
          namespace: groupNamespaceByName.get(contactGroupName),
          contactNamespace,
        });
        createdMemberships.add(contactGroupName);
      }

      for (const contactGroupName of plan.createRemovals) {
        await createRemoval.mutateAsync({
          name: generateId(contactGroupName, { prefix: 'cgmr' }),
          contactGroupName,
          contactName,
          namespace: groupNamespaceByName.get(contactGroupName),
          contactNamespace,
        });
      }
    };

    setIsSubmitting(true);
    try {
      let stored = await readStored();
      let settled = false;

      for (let round = 0; round <= MAX_WRITE_ROUNDS; round++) {
        const plan = planSubscriptionSave(data, stored, groupNames, {
          skipMembershipCreateFor: createdMemberships,
        });

        if (isNoopPlan(plan)) {
          settled = true;
          break;
        }

        if (round === MAX_WRITE_ROUNDS) break;

        await applyPlan(plan);
        stored = await readStored();
      }

      if (settled) {
        toast.success('Marketing & Events Notifications updated');
      } else {
        toast.error('Marketing & Events Notifications may not be fully saved', {
          description: 'Reload the page to see which lists were stored.',
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update notification groups');
    } finally {
      // Clearing this last lets the effect above remount the form, which is
      // what puts the boxes back in step with the state just read.
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return (
      <NotificationSettingsCardSkeleton
        title="Marketing & Events Notifications"
        count={3}
        showDescription={false}
      />
    );
  }

  return (
    <NotificationSettingsCard
      key={formKey}
      title="Marketing & Events Notifications"
      schema={schema}
      defaultValues={defaultValues}
      preferences={contactGroupPreferences}
      isLoading={isSubmitting}
      onSubmit={handleSubmit}
    />
  );
};
