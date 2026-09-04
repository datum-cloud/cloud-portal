export {
  TOPOLOGY_CITY,
  TOPOLOGY_CITY_CODE,
  TOPOLOGY_COUNTRY,
  TOPOLOGY_COUNTRY_CODE,
  TOPOLOGY_PROVINCE,
  TOPOLOGY_PROVINCE_CODE,
  TOPOLOGY_REGION,
  TOPOLOGY_TIMEZONE,
  LABEL_LOCATION,
  locationSchema,
  type Location,
} from './location.schema';

export { toLocation, toLocationList, parseCoordinates } from './location.adapter';

export { createLocationService, locationKeys, type LocationService } from './location.service';

export { useLocations } from './location.queries';

export { useLocationsWatch } from './location.watch';
