import { z } from 'zod';

// DNS Record Types Enum
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
const ipv6Regex = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;
const domainRegex =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.?$/;

// TTL options in seconds - null/undefined means "Auto"
export const TTL_OPTIONS = [
  { label: 'Auto', value: null },
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '15 min', value: 900 },
  { label: '30 min', value: 1800 },
  { label: '1 hr', value: 3600 },
  { label: '2 hr', value: 7200 },
  { label: '5 hr', value: 18000 },
  { label: '12 hr', value: 43200 },
  { label: '1 day', value: 86400 },
] as const;

// Base record field schema
export const baseRecordFieldSchema = z.object({
  name: z
    .string({ error: 'Name is required.' })
    .min(1, 'Name is required.')
    .regex(/^(@|[a-zA-Z0-9]([a-zA-Z0-9-_.]*[a-zA-Z0-9])?)$/, {
      message:
        'Name must be @ (root domain) or contain only alphanumeric characters, hyphens, underscores, and dots.',
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

// AAAA Record - IPv6 addresses
export const aaaaRecordDataSchema = z.object({
  content: z
    .string({ error: 'IPv6 address is required.' })
    .regex(ipv6Regex, { message: 'Invalid IPv6 address format.' }),
});

// CNAME Record - Canonical name
export const cnameRecordDataSchema = z.object({
  content: z
    .string({ error: 'Target domain is required.' })
    .regex(domainRegex, { message: 'Invalid domain name format.' }),
});

// TXT Record - Text content
export const txtRecordDataSchema = z.object({
  content: z
    .string({ error: 'Text content is required.' })
    .min(1, 'Text content cannot be empty.')
    .max(255, 'Text content cannot exceed 255 characters per string.'),
});

// MX Record - Mail exchange
export const mxRecordDataSchema = z.object({
  exchange: z
    .string({ error: 'Mail server is required.' })
    .regex(domainRegex, { message: 'Invalid mail server domain.' }),
  preference: z.coerce
    .number({ error: 'Priority is required.' })
    .min(0, 'Priority must be 0 or greater.')
    .max(65535, 'Priority must be less than 65536.'),
});

// SRV Record - Service locator
export const srvRecordDataSchema = z.object({
  target: z
    .string({ error: 'Target server is required.' })
    .regex(domainRegex, { message: 'Invalid target domain.' }),
  port: z.coerce
    .number({ error: 'Port is required.' })
    .min(1, 'Port must be between 1 and 65535.')
    .max(65535, 'Port must be between 1 and 65535.'),
  priority: z.coerce
    .number({ error: 'Priority is required.' })
    .min(0, 'Priority must be 0 or greater.')
    .max(65535, 'Priority must be less than 65536.'),
  weight: z.coerce
    .number({ error: 'Weight is required.' })
    .min(0, 'Weight must be 0 or greater.')
    .max(65535, 'Weight must be less than 65536.'),
});

// CAA Record - Certification Authority Authorization
export const caaRecordDataSchema = z.object({
  flag: z.coerce
    .number({ error: 'Flag is required.' })
    .min(0, 'Flag must be 0 or greater.')
    .max(255, 'Flag must be less than 256.'),
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
export const soaRecordDataSchema = z.object({
  mname: z
    .string({ error: 'Primary nameserver is required.' })
    .regex(domainRegex, { message: 'Invalid primary nameserver domain.' }),
  rname: z
    .string({ error: 'Responsible email is required.' })
    .regex(/^[a-zA-Z0-9._%+-]+\.[a-zA-Z]{2,}$/, {
      message: 'Invalid email format (use dot instead of @).',
    }),
  serial: z.coerce.number().optional(),
  refresh: z.coerce
    .number()
    .optional()
    .refine((val) => !val || val >= 1200, {
      message: 'Refresh must be at least 1200 seconds.',
    }),
  retry: z.coerce
    .number()
    .optional()
    .refine((val) => !val || val >= 600, {
      message: 'Retry must be at least 600 seconds.',
    }),
  expire: z.coerce
    .number()
    .optional()
    .refine((val) => !val || val >= 604800, {
      message: 'Expire must be at least 604800 seconds (7 days).',
    }),
  ttl: z.coerce
    .number()
    .optional()
    .refine((val) => !val || (val >= 60 && val <= 86400), {
      message: 'TTL must be between 60 and 86400 seconds.',
    }),
});

// PTR Record - Pointer
export const ptrRecordDataSchema = z.object({
  content: z
    .string({ error: 'Target domain is required.' })
    .regex(domainRegex, { message: 'Invalid domain name format.' }),
});

// TLSA Record - TLS Authentication
export const tlsaRecordDataSchema = z.object({
  usage: z.coerce
    .number({ error: 'Usage is required.' })
    .min(0, 'Usage must be between 0 and 3.')
    .max(3, 'Usage must be between 0 and 3.'),
  selector: z.coerce
    .number({ error: 'Selector is required.' })
    .min(0, 'Selector must be 0 or 1.')
    .max(1, 'Selector must be 0 or 1.'),
  matchingType: z.coerce
    .number({ error: 'Matching type is required.' })
    .min(0, 'Matching type must be between 0 and 2.')
    .max(2, 'Matching type must be between 0 and 2.'),
  certData: z
    .string({ error: 'Certificate data is required.' })
    .regex(/^[0-9A-Fa-f]+$/, { message: 'Certificate data must be hexadecimal.' }),
});

// HTTPS Record - HTTPS service binding
export const httpsRecordDataSchema = z.object({
  priority: z.coerce
    .number({ error: 'Priority is required.' })
    .min(0, 'Priority must be 0 or greater.')
    .max(65535, 'Priority must be less than 65536.'),
  target: z
    .string({ error: 'Target is required.' })
    .regex(domainRegex, { message: 'Invalid target domain.' }),
  params: z.record(z.string(), z.string()).optional(),
});

// SVCB Record - Service binding
export const svcbRecordDataSchema = z.object({
  priority: z.coerce
    .number({ error: 'Priority is required.' })
    .min(0, 'Priority must be 0 or greater.')
    .max(65535, 'Priority must be less than 65536.'),
  target: z
    .string({ error: 'Target is required.' })
    .regex(domainRegex, { message: 'Invalid target domain.' }),
  params: z.record(z.string(), z.string()).optional(),
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
  mx: z.array(mxRecordDataSchema).min(1, 'At least one MX record is required.'),
});

export const srvRecordSchema = baseRecordFieldSchema.extend({
  srv: z.array(srvRecordDataSchema).min(1, 'At least one SRV record is required.'),
});

export const caaRecordSchema = baseRecordFieldSchema.extend({
  caa: z.array(caaRecordDataSchema).min(1, 'At least one CAA record is required.'),
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
  tlsa: z.array(tlsaRecordDataSchema).min(1, 'At least one TLSA record is required.'),
});

export const httpsRecordSchema = baseRecordFieldSchema.extend({
  https: z.array(httpsRecordDataSchema).min(1, 'At least one HTTPS record is required.'),
});

export const svcbRecordSchema = baseRecordFieldSchema.extend({
  svcb: z.array(svcbRecordDataSchema).min(1, 'At least one SVCB record is required.'),
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
