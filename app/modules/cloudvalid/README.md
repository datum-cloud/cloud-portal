# CloudValid Module

Simple TypeScript module for CloudValid API integration to handle DNS setup operations.

## Installation

The module is already included in the project. Just import and use it.

## Usage

### Basic Setup

```typescript
import { CloudValidService } from '@/modules/cloudvalid';

// Initialize with your API key
const cloudValid = new CloudValidService('your-api-key-here');

// Or with custom API URL
const cloudValid = new CloudValidService('your-api-key-here', 'https://api.cloudvalid.com/api/v2');
```

### Create DNS Setup

```typescript
// Using a template
const setup = await cloudValid.createDNSSetup({
  domain: 'example.com',
  template_id: 'your-template-uuid',
  variables: {
    app_url: 'https://myapp.com'
  },
  redirect_url: 'https://myapp.com/dns-complete'
});

// Using raw DNS records
const setup = await cloudValid.createDNSSetup({
  domain: 'example.com',
  raw_dns_records: [
    {
      type: 'CNAME',
      host: 'app',
      content: 'myapp.herokuapp.com',
      create_service_record: true
    },
    {
      type: 'TXT',
      host: '_verification',
      content: 'verification-token-123'
    }
  ],
  redirect_url: 'https://myapp.com/dns-complete'
});

console.log(setup.public_url); // URL for customer to complete DNS setup
```

### Monitor DNS Setup

```typescript
// Get setup details
const details = await cloudValid.getDNSSetup(setup.id);
console.log(details.status); // 'pending', 'active', 'cancelled', etc.

// Get propagation status
const status = await cloudValid.getDNSSetupStatus(setup.id);
console.log(status); // Real-time DNS propagation info
```

### Cancel DNS Setup

```typescript
const result = await cloudValid.cancelDNSSetup(setup.id);
console.log(result.message); // Confirmation message
```

### Manage Service Records

```typescript
// List all service records
const records = await cloudValid.listServiceRecords();

// List with filters
const records = await cloudValid.listServiceRecords({
  domain: 'example.com',
  page: 1,
  per_page: 20
});

// Update service records
await cloudValid.updateServiceRecords({
  domain_filter: 'example.com',
  type_filter: 'TXT',
  host_filter: '_verification',
  new_content: 'new-verification-token-456'
});
```

## API Methods

| Method                          | Description                |
| ------------------------------- | -------------------------- |
| `createDNSSetup(request)`       | Create a new DNS setup     |
| `getDNSSetup(id)`               | Get DNS setup details      |
| `getDNSSetupStatus(id)`         | Get DNS propagation status |
| `cancelDNSSetup(id)`            | Cancel DNS setup           |
| `listServiceRecords(params?)`   | List service records       |
| `updateServiceRecords(request)` | Update service records     |

## Types

### DNS Record Types

- `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `SRV`, `NS`, `PTR`

### Main Interfaces

- `CreateDNSSetupRequest` - DNS setup creation parameters
- `CreateDNSSetupResponse` - DNS setup creation result
- `DNSSetupDetails` - Complete DNS setup information
- `ServiceRecord` - Service record information
- `UpdateServiceRecordsRequest` - Service record update parameters

## Error Handling

```typescript
try {
  const setup = await cloudValid.createDNSSetup(request);
} catch (error) {
  console.error('DNS setup failed:', error.message);
}
```

## Environment Variables (Optional)

You can set these environment variables if you want to use them in your application:

```bash
CLOUDVALID_API_KEY=your-api-key-here
CLOUDVALID_API_URL=https://api.cloudvalid.com/api/v2
```

Then access them in your code:

```typescript
const apiKey = process.env.CLOUDVALID_API_KEY!;
const cloudValid = new CloudValidService(apiKey);
```
