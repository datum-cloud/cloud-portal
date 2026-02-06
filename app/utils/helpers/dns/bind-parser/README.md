# BIND Zone File Parser

A self-contained, RFC 1035 compliant parser for DNS zone files.

## Features

- **Zero external dependencies** - Fully self-contained module for plug-and-play usage
- **Multi-format support** - Parses zone files from various providers:
  - Standard BIND format
  - Cloudflare zone exports
  - Google Cloud DNS exports
  - AWS Route53 exports
- **Multiline record handling** - Correctly parses SOA and other records spanning multiple lines
- **Comment handling** - Strips comments while preserving quoted strings containing semicolons

## Supported Record Types

| Type  | Description                         |
| ----- | ----------------------------------- |
| A     | IPv4 address                        |
| AAAA  | IPv6 address                        |
| CNAME | Canonical name (alias)              |
| MX    | Mail exchange                       |
| TXT   | Text record                         |
| NS    | Name server                         |
| PTR   | Pointer record                      |
| SRV   | Service locator                     |
| CAA   | Certificate Authority Authorization |
| SOA   | Start of Authority                  |
| TLSA  | TLS Authentication                  |
| HTTPS | HTTPS service binding               |
| SVCB  | Service binding                     |

## Usage

```typescript
import { parseBindZoneFile } from '@/modules/bind-parser';

const zoneFileContent = `
$ORIGIN example.com.
$TTL 3600

@       IN  SOA   ns1.example.com. admin.example.com. (
                  2024010101  ; serial
                  3600        ; refresh
                  600         ; retry
                  604800      ; expire
                  3600        ; minimum
                  )

@       IN  NS    ns1.example.com.
@       IN  NS    ns2.example.com.
@       IN  A     192.0.2.1
www     IN  A     192.0.2.2
mail    IN  MX    10 mail.example.com.
`;

const result = parseBindZoneFile(zoneFileContent);

console.log(result.records); // Parsed DNS records
console.log(result.errors); // Any parsing errors
console.log(result.warnings); // Warnings (e.g., unsupported record types)
```

## API

### `parseBindZoneFile(content: string): BindParseResult`

Parses a BIND zone file content string into structured DNS records.

#### Parameters

- `content` - Raw zone file content as a string

#### Returns

```typescript
interface BindParseResult {
  records: ParsedDnsRecord[]; // Successfully parsed records
  errors: string[]; // Critical parsing errors
  warnings: string[]; // Non-critical warnings
}

interface ParsedDnsRecord {
  name: string; // Record name (e.g., '@', 'www', 'mail')
  ttl: number | null; // TTL in seconds, or null for default
  type: DNSRecordType; // Record type (e.g., 'A', 'MX', 'SOA')
  value: string; // Display value (formatted for UI)
  data: Record<string, unknown>; // Structured data for the record type
}
```

## Module Structure

```
bind-parser/
├── index.ts          # Main parser and exports
├── preprocessor.ts   # Comment removal, multiline collapsing, directive extraction
├── tokenizer.ts      # Line tokenization and field extraction
├── rdata-parsers.ts  # Type-specific RDATA parsers
├── types.ts          # TypeScript type definitions
└── README.md         # This file
```

## Record Value Formats

The `value` field in parsed records uses consistent formats:

| Type                         | Format                                 | Example                                                |
| ---------------------------- | -------------------------------------- | ------------------------------------------------------ |
| A, AAAA, CNAME, NS, PTR, TXT | `content`                              | `192.0.2.1`                                            |
| MX                           | `preference\|exchange`                 | `10\|mail.example.com`                                 |
| SRV                          | `priority weight port target`          | `10 5 5060 sip.example.com`                            |
| CAA                          | `flag tag value`                       | `0 issue letsencrypt.org`                              |
| SOA                          | JSON string                            | `{"mname":"ns1...","rname":"admin...","serial":1,...}` |
| TLSA                         | `usage selector matchingType certData` | `3 1 1 abc123...`                                      |
| HTTPS/SVCB                   | `priority target [params]`             | `1 . alpn="h2,h3"`                                     |

## Warnings

The parser generates warnings for recognized but unsupported record types:

- `SPF` - Should be TXT records per RFC 7208
- `DS`, `DNSKEY`, `RRSIG`, `NSEC`, `NSEC3` - DNSSEC records
- `DNAME` - Delegation name

Unknown record types are silently skipped.

## Name Normalization

Record names are normalized during parsing:

- `@` is preserved as-is (represents zone apex)
- Empty names are converted to `@`
- Trailing dots are removed from FQDNs
