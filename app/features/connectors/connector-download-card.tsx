import { OsIcon } from '@/components/icon/os-icon';
import { DATUM_DESKTOP_DOWNLOAD_URL } from '@/utils/config/query.config';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { CloseIcon } from '@datum-cloud/datum-ui/icons';
import { DownloadIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Detect OS from browser for download CTA (client-only). */
function detectBrowserOs(): 'windows' | 'macos' | 'linux' | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent.toLowerCase();
  const platform = (
    navigator as { userAgentData?: { platform: string } }
  ).userAgentData?.platform?.toLowerCase();
  // Skip mobile platforms — no connector binary available
  if (platform === 'android' || ua.includes('android')) return null;
  if (/iphone|ipad|ipod/.test(ua)) return null;
  if (platform === 'macos' || ua.includes('mac')) return 'macos';
  if (platform === 'windows' || ua.includes('win')) return 'windows';
  if (platform === 'linux' || ua.includes('linux')) return 'linux';
  return null;
}

const OS_PATH: Record<string, string> = {
  macos: 'mac-os',
  windows: 'windows',
  linux: 'linux',
};

const OS_LABELS: Record<string, string> = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

type ConnectorDownloadCardProps = {
  onDismiss?: () => void;
};

export function ConnectorDownloadCard({ onDismiss }: ConnectorDownloadCardProps) {
  const [os, setOs] = useState<'windows' | 'macos' | 'linux' | null>(null);

  useEffect(() => {
    setOs(detectBrowserOs());
  }, []);

  if (!os) return null;

  const osLabel = OS_LABELS[os] ?? os;
  const downloadUrl = `${DATUM_DESKTOP_DOWNLOAD_URL}/${OS_PATH[os] ?? os}`;

  return (
    <Card
      className="relative w-full max-w-sm shrink-0 overflow-hidden rounded-xl border p-3 px-3 shadow-sm"
      role="region"
      aria-label="Download connector">
      {onDismiss && (
        <Button
          type="quaternary"
          theme="link"
          size="icon"
          className="absolute top-2 right-2 size-[23px]"
          onClick={onDismiss}
          aria-label="Dismiss connector download card">
          <CloseIcon />
        </Button>
      )}
      <CardContent className="p-0">
        <div className="flex gap-3">
          <div className="bg-muted dark:bg-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <OsIcon os={os} size={24} className="text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Start a connector</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Download Datum Desktop for <strong>{osLabel}</strong> to run a connector on this
              device.
            </p>
            <LinkButton
              type="primary"
              theme="solid"
              size="xs"
              className="mt-2"
              icon={<DownloadIcon className="size-3.5" />}
              href={downloadUrl}
              target="_blank">
              Download for {osLabel}
            </LinkButton>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
