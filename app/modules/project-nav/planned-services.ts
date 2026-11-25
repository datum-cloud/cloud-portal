import type { ProjectNavSection } from './types';
import { AppWindowIcon, HardDriveIcon, type LucideIcon } from 'lucide-react';

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
 * `roadmapUrl` points at the tracking issue in
 * https://github.com/datum-cloud/enhancements where the work is planned.
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
  /** Row icon; section headers are text-only. */
  icon: LucideIcon;
};

export const PLANNED_SERVICES: PlannedService[] = [
  {
    id: 'object-storage',
    title: 'Object Storage',
    section: 'build',
    description: 'Durable object storage for application data and assets.',
    roadmapUrl: 'https://github.com/datum-cloud/enhancements/issues/837',
    order: 20,
    icon: HardDriveIcon,
  },
  {
    id: 'edge-apps',
    title: 'Edge Apps',
    section: 'build',
    description: 'Deploy applications at the edge, close to your users.',
    roadmapUrl: 'https://github.com/datum-cloud/enhancements/issues/826',
    order: 30,
    icon: AppWindowIcon,
  },
];

export function plannedServicesForSection(section: ProjectNavSection): PlannedService[] {
  return PLANNED_SERVICES.filter((service) => service.section === section).sort(
    (a, b) => a.order - b.order
  );
}
