import { StatusBadge } from '@/components/status-badge/status-badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/modules/shadcn/ui/card';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';

export const statusBadgeDemoSections = [
  { id: 'status-badge-statuses', label: 'Status Badge Statuses' },
  { id: 'status-badge-labels', label: 'Custom Labels' },
  { id: 'status-badge-tooltips', label: 'With Tooltips' },
  { id: 'status-badge-icons', label: 'Icon Display' },
  { id: 'status-badge-control-plane', label: 'ControlPlaneStatus Format' },
  { id: 'status-badge-use-cases', label: 'Use Cases' },
];

export default function StatusBadgeDemo() {
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
            <StatusBadge status="active" />
            <StatusBadge status="pending" />
            <StatusBadge status="error" />
            <StatusBadge status="inactive" />
            <StatusBadge status="success" />
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
              <StatusBadge status="active" label="Active" />
              <StatusBadge status="active" label="Running" />
              <StatusBadge status="active" label="Online" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Success Status with Custom Labels</h4>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="success" label="Ready" />
              <StatusBadge status="success" label="Completed" />
              <StatusBadge status="success" label="Available" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Pending Status with Custom Labels</h4>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="pending" label="Setting up..." />
              <StatusBadge status="pending" label="Verifying..." />
              <StatusBadge status="pending" label="In Progress" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Error Status with Custom Labels</h4>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="error" label="Failed" />
              <StatusBadge status="error" label="Error" />
              <StatusBadge status="error" label="Unavailable" />
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
            <StatusBadge
              status="active"
              tooltipText="This resource is currently active and running"
            />
            <StatusBadge
              status="pending"
              tooltipText="This resource is being set up. Please wait..."
            />
            <StatusBadge
              status="error"
              tooltipText="An error occurred while processing this resource"
            />
            <StatusBadge status="success" tooltipText="Operation completed successfully" />
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
              <StatusBadge status="active" showIcon />
              <StatusBadge status="pending" showIcon />
              <StatusBadge status="error" showIcon />
              <StatusBadge status="success" showIcon />
            </div>
            <p className="text-muted-foreground text-xs">
              Note: Only pending status has an icon defined (spinning loader). Other statuses will
              show no icon even when showIcon is true.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Without Icons (Default)</h4>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="active" />
              <StatusBadge status="pending" />
              <StatusBadge status="error" />
              <StatusBadge status="success" />
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
            StatusBadge accepts legacy IControlPlaneStatus format for backward compatibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Success Status</h4>
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                status={{
                  status: ControlPlaneStatus.Success,
                  message: 'Resource is ready',
                }}
              />
              <StatusBadge
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
              <StatusBadge
                status={{
                  status: ControlPlaneStatus.Pending,
                  message: 'Setting up resource...',
                }}
              />
              <StatusBadge
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
              <StatusBadge
                status={{
                  status: ControlPlaneStatus.Error,
                  message: 'Failed to process resource',
                }}
              />
              <StatusBadge
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
          <CardDescription>Real-world examples of StatusBadge usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Project Status</h4>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="active" label="Active" />
              <StatusBadge status="pending" label="Setting up..." />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Workload Status</h4>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="active" label="Available" />
              <StatusBadge status="pending" />
              <StatusBadge status="error" label="Failed" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Export Policy Status</h4>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="success" label="Ready" />
              <StatusBadge status="pending" />
              <StatusBadge status="error" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Domain Verification</h4>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="success" label="Verified" />
              <StatusBadge status="pending" label="Verifying..." />
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
                      <StatusBadge status="active" label="Active" />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">Workload Beta</td>
                    <td className="p-2">
                      <StatusBadge status="pending" />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">Export Policy Gamma</td>
                    <td className="p-2">
                      <StatusBadge status="success" label="Ready" />
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
