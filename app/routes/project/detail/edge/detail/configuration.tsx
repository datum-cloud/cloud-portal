import { DangerCard } from '@/components/danger-card/danger-card';
import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import { useAlbTrafficProtection } from '@/features/edge/proxy/hooks/use-alb-traffic-protection';
import { useDeleteProxy } from '@/features/edge/proxy/hooks/use-delete-proxy';
import { HttpProxyAccessCard } from '@/features/edge/proxy/overview/access-card';
import { HttpProxyConfigCard } from '@/features/edge/proxy/overview/config-card';
import { HttpProxyGeneralCard } from '@/features/edge/proxy/overview/general-card';
import { HttpProxyHostnamesCard } from '@/features/edge/proxy/overview/hostnames-card';
import { HttpProxyOriginsCard } from '@/features/edge/proxy/overview/origins-card';
import { HttpProxyTlsCard } from '@/features/edge/proxy/overview/tls-card';
import { useGuardedRouteData, useResourcePermissions } from '@/modules/rbac';
import { type HttpProxy, useHttpProxy } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { LoaderOverlay } from '@datum-cloud/datum-ui/loader-overlay';
import { SettingsNav, SettingsNavItem, SettingsNavLabel } from '@datum-cloud/datum-ui/settings-nav';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Title } from '@datum-cloud/datum-ui/typography';
import {
  GlobeIcon,
  KeyRoundIcon,
  LockIcon,
  ServerIcon,
  ShieldIcon,
  SquareLibrary,
  Trash2Icon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, type MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Configuration</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Configuration'));

const SECTION_IDS = [
  'general',
  'hostnames',
  'backends',
  'tls',
  'security',
  'access',
  'danger',
] as const;

type SectionId = (typeof SECTION_IDS)[number];

/**
 * Tracks which configuration section is in view for the SettingsNav active
 * state.
 *
 * Two rules, in priority order:
 * 1. A hash navigation (clicking a nav item) wins outright. The target is
 *    pinned until the user scrolls again, so short sections near the bottom of
 *    the page — which can never scroll far enough to dominate the viewport —
 *    still light up when chosen.
 * 2. Otherwise the active section is the last one whose top has crossed a
 *    reference line a third of the way down the viewport. This is stable for
 *    sections of very different heights, unlike "most visible".
 */
function useSectionScrollSpy(sectionIds: readonly string[], fallback: string) {
  const [activeId, setActiveId] = useState(fallback);

  useEffect(() => {
    const readHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      return sectionIds.includes(hash) ? hash : undefined;
    };

    // True while a hash jump is settling; scroll-derived updates are ignored.
    let pinned = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let frame: number | undefined;

    const compute = () => {
      frame = undefined;
      if (pinned) return;
      const line = window.innerHeight / 3;
      let current: string | undefined;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) current = id;
        else break;
      }
      setActiveId(current ?? sectionIds[0] ?? fallback);
    };

    const onScroll = () => {
      if (pinned) {
        // The jump itself fires scroll events; only unpin once they stop.
        if (settleTimer) clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
          pinned = false;
        }, 200);
        return;
      }
      if (frame === undefined) frame = requestAnimationFrame(compute);
    };

    const pin = (target: string) => {
      pinned = true;
      setActiveId(target);
      if (settleTimer) clearTimeout(settleTimer);
      // If the jump produced no scroll (already in place), unpin anyway.
      settleTimer = setTimeout(() => {
        pinned = false;
      }, 200);
    };

    const onHashChange = () => {
      const target = readHash();
      if (target) pin(target);
    };

    // Re-clicking the link for the current hash jumps without a hashchange
    // event, so listen for anchor clicks as well.
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor || anchor.getAttribute('aria-disabled') === 'true') return;
      const target = anchor.getAttribute('href')?.slice(1);
      if (target && sectionIds.includes(target)) pin(target);
    };

    const initial = readHash();
    if (initial) {
      pin(initial);
    } else {
      compute();
    }

    // Capture phase so nested scroll containers are heard too.
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    document.addEventListener('click', onClick);
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      document.removeEventListener('click', onClick);
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('resize', onScroll);
      if (settleTimer) clearTimeout(settleTimer);
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [sectionIds, fallback]);

  return activeId;
}

/**
 * ALB settings. Overview is the ops dashboard; editing lives here with a
 * left SettingsNav.
 */
export default function HttpProxyConfigurationPage() {
  const { data: proxy } = useGuardedRouteData<HttpProxy, Record<string, never>>('proxy-detail');
  const { projectId = '', proxyId = '' } = useParams<{ projectId: string; proxyId: string }>();
  const navigate = useNavigate();
  const activeSection = useSectionScrollSpy(SECTION_IDS, 'general');

  const { data: httpProxy } = useHttpProxy(projectId, proxyId, {
    initialData: proxy,
    staleTime: QUERY_STALE_TIME,
  });

  const { canDelete, isLoading: deleteLoading } = useResourcePermissions({
    resource: 'httpproxies',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['delete'],
  });

  const {
    canViewWaf,
    wafUnavailable,
    wafPending,
    wafProgrammed,
    wafProgrammedMessage,
    wafProgrammedReason,
    effectiveProxy,
  } = useAlbTrafficProtection(projectId, proxyId, httpProxy ?? proxy);

  const { confirmDelete, isPending: isDeleting } = useDeleteProxy(projectId, {
    onSuccess: () => {
      navigate(getPathWithParams(paths.project.detail.proxy.root, { projectId }));
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete proxy');
    },
  });

  const isActive = useMemo(() => (id: SectionId) => activeSection === id, [activeSection]);

  if (!effectiveProxy) throw new NotFoundError('Application Load Balancer', proxyId);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      {/* The scroll container pads content by 2.25rem on md+; top-0 pins the
          nav at the content's top edge rather than floating 24px below it. */}
      <aside className="lg:sticky lg:top-0 lg:w-56 lg:shrink-0">
        <SettingsNav>
          <SettingsNavLabel>Settings</SettingsNavLabel>
          <SettingsNavItem
            href="#general"
            icon={<Icon icon={SquareLibrary} size={16} />}
            active={isActive('general')}>
            General
          </SettingsNavItem>
          <SettingsNavItem
            href="#hostnames"
            icon={<Icon icon={GlobeIcon} size={16} />}
            active={isActive('hostnames')}>
            Custom Hostnames
          </SettingsNavItem>
          <SettingsNavItem
            href="#backends"
            icon={<Icon icon={ServerIcon} size={16} />}
            active={isActive('backends')}>
            Backend pool
          </SettingsNavItem>
          <SettingsNavItem
            href="#tls"
            icon={<Icon icon={LockIcon} size={16} />}
            active={isActive('tls')}>
            TLS & Certificates
          </SettingsNavItem>
          <SettingsNavItem
            href="#security"
            icon={<Icon icon={ShieldIcon} size={16} />}
            active={isActive('security')}>
            Security & WAF
          </SettingsNavItem>
          <SettingsNavItem
            href="#access"
            icon={<Icon icon={KeyRoundIcon} size={16} />}
            active={isActive('access')}>
            Access Control
          </SettingsNavItem>
          <SettingsNavItem
            href="#danger"
            icon={<Icon icon={Trash2Icon} size={16} />}
            active={isActive('danger')}>
            Danger Zone
          </SettingsNavItem>
        </SettingsNav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <section id="general" className="scroll-mt-24">
          <HttpProxyGeneralCard proxy={effectiveProxy} projectId={projectId} />
        </section>

        <section id="hostnames" className="scroll-mt-24">
          <HttpProxyHostnamesCard proxy={effectiveProxy} projectId={projectId} />
        </section>

        <section id="backends" className="scroll-mt-24">
          <HttpProxyOriginsCard proxy={effectiveProxy} projectId={projectId} />
        </section>

        <section id="tls" className="scroll-mt-24">
          <HttpProxyTlsCard proxy={effectiveProxy} projectId={projectId} />
        </section>

        <section id="security" className="scroll-mt-24">
          <HttpProxyConfigCard
            proxy={effectiveProxy}
            projectId={projectId}
            canViewWaf={canViewWaf}
            wafUnavailable={wafUnavailable}
            wafPending={wafPending}
            wafProgrammed={wafProgrammed}
            wafProgrammedMessage={wafProgrammedMessage}
            wafProgrammedReason={wafProgrammedReason}
          />
        </section>

        <section id="access" className="scroll-mt-24">
          <HttpProxyAccessCard proxy={effectiveProxy} projectId={projectId} />
        </section>

        <section id="danger" className="scroll-mt-24">
          <Title as="h3" level={6} weight="medium" className="mb-4">
            Delete Application Load Balancer
          </Title>
          <DangerCard
            deleteText="Delete Application Load Balancer"
            loading={isDeleting}
            onDelete={() => confirmDelete(effectiveProxy)}
            data-e2e="delete-alb-button"
            actionHidden={deleteLoading || !canDelete}>
            {deleteLoading ? (
              <LoaderOverlay />
            ) : (
              !canDelete && (
                <RestrictedOverlay message="You don't have permission to delete this Application Load Balancer" />
              )
            )}
          </DangerCard>
        </section>
      </div>
    </div>
  );
}
