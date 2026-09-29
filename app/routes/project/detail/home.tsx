import { BadgeCopy } from '@/components/badge/badge-copy';
import DiscordIcon from '@/components/icon/discord';
import { GitHubLineIcon } from '@/components/icon/github-line';
import { HomeColumns } from '@/features/project/home/home-columns';
import { ProjectSearchBar } from '@/features/search/surfaces/ProjectSearchBar';
import { ProjectHomePluginCards } from '@/modules/plugins/client/plugin-cards';
import { AnalyticsAction, useAnalytics } from '@/modules/rybbit';
import { useApp } from '@/providers/app.provider';
import { useProjectContext } from '@/providers/project.provider';
import NotFound from '@/routes/not-found';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { CalendarFold } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CommunityLink = {
  href: string;
  icon: ReactNode;
  label: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NEW_USER_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

const COMMUNITY_LINKS: CommunityLink[] = [
  {
    href: 'https://link.datum.net/events',
    icon: (
      <Icon icon={CalendarFold} size={16} className="dark:text-icon-tertiary text-icon-primary" />
    ),
    label: 'Huddles & meetups',
  },
  {
    href: 'https://link.datum.net/discord',
    icon: <DiscordIcon className="dark:text-icon-tertiary text-icon-primary size-4" />,
    label: 'Join us on Discord',
  },
  {
    href: 'https://github.com/datum-cloud',
    icon: <GitHubLineIcon className="dark:text-icon-tertiary text-icon-primary size-4" />,
    label: 'Find us on GitHub',
  },
];

// ---------------------------------------------------------------------------
// Route config
// ---------------------------------------------------------------------------

export const handle = {
  breadcrumb: () => <span>Home</span>,
  hideBreadcrumb: true,
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ProjectHomePage() {
  const { project, isLoading } = useProjectContext();
  const { trackAction } = useAnalytics();
  const { user } = useApp();
  const firstProjectViewTrackedRef = useRef(false);

  const isNewUser = Boolean(
    user?.createdAt && Date.now() - new Date(user.createdAt).getTime() < NEW_USER_THRESHOLD_MS
  );

  useEffect(() => {
    if (!isNewUser || firstProjectViewTrackedRef.current) return;
    firstProjectViewTrackedRef.current = true;
    trackAction(AnalyticsAction.FirstProjectView);
  }, [isNewUser, trackAction]);

  if (isLoading) {
    return null;
  }

  if (!project) {
    return <NotFound />;
  }

  const projectName = project.name;

  return (
    <div className="mx-auto flex w-full flex-col gap-8">
      {/* Header */}
      <Row gutter={[16, 8]}>
        <Col md={12} xs={24}>
          <div className="flex flex-col gap-2">
            <Title
              as="h1"
              level={2}
              weight="normal"
              textColor="default"
              className="font-title tracking-normal">
              {isNewUser
                ? `Hey ${user?.givenName ?? 'there'}, glad to have you!`
                : `Welcome back, ${user?.givenName ?? 'there'}`}
            </Title>
            <Text as="p" weight="normal" className="dark:text-card-quaternary text-foreground/60">
              Search your project, or pick up where you left off.
            </Text>
          </div>
        </Col>
        <Col md={12} xs={24}>
          <div className="flex justify-start sm:justify-end">
            <BadgeCopy
              value={project.name ?? ''}
              text={project.name ?? ''}
              badgeTheme="solid"
              badgeType="muted"
              className="bg-table-accent"
            />
          </div>
        </Col>
      </Row>

      {/* Search (the header search is hidden on this page) */}
      <ProjectSearchBar variant="hero" />

      {/* Resource columns */}
      <HomeColumns projectId={projectName} />

      {/* Plugin-contributed project-home cards (portal.card/project-home) */}
      <ProjectHomePluginCards projectId={projectName} />

      {/* Community */}
      <div className="border-card-border dark:border-card flex items-stretch gap-6 overflow-hidden rounded-xl border bg-white/50 px-6 dark:bg-[#18273A]">
        <img
          src="/images/scene-9.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none hidden h-auto w-[60px] shrink-0 self-end pt-4 select-none sm:block"
        />
        <div className="flex flex-1 flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <Title as="h2" level={6} weight="medium">
              Datum community
            </Title>
            <Text as="p" size="xs" className="dark:text-card-quaternary text-foreground/60">
              Looking for some help or want to share some knowledge? We&apos;d love to see you!
            </Text>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {COMMUNITY_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2">
                {link.icon}
                <Text size="xs" className="transition-all group-hover:underline">
                  {link.label}
                </Text>
              </a>
            ))}
          </div>
        </div>
        <img
          src="/images/scene-10.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none hidden h-auto w-[100px] shrink-0 self-end pt-4 select-none md:block"
        />
      </div>
    </div>
  );
}
