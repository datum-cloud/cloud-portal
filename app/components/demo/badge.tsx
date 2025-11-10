import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/modules/shadcn/ui/card';
import { Badge } from '@datum-ui/components';
import { AlertCircle, CheckCircle, XCircle, Star, Info } from 'lucide-react';

export const badgeDemoSections = [
  { id: 'badge-types', label: 'Badge Types' },
  { id: 'badge-themes', label: 'Badge Themes' },
  { id: 'badges-with-icons', label: 'Badges with Icons' },
  { id: 'status-indicators', label: 'Status Indicators' },
  { id: 'custom-styling', label: 'Custom Styling' },
  { id: 'interactive-badges', label: 'Interactive Badges' },
  { id: 'use-cases', label: 'Common Use Cases' },
];

export default function BadgeDemo() {
  return (
    <div className="space-y-8 p-6">
      {/* Badge Types */}
      <Card id="badge-types">
        <CardHeader>
          <CardTitle>Badge Types</CardTitle>
          <CardDescription>Different badge types for various use cases</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge type="primary">Primary</Badge>
            <Badge type="secondary">Secondary</Badge>
            <Badge type="tertiary">Tertiary</Badge>
            <Badge type="quaternary">Quaternary</Badge>
            <Badge type="info">Info</Badge>
            <Badge type="warning">Warning</Badge>
            <Badge type="danger">Danger</Badge>
            <Badge type="success">Success</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Badge Themes */}
      <Card id="badge-themes">
        <CardHeader>
          <CardTitle>Badge Themes</CardTitle>
          <CardDescription>Different visual themes for each badge type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            'primary',
            'secondary',
            'tertiary',
            'quaternary',
            'info',
            'warning',
            'danger',
            'success',
          ].map((type) => (
            <div key={type} className="space-y-2">
              <h4 className="text-sm font-medium capitalize">{type}</h4>
              <div className="flex flex-wrap gap-2">
                <Badge type={type as any} theme="solid">
                  Solid
                </Badge>
                <Badge type={type as any} theme="outline">
                  Outline
                </Badge>
                <Badge type={type as any} theme="light">
                  Light
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Status Indicators */}
      <Card id="status-indicators">
        <CardHeader>
          <CardTitle>Status Indicators</CardTitle>
          <CardDescription>Using badges to show different statuses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge type="primary">Active</Badge>
            <Badge type="secondary">Pending</Badge>
            <Badge type="danger">Failed</Badge>
            <Badge type="success">Completed</Badge>
            <Badge type="info">Info</Badge>
            <Badge type="warning">Warning</Badge>
            <Badge type="tertiary">Inactive</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Badges with Icons */}
      <Card id="badges-with-icons">
        <CardHeader>
          <CardTitle>Badges with Icons</CardTitle>
          <CardDescription>
            Badges can include icons for better visual communication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge type="success" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Success
            </Badge>
            <Badge type="danger" className="gap-1">
              <XCircle className="h-3 w-3" />
              Error
            </Badge>
            <Badge type="warning" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Warning
            </Badge>
            <Badge type="primary" theme="outline" className="gap-1">
              <Info className="h-3 w-3" />
              Info
            </Badge>
            <Badge type="secondary" theme="outline" className="gap-1">
              <Star className="h-3 w-3" />
              Featured
            </Badge>
            <Badge type="tertiary" className="gap-1">
              <Info className="h-3 w-3" />
              Note
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Custom Styling */}
      <Card id="custom-styling">
        <CardHeader>
          <CardTitle>Custom Styling</CardTitle>
          <CardDescription>Badges with custom padding and styling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge type="primary" className="px-4 py-1">
              Custom Padding
            </Badge>
            <Badge type="secondary" theme="outline" className="border-2">
              Custom Border
            </Badge>
            <Badge type="primary" className="shadow-md">
              With Shadow
            </Badge>
            <Badge type="secondary" className="px-3 py-1.5 text-sm">
              Larger Text
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Badges */}
      <Card id="interactive-badges">
        <CardHeader>
          <CardTitle>Interactive Badges</CardTitle>
          <CardDescription>Badges that can be clicked or removed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge
              type="secondary"
              className="cursor-pointer gap-1 transition-opacity hover:opacity-80">
              Clickable Badge
            </Badge>
            <Badge
              type="primary"
              className="cursor-pointer gap-1 transition-opacity hover:opacity-80">
              <XCircle className="h-3 w-3" />
              Removable
            </Badge>
            <Badge
              type="tertiary"
              theme="outline"
              className="hover:bg-muted cursor-pointer gap-1 transition-colors">
              Hover Effect
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Use Cases */}
      <Card id="use-cases">
        <CardHeader>
          <CardTitle>Common Use Cases</CardTitle>
          <CardDescription>Real-world examples of badge usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Tags</h4>
            <div className="flex flex-wrap gap-2">
              <Badge type="primary" theme="outline">
                React
              </Badge>
              <Badge type="secondary" theme="outline">
                TypeScript
              </Badge>
              <Badge type="tertiary" theme="outline">
                Tailwind
              </Badge>
              <Badge type="quaternary" theme="outline">
                Next.js
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Notifications</h4>
            <div className="flex flex-wrap gap-2">
              <Badge type="danger">3</Badge>
              <Badge type="primary">12</Badge>
              <Badge type="warning">New</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">User Roles</h4>
            <div className="flex flex-wrap gap-2">
              <Badge type="primary">Admin</Badge>
              <Badge type="secondary">Member</Badge>
              <Badge type="tertiary" theme="outline">
                Guest
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Content Status</h4>
            <div className="flex flex-wrap gap-2">
              <Badge type="success" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Published
              </Badge>
              <Badge type="warning">Draft</Badge>
              <Badge type="danger">Archived</Badge>
              <Badge type="primary" theme="outline">
                Featured
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
