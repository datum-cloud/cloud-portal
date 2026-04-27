import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { SelectDomain } from '@/features/edge/domain/select-domain';
import { ControlPlaneStatus } from '@/resources/base';
import { useDomains } from '@/resources/domains';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { useField, useFieldContext } from '@datum-cloud/datum-ui/form';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { cn } from '@datum-cloud/datum-ui/utils';
import { AlertTriangleIcon, GlobeIcon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface SubdomainHostnameFieldProps {
  projectId: string;
  /** Proxy display name used for smart suggestions */
  proxyDisplayName?: string;
  /** Hostname values to exclude (already selected in other rows) */
  excludeValues?: string[];
  /** Called when the user clicks the remove button */
  onRemove?: () => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Decompose a full hostname into prefix + parent domain.
 * Returns the longest matching registered domain.
 */
function decomposeHostname(
  hostname: string,
  domainNames: string[]
): { prefix: string; domain: string } | null {
  if (!hostname) return null;
  const lower = hostname.toLowerCase();
  const sorted = [...domainNames].sort((a, b) => b.length - a.length);

  for (const domain of sorted) {
    const domainLower = domain.toLowerCase();
    if (lower === domainLower) {
      return { prefix: '', domain };
    }
    if (lower.endsWith(`.${domainLower}`)) {
      const prefix = lower.slice(0, -(domainLower.length + 1));
      return { prefix, domain };
    }
  }
  return null;
}

export function SubdomainHostnameField({
  projectId,
  proxyDisplayName,
  excludeValues,
  onRemove,
}: SubdomainHostnameFieldProps) {
  const { name, disabled: fieldDisabled, errors } = useFieldContext();
  const { control } = useField(name);
  const currentValue = Array.isArray(control.value)
    ? String(control.value[0] ?? '')
    : String(control.value ?? '');

  const { confirm } = useConfirmationDialog();
  const { data: domains = [], isLoading: domainsLoading } = useDomains(projectId);
  const domainNames = useMemo(() => domains.map((d) => d.domainName), [domains]);

  const [isCustomMode, setIsCustomMode] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [customHostname, setCustomHostname] = useState('');
  /** Last (form value, domain list) we derived local UI from — ref avoids an init flag in effect deps / extra render cycle. */
  const lastFormSyncKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (domainNames.length === 0) {
      lastFormSyncKeyRef.current = null;
      return;
    }

    const val = currentValue ?? '';
    const syncKey = `${val}\0${domainNames.join('\0')}`;
    if (lastFormSyncKeyRef.current === syncKey) return;
    lastFormSyncKeyRef.current = syncKey;

    if (!val) {
      setPrefix('');
      setCustomHostname('');
      setIsCustomMode(false);
      setSelectedDomain(domainNames.length === 1 ? domainNames[0] : '');
      return;
    }

    const decomposed = decomposeHostname(val, domainNames);
    if (decomposed) {
      setPrefix(decomposed.prefix);
      setSelectedDomain(decomposed.domain);
      setIsCustomMode(false);
    } else {
      setCustomHostname(val);
      setIsCustomMode(true);
    }
  }, [currentValue, domainNames]);

  const syncToForm = useCallback(
    (newPrefix: string, newDomain: string) => {
      if (!newDomain) {
        control.change('');
        return;
      }
      const trimmedPrefix = newPrefix.trim().replace(/\.$/, '');
      const hostname = trimmedPrefix ? `${trimmedPrefix}.${newDomain}` : newDomain;
      control.change(hostname);
    },
    [control]
  );

  const handlePrefixChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPrefix = e.target.value;
      setPrefix(newPrefix);
      if (!selectedDomain) return;
      syncToForm(newPrefix, selectedDomain);
    },
    [selectedDomain, syncToForm]
  );

  const handleDomainChange = useCallback(
    (newDomain: string) => {
      setSelectedDomain(newDomain);
      syncToForm(prefix, newDomain);
    },
    [prefix, syncToForm]
  );

  const handleCustomChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCustomHostname(val);
      control.change(val);
    },
    [control]
  );

  const switchToCustom = useCallback(() => {
    setIsCustomMode(true);
    if (prefix && selectedDomain) {
      setCustomHostname(`${prefix}.${selectedDomain}`);
    } else {
      setCustomHostname(String(currentValue ?? ''));
    }
  }, [prefix, selectedDomain, currentValue]);

  const switchToSplit = useCallback(async () => {
    if (!customHostname) {
      setIsCustomMode(false);
      return;
    }
    const decomposed = decomposeHostname(customHostname, domainNames);
    if (decomposed) {
      setIsCustomMode(false);
      setPrefix(decomposed.prefix);
      setSelectedDomain(decomposed.domain);
      return;
    }
    const accepted = await confirm({
      title: 'Hostname will change',
      description: `Clear “${customHostname}” and use a verified domain instead?`,
      variant: 'default',
      submitText: 'Continue',
      cancelText: 'Cancel',
    });
    if (!accepted) return;
    setIsCustomMode(false);
    setPrefix('');
    setSelectedDomain('');
  }, [customHostname, domainNames, confirm]);

  const suggestions = useMemo(() => {
    if (!proxyDisplayName || domainNames.length === 0) return [];
    const slug = slugify(proxyDisplayName);
    if (!slug) return [];

    const allExcluded = new Set(excludeValues ?? []);
    if (currentValue) allExcluded.add(currentValue);

    return domainNames
      .map((domain) => `${slug}.${domain}`)
      .filter((s) => !allExcluded.has(s))
      .slice(0, 10);
  }, [proxyDisplayName, domainNames, excludeValues, currentValue]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      const decomposed = decomposeHostname(suggestion, domainNames);
      if (decomposed) {
        setPrefix(decomposed.prefix);
        setSelectedDomain(decomposed.domain);
        setIsCustomMode(false);
        syncToForm(decomposed.prefix, decomposed.domain);
      }
    },
    [domainNames, syncToForm]
  );

  const hasErrors = errors && errors.length > 0;
  const showSuggestions = !isCustomMode && !currentValue && suggestions.length > 0;

  const selectedDomainStatus = useMemo(() => {
    if (!selectedDomain) return null;
    const domain = domains.find((d) => d.domainName === selectedDomain);
    if (!domain) return null;
    return transformControlPlaneStatus(domain.status).status;
  }, [selectedDomain, domains]);

  const isUnverified = selectedDomainStatus && selectedDomainStatus !== ControlPlaneStatus.Success;

  /** Same composition as syncToForm — shown below fields on small screens where the dot separator is hidden. */
  const splitHostnamePreview = useMemo(() => {
    if (!selectedDomain) return null;
    const trimmed = prefix.trim().replace(/\.$/, '');
    return trimmed ? `${trimmed}.${selectedDomain}` : selectedDomain;
  }, [prefix, selectedDomain]);

  if (isCustomMode) {
    return (
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            'border-input-border bg-input-background/50 flex items-stretch overflow-hidden rounded-lg border transition-all',
            'focus-within:border-input-focus-border focus-within:shadow-(--input-focus-shadow)',
            hasErrors && 'border-destructive',
            fieldDisabled && 'cursor-not-allowed opacity-50'
          )}>
          <input
            type="text"
            value={customHostname}
            onChange={handleCustomChange}
            onBlur={control.blur}
            disabled={fieldDisabled}
            placeholder="e.g. api.external-domain.com"
            className="text-input-foreground placeholder:text-input-placeholder h-9 min-w-0 flex-1 bg-transparent px-3 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-hidden"
          />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive flex items-center px-2.5 transition-colors">
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
        {domainNames.length > 0 && (
          <button
            type="button"
            onClick={() => void switchToSplit()}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-[11px] underline transition-colors">
            <GlobeIcon className="size-3" />
            Use a verified domain
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {domainsLoading && (
        <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
      )}
      {showSuggestions && (
        <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSuggestionClick(s)}
              className="bg-accent hover:bg-accent/80 text-accent-foreground rounded-md px-2 py-0.5 text-[11px] transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}
      <div
        className={cn(
          'border-input-border bg-input-background/50 flex flex-col overflow-hidden rounded-lg border transition-all sm:flex-row sm:items-stretch',
          'focus-within:border-input-focus-border focus-within:shadow-(--input-focus-shadow)',
          hasErrors && 'border-destructive',
          fieldDisabled && 'cursor-not-allowed opacity-50'
        )}>
        <div className="flex min-w-0 items-stretch sm:flex-1">
          <input
            type="text"
            value={prefix}
            onChange={handlePrefixChange}
            onBlur={control.blur}
            disabled={fieldDisabled}
            placeholder="subdomain (leave blank to use apex)"
            className="text-input-foreground placeholder:text-input-placeholder h-9 min-w-0 flex-1 bg-transparent px-3 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-hidden"
          />
          <span className="text-muted-foreground hidden items-center text-xs sm:flex">.</span>
        </div>
        <div className="border-input-border flex min-w-0 items-stretch border-t sm:flex-1 sm:border-t-0">
          <SelectDomain
            projectId={projectId}
            value={selectedDomain}
            onValueChange={handleDomainChange}
            disabled={fieldDisabled}
            placeholder="Select domain..."
            compact
            showAddDomain={domainNames.length === 0}
            className="min-w-0 flex-1"
            triggerClassName="h-9 rounded-none border-0 shadow-none text-xs focus-visible:border-0 focus-visible:shadow-none"
          />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive flex shrink-0 items-center px-2.5 transition-colors">
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      <div
        className="px-0.5 pt-0.5 sm:hidden"
        aria-live="polite"
        aria-label="Assembled hostname preview">
        <p className={cn('text-1xs text-muted-foreground mt-0.5 font-mono wrap-break-word')}>
          {splitHostnamePreview}
        </p>
      </div>
      {isUnverified && (
        <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
          <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" />
          <span>
            {selectedDomainStatus === ControlPlaneStatus.Pending
              ? 'This domain is being verified — your proxy may not activate until verification is complete.'
              : "This domain is not verified — your proxy won't activate until the domain is verified."}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={switchToCustom}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-[11px] underline transition-colors">
        <GlobeIcon className="size-3" />
        Type a custom hostname
      </button>
    </div>
  );
}

SubdomainHostnameField.displayName = 'SubdomainHostnameField';
