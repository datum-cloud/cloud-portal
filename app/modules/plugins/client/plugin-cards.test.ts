import { collectHomeCards, isEntitled } from './plugin-cards';
import type { PublicPlugin } from '@/modules/plugins/types';
import { EXTENSION_CARD_PROJECT_HOME } from '@/modules/plugins/types';
import { describe, expect, test } from 'bun:test';

function plugin(partial: { slug: string; serviceRef?: string }): PublicPlugin {
  return {
    slug: partial.slug,
    displayName: partial.slug,
    deprecated: false,
    devMode: true,
    source: 'static',
    manifest: {
      name: partial.slug,
      version: '1.0.0',
      remoteEntry: 'remoteEntry.js',
      exposedModules: {},
      extensions: [
        {
          type: EXTENSION_CARD_PROJECT_HOME,
          properties: {
            title: 'New In Compute',
            component: { $codeRef: 'HomeCard' },
          },
          requirements: partial.serviceRef ? { serviceRef: partial.serviceRef } : undefined,
        },
      ],
    },
  };
}

describe('isEntitled', () => {
  test('renders unconditionally when the card declares no serviceRef', () => {
    const [card] = collectHomeCards([plugin({ slug: 'sample' })]);
    expect(isEntitled(card, new Set())).toBe(true);
  });

  test('renders once the project has a matching Active ServiceEntitlement', () => {
    const [card] = collectHomeCards([
      plugin({ slug: 'compute', serviceRef: 'compute.datumapis.com' }),
    ]);
    expect(isEntitled(card, new Set(['compute.datumapis.com']))).toBe(true);
  });

  test('is skipped when the project has no matching entitlement', () => {
    const [card] = collectHomeCards([
      plugin({ slug: 'compute', serviceRef: 'compute.datumapis.com' }),
    ]);
    expect(isEntitled(card, new Set())).toBe(false);
    expect(isEntitled(card, new Set(['other.datumapis.com']))).toBe(false);
  });
});
