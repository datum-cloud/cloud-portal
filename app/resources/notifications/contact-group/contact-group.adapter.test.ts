import {
  toContactGroup,
  toContactGroupList,
  toCreateContactGroupPayload,
  toUpdateContactGroupPayload,
} from './contact-group.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toContactGroup', () => {
  it('maps spec fields and providers', () => {
    const raw = {
      metadata: rawMetadata({ uid: 'cg-1', name: 'oncall' }),
      spec: {
        displayName: 'On-Call',
        visibility: 'public',
        description: 'pager rotation',
        providers: [{ id: 'p1', name: 'Loops', extra: 'x' }],
      },
    };
    const group = toContactGroup(raw as never);

    expect(group.displayName).toBe('On-Call');
    expect(group.visibility).toBe('public');
    expect(group.description).toBe('pager rotation');
    expect(group.providers).toEqual([{ id: 'p1', name: 'Loops' }]);
  });

  it('defaults displayName to name and visibility to private', () => {
    const group = toContactGroup({ metadata: rawMetadata({ name: 'team' }), spec: {} } as never);
    expect(group.displayName).toBe('team');
    expect(group.visibility).toBe('private');
    expect(group.providers).toBeUndefined();
  });
});

describe('toContactGroupList', () => {
  it('reads the cursor from metadata.continue', () => {
    const list = toContactGroupList({
      items: [{ metadata: { uid: 'a' }, spec: {} }],
      metadata: { continue: 'c' },
    } as never);
    expect(list.items[0].uid).toBe('a');
    expect(list.nextCursor).toBe('c');
  });
});

describe('toCreateContactGroupPayload', () => {
  it('includes providers only when provided', () => {
    const withProviders = toCreateContactGroupPayload({
      name: 'oncall',
      displayName: 'On-Call',
      visibility: 'public',
      providers: [{ id: 'p1', name: 'Loops' }],
    } as never);
    expect(withProviders.spec?.providers).toEqual([{ id: 'p1', name: 'Loops' }]);

    const without = toCreateContactGroupPayload({
      name: 'oncall',
      displayName: 'On-Call',
      visibility: 'private',
    } as never);
    expect(without.spec).toEqual({ displayName: 'On-Call', visibility: 'private' });
  });
});

describe('toUpdateContactGroupPayload', () => {
  it('patches resourceVersion plus only the provided spec fields', () => {
    expect(
      toUpdateContactGroupPayload({ resourceVersion: '9', displayName: 'New' } as never)
    ).toEqual({ metadata: { resourceVersion: '9' }, spec: { displayName: 'New' } });
  });

  it('omits spec when only resourceVersion is provided', () => {
    expect(toUpdateContactGroupPayload({ resourceVersion: '9' } as never)).toEqual({
      metadata: { resourceVersion: '9' },
    });
  });
});
