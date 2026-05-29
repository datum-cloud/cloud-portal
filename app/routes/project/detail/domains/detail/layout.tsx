import { RestrictedState } from '@/components/restricted-state/restricted-state';
import { type SubNavigationTab } from '@/components/sub-navigation';
import { DomainHeaderActions } from '@/features/edge/domain/domain-header-actions';
import { SubLayout } from '@/layouts';
import { logger } from '@/modules/logger';
import { gateRouteAccess } from '@/modules/rbac/server/check-permission';
import { createDnsZoneService, type DnsZone } from '@/resources/dns-zones';
import { createDomainService, type Domain, useDomain } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, NotFoundError, withLoaderErrors } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import {
  LoaderFunctionArgs,
  data,
  MetaFunction,
  Outlet,
  useLoaderData,
  useParams,
} from 'react-router';

export type LayoutLoaderData =
  | { restricted: true }
  | { restricted: false; domain: Domain; dnsZone: DnsZone | null };

export const handle = {
  breadcrumb: (loaderData: LayoutLoaderData | undefined) => {
    const name = loaderData && !loaderData.restricted ? loaderData.domain?.domainName : undefined;
    return <span>{name ?? 'Domain'}</span>;
  },
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const name = loaderData && !loaderData.restricted ? loaderData.domain?.name : undefined;
  return metaObject(name || 'Domain');
});

export const loader = withLoaderErrors(async ({ params }: LoaderFunctionArgs) => {
  const { projectId, domainId } = params;

  if (!projectId || !domainId) {
    throw new BadRequestError('Project ID and domain ID are required');
  }

  // Access gate first — skip the domain fetch if the user can't view it.
  const canView = await gateRouteAccess(projectId, {
    resource: 'domains',
    verb: 'get',
    group: 'networking.datumapis.com',
    namespace: 'default',
    scope: 'project',
    projectId,
  });

  if (!canView) {
    return data({ restricted: true as const } satisfies LayoutLoaderData);
  }

  // Services now use global axios client with AsyncLocalStorage
  const domainService = createDomainService();
  const domain = await domainService.get(projectId, domainId);

  if (!domain) {
    throw new NotFoundError('Domain', domainId);
  }

  // DNS zone is a separate resource (`dns.networking.miloapis.com/dnszones`); a
  // viewer may have domains access without dnszones access. Tolerate failure so
  // the domain detail still renders (Manage DNS Zone degrades gracefully).
  let dnsZone: DnsZone | null = null;
  if (domain?.name) {
    const dnsZoneService = createDnsZoneService();
    try {
      const dnsZoneList = await dnsZoneService.listByDomainRef(projectId, domain.name, 1);
      dnsZone = dnsZoneList?.[0] ?? null;
    } catch (error) {
      logger.warn('DomainDetailLayout: dnsZone fetch failed (degrading gracefully)', {
        error: error instanceof Error ? error.message : String(error),
        projectId,
        domainName: domain.name,
      });
      dnsZone = null;
    }
  }

  return data({ restricted: false as const, domain, dnsZone } satisfies LayoutLoaderData);
});

export default function DomainDetailLayout() {
  const loaderData = useLoaderData<typeof loader>();

  if (loaderData.restricted) {
    return (
      <RestrictedState
        title="Access restricted"
        message="You don't have permission to view this domain."
      />
    );
  }

  return <DomainDetailLayoutInner domain={loaderData.domain} dnsZone={loaderData.dnsZone} />;
}

function DomainDetailLayoutInner({ domain, dnsZone }: { domain: Domain; dnsZone: DnsZone | null }) {
  const { projectId, domainId } = useParams();

  // Seed cache synchronously with SSR data so child routes read it without skeleton flash
  useDomain(projectId ?? '', domainId ?? '', {
    initialData: domain,
    initialDataUpdatedAt: Date.now(),
  });

  const navItems: SubNavigationTab[] = useMemo(() => {
    return [
      {
        label: 'Overview',
        href: getPathWithParams(paths.project.detail.domains.detail.overview, {
          projectId,
          domainId: domain?.name ?? '',
        }),
      },
      {
        label: 'Activity',
        href: getPathWithParams(paths.project.detail.domains.detail.activity, {
          projectId,
          domainId: domain?.name ?? '',
        }),
      },
      {
        label: 'Settings',
        href: getPathWithParams(paths.project.detail.domains.detail.settings, {
          projectId,
          domainId: domain?.name ?? '',
        }),
      },
    ];
  }, [projectId, domain]);

  return (
    <SubLayout
      title={domain?.domainName}
      actions={
        domain && (
          <DomainHeaderActions projectId={projectId ?? ''} domain={domain} dnsZone={dnsZone} />
        )
      }
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
