import { collectOrganizationDomains } from './organization-domains';
import { describe, expect, it } from 'vitest';

const ready = { conditions: [{ type: 'Ready', status: 'True' }] };
const notReady = { conditions: [{ type: 'Ready', status: 'False' }] };
const verified = { conditions: [{ type: 'Verified', status: 'True' }] };
const pending = { conditions: [{ type: 'Verified', status: 'False' }] };

describe('collectOrganizationDomains', () => {
  it('groups Domains by name and counts only verified Domains in ready projects', () => {
    const domains = collectOrganizationDomains(
      [
        { name: 'web', displayName: 'Web', status: ready },
        { name: 'api', displayName: '', status: ready },
        { name: 'old', displayName: 'Old', status: notReady },
      ],
      {
        web: [
          { name: 'acme', domainName: 'Acme.com.', status: verified },
          { name: 'shop', domainName: 'shop.io', status: pending },
        ],
        api: [{ name: 'acme-2', domainName: 'acme.com', status: pending }],
        old: [{ name: 'legacy', domainName: 'legacy.dev', status: verified }],
      }
    );

    expect(domains).toEqual([
      {
        domainName: 'acme.com',
        verified: true,
        projects: [
          { id: 'web', displayName: 'Web', domainId: 'acme', verified: true },
          { id: 'api', displayName: 'api', domainId: 'acme-2', verified: false },
        ],
      },
      {
        domainName: 'legacy.dev',
        verified: false,
        projects: [{ id: 'old', displayName: 'Old', domainId: 'legacy', verified: false }],
      },
      {
        domainName: 'shop.io',
        verified: false,
        projects: [{ id: 'web', displayName: 'Web', domainId: 'shop', verified: false }],
      },
    ]);
  });

  it('skips projects whose Domains could not be read', () => {
    expect(
      collectOrganizationDomains([{ name: 'web', displayName: 'Web', status: ready }], {
        web: undefined,
      })
    ).toEqual([]);
  });
});
