import { OsIcon } from '@/components/icon/os-icon';
import { useOs } from '@/hooks/useOs';
import { DATUM_DESKTOP_DOWNLOAD_URL } from '@/utils/config/query.config';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { CloseIcon } from '@datum-cloud/datum-ui/icons';
import { DownloadIcon } from 'lucide-react';

type DesktopOs = 'windows' | 'macos' | 'linux';
const DESKTOP_OS = new Set<DesktopOs>(['windows', 'macos', 'linux']);

const OS_PATH: Record<DesktopOs, string> = {
  macos: 'mac-os',
  windows: 'windows',
  linux: 'linux',
};

const OS_LABELS: Record<DesktopOs, string> = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

type ConnectorDownloadCardProps = {
  onDismiss?: () => void;
};

export function ConnectorDownloadCard({ onDismiss }: ConnectorDownloadCardProps) {
  const detected = useOs();

  // No connector binary for mobile or undetermined platforms. The
  // 'undetermined' guard also covers SSR + first-client-render, where
  // useOs hasn't resolved yet.
  if (!DESKTOP_OS.has(detected as DesktopOs)) return null;
  const os = detected as DesktopOs;

  const osLabel = OS_LABELS[os];
  const downloadUrl = `${DATUM_DESKTOP_DOWNLOAD_URL}/${OS_PATH[os]}`;

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
