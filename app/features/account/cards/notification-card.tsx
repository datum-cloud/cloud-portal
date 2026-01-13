import { NotificationSettingsCard } from '@/components/notification-settings';
import type { NotificationPreference } from '@/components/notification-settings';
import { z } from 'zod';

const accountNotificationSchema = z.object({
  blog: z.boolean().default(false),
  education: z.boolean().default(false),
  events: z.boolean().default(false),
  promotions: z.boolean().default(false),
});

const ACCOUNT_NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  {
    name: 'blog',
    label: 'Blog',
    description:
      'Stay up to date on the trends from the technical visionaries building our next generation network.',
  },
  {
    name: 'education',
    label: 'Education and Resources',
    description: 'Get the most from your Datum subscription with helpful content and resources.',
  },
  {
    name: 'events',
    label: 'Events',
    description:
      'Get updates on upcoming in-person and online events, conferences, and webinars from Datum.',
  },
  {
    name: 'promotions',
    label: 'Product News and Promotions',
    description: 'Learn about the latest Datum products, features, and promotions.',
  },
];

export const AccountNotificationSettingsCard = () => {
  return (
    <NotificationSettingsCard
      title="Marketing & Events"
      schema={accountNotificationSchema}
      defaultValues={{
        blog: true,
        education: false,
        events: false,
        promotions: false,
      }}
      preferences={ACCOUNT_NOTIFICATION_PREFERENCES}
      onSubmit={async (data: z.infer<typeof accountNotificationSchema>) => {
        // TODO: Update this to use actual notification preferences API endpoint
        console.log('Notification preferences:', data);
      }}
    />
  );
};
