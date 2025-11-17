import { Field } from '@/components/field/field';
import { MultiSelect } from '@/components/multi-select/multi-select';
import { SelectBox } from '@/components/select-box/select-box';
import {
  Button,
  Checkbox,
  Input,
  InputWithAddons,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  TagsInput,
  Textarea,
} from '@datum-ui/components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@datum-ui/components';
import { Globe, Mail, Search } from 'lucide-react';
import { useState } from 'react';

export const formFieldsDemoSections = [
  { id: 'input-fields', label: 'Input Fields' },
  { id: 'input-with-addons-field', label: 'Input with Addons' },
  { id: 'select-box-field', label: 'Select Box' },
  { id: 'multi-select-field', label: 'Multi Select' },
  { id: 'tag-input-field', label: 'Tag Input' },
  { id: 'textarea-field', label: 'Textarea' },
  { id: 'checkbox-field', label: 'Checkbox' },
  { id: 'switch-field', label: 'Switch' },
  { id: 'radio-group-field', label: 'Radio Group' },
  { id: 'select-field', label: 'Select' },
  { id: 'form-with-fields', label: 'Complete Form Example' },
  { id: 'disabled-states', label: 'Disabled States' },
  { id: 'error-states', label: 'Error States' },
];

export default function FormFieldsDemo() {
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(false);
  const [radioValue, setRadioValue] = useState('option1');
  const [selectValue, setSelectValue] = useState('');
  const [selectBoxValue, setSelectBoxValue] = useState<string | undefined>('owner');
  const [multiSelectValues, setMultiSelectValues] = useState<string[]>(['grafana']);
  const [tagValues, setTagValues] = useState<string[]>(['alpha', 'beta']);
  const [limitedTagValues, setLimitedTagValues] = useState<string[]>(['grafana']);
  const [limitedMultiSelectValues, setLimitedMultiSelectValues] = useState<string[]>([
    'prod',
    'staging',
  ]);

  return (
    <div className="space-y-8 p-6">
      {/* Input Fields */}
      <Card id="input-fields">
        <CardHeader>
          <CardTitle>Input Fields</CardTitle>
          <CardDescription>Text input fields with various types and states</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Field label="Text Input" description="Standard text input field">
              <Input
                type="text"
                placeholder="Enter text..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </Field>

            <Field label="Email Input" description="Email input with validation">
              <Input type="email" placeholder="name@example.com" />
            </Field>

            <Field label="Password Input" description="Password input with hidden text">
              <Input type="password" placeholder="Enter password" />
            </Field>

            <Field label="Number Input" description="Numeric input field">
              <Input type="number" placeholder="Enter number" />
            </Field>

            <Field label="Read-only Input" description="Input field in read-only state">
              <Input type="text" value="Read-only value" readOnly />
            </Field>

            <Field label="Input with Custom Class" description="Input with additional styling">
              <Input
                type="text"
                placeholder="Custom styled input"
                className="border-primary/50 focus-visible:ring-primary/30"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Multi Select */}
      <Card id="multi-select-field">
        <CardHeader>
          <CardTitle>Multi Select</CardTitle>
          <CardDescription>Select multiple items with badges and quick actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field label="Services" description="Pick multiple observability tools">
            <MultiSelect
              options={[
                { value: 'grafana', label: 'Grafana' },
                { value: 'prometheus', label: 'Prometheus' },
                { value: 'tempo', label: 'Tempo' },
                { value: 'loki', label: 'Loki' },
                { value: 'jaeger', label: 'Jaeger' },
              ]}
              placeholder="Select services..."
              value={multiSelectValues}
              onValueChange={setMultiSelectValues}
              showClearButton
              showCloseButton
              className="border-input-border bg-input-background/50"
            />
          </Field>

          <Field
            label="Limited Multi Select"
            description="Restrict the number of items and show loading state">
            <MultiSelect
              options={[
                { value: 'prod', label: 'Production' },
                { value: 'staging', label: 'Staging' },
                { value: 'dev', label: 'Development' },
              ]}
              placeholder="Select environments..."
              value={limitedMultiSelectValues}
              onValueChange={setLimitedMultiSelectValues}
              maxCount={2}
              showSelectAll
              isLoading={false}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Select Box */}
      <Card id="select-box-field">
        <CardHeader>
          <CardTitle>Select Box</CardTitle>
          <CardDescription>Custom select built on Command and Popover</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field label="Flat Select Box" description="Single level select">
            <SelectBox
              value={selectBoxValue}
              onChange={(option) => setSelectBoxValue(option?.value)}
              placeholder="Select a role"
              options={[
                { value: 'owner', label: 'Owner', description: 'Full access to workspace' },
                { value: 'editor', label: 'Editor', description: 'Can modify most resources' },
                { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
              ]}
            />
          </Field>

          <Field
            label="Grouped Select Box"
            description="Use groups to organize large sets of options">
            <SelectBox
              placeholder="Select a cluster"
              groups={[
                {
                  label: 'Production',
                  options: [
                    { value: 'prod-east', label: 'prod-east', description: 'US East cluster' },
                    { value: 'prod-eu', label: 'prod-eu', description: 'EU cluster' },
                  ],
                },
                {
                  label: 'Staging',
                  options: [
                    { value: 'staging-apac', label: 'staging-apac', description: 'APAC staging' },
                  ],
                },
              ]}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Tag Input */}
      <Card id="tag-input-field">
        <CardHeader>
          <CardTitle>Tag Input</CardTitle>
          <CardDescription>Create tokenized inputs for lists and metadata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field label="Project Tags" description="Type and press enter to add a tag">
            <TagsInput value={tagValues} onValueChange={setTagValues} placeholder="Add a tag..." />
          </Field>

          <Field
            label="Limited Tag Input"
            description="Restrict the number of items and show validation feedback">
            <TagsInput
              value={limitedTagValues}
              onValueChange={setLimitedTagValues}
              placeholder="Add up to 4 endpoints"
              maxItems={4}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Input With Addons */}
      <Card id="input-with-addons-field">
        <CardHeader>
          <CardTitle>Input with Addons</CardTitle>
          <CardDescription>Use leading and trailing content for structured inputs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field
            label="URL Input"
            description="Combine protocol or domain hints with the text field for clarity">
            <InputWithAddons
              leading={<span className="text-muted-foreground text-sm">https://</span>}
              placeholder="my-service.datum.cloud"
            />
          </Field>

          <Field
            label="Search"
            description="Pair icons and keyboard hints for actionable search experiences">
            <InputWithAddons
              leading={<Search className="text-muted-foreground size-4" />}
              trailing={<span className="text-muted-foreground text-xs">⌘ K</span>}
              placeholder="Search clusters, policies, projects..."
            />
          </Field>

          <Field label="Email Capture" description="Add buttons or badges as trailing content">
            <InputWithAddons
              type="email"
              placeholder="you@example.com"
              leading={<Mail className="text-muted-foreground size-4" />}
              trailing={
                <Button size="small" type="primary" theme="solid" className="h-7 px-3 text-xs">
                  Subscribe
                </Button>
              }
            />
          </Field>

          <Field label="Currency Input" description="Display currency context inline">
            <InputWithAddons
              type="number"
              placeholder="0.00"
              leading={<span className="text-muted-foreground text-sm">$</span>}
              trailing={
                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Globe className="size-3.5" />
                  USD
                </div>
              }
            />
          </Field>
        </CardContent>
      </Card>

      {/* Textarea */}
      <Card id="textarea-field">
        <CardHeader>
          <CardTitle>Textarea</CardTitle>
          <CardDescription>Multi-line text input for longer content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Description"
            description="Enter a detailed description"
            errors={
              textareaValue.length > 0 && textareaValue.length < 10
                ? ['Minimum 10 characters required']
                : undefined
            }>
            <Textarea
              placeholder="Enter description..."
              value={textareaValue}
              onChange={(e) => setTextareaValue(e.target.value)}
              rows={4}
            />
          </Field>

          <Field label="Read-only Textarea" description="Textarea in read-only state">
            <Textarea
              value="This is a read-only textarea with some content that cannot be edited."
              readOnly
              rows={3}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Checkbox */}
      <Card id="checkbox-field">
        <CardHeader>
          <CardTitle>Checkbox</CardTitle>
          <CardDescription>Checkbox input for binary choices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="checkbox1"
                checked={checkboxChecked}
                onCheckedChange={(checked) => setCheckboxChecked(checked === true)}
              />
              <Label htmlFor="checkbox1" className="cursor-pointer">
                Accept terms and conditions
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="checkbox2" defaultChecked />
              <Label htmlFor="checkbox2" className="cursor-pointer">
                Subscribe to newsletter (default checked)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="checkbox3" disabled />
              <Label htmlFor="checkbox3" className="text-muted-foreground cursor-pointer">
                Disabled checkbox
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="checkbox4" checked disabled />
              <Label htmlFor="checkbox4" className="text-muted-foreground cursor-pointer">
                Disabled checked checkbox
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Switch */}
      <Card id="switch-field">
        <CardHeader>
          <CardTitle>Switch</CardTitle>
          <CardDescription>Toggle switch for on/off states</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="switch1">Enable notifications</Label>
                <p className="text-muted-foreground text-sm">
                  {switchChecked ? 'Notifications are enabled' : 'Notifications are disabled'}
                </p>
              </div>
              <Switch
                id="switch1"
                checked={switchChecked}
                onCheckedChange={(checked) => setSwitchChecked(checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="switch2">Dark mode</Label>
                <p className="text-muted-foreground text-sm">Toggle dark mode theme</p>
              </div>
              <Switch id="switch2" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="switch3" className="text-muted-foreground">
                  Disabled switch
                </Label>
                <p className="text-muted-foreground text-sm">This switch cannot be toggled</p>
              </div>
              <Switch id="switch3" disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="switch4" className="text-muted-foreground">
                  Disabled checked
                </Label>
                <p className="text-muted-foreground text-sm">This switch is checked but disabled</p>
              </div>
              <Switch id="switch4" checked disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radio Group */}
      <Card id="radio-group-field">
        <CardHeader>
          <CardTitle>Radio Group</CardTitle>
          <CardDescription>
            Radio buttons for single selection from multiple options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field label="Select an option" description="Choose one option from the list">
            <RadioGroup value={radioValue} onValueChange={setRadioValue}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option1" id="option1" />
                <Label htmlFor="option1" className="cursor-pointer">
                  Option 1
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option2" id="option2" />
                <Label htmlFor="option2" className="cursor-pointer">
                  Option 2
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option3" id="option3" />
                <Label htmlFor="option3" className="cursor-pointer">
                  Option 3
                </Label>
              </div>
            </RadioGroup>
            <p className="text-muted-foreground mt-2 text-sm">Selected: {radioValue}</p>
          </Field>

          <Field label="Disabled Radio Group" description="Radio group with disabled options">
            <RadioGroup defaultValue="option1" disabled>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option1" id="disabled-option1" />
                <Label htmlFor="disabled-option1" className="text-muted-foreground cursor-pointer">
                  Disabled Option 1
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option2" id="disabled-option2" />
                <Label htmlFor="disabled-option2" className="text-muted-foreground cursor-pointer">
                  Disabled Option 2
                </Label>
              </div>
            </RadioGroup>
          </Field>
        </CardContent>
      </Card>

      {/* Select */}
      <Card id="select-field">
        <CardHeader>
          <CardTitle>Select</CardTitle>
          <CardDescription>Dropdown select for choosing from a list of options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field label="Select an option" description="Choose from the dropdown">
            <Select value={selectValue} onValueChange={setSelectValue}>
              <SelectTrigger>
                <SelectValue placeholder="Select an option..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
                <SelectItem value="option3">Option 3</SelectItem>
                <SelectItem value="option4">Option 4</SelectItem>
              </SelectContent>
            </Select>
            {selectValue && (
              <p className="text-muted-foreground mt-2 text-sm">Selected: {selectValue}</p>
            )}
          </Field>

          <Field label="Select with Groups" description="Select with grouped options">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fruit-apple">Apple</SelectItem>
                <SelectItem value="fruit-banana">Banana</SelectItem>
                <SelectItem value="fruit-orange">Orange</SelectItem>
                <SelectItem value="vegetable-carrot">Carrot</SelectItem>
                <SelectItem value="vegetable-broccoli">Broccoli</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Disabled Select" description="Select field in disabled state">
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Disabled select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {/* Complete Form Example */}
      <Card id="form-with-fields">
        <CardHeader>
          <CardTitle>Complete Form Example</CardTitle>
          <CardDescription>Example form using all field types together</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <Field label="Full Name" isRequired description="Enter your full name">
              <Input type="text" placeholder="John Doe" />
            </Field>

            <Field label="Email Address" isRequired description="Enter your email address">
              <Input type="email" placeholder="john@example.com" />
            </Field>

            <Field label="Bio" description="Tell us about yourself">
              <Textarea placeholder="Write a short bio..." rows={4} />
            </Field>

            <Field label="Country" description="Select your country">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select country..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                  <SelectItem value="ca">Canada</SelectItem>
                  <SelectItem value="au">Australia</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Newsletter Preference"
              description="How would you like to receive updates?">
              <RadioGroup defaultValue="email">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="newsletter-email" />
                  <Label htmlFor="newsletter-email" className="cursor-pointer">
                    Email
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sms" id="newsletter-sms" />
                  <Label htmlFor="newsletter-sms" className="cursor-pointer">
                    SMS
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="newsletter-none" />
                  <Label htmlFor="newsletter-none" className="cursor-pointer">
                    None
                  </Label>
                </div>
              </RadioGroup>
            </Field>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="terms" />
                <Label htmlFor="terms" className="cursor-pointer">
                  I agree to the terms and conditions
                </Label>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Enable push notifications</Label>
                  <p className="text-muted-foreground text-sm">
                    Receive notifications on your device
                  </p>
                </div>
                <Switch id="notifications" />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Disabled States */}
      <Card id="disabled-states">
        <CardHeader>
          <CardTitle>Disabled States</CardTitle>
          <CardDescription>All form fields support disabled state</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field label="Disabled Input">
            <Input type="text" placeholder="Disabled input" disabled />
          </Field>

          <Field label="Disabled Textarea">
            <Textarea placeholder="Disabled textarea" disabled rows={3} />
          </Field>

          <Field label="Disabled Select">
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Disabled select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="flex items-center space-x-2">
            <Checkbox id="disabled-checkbox" disabled />
            <Label htmlFor="disabled-checkbox" className="text-muted-foreground cursor-pointer">
              Disabled checkbox
            </Label>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="disabled-switch" className="text-muted-foreground">
              Disabled switch
            </Label>
            <Switch id="disabled-switch" disabled />
          </div>
        </CardContent>
      </Card>

      {/* Error States */}
      <Card id="error-states">
        <CardHeader>
          <CardTitle>Error States</CardTitle>
          <CardDescription>Form fields with error messages and validation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field
            label="Email"
            isRequired
            errors={['Please enter a valid email address']}
            description="This field has an error">
            <Input type="email" placeholder="invalid-email" className="border-destructive" />
          </Field>

          <Field
            label="Password"
            isRequired
            errors={['Password must be at least 8 characters', 'Password must contain a number']}
            description="Multiple validation errors">
            <Input type="password" placeholder="short" className="border-destructive" />
          </Field>

          <Field
            label="Description"
            errors={['Description is required']}
            description="Textarea with error state">
            <Textarea placeholder="Enter description..." rows={3} className="border-destructive" />
          </Field>

          <Field
            label="Select Option"
            isRequired
            errors={['Please select an option']}
            description="Select with error state">
            <Select>
              <SelectTrigger className="border-destructive">
                <SelectValue placeholder="Select an option..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}
