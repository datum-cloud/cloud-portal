import { z } from 'zod';

export const TOPOLOGY_CITY = 'topology.datum.net/city';
export const TOPOLOGY_CITY_CODE = 'topology.datum.net/city-code';
export const TOPOLOGY_COUNTRY = 'topology.datum.net/country';
export const TOPOLOGY_COUNTRY_CODE = 'topology.datum.net/country-code';
export const TOPOLOGY_PROVINCE = 'topology.datum.net/province';
export const TOPOLOGY_PROVINCE_CODE = 'topology.datum.net/province-code';
export const TOPOLOGY_REGION = 'topology.datum.net/region';
export const TOPOLOGY_TIMEZONE = 'topology.datum.net/timezone';
export const LABEL_LOCATION = 'networking.datumapis.com/location';

export const locationSchema = z.object({
  name: z.string(),
  region: z.string().optional(),
  city: z.string().optional(),
  cityCode: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
  province: z.string().optional(),
  provinceCode: z.string().optional(),
  timezone: z.string().optional(),
  locationLabel: z.string().optional(),
  coords: z.tuple([z.number(), z.number()]).nullable(),
});

export type Location = z.infer<typeof locationSchema>;
