import { z } from 'zod';

// DNS Record Types Enum - Based on Cloudflare & Google Cloud DNS standards
export const DNS_RECORD_TYPES = [
  'A',
  'AAAA',
  'CAA',
  'CNAME',
  'HTTPS',
  'MX',
  'NS',
  'PTR',
  'SOA',
  'SRV',
  'SVCB',
  'TLSA',
  'TXT',
] as const;

export type DNSRecordType = (typeof DNS_RECORD_TYPES)[number];

// Common validation helpers
const ipv4Regex =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

// IPv6 regex supporting all formats (full, compressed, IPv4-mapped)
const ipv6Regex =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|::([fF]{4}(:0{1,4})?:)?((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))$/;

// Domain regex - supports standard domains and trailing dot
const domainRegex =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.?$/;

// SVCB/HTTPS target regex: allows single dot (.) OR valid domain name (RFC 9460)
const svcbTargetRegex =
  /^(\.|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.?)$/;

// Hex string for TLSA certificate data
const hexRegex = /^[0-9A-Fa-f]+$/;

// TTL options in seconds - null/undefined means "Auto"
// Cloudflare: 60-86400 (Enterprise zones allow 30 minimum)
// Google Cloud: recommends 3600 (1 hour) or 86400 (1 day)
export const TTL_OPTIONS = [
  { label: 'Auto', value: null },
  { label: '1 min', value: 60 },
  { label: '2 mins', value: 120 },
  { label: '5 mins', value: 300 },
  { label: '10 mins', value: 600 },
  { label: '15 mins', value: 900 },
  { label: '30 mins', value: 1800 },
  { label: '1 hr', value: 3600 },
  { label: '2 hrs', value: 7200 },
  { label: '5 hrs', value: 18000 },
  { label: '12 hrs', value: 43200 },
  { label: '1 day', value: 86400 },
] as const;

// Base record field schema
export const baseRecordFieldSchema = z.object({
  name: z
    .string({ error: 'Name is required.' })
    .min(1, 'Name is required.')
    .regex(/^(@|\*|\*\.[a-zA-Z0-9._-]+|[*_a-zA-Z0-9]([a-zA-Z0-9-_.]*[a-zA-Z0-9])?)$/, {
      message:
        'Name must be @ (root), * (wildcard), or contain alphanumeric characters, hyphens, underscores, and dots. Service records may start with underscore (e.g., _service._proto).',
    }),
  ttl: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((val) => {
      // Transform empty string or 'auto' to null
      if (val === '' || val === 'auto' || val === null || val === undefined) return null;
      // Coerce string to number
      return typeof val === 'string' ? Number(val) : val;
    })
    .refine((val) => val === null || (typeof val === 'number' && val >= 60 && val <= 86400), {
      message: 'TTL must be Auto or between 60 and 86400 seconds (1 minute to 24 hours).',
    })
    .nullable()
    .optional(),
});

// Type-specific record data schemas

// A Record - IPv4 addresses
export const aRecordDataSchema = z.object({
  content: z
    .string({ error: 'IPv4 address is required.' })
    .regex(ipv4Regex, { message: 'Invalid IPv4 address format.' }),
});

// AAAA Record - IPv6 addresses (supports all formats)
export const aaaaRecordDataSchema = z.object({
  content: z.string({ error: 'IPv6 address is required.' }).regex(ipv6Regex, {
    message: 'Invalid IPv6 address format (supports full, compressed, and IPv4-mapped formats).',
  }),
});

// CNAME Record - Canonical name
// Note: CNAME records cannot coexist with other record types on the same name
export const cnameRecordDataSchema = z.object({
  content: z
    .string({ error: 'Target domain is required.' })
    .regex(domainRegex, { message: 'Invalid domain name format.' })
    .refine((val) => val !== '@', {
      message: 'CNAME cannot point to @ (use A/AAAA record instead).',
    }),
});

// TXT Record - Text content
// Cloudflare: max 2,048 chars per record, max 8,192 total for same name
// Google Cloud: Standard TXT record limits
export const txtRecordDataSchema = z.object({
  content: z
    .string({ error: 'Text content is required.' })
    .min(1, 'Text content cannot be empty.')
    .max(2048, 'Text content cannot exceed 2,048 characters per record'),
});

// MX Record - Mail exchange
export const mxRecordDataSchema = z.object({
  exchange: z
    .string({ error: 'Mail server is required.' })
    .regex(domainRegex, { message: 'Invalid mail server domain.' }),
  preference: z.coerce
    .number({ error: 'Priority is required.' })
    .int('Priority must be an integer.')
    .min(0, 'Priority must be 0 or greater.')
    .max(65535, 'Priority must be less than 65536.'),
});

// SRV Record - Service locator
// Format: _service._proto.name
export const srvRecordDataSchema = z.object({
  target: z
    .string({ error: 'Target server is required.' })
    .regex(domainRegex, { message: 'Invalid target domain.' }),
  port: z.coerce
    .number({ error: 'Port is required.' })
    .int('Port must be an integer.')
    .min(1, 'Port must be between 1 and 65535.')
    .max(65535, 'Port must be between 1 and 65535.'),
  priority: z.coerce
    .number({ error: 'Priority is required.' })
    .int('Priority must be an integer.')
    .min(0, 'Priority must be 0 or greater.')
    .max(65535, 'Priority must be less than 65536.'),
  weight: z.coerce
    .number({ error: 'Weight is required.' })
    .int('Weight must be an integer.')
    .min(0, 'Weight must be 0 or greater.')
    .max(65535, 'Weight must be less than 65536.'),
});

// CAA Record - Certification Authority Authorization
// Tags: issue, issuewild, iodef (RFC 8659)
export const caaRecordDataSchema = z.object({
  flag: z.coerce
    .number({ error: 'Flag is required.' })
    .int('Flag must be an integer.')
    .min(0, 'Flag must be 0 (non-critical) or 128 (critical).')
    .max(255, 'Flag must be less than 256.')
    .refine((val) => val === 0 || val === 128, {
      message: 'Flag should typically be 0 (non-critical) or 128 (critical).',
    }),
  tag: z.enum(['issue', 'issuewild', 'iodef'], {
    error: 'Tag must be one of: issue, issuewild, iodef.',
  }),
  value: z.string({ error: 'Value is required.' }).min(1, 'Value cannot be empty.'),
});

// NS Record - Name server
export const nsRecordDataSchema = z.object({
  content: z
    .string({ error: 'Nameserver is required.' })
    .regex(domainRegex, { message: 'Invalid nameserver domain.' }),
});

// SOA Record - Start of Authority
// Note: Email format uses dots instead of @ (admin@example.com becomes admin.example.com)
export const soaRecordDataSchema = z.object({
  mname: z
    .string({ error: 'Primary nameserver is required.' })
    .regex(domainRegex, { message: 'Invalid primary nameserver domain.' }),
  rname: z
    .string({ error: 'Responsible email is required.' })
    .regex(/^[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}\.?$/, {
      message: 'Invalid email format. Use dot notation: admin.example.com (not admin@example.com)',
    }),
  serial: z.coerce.number().int('Serial must be an integer.').optional(),
  refresh: z.coerce
    .number()
    .int('Refresh must be an integer.')
    .optional()
    .refine((val) => !val || val >= 1200, {
      message: 'Refresh must be at least 1200 seconds (20 minutes).',
    }),
  retry: z.coerce
    .number()
    .int('Retry must be an integer.')
    .optional()
    .refine((val) => !val || val >= 600, {
      message: 'Retry must be at least 600 seconds (10 minutes).',
    }),
  expire: z.coerce
    .number()
    .int('Expire must be an integer.')
    .optional()
    .refine((val) => !val || val >= 604800, {
      message: 'Expire must be at least 604800 seconds (7 days).',
    }),
  ttl: z.coerce
    .number()
    .int('TTL must be an integer.')
    .optional()
    .refine((val) => !val || (val >= 60 && val <= 86400), {
      message: 'TTL must be between 60 and 86400 seconds.',
    }),
});

// PTR Record - Pointer (reverse DNS)
export const ptrRecordDataSchema = z.object({
  content: z
    .string({ error: 'Target domain is required.' })
    .regex(domainRegex, { message: 'Invalid domain name format.' }),
});

// TLSA Record - TLS Authentication (RFC 6698)
// Format: _port._protocol.hostname
// Usage: 0-3, Selector: 0-1, Matching Type: 0-2
export const tlsaRecordDataSchema = z.object({
  usage: z.coerce
    .number({ error: 'Usage is required.' })
    .int('Usage must be an integer.')
    .min(0, 'Usage must be between 0 and 3.')
    .max(3, 'Usage must be between 0 and 3.'),
  selector: z.coerce
    .number({ error: 'Selector is required.' })
    .int('Selector must be an integer.')
    .min(0, 'Selector must be 0 (Full cert) or 1 (SubjectPublicKeyInfo).')
    .max(1, 'Selector must be 0 (Full cert) or 1 (SubjectPublicKeyInfo).'),
  matchingType: z.coerce
    .number({ error: 'Matching type is required.' })
    .int('Matching type must be an integer.')
    .min(0, 'Matching type must be between 0 and 2.')
    .max(2, 'Matching type must be between 0 and 2.'),
  certData: z
    .string({ error: 'Certificate data is required.' })
    .min(1, 'Certificate data cannot be empty.')
    .regex(hexRegex, { message: 'Certificate data must be hexadecimal (0-9, A-F).' }),
});

// HTTPS Record - HTTPS service binding (RFC 9460)
// Priority 0 = alias mode, >0 = service mode
export const httpsRecordDataSchema = z.object({
  priority: z.coerce
    .number({ error: 'Priority is required.' })
    .int('Priority must be an integer.')
    .min(0, 'Priority must be 0 or greater.')
    .max(65535, 'Priority must be less than 65536.'),
  target: z.string({ error: 'Target is required.' }).regex(svcbTargetRegex, {
    message: 'Invalid target. Use . (current origin) or valid domain name.',
  }),
  params: z
    .string()
    .optional()
    .refine((val) => !val || /^([a-z0-9-]+(=[^"\s]+)?(\s+|$))*$/.test(val.trim()), {
      message: 'Params must be in format: key=value key2=value2 (e.g., alpn=h3,h2 port=443)',
    }),
});

// SVCB Record - Service binding (RFC 9460)
export const svcbRecordDataSchema = z.object({
  priority: z.coerce
    .number({ error: 'Priority is required.' })
    .int('Priority must be an integer.')
    .min(0, 'Priority must be 0 or greater.')
    .max(65535, 'Priority must be less than 65536.'),
  target: z.string({ error: 'Target is required.' }).regex(svcbTargetRegex, {
    message: 'Invalid target. Use . (current origin) or valid domain name.',
  }),
  params: z
    .string()
    .optional()
    .refine((val) => !val || /^([a-z0-9-]+(=[^"\s]+)?(\s+|$))*$/.test(val.trim()), {
      message: 'Params must be in format: key=value key2=value2',
    }),
});

// Individual record schemas (combining base + type-specific)
export const aRecordSchema = baseRecordFieldSchema.extend({
  a: aRecordDataSchema,
});

export const aaaaRecordSchema = baseRecordFieldSchema.extend({
  aaaa: aaaaRecordDataSchema,
});

export const cnameRecordSchema = baseRecordFieldSchema.extend({
  cname: cnameRecordDataSchema,
});

export const txtRecordSchema = baseRecordFieldSchema.extend({
  txt: txtRecordDataSchema,
});

export const mxRecordSchema = baseRecordFieldSchema.extend({
  mx: mxRecordDataSchema,
});

export const srvRecordSchema = baseRecordFieldSchema.extend({
  srv: srvRecordDataSchema,
});

export const caaRecordSchema = baseRecordFieldSchema.extend({
  caa: caaRecordDataSchema,
});

export const nsRecordSchema = baseRecordFieldSchema.extend({
  ns: nsRecordDataSchema,
});

export const soaRecordSchema = baseRecordFieldSchema.extend({
  soa: soaRecordDataSchema,
});

export const ptrRecordSchema = baseRecordFieldSchema.extend({
  ptr: ptrRecordDataSchema,
});

export const tlsaRecordSchema = baseRecordFieldSchema.extend({
  tlsa: tlsaRecordDataSchema,
});

export const httpsRecordSchema = baseRecordFieldSchema.extend({
  https: httpsRecordDataSchema,
});

export const svcbRecordSchema = baseRecordFieldSchema.extend({
  svcb: svcbRecordDataSchema,
});

// Main DNS Record Set Schema
export const dnsRecordSetSchema = z.object({
  recordType: z.enum(DNS_RECORD_TYPES, {
    error: 'Record type is required.',
  }),
  dnsZoneRef: z
    .object({
      name: z.string({ error: 'DNS Zone is required.' }).min(1, 'DNS Zone is required.'),
    })
    .optional(),
  records: z.array(
    z.union([
      aRecordSchema,
      aaaaRecordSchema,
      cnameRecordSchema,
      txtRecordSchema,
      mxRecordSchema,
      srvRecordSchema,
      caaRecordSchema,
      nsRecordSchema,
      soaRecordSchema,
      ptrRecordSchema,
      tlsaRecordSchema,
      httpsRecordSchema,
      svcbRecordSchema,
    ])
  ),
});

// Simplified single record schema for inline form
export const createDnsRecordSchema = z.discriminatedUnion('recordType', [
  aRecordSchema.extend({
    recordType: z.literal('A'),
    dnsZoneRef: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
  }),
  aaaaRecordSchema.extend({
    recordType: z.literal('AAAA'),
    dnsZoneRef: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
  }),
  cnameRecordSchema.extend({
    recordType: z.literal('CNAME'),
    dnsZoneRef: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
  }),
  txtRecordSchema.extend({
    recordType: z.literal('TXT'),
    dnsZoneRef: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
  }),
  mxRecordSchema.extend({
    recordType: z.literal('MX'),
    dnsZoneRef: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
  }),
  srvRecordSchema.extend({
    recordType: z.literal('SRV'),
    dnsZoneRef: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
  }),
  caaRecordSchema.extend({
    recordType: z.literal('CAA'),
    dnsZoneRef: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
  }),
  nsRecordSchema.extend({
    recordType: z.literal('NS'),
    dnsZoneRef: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
  }),
  soaRecordSchema.extend({
    recordType: z.literal('SOA'),
    dnsZoneRef: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
  }),
  ptrRecordSchema.extend({
    recordType: z.literal('PTR'),
    dnsZoneRef: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
  }),
  tlsaRecordSchema.extend({
    recordType: z.literal('TLSA'),
    dnsZoneRef: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
  }),
  httpsRecordSchema.extend({
    recordType: z.literal('HTTPS'),
    dnsZoneRef: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
  }),
  svcbRecordSchema.extend({
    recordType: z.literal('SVCB'),
    dnsZoneRef: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
  }),
]);

export const updateDnsRecordSchema = z
  .object({
    resourceVersion: z.string({ error: 'Resource version is required.' }),
  })
  .and(createDnsRecordSchema);

// Type exports
export type ARecordSchema = z.infer<typeof aRecordSchema>;
export type AAAARecordSchema = z.infer<typeof aaaaRecordSchema>;
export type CNAMERecordSchema = z.infer<typeof cnameRecordSchema>;
export type TXTRecordSchema = z.infer<typeof txtRecordSchema>;
export type MXRecordSchema = z.infer<typeof mxRecordSchema>;
export type SRVRecordSchema = z.infer<typeof srvRecordSchema>;
export type CAARecordSchema = z.infer<typeof caaRecordSchema>;
export type NSRecordSchema = z.infer<typeof nsRecordSchema>;
export type SOARecordSchema = z.infer<typeof soaRecordSchema>;
export type PTRRecordSchema = z.infer<typeof ptrRecordSchema>;
export type TLSARecordSchema = z.infer<typeof tlsaRecordSchema>;
export type HTTPSRecordSchema = z.infer<typeof httpsRecordSchema>;
export type SVCBRecordSchema = z.infer<typeof svcbRecordSchema>;

export type CreateDnsRecordSchema = z.infer<typeof createDnsRecordSchema>;
export type UpdateDnsRecordSchema = z.infer<typeof updateDnsRecordSchema>;
export type DnsRecordSetSchema = z.infer<typeof dnsRecordSetSchema>;
