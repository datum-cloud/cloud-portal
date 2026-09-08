import { createResourceLinkResolver } from './activity-link-resolvers';
import { describe, expect, it } from 'bun:test';

const resolve = createResourceLinkResolver('proj-1');

describe('createResourceLinkResolver', () => {
  it('links HTTPProxy to the ALB detail route', () => {
    expect(
      resolve({
        apiGroup: 'networking.datumapis.com',
        kind: 'HTTPProxy',
        name: 'activities-t2f429',
      })
    ).toBe('/project/proj-1/alb/activities-t2f429');
  });

  it('links TrafficProtectionPolicy to the parent ALB', () => {
    expect(
      resolve({
        apiGroup: 'networking.datumapis.com',
        kind: 'TrafficProtectionPolicy',
        name: 'activities-t2f429',
      })
    ).toBe('/project/proj-1/alb/activities-t2f429');
  });

  it('links SecurityPolicy to the parent ALB', () => {
    expect(
      resolve({
        apiGroup: 'gateway.envoyproxy.io',
        kind: 'SecurityPolicy',
        name: 'activities-t2f429',
      })
    ).toBe('/project/proj-1/alb/activities-t2f429');
  });
});
