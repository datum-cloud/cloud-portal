import {
  buildLinkHeader,
  buildProtectedResourceMetadata,
  buildResourceChallenge,
  resourceMetadataUrl,
} from './agent-discovery';
import { describe, expect, test } from 'bun:test';

const APP = 'https://portal.example';
const ISSUER = 'https://auth.example';

describe('buildProtectedResourceMetadata', () => {
  test('names the portal as the resource and the issuer as its authorization server', () => {
    const doc = buildProtectedResourceMetadata(APP, ISSUER);

    expect(doc.resource).toBe(APP);
    expect(doc.authorization_servers).toEqual([ISSUER]);
  });

  test('advertises bearer tokens in the Authorization header', () => {
    expect(buildProtectedResourceMetadata(APP, ISSUER).bearer_methods_supported).toEqual([
      'header',
    ]);
  });

  test('advertises the scopes the portal actually requests', () => {
    const { scopes_supported: scopes } = buildProtectedResourceMetadata(APP, ISSUER);

    expect(scopes).toContain('openid');
    expect(scopes).toContain('offline_access');
  });

  test('reduces both URLs to their origin, so a path or trailing slash cannot leak in', () => {
    const doc = buildProtectedResourceMetadata(`${APP}/account/`, `${ISSUER}/oauth/v2/`);

    expect(doc.resource).toBe(APP);
    expect(doc.authorization_servers).toEqual([ISSUER]);
  });

  test('omits an authorization server that is not a usable URL rather than emitting a broken one', () => {
    expect(buildProtectedResourceMetadata(APP, '').authorization_servers).toEqual([]);
  });
});

describe('resourceMetadataUrl', () => {
  test('points at the well-known path on the portal itself', () => {
    expect(resourceMetadataUrl(APP)).toBe(`${APP}/.well-known/oauth-protected-resource`);
  });

  test('does not double the slash when the app URL carries one', () => {
    expect(resourceMetadataUrl(`${APP}/`)).toBe(`${APP}/.well-known/oauth-protected-resource`);
  });
});

describe('buildResourceChallenge', () => {
  test('points an unauthenticated caller at the metadata, per RFC 9728 §5.1', () => {
    expect(buildResourceChallenge(APP)).toBe(
      `Bearer resource_metadata="${APP}/.well-known/oauth-protected-resource"`
    );
  });
});

describe('buildLinkHeader', () => {
  test('describes the metadata document with a registered relation type', () => {
    const header = buildLinkHeader();

    expect(header).toContain('</.well-known/oauth-protected-resource>');
    expect(header).toContain('rel="service-desc"');
  });

  test('joins multiple links with a comma so one header carries them all', () => {
    expect(buildLinkHeader().split(',').length).toBeGreaterThan(1);
  });

  test('offers human documentation alongside the machine-readable links', () => {
    expect(buildLinkHeader()).toContain('rel="service-doc"');
  });
});
