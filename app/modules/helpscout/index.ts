/**
 * Help Scout module - Entry point for Help Scout Beacon integration
 */

// Main component exports
export { default as HelpScoutBeacon, helpScoutAPI } from './helpscout';
export type { HelpScoutBeaconComponentProps } from './helpscout';

// Type exports
export type {
  HelpScoutUser,
  HelpScoutBeaconConfig,
  HelpScoutBeaconProps,
  HelpScoutAPI,
} from './helpscout.types';

// Utility exports
export {
  isValidBeaconId,
  sanitizeUserData,
  getHelpScoutScriptUrl,
  isHelpScoutLoaded,
} from './helpscout.utils';
