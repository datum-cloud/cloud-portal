import { RestrictedState } from '@/components/restricted-state/restricted-state';
import { type SubNavigationTab } from '@/components/sub-navigation';
import { SubLayout } from '@/layouts';
import { logger } from '@/modules/logger';
import { gateRouteAccess } from '@/modules/rbac/server/check-permission';
import { createDnsZoneService, type DnsZone, useDnsZone } from '@/resources/dns-zones';
import { createDomainService, type Domain, useDomain } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { redirectWithToast } from '@/utils/cookies';
import { BadRequestError, NotFoundError, withLoaderErrors } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import {
  LoaderFunctionArgs,
  MetaFunction,
  Outlet,
  data,
  useLoaderData,
  useParams,
} from 'react-router';

type LayoutLoaderData =
  | { restricted: true }
  | { restricted: false; dnsZone: DnsZone; domain: Domain | null };

export const handle = {
  breadcrumb: (loaderData: LayoutLoaderData | undefined) => {
    const name = loaderData && !loaderData.restricted ? loaderData.dnsZone?.domainName : undefined;
    return <span>{name ?? 'DNS'}</span>;
  },
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const name = loaderData && !loaderData.restricted ? loaderData.dnsZone?.domainName : undefined;
  return metaObject(name || 'DNS');
});

const _loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId, dnsZoneId } = params;

  if (!projectId || !dnsZoneId) {
    throw new BadRequestError('Project ID and DNS ID are required');
  }

  // Access gate first — skip the zone fetch if the user can't view it.
  const canView = await gateRouteAccess(projectId, {
    resource: 'dnszones',
    verb: 'get',
    group: 'dns.networking.miloapis.com',
    namespace: 'default',
    scope: 'project',
    projectId,
  });

  if (!canView) {
    return data({ restricted: true as const });
  }

  // Services now use global axios client with AsyncLocalStorage
  const dnsZoneService = createDnsZoneService();

  const dnsZone = await dnsZoneService.get(projectId, dnsZoneId);

  if (!dnsZone) {
    throw new NotFoundError('DNS', dnsZoneId);
  }

  // If the DNS zone is being deleted, redirect to the DNS zones page
  if (dnsZone.deletionTimestamp) {
    return redirectWithToast(
      getPathWithParams(paths.project.detail.dnsZones.root, {
        projectId,
      }),
      {
        title: 'DNS is being deleted',
        description: 'This DNS is currently being deleted and is no longer accessible',
        type: 'message',
      }
    );
  }

  // Domain is a separate resource (`networking.datumapis.com/domains`); a viewer
  // may have dnszones access without domains access. Tolerate failure so the
  // zone detail still renders (nameservers/overview degrade gracefully).
  let domain: Domain | null = null;
  if (dnsZone.status?.domainRef?.name) {
    const domainService = createDomainService();
    try {
      domain = await domainService.get(projectId, dnsZone.status?.domainRef?.name ?? '');
    } catch (error) {
      logger.warn('DnsZoneDetailLayout: domain fetch failed (degrading gracefully)', {
        error: error instanceof Error ? error.message : String(error),
        projectId,
        domainRef: dnsZone.status?.domainRef?.name,
      });
      domain = null;
    }
  }

  // DNS records are fetched in the dns-records child route via a gated client
  // query so a missing dnsrecordsets permission doesn't break this layout.
  return data({ restricted: false as const, dnsZone, domain });
};

export const loader = withLoaderErrors(_loader);

export default function DnsZoneDetailLayout() {
  const loaderData = useLoaderData<typeof loader>();

  if (loaderData.restricted) {
    return (
      <RestrictedState
        title="Access restricted"
        message="You don't have permission to view this DNS zone."
      />
    );
  }

  return <DnsZoneDetailLayoutInner dnsZone={loaderData.dnsZone} domain={loaderData.domain} />;
}

function DnsZoneDetailLayoutInner({
  dnsZone,
  domain,
}: {
  dnsZone: DnsZone;
  domain: Domain | null;
}) {
  const { projectId, dnsZoneId } = useParams();

  // Seed cache synchronously with SSR data so child routes read it without skeleton flash
  useDnsZone(projectId ?? '', dnsZoneId ?? '', {
    initialData: dnsZone,
    initialDataUpdatedAt: Date.now(),
  });

  // Seed domain cache if domain exists (consumed by overview and nameservers child routes)
  const domainName = domain?.name ?? '';
  useDomain(projectId ?? '', domainName, {
    enabled: !!domainName,
    initialData: domain ?? undefined,
    initialDataUpdatedAt: Date.now(),
  });

  const navItems: SubNavigationTab[] = useMemo(() => {
    return [
      /* {
        label: 'Overview',
        href: getPathWithParams(paths.project.detail.dnsZones.detail.overview, {
          projectId,
          dnsZoneId: dnsZone?.name ?? '',
        }),
      }, */
      {
        label: 'DNS Records',
        href: getPathWithParams(paths.project.detail.dnsZones.detail.dnsRecords, {
          projectId,
          dnsZoneId: dnsZone?.name ?? '',
        }),
      },
      {
        label: 'Nameservers',
        href: getPathWithParams(paths.project.detail.dnsZones.detail.nameservers, {
          projectId,
          dnsZoneId: dnsZone?.name ?? '',
        }),
      },
      {
        label: 'Activity',
        href: getPathWithParams(paths.project.detail.dnsZones.detail.activity, {
          projectId,
          dnsZoneId: dnsZone?.name ?? '',
        }),
      },
      {
        label: 'Settings',
        href: getPathWithParams(paths.project.detail.dnsZones.detail.settings, {
          projectId,
          dnsZoneId: dnsZone?.name ?? '',
        }),
      },
    ];
  }, [projectId, dnsZone]);

  return (
    <SubLayout title={dnsZone?.domainName} navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
