# Dialog Component

A compound dialog component built on top of shadcn's Dialog with consistent Datum UI styling.

## Usage

```tsx
import { Dialog } from '@datum-ui/components';

function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button>Open Dialog</Button>
      </Dialog.Trigger>

      <Dialog.Content>
        <Dialog.Header
          title="Dialog Title"
          description="Optional description text"
          onClose={() => setOpen(false)}
        />
        <Dialog.Body>
          <p>Your content here</p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button>Confirm</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
```

## Components

### Dialog

Root component that manages dialog state.

| Prop           | Type                      | Default | Description                          |
| -------------- | ------------------------- | ------- | ------------------------------------ |
| `open`         | `boolean`                 | -       | Controlled open state                |
| `onOpenChange` | `(open: boolean) => void` | -       | Callback when open state changes     |
| `defaultOpen`  | `boolean`                 | `false` | Initial open state (uncontrolled)    |
| `children`     | `ReactNode`               | -       | Dialog content (Trigger and Content) |

### Dialog.Trigger

Button or element that triggers the dialog to open.

| Prop       | Type        | Default | Description                              |
| ---------- | ----------- | ------- | ---------------------------------------- |
| `children` | `ReactNode` | -       | Trigger element                          |
| `asChild`  | `boolean`   | `true`  | Merge props onto child instead of adding |

### Dialog.Content

Container for the dialog content. Applies Datum UI styling.

| Prop        | Type        | Default | Description      |
| ----------- | ----------- | ------- | ---------------- |
| `children`  | `ReactNode` | -       | Dialog content   |
| `className` | `string`    | -       | Additional class |

### Dialog.Header

Header section with title, description, and close button.

| Prop          | Type         | Default | Description                      |
| ------------- | ------------ | ------- | -------------------------------- |
| `title`       | `ReactNode`  | -       | Dialog title (required)          |
| `description` | `ReactNode`  | -       | Optional description below title |
| `onClose`     | `() => void` | -       | Close button click handler       |
| `className`   | `string`     | -       | Additional class                 |

### Dialog.Body

Main content area of the dialog.

| Prop        | Type        | Default | Description      |
| ----------- | ----------- | ------- | ---------------- |
| `children`  | `ReactNode` | -       | Body content     |
| `className` | `string`    | -       | Additional class |

### Dialog.Footer

Footer section for action buttons.

| Prop        | Type        | Default | Description      |
| ----------- | ----------- | ------- | ---------------- |
| `children`  | `ReactNode` | -       | Footer content   |
| `className` | `string`    | -       | Additional class |

## Examples

### Basic Dialog

```tsx
<Dialog>
  <Dialog.Trigger>
    <Button>Open</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header title="Confirm Action" onClose={() => {}} />
    <Dialog.Body>
      <p>Are you sure you want to proceed?</p>
    </Dialog.Body>
    <Dialog.Footer>
      <Button>Yes</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>
```

### Controlled Dialog

```tsx
function ControlledDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Dialog</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Content>
          <Dialog.Header title="Controlled Dialog" onClose={() => setOpen(false)} />
          <Dialog.Body>
            <p>This dialog is controlled externally.</p>
          </Dialog.Body>
          <Dialog.Footer>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </>
  );
}
```

### Without Footer

```tsx
<Dialog>
  <Dialog.Trigger>
    <Button>View Details</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header title="Details" description="View item details" onClose={() => {}} />
    <Dialog.Body>
      <p>Content without footer actions.</p>
    </Dialog.Body>
  </Dialog.Content>
</Dialog>
```

### Custom Styling

```tsx
<Dialog>
  <Dialog.Trigger>
    <Button>Open</Button>
  </Dialog.Trigger>
  <Dialog.Content className="max-w-2xl">
    <Dialog.Header title="Wide Dialog" onClose={() => {}} />
    <Dialog.Body className="p-8">
      <p>Custom padded content in a wider dialog.</p>
    </Dialog.Body>
    <Dialog.Footer className="justify-between">
      <Button variant="ghost">Secondary Action</Button>
      <Button>Primary Action</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>
```
