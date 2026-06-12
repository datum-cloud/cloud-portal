import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { toast } from '@datum-cloud/datum-ui/toast';
import { cn } from '@datum-cloud/datum-ui/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
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
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[#0d1117] px-4 py-3">
      <span className={cn('font-mono text-sm', danger ? 'text-red-400' : 'text-gray-200')}>
        <span className="mr-2 text-gray-500">$</span>
        {value}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 text-gray-500 transition-colors hover:text-gray-300">
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
