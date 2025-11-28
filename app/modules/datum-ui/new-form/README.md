# Datum Form Library

A compound component pattern form library built on top of Conform.js and Zod for easy form creation with built-in validation, error handling, and accessibility features.

## Installation

The library is part of the datum-ui module. Import it directly:

```tsx
import { Form } from '@datum-ui/new-form';
```

## Quick Start

### Basic Form

```tsx
import { Form } from '@datum-ui/new-form';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'user', 'viewer']),
});

function UserForm() {
  return (
    <Form.Root
      schema={userSchema}
      onSubmit={async (data) => {
        console.log('Form submitted:', data);
        await saveUser(data);
      }}
    >
      <Form.Field name="name" label="Full Name" required>
        <Form.Input placeholder="John Doe" />
      </Form.Field>

      <Form.Field name="email" label="Email Address" required>
        <Form.Input type="email" placeholder="john@example.com" />
      </Form.Field>

      <Form.Field name="role" label="Role" required>
        <Form.Select placeholder="Select a role">
          <Form.SelectItem value="admin">Admin</Form.SelectItem>
          <Form.SelectItem value="user">User</Form.SelectItem>
          <Form.SelectItem value="viewer">Viewer</Form.SelectItem>
        </Form.Select>
      </Form.Field>

      <Form.Submit>Create User</Form.Submit>
    </Form.Root>
  );
}
```

## Components

### Core Components

#### `Form.Root`

The root form component that provides context to all children.

```tsx
<Form.Root
  schema={zodSchema}           // Required: Zod schema for validation
  onSubmit={(data) => {}}      // Client-side submit handler
  action="/api/users"          // OR: React Router action path
  method="POST"                // HTTP method (default: POST)
  defaultValues={{ role: 'user' }}  // Default form values
  mode="onBlur"                // Validation mode: onBlur | onChange | onSubmit
  onError={(errors) => {}}     // Validation error callback
  onSuccess={(data) => {}}     // Success callback
  className="space-y-4"        // Additional CSS classes
>
  {children}
</Form.Root>
```

#### `Form.Field`

Field wrapper with automatic label and error handling. Supports two patterns:

**Standard Pattern** - For built-in Form inputs:

```tsx
<Form.Field
  name="email"                 // Required: Field name (supports nested: "address.city")
  label="Email Address"        // Field label
  description="We'll never share your email"  // Helper text
  tooltip="More information"   // Tooltip content
  required                     // Show required indicator
  disabled                     // Disable the field
  className="custom-class"     // Wrapper CSS classes
  labelClassName="font-bold"   // Label CSS classes
>
  <Form.Input />
</Form.Field>
```

**Render Function Pattern** - For custom components needing field access:

```tsx
<Form.Field name="role" label="Role" required>
  {({ control, meta, fields, field, form, isSubmitting }) => (
    <CustomSelect
      name={meta.name}
      id={meta.id}
      value={control.value}
      onChange={(value) => control.change(value)}
      disabled={meta.disabled || isSubmitting}
    />
  )}
</Form.Field>
```

The render function receives:

- `field` - Conform field metadata
- `control` - Input control with `value`, `change()`, `blur()`, `focus()`
- `meta` - Field meta: `name`, `id`, `errors`, `required`, `disabled`
- `fields` - All form fields (for multi-field scenarios)
- `form` - Form metadata
- `isSubmitting` - Whether form is submitting

**Multi-Field Example** - When one field affects another:

```tsx
<Form.Field name="role" label="Role" required>
  {({ control, meta, fields }) => {
    // Access another field's control
    const namespaceControl = useInputControl(fields.roleNamespace as any);

    return (
      <RoleSelect
        value={control.value}
        onSelect={(value) => {
          control.change(value.role);
          namespaceControl.change(value.namespace);
        }}
      />
    );
  }}
</Form.Field>
```

#### `Form.Submit`

Submit button with automatic loading state.

```tsx
<Form.Submit
  loadingText="Saving..."      // Text shown while submitting
  type="primary"               // Button variant
  theme="solid"                // Button theme
  size="default"               // Button size
  disabled={false}             // Disable button
>
  Save Changes
</Form.Submit>
```

#### `Form.Button`

Non-submit button for actions like cancel, reset, etc. Automatically disabled during form submission.

```tsx
// Cancel button (defaults to quaternary/borderless style)
<Form.Button onClick={() => navigate(-1)}>
  Cancel
</Form.Button>

// Reset button with custom styling
<Form.Button onClick={() => form.reset()} type="secondary" theme="light">
  Reset Form
</Form.Button>

// Button that stays enabled during submission
<Form.Button onClick={handleHelp} disableOnSubmit={false}>
  Need Help?
</Form.Button>
```

Props:

- `onClick` - Click handler
- `type` - Button variant: `primary` | `secondary` | `tertiary` | `quaternary` (default)
- `theme` - Button theme: `solid` | `light` | `borderless` (default)
- `size` - Button size: `small` | `default` | `large`
- `disabled` - Disable button manually
- `disableOnSubmit` - Auto-disable during form submission (default: `true`)

### Input Components

#### `Form.Input`

```tsx
<Form.Field name="username">
  <Form.Input
    type="text"                // text | email | password | number | tel | url | search | date | time
    placeholder="Enter username"
    disabled={false}
    className="w-full"
  />
</Form.Field>
```

#### `Form.Textarea`

```tsx
<Form.Field name="bio">
  <Form.Textarea
    rows={4}
    placeholder="Tell us about yourself..."
  />
</Form.Field>
```

#### `Form.Select`

```tsx
<Form.Field name="country">
  <Form.Select placeholder="Select a country">
    <Form.SelectItem value="us">United States</Form.SelectItem>
    <Form.SelectItem value="uk">United Kingdom</Form.SelectItem>
    <Form.SelectItem value="ca" disabled>Canada</Form.SelectItem>
  </Form.Select>
</Form.Field>
```

#### `Form.Checkbox`

```tsx
<Form.Field name="terms">
  <Form.Checkbox label="I agree to the terms and conditions" />
</Form.Field>
```

#### `Form.Switch`

```tsx
<Form.Field name="notifications">
  <Form.Switch label="Enable email notifications" />
</Form.Field>
```

#### `Form.RadioGroup`

```tsx
<Form.Field name="plan" label="Select Plan">
  <Form.RadioGroup orientation="vertical">
    <Form.RadioItem value="free" label="Free" description="Basic features" />
    <Form.RadioItem value="pro" label="Pro" description="Advanced features" />
    <Form.RadioItem value="enterprise" label="Enterprise" description="Custom solutions" />
  </Form.RadioGroup>
</Form.Field>
```

### Advanced Components

#### `Form.When` - Conditional Rendering

Render children based on field values.

```tsx
// Render when field equals value
<Form.When field="contactMethod" is="email">
  <Form.Field name="email"><Form.Input type="email" /></Form.Field>
</Form.When>

// Render when field does not equal value
<Form.When field="contactMethod" isNot="none">
  <Form.Field name="contact"><Form.Input /></Form.Field>
</Form.When>

// Render when field value is in array
<Form.When field="role" in={['admin', 'moderator']}>
  <Form.Field name="permissions"><Form.Input /></Form.Field>
</Form.When>

// Render when field value is not in array
<Form.When field="status" notIn={['archived', 'deleted']}>
  <Form.Field name="actions"><Form.Input /></Form.Field>
</Form.When>
```

#### `Form.FieldArray` - Dynamic Fields

Manage arrays of form fields.

```tsx
<Form.FieldArray name="members">
  {({ fields, append, remove, move }) => (
    <>
      {fields.map((field, index) => (
        <div key={field.key} className="flex gap-2">
          <Form.Field name={`members.${index}.email`} label="Email">
            <Form.Input type="email" />
          </Form.Field>
          <Form.Field name={`members.${index}.role`} label="Role">
            <Form.Select>
              <Form.SelectItem value="admin">Admin</Form.SelectItem>
              <Form.SelectItem value="member">Member</Form.SelectItem>
            </Form.Select>
          </Form.Field>
          <button type="button" onClick={() => remove(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={() => append({ email: '', role: 'member' })}>
        Add Member
      </button>
    </>
  )}
</Form.FieldArray>
```

#### `Form.Custom` - Escape Hatch

Access raw form context for complex use cases.

```tsx
<Form.Custom>
  {({ form, fields, submit, reset }) => (
    <MyCustomComponent
      fields={fields}
      onCustomAction={() => {
        // Custom logic
        submit();
      }}
    />
  )}
</Form.Custom>
```

### Stepper Components

#### Multi-Step Form

```tsx
const steps = [
  { id: 'account', label: 'Account', description: 'Create your account', schema: accountSchema },
  { id: 'profile', label: 'Profile', schema: profileSchema },
  { id: 'confirm', label: 'Confirm', schema: confirmSchema },
];

<Form.Stepper
  steps={steps}
  onComplete={async (data) => {
    console.log('All data:', data);
    await submitForm(data);
  }}
  onStepChange={(stepId, direction) => {
    console.log(`Moving ${direction} to step: ${stepId}`);
  }}
  initialStep="account"
>
  <Form.StepperNavigation variant="horizontal" labelOrientation="vertical" />

  <Form.Step id="account">
    <Form.Field name="email" label="Email" required>
      <Form.Input type="email" />
    </Form.Field>
    <Form.Field name="password" label="Password" required>
      <Form.Input type="password" />
    </Form.Field>
  </Form.Step>

  <Form.Step id="profile">
    <Form.Field name="name" label="Full Name" required>
      <Form.Input />
    </Form.Field>
    <Form.Field name="bio" label="Bio">
      <Form.Textarea rows={4} />
    </Form.Field>
  </Form.Step>

  <Form.Step id="confirm">
    <p>Please review your information before submitting.</p>
  </Form.Step>

  <Form.StepperControls
    prevLabel={(isFirst) => isFirst ? 'Cancel' : 'Previous'}
    nextLabel={(isLast) => isLast ? 'Submit' : 'Next'}
  />
</Form.Stepper>
```

## Hooks

### `Form.useFormContext()`

Access the form context from any component inside `Form.Root`.

```tsx
function MyComponent() {
  const { form, fields, isSubmitting, submit, reset } = Form.useFormContext();

  return (
    <button onClick={submit} disabled={isSubmitting}>
      Submit
    </button>
  );
}
```

### `Form.useFieldContext()`

Access the current field context from inside `Form.Field`.

```tsx
function MyInput() {
  const { name, id, errors, required, disabled, fieldMeta } = Form.useFieldContext();

  return (
    <input
      name={name}
      id={id}
      required={required}
      disabled={disabled}
      aria-invalid={!!errors?.length}
    />
  );
}
```

### `Form.useField(name)`

Access and control a specific field by name.

```tsx
function MyCustomField({ name }: { name: string }) {
  const { field, control, meta, errors } = Form.useField(name);

  return (
    <input
      name={meta.name}
      value={control.value ?? ''}
      onChange={(e) => control.change(e.target.value)}
      onBlur={control.blur}
    />
  );
}
```

### `Form.useWatch(name)`

Watch a field's value and re-render when it changes.

```tsx
function PriceDisplay() {
  const quantity = Form.useWatch('quantity');
  const price = Form.useWatch('price');

  const total = (Number(quantity) || 0) * (Number(price) || 0);

  return <p>Total: ${total.toFixed(2)}</p>;
}
```

### `Form.useStepper()`

Access stepper context inside `Form.Stepper`.

```tsx
function StepIndicator() {
  const { current, currentIndex, steps, isFirst, isLast } = Form.useStepper();

  return (
    <p>
      Step {currentIndex + 1} of {steps.length}: {current.label}
    </p>
  );
}
```

## TypeScript Support

All components are fully typed. Import types directly:

```tsx
import { Form } from '@datum-ui/new-form';
import type { FormRootProps, FormFieldProps, StepConfig } from '@datum-ui/new-form';
```

## Migration from Old Form System

### Before

```tsx
const [form, fields] = useForm({
  id: 'user-form',
  constraint: getZodConstraint(userSchema),
  shouldValidate: 'onBlur',
  shouldRevalidate: 'onInput',
  onValidate({ formData }) {
    return parseWithZod(formData, { schema: userSchema });
  },
});

<FormProvider context={form.context}>
  <Form {...getFormProps(form)} method="POST">
    <AuthenticityTokenInput />
    <Field isRequired label="Name" errors={fields.name.errors}>
      <Input {...getInputProps(fields.name, { type: 'text' })} />
    </Field>
    <Button type="submit">Submit</Button>
  </Form>
</FormProvider>
```

### After

```tsx
<Form.Root schema={userSchema} onSubmit={handleSubmit}>
  <Form.Field name="name" label="Name" required>
    <Form.Input />
  </Form.Field>
  <Form.Submit>Submit</Form.Submit>
</Form.Root>
```

## Accessibility

All components include built-in accessibility features:

- ARIA labels and descriptions
- Error announcements with `role="alert"`
- Keyboard navigation support
- Required field indicators
- Focus management

## Dependencies

- `@conform-to/react` - Form state management
- `@conform-to/zod` - Zod integration
- `zod` - Schema validation
- `@radix-ui/*` - UI primitives
- `@shadcn/lib/utils` - Utility functions
