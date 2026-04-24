import { KeyRevealPanel } from '@/features/machine-account/components/key-reveal-panel';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import type { CreateMachineAccountKeyResponse } from '@/resources/machine-accounts';
import { env } from '@/utils/env';
import { Button } from '@datum-cloud/datum-ui/button';
import { CheckCircleIcon, CopyIcon, CheckIcon } from 'lucide-react';
import { useState } from 'react';

export interface WizardStepRevealProps {
  keyResponse: CreateMachineAccountKeyResponse;
  machineAccountName: string;
  identityEmail: string;
  projectId: string;
  onDone: () => void;
}

interface CopyFieldProps {
  label: string;
  value: string;
}

function CopyField({ label, value }: CopyFieldProps) {
  const [, copyToClipboard] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    copyToClipboard(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="bg-muted flex items-center gap-2 rounded-md px-3 py-2">
        <code className="flex-1 truncate font-mono text-xs">{value}</code>
        <button
          type="button"
          aria-label={copied ? 'Copied' : `Copy ${label}`}
          onClick={handleCopy}
          className="focus-visible:ring-ring shrink-0 rounded p-0.5 transition-colors hover:bg-black/10 focus-visible:ring-2 focus-visible:outline-none">
          {copied ? (
            <CheckIcon className="text-success size-3.5" />
          ) : (
            <CopyIcon className="text-muted-foreground size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export function WizardStepReveal({
  keyResponse,
  machineAccountName,
  identityEmail,
  projectId,
  onDone,
}: WizardStepRevealProps) {
  if (keyResponse.credentials) {
    return (
      <KeyRevealPanel
        credentials={keyResponse.credentials}
        machineAccountName={machineAccountName}
        defaultTab="datumctl"
        onDismiss={onDone}
      />
    );
  }

  // User-managed key: the server never saw the private key, but we still need
  // to surface the non-secret fields so the user can configure their JWT assertions.
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <CheckCircleIcon className="text-success mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-foreground text-sm font-semibold">Key registered successfully.</p>
          <p className="text-muted-foreground text-xs">
            Use the values below to configure your JWT assertions. Your private key stays with you —
            Datum only stores the public key.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <CopyField label="Identity email (iss / sub claim)" value={identityEmail} />
        <CopyField label="Key ID (kid header)" value={keyResponse.key.keyId} />
        <CopyField
          label="Token URI (aud claim)"
          value={`${env.public.authOidcIssuer}/oauth/v2/token`}
        />
        <CopyField label="API endpoint" value={env.public.apiUrl} />
        <CopyField label="Project ID" value={projectId} />
      </div>

      <p className="text-muted-foreground text-xs">
        Sign a JWT with your private key using these claims, then exchange it at the token URI for
        an access token. See{' '}
        <a
          href="https://docs.datum.net/authentication"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline-offset-4 hover:underline">
          docs.datum.net/authentication
        </a>{' '}
        for SDK examples.
      </p>

      <div className="flex justify-end">
        <Button htmlType="button" type="primary" theme="solid" onClick={onDone}>
          Go to Keys Tab
        </Button>
      </div>
    </div>
  );
}
