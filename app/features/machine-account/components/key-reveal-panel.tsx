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

type TabId = 'github' | 'gitlab' | 'tekton' | 'envvars';

interface SnippetBlockProps {
  content: string;
  tabId: TabId;
  copiedTabId: TabId | null;
  onCopy: (tabId: TabId, content: string) => void;
}

function SnippetBlock({ content, tabId, copiedTabId, onCopy }: SnippetBlockProps) {
  const isCopied = copiedTabId === tabId;

  return (
    <div className="relative rounded-md bg-muted">
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed whitespace-pre">
        {content}
      </pre>
      <button
        type="button"
        aria-label={isCopied ? 'Copied' : 'Copy snippet'}
        className="absolute top-2 right-2 rounded-md p-1.5 transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onCopy(tabId, content)}>
        {isCopied ? (
          <CheckIcon className="text-success size-4" />
        ) : (
          <CopyIcon className="size-4 text-muted-foreground" />
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

# 2. Reference it in your workflow:
steps:
  - name: Call Datum API
    env:
      DATUM_CREDENTIALS: \${{ secrets.DATUM_CREDENTIALS }}
    run: |
      # Your script reads DATUM_CREDENTIALS and handles JWT exchange
      # See https://docs.datum.net/authentication for SDK examples`;

  const gitlabSnippet = `# .gitlab-ci.yml
# Add DATUM_CREDENTIALS as a CI/CD variable (type: File, protected + masked)
#
# In your job:
your-job:
  script:
    - export DATUM_CREDENTIALS_FILE=$DATUM_CREDENTIALS
    # Your script can now read credentials from $DATUM_CREDENTIALS_FILE

# Or use individual variables:
# DATUM_CLIENT_EMAIL: ${identityEmail}
# DATUM_CLIENT_ID: ${userId}
# DATUM_PRIVATE_KEY: (add as masked variable)
# DATUM_TOKEN_URI: https://auth.datum.net/oauth/v2/token`;

  const tektonSnippet = `# 1. Create the Secret (run once):
kubectl create secret generic datum-credentials \\
  --from-file=credentials.json=${credentialsFilename}

# 2. Mount in your Pod/Task:
apiVersion: v1
kind: Pod
metadata:
  name: your-workload
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
        secretName: datum-credentials`;

  const envvarsSnippet = `# Option 1 (recommended): Point to the downloaded credentials file
export DATUM_CREDENTIALS_FILE="/path/to/${credentialsFilename}"

# Option 2: Set individual environment variables
# (The private key contains newlines — use the credentials file for the full key)
export DATUM_CLIENT_EMAIL="${identityEmail}"
export DATUM_CLIENT_ID="${userId}"
export DATUM_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"
export DATUM_TOKEN_URI="https://auth.datum.net/oauth/v2/token"
export DATUM_API_ENDPOINT="https://api.datum.net"

# Exchange a JWT assertion for an access token:
# Generate $DATUM_JWT_ASSERTION using your JWT library — see https://docs.datum.net/authentication
# Required claims: iss=${identityEmail}, sub=${identityEmail},
#                  aud=https://auth.datum.net/oauth/v2/token, iat, exp
#
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
      <Tabs defaultValue="github" className="w-full">
        <TabsList>
          <TabsTrigger value="github">GitHub Actions</TabsTrigger>
          <TabsTrigger value="gitlab">GitLab CI</TabsTrigger>
          <TabsTrigger value="tekton">Tekton/Argo</TabsTrigger>
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

        <TabsContent value="gitlab">
          <SnippetBlock
            content={gitlabSnippet}
            tabId="gitlab"
            copiedTabId={copiedTabId}
            onCopy={handleCopy}
          />
        </TabsContent>

        <TabsContent value="tekton">
          <SnippetBlock
            content={tektonSnippet}
            tabId="tekton"
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
