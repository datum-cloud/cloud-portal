// Service exports
export {
  createTrafficProtectionPolicyService,
  trafficProtectionPolicyKeys,
  type TrafficProtectionPolicyService,
  type TrafficProtectionView,
  type TrafficProtectionMaps,
} from './traffic-protection-policy.service';

// Query hooks exports
export {
  useTrafficProtectionPolicies,
  useTrafficProtectionPolicy,
} from './traffic-protection-policy.queries';

// Watch hooks exports
export { useTrafficProtectionPolicyWatch } from './traffic-protection-policy.watch';
