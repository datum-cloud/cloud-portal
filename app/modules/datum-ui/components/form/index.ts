/**
 * Datum Form Fields
 *
 * Form field components that extend shadcn/ui components with Datum-specific styling.
 * These components wrap shadcn components and allow for customization without
 * modifying the core shadcn components.
 *
 * @example
 * ```tsx
 * import { Input, Checkbox, Select } from '@datum-ui/components';
 *
 * <Input placeholder="Enter text..." />
 * <Checkbox checked={isChecked} onCheckedChange={setIsChecked} />
 * ```
 */

export { Input } from './input';
export { Textarea } from './textarea';
export { Label } from './label';
export { Checkbox } from './checkbox';
export { Switch } from './switch';
export { RadioGroup, RadioGroupItem } from './radio-group';
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';
