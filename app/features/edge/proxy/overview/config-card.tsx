import { FieldLabel } from '@/components/card/field-label';
import { UnavailableBadge } from '@/components/card/inline-controls';
import { StatusChip, type StatusChipTone } from '@/components/card/status-chip';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { planSecurityUpdate } from '@/features/edge/proxy/overview/security-update';
import { WafCategoryList } from '@/features/edge/proxy/overview/waf-category-list';
import { showMutationErrorToast } from '@/modules/quota';
import { useResourcePermissions } from '@/modules/rbac';
import {
  type HttpProxy,
  OWASP_CRS_CATEGORIES,
  type TrafficProtectionMode,
  disabledCategoryIds,
  formatWafProtectionStatusDisplay,
  getParanoiaLevelLabel,
  useUpdateHttpProxy,
  validateHostHeader,
} from '@/resources/http-proxies';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { PencilIcon, ShieldIcon } from 'lucide-react';
import { useState } from 'react';

const MODE_OPTIONS: Array<{ value: TrafficProtectionMode; label: string; description: string }> = [
  { value: 'Enforce', label: 'Enforce', description: 'Block requests that match a rule' },
  { value: 'Observe', label: 'Observe', description: 'Log matches and let the request through' },
  { value: 'Disabled', label: 'Disabled', description: 'No WAF inspection' },
];

const LEVEL_OPTIONS = [
  { value: 1, description: 'Recommended — fewest false positives' },
  { value: 2, description: 'Stricter matching, more false positives' },
];

const WAF_STATE_TONE: Record<string, StatusChipTone> = {
  protected: 'success',
  monitoring: 'success',
  pending: 'warning',
  error: 'danger',
};

/**
 * Request-handling security for an ALB. Protection mode, sensitivity and the
 * ruleset live on the TrafficProtectionPolicy; the Host header override is a
 * rule filter on the HTTPProxy. All four are edited inline and saved together.
 */
export const HttpProxyConfigCard = ({
  proxy,
  projectId,
  canViewWaf = true,
  wafPending = false,
  wafUnavailable = false,
  wafProgrammed,
  wafProgrammedMessage,
  wafProgrammedReason,
}: {
  proxy: HttpProxy;
  projectId?: string;
  canViewWaf?: boolean;
  wafPending?: boolean;
  /** WAF fetch failed for a reason other than permissions — show "—" without a verdict. */
  wafUnavailable?: boolean;
  wafProgrammed?: boolean;
  wafProgrammedMessage?: string;
  wafProgrammedReason?: string;
}) => {
  const { confirm } = useConfirmationDialog();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftMode, setDraftMode] = useState<TrafficProtectionMode>('Disabled');
  const [draftLevel, setDraftLevel] = useState(1);
  const [draftDisabledIds, setDraftDisabledIds] = useState<string[]>([]);
  const [draftHostHeader, setDraftHostHeader] = useState('');

  const { canPatch: canPatchProxy, isLoading: proxyPermLoading } = useResourcePermissions({
    resource: 'httpproxies',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['patch'],
  });
  const { canPatch: canPatchWaf, isLoading: wafPermLoading } = useResourcePermissions({
    resource: 'trafficprotectionpolicies',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['patch'],
  });
  const updateProxy = useUpdateHttpProxy(projectId ?? '', proxy.name);

  // ── current values ──────────────────────────────────────────────────────
  const wafState = wafPending
    ? 'loading'
    : !canViewWaf
      ? 'forbidden'
      : wafUnavailable
        ? 'unavailable'
        : 'ready';
  const currentMode: TrafficProtectionMode = proxy.trafficProtectionMode || 'Disabled';
  const currentLevel = proxy.paranoiaLevels?.blocking ?? 1;
  const currentDisabledIds = disabledCategoryIds(proxy.ruleExclusions);
  const currentHostHeader = proxy.hostHeader ?? '';
  const isAdvanced = proxy.complexity === 'advanced';

  const canEditWaf = !!projectId && canPatchWaf && wafState === 'ready';
  // The override rides on the backend rule, so there has to be one.
  const canEditHost = !!projectId && canPatchProxy && !!proxy.endpoint && !isAdvanced;
  const canEditCard = canEditWaf || canEditHost;

  // ── draft / dirty state ─────────────────────────────────────────────────
  const draftEnabled = draftMode !== 'Disabled';
  const trimmedHostHeader = draftHostHeader.trim();
  const plan = planSecurityUpdate(
    {
      mode: currentMode,
      level: currentLevel,
      disabledIds: currentDisabledIds,
      hostHeader: currentHostHeader,
      ruleExclusions: proxy.ruleExclusions,
    },
    {
      mode: draftMode,
      level: draftLevel,
      disabledIds: draftDisabledIds,
      hostHeader: draftHostHeader,
    },
    { canEditWaf, canEditHost }
  );
  const { changeCount } = plan;

  const hostHeaderError =
    editing && canEditHost ? (validateHostHeader(trimmedHostHeader) ?? undefined) : undefined;
  const errorCount = hostHeaderError ? 1 : 0;

  const startEdit = () => {
    setDraftMode(currentMode);
    setDraftLevel(currentLevel);
    setDraftDisabledIds(currentDisabledIds);
    setDraftHostHeader(currentHostHeader);
    setEditing(true);
  };

  const handleSave = async () => {
    if (changeCount === 0 || errorCount > 0) return;

    if (plan.removingProtection) {
      const confirmed = await confirm({
        title: 'Disable protection',
        description:
          'This removes WAF protection from this Application Load Balancer. Traffic will no longer be inspected for common web attacks.',
        submitText: 'Disable',
        cancelText: 'Keep protection',
        variant: 'destructive',
      });
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      await updateProxy.mutateAsync(plan.input);
      toast.success('Application Load Balancer', { description: 'Security settings saved' });
      setEditing(false);
    } catch (error) {
      showMutationErrorToast(error, {
        fallbackTitle: 'Application Load Balancer',
        fallbackDescription: (error as Error).message || 'Failed to save security settings',
        scope: 'project',
        projectId,
      });
    } finally {
      setSaving(false);
    }
  };

  // ── view-mode values ────────────────────────────────────────────────────
  const wafUnavailableValue =
    wafState === 'loading' ? (
      <Skeleton className="h-5 w-24 rounded-md" />
    ) : wafState === 'forbidden' ? (
      <UnavailableBadge reason="You don't have permission to view WAF protection" />
    ) : wafState === 'unavailable' ? (
      <UnavailableBadge />
    ) : null;

  const protectionStatus = (() => {
    if (wafState !== 'ready' || currentMode === 'Disabled') return null;
    const { state, statusLabel, statusTooltip } = formatWafProtectionStatusDisplay(
      proxy,
      wafProgrammed,
      wafProgrammedReason,
      wafProgrammedMessage
    );
    const tone = WAF_STATE_TONE[state];
    if (!tone) return null;
    return (
      <StatusChip tone={tone} busy={state === 'pending'} tooltip={statusTooltip || statusLabel}>
        {statusLabel}
      </StatusChip>
    );
  })();

  const excludedCount = currentDisabledIds.length;
  const totalCategories = OWASP_CRS_CATEGORIES.length;

  const editButton = (
    <Button
      type="secondary"
      theme="outline"
      size="xs"
      className={`shrink-0 ${editing ? 'invisible' : ''}`}
      disabled={editing || proxyPermLoading || wafPermLoading || !canEditCard}
      aria-hidden={editing}
      tabIndex={editing ? -1 : undefined}
      onClick={startEdit}>
      <Icon icon={PencilIcon} size={12} />
      Edit
    </Button>
  );

  const showWafEditors = editing && canEditWaf;

  return (
    <Card size="sm" sectioned className="w-full overflow-hidden" data-e2e="alb-security-card">
      <CardHeader size="sm" bordered>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={ShieldIcon} size={16} className="text-secondary" />
          Security & WAF
        </CardTitle>
        {(canPatchProxy || canPatchWaf) && projectId ? (
          <CardAction>
            {isAdvanced && !canEditWaf ? (
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
          <FieldLabel hint="Enforce blocks requests that match a rule. Observe only logs them. Protection is provided by the Coraza WAF using the OWASP Core Rule Set.">
            Protection mode
          </FieldLabel>
          <CardFieldValue>
            {showWafEditors ? (
              <Select
                value={draftMode}
                disabled={saving}
                onValueChange={(value) => setDraftMode(value as TrafficProtectionMode)}>
                <SelectTrigger aria-label="Protection mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex flex-col items-start">
                        <span>{option.label}</span>
                        <Text size="xs" textColor="muted">
                          {option.description}
                        </Text>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              (wafUnavailableValue ?? (
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={currentMode === 'Disabled' ? 'text-muted-foreground' : undefined}>
                    {currentMode}
                  </span>
                  {protectionStatus}
                </div>
              ))
            )}
          </CardFieldValue>
        </CardField>

        <CardField>
          <FieldLabel hint="OWASP paranoia level. Higher levels catch more but raise the chance of false positives.">
            Sensitivity
          </FieldLabel>
          <CardFieldValue>
            {showWafEditors ? (
              <Tooltip message="Enable protection to set a sensitivity" hidden={draftEnabled}>
                <div className="w-full">
                  <Select
                    value={String(draftLevel)}
                    disabled={!draftEnabled || saving}
                    onValueChange={(value) => setDraftLevel(Number(value))}>
                    <SelectTrigger aria-label="Sensitivity" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          <span className="flex flex-col items-start">
                            <span>{getParanoiaLevelLabel(option.value)}</span>
                            <Text size="xs" textColor="muted">
                              {option.description}
                            </Text>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Tooltip>
            ) : (
              (wafUnavailableValue ??
              (currentMode === 'Disabled' ? (
                <span className="text-muted-foreground" aria-label="Not applicable">
                  &mdash;
                </span>
              ) : (
                <span>{getParanoiaLevelLabel(currentLevel)}</span>
              )))
            )}
          </CardFieldValue>
        </CardField>

        <CardField className={showWafEditors && draftEnabled ? 'sm:items-start' : undefined}>
          <FieldLabel hint="Attack categories from the OWASP Core Rule Set. Turn a category off to exclude its rules; the rest stay active.">
            OWASP Core Ruleset
          </FieldLabel>
          <CardFieldValue>
            {showWafEditors ? (
              draftEnabled ? (
                <WafCategoryList
                  disabledIds={draftDisabledIds}
                  onChange={setDraftDisabledIds}
                  disabled={saving}
                />
              ) : (
                <Text textColor="muted">Enable protection to choose rule categories</Text>
              )
            ) : (
              (wafUnavailableValue ??
              (currentMode === 'Disabled' ? (
                <span className="text-muted-foreground" aria-label="Not applicable">
                  &mdash;
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>
                    {totalCategories - excludedCount} of {totalCategories} categories
                  </span>
                  {excludedCount > 0 ? (
                    <Tooltip
                      message={OWASP_CRS_CATEGORIES.filter((c) => currentDisabledIds.includes(c.id))
                        .map((c) => c.label)
                        .join(', ')}>
                      <Text size="xs" textColor="muted">
                        · {excludedCount} excluded
                      </Text>
                    </Tooltip>
                  ) : null}
                </div>
              )))
            )}
          </CardFieldValue>
        </CardField>

        <CardField className={editing && canEditHost ? 'sm:items-start' : undefined}>
          <FieldLabel hint="Rewrite the Host header sent to the origin. Leave empty to forward the incoming Host unchanged.">
            Host header override
          </FieldLabel>
          <CardFieldValue>
            {editing && canEditHost ? (
              <div className="flex w-full flex-col gap-1">
                <Input
                  value={draftHostHeader}
                  onChange={(event) => setDraftHostHeader(event.target.value)}
                  placeholder="e.g. api.example.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={253}
                  aria-invalid={!!hostHeaderError}
                  aria-label="Host header override"
                  className="font-mono"
                />
                {hostHeaderError ? (
                  <Text as="p" size="xs" textColor="destructive">
                    {hostHeaderError}
                  </Text>
                ) : null}
              </div>
            ) : currentHostHeader ? (
              <Text ellipsis className="font-mono">
                {currentHostHeader}
              </Text>
            ) : (
              <span className="text-muted-foreground" aria-label="Not set">
                &mdash;
              </span>
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
};
