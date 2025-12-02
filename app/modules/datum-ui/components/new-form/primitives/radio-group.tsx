import { cn } from '@shadcn/lib/utils';
import {
  RadioGroup as ShadcnRadioGroup,
  RadioGroupItem as ShadcnRadioGroupItem,
} from '@shadcn/ui/radio-group';
import * as React from 'react';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof ShadcnRadioGroup>,
  React.ComponentProps<typeof ShadcnRadioGroup>
>(({ className, ...props }, ref) => {
  return <ShadcnRadioGroup ref={ref} className={cn(className)} {...props} />;
});

RadioGroup.displayName = 'RadioGroup';

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof ShadcnRadioGroupItem>,
  React.ComponentProps<typeof ShadcnRadioGroupItem>
>(({ className, ...props }, ref) => {
  return <ShadcnRadioGroupItem ref={ref} className={cn(className)} {...props} />;
});

RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };
