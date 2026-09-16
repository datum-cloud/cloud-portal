import { usePwaInstall } from '@/hooks/usePwaInstall';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Plus, SquareArrowOutUpRight } from 'lucide-react';

interface PwaInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PwaInstallDialog = ({ open, onOpenChange }: PwaInstallDialogProps) => {
  const { canPromptInstall, promptInstall, isInstalled, os, browser } = usePwaInstall();
  const onClose = () => onOpenChange(false);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="w-full sm:max-w-md">
        <Dialog.Header className="mb-0 border-b" title="Install Datum Cloud" onClose={onClose} />
        <Dialog.Body className="mb-0 px-5 py-4">
          <InstallInstructions
            canPromptInstall={canPromptInstall}
            isInstalled={isInstalled}
            os={os}
            browser={browser}
          />
        </Dialog.Body>
        <Dialog.Footer className="border-t">
          {canPromptInstall ? (
            <>
              <Button htmlType="button" type="quaternary" theme="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                htmlType="button"
                type="primary"
                theme="solid"
                onClick={() => void handleInstall()}>
                Install
              </Button>
            </>
          ) : (
            <Button htmlType="button" type="primary" theme="solid" onClick={onClose}>
              Got it
            </Button>
          )}
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
};

function InstallInstructions({
  canPromptInstall,
  isInstalled,
  os,
  browser,
}: {
  canPromptInstall: boolean;
  isInstalled: boolean;
  os: ReturnType<typeof usePwaInstall>['os'];
  browser: ReturnType<typeof usePwaInstall>['browser'];
}) {
  if (canPromptInstall) {
    return (
      <p className="text-foreground text-sm">
        Install Datum Cloud on this device to open it in its own window.
      </p>
    );
  }

  if (os === 'ios') {
    if (browser !== 'safari') {
      return (
        <p className="text-foreground text-sm">
          Open this page in Safari to add Datum Cloud to your Home Screen. Third-party browsers on
          iOS can&apos;t install web apps.
        </p>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        <p className="text-foreground text-sm">
          Add Datum Cloud to your Home Screen to use it as an app:
        </p>
        <ol className="text-foreground flex flex-col gap-3 text-sm">
          <li className="flex items-start gap-3">
            <StepIndex n={1} />
            <span>
              Tap{' '}
              <span className="inline-flex items-center gap-1 font-medium">
                Share
                <Icon icon={SquareArrowOutUpRight} size={14} />
              </span>{' '}
              in Safari&apos;s toolbar.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <StepIndex n={2} />
            <span>
              Scroll and tap{' '}
              <span className="inline-flex items-center gap-1 font-medium">
                Add to Home Screen
                <Icon icon={Plus} size={14} />
              </span>
              .
            </span>
          </li>
          <li className="flex items-start gap-3">
            <StepIndex n={3} />
            <span>
              Leave <span className="font-medium">Open as Web App</span> on, then tap{' '}
              <span className="font-medium">Add</span>.
            </span>
          </li>
        </ol>
      </div>
    );
  }

  if (os === 'macos' && browser === 'safari') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-foreground text-sm">Add Datum Cloud to your Dock from Safari:</p>
        <ol className="text-foreground flex flex-col gap-3 text-sm">
          <li className="flex items-start gap-3">
            <StepIndex n={1} />
            <span>
              In the menu bar, choose <span className="font-medium">File → Add to Dock</span>.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <StepIndex n={2} />
            <span>Datum Cloud appears in your Dock and launches in its own window.</span>
          </li>
        </ol>
      </div>
    );
  }

  if (browser === 'firefox') {
    return (
      <p className="text-foreground text-sm">
        Firefox doesn&apos;t support installing Datum Cloud as an app. Try Chrome, Edge, or Safari.
      </p>
    );
  }

  if (os === 'android') {
    return (
      <p className="text-foreground text-sm">
        Open the browser menu and choose <span className="font-medium">Install app</span> or{' '}
        <span className="font-medium">Add to Home screen</span>.
      </p>
    );
  }

  if (browser === 'chrome' || browser === 'edge') {
    if (isInstalled) {
      return (
        <p className="text-foreground text-sm">
          Datum Cloud is already installed. Click <span className="font-medium">Open in app</span>{' '}
          in the address bar, or launch it from your Dock.
        </p>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        <p className="text-foreground text-sm">
          Install Datum Cloud from this browser to open it in its own window:
        </p>
        <ol className="text-foreground flex flex-col gap-3 text-sm">
          <li className="flex items-start gap-3">
            <StepIndex n={1} />
            <span>
              Click the <span className="font-medium">install icon</span> in the address bar, or{' '}
              <span className="font-medium">Open in app</span> if it is already installed.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <StepIndex n={2} />
            <span>
              You can also use the browser menu and choose{' '}
              <span className="font-medium">Install Datum Cloud</span>.
            </span>
          </li>
        </ol>
      </div>
    );
  }

  return (
    <p className="text-foreground text-sm">
      Use Chrome, Edge, or Safari to install Datum Cloud as an app on this device.
    </p>
  );
}

function StepIndex({ n }: { n: number }) {
  return (
    <span className="bg-muted text-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium">
      {n}
    </span>
  );
}
