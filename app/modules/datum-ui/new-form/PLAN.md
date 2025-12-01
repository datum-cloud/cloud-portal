# Form Component Library Plan

> A compound component pattern form library built on top of Conform.js and Zod for easy form creation with built-in validation, error handling, and accessibility features.

## Table of Contents

- [Overview](#overview)
- [Goals](#goals)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Component API](#component-api)
- [Implementation Phases](#implementation-phases)
- [Migration Strategy](#migration-strategy)
- [Dependencies](#dependencies)

---

## Overview

### Problem Statement

Current form implementation in cloud-portal requires verbose boilerplate:

```tsx
// Current: ~30+ lines of setup per form
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
    <Field isRequired label="Email" errors={fields.email.errors}>
      <Input {...getInputProps(fields.email, { type: 'email' })} />
    </Field>
    <Button type="submit">Submit</Button>
  </Form>
</FormProvider>;
```

### Solution

A compound component library that reduces boilerplate by ~70%:

```tsx
// New: Clean, declarative API
<Form.Root schema={userSchema} onSubmit={handleSubmit}>
  <Form.Field name="name" label="Name" required>
    <Form.Input />
  </Form.Field>
  <Form.Field name="email" label="Email" required>
    <Form.Input type="email" />
  </Form.Field>
  <Form.Submit>Submit</Form.Submit>
</Form.Root>
```

---

## Goals

| Goal                   | Description                                      |
| ---------------------- | ------------------------------------------------ |
| **Simplicity**         | Reduce form boilerplate by 70%                   |
| **Type Safety**        | Full TypeScript inference from Zod schemas       |
| **Accessibility**      | Built-in ARIA attributes, keyboard navigation    |
| **Flexibility**        | Escape hatches for complex use cases             |
| **Isolation**          | Zero dependencies on existing form components    |
| **Stepper Support**    | First-class multi-step form support              |
| **Conditional Fields** | Easy conditional rendering based on field values |

---

## Architecture

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FORM LIBRARY                              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Compound Components                                    │
│  ├── Form.Root, Form.Field, Form.Submit                         │
│  ├── Form.Stepper, Form.Step                                    │
│  └── Form.When, Form.FieldArray                                 │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Context & Hooks                                        │
│  ├── FormContext, FieldContext, StepperContext                  │
│  └── useForm, useField, useWatch, useStepper                    │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Primitives (duplicated from existing)                  │
│  └── Input, Select, Checkbox, Switch, Textarea, RadioGroup      │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: External Dependencies                                  │
│  ├── @conform-to/react, @conform-to/zod                         │
│  ├── zod                                                        │
│  ├── @radix-ui/* primitives                                     │
│  └── @shadcn/lib/utils (cn utility)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Zod Schema
    ↓
Form.Root (creates form context via useForm)
    ↓
FormContext.Provider
    ↓
Form.Field (creates field context, auto-wires to form)
    ↓
FieldContext.Provider
    ↓
Form.Input/Select/etc (consumes field context, renders primitive)
    ↓
User Interaction
    ↓
Validation (Conform + Zod)
    ↓
Error Display (automatic in Form.Field)
```

---

## Directory Structure

```
app/modules/datum-ui/new-form/
├── index.ts                      # Main export
├── README.md                     # Usage documentation
├── PLAN.md                       # This file
│
├── primitives/                   # Base UI components (duplicated)
│   ├── index.ts
│   ├── input.tsx
│   ├── textarea.tsx
│   ├── select.tsx
│   ├── checkbox.tsx
│   ├── switch.tsx
│   ├── radio-group.tsx
│   └── label.tsx
│
├── context/                      # React contexts
│   ├── index.ts
│   ├── form-context.tsx          # Main form state context
│   ├── field-context.tsx         # Individual field context
│   └── stepper-context.tsx       # Multi-step form context
│
├── hooks/                        # Custom hooks
│   ├── index.ts
│   ├── use-form.ts               # Internal form hook wrapper
│   ├── use-field.ts              # Field access hook
│   ├── use-form-context.ts       # Form context consumer
│   ├── use-field-context.ts      # Field context consumer
│   ├── use-stepper.ts            # Stepper state hook
│   └── use-watch.ts              # Field value watcher
│
├── components/                   # Compound components
│   ├── index.ts
│   ├── form-root.tsx             # <Form.Root>
│   ├── form-field.tsx            # <Form.Field>
│   ├── form-input.tsx            # <Form.Input>
│   ├── form-textarea.tsx         # <Form.Textarea>
│   ├── form-select.tsx           # <Form.Select>, <Form.SelectItem>
│   ├── form-checkbox.tsx         # <Form.Checkbox>
│   ├── form-switch.tsx           # <Form.Switch>
│   ├── form-radio-group.tsx      # <Form.RadioGroup>, <Form.RadioItem>
│   ├── form-submit.tsx           # <Form.Submit>
│   ├── form-error.tsx            # <Form.Error>
│   ├── form-description.tsx      # <Form.Description>
│   ├── form-when.tsx             # <Form.When>
│   ├── form-custom.tsx           # <Form.Custom>
│   ├── form-field-array.tsx      # <Form.FieldArray>
│   │
│   └── stepper/                  # Stepper components
│       ├── index.ts
│       ├── form-stepper.tsx      # <Form.Stepper>
│       ├── form-step.tsx         # <Form.Step>
│       ├── stepper-navigation.tsx # <Form.StepperNavigation>
│       └── stepper-controls.tsx  # <Form.StepperControls>
│
└── types/                        # TypeScript definitions
    └── index.ts
```

---

## Component API

### Core Components

#### `Form.Root`

The root form component that provides context to all children.

```tsx
interface FormRootProps<T extends z.ZodType> {
  // Required
  schema: T;
  children: React.ReactNode;

  // Submission
  onSubmit?: (data: z.infer<T>) => void | Promise<void>;
  action?: string; // React Router action path
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  // Configuration
  id?: string;
  defaultValues?: Partial<z.infer<T>>;
  mode?: 'onBlur' | 'onChange' | 'onSubmit';

  // Callbacks
  onError?: (errors: z.ZodError) => void;
  onSuccess?: (data: z.infer<T>) => void;

  // Styling
  className?: string;
}

// Usage
<Form.Root
  schema={userSchema}
  onSubmit={async (data) => {
    await saveUser(data);
  }}
  defaultValues={{ role: 'user' }}>
  {children}
</Form.Root>;
```

#### `Form.Field`

Wrapper component for form fields with automatic label and error handling.

```tsx
interface FormFieldProps {
  // Required
  name: string; // Field path (supports nested: "address.city")
  children: React.ReactNode;

  // Labels & Help Text
  label?: string | React.ReactNode;
  description?: string | React.ReactNode;
  tooltip?: string | React.ReactNode;

  // State
  required?: boolean;
  disabled?: boolean;

  // Styling
  className?: string;
  labelClassName?: string;
}

// Usage
<Form.Field name="email" label="Email Address" description="We'll never share your email" required>
  <Form.Input type="email" />
</Form.Field>;
```

#### `Form.Submit`

Submit button with automatic loading state.

```tsx
interface FormSubmitProps {
  children: React.ReactNode;

  // Loading state
  loadingText?: string;

  // Button variants (pass-through to Button component)
  type?: 'primary' | 'secondary' | 'tertiary' | 'quaternary';
  theme?: 'solid' | 'light' | 'borderless';
  size?: 'small' | 'default' | 'large';

  // State
  disabled?: boolean;

  // Styling
  className?: string;
}

// Usage
<Form.Submit loadingText="Saving...">Save Changes</Form.Submit>;
```

### Input Components

#### `Form.Input`

```tsx
interface FormInputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  // All standard input props
}

// Usage - automatically wired to parent Form.Field
<Form.Field name="username">
  <Form.Input placeholder="Enter username" />
</Form.Field>;
```

#### `Form.Textarea`

```tsx
interface FormTextareaProps {
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
}

// Usage
<Form.Field name="bio">
  <Form.Textarea placeholder="Tell us about yourself" rows={4} />
</Form.Field>;
```

#### `Form.Select`

```tsx
interface FormSelectProps {
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode; // Form.SelectItem children
}

interface FormSelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

// Usage
<Form.Field name="country">
  <Form.Select placeholder="Select country">
    <Form.SelectItem value="us">United States</Form.SelectItem>
    <Form.SelectItem value="uk">United Kingdom</Form.SelectItem>
    <Form.SelectItem value="ca">Canada</Form.SelectItem>
  </Form.Select>
</Form.Field>;
```

#### `Form.Checkbox`

```tsx
interface FormCheckboxProps {
  label?: string; // Inline label next to checkbox
  disabled?: boolean;
  className?: string;
}

// Usage
<Form.Field name="terms">
  <Form.Checkbox label="I agree to the terms and conditions" />
</Form.Field>;
```

#### `Form.Switch`

```tsx
interface FormSwitchProps {
  label?: string; // Inline label next to switch
  disabled?: boolean;
  className?: string;
}

// Usage
<Form.Field name="notifications">
  <Form.Switch label="Enable email notifications" />
</Form.Field>;
```

#### `Form.RadioGroup`

```tsx
interface FormRadioGroupProps {
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
  className?: string;
  children: React.ReactNode; // Form.RadioItem children
}

interface FormRadioItemProps {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

// Usage
<Form.Field name="plan">
  <Form.RadioGroup orientation="vertical">
    <Form.RadioItem value="free" label="Free" description="Basic features" />
    <Form.RadioItem value="pro" label="Pro" description="Advanced features" />
    <Form.RadioItem value="enterprise" label="Enterprise" description="Custom solutions" />
  </Form.RadioGroup>
</Form.Field>;
```

### Advanced Components

#### `Form.When`

Conditional rendering based on field values.

```tsx
interface FormWhenProps {
  field: string;                      // Field name to watch
  is?: any;                           // Render when field equals this value
  isNot?: any;                        // Render when field does not equal this value
  in?: any[];                         // Render when field value is in array
  notIn?: any[];                      // Render when field value is not in array
  children: React.ReactNode;
}

// Usage
<Form.Field name="contactMethod">
  <Form.Select>
    <Form.SelectItem value="email">Email</Form.SelectItem>
    <Form.SelectItem value="phone">Phone</Form.SelectItem>
  </Form.Select>
</Form.Field>

<Form.When field="contactMethod" is="email">
  <Form.Field name="email" label="Email Address" required>
    <Form.Input type="email" />
  </Form.Field>
</Form.When>

<Form.When field="contactMethod" is="phone">
  <Form.Field name="phone" label="Phone Number" required>
    <Form.Input type="tel" />
  </Form.Field>
</Form.When>
```

#### `Form.FieldArray`

Dynamic array of fields.

```tsx
interface FormFieldArrayProps {
  name: string;
  children: (props: {
    fields: Array<{ id: string; key: string }>;
    append: (value?: any) => void;
    remove: (index: number) => void;
    move: (from: number, to: number) => void;
  }) => React.ReactNode;
}

// Usage
<Form.FieldArray name="members">
  {({ fields, append, remove }) => (
    <>
      {fields.map((field, index) => (
        <div key={field.key} className="flex gap-2">
          <Form.Field name={`members.${index}.email`}>
            <Form.Input type="email" />
          </Form.Field>
          <button onClick={() => remove(index)}>Remove</button>
        </div>
      ))}
      <button onClick={() => append({ email: '' })}>Add Member</button>
    </>
  )}
</Form.FieldArray>;
```

#### `Form.Custom`

Escape hatch for custom implementations.

```tsx
interface FormCustomProps {
  children: (context: {
    form: FormMetadata;
    fields: FieldMetadata;
    submit: () => void;
    reset: () => void;
  }) => React.ReactNode;
}

// Usage
<Form.Custom>
  {({ form, fields }) => (
    <MyCustomComponent
      fields={fields}
      onCustomAction={() => form.update({ ... })}
    />
  )}
</Form.Custom>
```

### Stepper Components

#### `Form.Stepper`

Multi-step form container.

```tsx
interface StepConfig {
  id: string;
  label: string;
  description?: string;
  schema: z.ZodType;
}

interface FormStepperProps {
  steps: StepConfig[];
  children: React.ReactNode;

  // Callbacks
  onComplete: (data: Record<string, any>) => void | Promise<void>;
  onStepChange?: (stepId: string, direction: 'next' | 'prev') => void;

  // Configuration
  initialStep?: string;

  // Styling
  className?: string;
}

// Usage
const steps = [
  { id: 'account', label: 'Account', schema: accountSchema },
  { id: 'profile', label: 'Profile', schema: profileSchema },
  { id: 'confirm', label: 'Confirm', schema: confirmSchema },
];

<Form.Stepper steps={steps} onComplete={handleComplete}>
  <Form.StepperNavigation />

  <Form.Step id="account">
    <Form.Field name="email" label="Email" required>
      <Form.Input type="email" />
    </Form.Field>
  </Form.Step>

  <Form.Step id="profile">
    <Form.Field name="name" label="Full Name" required>
      <Form.Input />
    </Form.Field>
  </Form.Step>

  <Form.Step id="confirm">
    <p>Review your information</p>
  </Form.Step>

  <Form.StepperControls />
</Form.Stepper>;
```

#### `Form.Step`

Individual step content.

```tsx
interface FormStepProps {
  id: string; // Must match a step id from steps array
  children: React.ReactNode;
}
```

#### `Form.StepperNavigation`

Step indicators/progress.

```tsx
interface StepperNavigationProps {
  variant?: 'horizontal' | 'vertical';
  labelOrientation?: 'horizontal' | 'vertical';
  className?: string;
}
```

#### `Form.StepperControls`

Navigation buttons (Previous/Next/Submit).

```tsx
interface StepperControlsProps {
  prevLabel?: string | ((isFirst: boolean) => string);
  nextLabel?: string | ((isLast: boolean) => string);
  showPrev?: boolean;
  className?: string;
}
```

### Hooks (Escape Hatches)

```tsx
// Access form context
const { form, fields, submit, reset } = Form.useFormContext();

// Access specific field
const { field, control, meta, errors } = Form.useField('email');

// Watch field value
const value = Form.useWatch('contactMethod');

// Access stepper state (inside Form.Stepper)
const { current, steps, next, prev, goTo, isFirst, isLast, metadata, setMetadata } =
  Form.useStepperContext();
```

---

## Implementation Phases

### Phase 1: Core Foundation (Day 1-2)

**Deliverables:**

- [ ] Directory structure setup
- [ ] Primitives (duplicated from existing)
  - [ ] `primitives/input.tsx`
  - [ ] `primitives/textarea.tsx`
  - [ ] `primitives/label.tsx`
  - [ ] `primitives/select.tsx`
  - [ ] `primitives/checkbox.tsx`
  - [ ] `primitives/switch.tsx`
  - [ ] `primitives/radio-group.tsx`
- [ ] Core context
  - [ ] `context/form-context.tsx`
  - [ ] `context/field-context.tsx`
- [ ] Core hooks
  - [ ] `hooks/use-form.ts`
  - [ ] `hooks/use-field.ts`
  - [ ] `hooks/use-form-context.ts`
  - [ ] `hooks/use-field-context.ts`
- [ ] Core components
  - [ ] `components/form-root.tsx`
  - [ ] `components/form-field.tsx`
  - [ ] `components/form-submit.tsx`
  - [ ] `components/form-error.tsx`

### Phase 2: Input Components (Day 2-3)

**Deliverables:**

- [ ] `components/form-input.tsx`
- [ ] `components/form-textarea.tsx`
- [ ] `components/form-select.tsx`
- [ ] `components/form-checkbox.tsx`
- [ ] `components/form-switch.tsx`
- [ ] `components/form-radio-group.tsx`
- [ ] `components/form-description.tsx`

### Phase 3: Advanced Features (Day 3-4)

**Deliverables:**

- [ ] `hooks/use-watch.ts`
- [ ] `components/form-when.tsx`
- [ ] `components/form-field-array.tsx`
- [ ] `components/form-custom.tsx`

### Phase 4: Stepper System (Day 4-5)

**Deliverables:**

- [ ] `context/stepper-context.tsx`
- [ ] `hooks/use-stepper.ts`
- [ ] `components/stepper/form-stepper.tsx`
- [ ] `components/stepper/form-step.tsx`
- [ ] `components/stepper/stepper-navigation.tsx`
- [ ] `components/stepper/stepper-controls.tsx`

### Phase 5: Integration & Export (Day 5)

**Deliverables:**

- [ ] `index.ts` - Main export with Form compound component
- [ ] `types/index.ts` - All TypeScript types exported
- [ ] `README.md` - Usage documentation

### Phase 6: Pilot Testing (Day 6-7)

**Test with 3 forms covering all patterns:**

| Form            | Pattern                          | Location                           |
| --------------- | -------------------------------- | ---------------------------------- |
| Invitation Form | Simple fields                    | `app/features/member/`             |
| DNS Record Form | Conditional fields (`Form.When`) | `app/features/edge/dns-zone/form/` |
| Grafana Stepper | Multi-step (`Form.Stepper`)      | `app/features/edge/proxy/grafana/` |

### Phase 7: Full Migration (Day 8-12)

**Migrate all existing forms to new library.**

### Phase 8: Cleanup (Day 13)

- [ ] Delete `app/modules/datum-ui/components/form/`
- [ ] Delete `app/components/field/`
- [ ] Rename `new-form/` → `form/`
- [ ] Update all imports

---

## Migration Strategy

### Before Migration (Current State)

```
app/modules/datum-ui/
├── components/form/          # Old form primitives
└── new-form/                 # New form library

app/components/
└── field/                    # Old Field wrapper
```

### During Migration

```tsx
// Old forms still use old imports
import { Field } from '@/components/field/field';
import { Input } from '@datum-ui/components';
// New forms use new library
import { Form } from '@datum-ui/new-form';
```

### After Migration (Target State)

```
app/modules/datum-ui/
└── form/                     # Renamed from new-form (only form system)
```

```tsx
// All forms use single import
import { Form } from '@datum-ui/form';
```

---

## Dependencies

### External (npm packages)

| Package                       | Version  | Purpose               |
| ----------------------------- | -------- | --------------------- |
| `@conform-to/react`           | ^1.10.1  | Form state management |
| `@conform-to/zod`             | ^1.10.1  | Zod integration       |
| `zod`                         | ^4.1.11  | Schema validation     |
| `@radix-ui/react-checkbox`    | existing | Checkbox primitive    |
| `@radix-ui/react-select`      | existing | Select primitive      |
| `@radix-ui/react-switch`      | existing | Switch primitive      |
| `@radix-ui/react-radio-group` | existing | Radio group primitive |
| `@radix-ui/react-label`       | existing | Label primitive       |
| `clsx`                        | existing | Class string builder  |
| `tailwind-merge`              | existing | Tailwind class merger |

### Internal (shared utilities)

| Import | Source              | Purpose           |
| ------ | ------------------- | ----------------- |
| `cn`   | `@shadcn/lib/utils` | Class name merger |

### Duplicated (from existing form components)

| Component  | Source                                      | Destination                           |
| ---------- | ------------------------------------------- | ------------------------------------- |
| Input      | `@datum-ui/components/form/input.tsx`       | `new-form/primitives/input.tsx`       |
| Textarea   | `@datum-ui/components/form/textarea.tsx`    | `new-form/primitives/textarea.tsx`    |
| Select     | `@datum-ui/components/form/select.tsx`      | `new-form/primitives/select.tsx`      |
| Checkbox   | `@datum-ui/components/form/checkbox.tsx`    | `new-form/primitives/checkbox.tsx`    |
| Switch     | `@datum-ui/components/form/switch.tsx`      | `new-form/primitives/switch.tsx`      |
| RadioGroup | `@datum-ui/components/form/radio-group.tsx` | `new-form/primitives/radio-group.tsx` |
| Label      | `@datum-ui/components/form/label.tsx`       | `new-form/primitives/label.tsx`       |

---

## Example: Complete Form Comparison

### Before (Current Implementation)

```tsx
import { Field } from '@/components/field/field';
import { FormProvider, getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button } from '@datum-ui/components';
import { Input } from '@datum-ui/components';
import { Form } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'user', 'viewer']),
});

export function UserForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, fields] = useForm({
    id: 'user-form',
    constraint: getZodConstraint(userSchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: userSchema });
    },
    async onSubmit(event, { submission }) {
      event.preventDefault();
      if (submission?.status === 'success') {
        await saveUser(submission.value);
        onSuccess();
      }
    },
  });

  return (
    <FormProvider context={form.context}>
      <Form {...getFormProps(form)} method="POST">
        <AuthenticityTokenInput />

        <Field isRequired label="Name" errors={fields.name.errors}>
          <Input {...getInputProps(fields.name, { type: 'text' })} placeholder="John Doe" />
        </Field>

        <Field isRequired label="Email" errors={fields.email.errors}>
          <Input
            {...getInputProps(fields.email, { type: 'email' })}
            placeholder="john@example.com"
          />
        </Field>

        <Field isRequired label="Role" errors={fields.role.errors}>
          <select {...getInputProps(fields.role)}>
            <option value="">Select role</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
            <option value="viewer">Viewer</option>
          </select>
        </Field>

        <Button htmlType="submit">Create User</Button>
      </Form>
    </FormProvider>
  );
}
```

### After (New Implementation)

```tsx
import { Form } from '@datum-ui/new-form';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'user', 'viewer']),
});

export function UserForm({ onSuccess }: { onSuccess: () => void }) {
  return (
    <Form.Root
      schema={userSchema}
      onSubmit={async (data) => {
        await saveUser(data);
        onSuccess();
      }}>
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

**Lines of code: 55 → 28 (49% reduction)**
**Boilerplate: 25 lines → 0 lines**

---

## Appendix: Supported Patterns

| Pattern            | Component                        | Status  |
| ------------------ | -------------------------------- | ------- |
| Simple form        | `Form.Root` + `Form.Field`       | Planned |
| Nested objects     | `Form.Field name="address.city"` | Planned |
| Array fields       | `Form.FieldArray`                | Planned |
| Conditional fields | `Form.When`                      | Planned |
| Multi-step forms   | `Form.Stepper`                   | Planned |
| Custom components  | `Form.Custom` + hooks            | Planned |
| Server actions     | `Form.Root action="/api/..."`    | Planned |
| Client submission  | `Form.Root onSubmit={...}`       | Planned |
| Loading states     | `Form.Submit` auto-loading       | Planned |
| Error display      | `Form.Field` auto-errors         | Planned |
| Accessibility      | Built-in ARIA                    | Planned |
