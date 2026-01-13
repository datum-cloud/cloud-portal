import { useFieldContext } from '../context/field-context';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useInputControl } from '@conform-to/react';
import { Button, toast } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
import * as React from 'react';

export interface FormCopyBoxProps {
  /** Display variant: 'default' shows Copy button, 'icon-only' shows icon */
  variant?: 'default' | 'icon-only';
  /** Custom className for the wrapper */
  className?: string;
  /** Custom className for the content area */
  contentClassName?: string;
  /** Custom className for the button */
  buttonClassName?: string;
  /** Placeholder text when value is empty */
  placeholder?: string;
}

/**
 * Form.CopyBox - Read-only field with copy-to-clipboard functionality
 *
 * Displays field value in a read-only box with a copy button.
 * Automatically gets value from Form.Field context.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field name="organizationId" label="Organization ID">
 *   <Form.CopyBox />
 * </Form.Field>
 * ```
 *
 * @example With icon-only button
 * ```tsx
 * <Form.Field name="apiKey" label="API Key">
 *   <Form.CopyBox variant="icon-only" />
 * </Form.Field>
 * ```
 *
 * @example With placeholder
 * ```tsx
 * <Form.Field name="webhookUrl" label="Webhook URL">
 *   <Form.CopyBox placeholder="Not configured" />
 * </Form.Field>
 * ```
 */
export function FormCopyBox({
  variant = 'default',
  className,
  contentClassName,
  buttonClassName,
  placeholder = '',
}: FormCopyBoxProps) {
  const { fieldMeta } = useFieldContext();
  // Cast to any to bypass TypeScript's strict checking for useInputControl
  // This is safe because fieldMeta comes from Conform and has the right shape
  const control = useInputControl(fieldMeta as any);
  const [_, copy] = useCopyToClipboard();
  const [copied, setCopied] = React.useState(false);

  // Get the reactive value from input control
  const value = control.value ?? placeholder;

  const copyToClipboard = () => {
    const stringValue = String(value);
    if (!stringValue) return;

    copy(stringValue).then(() => {
      toast.success('Copied to clipboard');
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  return (
    <div
      className={cn(
        'group border-input flex h-10 w-full overflow-hidden rounded-lg border bg-[#F6F6F580] text-xs focus-within:outline-hidden',
        className
      )}>
      <div
        className={cn(
          'flex w-full items-center overflow-hidden px-3 py-2 text-xs opacity-50',
          contentClassName
        )}>
        <span className="truncate">{String(value)}</span>
      </div>
      <div className="flex items-center py-2 pr-3">
        {variant === 'icon-only' ? (
          <button
            type="button"
            className={cn(
              'text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-sm transition-colors',
              buttonClassName
            )}
            onClick={copyToClipboard}>
            {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          </button>
        ) : (
          <Button
            type="quaternary"
            theme="outline"
            size="small"
            className={cn('h-7 w-fit gap-1 px-2 text-xs', buttonClassName)}
            onClick={copyToClipboard}>
            <CopyIcon className="size-3!" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
      </div>
    </div>
  );
}
