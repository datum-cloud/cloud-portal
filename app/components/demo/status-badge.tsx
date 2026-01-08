import { BadgeStatus } from '@/components/badge/badge-status';
import { ControlPlaneStatus } from '@/resources/base';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@datum-ui/components';

export const statusBadgeDemoSections = [
  { id: 'status-badge-statuses', label: 'Status Badge Statuses' },
  { id: 'status-badge-labels', label: 'Custom Labels' },
  { id: 'status-badge-tooltips', label: 'With Tooltips' },
  { id: 'status-badge-icons', label: 'Icon Display' },
  { id: 'status-badge-control-plane', label: 'ControlPlaneStatus Format' },
  { id: 'status-badge-use-cases', label: 'Use Cases' },
];

export default function BadgeStatusDemo() {
  return (
    <div className="space-y-8 p-6">
      {/* Status Badge Statuses */}
      <Card id="status-badge-statuses">
        <CardHeader>
          <CardTitle>Status Badge Statuses</CardTitle>
          <CardDescription>
            All available status types with their default labels and colors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <BadgeStatus status="active" />
            <BadgeStatus status="pending" />
            <BadgeStatus status="error" />
            <BadgeStatus status="inactive" />
            <BadgeStatus status="success" />
          </div>
          <div className="text-muted-foreground text-sm">
            <p>Each status has centralized color configuration in STATUS_CONFIG:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>
                <strong>active</strong> - Green (success theme, light)
              </li>
              <li>
                <strong>pending</strong> - Blue (custom color)
              </li>
              <li>
                <strong>error</strong> - Red (danger theme, light)
              </li>
              <li>
                <strong>inactive</strong> - Gray (secondary theme, light)
              </li>
              <li>
                <strong>success</strong> - Green (success theme, light)
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Custom Labels */}
      <Card id="status-badge-labels">
        <CardHeader>
          <CardTitle>Custom Labels</CardTitle>
          <CardDescription>Override default labels with custom text</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Active Status with Custom Labels</h4>
            <div className="flex flex-wrap gap-2">
              <BadgeStatus status="active" label="Active" />
              <BadgeStatus status="active" label="Running" />
              <BadgeStatus status="active" label="Online" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Success Status with Custom Labels</h4>
            <div className="flex flex-wrap gap-2">
              <BadgeStatus status="success" label="Ready" />
              <BadgeStatus status="success" label="Completed" />
              <BadgeStatus status="success" label="Available" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Pending Status with Custom Labels</h4>
            <div className="flex flex-wrap gap-2">
              <BadgeStatus status="pending" label="Setting up..." />
              <BadgeStatus status="pending" label="Verifying..." />
              <BadgeStatus status="pending" label="In Progress" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Error Status with Custom Labels</h4>
            <div className="flex flex-wrap gap-2">
              <BadgeStatus status="error" label="Failed" />
              <BadgeStatus status="error" label="Error" />
              <BadgeStatus status="error" label="Unavailable" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* With Tooltips */}
      <Card id="status-badge-tooltips">
        <CardHeader>
          <CardTitle>With Tooltips</CardTitle>
          <CardDescription>
            Status badges can display tooltips with additional information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <BadgeStatus
              status="active"
              tooltipText="This resource is currently active and running"
            />
            <BadgeStatus
              status="pending"
              tooltipText="This resource is being set up. Please wait..."
            />
            <BadgeStatus
              status="error"
              tooltipText="An error occurred while processing this resource"
            />
            <BadgeStatus status="success" tooltipText="Operation completed successfully" />
          </div>
          <div className="text-muted-foreground text-sm">
            <p>Tooltips are automatically disabled for active status by default.</p>
          </div>
        </CardContent>
      </Card>

      {/* Icon Display */}
      <Card id="status-badge-icons">
        <CardHeader>
          <CardTitle>Icon Display</CardTitle>
          <CardDescription>Control icon visibility in status badges</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">With Icons</h4>
            <div className="flex flex-wrap gap-2">
              <BadgeStatus status="active" showIcon />
              <BadgeStatus status="pending" showIcon />
              <BadgeStatus status="error" showIcon />
              <BadgeStatus status="success" showIcon />
            </div>
            <p className="text-muted-foreground text-xs">
              Note: Only pending status has an icon defined (spinning loader). Other statuses will
              show no icon even when showIcon is true.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Without Icons (Default)</h4>
            <div className="flex flex-wrap gap-2">
              <BadgeStatus status="active" />
              <BadgeStatus status="pending" />
              <BadgeStatus status="error" />
              <BadgeStatus status="success" />
            </div>
            <p className="text-muted-foreground text-xs">
              By default, showIcon is false. Icons are only shown when explicitly enabled and
              defined in STATUS_CONFIG.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ControlPlaneStatus Format */}
      <Card id="status-badge-control-plane">
        <CardHeader>
          <CardTitle>ControlPlaneStatus Format</CardTitle>
          <CardDescription>
            BadgeStatus accepts legacy IControlPlaneStatus format for backward compatibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Success Status</h4>
            <div className="flex flex-wrap gap-2">
              <BadgeStatus
                status={{
                  status: ControlPlaneStatus.Success,
                  message: 'Resource is ready',
                }}
              />
              <BadgeStatus
                status={{
                  status: ControlPlaneStatus.Success,
                  message: 'Resource is ready',
                }}
                label="Ready"
              />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Pending Status</h4>
            <div className="flex flex-wrap gap-2">
              <BadgeStatus
                status={{
                  status: ControlPlaneStatus.Pending,
                  message: 'Setting up resource...',
                }}
              />
              <BadgeStatus
                status={{
                  status: ControlPlaneStatus.Pending,
                  message: 'Setting up resource...',
                }}
                label="Verifying..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Error Status</h4>
            <div className="flex flex-wrap gap-2">
              <BadgeStatus
                status={{
                  status: ControlPlaneStatus.Error,
                  message: 'Failed to process resource',
                }}
              />
              <BadgeStatus
                status={{
                  status: ControlPlaneStatus.Error,
                  message: 'Failed to process resource',
                }}
                label="Unavailable"
              />
            </div>
          </div>
          <div className="text-muted-foreground text-sm">
            <p>
              The status message from IControlPlaneStatus is automatically used as tooltip text when
              no custom tooltipText is provided.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Use Cases */}
      <Card id="status-badge-use-cases">
        <CardHeader>
          <CardTitle>Common Use Cases</CardTitle>
          <CardDescription>Real-world examples of BadgeStatus usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Project Status</h4>
            <div className="flex flex-wrap gap-2">
              <BadgeStatus status="active" label="Active" />
              <BadgeStatus status="pending" label="Setting up..." />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Workload Status</h4>
            <div className="flex flex-wrap gap-2">
              <BadgeStatus status="active" label="Available" />
              <BadgeStatus status="pending" />
              <BadgeStatus status="error" label="Failed" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Export Policy Status</h4>
            <div className="flex flex-wrap gap-2">
              <BadgeStatus status="success" label="Ready" />
              <BadgeStatus status="pending" />
              <BadgeStatus status="error" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Domain Verification</h4>
            <div className="flex flex-wrap gap-2">
              <BadgeStatus status="success" label="Verified" />
              <BadgeStatus status="pending" label="Verifying..." />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">In Table Cells</h4>
            <div className="border-input rounded-md border p-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Resource</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2">Project Alpha</td>
                    <td className="p-2">
                      <BadgeStatus status="active" label="Active" />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">Workload Beta</td>
                    <td className="p-2">
                      <BadgeStatus status="pending" />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">Export Policy Gamma</td>
                    <td className="p-2">
                      <BadgeStatus status="success" label="Ready" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
