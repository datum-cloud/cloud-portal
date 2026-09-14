import { buildDeleteGroupDialogCopy } from './delete-group-dialog';
import { describe, expect, it } from 'bun:test';

describe('buildDeleteGroupDialogCopy', () => {
  it('asks a plain question for an empty group and skips typed confirmation', () => {
    const copy = buildDeleteGroupDialogCopy(0);

    expect(copy.warning).toBeUndefined();
    expect(copy.requiresTypedConfirmation).toBe(false);
  });

  it('warns with singular wording when the group has one member', () => {
    const copy = buildDeleteGroupDialogCopy(1);

    expect(copy.warning).toBe(
      '1 member will be removed from this group and lose every role granted through it.'
    );
    expect(copy.requiresTypedConfirmation).toBe(true);
  });

  it('warns with plural wording when the group has several members', () => {
    const copy = buildDeleteGroupDialogCopy(4);

    expect(copy.warning).toBe(
      '4 members will be removed from this group and lose every role granted through it.'
    );
    expect(copy.requiresTypedConfirmation).toBe(true);
  });
});
