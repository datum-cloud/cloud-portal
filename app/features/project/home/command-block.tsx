import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Check, Copy } from 'lucide-react';

/**
 * A shell command to copy and paste. Continuation lines (`\` then an indented
 * line) are joined on copy, so the pasted command runs as one line anywhere.
 */
export function CommandBlock({ command }: { command: string }) {
  const [copied, copy] = useCopyToClipboard();
  return (
    <span className="bg-muted text-foreground relative block rounded-lg">
      <pre className="overflow-x-auto px-4 py-3 pr-12 font-mono text-xs leading-relaxed">
        <span className="text-muted-foreground select-none">$ </span>
        {command}
      </pre>
      <Button
        type="quaternary"
        theme="borderless"
        size="xs"
        aria-label="Copy command"
        className="absolute top-2 right-2"
        onClick={() => copy(command.replace(/\\\n\s+/g, ''), { withToast: true })}>
        <Icon icon={copied ? Check : Copy} size={13} />
      </Button>
    </span>
  );
}
