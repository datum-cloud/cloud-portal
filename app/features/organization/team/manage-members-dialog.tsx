import {
  useCreateGroupMembership,
  useDeleteGroupMembership,
  useGroupMemberships,
} from '@/resources/group-memberships';
import { useMembers } from '@/resources/members';
import { getMemberDisplayName } from '@/utils/helpers/member.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import { toast } from '@datum-cloud/datum-ui/toast';
import { SearchIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  groupNamespace: string;
  orgId: string;
};

export function ManageMembersDialog({
  open,
  onOpenChange,
  groupName,
  groupNamespace,
  orgId,
}: Props) {
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: allMembers = [] } = useMembers(orgId);
  const { data: memberships = [] } = useGroupMemberships(orgId);

  const createMembership = useCreateGroupMembership(orgId);
  const deleteMembership = useDeleteGroupMembership(orgId);

  // Set of user IDs currently in this group
  const currentMemberIds = useMemo(
    () =>
      new Set(memberships.filter((m) => m.groupRef.name === groupName).map((m) => m.userRef.name)),
    [memberships, groupName]
  );

  // Track pending toggles (user ID → add or remove)
  const [pending, setPending] = useState<Map<string, 'add' | 'remove'>>(new Map());

  useEffect(() => {
    if (open) {
      setPending(new Map());
      setSearch('');
    }
  }, [open]);

  const isInGroup = (userId: string) => {
    if (pending.has(userId)) return pending.get(userId) === 'add';
    return currentMemberIds.has(userId);
  };

  const toggle = (userId: string) => {
    setPending((prev) => {
      const next = new Map(prev);
      const current = currentMemberIds.has(userId);
      const pendingOp = next.get(userId);

      if (pendingOp) {
        // Revert to original state
        next.delete(userId);
      } else {
        next.set(userId, current ? 'remove' : 'add');
      }
      return next;
    });
  };

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return allMembers;
    const q = search.toLowerCase();
    return allMembers.filter(
      (m) =>
        getMemberDisplayName(m).toLowerCase().includes(q) ||
        (m.user.email ?? '').toLowerCase().includes(q)
    );
  }, [allMembers, search]);

  const pendingCount = pending.size;

  const handleSave = async () => {
    if (pendingCount === 0) {
      onOpenChange(false);
      return;
    }
    setSaving(true);

    const entries = Array.from(pending.entries());
    const ops = entries.map(([userId, op]) => {
      if (op === 'add') {
        return createMembership.mutateAsync({
          groupName,
          groupNamespace,
          userRefName: userId,
        });
      } else {
        const membership = memberships.find(
          (m) => m.groupRef.name === groupName && m.userRef.name === userId
        );
        if (!membership)
          return Promise.reject(new Error(`Membership for user ${userId} not found`));
        return deleteMembership.mutateAsync(membership.name);
      }
    });

    const results = await Promise.allSettled(ops);
    setSaving(false);

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      // Remove successful entries from pending so the user only sees what still needs saving
      const successfulUserIds = new Set(
        entries.filter((_, i) => results[i].status === 'fulfilled').map(([userId]) => userId)
      );
      setPending((prev) => {
        const next = new Map(prev);
        for (const userId of successfulUserIds) next.delete(userId);
        return next;
      });
      toast.error(
        `${failures.length} of ${ops.length} change${ops.length !== 1 ? 's' : ''} failed to save`
      );
    } else {
      setPending(new Map());
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setPending(new Map());
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <Dialog.Content className="max-h-[70vh] sm:max-w-md">
        <Dialog.Header
          title="Manage Members"
          description={`Add or remove members from the ${groupName} group.`}
          onClose={handleClose}
        />

        <Dialog.Body className="flex flex-col gap-0 py-0">
          {/* Search */}
          <div className="border-b px-5 py-3">
            <div className="relative">
              <Icon
                icon={SearchIcon}
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
              />
              <Input
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-9 text-sm"
              />
            </div>
          </div>

          {/* Member list */}
          <ul className="max-h-72 overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <li className="text-muted-foreground px-5 py-6 text-center text-sm">
                No members found.
              </li>
            ) : (
              filteredMembers.map((member) => {
                const inGroup = isInGroup(member.user.id);
                const displayName = getMemberDisplayName(member);
                return (
                  <li key={member.user.id}>
                    <button
                      type="button"
                      onClick={() => toggle(member.user.id)}
                      className="hover:bg-muted flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors">
                      <Checkbox
                        checked={inGroup}
                        onCheckedChange={() => {}}
                        className="size-4 shrink-0"
                        tabIndex={-1}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-medium">
                          {displayName}
                        </p>
                        {member.user.email && displayName !== member.user.email && (
                          <p className="text-muted-foreground truncate text-xs">
                            {member.user.email}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </Dialog.Body>

        <Dialog.Footer>
          <Button type="secondary" size="small" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" size="small" onClick={handleSave} disabled={saving}>
            {saving
              ? 'Saving...'
              : pendingCount > 0
                ? `Save ${pendingCount} change${pendingCount !== 1 ? 's' : ''}`
                : 'Done'}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
