/**
 * Help Scout Beacon types and interfaces
 */

export interface HelpScoutUser {
  name?: string;
  email?: string;
  signature?: string;
  company?: string;
  jobTitle?: string;
  avatar?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface HelpScoutBeaconConfig {
  beaconId: string;
  secretKey?: string;
  enableSecureMode?: boolean;
  user?: HelpScoutUser;
  color?: string;
  icon?: string;
  zIndex?: number;
  instructions?: string;
  showContactFields?: boolean;
  showGetInTouch?: boolean;
  showName?: boolean;
  showSubject?: boolean;
  poweredBy?: boolean;
  attachment?: boolean;
  labels?: string[];
  translation?: Record<string, string>;
}

export interface HelpScoutBeaconProps {
  config: HelpScoutBeaconConfig;
  user?: HelpScoutUser;
}

export interface HelpScoutAPI {
  ready: (callback: () => void) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  search: (query: string) => void;
  suggest: (articles: Array<{ id: string; url: string; title: string }>) => void;
  identify: (user: HelpScoutUser) => void;
  logout: () => void;
  prefill: (options: { subject?: string; text?: string }) => void;
  reset: () => void;
  config: (options: Partial<HelpScoutBeaconConfig>) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
}

// Extend global Window interface to include Beacon
declare global {
  interface Window {
    Beacon?: (method: string, ...args: any[]) => any;
    BeaconLoaded?: boolean;
  }
}
