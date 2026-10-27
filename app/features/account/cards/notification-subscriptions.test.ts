import {
  planSubscriptionSave,
  subscriptionTicks,
  type SubscriptionSavePlan,
  type SubscriptionState,
} from './notification-subscriptions';
import { describe, expect, it } from 'bun:test';

const membership = (contactGroupName: string, name = `m-${contactGroupName}`) =>
  ({ name, contactGroupName, namespace: 'milo-system' }) as never;

const removal = (contactGroupName: string, name = `r-${contactGroupName}`) =>
  ({ name, contactGroupName, namespace: 'milo-system' }) as never;

const isNoop = (plan: SubscriptionSavePlan) =>
  plan.deleteRemovals.length === 0 &&
  plan.createMemberships.length === 0 &&
  plan.createRemovals.length === 0;

const state = (
  memberships: SubscriptionState['memberships'],
  removals: SubscriptionState['removals'] = []
): SubscriptionState => ({ memberships, removals });

describe('subscriptionTicks', () => {
  it('ticks a group that has a membership and no removal', () => {
    expect(subscriptionTicks(['events', 'product'], state([membership('events')]))).toEqual({
      events: true,
      product: false,
    });
  });

  it('unticks a group whose removal outranks a membership still listed', () => {
    const stored = state([membership('events')], [removal('events')]);
    expect(subscriptionTicks(['events'], stored)).toEqual({ events: false });
  });
});

describe('planSubscriptionSave', () => {
  it('creates a membership for a ticked group with nothing stored', () => {
    const plan = planSubscriptionSave({ events: true }, state([]), ['events']);
    expect(plan.createMemberships).toEqual(['events']);
    expect(plan.deleteRemovals).toEqual([]);
  });

  it('creates the membership after dropping the removal that blocks it', () => {
    const plan = planSubscriptionSave({ events: true }, state([], [removal('events')]), ['events']);

    expect(plan.deleteRemovals).toEqual([
      { contactGroupName: 'events', name: 'r-events', namespace: 'milo-system' },
    ]);
    expect(plan.createMemberships).toEqual(['events']);
  });

  /** The bug in #1696: re-ticking right after an untick created nothing. */
  it('creates the membership when the one it replaces is already gone', () => {
    const plan = planSubscriptionSave({ events: true }, state([], [removal('events')]), ['events']);
    expect(plan.createMemberships).toEqual(['events']);
  });

  it('leaves a membership alone when the group is already subscribed', () => {
    const plan = planSubscriptionSave({ events: true }, state([membership('events')]), ['events']);
    expect(isNoop(plan)).toBe(true);
  });

  it('removes a subscribed group that was unticked', () => {
    const plan = planSubscriptionSave({ events: false }, state([membership('events')]), ['events']);
    expect(plan.createRemovals).toEqual(['events']);
  });

  it('does not stack a second removal on a group that already has one', () => {
    const stored = state([membership('events')], [removal('events')]);
    const plan = planSubscriptionSave({ events: false }, stored, ['events']);
    expect(isNoop(plan)).toBe(true);
  });

  it('plans each group on its own', () => {
    const stored = state([membership('product')], [removal('events')]);
    const plan = planSubscriptionSave({ events: true, product: false }, stored, [
      'events',
      'product',
    ]);

    expect(plan.deleteRemovals.map((r) => r.contactGroupName)).toEqual(['events']);
    expect(plan.createMemberships).toEqual(['events']);
    expect(plan.createRemovals).toEqual(['product']);
  });

  it('ignores groups the form did not send', () => {
    const plan = planSubscriptionSave({}, state([]), ['events']);
    expect(isNoop(plan)).toBe(true);
  });
});
