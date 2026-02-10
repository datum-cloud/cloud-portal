import * as React from 'react';

// ============================================================================
// Option Types
// ============================================================================

export interface AutocompleteOption {
  /** Unique identifier, submitted to form */
  value: string;
  /** Display text, used for built-in search filtering */
  label: string;
  /** Optional secondary text shown below label */
  description?: string;
  /** Disable selection of this option */
  disabled?: boolean;
}

export interface AutocompleteGroup<T extends AutocompleteOption = AutocompleteOption> {
  /** Group heading label */
  label: string;
  /** Options within this group */
  options: T[];
}

// ============================================================================
// Primitive Props
// ============================================================================

export interface AutocompleteProps<T extends AutocompleteOption = AutocompleteOption> {
  // Data
  /** Flat options array or grouped options. Groups auto-detected by shape. */
  options: T[] | AutocompleteGroup<T>[];

  // Controlled value
  /** Currently selected option value */
  value?: string;
  /** Called when selection changes */
  onValueChange?: (value: string) => void;

  // Search
  /** When provided, disables built-in filtering and delegates to consumer. */
  onSearchChange?: (value: string) => void;
  /** Placeholder for the search input */
  searchPlaceholder?: string;
  /** Hide the search input entirely */
  disableSearch?: boolean;

  // Rendering
  /** Custom render for each option in the dropdown */
  renderOption?: (option: T, isSelected: boolean) => React.ReactNode;
  /** Custom render for the selected value in the trigger */
  renderValue?: (option: T) => React.ReactNode;
  /** Placeholder text when no value selected */
  placeholder?: string;
  /** Content shown when no options match */
  emptyContent?: React.ReactNode;
  /** Footer content below options list (e.g., "Add new..." action) */
  footer?: React.ReactNode;

  // Behavior
  /** Enable virtualization for large lists (default: false) */
  virtualize?: boolean;
  /** Item height in pixels for virtualizer estimateSize (default: 36) */
  itemSize?: number;
  /** External loading state */
  loading?: boolean;

  // State
  /** Disable the component */
  disabled?: boolean;
  /** HTML name attribute for hidden input */
  name?: string;
  /** HTML id attribute */
  id?: string;

  // Styling
  /** Additional CSS classes for the root wrapper */
  className?: string;
  /** Additional CSS classes for the trigger button */
  triggerClassName?: string;
  /** Additional CSS classes for the popover content */
  contentClassName?: string;
  /** Additional CSS classes for the command list */
  listClassName?: string;
}

// ============================================================================
// Form Component Props
// ============================================================================

/**
 * Props for Form.Autocomplete - same as the primitive but without
 * value/onValueChange/name/id which come from FieldContext + useInputControl.
 */
export type FormAutocompleteProps<T extends AutocompleteOption = AutocompleteOption> = Omit<
  AutocompleteProps<T>,
  'value' | 'onValueChange' | 'name' | 'id'
>;
