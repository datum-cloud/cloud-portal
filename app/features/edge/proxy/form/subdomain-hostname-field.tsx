import { SelectDomain } from '@/features/edge/domain/select-domain';
import { findCoveringDomain } from '@/features/edge/proxy/utils/covering-domain';
import {
  decomposeHostname,
  getUnverifiedHostnameError,
  isDomainVerified,
} from '@/features/edge/proxy/utils/hostname-verification';
import { ControlPlaneStatus } from '@/resources/base';
import { useDomains } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useField, useFieldContext } from '@datum-cloud/datum-ui/form';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { AlertTriangleIcon, ExternalLinkIcon, XIcon } from 'lucide-react';
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

export function SubdomainHostnameField({
  projectId,
  proxyDisplayName,
  excludeValues,
  onRemove,
}: SubdomainHostnameFieldProps) {
  const { name, disabled: fieldDisabled } = useFieldContext();
  // Read Conform's errors directly: Form.Field only shows errors for fields it
  // marks touched, and on submit it marks top-level keys (`hostnames`), never
  // array items (`hostnames[0]`), so a failed save would otherwise be silent.
  const { control, field } = useField(name);
  const errors = field.errors;
  const currentValue = Array.isArray(control.value)
    ? String(control.value[0] ?? '')
    : String(control.value ?? '');

  const {
    data: domains = [],
    isLoading: domainsLoading,
    isError: domainsError,
  } = useDomains(projectId);
  const domainNames = useMemo(() => domains.map((d) => d.domainName), [domains]);
  const verifiedDomainNames = useMemo(
    () => domains.filter(isDomainVerified).map((d) => d.domainName),
    [domains]
  );

  const [prefix, setPrefix] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  /** Last (form value, domain list) we derived local UI from — ref avoids an init flag in effect deps / extra render cycle. */
  const lastFormSyncKeyRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (domainNames.length === 0) {
      lastFormSyncKeyRef.current = null;
      return;
    }

    const val = currentValue ?? '';
    const syncKey = `${val}\0${domainNames.join('\0')}\0${verifiedDomainNames.join('\0')}`;
    if (lastFormSyncKeyRef.current === syncKey) return;
    lastFormSyncKeyRef.current = syncKey;

    if (!val) {
      setPrefix('');
      const autoDomain = verifiedDomainNames.length === 1 ? verifiedDomainNames[0] : '';
      setSelectedDomain(autoDomain);
      // Auto-selecting the sole verified domain implies its apex — persist that
      // to the form now, since the user may never touch the prefix or picker.
      if (autoDomain) syncToForm('', autoDomain);
      return;
    }

    const decomposed = decomposeHostname(val, domainNames);
    setPrefix(decomposed?.prefix ?? '');
    setSelectedDomain(decomposed?.domain ?? '');
  }, [currentValue, domainNames, verifiedDomainNames, syncToForm]);

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

  const suggestions = useMemo(() => {
    if (!proxyDisplayName || verifiedDomainNames.length === 0) return [];
    const slug = slugify(proxyDisplayName);
    if (!slug) return [];

    const allExcluded = new Set(excludeValues ?? []);
    if (currentValue) allExcluded.add(currentValue);

    return verifiedDomainNames
      .map((domain) => `${slug}.${domain}`)
      .filter((s) => !allExcluded.has(s))
      .slice(0, 10);
  }, [proxyDisplayName, verifiedDomainNames, excludeValues, currentValue]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      const decomposed = decomposeHostname(suggestion, domainNames);
      if (decomposed) {
        setPrefix(decomposed.prefix);
        setSelectedDomain(decomposed.domain);
        syncToForm(decomposed.prefix, decomposed.domain);
      }
    },
    [domainNames, syncToForm]
  );

  const hasErrors = errors.length > 0;
  const errorList = hasErrors && (
    <ul className="text-destructive space-y-1 text-xs font-medium">
      {errors.map((error) => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  );
  const showSuggestions = !currentValue && suggestions.length > 0;
  const hasNoVerifiedDomains =
    !domainsLoading && domainNames.length > 0 && verifiedDomainNames.length === 0;
  /** An existing hostname that isn't on any project domain. It can't be rebuilt from the picker, only removed. */
  const isOutsideProject =
    !domainsLoading && !!currentValue && !decomposeHostname(currentValue, domainNames);

  const selectedDomainStatus = useMemo(() => {
    if (!selectedDomain) return null;
    const domain = domains.find((d) => d.domainName === selectedDomain);
    if (!domain) return null;
    return transformControlPlaneStatus(domain.status).status;
  }, [selectedDomain, domains]);

  // Only existing hostnames can land here — the picker won't select an
  // unverified domain. A schema error takes over once the row is edited.
  // Unknown when the domains didn't load: say nothing rather than warn wrongly.
  const isWildcard = currentValue.trim().startsWith('*.');
  const lacksVerification =
    !hasErrors &&
    !domainsLoading &&
    !domainsError &&
    !!currentValue &&
    !!getUnverifiedHostnameError(currentValue, domains);
  const isUnverified = lacksVerification && !isWildcard;
  const needsWildcardDnsProof = lacksVerification && isWildcard;

  const wildcardDomain = needsWildcardDnsProof
    ? findCoveringDomain(domains, currentValue)
    : undefined;

  const wildcardNotice = needsWildcardDnsProof ? (
    <Text
      as="div"
      size="xs"
      className="flex items-start gap-1.5 text-amber-600 dark:text-amber-500">
      <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" />
      <span>
        Wildcards need the domain verified by its DNS TXT record. Domains verified over HTTP or
        through a Datum DNS zone don&apos;t count yet, so this hostname won&apos;t be accepted.{' '}
        {wildcardDomain ? (
          // New tab, so the half-filled dialog isn't lost.
          <a
            href={getPathWithParams(paths.project.detail.domains.detail.overview, {
              projectId,
              domainId: wildcardDomain.name,
            })}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 font-medium underline underline-offset-2">
            Open {wildcardDomain.domainName}
            <ExternalLinkIcon className="size-3" aria-hidden="true" />
          </a>
        ) : null}
      </span>
    </Text>
  ) : null;

  /** Same composition as syncToForm — shown below fields on small screens where the dot separator is hidden. */
  const splitHostnamePreview = useMemo(() => {
    if (!selectedDomain) return null;
    const trimmed = prefix.trim().replace(/\.$/, '');
    return trimmed ? `${trimmed}.${selectedDomain}` : selectedDomain;
  }, [prefix, selectedDomain]);

  if (isOutsideProject) {
    return (
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            'border-input-border bg-input-background/50 flex items-stretch overflow-hidden rounded-lg border',
            hasErrors && 'border-destructive',
            fieldDisabled && 'cursor-not-allowed opacity-50'
          )}>
          <div className="flex h-9 min-w-0 flex-1 items-center px-3">
            <Text size="xs" ellipsis>
              {currentValue}
            </Text>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              disabled={fieldDisabled}
              aria-label={`Remove ${currentValue}`}
              className="text-muted-foreground hover:text-destructive flex items-center px-2.5 transition-colors">
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
        {!hasErrors && (
          <Text
            as="div"
            size="xs"
            className="flex items-start gap-1.5 text-amber-600 dark:text-amber-500">
            <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" />
            <span>
              This hostname isn&apos;t on a domain in this project, so it can&apos;t be verified.
              Remove it, or add and verify its domain.
            </span>
          </Text>
        )}
        {errorList}
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
              className="bg-accent hover:bg-accent/80 text-accent-foreground text-3xs rounded-md px-2 py-0.5 transition-colors">
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
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="subdomain or * (blank for apex)"
            className="text-input-foreground placeholder:text-input-placeholder h-9 min-w-0 flex-1 bg-transparent px-3 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-hidden"
          />
          <Text size="xs" textColor="muted" className="hidden items-center sm:flex">
            .
          </Text>
        </div>
        <div className="border-input-border flex min-w-0 items-stretch border-t sm:flex-1 sm:border-t-0">
          <SelectDomain
            projectId={projectId}
            value={selectedDomain}
            onValueChange={handleDomainChange}
            disabled={fieldDisabled}
            placeholder="Select domain..."
            compact
            disableUnverified
            showAddDomain={verifiedDomainNames.length === 0}
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
        <Text as="p" size="2xs" textColor="muted" className="mt-0.5 font-mono wrap-break-word">
          {splitHostnamePreview}
        </Text>
      </div>
      {errorList}
      {wildcardNotice}
      {isUnverified && (
        <Text
          as="div"
          size="xs"
          className="flex items-start gap-1.5 text-amber-600 dark:text-amber-500">
          <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" />
          <span>
            {selectedDomainStatus === ControlPlaneStatus.Pending
              ? "This domain is still being verified. This hostname won't serve traffic until verification completes."
              : "This domain isn't verified, so this hostname won't serve traffic. Verify the domain, or remove this hostname."}
          </span>
        </Text>
      )}
      {hasNoVerifiedDomains && !selectedDomain && (
        <Text as="p" size="xs" textColor="muted">
          None of this project&apos;s domains are verified yet. Verify one to use it here.
        </Text>
      )}
    </div>
  );
}

SubdomainHostnameField.displayName = 'SubdomainHostnameField';
