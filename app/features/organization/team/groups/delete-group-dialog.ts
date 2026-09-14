export interface DeleteGroupDialogCopy {
  /** Extra alert shown only when members will be affected by the delete. */
  warning?: string;
  /** Groups with members are a destructive path and require typing DELETE. */
  requiresTypedConfirmation: boolean;
}

/**
 * Milo's group finalizer cascades on delete: every GroupMembership for the
 * group is removed and the group is stripped from its PolicyBindings. The
 * portal lets the delete through and makes that consequence visible instead
 * of hiding the action for groups that still have members.
 */
export function buildDeleteGroupDialogCopy(memberCount: number): DeleteGroupDialogCopy {
  if (memberCount <= 0) {
    return { requiresTypedConfirmation: false };
  }

  const noun = memberCount === 1 ? 'member' : 'members';
  return {
    warning: `${memberCount} ${noun} will be removed from this group and lose every role granted through it.`,
    requiresTypedConfirmation: true,
  };
}
