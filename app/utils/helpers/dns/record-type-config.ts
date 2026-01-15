import { SUPPORTED_DNS_RECORD_TYPES, SupportedDnsRecordType } from './constants';

// =============================================================================
// DNS Record Type Configuration
// Centralized metadata for descriptions, tooltips, labels, and placeholders
// =============================================================================

/**
 * Configuration for a specific field within a record type
 */
export interface DnsRecordFieldConfig {
  /** Field label */
  label?: string;
  /** Input placeholder text */
  placeholder?: string;
  /** Field description (stored for reference, not displayed in form) */
  description?: string;
  /** Tooltip shown on field label hover */
  tooltip?: string;
}

/**
 * Configuration for a DNS record type
 */
export interface DnsRecordTypeConfig {
  /** Full description of the record type */
  description: string;
  /** Short description shown in SelectBox dropdown */
  selectDescription?: string;
  /** Field-specific configurations */
  fields?: Record<string, DnsRecordFieldConfig>;
}

/**
 * Centralized configuration for all DNS record types
 */
export const DNS_RECORD_TYPE_CONFIG: Record<SupportedDnsRecordType, DnsRecordTypeConfig> = {
  SOA: {
    description: 'Contains administrative information about the zone.',
    selectDescription: 'Zone administrative information',
    fields: {
      mname: {
        label: 'Primary NS',
        placeholder: 'e.g., ns1.example.com',
        description: 'The primary nameserver for the zone.',
      },
      rname: {
        label: 'Email',
        placeholder: 'e.g., admin.example.com',
        description: 'Email address of the zone administrator (use dots instead of @).',
      },
      refresh: {
        label: 'Refresh',
        placeholder: 'e.g., 3600',
        description: 'How often secondary nameservers should check for updates.',
      },
      retry: {
        label: 'Retry',
        placeholder: 'e.g., 600',
        description: 'How long to wait before retrying a failed refresh.',
      },
      expire: {
        label: 'Expire',
        placeholder: 'e.g., 86400',
        description: 'How long secondary nameservers should serve stale data.',
      },
      ttl: {
        label: 'Minimum TTL',
        placeholder: 'e.g., 3600',
        description: 'The minimum TTL for negative caching.',
      },
    },
  },
  NS: {
    description: 'Specifies authoritative nameservers for the domain.',
    selectDescription: 'Authoritative nameserver',
    fields: {
      content: {
        label: 'Nameserver',
        placeholder: 'e.g., ns1.example.com',
        description: 'The hostname of the authoritative nameserver.',
      },
    },
  },
  A: {
    description: 'Points a domain to an IPv4 address.',
    selectDescription: 'Points to an IPv4 address',
    fields: {
      content: {
        label: 'IPv4 Address',
        placeholder: 'e.g., 192.168.1.1',
        description: 'The IPv4 address this record points to.',
      },
    },
  },
  AAAA: {
    description: 'Points a domain to an IPv6 address.',
    selectDescription: 'Points to an IPv6 address',
    fields: {
      content: {
        label: 'IPv6 Address',
        placeholder: 'e.g., 2001:db8::1',
        description: 'The IPv6 address this record points to.',
      },
    },
  },
  CNAME: {
    description: 'Creates an alias that points to another domain name.',
    selectDescription: 'Alias to another domain (not for apex)',
    fields: {
      content: {
        label: 'Target Domain',
        placeholder: 'e.g., example.com',
        description: 'The canonical domain name this record aliases to.',
      },
    },
  },
  ALIAS: {
    description:
      'Points a domain to another domain, resolving to A/AAAA records. Works at zone apex.',
    selectDescription: 'CNAME-like record that works at apex (@)',
    fields: {
      content: {
        label: 'Target Domain',
        placeholder: 'e.g., example.com',
        description: 'The target domain that will be resolved to A/AAAA records.',
      },
    },
  },
  MX: {
    description: 'Directs email to mail servers for the domain.',
    selectDescription: 'Mail server for email routing',
    fields: {
      exchange: {
        label: 'Mail Server',
        placeholder: 'e.g., mail.example.com',
        description: 'The hostname of the mail server.',
      },
      preference: {
        label: 'Priority',
        placeholder: 'e.g., 10',
        description: 'Lower values have higher priority.',
      },
    },
  },
  TXT: {
    description: 'Stores text data, commonly used for domain verification and email security.',
    selectDescription: 'Text data for verification & security',
    fields: {
      content: {
        label: 'Content',
        placeholder: 'e.g., v=spf1 include:_spf.google.com ~all',
        description: 'The text content of this record.',
      },
    },
  },
  SRV: {
    description: 'Defines the location of servers for specific services.',
    selectDescription: 'Service location record',
    fields: {
      priority: {
        label: 'Priority',
        placeholder: 'e.g., 10',
        description: 'Lower values have higher priority.',
      },
      weight: {
        label: 'Weight',
        placeholder: 'e.g., 5',
        description: 'Relative weight for records with same priority.',
      },
      port: {
        label: 'Port',
        placeholder: 'e.g., 443',
        description: 'The port number of the service.',
      },
      target: {
        label: 'Target',
        placeholder: 'e.g., server.example.com',
        description: 'The hostname of the server providing the service.',
      },
    },
  },
  CAA: {
    description: 'Specifies which certificate authorities can issue certificates for the domain.',
    selectDescription: 'Certificate authority authorization',
    fields: {
      flag: {
        label: 'Flag',
        description: '0 for non-critical, 128 for critical.',
      },
      tag: {
        label: 'Tag',
        description: 'The CAA property tag (issue, issuewild, or iodef).',
      },
      value: {
        label: 'Value',
        placeholder: 'e.g., letsencrypt.org',
        description: 'The value associated with the tag.',
      },
    },
  },
  PTR: {
    description: 'Maps an IP address to a domain name (reverse DNS).',
    selectDescription: 'Reverse DNS lookup',
    fields: {
      content: {
        label: 'Target Domain',
        placeholder: 'e.g., server.example.com',
        description: 'The domain name this IP address resolves to.',
      },
    },
  },
  TLSA: {
    description: 'Associates TLS certificates with domain names (DANE).',
    selectDescription: 'TLS certificate association (DANE)',
    fields: {
      usage: {
        label: 'Usage',
        description: 'Certificate usage (0-3).',
      },
      selector: {
        label: 'Selector',
        description: '0 for full certificate, 1 for SubjectPublicKeyInfo.',
      },
      matchingType: {
        label: 'Matching Type',
        description: '0 for exact match, 1 for SHA-256, 2 for SHA-512.',
      },
      certData: {
        label: 'Certificate Data',
        placeholder: 'Hexadecimal certificate data',
        description: 'The certificate association data in hexadecimal.',
      },
    },
  },
  HTTPS: {
    description: 'Provides connection information for HTTPS services (RFC 9460).',
    selectDescription: 'HTTPS service binding (RFC 9460)',
    fields: {
      priority: {
        label: 'Priority',
        placeholder: 'e.g., 1',
        description: '0 for alias mode, higher values for service mode.',
      },
      target: {
        label: 'Target',
        placeholder: 'e.g., . or cdn.example.com',
        description: 'The target name (use "." for current origin).',
      },
      params: {
        label: 'Parameters',
        placeholder: 'e.g., alpn=h3,h2 port=443',
        description: 'Service parameters in key=value format.',
      },
    },
  },
  SVCB: {
    description: 'Provides service binding information for arbitrary services (RFC 9460).',
    selectDescription: 'General service binding (RFC 9460)',
    fields: {
      priority: {
        label: 'Priority',
        placeholder: 'e.g., 1',
        description: '0 for alias mode, higher values for service mode.',
      },
      target: {
        label: 'Target',
        placeholder: 'e.g., . or service.example.com',
        description: 'The target name (use "." for current origin).',
      },
      params: {
        label: 'Parameters',
        placeholder: 'e.g., alpn=h3,h2',
        description: 'Service parameters in key=value format.',
      },
    },
  },
};

/**
 * Get configuration for a specific record type
 */
export function getRecordTypeConfig(type: SupportedDnsRecordType): DnsRecordTypeConfig {
  return DNS_RECORD_TYPE_CONFIG[type];
}

/**
 * Get field configuration for a specific record type and field
 */
export function getRecordFieldConfig(
  type: SupportedDnsRecordType,
  fieldName: string
): DnsRecordFieldConfig | undefined {
  return DNS_RECORD_TYPE_CONFIG[type]?.fields?.[fieldName];
}

/**
 * Get SelectBox options for DNS record types with descriptions
 * Uses SUPPORTED_DNS_RECORD_TYPES to maintain consistent ordering
 */
export function getDnsRecordTypeSelectOptions(): Array<{
  value: SupportedDnsRecordType;
  label: string;
  description?: string;
}> {
  return SUPPORTED_DNS_RECORD_TYPES.map((type) => ({
    value: type,
    label: type,
    description: DNS_RECORD_TYPE_CONFIG[type].selectDescription,
  }));
}
