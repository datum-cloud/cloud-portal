import { DomainFormDialog, type DomainFormDialogRef } from './domain-form-dialog';
import { BadgeStatus } from '@/components/badge/badge-status';
import { ControlPlaneStatus } from '@/resources/base';
import { DOMAIN_VERIFICATION_STATUS, domainKeys, useDomains } from '@/resources/domains';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { useInputControl } from '@conform-to/react';
import { Button } from '@datum-ui/components';
import type { AutocompleteOption, AutocompleteProps } from '@datum-ui/components/new-form';
import { useFieldContext } from '@datum-ui/components/new-form';
import { Autocomplete } from '@datum-ui/components/new-form/primitives';
import { cn } from '@shadcn/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangleIcon, CheckIcon, PlusIcon } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

// ============================================================================
// Domain Option Type
// ============================================================================

interface DomainOption extends AutocompleteOption {
  domainStatus: ControlPlaneStatus;
}

// ============================================================================
// Domain Option Renderer
// ============================================================================

function DomainOptionContent({
  option,
  isSelected,
}: {
  option: DomainOption;
  isSelected: boolean;
}) {
  const statusConfig = DOMAIN_VERIFICATION_STATUS[option.domainStatus];

  return (
    <div className="flex w-full cursor-pointer items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-xs">{option.label}</span>
        {statusConfig && (
          <BadgeStatus status={statusConfig.badgeStatus} label={statusConfig.label} />
        )}
      </div>
      {isSelected && <CheckIcon className="text-primary size-4 shrink-0" />}
    </div>
  );
}

// ============================================================================
// SelectDomain (Standalone)
// ============================================================================

type SelectDomainProps = {
  /** Project ID for fetching domains */
  projectId: string;
  /** Currently selected domain value */
  value?: string;
  /** Called when selection changes */
  onValueChange?: (value: string) => void;
  /** Domain values to exclude from the options (e.g., already selected in other fields) */
  excludeValues?: string[];
  /** Allow custom hostnames not in the domain list */
  creatable?: boolean;
  /** Disable the component */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes for the root wrapper */
  className?: string;
  /** Additional CSS classes for the trigger button */
  triggerClassName?: string;
} & Pick<AutocompleteProps, 'loading' | 'emptyContent' | 'contentClassName' | 'listClassName'>;

export function SelectDomain({
  projectId,
  value,
  onValueChange,
  excludeValues,
  creatable,
  disabled,
  placeholder = 'Select a domain...',
  className,
  triggerClassName,
  loading: externalLoading,
  emptyContent = 'No domains found',
  ...rest
}: SelectDomainProps) {
  const queryClient = useQueryClient();
  const { data: domains = [], isLoading } = useDomains(projectId);
  const domainFormRef = useRef<DomainFormDialogRef>(null);

  const domainOptions: DomainOption[] = useMemo(() => {
    const unique = new Map(domains.map((d) => [d.domainName, d]));
    const options = Array.from(unique.values(), (d) => ({
      value: d.domainName,
      label: d.domainName,
      domainStatus: transformControlPlaneStatus(d.status).status,
    }));

    // In creatable mode, the Autocomplete trigger handles unknown values natively.
    // In non-creatable mode, inject the current value so it remains visible and selectable.
    if (!creatable && value && !options.some((o) => o.value === value)) {
      options.unshift({
        value,
        label: value,
        domainStatus: ControlPlaneStatus.Pending,
      });
    }

    return options;
  }, [domains, value, creatable]);

  const filteredOptions = useMemo(() => {
    if (!excludeValues?.length) return domainOptions;
    return domainOptions.filter(
      (option) => option.value === value || !excludeValues.includes(option.value)
    );
  }, [domainOptions, excludeValues, value]);

  // In creatable mode, we take over filtering from cmdk so we can keep
  // parent domains visible when the user types a subdomain.
  const [searchTerm, setSearchTerm] = useState('');

  const searchFilteredOptions = useMemo(() => {
    if (!creatable) return filteredOptions;
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return filteredOptions;
    return filteredOptions.filter((option) => {
      // Normal substring match
      if (option.label.toLowerCase().includes(needle)) return true;
      // Keep parent domains visible: typing "app.hiyahya.dev" keeps "hiyahya.dev"
      if (needle.endsWith(`.${option.value.toLowerCase()}`)) return true;
      return false;
    });
  }, [creatable, searchTerm, filteredOptions]);

  const selectedOption = useMemo(
    () => domainOptions.find((o) => o.value === value),
    [domainOptions, value]
  );

  const handleDomainCreated = useCallback(
    async (domainName: string) => {
      // Refetch the domains list so the new domain appears in options
      await queryClient.invalidateQueries({ queryKey: domainKeys.list(projectId) });
      onValueChange?.(domainName);
    },
    [queryClient, projectId, onValueChange]
  );

  const isUnverified = selectedOption && selectedOption.domainStatus !== ControlPlaneStatus.Success;

  const renderCreatableLabel = useCallback(
    (val: string) => {
      // Check if the typed value is a subdomain of a registered domain
      const parentDomain = domainOptions.find(
        (d) => val.endsWith(`.${d.value}`) && val !== d.value
      );

      return (
        <div className="flex flex-col">
          <span>Use &ldquo;{val}&rdquo;</span>
          {parentDomain && (
            <span className="text-muted-foreground text-[11px]">
              subdomain of {parentDomain.value}
            </span>
          )}
        </div>
      );
    },
    [domainOptions]
  );

  return (
    <>
      <Autocomplete<DomainOption>
        options={searchFilteredOptions}
        value={value}
        onValueChange={onValueChange}
        onSearchChange={creatable ? setSearchTerm : undefined}
        loading={externalLoading ?? isLoading}
        disabled={disabled}
        placeholder={placeholder}
        emptyContent={emptyContent}
        className={className}
        triggerClassName={triggerClassName}
        creatable={creatable}
        creatableLabel={creatable ? renderCreatableLabel : undefined}
        renderOption={(option, isSelected) => (
          <DomainOptionContent option={option} isSelected={isSelected} />
        )}
        footer={
          creatable ? undefined : (
            <Button
              htmlType="button"
              type="quaternary"
              theme="borderless"
              size="small"
              className="hover:bg-accent hover:text-accent-foreground flex w-full cursor-pointer justify-start gap-2 px-3 py-2 text-xs font-normal transition-all"
              onClick={() => domainFormRef.current?.show()}
              icon={<PlusIcon className="size-3.5" />}
              iconPosition="left">
              Add a Domain
            </Button>
          )
        }
        {...rest}
      />
      {isUnverified && (
        <div className="flex items-start gap-1.5 pt-1 text-xs text-amber-600 dark:text-amber-500">
          <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" />
          <span>
            {selectedOption.domainStatus === ControlPlaneStatus.Pending
              ? 'This domain is being verified — your proxy may not activate until verification is complete.'
              : "This domain is not verified — your proxy won't activate until the domain is verified."}
          </span>
        </div>
      )}
      {!creatable && (
        <DomainFormDialog
          ref={domainFormRef}
          projectId={projectId}
          onSuccess={handleDomainCreated}
        />
      )}
    </>
  );
}

SelectDomain.displayName = 'SelectDomain';

// ============================================================================
// FormSelectDomain (Form-aware wrapper)
// ============================================================================

type FormSelectDomainProps = Omit<SelectDomainProps, 'value' | 'onValueChange'>;

export function FormSelectDomain({ disabled, triggerClassName, ...props }: FormSelectDomainProps) {
  const { fieldMeta, disabled: fieldDisabled, errors } = useFieldContext();
  const control = useInputControl(fieldMeta as any);

  const isDisabled = disabled ?? fieldDisabled;
  const hasErrors = errors && errors.length > 0;
  const selectValue = Array.isArray(control.value) ? control.value[0] : control.value;

  return (
    <SelectDomain
      {...props}
      value={selectValue ?? ''}
      onValueChange={control.change}
      disabled={isDisabled}
      triggerClassName={cn(hasErrors && 'border-destructive', triggerClassName)}
    />
  );
}

FormSelectDomain.displayName = 'FormSelectDomain';
