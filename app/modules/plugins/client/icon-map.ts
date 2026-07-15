/**
 * Plugin nav icon resolution — CLIENT-SAFE.
 *
 * A `portal.nav/project` extension declares `icon` as a *name*, never code
 * (see the manifest contract) so navigation renders without executing plugin
 * code and a broken plugin can never take down the sidebar. The host resolves
 * that name to a lucide component here.
 *
 * lucide-react@1.21 ships no clean dynamic-icon subpath (its `DynamicIcon`
 * lazy-imports one chunk per icon, which is the wrong shape for a nav item that
 * must render immediately), so v1 uses a curated map of common
 * infrastructure/service icons keyed by lucide's canonical kebab-case name,
 * with a puzzle-piece fallback for anything unmapped. Add names here as plugins
 * need them; keep the whole map in this one file.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Antenna,
  Bot,
  Box,
  Boxes,
  Cable,
  ChartBar,
  ChartSpline,
  Cloud,
  Code,
  Container,
  Cpu,
  Database,
  FileLock,
  Folder,
  Gauge,
  GitBranch,
  Globe,
  HardDrive,
  Key,
  Layers,
  Lock,
  MemoryStick,
  Monitor,
  Network,
  Package,
  Plug,
  Puzzle,
  Radio,
  Route,
  Server,
  Settings,
  Share2,
  Shield,
  Signpost,
  Terminal,
  Waypoints,
  Wifi,
  Workflow,
  Zap,
} from 'lucide-react';

/** Fallback when an icon name is absent or unmapped. */
export const FALLBACK_ICON: LucideIcon = Puzzle;

const ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  antenna: Antenna,
  bot: Bot,
  box: Box,
  boxes: Boxes,
  cable: Cable,
  'chart-bar': ChartBar,
  'chart-spline': ChartSpline,
  cloud: Cloud,
  code: Code,
  container: Container,
  cpu: Cpu,
  database: Database,
  'file-lock': FileLock,
  folder: Folder,
  gauge: Gauge,
  'git-branch': GitBranch,
  globe: Globe,
  'hard-drive': HardDrive,
  key: Key,
  layers: Layers,
  lock: Lock,
  'memory-stick': MemoryStick,
  monitor: Monitor,
  network: Network,
  package: Package,
  plug: Plug,
  puzzle: Puzzle,
  radio: Radio,
  route: Route,
  server: Server,
  settings: Settings,
  'share-2': Share2,
  shield: Shield,
  signpost: Signpost,
  terminal: Terminal,
  waypoints: Waypoints,
  wifi: Wifi,
  workflow: Workflow,
  zap: Zap,
};

/**
 * Normalize an incoming icon name to lucide's kebab-case key. Accepts the
 * canonical kebab-case name directly and also tolerates PascalCase/camelCase
 * (`HardDrive`, `hardDrive`) by inserting hyphens at case boundaries.
 */
function normalizeIconName(name: string): string {
  return name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

/** Resolve a lucide icon name to a component, falling back to a puzzle piece. */
export function resolvePluginIcon(name?: string): LucideIcon {
  if (!name) return FALLBACK_ICON;
  return ICONS[normalizeIconName(name)] ?? FALLBACK_ICON;
}
