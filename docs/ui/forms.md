# Form Library Guide

This document covers the form library patterns and usage.

---

## Overview

The form library is built on:
- **Conform.js** - Form state management
- **Zod** - Schema validation
- **Compound Components** - Composable API

---

## Basic Usage

```tsx
import { Form } from '@datum-ui/components/new-form';
import { z } from 'zod';

// 1. Define schema
const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  role: z.enum(['admin', 'user', 'viewer']),
});

// 2. Create form
function UserForm() {
  const handleSubmit = async (data) => {
    console.log('Submitted:', data);
    await saveUser(data);
  };

  return (
    <Form.Root schema={schema} onSubmit={handleSubmit}>
      <Form.Field name="name" label="Name" required>
        <Form.Input placeholder="John Doe" />
      </Form.Field>

      <Form.Field name="email" label="Email" required>
        <Form.Input type="email" placeholder="john@example.com" />
      </Form.Field>

      <Form.Field name="role" label="Role" required>
        <Form.Select placeholder="Select role">
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

---

## Components Reference

### Form.Root

The root form component that provides context.

```tsx
<Form.Root
  schema={zodSchema}           // Required: Zod schema
  onSubmit={(data) => {}}      // Submit handler (typed!)
  defaultValues={{ role: 'user' }}  // Initial values
  mode="onBlur"                // Validation: onBlur | onChange | onSubmit
>
  {children}
</Form.Root>
```

### Form.Field

Field wrapper with label, description, and error handling.

```tsx
<Form.Field
  name="email"                 // Required: field name
  label="Email Address"        // Label text
  description="We'll never share your email"
  tooltip="More information"
  required                     // Show required indicator
  disabled                     // Disable field
>
  <Form.Input />
</Form.Field>
```

### Input Components

```tsx
// Text input
<Form.Input type="text" placeholder="Enter text" />
<Form.Input type="email" />
<Form.Input type="password" />

// Textarea
<Form.Textarea rows={4} placeholder="Enter description" />

// Select
<Form.Select placeholder="Choose option">
  <Form.SelectItem value="a">Option A</Form.SelectItem>
  <Form.SelectItem value="b">Option B</Form.SelectItem>
</Form.Select>

// Checkbox
<Form.Checkbox label="I agree to terms" />

// Switch
<Form.Switch label="Enable notifications" />

// Radio Group
<Form.RadioGroup orientation="vertical">
  <Form.RadioItem value="free" label="Free" description="Basic features" />
  <Form.RadioItem value="pro" label="Pro" description="Advanced features" />
</Form.RadioGroup>
```

### Form.Submit

Submit button with automatic loading state.

```tsx
<Form.Submit
  loadingText="Saving..."
  type="primary"
  size="default"
>
  Save Changes
</Form.Submit>
```

### Form.Button

Non-submit button (cancel, reset, etc.).

```tsx
<Form.Button onClick={() => navigate(-1)}>
  Cancel
</Form.Button>

<Form.Button onClick={() => form.reset()} type="secondary">
  Reset
</Form.Button>
```

---

## Advanced Patterns

### Conditional Fields

Show/hide fields based on other field values:

```tsx
<Form.Field name="type" label="Type" required>
  <Form.Select>
    <Form.SelectItem value="personal">Personal</Form.SelectItem>
    <Form.SelectItem value="business">Business</Form.SelectItem>
  </Form.Select>
</Form.Field>

<Form.When field="type" is="business">
  <Form.Field name="companyName" label="Company Name" required>
    <Form.Input />
  </Form.Field>
</Form.When>

<Form.When field="type" isNot="personal">
  <Form.Field name="taxId" label="Tax ID">
    <Form.Input />
  </Form.Field>
</Form.When>
```

### Dynamic Field Arrays

Add/remove fields dynamically:

```tsx
const schema = z.object({
  members: z.array(z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'member']),
  })).min(1),
});

<Form.FieldArray name="members">
  {({ fields, append, remove }) => (
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

### Multi-Step Forms

Create wizard-style forms:

```tsx
const steps = [
  { id: 'account', label: 'Account', schema: accountSchema },
  { id: 'profile', label: 'Profile', schema: profileSchema },
  { id: 'confirm', label: 'Confirm', schema: confirmSchema },
];

<Form.Stepper
  steps={steps}
  onComplete={async (data) => {
    await submitForm(data);
  }}
>
  <Form.StepperNavigation variant="horizontal" />

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
    <p>Review your information before submitting.</p>
  </Form.Step>

  <Form.StepperControls
    prevLabel={(isFirst) => isFirst ? 'Cancel' : 'Previous'}
    nextLabel={(isLast) => isLast ? 'Submit' : 'Next'}
  />
</Form.Stepper>
```

---

## Hooks

### useFormContext()

Access form state from any child component:

```tsx
function FormStatus() {
  const { form, fields, isSubmitting, submit, reset } = Form.useFormContext();

  return (
    <div>
      <span>Submitting: {isSubmitting ? 'Yes' : 'No'}</span>
      <button onClick={submit}>Submit</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

### useField(name)

Access specific field state:

```tsx
function CustomInput({ name }) {
  const { field, control, meta, errors } = Form.useField(name);

  return (
    <div>
      <input
        name={meta.name}
        value={control.value ?? ''}
        onChange={(e) => control.change(e.target.value)}
        onBlur={control.blur}
      />
      {errors && <span className="text-red-500">{errors[0]}</span>}
    </div>
  );
}
```

### useWatch(name)

Watch field value changes:

```tsx
function PriceDisplay() {
  const quantity = Form.useWatch('quantity');
  const price = Form.useWatch('price');

  const total = (Number(quantity) || 0) * (Number(price) || 0);

  return <p>Total: ${total.toFixed(2)}</p>;
}
```

---

## Validation

### Zod Schema

```typescript
const schema = z.object({
  // Required string
  name: z.string().min(1, 'Name is required'),

  // Email validation
  email: z.string().email('Invalid email'),

  // Number with range
  age: z.number().min(18).max(100),

  // Enum
  status: z.enum(['active', 'inactive']),

  // Optional with default
  notes: z.string().optional().default(''),

  // Custom validation
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),

  // Conditional validation
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword'],
});
```

### Error Display

Errors are automatically displayed below fields:

```tsx
<Form.Field name="email" label="Email">
  <Form.Input type="email" />
  {/* Error displays here automatically */}
</Form.Field>
```

Custom error component:

```tsx
<Form.Field name="email" label="Email">
  <Form.Input type="email" />
  <Form.Error name="email" className="text-red-600" />
</Form.Field>
```

---

## Server Actions

For React Router actions:

```tsx
<Form.Root
  schema={schema}
  action="/api/users"
  method="POST"
>
  {/* Fields */}
</Form.Root>
```

With useFetcher:

```tsx
function UserForm() {
  const fetcher = useFetcher();

  return (
    <Form.Root
      schema={schema}
      onSubmit={async (data) => {
        fetcher.submit(data, {
          method: 'POST',
          action: '/api/users',
        });
      }}
      isSubmitting={fetcher.state === 'submitting'}
    >
      {/* Fields */}
    </Form.Root>
  );
}
```

---

## Best Practices

### ✅ DO

- Define schemas outside components (memoization)
- Use Zod for complex validation
- Handle loading states
- Show validation errors clearly

### ❌ DON'T

- Forget `required` prop for required fields
- Skip schema validation
- Ignore form state during submission
- Hard-code error messages

---

## Related Documentation

- [datum-ui Guide](./datum-ui-guide.md) - Full component docs
- Full form docs: `app/modules/datum-ui/components/new-form/README.md`
