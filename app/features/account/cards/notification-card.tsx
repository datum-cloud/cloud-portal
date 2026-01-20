import { NotificationSettingsCard } from '@/components/notification-settings';
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

  const contactName = useMemo(() => {
    return (
      contactGroupMemberships?.[0]?.contactName ??
      contactGroupMembershipRemovals?.[0]?.contactName ??
      contacts?.[0]?.name ??
      ''
    );
  }, [contacts, contactGroupMemberships, contactGroupMembershipRemovals]);

  const isSaving = createMembership.isPending || createRemoval.isPending || deleteRemoval.isPending;

  const isReady =
    !!contactGroups &&
    contactGroupMemberships !== undefined &&
    contactGroupMembershipRemovals !== undefined;

  // TODO: Add a loading state
  if (!isReady) return null;

  return (
    <NotificationSettingsCard
      title="Marketing & Events"
      schema={schema}
      defaultValues={defaultValues}
      preferences={contactGroupPreferences}
      isLoading={isSaving}
      onSubmit={async (data) => {
        // TODO: Refactor this mess
        try {
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
            (contactGroupMembershipRemovals ?? []).map((r) => [r.contactGroupName, r.name] as const)
          );

          const toEnable = allGroupNames.filter((groupName) => desiredSet.has(groupName));
          const toDisable = allGroupNames.filter((groupName) => !desiredSet.has(groupName));

          await Promise.all(
            toEnable.map(async (contactGroupName) => {
              const removalName = removalByGroupName.get(contactGroupName);
              if (removalName) {
                await deleteRemoval.mutateAsync(removalName);
              }

              if (!existingMembershipGroupNames.has(contactGroupName)) {
                await createMembership.mutateAsync({
                  name: generateId(contactGroupName),
                  contactGroupName,
                  contactName,
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
              });
            })
          );
        } catch {
          // errors are surfaced via the mutation onError handlers
        }
      }}
    />
  );
};
