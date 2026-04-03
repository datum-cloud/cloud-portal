import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import type { DatumCredentialsFile } from '@/resources/machine-accounts';
import { Button, CloseIcon, Tabs, TabsContent, TabsList, TabsTrigger } from '@datum-ui/components';
import { CheckIcon, CopyIcon, DownloadIcon, ThumbsUpIcon } from 'lucide-react';
import { useRef, useState } from 'react';

export interface KeyRevealPanelProps {
  privateKey: string;
  userId: string;
  keyId: string;
  machineAccountName: string;
  identityEmail: string;
  projectId: string;
  onDismiss: () => void;
  defaultTab?: 'github' | 'kubernetes' | 'envvars';
}

function downloadCredentials(data: DatumCredentialsFile, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type TabId = 'github' | 'kubernetes' | 'envvars';

interface SnippetBlockProps {
  content: string;
  tabId: TabId;
  copiedTabId: TabId | null;
  onCopy: (tabId: TabId, content: string) => void;
}

function SnippetBlock({ content, tabId, copiedTabId, onCopy }: SnippetBlockProps) {
  const isCopied = copiedTabId === tabId;

  return (
    <div className="bg-muted relative rounded-md">
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed whitespace-pre">
        {content}
      </pre>
      <button
        type="button"
        aria-label={isCopied ? 'Copied' : 'Copy snippet'}
        className="focus-visible:ring-ring absolute top-2 right-2 rounded-md p-1.5 transition-colors hover:bg-black/10 focus-visible:ring-2 focus-visible:outline-none"
        onClick={() => onCopy(tabId, content)}>
        {isCopied ? (
          <CheckIcon className="text-success size-4" />
        ) : (
          <CopyIcon className="text-muted-foreground size-4" />
        )}
      </button>
    </div>
  );
}

export function KeyRevealPanel({
  privateKey,
  userId,
  keyId,
  machineAccountName,
  identityEmail,
  projectId,
  onDismiss,
  defaultTab,
}: KeyRevealPanelProps) {
  const [, copyToClipboard] = useCopyToClipboard();
  const [copiedTabId, setCopiedTabId] = useState<TabId | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const credentials: DatumCredentialsFile = {
    type: 'datum_machine_account',
    api_endpoint: 'https://api.datum.net',
    token_uri: 'https://auth.datum.net/oauth/v2/token',
    project_id: projectId,
    client_email: identityEmail,
    client_id: userId,
    private_key_id: keyId,
    private_key: privateKey,
  };

  const credentialsFilename = `${machineAccountName}-datum-credentials.json`;

  function handleCopy(tabId: TabId, content: string) {
    copyToClipboard(content, { withToast: true, toastMessage: 'Copied to clipboard' }).then(() => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      setCopiedTabId(tabId);
      copyTimeoutRef.current = setTimeout(() => setCopiedTabId(null), 2000);
    });
  }

  const githubSnippet = `# 1. Add your credentials file as a repository secret:
#    Settings → Secrets and variables → Actions → New repository secret
#    Name: DATUM_CREDENTIALS
#    Value: (paste the full contents of ${credentialsFilename})
#    Tip: copy the file contents with: cat ${credentialsFilename} | pbcopy

# 2. Write the secret to a temp file and exchange it for an access token:
steps:
  - name: Authenticate with Datum
    env:
      DATUM_CREDENTIALS: \${{ secrets.DATUM_CREDENTIALS }}
    run: |
      # Write credentials to a temp file (keeps newlines intact)
      echo "$DATUM_CREDENTIALS" > /tmp/datum-credentials.json

      # Use the Datum CLI or SDK to get an access token:
      #   datum auth login --credentials /tmp/datum-credentials.json
      #
      # Or exchange manually — see https://docs.datum.net/authentication
      # for JWT assertion generation and token exchange examples.`;

  const kubernetesSnippet = `# 1. Create the Secret (run once):
kubectl create secret generic datum-credentials \\
  --from-file=credentials.json=${credentialsFilename}

# 2. Mount in your Deployment/Pod:
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-service
spec:
  template:
    spec:
      containers:
        - name: app
          env:
            - name: DATUM_CREDENTIALS_FILE
              value: /var/run/secrets/datum/credentials.json
          volumeMounts:
            - name: datum-credentials
              mountPath: /var/run/secrets/datum
              readOnly: true
      volumes:
        - name: datum-credentials
          secret:
            secretName: datum-credentials

# 3. In your application, read DATUM_CREDENTIALS_FILE and use the
#    Datum SDK or JWT library to exchange credentials for an access token.
#    See https://docs.datum.net/authentication for SDK examples.`;

  const envvarsSnippet = `# Recommended: point to the downloaded credentials file
export DATUM_CREDENTIALS_FILE="/path/to/${credentialsFilename}"

# Individual variables (if you can't use the credentials file):
export DATUM_CLIENT_EMAIL="${identityEmail}"
export DATUM_CLIENT_ID="${userId}"
export DATUM_PRIVATE_KEY_ID="${keyId}"
export DATUM_TOKEN_URI="https://auth.datum.net/oauth/v2/token"
export DATUM_API_ENDPOINT="https://api.datum.net"
# Note: DATUM_PRIVATE_KEY contains newlines — use the credentials file
#       rather than setting it as an env var to avoid shell escaping issues.

# Exchange a JWT assertion for an access token.
# Use your JWT library to sign an assertion with your private key.
# Required claims:
#   iss = ${userId}   (DATUM_CLIENT_ID — the Zitadel user ID, not the email)
#   sub = ${userId}   (DATUM_CLIENT_ID — the Zitadel user ID, not the email)
#   aud = https://auth.datum.net/oauth/v2/token
#   iat = <current unix timestamp>
#   exp = <iat + 3600>
#
# See https://docs.datum.net/authentication for SDK examples, then:
curl -s -X POST "$DATUM_TOKEN_URI" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \\
  -d "assertion=$DATUM_JWT_ASSERTION" \\
  | jq -r '.access_token'`;

  return (
    <div
      className="bg-card-success border-card-success-border relative flex flex-col gap-4 rounded-lg border p-6"
      role="region"
      aria-label="Key credentials — save these now">
      <Button
        htmlType="button"
        type="quaternary"
        theme="borderless"
        size="icon"
        className="absolute top-4 right-4 size-6"
        aria-label="Dismiss credential panel"
        onClick={onDismiss}>
        <CloseIcon />
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-2 pr-8">
        <div className="flex items-center gap-2.5">
          <ThumbsUpIcon className="text-success size-4 shrink-0" aria-hidden="true" />
          <h4 className="text-sm font-semibold">Key created — save your credentials now!</h4>
        </div>
        <p className="text-muted-foreground text-xs">
          Store these credentials securely. The private key will not be shown again.
        </p>
      </div>

      {/* Download button */}
      <div>
        <Button
          htmlType="button"
          type="secondary"
          theme="solid"
          size="small"
          onClick={() => downloadCredentials(credentials, credentialsFilename)}>
          <DownloadIcon className="size-4" aria-hidden="true" />
          Download credentials.json
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab ?? 'github'} className="w-full">
        <TabsList>
          <TabsTrigger value="github">GitHub Actions</TabsTrigger>
          <TabsTrigger value="kubernetes">Kubernetes</TabsTrigger>
          <TabsTrigger value="envvars">Environment Variables</TabsTrigger>
        </TabsList>

        <TabsContent value="github">
          <SnippetBlock
            content={githubSnippet}
            tabId="github"
            copiedTabId={copiedTabId}
            onCopy={handleCopy}
          />
        </TabsContent>

        <TabsContent value="kubernetes">
          <SnippetBlock
            content={kubernetesSnippet}
            tabId="kubernetes"
            copiedTabId={copiedTabId}
            onCopy={handleCopy}
          />
        </TabsContent>

        <TabsContent value="envvars">
          <SnippetBlock
            content={envvarsSnippet}
            tabId="envvars"
            copiedTabId={copiedTabId}
            onCopy={handleCopy}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
