import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { z } from 'zod';

// Notification preferences schema
const notificationSchema = z.object({
  blog: z.boolean().default(false),
  education: z.boolean().default(false),
  events: z.boolean().default(false),
  promotions: z.boolean().default(false),
});

const NOTIFICATION_PREFERENCES = [
  {
    name: 'blog' as const,
    label: 'Blog',
    sublabel:
      'Stay up to date on the trends from the technical visionaries building our next generation network.',
  },
  {
    name: 'education' as const,
    label: 'Education and Resources',
    sublabel: 'Get the most from your Datum subscription with helpful content and resources.',
  },
  {
    name: 'events' as const,
    label: 'Events',
    sublabel:
      'Get updates on upcoming in-person and online events, conferences, and webinars from Datum.',
  },
  {
    name: 'promotions' as const,
    label: 'Product News and Promotions',
    sublabel: 'Learn about the latest Datum products, features, and promotions.',
  },
];

// Local component for checkbox with identity item styling
const NotificationCheckboxItem = ({ label, sublabel }: { label: string; sublabel: string }) => {
  return (
    <div className="flex items-center justify-between gap-6">
      {/* Left Section - Checkbox + Label */}
      <div className="flex items-center space-x-3.5">
        {/* Checkbox in icon area */}
        <div className="bg-badge-muted dark:bg-background flex size-[34px] items-center justify-center rounded-xl">
          <Form.Checkbox className="data-[state=checked]:bg-primary space-x-0 bg-white" />
        </div>

        {/* Label area - manually rendered to match identity item style */}
        <div className="text-1xs flex flex-col space-y-0.5 text-left">
          <span className="font-medium">{label}</span>
          <span className="text-foreground/80">{sublabel}</span>
        </div>
      </div>
    </div>
  );
};

export const AccountNotificationSettingsCard = () => {
  return (
    <Card className="gap-0 rounded-xl py-0 shadow-none">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">Marketing & Events</CardTitle>
      </CardHeader>

      <Form.Root
        schema={notificationSchema}
        defaultValues={{
          blog: true,
          education: false,
          events: false,
          promotions: false,
        }}
        onSubmit={async (data) => {
          // TODO: Update this to use actual notification preferences API endpoint
          console.log('Notification preferences:', data);
        }}
        className="flex flex-col space-y-0">
        {({ form }) => (
          <>
            <CardContent className="space-y-4 px-5 py-4">
              {NOTIFICATION_PREFERENCES.map((pref) => (
                <Form.Field key={pref.name} name={pref.name}>
                  <NotificationCheckboxItem label={pref.label} sublabel={pref.sublabel} />
                </Form.Field>
              ))}
            </CardContent>

            <CardFooter className="flex justify-end gap-2 border-t px-5 py-4">
              <Form.Button
                onClick={() => {
                  form.reset();
                }}
                type="quaternary"
                theme="outline"
                size="xs">
                Cancel
              </Form.Button>
              <Form.Submit size="xs" loadingText="Saving...">
                Save
              </Form.Submit>
            </CardFooter>
          </>
        )}
      </Form.Root>
    </Card>
  );
};
