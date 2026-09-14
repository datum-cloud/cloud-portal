import { FieldLabel } from '@/components/card/field-label';
import { StatusChip } from '@/components/card/status-chip';
import { ToggleState } from '@/components/card/toggle-state';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { showMutationErrorToast } from '@/modules/quota';
import { useResourcePermissions } from '@/modules/rbac';
import {
  type HttpProxy,
  getCertificateReadyCondition,
  getCertificateReadyDisplay,
  useUpdateHttpProxy,
} from '@/resources/http-proxies';
import { isIPAddress } from '@/utils/helpers/validation.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardField,
  CardFieldValue,
  CardHeader,
  CardSaveBar,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import { Switch } from '@datum-cloud/datum-ui/switch';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { CheckIcon, CopyIcon, LockIcon, PencilIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

/** Where the origin's TLS hostname comes from when no explicit override is set. */
function describeOrigin(endpoint: string | undefined): {
  host?: string;
  isIp: boolean;
  https: boolean;
} {
  if (!endpoint) return { isIp: false, https: false };
  try {
    const url = new URL(endpoint);
    return {
      host: url.hostname,
      isIp: isIPAddress(url.hostname),
      https: url.protocol === 'https:',
    };
  } catch {
    return { isIp: false, https: false };
  }
}

/**
 * Validate the origin TLS (SNI) hostname. Empty is fine unless the origin is
 * an HTTPS IP, in which case there's nothing else to match the cert against.
 */
function validateTlsHostname(value: string, required: boolean): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return required ? 'Required when the origin is an HTTPS IP address' : undefined;
  if (/\s/.test(trimmed)) return 'Hostnames cannot contain spaces';
  if (/^[a-z]+:\/\//i.test(trimmed)) return 'Enter a hostname without a scheme';
  if (trimmed.includes('*')) return 'Wildcards are not valid in a TLS hostname';
  if (trimmed.length > 253) return 'Hostnames must be 253 characters or fewer';
  const labelRe = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  if (!trimmed.split('.').every((label) => labelRe.test(label))) {
    return 'Enter a valid hostname (letters, numbers, hyphens, and dots only)';
  }
  return undefined;
}

type CertRow = {
  hostname: string;
  cert: ReturnType<typeof getCertificateReadyDisplay>;
  message?: string;
};

function CertChip({ row }: { row: CertRow }) {
  switch (row.cert) {
    case 'ready':
      return (
        <StatusChip tone="success" tooltip="Certificate issued by Datum and renewed automatically">
          Issued · auto-renews
        </StatusChip>
      );
    case 'failed':
      return (
        <StatusChip tone="danger" tooltip={row.message || 'Certificate provisioning failed'}>
          Failed
        </StatusChip>
      );
    case 'challenge':
      return (
        <StatusChip
          tone="warning"
          busy
          tooltip={row.message || 'Completing ACME challenge with the certificate authority'}>
          ACME challenge
        </StatusChip>
      );
    default:
      return (
        <StatusChip tone="warning" busy tooltip={row.message || 'Requesting a certificate'}>
          Issuing
        </StatusChip>
      );
  }
}

/**
 * Transport settings for an ALB: HTTP→HTTPS redirect, HSTS, and the state of
 * the certificates Datum issues for each hostname. Both toggles are written to
 * the HTTPProxy rules (a redirect rule and a ResponseHeaderModifier filter).
 */
export function HttpProxyTlsCard({ proxy, projectId }: { proxy: HttpProxy; projectId: string }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftForceHttps, setDraftForceHttps] = useState(false);
  const [draftHsts, setDraftHsts] = useState(false);
  const [draftTlsHostname, setDraftTlsHostname] = useState('');
  const [, copy, isCopied] = useCopyToClipboard();

  const { canPatch, isLoading: patchPermLoading } = useResourcePermissions({
    resource: 'httpproxies',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['patch'],
  });

  const updateProxy = useUpdateHttpProxy(projectId, proxy.name);

  const currentForceHttps = proxy.enableHttpRedirect ?? false;
  const currentHsts = proxy.hsts ?? false;
  const currentTlsHostname = proxy.tlsHostname ?? '';
  const usesConnector = !!proxy.connector;
  const isAdvanced = proxy.complexity === 'advanced';
  const origin = useMemo(() => describeOrigin(proxy.endpoint), [proxy.endpoint]);
  // The backend rule needs an endpoint to carry the TLS hostname on.
  const canEditTlsHostname = !!proxy.endpoint && !usesConnector;
  const tlsHostnameRequired = canEditTlsHostname && origin.isIp && origin.https;

  const certRows = useMemo<CertRow[]>(() => {
    const statuses = proxy.hostnameStatuses ?? [];
    return (proxy.hostnames ?? []).map((hostname) => {
      const condition = getCertificateReadyCondition(
        statuses.find((hs) => hs.hostname === hostname)
      );
      return { hostname, cert: getCertificateReadyDisplay(condition), message: condition?.message };
    });
  }, [proxy.hostnames, proxy.hostnameStatuses]);

  const forceDirty = draftForceHttps !== currentForceHttps;
  const hstsDirty = draftHsts !== currentHsts;
  const tlsHostnameDirty = canEditTlsHostname && draftTlsHostname.trim() !== currentTlsHostname;
  const changeCount = (forceDirty ? 1 : 0) + (hstsDirty ? 1 : 0) + (tlsHostnameDirty ? 1 : 0);
  const tlsHostnameError =
    editing && canEditTlsHostname
      ? validateTlsHostname(draftTlsHostname, tlsHostnameRequired)
      : undefined;
  const errorCount = tlsHostnameError ? 1 : 0;

  const startEdit = () => {
    setDraftForceHttps(currentForceHttps);
    setDraftHsts(currentHsts);
    setDraftTlsHostname(currentTlsHostname);
    setEditing(true);
  };

  const setForceHttps = (checked: boolean) => {
    setDraftForceHttps(checked);
    // HSTS without a redirect would pin browsers to HTTPS we never send them to.
    if (!checked) setDraftHsts(false);
  };

  const handleSave = async () => {
    if (changeCount === 0 || errorCount > 0) return;
    if (forceDirty && !draftForceHttps && proxy.basicAuthEnabled) {
      toast.warning('Application Load Balancer', {
        description:
          'Basic Authentication is enabled. Disabling Force HTTPS will transmit credentials in plaintext.',
      });
    }

    setSaving(true);
    try {
      await updateProxy.mutateAsync({
        ...(forceDirty && { enableHttpRedirect: draftForceHttps }),
        ...(hstsDirty && { hsts: draftHsts }),
        // '' is an explicit clear; omitting would preserve the old value.
        ...(tlsHostnameDirty && { tlsHostname: draftTlsHostname.trim() }),
      });
      toast.success('Application Load Balancer', { description: 'TLS settings saved' });
      setEditing(false);
    } catch (error) {
      showMutationErrorToast(error, {
        fallbackTitle: 'Application Load Balancer',
        fallbackDescription: (error as Error).message || 'Failed to save TLS settings',
        scope: 'project',
        projectId,
      });
    } finally {
      setSaving(false);
    }
  };

  const editButton = (
    <Button
      type="secondary"
      theme="outline"
      size="xs"
      className={`shrink-0 ${editing ? 'invisible' : ''}`}
      disabled={editing || patchPermLoading || isAdvanced}
      aria-hidden={editing}
      tabIndex={editing ? -1 : undefined}
      onClick={startEdit}>
      <Icon icon={PencilIcon} size={12} />
      Edit
    </Button>
  );

  return (
    <Card size="sm" sectioned className="w-full overflow-hidden" data-e2e="alb-tls-card">
      <CardHeader size="sm" bordered>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={LockIcon} size={16} className="text-secondary" />
          TLS & Certificates
        </CardTitle>
        {canPatch ? (
          <CardAction>
            {isAdvanced ? (
              <Tooltip message="This load balancer has advanced rules the portal can't edit. Use datumctl or edit the resource directly.">
                <span className="inline-flex">{editButton}</span>
              </Tooltip>
            ) : (
              editButton
            )}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent padding="none">
        <CardField>
          <FieldLabel
            hint={
              usesConnector
                ? 'HTTPS redirect is not available when using a connector'
                : 'Redirect all HTTP requests to HTTPS with a 301 permanent redirect'
            }>
            Force HTTPS
          </FieldLabel>
          <CardFieldValue>
            {editing ? (
              <Switch
                checked={draftForceHttps}
                disabled={usesConnector || saving}
                aria-label="Force HTTPS"
                onCheckedChange={setForceHttps}
              />
            ) : (
              <ToggleState on={currentForceHttps} />
            )}
          </CardFieldValue>
        </CardField>

        <CardField>
          <FieldLabel hint="Send Strict-Transport-Security with a one year max-age so browsers only connect over HTTPS. Requires Force HTTPS.">
            HSTS
          </FieldLabel>
          <CardFieldValue>
            {editing ? (
              <Tooltip
                message="Turn on Force HTTPS to enable HSTS"
                hidden={draftForceHttps}
                side="bottom">
                <span className="inline-flex">
                  <Switch
                    checked={draftHsts}
                    disabled={!draftForceHttps || saving}
                    aria-label="HSTS"
                    onCheckedChange={setDraftHsts}
                  />
                </span>
              </Tooltip>
            ) : (
              <ToggleState on={currentHsts} />
            )}
          </CardFieldValue>
        </CardField>

        <CardField className={editing && canEditTlsHostname ? 'sm:items-start' : undefined}>
          <FieldLabel
            hint={
              usesConnector
                ? 'Not applicable when the origin is reached through a connector'
                : 'Hostname presented to the origin during the TLS handshake (SNI) and used to match its certificate. Leave empty to use the hostname from the origin URL.'
            }>
            Origin TLS hostname
          </FieldLabel>
          <CardFieldValue className="group/row flex items-center gap-1.5">
            {editing && canEditTlsHostname ? (
              <div className="flex w-full flex-col gap-1">
                <Input
                  value={draftTlsHostname}
                  onChange={(event) => setDraftTlsHostname(event.target.value)}
                  placeholder={origin.isIp ? 'e.g. secure.example.com' : origin.host}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={253}
                  aria-invalid={!!tlsHostnameError}
                  aria-label="Origin TLS hostname"
                  className="font-mono"
                />
                {tlsHostnameError ? (
                  <p className="text-destructive text-xs">{tlsHostnameError}</p>
                ) : tlsHostnameRequired ? (
                  <p className="text-muted-foreground text-xs">
                    Required because the origin is addressed by IP over HTTPS.
                  </p>
                ) : null}
              </div>
            ) : currentTlsHostname ? (
              <>
                <span className="truncate font-mono text-sm">{currentTlsHostname}</span>
                <Button
                  type="quaternary"
                  theme="borderless"
                  size="xs"
                  className={`text-muted-foreground hidden size-7 shrink-0 p-0 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 sm:inline-flex ${isCopied(currentTlsHostname) ? 'opacity-100' : ''}`}
                  aria-label={isCopied(currentTlsHostname) ? 'Copied' : 'Copy TLS hostname'}
                  onClick={() => void copy(currentTlsHostname, { withToast: true })}>
                  <Icon icon={isCopied(currentTlsHostname) ? CheckIcon : CopyIcon} size={14} />
                </Button>
              </>
            ) : usesConnector ? (
              <span className="text-muted-foreground" aria-label="Not applicable">
                &mdash;
              </span>
            ) : origin.host ? (
              <Tooltip message="No override set — the hostname from the origin URL is used">
                <span className="text-muted-foreground truncate font-mono text-sm">
                  {origin.host}
                </span>
              </Tooltip>
            ) : (
              <span className="text-muted-foreground" aria-label="Not set">
                &mdash;
              </span>
            )}
          </CardFieldValue>
        </CardField>

        <CardField className="sm:items-start">
          <FieldLabel hint="Datum issues and renews a certificate for every hostname on this load balancer.">
            Certificates
          </FieldLabel>
          <CardFieldValue>
            {certRows.length === 0 ? (
              <span className="text-muted-foreground text-sm">
                The default hostname is served with a Datum-managed certificate. Add a custom
                hostname to issue one for your own domain.
              </span>
            ) : (
              <ul className="flex w-full flex-col gap-2">
                {certRows.map((row) => (
                  <li
                    key={row.hostname}
                    className="flex min-w-0 items-center justify-between gap-3">
                    <div className="max-w-full min-w-0 truncate font-mono text-sm">
                      <Tooltip message={row.hostname}>
                        <span>{row.hostname}</span>
                      </Tooltip>
                    </div>
                    <CertChip row={row} />
                  </li>
                ))}
              </ul>
            )}
          </CardFieldValue>
        </CardField>
      </CardContent>
      {editing ? (
        <CardSaveBar
          changeCount={changeCount}
          errorCount={errorCount}
          saving={saving}
          onCancel={() => setEditing(false)}
          onSave={() => void handleSave()}
        />
      ) : null}
    </Card>
  );
}
