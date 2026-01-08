import { CreateDnsRecordSchema, DNSRecordType } from '@/resources/dns-records';

export interface TestScenario {
  id: string;
  name: string;
  recordType: DNSRecordType;
  data: CreateDnsRecordSchema;
  isDefault: boolean;
}

/**
 * Default test scenarios for DNS record validation testing
 * 3 scenarios per type: valid example, common use case, invalid example
 */
export const DEFAULT_TEST_SCENARIOS: Record<DNSRecordType, TestScenario[]> = {
  A: [
    {
      id: 'a-default-valid',
      name: 'Default Valid',
      recordType: 'A',
      data: {
        recordType: 'A',
        name: 'www',
        ttl: null,
        a: { content: '192.168.1.1' },
      },
      isDefault: true,
    },
    {
      id: 'a-root',
      name: 'Root Domain (@)',
      recordType: 'A',
      data: {
        recordType: 'A',
        name: '@',
        ttl: 3600,
        a: { content: '10.0.0.1' },
      },
      isDefault: true,
    },
    {
      id: 'a-invalid-ip',
      name: 'Invalid IP Format',
      recordType: 'A',
      data: {
        recordType: 'A',
        name: 'test',
        ttl: null,
        a: { content: '256.1.1.1' },
      },
      isDefault: true,
    },
  ],

  AAAA: [
    {
      id: 'aaaa-default-valid',
      name: 'Default Valid',
      recordType: 'AAAA',
      data: {
        recordType: 'AAAA',
        name: 'www',
        ttl: null,
        aaaa: { content: '2001:0db8::1' },
      },
      isDefault: true,
    },
    {
      id: 'aaaa-compressed',
      name: 'Compressed IPv6',
      recordType: 'AAAA',
      data: {
        recordType: 'AAAA',
        name: '@',
        ttl: 3600,
        aaaa: { content: '::1' },
      },
      isDefault: true,
    },
    {
      id: 'aaaa-invalid',
      name: 'Invalid IPv6 (IPv4)',
      recordType: 'AAAA',
      data: {
        recordType: 'AAAA',
        name: 'test',
        ttl: null,
        aaaa: { content: '192.168.1.1' },
      },
      isDefault: true,
    },
  ],

  CNAME: [
    {
      id: 'cname-default-valid',
      name: 'Default Valid',
      recordType: 'CNAME',
      data: {
        recordType: 'CNAME',
        name: 'www',
        ttl: null,
        cname: { content: 'example.com' },
      },
      isDefault: true,
    },
    {
      id: 'cname-subdomain',
      name: 'Subdomain Target',
      recordType: 'CNAME',
      data: {
        recordType: 'CNAME',
        name: 'cdn',
        ttl: 3600,
        cname: { content: 'cdn.example.com' },
      },
      isDefault: true,
    },
    {
      id: 'cname-invalid-root',
      name: 'Invalid Root (@)',
      recordType: 'CNAME',
      data: {
        recordType: 'CNAME',
        name: 'test',
        ttl: null,
        cname: { content: '@' },
      },
      isDefault: true,
    },
  ],

  TXT: [
    {
      id: 'txt-default-valid',
      name: 'Default Valid',
      recordType: 'TXT',
      data: {
        recordType: 'TXT',
        name: '@',
        ttl: null,
        txt: { content: 'v=spf1 include:_spf.example.com ~all' },
      },
      isDefault: true,
    },
    {
      id: 'txt-verification',
      name: 'Site Verification',
      recordType: 'TXT',
      data: {
        recordType: 'TXT',
        name: '@',
        ttl: 3600,
        txt: { content: 'google-site-verification=1234567890abcdef' },
      },
      isDefault: true,
    },
    {
      id: 'txt-too-long',
      name: 'Invalid Too Long',
      recordType: 'TXT',
      data: {
        recordType: 'TXT',
        name: 'test',
        ttl: null,
        txt: { content: 'a'.repeat(2049) }, // Exceeds 2048 char limit
      },
      isDefault: true,
    },
  ],

  MX: [
    {
      id: 'mx-default-valid',
      name: 'Default Valid',
      recordType: 'MX',
      data: {
        recordType: 'MX',
        name: '@',
        ttl: null,
        mx: { exchange: 'mail.example.com', preference: 10 },
      },
      isDefault: true,
    },
    {
      id: 'mx-backup',
      name: 'Backup Mail Server',
      recordType: 'MX',
      data: {
        recordType: 'MX',
        name: '@',
        ttl: 3600,
        mx: { exchange: 'backup.mail.example.com', preference: 20 },
      },
      isDefault: true,
    },
    {
      id: 'mx-invalid-priority',
      name: 'Invalid Priority',
      recordType: 'MX',
      data: {
        recordType: 'MX',
        name: '@',
        ttl: null,
        mx: { exchange: 'mail.example.com', preference: 70000 }, // Exceeds 65535
      },
      isDefault: true,
    },
  ],

  SRV: [
    {
      id: 'srv-default-valid',
      name: 'Default Valid',
      recordType: 'SRV',
      data: {
        recordType: 'SRV',
        name: '_http._tcp',
        ttl: null,
        srv: { target: 'server.example.com', port: 80, priority: 10, weight: 5 },
      },
      isDefault: true,
    },
    {
      id: 'srv-https',
      name: 'HTTPS Service',
      recordType: 'SRV',
      data: {
        recordType: 'SRV',
        name: '_https._tcp',
        ttl: 3600,
        srv: { target: 'secure.example.com', port: 443, priority: 10, weight: 10 },
      },
      isDefault: true,
    },
    {
      id: 'srv-invalid-port',
      name: 'Invalid Port',
      recordType: 'SRV',
      data: {
        recordType: 'SRV',
        name: '_service._tcp',
        ttl: null,
        srv: { target: 'server.example.com', port: 70000, priority: 10, weight: 5 }, // Exceeds 65535
      },
      isDefault: true,
    },
  ],

  CAA: [
    {
      id: 'caa-default-valid',
      name: 'Default Valid',
      recordType: 'CAA',
      data: {
        recordType: 'CAA',
        name: '@',
        ttl: null,
        caa: { flag: 0, tag: 'issue', value: 'letsencrypt.org' },
      },
      isDefault: true,
    },
    {
      id: 'caa-wildcard',
      name: 'Wildcard Issue',
      recordType: 'CAA',
      data: {
        recordType: 'CAA',
        name: '@',
        ttl: 3600,
        caa: { flag: 0, tag: 'issuewild', value: 'letsencrypt.org' },
      },
      isDefault: true,
    },
    {
      id: 'caa-invalid-flag',
      name: 'Invalid Flag',
      recordType: 'CAA',
      data: {
        recordType: 'CAA',
        name: '@',
        ttl: null,
        caa: { flag: 5 as 0 | 128, tag: 'issue', value: 'ca.example.com' }, // Intentionally invalid: Flag must be 0 or 128
      },
      isDefault: true,
    },
  ],

  NS: [
    {
      id: 'ns-default-valid',
      name: 'Default Valid',
      recordType: 'NS',
      data: {
        recordType: 'NS',
        name: '@',
        ttl: null,
        ns: { content: 'ns1.example.com' },
      },
      isDefault: true,
    },
    {
      id: 'ns-subdomain',
      name: 'Subdomain Delegation',
      recordType: 'NS',
      data: {
        recordType: 'NS',
        name: 'subdomain',
        ttl: 3600,
        ns: { content: 'ns1.subdomain.example.com' },
      },
      isDefault: true,
    },
    {
      id: 'ns-invalid-domain',
      name: 'Invalid Domain',
      recordType: 'NS',
      data: {
        recordType: 'NS',
        name: '@',
        ttl: null,
        ns: { content: 'invalid domain name' }, // Invalid format
      },
      isDefault: true,
    },
  ],

  SOA: [
    {
      id: 'soa-default-valid',
      name: 'Default Valid',
      recordType: 'SOA',
      data: {
        recordType: 'SOA',
        name: '@',
        ttl: null,
        soa: {
          mname: 'ns1.example.com',
          rname: 'admin.example.com',
          serial: 2024010101,
          refresh: 7200,
          retry: 3600,
          expire: 1209600,
          ttl: 86400,
        },
      },
      isDefault: true,
    },
    {
      id: 'soa-custom',
      name: 'Custom Timers',
      recordType: 'SOA',
      data: {
        recordType: 'SOA',
        name: '@',
        ttl: 3600,
        soa: {
          mname: 'primary.example.com',
          rname: 'hostmaster.example.com',
          serial: 2024010102,
          refresh: 3600,
          retry: 1800,
          expire: 604800,
          ttl: 3600,
        },
      },
      isDefault: true,
    },
    {
      id: 'soa-invalid-refresh',
      name: 'Invalid Refresh',
      recordType: 'SOA',
      data: {
        recordType: 'SOA',
        name: '@',
        ttl: null,
        soa: {
          mname: 'ns1.example.com',
          rname: 'admin.example.com',
          refresh: 100, // Must be >= 1200
          retry: 600,
          expire: 604800,
        },
      },
      isDefault: true,
    },
  ],

  PTR: [
    {
      id: 'ptr-default-valid',
      name: 'Default Valid',
      recordType: 'PTR',
      data: {
        recordType: 'PTR',
        name: '1.1.168.192.in-addr.arpa',
        ttl: null,
        ptr: { content: 'server.example.com' },
      },
      isDefault: true,
    },
    {
      id: 'ptr-ipv6',
      name: 'IPv6 Reverse',
      recordType: 'PTR',
      data: {
        recordType: 'PTR',
        name: '1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.ip6.arpa',
        ttl: 3600,
        ptr: { content: 'server.example.com' },
      },
      isDefault: true,
    },
    {
      id: 'ptr-invalid-target',
      name: 'Invalid Target',
      recordType: 'PTR',
      data: {
        recordType: 'PTR',
        name: '1.1.168.192.in-addr.arpa',
        ttl: null,
        ptr: { content: 'invalid domain name!' }, // Invalid format
      },
      isDefault: true,
    },
  ],

  TLSA: [
    {
      id: 'tlsa-default-valid',
      name: 'Default Valid',
      recordType: 'TLSA',
      data: {
        recordType: 'TLSA',
        name: '_443._tcp',
        ttl: null,
        tlsa: {
          usage: 3,
          selector: 1,
          matchingType: 1,
          certData: 'a1b2c3d4e5f67890abcdef1234567890',
        },
      },
      isDefault: true,
    },
    {
      id: 'tlsa-full-cert',
      name: 'Full Certificate',
      recordType: 'TLSA',
      data: {
        recordType: 'TLSA',
        name: '_443._tcp.www',
        ttl: 3600,
        tlsa: {
          usage: 1,
          selector: 0,
          matchingType: 0,
          certData: 'fedcba0987654321fedcba0987654321',
        },
      },
      isDefault: true,
    },
    {
      id: 'tlsa-invalid-hex',
      name: 'Invalid Hex Data',
      recordType: 'TLSA',
      data: {
        recordType: 'TLSA',
        name: '_443._tcp',
        ttl: null,
        tlsa: {
          usage: 3,
          selector: 1,
          matchingType: 1,
          certData: 'xyz123', // Invalid hex
        },
      },
      isDefault: true,
    },
  ],

  HTTPS: [
    {
      id: 'https-default-valid',
      name: 'Default Valid',
      recordType: 'HTTPS',
      data: {
        recordType: 'HTTPS',
        name: '@',
        ttl: null,
        https: { priority: 1, target: '.', params: 'alpn=h3,h2 port=443' },
      },
      isDefault: true,
    },
    {
      id: 'https-alias',
      name: 'Alias Mode',
      recordType: 'HTTPS',
      data: {
        recordType: 'HTTPS',
        name: 'www',
        ttl: 3600,
        https: { priority: 0, target: 'example.com', params: '' },
      },
      isDefault: true,
    },
    {
      id: 'https-invalid-priority',
      name: 'Invalid Priority',
      recordType: 'HTTPS',
      data: {
        recordType: 'HTTPS',
        name: '@',
        ttl: null,
        https: { priority: 70000, target: '.', params: '' }, // Exceeds 65535
      },
      isDefault: true,
    },
  ],

  SVCB: [
    {
      id: 'svcb-default-valid',
      name: 'Default Valid',
      recordType: 'SVCB',
      data: {
        recordType: 'SVCB',
        name: '_service',
        ttl: null,
        svcb: { priority: 1, target: 'server.example.com', params: 'port=8080' },
      },
      isDefault: true,
    },
    {
      id: 'svcb-alias',
      name: 'Alias Mode',
      recordType: 'SVCB',
      data: {
        recordType: 'SVCB',
        name: '_service',
        ttl: 3600,
        svcb: { priority: 0, target: 'primary.example.com', params: '' },
      },
      isDefault: true,
    },
    {
      id: 'svcb-invalid-target',
      name: 'Invalid Target',
      recordType: 'SVCB',
      data: {
        recordType: 'SVCB',
        name: '_service',
        ttl: null,
        svcb: { priority: 1, target: 'invalid target!', params: '' }, // Invalid format
      },
      isDefault: true,
    },
  ],
};

/**
 * Get all test scenarios as a flat array
 */
export function getAllTestScenarios(): TestScenario[] {
  return Object.values(DEFAULT_TEST_SCENARIOS).flat();
}

/**
 * Get test scenarios for a specific record type
 */
export function getTestScenariosForType(recordType: DNSRecordType): TestScenario[] {
  return DEFAULT_TEST_SCENARIOS[recordType] || [];
}
