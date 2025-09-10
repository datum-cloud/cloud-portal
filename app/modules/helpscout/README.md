# Help Scout Beacon Integration

This module provides a complete integration for Help Scout Beacon, allowing you to add customer support capabilities to your React application.

## Features

- 🚀 **Easy Integration**: Simple component-based integration following the same pattern as other modules
- 🔒 **Secure Mode Support**: Built-in support for Help Scout's secure mode with HMAC signature generation
- 🎨 **Customizable**: Full configuration support for colors, icons, and behavior
- 📱 **TypeScript Support**: Complete TypeScript definitions for all APIs and configurations
- 🔧 **Programmatic API**: Control Beacon programmatically with the included API wrapper
- 🌍 **Environment Aware**: Only loads in production by default, with override options

## Quick Start

### 1. Environment Variables

Add your Help Scout configuration to your environment variables:

```bash
# Required: Your Help Scout Beacon ID (8-character alphanumeric string)
HELPSCOUT_BEACON_ID=abcd1234

# Optional: Secret key for secure mode (server-side use only)
HELPSCOUT_SECRET_KEY=your_secret_key_here
```

### 2. Basic Integration

The module is already integrated into the application through `root.tsx`. The Beacon will automatically load when `HELPSCOUT_BEACON_ID` is provided.

```tsx
// This is already done in root.tsx
import { HelpScoutBeacon } from '@/modules/helpscout';

// Basic usage
<HelpScoutBeacon beaconId={sharedEnv.HELPSCOUT_BEACON_ID} onlyInProduction={true} />;
```

### 3. Advanced Configuration

```tsx
import { HelpScoutBeacon } from '@/modules/helpscout';

<HelpScoutBeacon
  beaconId="abcd1234"
  color="#007aff"
  icon="message"
  instructions="Need help? We're here for you!"
  showContactFields={true}
  showGetInTouch={true}
  showName={true}
  showSubject={true}
  poweredBy={false}
  attachment={true}
  labels={['feature-request', 'bug-report']}
  onlyInProduction={false}
/>;
```

## User Identification

To personalize the support experience, you can identify users:

```tsx
import { helpScoutAPI } from '@/modules/helpscout';

// Identify a user
helpScoutAPI.identify({
  name: 'John Doe',
  email: 'john@example.com',
  company: 'Acme Corp',
  jobTitle: 'Software Engineer',
});
```

## Secure Mode

For enhanced security, enable secure mode to prevent impersonation:

### Server-Side Signature Generation

```typescript
import { generateHelpScoutSignature } from '@/modules/helpscout';

// Generate signature on the server (never expose secret key to client)
const signature = generateHelpScoutSignature(user.email, process.env.HELPSCOUT_SECRET_KEY!);

// Pass signature to client
const userWithSignature = {
  ...user,
  signature,
};
```

### Client-Side Usage

```tsx
<HelpScoutBeacon
  beaconId="abcd1234"
  enableSecureMode={true}
  user={userWithSignature} // Include pre-generated signature
/>
```

## Programmatic API

The module provides a comprehensive API for programmatic control:

```typescript
import { helpScoutAPI } from '@/modules/helpscout';

// Open/close Beacon
helpScoutAPI.open();
helpScoutAPI.close();
helpScoutAPI.toggle();

// Search for articles
helpScoutAPI.search('how to reset password');

// Suggest articles
helpScoutAPI.suggest([{ id: '123', url: '/help/getting-started', title: 'Getting Started' }]);

// Prefill contact form
helpScoutAPI.prefill({
  subject: 'Bug Report',
  text: 'I found an issue with...',
});

// Event handling
helpScoutAPI.on('open', () => console.log('Beacon opened'));
helpScoutAPI.on('close', () => console.log('Beacon closed'));

// Check if ready
if (helpScoutAPI.isReady()) {
  helpScoutAPI.open();
}
```

## Configuration Options

| Option              | Type            | Default  | Description                         |
| ------------------- | --------------- | -------- | ----------------------------------- |
| `beaconId`          | `string`        | required | Your Help Scout Beacon ID           |
| `secretKey`         | `string`        | optional | Secret key for secure mode          |
| `user`              | `HelpScoutUser` | optional | User data for identification        |
| `enableSecureMode`  | `boolean`       | `false`  | Enable secure mode verification     |
| `color`             | `string`        | optional | Primary color for the Beacon        |
| `icon`              | `string`        | optional | Icon type (e.g., 'message', 'help') |
| `zIndex`            | `number`        | optional | CSS z-index for the Beacon          |
| `instructions`      | `string`        | optional | Custom instructions text            |
| `showContactFields` | `boolean`       | optional | Show contact form fields            |
| `showGetInTouch`    | `boolean`       | optional | Show "Get in Touch" option          |
| `showName`          | `boolean`       | optional | Show name field in contact form     |
| `showSubject`       | `boolean`       | optional | Show subject field in contact form  |
| `poweredBy`         | `boolean`       | optional | Show "Powered by Help Scout"        |
| `attachment`        | `boolean`       | optional | Allow file attachments              |
| `labels`            | `string[]`      | optional | Default labels for conversations    |
| `onlyInProduction`  | `boolean`       | `true`   | Only load in production environment |

## Events

Help Scout Beacon supports various events you can listen to:

- `open` - Beacon is opened
- `close` - Beacon is closed
- `email-sent` - Contact form submitted
- `article-viewed` - Help article viewed
- `search-performed` - Search executed

```typescript
helpScoutAPI.on('email-sent', (data) => {
  console.log('Support request sent:', data);
});
```

## Security Best Practices

1. **Never expose secret keys**: Keep your `HELPSCOUT_SECRET_KEY` server-side only
2. **Generate signatures server-side**: Always generate HMAC signatures on the server
3. **Validate user data**: Sanitize user data before passing to Help Scout
4. **Use environment variables**: Store configuration in environment variables
5. **Enable secure mode**: Use secure mode for authenticated users

## Troubleshooting

### Beacon Not Loading

1. Check your Beacon ID is correct (8-character alphanumeric)
2. Verify environment variables are set
3. Check browser console for errors
4. Ensure you're in production mode (or set `onlyInProduction={false}`)

### Secure Mode Issues

1. Verify secret key is correct
2. Ensure signature is generated server-side
3. Check that email matches between signature generation and identification

### TypeScript Errors

1. Ensure all required props are provided
2. Check user data matches `HelpScoutUser` interface
3. Verify Beacon ID format

## Integration with User Authentication

For applications with user authentication, you can integrate Help Scout identification:

```typescript
// In your authentication flow
import { helpScoutAPI } from '@/modules/helpscout';

export function identifyUserForSupport(user: User) {
  if (helpScoutAPI.isReady()) {
    helpScoutAPI.identify({
      name: user.name,
      email: user.email,
      company: user.organization?.name,
      // Add any custom fields you want to pass to Help Scout
    });
  }
}

// Call when user logs in
identifyUserForSupport(currentUser);

// Call when user logs out
helpScoutAPI.logout();
```

## References

- [Help Scout Beacon Documentation](https://docs.helpscout.com/article/1356-add-beacon-to-your-website-or-app)
- [Help Scout Secure Mode](https://developer.helpscout.com/beacon-2/web/secure-mode/)
- [Help Scout JavaScript API](https://developer.helpscout.com/beacon-2/web/javascript-api/)

## Support

For issues with this integration, check:

1. Help Scout status page
2. Browser developer console
3. Network requests in developer tools
4. This module's TypeScript definitions
