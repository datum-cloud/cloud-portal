import { toLocation, parseCoordinates } from './location.adapter';
import {
  LABEL_LOCATION,
  TOPOLOGY_CITY,
  TOPOLOGY_CITY_CODE,
  TOPOLOGY_COUNTRY,
  TOPOLOGY_COUNTRY_CODE,
  TOPOLOGY_PROVINCE,
  TOPOLOGY_PROVINCE_CODE,
  TOPOLOGY_REGION,
  TOPOLOGY_TIMEZONE,
} from './location.schema';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

const ashburnSpec = {
  locationClassRef: { name: 'datum-managed' },
  coordinates: { latitude: '39.0438', longitude: '-77.4874' },
  topology: {
    [TOPOLOGY_CITY]: 'Ashburn',
    [TOPOLOGY_CITY_CODE]: 'IAD',
    [TOPOLOGY_COUNTRY]: 'United States',
    [TOPOLOGY_COUNTRY_CODE]: 'US',
    [TOPOLOGY_PROVINCE]: 'Virginia',
    [TOPOLOGY_PROVINCE_CODE]: 'US-VA',
    [TOPOLOGY_REGION]: 'us-east-1',
    [TOPOLOGY_TIMEZONE]: 'America/New_York',
  },
};

describe('parseCoordinates', () => {
  it('parses decimal-degree strings', () => {
    expect(parseCoordinates({ latitude: '39.0438', longitude: '-77.4874' })).toEqual([
      39.0438, -77.4874,
    ]);
  });

  it('returns null when a value is missing or not finite', () => {
    expect(parseCoordinates(undefined)).toBeNull();
    expect(parseCoordinates({ latitude: '39.0' })).toBeNull();
    expect(parseCoordinates({ latitude: 'n/a', longitude: '0' })).toBeNull();
  });

  it('returns null when values are out of range', () => {
    expect(parseCoordinates({ latitude: '91', longitude: '0' })).toBeNull();
    expect(parseCoordinates({ latitude: '0', longitude: '-181' })).toBeNull();
  });
});

describe('toLocation', () => {
  it('maps name, topology, label, and coordinates from a live Location', () => {
    const location = toLocation({
      metadata: rawMetadata({
        name: 'us-east-1',
        labels: { [LABEL_LOCATION]: 'us-east-1' },
      }),
      spec: ashburnSpec,
    });

    expect(location).toMatchObject({
      name: 'us-east-1',
      region: 'us-east-1',
      city: 'Ashburn',
      cityCode: 'IAD',
      country: 'United States',
      countryCode: 'US',
      province: 'Virginia',
      provinceCode: 'US-VA',
      timezone: 'America/New_York',
      locationLabel: 'us-east-1',
      coords: [39.0438, -77.4874],
    });
  });

  it('defaults missing topology and coordinates', () => {
    const location = toLocation({
      metadata: rawMetadata({ name: 'unknown-1' }),
      spec: { locationClassRef: { name: 'datum-managed' }, topology: {} },
    });

    expect(location.name).toBe('unknown-1');
    expect(location.city).toBeUndefined();
    expect(location.coords).toBeNull();
  });
});
