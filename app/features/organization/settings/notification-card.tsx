import { NotificationSettingsCard } from '@/components/notification-settings';
import type { NotificationPreference } from '@/components/notification-settings';
import { z } from 'zod';

const organizationNotificationSchema = z.object({
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

const ORGANIZATION_NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  {
    name: 'membershipChanges',
    label: 'Membership Changes',
    description:
      'Get notified when members join, leave, or have their roles changed in the organization.',
  },
  {
    name: 'projectActivity',
    label: 'Project Activity',
    description:
      'Receive alerts when projects are created, deleted, or have significant configuration changes.',
  },
  {
    name: 'invitationActivity',
    label: 'Invitation Activity',
    description: 'Get notified when organization invitations are sent, accepted, or declined.',
  },
  {
    name: 'roleChanges',
    label: 'Role & Permission Changes',
    description:
      'Receive updates when roles are created, modified, or when permissions are updated.',
  },
  {
    name: 'quotaAlerts',
    label: 'Organization Quota Alerts',
    description:
      'Get warned when organization-wide resource usage approaches or exceeds quota limits.',
  },
  {
    name: 'securityAlerts',
    label: 'Security & Access Alerts',
    description:
      'Receive alerts about suspicious activity, failed login attempts, or policy violations.',
  },
];

export const ProjectNotificationSettingsCard = () => {
  return (
    <NotificationSettingsCard
      title="System Notifications"
      schema={organizationNotificationSchema}
      defaultValues={{
        proxyHealth: true,
        dnsChanges: true,
        secretChanges: true,
        domainStatus: true,
        quotaAlerts: true,
        exportFailures: false,
      }}
      preferences={ORGANIZATION_NOTIFICATION_PREFERENCES}
      onSubmit={async (data: z.infer<typeof organizationNotificationSchema>) => {
        // TODO: Update this to use actual project notification preferences API endpoint
        console.log('Organization notification preferences:', data);
      }}
    />
  );
};
