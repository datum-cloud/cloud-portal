import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { getOsLabel, OsIcon } from '@/components/icon/os-icon';
import { StatusPulseDot } from '@/components/status-pulse-dot';
import { Table } from '@/components/table';
import { ConnectorDownloadCard } from '@/features/connectors/connector-download-card';
import { ConnectorSparkline } from '@/features/edge/proxy/metrics/connector-sparkline';
import { useResourcePermissions } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import { ControlPlaneStatus } from '@/resources/base';
import {
  type Connector,
  connectorKeys,
  createConnectorService,
  useConnectors,
  useConnectorsWatch,
} from '@/resources/connectors';
import { type HttpProxy, useHttpProxies, useHttpProxiesWatch } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getAlertState, setAlertClosed } from '@/utils/cookies';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import {
  createProjectListClientLoader,
  getValidCachedQueryData,
} from '@/utils/helpers/project-list-client-loader';
import { skipRevalidateWithinSameProject } from '@/utils/helpers/revalidate.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import {
  ActionFunctionArgs,
  data,
  Link,
  type LoaderFunctionArgs,
  useFetcher,
  useParams,
} from 'react-router';

export type ConnectorWithProxies = Connector & { proxies: HttpProxy[] };

const ALERT_KEY = 'connector_download';

// Client-side record of whether the user dismissed the download card this
// session. Starts false; set to true when the dismiss action is submitted.
// Resets on full page reload (at which point the server loader re-checks the
// cookie and returns the authoritative value). This lets the clientLoader skip
// re-hitting the server on fast cached navigations without always hiding the
// card for users who have never dismissed it.
let cardDismissedThisSession = false;

type LoaderData = {
  connectors: Connector[];
  downloadDismissed: boolean;
};

function getConnectorStatus(connector: Connector) {
  return transformControlPlaneStatus(connector.status);
}

const route = defineResourceRoute<LoaderData>({
  type: 'list',
  resource: 'connectors',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view connectors.",
  metaTitle: 'Connectors',
});

export const loader = (args: LoaderFunctionArgs) =>
  runListLoader<LoaderData>(args, {
    resource: 'connectors',
    group: 'networking.datumapis.com',
    scope: 'project',
    fetch: async ({ projectId, args: loaderArgs }) => {
      const { isClosed: downloadDismissed } = await getAlertState(loaderArgs.request, ALERT_KEY);
      const connectors = await createConnectorService().list(projectId!);
      return { connectors, downloadDismissed };
    },
  });
export const meta = route.meta;

export const shouldRevalidate = skipRevalidateWithinSameProject;

export const clientLoader = createProjectListClientLoader<LoaderData>((projectId) => {
  const connectors = getValidCachedQueryData<Connector[]>(connectorKeys.list(projectId));
  if (connectors === undefined) {
    return undefined;
  }
  // downloadDismissed is cookie-backed (httpOnly) so it can't be read here.
  // Use the client-side session flag instead: false until the user actually
  // clicks dismiss, then true for the rest of the session.
  return { connectors, downloadDismissed: cardDismissedThisSession };
});

export const action = async ({ request }: ActionFunctionArgs) => {
  const { headers } = await setAlertClosed(request, ALERT_KEY);
  return data({ success: true }, { headers });
};

export default route.Page(({ data: loaderData }) => {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { connectors: initialConnectors, downloadDismissed } = loaderData;
  const dismissFetcher = useFetcher({ key: 'connector-download-dismiss' });

  const { canViewProxies } = useResourcePermissions({
    resource: 'connectors',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: [],
    subResources: [
      {
        resource: 'httpproxies',
        group: 'networking.datumapis.com',
        scope: 'project',
        alias: 'proxies',
        verbs: ['list'],
      },
    ],
  });

  // connectors:list is gated server-side by the loader; if this page renders, watch is allowed.
  useConnectorsWatch(projectId);
  useHttpProxiesWatch(projectId, { enabled: canViewProxies });

  const { data: connectorsData = initialConnectors } = useConnectors(projectId, {
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
    initialData: initialConnectors,
  });

  const { data: proxies = [] } = useHttpProxies(projectId, {
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
    enabled: canViewProxies,
  });

  const tableData = useMemo((): ConnectorWithProxies[] => {
    const byConnector = new Map<string, HttpProxy[]>();
    for (const proxy of proxies ?? []) {
      const name = proxy.connector?.name;
      if (name) {
        const list = byConnector.get(name) ?? [];
        list.push(proxy);
        byConnector.set(name, list);
      }
    }
    return connectorsData.map((c) => ({ ...c, proxies: byConnector.get(c.name) ?? [] }));
  }, [connectorsData, proxies]);

  // Track dismissal in local state. This route sets
  // shouldRevalidate = skipRevalidateWithinSameProject, so the loader does NOT
  // re-run after the dismiss POST (projectId is unchanged). Relying on
  // loaderData.downloadDismissed alone would let the card reappear once the
  // fetcher returns to idle. Local state keeps it hidden for the session; the
  // POST + module flag persist the choice across reloads and navigations.
  const [dismissed, setDismissed] = useState(downloadDismissed);

  const handleDismissDownload = () => {
    cardDismissedThisSession = true;
    setDismissed(true);
    dismissFetcher.submit({}, { method: 'POST' });
  };
  const isDownloadVisible = !dismissed;

  const columns: ColumnDef<ConnectorWithProxies>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        meta: { className: 'min-w-32' },
        cell: ({ row }) => {
          return <span className="font-medium">{row.original.name}</span>;
        },
      },

      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          const status = getConnectorStatus(row.original);
          const isOnline = status.status === ControlPlaneStatus.Success;
          return (
            <Tooltip message={status.message} hidden={isOnline}>
              <div className="flex items-center gap-2">
                <StatusPulseDot variant={isOnline ? 'active' : 'offline'} />
                <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </Tooltip>
          );
        },
      },
      {
        header: 'Requests',
        id: 'requests',
        enableSorting: false,
        meta: { tooltip: 'Request rate over the last hour (all AI Edges using this connector)' },
        cell: ({ row }) => (
          <ConnectorSparkline
            projectId={projectId}
            proxyNames={row.original.proxies.map((p) => p.name)}
            connectorId={row.original.name}
          />
        ),
      },
      {
        header: 'AI Edge',
        id: 'proxies',
        cell: ({ row }) => {
          const proxiesList = row.original.proxies;
          if (!proxiesList.length) return <span className="text-muted-foreground text-sm">—</span>;
          if (proxiesList.length > 2) {
            return (
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="quaternary" theme="link" size="xs" className="shrink-0">
                    View all ({proxiesList.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="max-h-[280px] w-[200px] max-w-[calc(100vw-2rem)] overflow-y-auto p-3">
                  <p className="text-muted-foreground mb-2 text-xs font-medium">AI Edges</p>
                  <ul className="space-y-1.5">
                    {proxiesList.map((proxy) => (
                      <li key={proxy.name}>
                        <Link
                          to={getPathWithParams(paths.project.detail.proxy.detail.root, {
                            projectId,
                            proxyId: proxy.name,
                          })}
                          className="text-sm underline-offset-2 hover:underline">
                          {proxy.chosenName || proxy.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            );
          }
          return (
            <span className="text-sm">
              {proxiesList.map((proxy, i) => (
                <span key={proxy.name}>
                  {i > 0 && <span className="text-muted-foreground"> · </span>}
                  <Link
                    to={getPathWithParams(paths.project.detail.proxy.detail.root, {
                      projectId,
                      proxyId: proxy.name,
                    })}
                    className="underline-offset-2 hover:underline">
                    {proxy.chosenName || proxy.name}
                  </Link>
                </span>
              ))}
            </span>
          );
        },
      },
      {
        header: 'Hostnames',
        id: 'hostnames',
        meta: { tooltip: 'Verified hostnames configured by AI Edge on this connector' },
        cell: ({ row }) => {
          const hostnames = [
            ...new Set(row.original.proxies.flatMap((p) => p.status?.hostnames ?? [])),
          ];
          if (!hostnames.length) return <span className="text-muted-foreground text-sm">—</span>;
          if (hostnames.length > 2) {
            return (
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="quaternary" theme="link" size="xs" className="shrink-0">
                    View all ({hostnames.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="max-h-[280px] w-[240px] max-w-[calc(100vw-2rem)] overflow-y-auto p-3">
                  <p className="text-muted-foreground mb-2 text-xs font-medium">Hostnames</p>
                  <ul className="space-y-1.5">
                    {hostnames.map((hostname) => (
                      <li key={hostname}>
                        <BadgeCopy
                          value={hostname}
                          badgeTheme="solid"
                          badgeType="muted"
                          textClassName="max-w-full truncate font-mono text-xs"
                          showTooltip={false}
                          wrapperTooltipMessage={hostname}
                        />
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            );
          }
          const hasMultiple = hostnames.length > 1;
          return (
            <div className="flex flex-wrap items-center gap-2">
              {hostnames.map((hostname) => (
                <BadgeCopy
                  key={hostname}
                  value={hostname}
                  badgeTheme="solid"
                  badgeType="muted"
                  textClassName={hasMultiple ? 'max-w-[10rem] truncate' : undefined}
                  showTooltip={false}
                  wrapperTooltipMessage={hostname}
                />
              ))}
            </div>
          );
        },
      },
      {
        header: 'Device',
        id: 'device',
        cell: ({ row }) => {
          const { deviceName, deviceOs } = row.original;
          if (!deviceName && !deviceOs) return null;

          const osLabel = getOsLabel(deviceOs);
          const tooltip = [deviceName, osLabel].filter(Boolean).join(' · ');

          return (
            <Tooltip message={tooltip}>
              {deviceOs && deviceName ? (
                <div className="flex items-center gap-1.5">
                  <OsIcon os={deviceOs} size={16} className="shrink-0" />
                  <span className="truncate text-sm">{deviceName}</span>
                </div>
              ) : (
                <span>--</span>
              )}
            </Tooltip>
          );
        },
      },
      {
        header: 'Created At',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateTime date={row.original.createdAt} />;
        },
      },
    ],
    [projectId]
  );

  return (
    <Table.Client
      columns={columns}
      data={tableData}
      title="Connectors"
      search="Search"
      empty="No connectors found"
      headerExtra={
        isDownloadVisible ? <ConnectorDownloadCard onDismiss={handleDismissDownload} /> : undefined
      }
    />
  );
});
