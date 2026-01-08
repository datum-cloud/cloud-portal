import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  toast,
} from '@datum-ui/components';

export const toastDemoSections = [
  { id: 'toast-variants', label: 'Toast Variants' },
  { id: 'toast-descriptions', label: 'Descriptions' },
  { id: 'toast-persistent', label: 'Persistent (Infinity)' },
  { id: 'toast-update', label: 'Update by ID' },
];

export default function ToastDemo() {
  const showManyToasts = () => {
    toast.message('Toast 1');
    toast.info('Toast 2');
    toast.warning('Toast 3');
    toast.success('Toast 4');
    toast.error('Toast 5');
  };

  const demoId = 'toast-demo-id';

  return (
    <div className="space-y-8 p-6">
      <Card id="toast-variants">
        <CardHeader>
          <CardTitle>Toast Variants</CardTitle>
          <CardDescription>
            Quickly test the different toast types and stacking behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="secondary" theme="outline" onClick={() => toast.message('Message toast')}>
              Message
            </Button>
            <Button type="primary" theme="outline" onClick={() => toast.info('Info toast')}>
              Info
            </Button>
            <Button type="warning" theme="outline" onClick={() => toast.warning('Warning toast')}>
              Warning
            </Button>
            <Button type="success" theme="outline" onClick={() => toast.success('Success toast')}>
              Success
            </Button>
            <Button type="danger" theme="outline" onClick={() => toast.error('Error toast')}>
              Error
            </Button>
            <Button type="tertiary" onClick={showManyToasts}>
              Fire 5 toasts
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card id="toast-descriptions">
        <CardHeader>
          <CardTitle>Descriptions</CardTitle>
          <CardDescription>Test title vs description layout, wrapping, and spacing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="secondary"
              theme="outline"
              onClick={() =>
                toast.message('Toast with description', {
                  description: 'This is a longer description to test wrapping and spacing.',
                })
              }>
              Message + description
            </Button>
            <Button
              type="success"
              theme="outline"
              onClick={() =>
                toast.success('Saved export policy', {
                  description: 'Your changes have been applied and will take effect shortly.',
                })
              }>
              Success + description
            </Button>
            <Button
              type="danger"
              theme="outline"
              onClick={() =>
                toast.error('Could not save changes', {
                  description:
                    'Something went wrong while saving. Try again, or check the browser console for details.',
                })
              }>
              Error + long description
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card id="toast-persistent">
        <CardHeader>
          <CardTitle>Persistent (Infinity)</CardTitle>
          <CardDescription>
            Useful for testing close button, focus, and long-lived errors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="danger"
              theme="outline"
              onClick={() =>
                toast.error('This toast stays until dismissed', {
                  description: 'It uses duration: Infinity.',
                  duration: Infinity,
                })
              }>
              Persistent error
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card id="toast-update">
        <CardHeader>
          <CardTitle>Update by ID</CardTitle>
          <CardDescription>
            Re-use the same toast ID to update contents without stacking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="secondary"
              theme="outline"
              onClick={() =>
                toast.message('Starting…', {
                  id: demoId,
                  description: 'This toast will be updated by subsequent actions.',
                })
              }>
              Create (id)
            </Button>
            <Button
              type="primary"
              theme="outline"
              onClick={() =>
                toast.info('Still working…', {
                  id: demoId,
                  description: 'Updated in-place using the same id.',
                })
              }>
              Update → info
            </Button>
            <Button
              type="success"
              theme="outline"
              onClick={() =>
                toast.success('Done!', {
                  id: demoId,
                  description: 'Final update to the same toast.',
                })
              }>
              Update → success
            </Button>
            <Button
              type="danger"
              theme="outline"
              onClick={() =>
                toast.error('Failed', {
                  id: demoId,
                  description: 'Try updating again to verify replacement behavior.',
                })
              }>
              Update → error
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
