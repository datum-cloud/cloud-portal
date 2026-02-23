import { useFieldContext } from '../context/field-context';
import { Autocomplete } from '../primitives/autocomplete';
import type { AutocompleteOption } from '../primitives/autocomplete.types';
import type { FormAutocompleteProps } from '../primitives/autocomplete.types';
import { useInputControl } from '@conform-to/react';
import { cn } from '@shadcn/lib/utils';

/**
 * Form.Autocomplete - Searchable select component
 *
 * Automatically wired to the parent Form.Field context.
 * Supports flat/grouped options, virtualization, custom rendering, and async search.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field name="timezone" label="Timezone" required>
 *   <Form.Autocomplete
 *     options={timezones}
 *     placeholder="Select timezone..."
 *   />
 * </Form.Field>
 * ```
 *
 * @example Async search
 * ```tsx
 * <Form.Field name="userId" label="User">
 *   <Form.Autocomplete
 *     options={users ?? []}
 *     onSearchChange={setSearch}
 *     loading={isLoading}
 *     placeholder="Search users..."
 *   />
 * </Form.Field>
 * ```
 *
 * @example Grouped options
 * ```tsx
 * <Form.Field name="role" label="Role" required>
 *   <Form.Autocomplete
 *     options={roleGroups}
 *     placeholder="Select a role..."
 *   />
 * </Form.Field>
 * ```
 */
export function FormAutocomplete<T extends AutocompleteOption = AutocompleteOption>({
  disabled,
  className,
  ...props
}: FormAutocompleteProps<T>) {
  const { fieldMeta, disabled: fieldDisabled, errors } = useFieldContext();
  const control = useInputControl(fieldMeta as any);

  const isDisabled = disabled ?? fieldDisabled;
  const hasErrors = errors && errors.length > 0;

  // Ensure value is always a string
  const selectValue = Array.isArray(control.value) ? control.value[0] : control.value;

  return (
    <Autocomplete<T>
      {...props}
      name={fieldMeta.name}
      id={fieldMeta.id}
      value={selectValue ?? ''}
      onValueChange={control.change}
      disabled={isDisabled}
      triggerClassName={cn(hasErrors && 'border-destructive', props.triggerClassName)}
      className={className}
    />
  );
}

FormAutocomplete.displayName = 'Form.Autocomplete';
