import { buildLocationDirectory, enrichActivePops } from './enrich-active-pops';
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
      city: 'Ashburn',
      cityCode: 'IAD',
      country: 'United States',
      tooltip: 'IAD · United States · us-east-1',
      subtitle: 'IAD · United States',
      coords: [39.0438, -77.4874],
    });

    const byLabel = enrichActivePops(
      ['us-east-1'],
      [{ ...ashburn, name: 'iad', region: 'east', locationLabel: 'us-east-1' }]
    );
    expect(byLabel[0].city).toBe('Ashburn');
  });

  it('falls back to hardcoded coords and the region code when unmatched', () => {
    const [pop] = enrichActivePops(['sg-central-1'], []);
    expect(pop.city).toBe('sg-central-1');
    expect(pop.coords).toEqual(getRegionCoordinates('sg-central-1'));
    expect(pop.tooltip).toBe('sg-central-1');
  });

  it('prefers city, then city-code, then location name', () => {
    expect(enrichActivePops(['us-east-1'], [{ ...ashburn, city: undefined }])[0].city).toBe('IAD');
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
    expect(directory.map((item) => item.city)).toEqual(['Ashburn', 'Dallas']);
    expect(directory[0]).toMatchObject({ active: true, trafficRegion: 'us-east-1' });
    expect(directory[1].active).toBe(false);
  });

  it('appends unmatched prometheus regions so staging traffic is not dropped', () => {
    const directory = buildLocationDirectory([ashburn], ['us-east4']);
    expect(directory).toHaveLength(2);
    expect(directory[0]).toMatchObject({ value: 'us-east4', active: true });
    expect(directory[1]).toMatchObject({ city: 'Ashburn', active: false });
  });
});
