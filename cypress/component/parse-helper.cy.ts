import { parseDomainsFromFile } from '@/utils/helpers/parse.helper';

describe('parseDomainsFromFile', () => {
  it('parses one domain per line', () => {
    expect(parseDomainsFromFile('a.com\nb.com')).to.deep.equal(['a.com', 'b.com']);
  });

  it('parses a comma-separated list with no header', () => {
    expect(parseDomainsFromFile('a.com, b.com')).to.deep.equal(['a.com', 'b.com']);
  });

  it('dedupes case-insensitively', () => {
    expect(parseDomainsFromFile('A.com\na.com')).to.deep.equal(['a.com']);
  });

  it('round-trips the export CSV format (snake_case header, quoted registrar with comma)', () => {
    const csv = [
      'domain,registrar,dns_host,expiration_date,verification_status,resource_name',
      'example.com,"GoDaddy.com, LLC",Cloudflare,2027-03-15,Verified,example-com',
      'foo.org,,Akamai,,Unverified,foo-org',
    ].join('\n');
    expect(parseDomainsFromFile(csv)).to.deep.equal(['example.com', 'foo.org']);
  });

  it('extracts the domain column even when it is not first', () => {
    const csv = ['resource_name,domain', 'example-com,example.com'].join('\n');
    expect(parseDomainsFromFile(csv)).to.deep.equal(['example.com']);
  });
});
