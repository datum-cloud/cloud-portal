import { getResourceLabel } from '@/utils/helpers/resource-labels';

describe('getResourceLabel', () => {
  it('returns label for known resource', () => {
    expect(getResourceLabel('projects')).to.equal('Project');
  });

  it('returns label for DNS zone resource', () => {
    expect(getResourceLabel('dnszones')).to.equal('DNS Zone');
  });

  it('returns label for HTTP proxies', () => {
    expect(getResourceLabel('httpproxies')).to.equal('HTTP Proxy');
  });

  it('returns label for domains', () => {
    expect(getResourceLabel('domains')).to.equal('Domain');
  });

  it('returns raw key for unknown resource', () => {
    expect(getResourceLabel('unknownresource')).to.equal('unknownresource');
  });

  it('returns label for organizations', () => {
    expect(getResourceLabel('organizations')).to.equal('Organization');
  });
});
