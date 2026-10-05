/**
 * Help Scout Beacon component for customer support integration
 */
import type { HelpScoutUser } from './helpscout.types';
import { getHelpScoutScriptUrl, isValidBeaconId, sanitizeUserData } from './helpscout.utils';
import { useEffect } from 'react';

export interface HelpScoutBeaconComponentProps {
  beaconId: string;
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
  displayStyle?: 'icon' | 'text' | 'iconAndText' | 'manual';
}

/**
 * Settings from the mounted <HelpScoutBeacon>, applied when the script loads.
 * The Beacon is only opened from the header and support links, so the 170KB
 * script loads on the first of those calls instead of on every page.
 */
let pendingSetup: { beaconId: string; config: Record<string, any>; user?: HelpScoutUser } | null =
  null;
let scriptRequested = false;

/**
 * Loads the Beacon script on first use. Commands sent before it arrives go
 * into Help Scout's ready queue and run in order once it loads.
 * Returns false when no <HelpScoutBeacon> is mounted.
 */
function ensureBeacon(): boolean {
  if (scriptRequested) return true;
  if (!pendingSetup || typeof window === 'undefined') return false;
  scriptRequested = true;

  if (!window.Beacon) {
    window.Beacon = function (method: string, options?: any, data?: any) {
      (window.Beacon as any).readyQueue.push({ method, options, data });
    };
    (window.Beacon as any).readyQueue = [];
  }

  const { beaconId, config, user } = pendingSetup;
  window.Beacon('init', beaconId);
  if (Object.keys(config).length > 0) window.Beacon('config', config);
  if (user?.email) window.Beacon('identify', sanitizeUserData(user));

  const firstScript = document.getElementsByTagName('script')[0];
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = getHelpScoutScriptUrl();
  script.onload = () => {
    window.BeaconLoaded = true;
  };
  script.onerror = () => {
    console.error('Failed to load Help Scout Beacon script');
    scriptRequested = false;
  };
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
  return true;
}

/** Sends a command, loading the script first when `load` is set. */
function callBeacon(load: boolean, method: string, ...args: any[]) {
  if (typeof window === 'undefined') return;
  if (load ? !ensureBeacon() : !scriptRequested) return;
  window.Beacon?.(method, ...args);
}

export const HelpScoutBeacon = ({
  beaconId,
  user,
  color,
  icon,
  zIndex,
  instructions,
  showContactFields,
  showGetInTouch,
  showName,
  showSubject,
  poweredBy,
  attachment,
  labels,
  displayStyle,
}: HelpScoutBeaconComponentProps) => {
  const isValidBeacon = beaconId && isValidBeaconId(beaconId);
  if (!isValidBeacon) {
    console.warn('Invalid Help Scout Beacon ID provided');
  }

  // Record the settings; the script itself loads on the first open/toggle.
  useEffect(() => {
    if (!isValidBeacon || typeof window === 'undefined') return;

    const config: Record<string, any> = { display: {} };
    if (color) config.color = color;
    if (icon) config.icon = icon;
    if (zIndex) config.zIndex = zIndex;
    if (instructions) config.instructions = instructions;
    if (showContactFields !== undefined) config.showContactFields = showContactFields;
    if (showGetInTouch !== undefined) config.showGetInTouch = showGetInTouch;
    if (showName !== undefined) config.showName = showName;
    if (showSubject !== undefined) config.showSubject = showSubject;
    if (poweredBy !== undefined) config.poweredBy = poweredBy;
    if (attachment !== undefined) config.attachment = attachment;
    if (labels) config.labels = labels;
    if (displayStyle) config.display.style = displayStyle;

    pendingSetup = { beaconId, config, user };
    // `user` and `labels` are fresh objects each render; key on their contents.
  }, [
    beaconId,
    isValidBeacon,
    user?.name,
    user?.email,
    user?.signature,
    color,
    icon,
    zIndex,
    instructions,
    showContactFields,
    showGetInTouch,
    showName,
    showSubject,
    poweredBy,
    attachment,
    labels?.join(','),
    displayStyle,
  ]);

  useEffect(
    () => () => {
      pendingSetup = null;
      if (!scriptRequested) return;

      const existingScript = document.querySelector(`script[src="${getHelpScoutScriptUrl()}"]`);
      existingScript?.remove();
      window.Beacon?.('destroy');
      window.Beacon = undefined;
      window.BeaconLoaded = false;
      scriptRequested = false;
    },
    []
  );

  return null;
};

// Export default component for easier imports
export default HelpScoutBeacon;

// Export API wrapper for programmatic control
export const helpScoutAPI = {
  /**
   * Opens the Help Scout Beacon
   */
  open: () => {
    callBeacon(true, 'open', { view: 'chat' });
  },

  /**
   * Closes the Help Scout Beacon
   */
  close: () => {
    callBeacon(false, 'close');
  },

  /**
   * Toggles the Help Scout Beacon
   */
  toggle: () => {
    callBeacon(true, 'toggle');
  },

  /**
   * Searches for articles in the Help Scout Beacon
   * @param query - Search query
   */
  search: (query: string) => {
    callBeacon(true, 'search', query);
  },

  /**
   * Suggests articles in the Help Scout Beacon
   * @param articles - Array of article objects
   */
  suggest: (articles: Array<{ id: string; url: string; title: string }>) => {
    callBeacon(true, 'suggest', articles);
  },

  /**
   * Identifies a user in the Help Scout Beacon
   * @param user - User data
   */
  identify: (user: HelpScoutUser) => {
    callBeacon(false, 'identify', sanitizeUserData(user));
  },

  /**
   * Logs out the current user from the Help Scout Beacon
   */
  logout: () => {
    callBeacon(false, 'logout');
  },

  /**
   * Prefills the contact form
   * @param options - Prefill options
   */
  prefill: (options: { subject?: string; text?: string }) => {
    callBeacon(true, 'prefill', options);
  },

  /**
   * Resets the Help Scout Beacon
   */
  reset: () => {
    callBeacon(false, 'reset');
  },

  /**
   * Configures the Help Scout Beacon
   * @param options - Configuration options
   */
  config: (options: Record<string, any>) => {
    callBeacon(false, 'config', options);
  },

  /**
   * Adds an event listener to the Help Scout Beacon
   * @param event - Event name
   * @param callback - Callback function
   */
  on: (event: string, callback: (...args: any[]) => void) => {
    callBeacon(false, 'on', event, callback);
  },

  /**
   * Removes an event listener from the Help Scout Beacon
   * @param event - Event name
   * @param callback - Callback function
   */
  off: (event: string, callback: (...args: any[]) => void) => {
    callBeacon(false, 'off', event, callback);
  },

  /**
   * Checks if Help Scout Beacon is ready
   * @returns boolean indicating if Beacon is loaded and ready
   */
  isReady: (): boolean => {
    return (
      typeof window !== 'undefined' &&
      typeof window.Beacon === 'function' &&
      window.BeaconLoaded === true
    );
  },

  navigate: (view: string) => {
    callBeacon(true, 'navigate', view ?? '/');
  },
};
