import { Icon } from '@datum-cloud/datum-ui/icons';
import { Box, Building2, ChartSplineIcon, GaugeIcon, Layers, Signpost, Users } from 'lucide-react';

interface KindIconProps {
  kind: string;
  className?: string;
}

/**
 * Renders the Lucide icon for a given resource kind.
 * Falls back to Box for unknown kinds.
 *
 * Domain/DNSZone match the icons the project-detail layout's sidebar nav
 * uses for those sections (LayersIcon / SignpostIcon, which are aliased
 * imports of the same `Layers` / `Signpost` lucide-react exports).
 *
 * Returning the JSX element directly (rather than a component) keeps call
 * sites free of `createElement(...)` and avoids the `react-hooks/static-
 * components` style trap where assigning a PascalCase variable inside the
 * component body would look like "creating a component during render".
 */
export function KindIcon({ kind, className }: KindIconProps) {
  switch (kind) {
    case 'Project':
      return <Icon icon={Box} size={16} className={className} aria-hidden />;
    case 'Organization':
      return <Icon icon={Building2} size={16} className={className} aria-hidden />;
    case 'Group':
      return <Icon icon={Users} size={16} className={className} aria-hidden />;
    case 'Domain':
      return <Icon icon={Layers} size={16} className={className} aria-hidden />;
    case 'DNSZone':
      return <Icon icon={Signpost} size={16} className={className} aria-hidden />;
    case 'HTTPProxy':
      // Matches the GaugeIcon used by the "Edge" nav item in the project layout.
      return <Icon icon={GaugeIcon} size={16} className={className} aria-hidden />;
    case 'ExportPolicy':
      // Matches the ChartSplineIcon used by the "Metrics" nav item.
      return <Icon icon={ChartSplineIcon} size={16} className={className} aria-hidden />;
    default:
      return <Icon icon={Box} size={16} className={className} aria-hidden />;
  }
}

/**
 * Returns the human-readable plural display name for a given resource kind.
 * Falls back to the raw kind string for unknown kinds.
 */
export function kindDisplayName(kind: string): string {
  const map: Record<string, string> = {
    Project: 'Projects',
    Organization: 'Organizations',
    Group: 'Groups',
    Domain: 'Domains',
    DNSZone: 'DNS',
    // Labels mirror the project sidebar nav titles so search group headers
    // feel consistent with the rest of the chrome.
    HTTPProxy: 'AI Edge',
    ExportPolicy: 'Metrics',
  };
  return map[kind] ?? kind;
}
