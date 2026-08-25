import { comingSoonHref, resolveComingSoonService } from './coming-soon';
import type { PublicPlugin } from '@/modules/plugins/types';
import { EXTENSION_NAV_PROJECT } from '@/modules/plugins/types';
import { describe, expect, test } from 'bun:test';

describe('comingSoonHref', () => {
  test('builds the host holding-page path', () => {
    expect(comingSoonHref('proj-1', 'object-storage')).toBe(
      '/project/proj-1/coming-soon/object-storage'
    );
  });
});

describe('resolveComingSoonService', () => {
  test('resolves host planned services by id', () => {
    const service = resolveComingSoonService('object-storage');
    expect(service?.title).toBe('Object Storage');
    expect(service?.description).toContain('object storage');
    expect(service?.roadmapUrl).toMatch(/^https:\/\//);
  });

  test('resolves plugin nav entries by id', () => {
    const plugins: PublicPlugin[] = [
      {
        slug: 'sample',
        displayName: 'Sample',
        deprecated: false,
        devMode: true,
        source: 'static',
        manifest: {
          name: 'sample',
          version: '1.0.0',
          remoteEntry: 'remoteEntry.js',
          exposedModules: {},
          extensions: [
            {
              type: EXTENSION_NAV_PROJECT,
              properties: {
                id: 'sample-volumes',
                title: 'Volumes',
                icon: 'hard-drive',
                path: 'volumes',
                comingSoon: true,
                description: 'Block storage volumes.',
                roadmapUrl: 'https://example.com/volumes',
              },
            },
          ],
        },
      },
    ];

    const service = resolveComingSoonService('sample-volumes', plugins);
    expect(service?.title).toBe('Volumes');
    expect(service?.description).toBe('Block storage volumes.');
    expect(service?.roadmapUrl).toBe('https://example.com/volumes');
  });

  test('returns undefined for unknown ids', () => {
    expect(resolveComingSoonService('nope')).toBeUndefined();
  });
});
