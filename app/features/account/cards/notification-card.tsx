import {
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
import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';

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

  // The form seeds itself from `defaultValues` once, at mount, so a save that
  // stored something other than what was ticked would otherwise leave the
  // boxes showing the ticks. Bumping this remounts it against what was just
  // read, whether the save succeeded or failed.
  const [formGeneration, setFormGeneration] = useState(0);

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
   * What the control plane holds right now, rather than what the last render
   * captured: a save planned from state read before the previous save
   * finished is issue #1696.
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
      const stored = await readStored();
      await applyPlan(planSubscriptionSave(data, stored, groupNames));

      // Read once more so the boxes below are drawn from what the save left
      // behind rather than from what was ticked.
      await readStored();
      toast.success('Marketing & Events Notifications updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update notification groups');
    } finally {
      setIsSubmitting(false);
      setFormGeneration((generation) => generation + 1);
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
      key={formGeneration}
      title="Marketing & Events Notifications"
      schema={schema}
      defaultValues={defaultValues}
      preferences={contactGroupPreferences}
      isLoading={isSubmitting}
      onSubmit={handleSubmit}
    />
  );
};
