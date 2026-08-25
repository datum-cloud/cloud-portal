import type { ProjectNavSection } from './types';

/**
 * Planned (not-yet-live) services shown in the project sidebar with a
 * Coming Soon badge. Clicking opens the roadmap enhancement URL externally.
 *
 * Prefer declaring placeholders on the plugin's own `portal.nav/project`
 * (`comingSoon` + `roadmapUrl`) once a PortalPlugin is registered — that way
 * going live is a plugin-manifest change only. Keep entries here for services
 * that do not yet have a PortalPlugin at all.
 */
export type PlannedService = {
  id: string;
  title: string;
  section: ProjectNavSection;
  description: string;
  /** GitHub enhancement / roadmap issue URL (opened from the sidebar). */
  roadmapUrl: string;
  /** Order within the section (alongside live items). */
  order: number;
};

export const PLANNED_SERVICES: PlannedService[] = [
  {
    id: 'gslb',
    title: 'GSLB',
    section: 'deliver',
    description: 'Global server load balancing across regions and providers.',
    roadmapUrl: 'https://github.com/datum-cloud/enhancements/issues/833',
    order: 40,
  },
  {
    id: 'object-storage',
    title: 'Object Storage',
    section: 'build',
    description: 'Durable object storage for application data and assets.',
    roadmapUrl: 'https://github.com/datum-cloud/enhancements/issues/837',
    order: 20,
  },
  {
    id: 'edge-apps',
    title: 'Edge Apps',
    section: 'build',
    description: 'Deploy applications at the edge, close to your users.',
    roadmapUrl: 'https://github.com/datum-cloud/enhancements/issues/826',
    order: 30,
  },
  {
    id: 'galactic-vpc',
    title: 'Galactic VPC',
    section: 'connect',
    description: 'Private networking across projects and regions.',
    roadmapUrl: 'https://github.com/datum-cloud/enhancements/issues/475',
    order: 10,
  },
  {
    id: 'interconnects',
    title: 'Interconnects',
    section: 'connect',
    description: 'Dedicated connectivity between Datum and your networks.',
    roadmapUrl: 'https://github.com/datum-cloud/enhancements/issues/718',
    order: 30,
  },
];

export function plannedServicesForSection(section: ProjectNavSection): PlannedService[] {
  return PLANNED_SERVICES.filter((service) => service.section === section).sort(
    (a, b) => a.order - b.order
  );
}
