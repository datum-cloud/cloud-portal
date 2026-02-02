import {
  NotificationSettingsCard,
  NotificationSettingsCardSkeleton,
} from '@/components/notification-settings';
import type { NotificationPreference } from '@/components/notification-settings';
import {
  useCreateNotificationContactGroupMembership,
  useCreateNotificationContactGroupMembershipRemoval,
  useNotificationContactGroupMemberships,
  useNotificationContactGroupMembershipRemovals,
  useNotificationContactGroups,
  useNotificationContacts,
  useDeleteNotificationContactGroupMembershipRemoval,
} from '@/resources/notifications';
import { generateId } from '@/utils/helpers/text.helper';
import { toast } from '@datum-ui/components';
import { useMemo } from 'react';
import { z } from 'zod';

export const AccountNotificationSettingsCard = () => {
  const scope = { type: 'user' as const };

  const { data: contactGroups } = useNotificationContactGroups(scope);
  const { data: contactGroupMemberships } = useNotificationContactGroupMemberships(scope);
  const { data: contactGroupMembershipRemovals } =
    useNotificationContactGroupMembershipRemovals(scope);
  const { data: contacts } = useNotificationContacts(scope);
  const createMembership = useCreateNotificationContactGroupMembership(scope, {
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const createRemoval = useCreateNotificationContactGroupMembershipRemoval(scope, {
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const deleteRemoval = useDeleteNotificationContactGroupMembershipRemoval(scope, {
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const contactGroupPreferences: NotificationPreference[] = useMemo(
    () =>
      (contactGroups ?? []).map((contactGroup) => ({
        name: contactGroup.name,
        label: contactGroup.displayName,
        description: '',
      })),
    [contactGroups]
  );

  const schema = useMemo((): z.ZodObject<Record<string, z.ZodType<boolean>>> => {
    const shape = Object.fromEntries(
      (contactGroups ?? []).map((group) => [group.name, z.boolean().default(false)])
    ) as Record<string, z.ZodType<boolean>>;

    return z.object(shape);
  }, [contactGroups]);

  const defaultValues = useMemo(() => {
    const membershipGroupNames = new Set(
      (contactGroupMemberships ?? []).map((m) => m.contactGroupName)
    );
    const removalGroupNames = new Set(
      (contactGroupMembershipRemovals ?? []).map((r) => r.contactGroupName)
    );

    return Object.fromEntries(
      (contactGroups ?? []).map((group) => [
        group.name,
        membershipGroupNames.has(group.name) && !removalGroupNames.has(group.name),
      ])
    ) as Record<string, boolean>;
  }, [contactGroups, contactGroupMemberships, contactGroupMembershipRemovals]);

  const contactContext = useMemo(() => {
    const contactName =
      contactGroupMemberships?.[0]?.contactName ??
      contactGroupMembershipRemovals?.[0]?.contactName ??
      contacts?.[0]?.name ??
      '';
    const namespace =
      contactGroupMemberships?.[0]?.namespace ??
      contactGroupMembershipRemovals?.[0]?.namespace ??
      contacts?.[0]?.namespace;
    return { contactName, namespace };
  }, [contacts, contactGroupMemberships, contactGroupMembershipRemovals]);

  const isSaving = createMembership.isPending || createRemoval.isPending || deleteRemoval.isPending;

  const isReady =
    !!contactGroups &&
    contactGroupMemberships !== undefined &&
    contactGroupMembershipRemovals !== undefined;

  const handleSubmit = async (data: Record<string, boolean>) => {
    try {
      const { contactName, namespace } = contactContext;

      if (!contactName) {
        toast.error('Unable to update notification groups', {
          description: 'No contact was found for this user.',
        });
        return;
      }

      const allGroupNames = (contactGroups ?? []).map((g) => g.name);

      const desiredGroupNames = Object.entries(data)
        .filter(([, enabled]) => enabled === true)
        .map(([groupName]) => groupName);

      const desiredSet = new Set(desiredGroupNames);

      const existingMembershipGroupNames = new Set(
        (contactGroupMemberships ?? []).map((m) => m.contactGroupName)
      );

      // In user scope we effectively care about "is this group removed at all?"
      // Using groupName-only avoids contactName mismatches between queries/mutations.
      const removalByGroupName = new Map(
        (contactGroupMembershipRemovals ?? []).map((r) => [
          r.contactGroupName,
          { name: r.name, namespace: r.namespace },
        ])
      );

      const toEnable = allGroupNames.filter((groupName) => desiredSet.has(groupName));
      const toDisable = allGroupNames.filter((groupName) => !desiredSet.has(groupName));

      await Promise.all(
        toEnable.map(async (contactGroupName) => {
          const removal = removalByGroupName.get(contactGroupName);
          if (removal) {
            await deleteRemoval.mutateAsync({
              name: removal.name,
              namespace: removal.namespace,
            });
          }

          if (!existingMembershipGroupNames.has(contactGroupName)) {
            await createMembership.mutateAsync({
              name: generateId(contactGroupName),
              contactGroupName,
              contactName,
              namespace,
            });
          }
        })
      );

      await Promise.all(
        toDisable.map(async (contactGroupName) => {
          // Mark as removed (instead of deleting the membership) so re-selecting
          // requires deleting the removal record.
          if (!existingMembershipGroupNames.has(contactGroupName)) return;
          if (removalByGroupName.has(contactGroupName)) return;

          await createRemoval.mutateAsync({
            name: generateId(contactGroupName, { prefix: 'cgmr' }),
            contactGroupName,
            contactName,
            namespace,
          });
        })
      );
    } catch {
      // errors are surfaced via the mutation onError handlers
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
      title="Marketing & Events Notifications"
      schema={schema}
      defaultValues={defaultValues}
      preferences={contactGroupPreferences}
      isLoading={isSaving}
      onSubmit={handleSubmit}
    />
  );
};
