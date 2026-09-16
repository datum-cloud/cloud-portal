export {
  networkServiceResourceSchema,
  type NetworkService,
  networkServiceListSchema,
  type NetworkServiceList,
  networkServicePortSchema,
  type NetworkServicePort,
  networkServiceSummarySchema,
  type NetworkServiceSummary,
} from './network-service.schema';

export {
  toNetworkService,
  toNetworkServiceList,
  NETWORK_SERVICE_READY,
  NETWORK_SERVICE_MEMBERS_RESOLVED,
} from './network-service.adapter';

export {
  createNetworkServiceService,
  networkServiceKeys,
  type NetworkServiceService,
} from './network-service.service';

export { useNetworkService, useNetworkServices } from './network-service.queries';
