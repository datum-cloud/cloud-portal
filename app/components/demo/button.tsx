import { Button } from '@datum-ui/components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@datum-ui/components';
import { Download, Heart, Plus, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';

export const buttonDemoSections = [
  { id: 'button-types', label: 'Button Types' },
  { id: 'button-themes', label: 'Button Themes' },
  { id: 'button-sizes', label: 'Button Sizes' },
  { id: 'icon-only-buttons', label: 'Icon-Only Buttons' },
  { id: 'buttons-with-icons', label: 'Buttons with Icons' },
  { id: 'loading-states', label: 'Loading States' },
  { id: 'block-buttons', label: 'Block Buttons' },
  { id: 'disabled-states', label: 'Disabled States' },
];

export default function ButtonDemo() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleLoadingDemo = (key: string) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  return (
    <div className="space-y-8 p-6">
      {/* Button Types */}
      <Card id="button-types">
        <CardHeader>
          <CardTitle>Button Types</CardTitle>
          <CardDescription>Different button types for various use cases</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="primary">Primary</Button>
            <Button type="secondary">Secondary</Button>
            <Button type="tertiary">Tertiary</Button>
            <Button type="quaternary">Quaternary</Button>
            <Button type="warning">Warning</Button>
            <Button type="danger">Danger</Button>
            <Button type="success">Success</Button>
          </div>
        </CardContent>
      </Card>

      {/* Button Themes */}
      <Card id="button-themes">
        <CardHeader>
          <CardTitle>Button Themes</CardTitle>
          <CardDescription>Different visual themes for each button type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {['primary', 'secondary', 'tertiary', 'quaternary', 'warning', 'danger', 'success'].map(
            (type) => (
              <div key={type} className="space-y-2">
                <h4 className="text-sm font-medium capitalize">{type}</h4>
                <div className="flex flex-wrap gap-2">
                  <Button type={type as any} theme="solid">
                    Solid
                  </Button>
                  <Button type={type as any} theme="light">
                    Light
                  </Button>
                  <Button type={type as any} theme="outline">
                    Outline
                  </Button>
                  <Button type={type as any} theme="borderless">
                    Borderless
                  </Button>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Button Sizes */}
      <Card id="button-sizes">
        <CardHeader>
          <CardTitle>Button Sizes</CardTitle>
          <CardDescription>Different sizes for different contexts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <Button size="small">Small</Button>
            <Button size="default">Default</Button>
            <Button size="large">Large</Button>
            <Button size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Icon-Only Buttons */}
      <Card id="icon-only-buttons">
        <CardHeader>
          <CardTitle>Icon-Only Buttons</CardTitle>
          <CardDescription>Icon-only buttons in different sizes and themes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Small Icon-Only Buttons</h4>
            <div className="flex items-center gap-2">
              <Button
                type="primary"
                theme="solid"
                size="small"
                icon={<Plus className="h-3 w-3" />}
              />
              <Button
                type="secondary"
                theme="outline"
                size="small"
                icon={<Download className="h-3 w-3" />}
              />
              <Button
                type="tertiary"
                theme="light"
                size="small"
                icon={<Settings className="h-3 w-3" />}
              />
              <Button
                type="warning"
                theme="borderless"
                size="small"
                icon={<Heart className="h-3 w-3" />}
              />
              <Button
                type="danger"
                theme="solid"
                size="small"
                icon={<Trash2 className="h-3 w-3" />}
              />
              <Button
                type="success"
                theme="solid"
                size="small"
                icon={<Plus className="h-3 w-3" />}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Default Icon-Only Buttons</h4>
            <div className="flex items-center gap-2">
              <Button
                type="primary"
                theme="solid"
                size="default"
                icon={<Plus className="h-4 w-4" />}
              />
              <Button
                type="secondary"
                theme="outline"
                size="default"
                icon={<Download className="h-4 w-4" />}
              />
              <Button
                type="tertiary"
                theme="light"
                size="default"
                icon={<Settings className="h-4 w-4" />}
              />
              <Button
                type="warning"
                theme="borderless"
                size="default"
                icon={<Heart className="h-4 w-4" />}
              />
              <Button
                type="danger"
                theme="solid"
                size="default"
                icon={<Trash2 className="h-4 w-4" />}
              />
              <Button
                type="success"
                theme="outline"
                size="default"
                icon={<Plus className="h-4 w-4" />}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Large Icon-Only Buttons</h4>
            <div className="flex items-center gap-2">
              <Button
                type="primary"
                theme="solid"
                size="large"
                icon={<Plus className="h-5 w-5" />}
              />
              <Button
                type="secondary"
                theme="outline"
                size="large"
                icon={<Download className="h-5 w-5" />}
              />
              <Button
                type="tertiary"
                theme="light"
                size="large"
                icon={<Settings className="h-5 w-5" />}
              />
              <Button
                type="warning"
                theme="borderless"
                size="large"
                icon={<Heart className="h-5 w-5" />}
              />
              <Button
                type="danger"
                theme="solid"
                size="large"
                icon={<Trash2 className="h-5 w-5" />}
              />
              <Button
                type="success"
                theme="light"
                size="large"
                icon={<Plus className="h-5 w-5" />}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Icon-Only Loading States</h4>
            <div className="flex items-center gap-2">
              <Button
                type="primary"
                theme="solid"
                size="small"
                icon={<Plus className="h-3 w-3" />}
                loading={loading.iconSmall}
                onClick={() => handleLoadingDemo('iconSmall')}
              />
              <Button
                type="secondary"
                theme="outline"
                size="default"
                icon={<Download className="h-4 w-4" />}
                loading={loading.iconDefault}
                onClick={() => handleLoadingDemo('iconDefault')}
              />
              <Button
                type="tertiary"
                theme="light"
                size="large"
                icon={<Settings className="h-5 w-5" />}
                loading={loading.iconLarge}
                onClick={() => handleLoadingDemo('iconLarge')}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Click icon buttons to see loading states - icons are replaced with spinners
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Button with Icons */}
      <Card id="buttons-with-icons">
        <CardHeader>
          <CardTitle>Buttons with Icons</CardTitle>
          <CardDescription>Buttons can include icons on left or right side</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button icon={<Plus className="h-4 w-4" />}>Add Item</Button>
            <Button icon={<Download className="h-4 w-4" />} iconPosition="right">
              Download
            </Button>
            <Button type="danger" icon={<Trash2 className="h-4 w-4" />} theme="outline">
              Delete
            </Button>
            <Button type="secondary" icon={<Heart className="h-4 w-4" />} theme="light">
              Like
            </Button>
            <Button type="success" icon={<Plus className="h-4 w-4" />} theme="solid">
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading States */}
      <Card id="loading-states">
        <CardHeader>
          <CardTitle>Loading States</CardTitle>
          <CardDescription>Buttons can show loading states with spinners</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button loading={loading.basic} onClick={() => handleLoadingDemo('basic')}>
              {loading.basic ? 'Loading...' : 'Click to Load'}
            </Button>
            <Button
              type="secondary"
              loading={loading.secondary}
              onClick={() => handleLoadingDemo('secondary')}>
              {loading.secondary ? 'Processing...' : 'Process'}
            </Button>
            <Button
              type="danger"
              theme="outline"
              loading={loading.danger}
              onClick={() => handleLoadingDemo('danger')}>
              {loading.danger ? 'Deleting...' : 'Delete'}
            </Button>
            <Button
              type="success"
              theme="solid"
              loading={loading.success}
              onClick={() => handleLoadingDemo('success')}>
              {loading.success ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Block Buttons */}
      <Card id="block-buttons">
        <CardHeader>
          <CardTitle>Block Buttons</CardTitle>
          <CardDescription>Full-width buttons for forms and layouts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button block>Full Width Primary</Button>
            <Button type="secondary" theme="outline" block>
              Full Width Secondary
            </Button>
            <Button type="danger" theme="light" block>
              Full Width Danger Light
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Disabled State */}
      <Card id="disabled-states">
        <CardHeader>
          <CardTitle>Disabled States</CardTitle>
          <CardDescription>Buttons can be disabled to prevent interaction</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button disabled>Disabled Primary</Button>
            <Button type="secondary" disabled>
              Disabled Secondary
            </Button>
            <Button type="danger" theme="outline" disabled>
              Disabled Danger
            </Button>
            <Button icon={<Settings className="h-4 w-4" />} disabled>
              Disabled with Icon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
