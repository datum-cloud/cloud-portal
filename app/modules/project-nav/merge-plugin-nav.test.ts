import { buildProjectNavTree } from './build-project-nav';
import { mergePluginNavIntoTree } from './merge-plugin-nav';
import type { NavProjectChild, PublicPlugin } from '@/modules/plugins/types';
import { EXTENSION_NAV_PROJECT } from '@/modules/plugins/types';
import { describe, expect, test } from 'bun:test';

function plugin(partial: {
  slug: string;
  displayName: string;
  nav: Array<{
    id: string;
    title: string;
    path: string;
    section?: 'deliver' | 'build' | 'connect' | 'observe' | 'settings';
    order?: number;
    comingSoon?: boolean;
    comingSoonMode?: 'holding' | 'plugin' | 'external';
    description?: string;
    roadmapUrl?: string;
    serviceRef?: string;
    children?: NavProjectChild[];
  }>;
}): PublicPlugin {
  return {
    slug: partial.slug,
    displayName: partial.displayName,
    deprecated: false,
    devMode: true,
    source: 'static',
    manifest: {
      name: partial.slug,
      version: '1.0.0',
      remoteEntry: 'remoteEntry.js',
      exposedModules: {},
      extensions: partial.nav.map((nav) => ({
        type: EXTENSION_NAV_PROJECT,
        properties: {
          id: nav.id,
          title: nav.title,
          icon: 'puzzle',
          path: nav.path,
          section: nav.section,
          order: nav.order,
          comingSoon: nav.comingSoon,
          comingSoonMode: nav.comingSoonMode,
          description: nav.description,
          roadmapUrl: nav.roadmapUrl,
          serviceRef: nav.serviceRef,
          children: nav.children,
        },
      })),
    },
  };
}

describe('mergePluginNavIntoTree', () => {
  test('nests items with a known section under that category', () => {
    const tree = buildProjectNavTree('proj-1');
    const merged = mergePluginNavIntoTree(
      tree,
      [
        plugin({
          slug: 'sample',
          displayName: 'Sample',
          nav: [
            { id: 'a', title: 'Platform data', path: 'platform', section: 'observe', order: 25 },
          ],
        }),
      ],
      'proj-1'
    );

    const observe = merged.find((item) => item.title === 'Observe');
    const titles = observe?.children?.map((c) => c.title) ?? [];
    expect(titles).toContain('Platform data');
    expect(titles.indexOf('Metrics Export')).toBeLessThan(titles.indexOf('Platform data'));
    expect(titles.at(-1)).toBe('Platform data');
    expect(merged.some((item) => item.title === 'Sample')).toBe(false);
  });

  test('creates a per-plugin collapsible group when section is omitted', () => {
    const tree = buildProjectNavTree('proj-1');
    const merged = mergePluginNavIntoTree(
      tree,
      [
        plugin({
          slug: 'sample',
          displayName: 'Sample Plugin',
          nav: [{ id: 'home', title: 'Home page', path: 'home', order: 10 }],
        }),
      ],
      'proj-1'
    );

    const group = merged.find((item) => item.title === 'Sample Plugin');
    expect(group?.type).toBe('collapsible');
    expect(group?.children?.some((c) => c.title === 'Home page')).toBe(true);
    expect(group?.children?.find((c) => c.title === 'Home page')?.icon).toBeUndefined();
  });

  test('planned items with a roadmapUrl link to the host Coming Soon holding page', () => {
    const tree = buildProjectNavTree('proj-1');
    const build = tree.find((item) => item.sectionId === 'build');
    expect(build?.type).toBe('group');
    const objectStorage = build?.children?.find((c) => c.title === 'Object Storage');
    expect(objectStorage?.type).toBe('link');
    expect(objectStorage?.badge?.label).toBe('Soon');
    expect(objectStorage?.href).toBe('/project/proj-1/coming-soon/object-storage');
    expect(objectStorage?.icon).toBeDefined();
    expect(build?.children?.some((c) => c.title === 'Compute')).toBe(false);

    const deliver = tree.find((item) => item.sectionId === 'deliver');
    const gslb = deliver?.children?.find((c) => c.title === 'GSLB');
    expect(gslb?.type).toBe('link');
    expect(gslb?.badge?.label).toBe('Soon');
    expect(gslb?.href).toBe('/project/proj-1/coming-soon/gslb');
    expect(gslb?.disabled).not.toBe(true);
  });

  test('service categories are always-open groups; settings stays collapsible', () => {
    const tree = buildProjectNavTree('proj-1');
    for (const section of ['deliver', 'build', 'connect', 'observe'] as const) {
      expect(tree.find((item) => item.sectionId === section)?.type).toBe('group');
    }
    expect(tree.find((item) => item.sectionId === 'settings')?.type).toBe('collapsible');
  });

  test('section headers are text-only and their items carry icons', () => {
    const tree = buildProjectNavTree('proj-1');
    for (const section of ['deliver', 'build', 'connect', 'observe'] as const) {
      const header = tree.find((item) => item.sectionId === section);
      expect(header?.icon).toBeUndefined();
      for (const child of header?.children ?? []) {
        expect(child.icon).toBeDefined();
      }
    }
    const settings = tree.find((item) => item.sectionId === 'settings');
    expect(settings?.icon).toBeDefined();
    for (const child of settings?.children ?? []) {
      expect(child.icon).toBeUndefined();
    }
  });

  test('plugin items in a host section get their manifest icon', () => {
    const merged = mergePluginNavIntoTree(
      buildProjectNavTree('proj-1'),
      [
        plugin({
          slug: 'compute',
          displayName: 'Compute',
          nav: [{ id: 'c', title: 'Compute', path: 'workloads', section: 'build', order: 10 }],
        }),
      ],
      'proj-1'
    );
    const build = merged.find((item) => item.title === 'Build');
    expect(build?.children?.find((c) => c.title === 'Compute')?.icon).toBeDefined();
  });

  test('plugin comingSoon defaults to the host holding page when not entitled', () => {
    const tree = buildProjectNavTree('proj-1');
    const roadmap = 'https://github.com/datum-cloud/enhancements/issues/1234';
    const merged = mergePluginNavIntoTree(
      tree,
      [
        plugin({
          slug: 'workloads',
          displayName: 'Compute',
          nav: [
            {
              id: 'compute',
              title: 'Compute',
              path: 'workloads',
              section: 'build',
              order: 10,
              comingSoon: true,
              roadmapUrl: roadmap,
              serviceRef: 'compute.datumapis.com',
            },
          ],
        }),
      ],
      'proj-1'
    );

    const build = merged.find((item) => item.title === 'Build');
    const compute = build?.children?.find((c) => c.title === 'Compute');
    expect(compute?.type).toBe('link');
    expect(compute?.badge?.label).toBe('Soon');
    expect(compute?.href).toBe('/project/proj-1/coming-soon/compute');
    expect(compute?.muted).toBe(true);
  });

  test('plugin comingSoonMode plugin keeps the mount path while Coming Soon', () => {
    const tree = buildProjectNavTree('proj-1');
    const merged = mergePluginNavIntoTree(
      tree,
      [
        plugin({
          slug: 'workloads',
          displayName: 'Compute',
          nav: [
            {
              id: 'compute',
              title: 'Compute',
              path: '',
              section: 'build',
              order: 10,
              comingSoon: true,
              comingSoonMode: 'plugin',
              serviceRef: 'compute.datumapis.com',
            },
          ],
        }),
      ],
      'proj-1'
    );

    const build = merged.find((item) => item.title === 'Build');
    const compute = build?.children?.find((c) => c.title === 'Compute');
    expect(compute?.type).toBe('link');
    expect(compute?.badge?.label).toBe('Soon');
    expect(compute?.href).toBe('/project/proj-1/services/workloads');
    expect(compute?.muted).toBe(true);
  });

  test('plugin comingSoonMode external opens the roadmapUrl', () => {
    const tree = buildProjectNavTree('proj-1');
    const roadmap = 'https://github.com/datum-cloud/enhancements/issues/1234';
    const merged = mergePluginNavIntoTree(
      tree,
      [
        plugin({
          slug: 'workloads',
          displayName: 'Compute',
          nav: [
            {
              id: 'compute',
              title: 'Compute',
              path: 'workloads',
              section: 'build',
              order: 10,
              comingSoon: true,
              comingSoonMode: 'external',
              roadmapUrl: roadmap,
              serviceRef: 'compute.datumapis.com',
            },
          ],
        }),
      ],
      'proj-1'
    );

    const build = merged.find((item) => item.title === 'Build');
    const compute = build?.children?.find((c) => c.title === 'Compute');
    expect(compute?.type).toBe('externalLink');
    expect(compute?.badge?.label).toBe('Soon');
    expect(compute?.href).toBe(roadmap);
    expect(compute?.muted).toBe(true);
  });

  test('plugin comingSoon items go live when the service entitlement is Active', () => {
    const tree = buildProjectNavTree('proj-1');
    const roadmap = 'https://github.com/datum-cloud/enhancements/issues/1234';
    const merged = mergePluginNavIntoTree(
      tree,
      [
        plugin({
          slug: 'workloads',
          displayName: 'Compute',
          nav: [
            {
              id: 'compute',
              title: 'Compute',
              path: '',
              section: 'build',
              order: 10,
              comingSoon: true,
              comingSoonMode: 'plugin',
              roadmapUrl: roadmap,
              serviceRef: 'compute.datumapis.com',
            },
          ],
        }),
      ],
      'proj-1',
      { activeServiceEntitlements: ['compute.datumapis.com'] }
    );

    const build = merged.find((item) => item.title === 'Build');
    const compute = build?.children?.find((c) => c.title === 'Compute');
    expect(compute?.type).toBe('link');
    expect(compute?.badge).toBeUndefined();
    expect(compute?.href).toBe('/project/proj-1/services/workloads');
    expect(compute?.muted).toBeUndefined();
  });
});

describe('mergePluginNavIntoTree children', () => {
  const computeNav = (overrides: Partial<Parameters<typeof plugin>[0]['nav'][number]> = {}) =>
    plugin({
      slug: 'workloads',
      displayName: 'Compute',
      nav: [
        {
          id: 'compute',
          title: 'Compute',
          path: '/',
          section: 'build',
          order: 10,
          children: [{ title: 'Workloads', path: '' }],
          ...overrides,
        },
      ],
    });

  function computeItem(merged: ReturnType<typeof mergePluginNavIntoTree>) {
    return merged
      .find((item) => item.title === 'Build')
      ?.children?.find((c) => c.title === 'Compute');
  }

  test('renders a parent with children as a collapsible with linked children', () => {
    const merged = mergePluginNavIntoTree(buildProjectNavTree('proj-1'), [computeNav()], 'proj-1');

    const compute = computeItem(merged);
    expect(compute?.type).toBe('collapsible');
    expect(compute?.href).toBeNull();
    expect(compute?.children).toEqual([
      {
        title: 'Workloads',
        href: '/project/proj-1/services/workloads',
        type: 'link',
        children: undefined,
      },
    ]);
  });

  test('orders children, resolves nested paths and supports deeper nesting', () => {
    const merged = mergePluginNavIntoTree(
      buildProjectNavTree('proj-1'),
      [
        computeNav({
          children: [
            { title: 'Networks', path: '/networks', order: 20 },
            { title: 'Workloads', path: '', order: 10 },
            {
              title: 'Advanced',
              order: 30,
              children: [{ title: 'Quotas', path: 'advanced/quotas' }],
            },
          ],
        }),
      ],
      'proj-1'
    );

    const children = computeItem(merged)?.children ?? [];
    expect(children.map((c) => c.title)).toEqual(['Workloads', 'Networks', 'Advanced']);
    expect(children[1]?.href).toBe('/project/proj-1/services/workloads/networks');
    expect(children[2]?.type).toBe('collapsible');
    expect(children[2]?.href).toBeNull();
    expect(children[2]?.children?.[0]?.href).toBe(
      '/project/proj-1/services/workloads/advanced/quotas'
    );
    // Host ordering metadata never reaches datum-ui.
    expect(children.some((c) => 'order' in c)).toBe(false);
  });

  test('an empty children array renders the plain link as before', () => {
    const merged = mergePluginNavIntoTree(
      buildProjectNavTree('proj-1'),
      [computeNav({ children: [] })],
      'proj-1'
    );

    const compute = computeItem(merged);
    expect(compute?.type).toBe('link');
    expect(compute?.href).toBe('/project/proj-1/services/workloads');
  });

  test('Coming Soon in plugin mode keeps the badge on the parent and mutes the children', () => {
    const merged = mergePluginNavIntoTree(
      buildProjectNavTree('proj-1'),
      [computeNav({ comingSoon: true, comingSoonMode: 'plugin' })],
      'proj-1'
    );

    const compute = computeItem(merged);
    expect(compute?.type).toBe('collapsible');
    expect(compute?.href).toBeNull();
    expect(compute?.badge?.label).toBe('Soon');
    expect(compute?.muted).toBe(true);
    expect(compute?.children?.[0]?.href).toBe('/project/proj-1/services/workloads');
    expect(compute?.children?.[0]?.muted).toBe(true);
  });

  test('Coming Soon in holding mode ignores children and links to the holding page', () => {
    const merged = mergePluginNavIntoTree(
      buildProjectNavTree('proj-1'),
      [computeNav({ comingSoon: true })],
      'proj-1'
    );

    const compute = computeItem(merged);
    expect(compute?.type).toBe('link');
    expect(compute?.href).toBe('/project/proj-1/coming-soon/compute');
    expect(compute?.children).toBeUndefined();
  });

  test('entitled Coming Soon parents render live, unmuted children', () => {
    const merged = mergePluginNavIntoTree(
      buildProjectNavTree('proj-1'),
      [
        computeNav({
          comingSoon: true,
          comingSoonMode: 'plugin',
          serviceRef: 'compute.datumapis.com',
        }),
      ],
      'proj-1',
      { activeServiceEntitlements: ['compute.datumapis.com'] }
    );

    const compute = computeItem(merged);
    expect(compute?.type).toBe('collapsible');
    expect(compute?.badge).toBeUndefined();
    expect(compute?.muted).toBeUndefined();
    expect(compute?.children?.[0]?.muted).toBeUndefined();
  });
});

describe('buildProjectNavTree usage item', () => {
  test('places Usage between Activity and Metrics Export', () => {
    const tree = buildProjectNavTree('proj-1');
    const observe = tree.find((item) => item.title === 'Observe');
    const titles = observe?.children?.map((c) => c.title) ?? [];
    expect(titles).toContain('Usage');
    expect(titles.indexOf('Activity')).toBeLessThan(titles.indexOf('Usage'));
    expect(titles.indexOf('Usage')).toBeLessThan(titles.indexOf('Metrics Export'));
    const usage = observe?.children?.find((c) => c.title === 'Usage');
    expect(usage?.href).toBe('/project/proj-1/usage');
    expect(usage?.icon).toBeDefined();
  });
});

describe('buildProjectNavTree quotas item', () => {
  test('places Quotas under Project Settings after General', () => {
    const tree = buildProjectNavTree('proj-1');
    const settings = tree.find((item) => item.title === 'Project Settings');
    const titles = settings?.children?.map((c) => c.title) ?? [];
    expect(titles).toContain('Quotas');
    expect(titles.indexOf('General')).toBeLessThan(titles.indexOf('Quotas'));
    expect(titles.indexOf('Quotas')).toBeLessThan(titles.indexOf('Service Accounts'));
    const quotas = settings?.children?.find((c) => c.title === 'Quotas');
    expect(quotas?.href).toBe('/project/proj-1/quotas');
    expect(quotas?.icon).toBeUndefined();
    const general = settings?.children?.find((c) => c.title === 'General');
    expect(general?.tabChildLinks).not.toContain('/project/proj-1/quotas');
  });
});
