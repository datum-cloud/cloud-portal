import { mapPlaceAddressComponents } from '@/features/address/places-address-mapper';

describe('mapPlaceAddressComponents', () => {
  it('maps a typical US street address', () => {
    const mapped = mapPlaceAddressComponents([
      { longText: '1600', shortText: '1600', types: ['street_number'] },
      { longText: 'Amphitheatre Parkway', shortText: 'Amphitheatre Pkwy', types: ['route'] },
      { longText: 'Mountain View', shortText: 'Mountain View', types: ['locality', 'political'] },
      {
        longText: 'California',
        shortText: 'CA',
        types: ['administrative_area_level_1', 'political'],
      },
      { longText: '94043', shortText: '94043', types: ['postal_code'] },
      { longText: 'United States', shortText: 'US', types: ['country', 'political'] },
    ]);

    expect(mapped).to.deep.equal({
      line1: '1600 Amphitheatre Parkway',
      line2: '',
      city: 'Mountain View',
      region: 'CA',
      postalCode: '94043',
      country: 'US',
    });
  });

  it('uses postal_town when locality is missing (UK-style)', () => {
    const mapped = mapPlaceAddressComponents([
      { longText: '10', shortText: '10', types: ['street_number'] },
      { longText: 'Downing Street', shortText: 'Downing St', types: ['route'] },
      { longText: 'London', shortText: 'London', types: ['postal_town'] },
      {
        longText: 'England',
        shortText: 'England',
        types: ['administrative_area_level_1', 'political'],
      },
      { longText: 'SW1A 2AA', shortText: 'SW1A 2AA', types: ['postal_code'] },
      { longText: 'United Kingdom', shortText: 'GB', types: ['country', 'political'] },
    ]);

    expect(mapped.city).to.equal('London');
    expect(mapped.region).to.equal('England');
    expect(mapped.country).to.equal('GB');
    expect(mapped.line1).to.equal('10 Downing Street');
    expect(mapped.postalCode).to.equal('SW1A 2AA');
  });

  it('maps UK neighborhood to line2 and falls back region via postalAddress / admin2', () => {
    const mapped = mapPlaceAddressComponents(
      [
        { longText: '73', shortText: '73', types: ['street_number'] },
        { longText: 'Queens Road', shortText: 'Queens Rd', types: ['route'] },
        { longText: 'Clifton', shortText: 'Clifton', types: ['neighborhood', 'political'] },
        { longText: 'Bristol', shortText: 'Bristol', types: ['postal_town'] },
        {
          longText: 'City of Bristol',
          shortText: 'City of Bristol',
          types: ['administrative_area_level_2', 'political'],
        },
        { longText: 'BS8 1QP', shortText: 'BS8 1QP', types: ['postal_code'] },
        { longText: 'United Kingdom', shortText: 'GB', types: ['country', 'political'] },
      ],
      // Place Details often omits England from addressComponents when it isn't
      // in formattedAddress — postalAddress.administrativeArea still has it.
      { administrativeArea: 'England', locality: 'Bristol', regionCode: 'GB' }
    );

    expect(mapped).to.deep.equal({
      line1: '73 Queens Road',
      line2: 'Clifton',
      city: 'Bristol',
      region: 'England',
      postalCode: 'BS8 1QP',
      country: 'GB',
    });
  });

  it('uses administrative_area_level_2 for region when admin1 and postal are absent', () => {
    const mapped = mapPlaceAddressComponents([
      { longText: '73', shortText: '73', types: ['street_number'] },
      { longText: 'Queens Road', shortText: 'Queens Rd', types: ['route'] },
      { longText: 'Bristol', shortText: 'Bristol', types: ['postal_town'] },
      {
        longText: 'City of Bristol',
        shortText: 'City of Bristol',
        types: ['administrative_area_level_2', 'political'],
      },
      { longText: 'BS8 1QP', shortText: 'BS8 1QP', types: ['postal_code'] },
      { longText: 'United Kingdom', shortText: 'GB', types: ['country', 'political'] },
    ]);

    expect(mapped.city).to.equal('Bristol');
    expect(mapped.region).to.equal('City of Bristol');
  });

  it('puts subpremise into line2 when present', () => {
    const mapped = mapPlaceAddressComponents([
      { longText: '100', shortText: '100', types: ['street_number'] },
      { longText: 'Main Street', shortText: 'Main St', types: ['route'] },
      { longText: 'Apt 4B', shortText: '4B', types: ['subpremise'] },
      { longText: 'Austin', shortText: 'Austin', types: ['locality'] },
      { longText: 'Texas', shortText: 'TX', types: ['administrative_area_level_1'] },
      { longText: '78701', shortText: '78701', types: ['postal_code'] },
      { longText: 'United States', shortText: 'US', types: ['country'] },
    ]);

    expect(mapped.line1).to.equal('100 Main Street');
    expect(mapped.line2).to.equal('Apt 4B');
    expect(mapped.region).to.equal('TX');
  });

  it('keeps establishment names on line1 and moves the street to line2', () => {
    const mapped = mapPlaceAddressComponents(
      [
        { longText: '32', shortText: '32', types: ['street_number'] },
        { longText: 'London Bridge Street', shortText: 'London Bridge St', types: ['route'] },
        { longText: 'London', shortText: 'London', types: ['postal_town'] },
        {
          longText: 'England',
          shortText: 'England',
          types: ['administrative_area_level_1', 'political'],
        },
        { longText: 'SE1 9SG', shortText: 'SE1 9SG', types: ['postal_code'] },
        { longText: 'United Kingdom', shortText: 'GB', types: ['country', 'political'] },
      ],
      null,
      {
        placeName: 'The Shard',
        placeTypes: ['establishment', 'point_of_interest', 'tourist_attraction'],
      }
    );

    expect(mapped).to.deep.equal({
      line1: 'The Shard',
      line2: '32 London Bridge Street',
      city: 'London',
      region: 'England',
      postalCode: 'SE1 9SG',
      country: 'GB',
    });
  });

  it('does not treat a street-like autocomplete label as an establishment name', () => {
    const mapped = mapPlaceAddressComponents(
      [
        { longText: '73', shortText: '73', types: ['street_number'] },
        { longText: 'Queens Road', shortText: 'Queens Rd', types: ['route'] },
        { longText: 'Bristol', shortText: 'Bristol', types: ['postal_town'] },
        { longText: 'United Kingdom', shortText: 'GB', types: ['country', 'political'] },
      ],
      null,
      { placeName: '73 Queens Road', placeTypes: ['geocode', 'street_address'] }
    );

    expect(mapped.line1).to.equal('73 Queens Road');
    expect(mapped.line2).to.equal('');
  });

  it('falls back to premise when street fields are absent', () => {
    const mapped = mapPlaceAddressComponents([
      { longText: 'Empire State Building', shortText: 'ESB', types: ['premise'] },
      { longText: 'New York', shortText: 'New York', types: ['locality'] },
      { longText: 'New York', shortText: 'NY', types: ['administrative_area_level_1'] },
      { longText: '10118', shortText: '10118', types: ['postal_code'] },
      { longText: 'United States', shortText: 'us', types: ['country'] },
    ]);

    expect(mapped.line1).to.equal('Empire State Building');
    expect(mapped.country).to.equal('US');
  });
});
