import { Alert, AlertDescription, AlertTitle } from '@datum-ui/components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@datum-ui/components';
import {
  AlertCircle,
  CheckCircle,
  Info,
  TriangleAlert,
  XCircle,
  Bell,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';

export const alertDemoSections = [
  { id: 'alert-variants', label: 'Alert Variants' },
  { id: 'alert-with-icons', label: 'Alerts with Icons' },
  { id: 'alert-status', label: 'Status Alerts' },
  { id: 'alert-rich-content', label: 'Rich Content' },
  { id: 'alert-simple', label: 'Simple Alerts' },
  { id: 'alert-closable', label: 'Closable Alerts' },
  { id: 'alert-use-cases', label: 'Use Cases' },
];

export default function AlertDemo() {
  const [closableAlerts, setClosableAlerts] = useState([
    {
      id: 1,
      variant: 'info' as const,
      title: 'Information',
      message: 'This alert can be dismissed.',
    },
    {
      id: 2,
      variant: 'success' as const,
      title: 'Success',
      message: 'Operation completed successfully.',
    },
    {
      id: 3,
      variant: 'warning' as const,
      title: 'Warning',
      message: 'Please review your settings.',
    },
  ]);

  const removeClosableAlert = (id: number) => {
    setClosableAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  return (
    <div className="space-y-8 p-6">
      {/* Alert Variants */}
      <Card id="alert-variants">
        <CardHeader>
          <CardTitle>Alert Variants</CardTitle>
          <CardDescription>
            All available alert variants with their default styling and colors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Alert variant="default">
              <AlertTitle>Default Alert</AlertTitle>
              <AlertDescription>
                This is a default alert with neutral styling. Use for general information.
              </AlertDescription>
            </Alert>

            <Alert variant="secondary">
              <AlertTitle>Secondary Alert</AlertTitle>
              <AlertDescription>
                This is a secondary alert with muted styling. Use for less prominent messages.
              </AlertDescription>
            </Alert>

            <Alert variant="outline">
              <AlertTitle>Outline Alert</AlertTitle>
              <AlertDescription>
                This is an outline alert with a border and transparent background. Use for subtle
                notifications.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <AlertTitle>Destructive Alert</AlertTitle>
              <AlertDescription>
                This is a destructive alert for errors and critical issues. Use for error messages
                and warnings.
              </AlertDescription>
            </Alert>

            <Alert variant="success">
              <AlertTitle>Success Alert</AlertTitle>
              <AlertDescription>
                This is a success alert for positive feedback. Use when operations complete
                successfully.
              </AlertDescription>
            </Alert>

            <Alert variant="info">
              <AlertTitle>Info Alert</AlertTitle>
              <AlertDescription>
                This is an info alert for informational messages. Use to provide helpful context or
                guidance.
              </AlertDescription>
            </Alert>

            <Alert variant="warning">
              <AlertTitle>Warning Alert</AlertTitle>
              <AlertDescription>
                This is a warning alert for cautionary messages. Use when action is required or
                attention is needed.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Alerts with Icons */}
      <Card id="alert-with-icons">
        <CardHeader>
          <CardTitle>Alerts with Icons</CardTitle>
          <CardDescription>
            Icons are automatically positioned when placed as the first child of the Alert component
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Error Occurred</AlertTitle>
              <AlertDescription>
                An error occurred while processing your request. Please try again or contact
                support.
              </AlertDescription>
            </Alert>

            <Alert variant="success">
              <CheckCircle className="size-4" />
              <AlertTitle>Operation Successful</AlertTitle>
              <AlertDescription>
                Your changes have been saved successfully. All data has been updated.
              </AlertDescription>
            </Alert>

            <Alert variant="info">
              <Info className="size-4" />
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>
                Here&apos;s some helpful information that might be useful for you to know.
              </AlertDescription>
            </Alert>

            <Alert variant="warning">
              <TriangleAlert className="size-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Please review this information before proceeding. This action cannot be undone.
              </AlertDescription>
            </Alert>

            <Alert variant="secondary">
              <Bell className="size-4" />
              <AlertTitle>Notification</AlertTitle>
              <AlertDescription>
                You have a new notification. Check your inbox for more details.
              </AlertDescription>
            </Alert>

            <Alert variant="outline">
              <ShieldAlert className="size-4" />
              <AlertTitle>Security Notice</AlertTitle>
              <AlertDescription>
                Your account security settings have been updated. Review your security preferences.
              </AlertDescription>
            </Alert>
          </div>
          <div className="text-muted-foreground text-sm">
            <p>
              Icons are automatically positioned in the top-left corner and content is padded
              accordingly. Icon colors inherit from the alert variant.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Status Alerts */}
      <Card id="alert-status">
        <CardHeader>
          <CardTitle>Status Alerts</CardTitle>
          <CardDescription>Common status alert patterns for different scenarios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Alert variant="success">
              <CheckCircle className="size-4" />
              <AlertTitle>Connection Established</AlertTitle>
              <AlertDescription>
                Your connection has been established successfully. You can now proceed with your
                operations.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <XCircle className="size-4" />
              <AlertTitle>Connection Failed</AlertTitle>
              <AlertDescription>
                Unable to establish connection. Please check your network settings and try again.
              </AlertDescription>
            </Alert>

            <Alert variant="warning">
              <AlertCircle className="size-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                Your account requires verification. Please complete the verification process to
                continue.
              </AlertDescription>
            </Alert>

            <Alert variant="info">
              <Info className="size-4" />
              <AlertTitle>Processing</AlertTitle>
              <AlertDescription>
                Your request is being processed. This may take a few moments. Please wait.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Rich Content */}
      <Card id="alert-rich-content">
        <CardHeader>
          <CardTitle>Rich Content Alerts</CardTitle>
          <CardDescription>
            Alerts can contain rich content including lists, formatted text, and custom components
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Domain Validation Errors</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p>The following issues must be resolved before your domain can be verified:</p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>DNS records are not configured correctly</li>
                    <li>HTTP verification token is missing</li>
                    <li>Domain ownership could not be verified</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <Alert variant="warning">
              <TriangleAlert className="size-4" />
              <AlertTitle>Before You Continue</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p>Please review the following before proceeding:</p>
                  <ol className="list-decimal space-y-1 pl-5">
                    <li>Verify all required fields are completed</li>
                    <li>Check that your configuration is correct</li>
                    <li>Ensure you have the necessary permissions</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>

            <Alert variant="info">
              <Info className="size-4" />
              <AlertTitle>System Update</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p>
                    A new system update is available. The update includes the following
                    improvements:
                  </p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Enhanced security features</li>
                    <li>Performance optimizations</li>
                    <li>New user interface improvements</li>
                  </ul>
                  <p className="text-sm">
                    <strong>Note:</strong> The update will be applied automatically during the next
                    maintenance window.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Simple Alerts */}
      <Card id="alert-simple">
        <CardHeader>
          <CardTitle>Simple Alerts</CardTitle>
          <CardDescription>
            Alerts can be used without titles or with minimal content for simple notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Alert variant="info">
              <AlertDescription>This is a simple alert without a title.</AlertDescription>
            </Alert>

            <Alert variant="success">
              <AlertDescription>Operation completed successfully.</AlertDescription>
            </Alert>

            <Alert variant="warning">
              <AlertDescription>Please review your settings before continuing.</AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <AlertDescription>An error occurred. Please try again.</AlertDescription>
            </Alert>

            <Alert variant="success">
              <CheckCircle className="size-4" />
              <AlertDescription>Your changes have been saved.</AlertDescription>
            </Alert>

            <Alert variant="info">
              <Info className="size-4" />
              <AlertDescription>
                New features are available. Check the documentation for more information.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Closable Alerts */}
      <Card id="alert-closable">
        <CardHeader>
          <CardTitle>Closable Alerts</CardTitle>
          <CardDescription>
            Alerts can be made dismissible by setting the closable prop. Click the X button to close
            them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Alert variant="info" closable onClose={() => alert('Close button clicked!')}>
              <Info className="size-4" />
              <AlertTitle>Dismissible Info Alert</AlertTitle>
              <AlertDescription>
                This alert has a close button. Click the X in the top-right corner to dismiss it. In
                a real application, you would handle the onClose callback to remove the alert from
                state.
              </AlertDescription>
            </Alert>

            <Alert variant="success" closable onClose={() => alert('Close button clicked!')}>
              <CheckCircle className="size-4" />
              <AlertTitle>Dismissible Success Alert</AlertTitle>
              <AlertDescription>
                Success alerts can also be closable. The close button inherits the alert&apos;s
                color scheme.
              </AlertDescription>
            </Alert>

            <Alert variant="warning" closable onClose={() => alert('Close button clicked!')}>
              <TriangleAlert className="size-4" />
              <AlertTitle>Dismissible Warning Alert</AlertTitle>
              <AlertDescription>
                Warning alerts with close buttons are useful for temporary notifications that users
                can dismiss.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive" closable onClose={() => alert('Close button clicked!')}>
              <AlertCircle className="size-4" />
              <AlertTitle>Dismissible Error Alert</AlertTitle>
              <AlertDescription>
                Even error alerts can be dismissible, allowing users to acknowledge and dismiss
                error messages.
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Multiple Closable Alerts (Interactive)</h4>
            <p className="text-muted-foreground text-sm">
              Click the X button on any alert below to remove it from the list:
            </p>
            <div className="space-y-4">
              {closableAlerts.length > 0 ? (
                closableAlerts.map((alert) => (
                  <Alert
                    key={alert.id}
                    variant={alert.variant}
                    closable
                    onClose={() => removeClosableAlert(alert.id)}>
                    {alert.variant === 'success' ? (
                      <CheckCircle className="size-4" />
                    ) : alert.variant === 'warning' ? (
                      <TriangleAlert className="size-4" />
                    ) : (
                      <Info className="size-4" />
                    )}
                    <AlertTitle>{alert.title}</AlertTitle>
                    <AlertDescription>{alert.message}</AlertDescription>
                  </Alert>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  All alerts have been dismissed. Refresh the page to see them again.
                </p>
              )}
            </div>
          </div>

          <div className="text-muted-foreground text-sm">
            <p>
              <strong>Note:</strong> By default, alerts are not closable. Set the{' '}
              <code>closable</code> prop to <code>true</code> and provide an <code>onClose</code>{' '}
              callback to enable the close button.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Use Cases */}
      <Card id="alert-use-cases">
        <CardHeader>
          <CardTitle>Common Use Cases</CardTitle>
          <CardDescription>Real-world examples of Alert component usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Form Validation Errors</h4>
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Validation Failed</AlertTitle>
              <AlertDescription>
                Please correct the following errors before submitting:
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Email address is required</li>
                  <li>Password must be at least 8 characters</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Success Messages</h4>
            <Alert variant="success">
              <CheckCircle className="size-4" />
              <AlertTitle>Profile Updated</AlertTitle>
              <AlertDescription>
                Your profile information has been successfully updated and saved.
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">System Notifications</h4>
            <Alert variant="info">
              <Info className="size-4" />
              <AlertTitle>Maintenance Scheduled</AlertTitle>
              <AlertDescription>
                System maintenance is scheduled for tonight at 2:00 AM. Some services may be
                temporarily unavailable.
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Warning Messages</h4>
            <Alert variant="warning">
              <TriangleAlert className="size-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                Your subscription will expire in 7 days. Please renew to continue using all
                features.
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Error Recovery</h4>
            <Alert variant="destructive">
              <XCircle className="size-4" />
              <AlertTitle>Connection Lost</AlertTitle>
              <AlertDescription>
                Your connection was interrupted. Attempting to reconnect automatically. If this
                problem persists, please refresh the page.
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">In Dialog/Modal</h4>
            <div className="border-input rounded-md border p-4">
              <Alert variant="warning" className="mb-4">
                <TriangleAlert className="size-4" />
                <AlertTitle>Confirm Action</AlertTitle>
                <AlertDescription>
                  This action cannot be undone. Are you sure you want to proceed?
                </AlertDescription>
              </Alert>
              <p className="text-muted-foreground text-sm">
                Alerts work well in dialogs and modals to provide context for user actions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
