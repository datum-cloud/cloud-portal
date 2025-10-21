/**
 * Help Scout Beacon component for customer support integration
 */
import type { HelpScoutUser } from './helpscout.types';
import { getHelpScoutScriptUrl, isValidBeaconId, sanitizeUserData } from './helpscout.utils';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

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
}: HelpScoutBeaconComponentProps) => {
  const location = useLocation();
  const isLoadedRef = useRef(false);
  const configAppliedRef = useRef(false);

  // Validate beacon ID (but don't return early - hooks must be called consistently)
  const isValidBeacon = beaconId && isValidBeaconId(beaconId);
  if (!isValidBeacon) {
    console.warn('Invalid Help Scout Beacon ID provided');
  }

  // Load Help Scout Beacon script
  useEffect(() => {
    if (!isValidBeacon || isLoadedRef.current || typeof window === 'undefined') {
      return;
    }

    // Initialize Help Scout Beacon using the official pattern
    const initializeBeacon = () => {
      // Initialize Beacon function if it doesn't exist
      if (!window.Beacon) {
        window.Beacon = function (method: string, options?: any, data?: any) {
          (window.Beacon as any).readyQueue = (window.Beacon as any).readyQueue || [];
          (window.Beacon as any).readyQueue.push({ method, options, data });
        };
        (window.Beacon as any).readyQueue = [];
      }

      // Create and append script tag using the official method
      const firstScript = document.getElementsByTagName('script')[0];
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = getHelpScoutScriptUrl();

      script.onload = () => {
        window.BeaconLoaded = true;
        isLoadedRef.current = true;
        // Initialize the Beacon with the Beacon ID
        window.Beacon?.('init', beaconId);

        // Identify user if user data is provided
        if (user?.email) {
          const sanitizedUser = sanitizeUserData(user);
          window.Beacon?.('identify', sanitizedUser);
        }
      };

      script.onerror = () => {
        console.error('Failed to load Help Scout Beacon script');
      };

      // Insert before the first script tag (official pattern)
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }
    };

    // Load immediately if document is ready, otherwise wait for load event
    if (document.readyState === 'complete') {
      initializeBeacon();
    } else {
      const loadHandler = () => {
        initializeBeacon();
        window.removeEventListener('load', loadHandler);
      };
      window.addEventListener('load', loadHandler);
    }

    return () => {
      // Cleanup: remove script if component unmounts
      const existingScript = document.querySelector(`script[src="${getHelpScoutScriptUrl()}"]`);
      if (existingScript) {
        existingScript.remove();
      }

      // Reset Beacon state
      if (window.Beacon) {
        window.Beacon('destroy');
      }
      window.BeaconLoaded = false;
      isLoadedRef.current = false;
    };
  }, [beaconId, isValidBeacon]);

  // Apply configuration when Beacon is ready
  useEffect(() => {
    if (
      !isValidBeacon ||
      typeof window === 'undefined' ||
      !window.Beacon ||
      configAppliedRef.current ||
      !window.BeaconLoaded
    ) {
      return;
    }

    // Apply configuration options directly (no 'ready' callback needed in v2)
    const config: Record<string, any> = {};

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

    if (Object.keys(config).length > 0) {
      window.Beacon?.('config', config);
    }

    configAppliedRef.current = true;
  }, [
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
    isValidBeacon,
  ]);

  // Track page views (optional - helps with context in support conversations)
  useEffect(() => {
    if (!isValidBeacon || typeof window === 'undefined' || !window.Beacon || !window.BeaconLoaded) {
      return;
    }

    // You can optionally track page changes here
    // This helps provide context to support agents
    // For now, we'll skip this to avoid additional API calls
  }, [location.pathname, location.search, isValidBeacon]);

  // This component doesn't render any visible UI
  // Return null but only after all hooks have been called
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
    if (window.Beacon && window.BeaconLoaded) {
      window.Beacon('open', { view: 'chat' });
    }
  },

  /**
   * Closes the Help Scout Beacon
   */
  close: () => {
    if (window.Beacon && window.BeaconLoaded) {
      window.Beacon('close');
    }
  },

  /**
   * Toggles the Help Scout Beacon
   */
  toggle: () => {
    if (window.Beacon && window.BeaconLoaded) {
      window.Beacon('toggle');
    }
  },

  /**
   * Searches for articles in the Help Scout Beacon
   * @param query - Search query
   */
  search: (query: string) => {
    if (window.Beacon && window.BeaconLoaded) {
      window.Beacon('search', query);
    }
  },

  /**
   * Suggests articles in the Help Scout Beacon
   * @param articles - Array of article objects
   */
  suggest: (articles: Array<{ id: string; url: string; title: string }>) => {
    if (window.Beacon && window.BeaconLoaded) {
      window.Beacon('suggest', articles);
    }
  },

  /**
   * Identifies a user in the Help Scout Beacon
   * @param user - User data
   */
  identify: (user: HelpScoutUser) => {
    if (window.Beacon && window.BeaconLoaded) {
      window.Beacon('identify', sanitizeUserData(user));
    }
  },

  /**
   * Logs out the current user from the Help Scout Beacon
   */
  logout: () => {
    if (window.Beacon && window.BeaconLoaded) {
      window.Beacon('logout');
    }
  },

  /**
   * Prefills the contact form
   * @param options - Prefill options
   */
  prefill: (options: { subject?: string; text?: string }) => {
    if (window.Beacon && window.BeaconLoaded) {
      window.Beacon('prefill', options);
    }
  },

  /**
   * Resets the Help Scout Beacon
   */
  reset: () => {
    if (window.Beacon && window.BeaconLoaded) {
      window.Beacon('reset');
    }
  },

  /**
   * Configures the Help Scout Beacon
   * @param options - Configuration options
   */
  config: (options: Record<string, any>) => {
    if (window.Beacon && window.BeaconLoaded) {
      window.Beacon('config', options);
    }
  },

  /**
   * Adds an event listener to the Help Scout Beacon
   * @param event - Event name
   * @param callback - Callback function
   */
  on: (event: string, callback: (...args: any[]) => void) => {
    if (window.Beacon && window.BeaconLoaded) {
      window.Beacon('on', event, callback);
    }
  },

  /**
   * Removes an event listener from the Help Scout Beacon
   * @param event - Event name
   * @param callback - Callback function
   */
  off: (event: string, callback: (...args: any[]) => void) => {
    if (window.Beacon && window.BeaconLoaded) {
      window.Beacon('off', event, callback);
    }
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
    if (window.Beacon && window.BeaconLoaded) {
      window.Beacon('navigate', view ?? '/');
    }
  },
};
