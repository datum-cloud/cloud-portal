import { Tooltip } from '@datum-ui/components';
import { Button } from '@datum-ui/components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@datum-ui/components';
import { Input } from '@shadcn/ui/input';
import { Info, Settings, Trash2, Download, HelpCircle, AlertCircle } from 'lucide-react';

export const tooltipDemoSections = [
  { id: 'basic-tooltips', label: 'Basic Tooltips' },
  { id: 'tooltip-delays', label: 'Tooltip Delays' },
  { id: 'tooltips-with-buttons', label: 'Tooltips with Buttons' },
  { id: 'tooltips-with-icons', label: 'Tooltips with Icons' },
  { id: 'rich-content', label: 'Rich Content' },
  { id: 'form-tooltips', label: 'Form Tooltips' },
  { id: 'disabled-elements', label: 'Disabled Elements' },
  { id: 'text-tooltips', label: 'Text Tooltips' },
];

export default function TooltipDemo() {
  return (
    <div className="space-y-8 p-6">
      {/* Basic Tooltips */}
      <Card id="basic-tooltips">
        <CardHeader>
          <CardTitle>Basic Tooltips</CardTitle>
          <CardDescription>Simple tooltips with string messages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Tooltip message="This is a helpful tooltip">
              <Button>Hover me</Button>
            </Tooltip>
            <Tooltip message="Click to save your changes">
              <Button type="success">Save</Button>
            </Tooltip>
            <Tooltip message="This action cannot be undone">
              <Button type="danger">Delete</Button>
            </Tooltip>
            <Tooltip message="View settings and preferences">
              <Button type="secondary">Settings</Button>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      {/* Tooltip Delays */}
      <Card id="tooltip-delays">
        <CardHeader>
          <CardTitle>Tooltip Delays</CardTitle>
          <CardDescription>Different delay durations before showing tooltips</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Tooltip message="Instant tooltip (0ms delay)" delayDuration={0}>
              <Button>No Delay</Button>
            </Tooltip>
            <Tooltip message="Default delay (200ms)" delayDuration={200}>
              <Button type="secondary">Default</Button>
            </Tooltip>
            <Tooltip message="Slow tooltip (500ms delay)" delayDuration={500}>
              <Button type="tertiary">Slow</Button>
            </Tooltip>
            <Tooltip message="Very slow tooltip (1000ms delay)" delayDuration={1000}>
              <Button type="quaternary">Very Slow</Button>
            </Tooltip>
          </div>
          <p className="text-muted-foreground text-xs">
            Hover over each button to experience different delay timings
          </p>
        </CardContent>
      </Card>

      {/* Tooltips with Buttons */}
      <Card id="tooltips-with-buttons">
        <CardHeader>
          <CardTitle>Tooltips with Buttons</CardTitle>
          <CardDescription>Tooltips on various button types and sizes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Button Sizes</h4>
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip message="Small button tooltip">
                <Button size="small">Small</Button>
              </Tooltip>
              <Tooltip message="Default button tooltip">
                <Button size="default">Default</Button>
              </Tooltip>
              <Tooltip message="Large button tooltip">
                <Button size="large">Large</Button>
              </Tooltip>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Button Types</h4>
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip message="Primary action">
                <Button type="primary">Primary</Button>
              </Tooltip>
              <Tooltip message="Secondary action">
                <Button type="secondary">Secondary</Button>
              </Tooltip>
              <Tooltip message="Warning action">
                <Button type="warning">Warning</Button>
              </Tooltip>
              <Tooltip message="Danger action">
                <Button type="danger">Danger</Button>
              </Tooltip>
              <Tooltip message="Success action">
                <Button type="success">Success</Button>
              </Tooltip>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Button Themes</h4>
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip message="Solid theme">
                <Button theme="solid">Solid</Button>
              </Tooltip>
              <Tooltip message="Outline theme">
                <Button theme="outline" type="secondary">
                  Outline
                </Button>
              </Tooltip>
              <Tooltip message="Light theme">
                <Button theme="light" type="primary">
                  Light
                </Button>
              </Tooltip>
              <Tooltip message="Borderless theme">
                <Button theme="borderless" type="tertiary">
                  Borderless
                </Button>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tooltips with Icons */}
      <Card id="tooltips-with-icons">
        <CardHeader>
          <CardTitle>Tooltips with Icons</CardTitle>
          <CardDescription>Tooltips on icon buttons and icon elements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Icon Buttons</h4>
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip message="Settings">
                <Button size="icon" icon={<Settings className="h-4 w-4" />} />
              </Tooltip>
              <Tooltip message="Delete item">
                <Button size="icon" icon={<Trash2 className="h-4 w-4" />} type="danger" />
              </Tooltip>
              <Tooltip message="Download file">
                <Button size="icon" icon={<Download className="h-4 w-4" />} type="secondary" />
              </Tooltip>
              <Tooltip message="Help and information">
                <Button size="icon" icon={<HelpCircle className="h-4 w-4" />} type="tertiary" />
              </Tooltip>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Icon Elements</h4>
            <div className="flex flex-wrap items-center gap-4">
              <Tooltip message="Click for more information">
                <Info className="text-muted-foreground h-5 w-5 cursor-help" />
              </Tooltip>
              <Tooltip message="This requires your attention">
                <AlertCircle className="text-warning h-5 w-5 cursor-help" />
              </Tooltip>
              <Tooltip message="Settings configuration">
                <Settings className="text-muted-foreground h-5 w-5 cursor-help" />
              </Tooltip>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Buttons with Icons</h4>
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip message="Add a new item">
                <Button icon={<Download className="h-4 w-4" />}>Download</Button>
              </Tooltip>
              <Tooltip message="Open settings panel">
                <Button icon={<Settings className="h-4 w-4" />} iconPosition="right">
                  Settings
                </Button>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rich Content */}
      <Card id="rich-content">
        <CardHeader>
          <CardTitle>Rich Content</CardTitle>
          <CardDescription>Tooltips with formatted ReactNode content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Tooltip
              message={
                <div className="space-y-1">
                  <p className="font-semibold">Additional Information</p>
                  <p className="text-xs">
                    This tooltip contains formatted content with multiple lines
                  </p>
                </div>
              }>
              <Button>Rich Content</Button>
            </Tooltip>
            <Tooltip
              message={
                <div className="space-y-1">
                  <p className="font-semibold">Feature Details</p>
                  <ul className="list-inside list-disc space-y-0.5 text-xs">
                    <li>Feature 1</li>
                    <li>Feature 2</li>
                    <li>Feature 3</li>
                  </ul>
                </div>
              }>
              <Button type="secondary">With List</Button>
            </Tooltip>
            <Tooltip
              message={
                <div className="space-y-1">
                  <p className="font-semibold">Status: Active</p>
                  <p className="text-success text-xs">All systems operational</p>
                </div>
              }>
              <Info className="text-primary h-5 w-5 cursor-help" />
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      {/* Form Tooltips */}
      <Card id="form-tooltips">
        <CardHeader>
          <CardTitle>Form Tooltips</CardTitle>
          <CardDescription>Tooltips in form contexts for helpful hints</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <span>Password</span>
              <Tooltip message="Password must be at least 8 characters with uppercase, lowercase, and numbers">
                <Info className="text-muted-foreground h-4 w-4 cursor-help" />
              </Tooltip>
            </label>
            <Input type="password" placeholder="Enter password" />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <span>Email Address</span>
              <Tooltip message="We'll never share your email with anyone else">
                <HelpCircle className="text-muted-foreground h-4 w-4 cursor-help" />
              </Tooltip>
            </label>
            <Input type="email" placeholder="Enter email" />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <span>API Key</span>
              <Tooltip
                message={
                  <div className="space-y-1">
                    <p className="font-semibold">API Key Requirements</p>
                    <p className="text-xs">Must be 32 characters long</p>
                    <p className="text-xs">Starts with &apos;sk-&apos; prefix</p>
                  </div>
                }>
                <AlertCircle className="text-warning h-4 w-4 cursor-help" />
              </Tooltip>
            </label>
            <Input type="text" placeholder="sk-..." />
          </div>
        </CardContent>
      </Card>

      {/* Disabled Elements */}
      <Card id="disabled-elements">
        <CardHeader>
          <CardTitle>Disabled Elements</CardTitle>
          <CardDescription>Tooltips on disabled buttons and elements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Tooltip message="This action is currently unavailable">
              <span className="inline-block">
                <Button disabled>Disabled Button</Button>
              </span>
            </Tooltip>
            <Tooltip message="You don't have permission to delete">
              <span className="inline-block">
                <Button disabled type="danger" icon={<Trash2 className="h-4 w-4" />}>
                  Delete
                </Button>
              </span>
            </Tooltip>
            <Tooltip message="Feature coming soon">
              <span className="inline-block">
                <Button disabled type="secondary" icon={<Settings className="h-4 w-4" />}>
                  Settings
                </Button>
              </span>
            </Tooltip>
          </div>
          <p className="text-muted-foreground text-xs">
            Note: Wrap disabled buttons in a span to enable tooltip functionality
          </p>
        </CardContent>
      </Card>

      {/* Text Tooltips */}
      <Card id="text-tooltips">
        <CardHeader>
          <CardTitle>Text Tooltips</CardTitle>
          <CardDescription>Tooltips on text elements and truncated content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Truncated Text</h4>
            <div className="flex flex-wrap gap-4">
              <Tooltip message="This is a very long text that gets truncated in the UI">
                <span className="inline-block max-w-[200px] truncate rounded border px-2 py-1">
                  This is a very long text that gets truncated in the UI
                </span>
              </Tooltip>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Date/Time Tooltips</h4>
            <div className="flex flex-wrap items-center gap-4">
              <Tooltip message="January 15, 2024 at 3:45 PM (UTC)">
                <time className="cursor-help">2024-01-15</time>
              </Tooltip>
              <Tooltip message="Created 2 hours ago">
                <span className="text-muted-foreground cursor-help">2h ago</span>
              </Tooltip>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Abbreviations</h4>
            <div className="flex flex-wrap items-center gap-4">
              <Tooltip message="Application Programming Interface">
                <abbr className="cursor-help underline decoration-dotted">API</abbr>
              </Tooltip>
              <Tooltip message="HyperText Markup Language">
                <abbr className="cursor-help underline decoration-dotted">HTML</abbr>
              </Tooltip>
              <Tooltip message="Cascading Style Sheets">
                <abbr className="cursor-help underline decoration-dotted">CSS</abbr>
              </Tooltip>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Status Text</h4>
            <div className="flex flex-wrap items-center gap-4">
              <Tooltip message="All systems are running normally">
                <span className="text-success cursor-help">Online</span>
              </Tooltip>
              <Tooltip message="System is currently under maintenance">
                <span className="text-warning cursor-help">Maintenance</span>
              </Tooltip>
              <Tooltip message="System is experiencing issues">
                <span className="text-destructive cursor-help">Offline</span>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
