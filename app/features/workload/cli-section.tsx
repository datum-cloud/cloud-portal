import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { toast } from '@datum-cloud/datum-ui/toast';
import { cn } from '@datum-cloud/datum-ui/utils';
import { BookOpenIcon, CheckIcon, CopyIcon, DownloadIcon, SquareTerminalIcon } from 'lucide-react';
import { useState } from 'react';

export function CommandBlock({ value, danger }: { value: string; danger?: boolean }) {
  const [, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copy(value).then(() => {
      toast.success('Copied to clipboard');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-background flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <span className={cn('font-mono text-sm', danger ? 'text-red-500' : 'text-foreground')}>
        <span className="text-muted-foreground mr-2">$</span>
        {value}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="text-muted-foreground hover:text-foreground shrink-0 transition-colors">
        {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
      </button>
    </div>
  );
}

export function SectionCard({
  icon,
  title,
  description,
  commands,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  commands: string[];
  danger?: boolean;
}) {
  return (
    <Card
      className={cn('rounded-xl py-0 shadow-none', danger && 'border-red-200 dark:border-red-900')}>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <span className={cn('shrink-0', danger ? 'text-red-500' : 'text-foreground')}>
            {icon}
          </span>
          <h3 className={cn('font-semibold', danger && 'text-red-500')}>{title}</h3>
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
        <div className="flex flex-col gap-2">
          {commands.map((cmd) => (
            <CommandBlock key={cmd} value={cmd} danger={danger} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Banner pointing users at the datumctl CLI docs — shown wherever a resource is CLI-managed only. */
export function CliBanner({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-primary/5 border-primary/20 flex flex-wrap items-center gap-4 rounded-xl border p-4">
      <SquareTerminalIcon className="text-primary size-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-primary font-semibold">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="flex gap-2">
        <a
          href="https://docs.datum.net/cli/install"
          target="_blank"
          rel="noreferrer"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors">
          <DownloadIcon className="size-4" />
          Install CLI
        </a>
        <a
          href="https://docs.datum.net/cli"
          target="_blank"
          rel="noreferrer"
          className="border-border hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors">
          <BookOpenIcon className="size-4" />
          CLI Docs
        </a>
      </div>
    </div>
  );
}
