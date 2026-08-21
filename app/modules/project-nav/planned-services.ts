import type { ProjectNavSection } from './types';
import type { LucideIcon } from 'lucide-react';
import {
  AppWindowIcon,
  BoxesIcon,
  CableIcon,
  CloudIcon,
  HardDriveIcon,
  NetworkIcon,
  ServerIcon,
} from 'lucide-react';

/**
 * Planned (not-yet-live) services shown in the project sidebar with a
 * Coming Soon badge. Clicking opens the roadmap enhancement URL externally.
 */
export type PlannedService = {
  id: string;
  title: string;
  section: ProjectNavSection;
  description: string;
  /** GitHub enhancement / roadmap issue URL (opened from the sidebar). */
  roadmapUrl: string;
  icon: LucideIcon;
  /** Order within the section (alongside live items). */
  order: number;
};

export const PLANNED_SERVICES: PlannedService[] = [
  {
    id: 'gslb',
    title: 'GSLB',
    section: 'deliver',
    description: 'Global server load balancing across regions and providers.',
    roadmapUrl: 'https://github.com/datum-cloud/enhancements/issues/849',
    icon: NetworkIcon,
    order: 40,
  },
  {
    id: 'compute',
    title: 'Compute',
    section: 'build',
    description: 'Run workloads on Datum compute capacity.',
    roadmapUrl: 'https://github.com/datum-cloud/enhancements/issues/849',
    icon: ServerIcon,
    order: 10,
  },
  {
    id: 'object-storage',
    title: 'Object Storage',
    section: 'build',
    description: 'Durable object storage for application data and assets.',
    roadmapUrl: 'https://github.com/datum-cloud/enhancements/issues/849',
    icon: HardDriveIcon,
    order: 20,
  },
  {
    id: 'edge-apps',
    title: 'Edge Apps',
    section: 'build',
    description: 'Deploy applications at the edge, close to your users.',
    roadmapUrl: 'https://github.com/datum-cloud/enhancements/issues/849',
    icon: AppWindowIcon,
    order: 30,
  },
  {
    id: 'galactic-vpc',
    title: 'Galactic VPC',
    section: 'connect',
    description: 'Private networking across projects and regions.',
    roadmapUrl: 'https://github.com/datum-cloud/enhancements/issues/849',
    icon: CloudIcon,
    order: 10,
  },
  {
    id: 'interconnects',
    title: 'Interconnects',
    section: 'connect',
    description: 'Dedicated connectivity between Datum and your networks.',
    roadmapUrl: 'https://github.com/datum-cloud/enhancements/issues/849',
    icon: CableIcon,
    order: 30,
  },
  {
    id: 'usage',
    title: 'Usage',
    section: 'observe',
    description: 'Project-level usage and consumption insights.',
    roadmapUrl: 'https://github.com/datum-cloud/enhancements/issues/849',
    icon: BoxesIcon,
    order: 30,
  },
];

export function plannedServicesForSection(section: ProjectNavSection): PlannedService[] {
  return PLANNED_SERVICES.filter((service) => service.section === section).sort(
    (a, b) => a.order - b.order
  );
}
