import type {
  ContactGroupMembership,
  ContactGroupMembershipRemoval,
} from '@/resources/notifications';

/**
 * What the control plane stores for one contact's mailing lists.
 *
 * A list is subscribed when a membership exists and no removal does: a
 * ContactGroupMembershipRemoval both deletes the membership and blocks the
 * contact from being added back, so it outranks a membership that is still
 * listed while the controller works through the deletion.
 */
export interface SubscriptionState {
  memberships: ContactGroupMembership[];
  removals: ContactGroupMembershipRemoval[];
}

/** A removal to delete, carrying the namespace the delete call needs. */
export interface RemovalRef {
  contactGroupName: string;
  name: string;
  namespace?: string;
}

/**
 * The writes one save needs, in the order they must run: a removal blocks the
 * add, so the removal for a group goes before that group's membership.
 */
export interface SubscriptionSavePlan {
  deleteRemovals: RemovalRef[];
  /** Contact group names that need a membership created. */
  createMemberships: string[];
  /** Contact group names that need a removal created. */
  createRemovals: string[];
}

export interface PlanOptions {
  /**
   * Groups whose membership this save already created. A list call made right
   * after a create can still answer without it, and planning a second create
   * from that answer would leave the contact with two memberships.
   */
  skipMembershipCreateFor?: ReadonlySet<string>;
}

/** How each box should read, given what is stored. */
export function subscriptionTicks(
  groupNames: string[],
  stored: SubscriptionState
): Record<string, boolean> {
  const members = new Set(stored.memberships.map((m) => m.contactGroupName));
  const removed = new Set(stored.removals.map((r) => r.contactGroupName));

  return Object.fromEntries(
    groupNames.map((groupName) => [groupName, members.has(groupName) && !removed.has(groupName)])
  );
}

/**
 * The writes that take `stored` to `desired`.
 *
 * Planning against freshly read state is the point: deciding from the state a
 * render captured skips the create when the membership it remembers has since
 * been deleted, which leaves the box ticked and the contact off the list.
 */
export function planSubscriptionSave(
  desired: Record<string, boolean>,
  stored: SubscriptionState,
  groupNames: string[],
  options: PlanOptions = {}
): SubscriptionSavePlan {
  const membershipGroups = new Set(stored.memberships.map((m) => m.contactGroupName));
  const removalsByGroup = new Map(stored.removals.map((r) => [r.contactGroupName, r]));
  const skipCreate = options.skipMembershipCreateFor ?? new Set<string>();

  const plan: SubscriptionSavePlan = {
    deleteRemovals: [],
    createMemberships: [],
    createRemovals: [],
  };

  for (const groupName of groupNames) {
    const removal = removalsByGroup.get(groupName);
    const isMember = membershipGroups.has(groupName);

    if (desired[groupName] === true) {
      if (removal) {
        plan.deleteRemovals.push({
          contactGroupName: groupName,
          name: removal.name,
          namespace: removal.namespace,
        });
      }
      if (!isMember && !skipCreate.has(groupName)) {
        plan.createMemberships.push(groupName);
      }
      continue;
    }

    // A removal already on file does the job; a second one would only collide.
    if (isMember && !removal) {
      plan.createRemovals.push(groupName);
    }
  }

  return plan;
}

/** True when what is stored already matches what was asked for. */
export function isNoopPlan(plan: SubscriptionSavePlan): boolean {
  return (
    plan.deleteRemovals.length === 0 &&
    plan.createMemberships.length === 0 &&
    plan.createRemovals.length === 0
  );
}
