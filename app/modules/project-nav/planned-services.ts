import type { ProjectNavSection } from './types';

/**
 * Planned (not-yet-live) services shown in the project sidebar with a
 * Coming Soon badge. When `roadmapUrl` is set, clicks open the host holding
 * page (`/project/:id/coming-soon/:serviceId`) with that URL as the “Learn
 * more” CTA. When omitted, the row is non-interactive (click does nothing).
 *
 * Prefer declaring placeholders on the plugin's own `portal.nav/project`
 * (`comingSoon` + optional `comingSoonMode` / `roadmapUrl`) once a PortalPlugin
 * is registered — that way going live is a plugin-manifest change only. Keep
 * entries here for services that do not yet have a PortalPlugin at all.
 *
 * Marketing deep-links use the `feature-section` anchors on
 * https://www.datum.net/platform/{deliver,build,connect}.
 */
export type PlannedService = {
  id: string;
  title: string;
  section: ProjectNavSection;
  description: string;
  /** Optional website / enhancement URL; required for a clickable holding page. */
  roadmapUrl?: string;
  /** Order within the section (alongside live items). */
  order: number;
};

export const PLANNED_SERVICES: PlannedService[] = [
  {
    id: 'gslb',
    title: 'GSLB',
    section: 'deliver',
    description: 'Global server load balancing across regions and providers.',
    roadmapUrl: 'https://www.datum.net/platform/deliver#global-load-balancer',
    order: 40,
  },
  {
    id: 'object-storage',
    title: 'Object Storage',
    section: 'build',
    description: 'Durable object storage for application data and assets.',
    roadmapUrl: 'https://www.datum.net/platform/build#object-storage',
    order: 20,
  },
  {
    id: 'edge-apps',
    title: 'Edge Apps',
    section: 'build',
    description: 'Deploy applications at the edge, close to your users.',
    roadmapUrl: 'https://www.datum.net/platform/build#edge-apps',
    order: 30,
  },
  {
    id: 'galactic-vpc',
    title: 'Galactic VPC',
    section: 'connect',
    description: 'Private networking across projects and regions.',
    roadmapUrl: 'https://www.datum.net/platform/connect#galactic-vpc',
    order: 10,
  },
  {
    id: 'interconnects',
    title: 'Interconnects',
    section: 'connect',
    description: 'Dedicated connectivity between Datum and your networks.',
    roadmapUrl: 'https://www.datum.net/platform/connect#interconnect',
    order: 30,
  },
];

export function plannedServicesForSection(section: ProjectNavSection): PlannedService[] {
  return PLANNED_SERVICES.filter((service) => service.section === section).sort(
    (a, b) => a.order - b.order
  );
}
