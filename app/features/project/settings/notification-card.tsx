import { NotificationSettingsCard } from '@/components/notification-settings';
import type { NotificationPreference } from '@/components/notification-settings';
import { z } from 'zod';

const projectNotificationSchema = z.object({
  // Infrastructure & Runtime
  proxyHealth: z.boolean().default(true),
  dnsChanges: z.boolean().default(true),
  // Secrets & Security
  secretChanges: z.boolean().default(true),
  // Domain Management
  domainStatus: z.boolean().default(true),
  // Metrics & Monitoring
  quotaAlerts: z.boolean().default(true),
  exportFailures: z.boolean().default(false),
});

const PROJECT_NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  {
    name: 'proxyHealth',
    label: 'Proxy & Runtime Health',
    description: 'Get notified when HTTP proxy endpoints have health issues or status changes.',
  },
  {
    name: 'dnsChanges',
    label: 'DNS Zone Updates',
    description: 'Receive alerts when DNS zones or records are created, modified, or deleted.',
  },
  {
    name: 'secretChanges',
    label: 'Secret Modifications',
    description: 'Get notified when secrets are created, updated, or deleted in this project.',
  },
  {
    name: 'domainStatus',
    label: 'Domain Status',
    description:
      'Receive updates on domain verification, nameserver changes, and registration status.',
  },
  {
    name: 'quotaAlerts',
    label: 'Quota Threshold Alerts',
    description: 'Get warned when resource usage approaches or exceeds quota limits.',
  },
  {
    name: 'exportFailures',
    label: 'Export Policy Failures',
    description: 'Receive alerts when metrics export policies fail or have connectivity issues.',
  },
];

export const ProjectNotificationSettingsCard = () => {
  return (
    <NotificationSettingsCard
      title="System Notifications"
      schema={projectNotificationSchema}
      defaultValues={{
        proxyHealth: true,
        dnsChanges: true,
        secretChanges: true,
        domainStatus: true,
        quotaAlerts: true,
        exportFailures: false,
      }}
      preferences={PROJECT_NOTIFICATION_PREFERENCES}
      onSubmit={async (data: z.infer<typeof projectNotificationSchema>) => {
        // TODO: Update this to use actual project notification preferences API endpoint
        console.log('Project notification preferences:', data);
      }}
    />
  );
};
