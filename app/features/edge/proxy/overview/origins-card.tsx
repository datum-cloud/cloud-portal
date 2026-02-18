import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { type HttpProxy } from '@/resources/http-proxies';
import { Button, Card, CardContent, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { CopyIcon, PencilIcon, ServerIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

export const HttpProxyOriginsCard = ({
  proxy,
  onEdit,
}: {
  proxy?: HttpProxy;
  onEdit?: () => void;
}) => {
  const [_, copy] = useCopyToClipboard();
  const [copiedText, setCopiedText] = useState('');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;

    copy(value).then(() => {
      setCopiedText(value);
      toast.success('Copied to clipboard');
      setCopied(true);
      setTimeout(() => {
        setCopiedText('');
        setCopied(false);
      }, 2000);
    });
  };

  const origins = useMemo(() => {
    // Use origins array if available (contains all backends)
    if (proxy?.origins && proxy.origins.length > 0) {
      return proxy.origins;
    }
    // Fallback to single endpoint for backward compatibility
    if (proxy?.endpoint) {
      return [proxy.endpoint];
    }
    return [];
  }, [proxy]);

  return (
    <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
      <CardContent className="flex flex-col gap-5 p-0 sm:px-6 sm:pb-4">
        <div className="flex items-center gap-2.5">
          <Icon icon={ServerIcon} size={20} className="text-secondary stroke-2" />
          <span className="text-base font-semibold">Origins</span>
          {onEdit && (
            <Button type="primary" theme="solid" size="xs" className="ml-auto" onClick={onEdit}>
              <Icon icon={PencilIcon} size={12} />
              Edit origins
            </Button>
          )}
        </div>
        {origins.length > 0 ? (
          <div className="flex flex-col gap-4">
            {origins.map((origin, index) => {
              return (
                <div
                  key={`${origin}-${index}`}
                  className="border-input bg-background flex items-center justify-between gap-4 rounded-md border p-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium wrap-break-word">{origin}</span>
                  </div>
                  <Button
                    type="quaternary"
                    theme="outline"
                    size="small"
                    className="h-8 shrink-0"
                    onClick={() => copyToClipboard(origin)}>
                    <Icon icon={CopyIcon} className="size-4" />
                    {copied && copiedText === origin ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">No origins configured</div>
        )}
      </CardContent>
    </Card>
  );
};
