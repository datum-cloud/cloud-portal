import {
  buildLocationDirectory,
  buildLocationIndex,
  enrichActivePops,
  formatRegionFilterOption,
  resolveRegionPlace,
} from './enrich-active-pops';
import { getRegionCoordinates } from './region-coordinates';
import type { Location } from '@/resources/locations';
import { describe, expect, it } from 'bun:test';

const ashburn: Location = {
  name: 'us-east-1',
  region: 'us-east-1',
  city: 'Ashburn',
  cityCode: 'IAD',
  country: 'United States',
  locationLabel: 'us-east-1',
  coords: [39.0438, -77.4874],
};

describe('enrichActivePops', () => {
  it('joins by name, region topology, or location label', () => {
    const byName = enrichActivePops(['us-east-1'], [ashburn]);
    expect(byName[0]).toMatchObject({
      city: 'us-east-1',
      cityCode: 'IAD',
      country: 'United States',
      tooltip: 'us-east-1 · United States',
      subtitle: 'United States',
      coords: [39.0438, -77.4874],
    });

    const byLabel = enrichActivePops(
      ['us-east-1'],
      [{ ...ashburn, name: 'iad', region: 'east', locationLabel: 'us-east-1' }]
    );
    expect(byLabel[0]).toMatchObject({
      city: 'east',
      country: 'United States',
      coords: [39.0438, -77.4874],
    });
  });

  it('falls back to hardcoded coords and the region code when unmatched', () => {
    const [pop] = enrichActivePops(['sg-central-1'], []);
    expect(pop.city).toBe('sg-central-1');
    expect(pop.coords).toEqual(getRegionCoordinates('sg-central-1'));
    expect(pop.tooltip).toBe('sg-central-1');
    expect(pop.subtitle).toBe('');
  });

  it('uses the region code even when city and city-code are present', () => {
    expect(enrichActivePops(['us-east-1'], [ashburn])[0].city).toBe('us-east-1');
    expect(
      enrichActivePops(['us-east-1'], [{ ...ashburn, city: undefined, cityCode: undefined }])[0]
        .city
    ).toBe('us-east-1');
  });

  it('keeps pops without coords in the list', () => {
    const [pop] = enrichActivePops(['unknown-region'], []);
    expect(pop.coords).toBeNull();
    expect(pop.city).toBe('unknown-region');
  });
});

describe('formatRegionFilterOption', () => {
  it('uses the region code as the label and country as description', () => {
    expect(formatRegionFilterOption('us-east-1', [ashburn])).toEqual({
      label: 'us-east-1',
      value: 'us-east-1',
      description: 'United States',
    });
  });

  it('falls back to the region code when no location matches', () => {
    expect(formatRegionFilterOption('us-east4', [ashburn])).toEqual({
      label: 'us-east4',
      value: 'us-east4',
    });
  });
});

describe('resolveRegionPlace', () => {
  const index = buildLocationIndex([ashburn]);

  it('returns the country for a known region code', () => {
    expect(resolveRegionPlace('us-east-1', index)).toBe('United States');
  });

  it('matches zone-suffixed codes via normalisation', () => {
    expect(resolveRegionPlace('US-EAST-1-b', index)).toBe('United States');
  });

  it('returns null when the code is unknown', () => {
    expect(resolveRegionPlace('eu-west-9', index)).toBeNull();
  });

  it('returns null when the location adds nothing beyond the code', () => {
    const bare: Location = { name: 'us-central-1', coords: null };
    expect(resolveRegionPlace('us-central-1', buildLocationIndex([bare]))).toBeNull();
  });
});

describe('buildLocationDirectory', () => {
  const dallas: Location = {
    name: 'us-central-1',
    region: 'us-central-1',
    city: 'Dallas',
    cityCode: 'DFW',
    country: 'United States',
    locationLabel: 'us-central-1',
    coords: [32.7767, -96.797],
  };

  it('lists every catalog location and highlights those with traffic', () => {
    const directory = buildLocationDirectory([ashburn, dallas], ['us-east-1']);
    expect(directory.map((item) => item.city)).toEqual(['us-east-1', 'us-central-1']);
    expect(directory[0]).toMatchObject({ active: true, trafficRegion: 'us-east-1' });
    expect(directory[1].active).toBe(false);
  });

  it('appends unmatched prometheus regions so staging traffic is not dropped', () => {
    const directory = buildLocationDirectory([ashburn], ['us-east4']);
    expect(directory).toHaveLength(2);
    expect(directory[0]).toMatchObject({ value: 'us-east4', active: true });
    expect(directory[1]).toMatchObject({ city: 'us-east-1', active: false });
  });
});
