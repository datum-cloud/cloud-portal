import {
  deriveProjectSetup,
  hasVisibleResources,
  shouldShowNetworkHero,
  type ProjectSetup,
} from './setup-progress.helpers';
import { useComputeWorkloads } from '@/resources/compute-workloads';
import { useDomains } from '@/resources/domains';
import { useHttpProxies } from '@/resources/http-proxies';
import { useNetworkServices } from '@/resources/network-services';
import { useNetworks } from '@/resources/networks';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { useCallback, useEffect, useMemo, useState } from 'react';

/** While the network is coming up, poll fast so the hero hands off promptly. */
const NETWORK_PENDING_POLL_MS = 5_000;
/** Workloads, network services and networks have no watch; poll while first-run setup is under way. */
const SETUP_POLL_MS = 15_000;

// ---------------------------------------------------------------------------
// Per-browser flags. Read after mount so the server render and the first
// client render agree; storage can be missing or throw (private windows).
// ---------------------------------------------------------------------------

const skipKey = (projectId: string) => `project-home:network-skipped:${projectId}`;

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // Not persisting is fine: the flag only lasts this page view.
  }
}

function useStoredFlag(key: string): [boolean | null, () => void] {
  const [value, setValue] = useState<boolean | null>(null);
  useEffect(() => setValue(readFlag(key)), [key]);
  const set = useCallback(() => {
    writeFlag(key);
    setValue(true);
  }, [key]);
  return [value, set];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type ProjectSetupState = ProjectSetup & {
  isLoading: boolean;
  /** Lead the page with the network hero instead of the resource columns. */
  showNetworkHero: boolean;
  /**
   * Nothing but (at most) a network exists yet, so the page offers the
   * toolbox and Patch rather than the resource columns.
   */
  isFresh: boolean;
  /** The person skipped creating a network on this project, in this browser. */
  networkSkipped: boolean;
  skipNetwork: () => void;
};

/**
 * Where the project is in its first-run setup, read from its real resources so
 * it moves the same way whether a step was done here, in the CLI or by Patch.
 */
export function useProjectSetup(projectId: string): ProjectSetupState {
  const [skipped, skipNetwork] = useStoredFlag(skipKey(projectId));
  const [pollMs, setPollMs] = useState<number | false>(false);

  // Re-read on every visit: these have no watch, and plugins change them
  // behind the portal's back (deleting a network on the VPC page clears the
  // plugin's cache, not this one), so a cached list can be minutes stale.
  const listOptions = {
    staleTime: QUERY_STALE_TIME,
    refetchOnMount: 'always',
    refetchInterval: pollMs,
  } as const;
  const networks = useNetworks(projectId, listOptions);
  const workloads = useComputeWorkloads(projectId, listOptions);
  const services = useNetworkServices(projectId, listOptions);
  // Load balancers and domains stay fresh through the project's watches.
  const proxies = useHttpProxies(projectId, { staleTime: QUERY_STALE_TIME });
  const domains = useDomains(projectId, { staleTime: QUERY_STALE_TIME });

  const setup = useMemo(
    () =>
      deriveProjectSetup({
        network: (networks.data ?? []).map((n) => ({
          name: n.metadata?.name ?? '',
          status: n.status,
        })),
        workload: (workloads.data ?? []).map((w) => ({
          name: w.metadata?.name ?? '',
          status: w.status,
        })),
        service: (services.data ?? []).map((s) => ({
          name: s.metadata?.name ?? '',
          status: s.status,
        })),
        loadBalancer: (proxies.data ?? []).map((p) => ({
          name: p.chosenName || p.name,
          status: p.status,
        })),
        domain: (domains.data ?? []).map((d) => ({ name: d.domainName, status: d.status })),
      }),
    [networks.data, workloads.data, services.data, proxies.data, domains.data]
  );

  const isLoading =
    networks.isLoading ||
    workloads.isLoading ||
    services.isLoading ||
    proxies.isLoading ||
    domains.isLoading ||
    skipped === null;

  const showNetworkHero = !isLoading && shouldShowNetworkHero(setup, skipped === true);

  const isFresh = !isLoading && !hasVisibleResources(setup.steps);

  // A network that was just created (from any page's dialog, or the CLI) takes
  // a few seconds to become ready; watch it closely until it does.
  const networkPending = setup.steps.some(
    (step) => step.key === 'network' && step.status === 'inProgress'
  );
  const nextPollMs =
    isLoading || !(showNetworkHero || networkPending || isFresh || setup.isFirstRun)
      ? false
      : showNetworkHero || networkPending
        ? NETWORK_PENDING_POLL_MS
        : SETUP_POLL_MS;
  useEffect(() => setPollMs(nextPollMs), [nextPollMs]);

  return {
    ...setup,
    isLoading,
    showNetworkHero,
    isFresh,
    networkSkipped: skipped === true,
    skipNetwork,
  };
}
