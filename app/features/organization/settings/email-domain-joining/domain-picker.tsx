import { MAX_EMAIL_DOMAINS } from './email-domain-joining.schema';
import type { OrganizationDomain } from './organization-domains';
import { BadgeStatus } from '@/components/badge/badge-status';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useState } from 'react';
import { Link } from 'react-router';

interface DomainPickerProps {
  orgId: string;
  domains: OrganizationDomain[];
  /** The selected email domains. */
  value: string[];
  onChange: (value: string[]) => void;
  isLoading?: boolean;
  /** Projects whose Domains couldn't be read. */
  failedProjects?: string[];
  disabled?: boolean;
}

/**
 * Lets an owner choose email domains from the Domains in the organization's
 * projects. Only verified Domains can be chosen. Unverified ones are hidden
 * behind a toggle, each with a link to finish verifying it. A selected domain
 * that isn't verified any more (or a subdomain set outside the portal) stays
 * in the list so saving doesn't drop it unnoticed.
 */
export const DomainPicker = ({
  orgId,
  domains,
  value,
  onChange,
  isLoading,
  failedProjects = [],
  disabled,
}: DomainPickerProps) => {
  const verifiedNames = domains.filter((domain) => domain.verified).map((d) => d.domainName);
  const choosable = domains.filter(
    (domain) => domain.verified || value.includes(domain.domainName)
  );
  const unverified = domains.filter(
    (domain) => !domain.verified && !value.includes(domain.domainName)
  );
  const known = new Set(domains.map((domain) => domain.domainName));
  const otherSelected = value.filter((domainName) => !known.has(domainName));
  const hasChoices = choosable.length > 0 || otherSelected.length > 0;

  // Until the owner toggles it, show unverified Domains only when nothing is
  // verified yet, since they're the useful part then.
  const [unverifiedToggled, setUnverifiedToggled] = useState<boolean>();
  const showUnverified = unverifiedToggled ?? !hasChoices;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  const atLimit = value.length >= MAX_EMAIL_DOMAINS;
  const toggle = (domainName: string, checked: boolean) =>
    onChange(checked ? [...value, domainName] : value.filter((name) => name !== domainName));

  return (
    <div className="flex flex-col gap-2">
      {hasChoices ? (
        <ul className="border-border divide-border divide-y rounded-md border">
          {choosable.map((domain) => {
            const checked = value.includes(domain.domainName);
            return (
              <DomainRow
                key={domain.domainName}
                domainName={domain.domainName}
                detail={
                  domain.verified ? projectLabel(domain) : 'No longer verified in any project'
                }
                checked={checked}
                disabled={disabled || (!checked && atLimit)}
                onCheckedChange={(next) => toggle(domain.domainName, next)}
                verified={domain.verified}
              />
            );
          })}
          {otherSelected.map((domainName) => {
            const parent = verifiedNames.find((name) => domainName.endsWith(`.${name}`));
            return (
              <DomainRow
                key={domainName}
                domainName={domainName}
                detail={parent ? `Covered by ${parent}` : 'No longer verified in any project'}
                checked
                disabled={disabled}
                onCheckedChange={(next) => toggle(domainName, next)}
                verified={!!parent}
              />
            );
          })}
        </ul>
      ) : (
        <div className="border-border rounded-md border border-dashed px-4 py-5">
          <Text as="p" size="sm" weight="medium">
            No verified domains yet
          </Text>
          <Text as="p" size="sm" textColor="muted" className="mt-1">
            Add your company&apos;s domain to one of this organization&apos;s projects under
            Domains, and verify it with the DNS record or HTTP token shown there. It will appear
            here once it&apos;s verified.
          </Text>
          {unverified.length === 0 && (
            <Link
              to={getPathWithParams(paths.org.detail.projects.root, { orgId })}
              className="text-primary mt-3 inline-block text-sm hover:underline">
              Go to projects
            </Link>
          )}
        </div>
      )}

      {unverified.length > 0 && (
        <div className="flex flex-col gap-2">
          <Button
            htmlType="button"
            type="quaternary"
            theme="link"
            size="xs"
            className="w-fit px-0"
            onClick={() => setUnverifiedToggled(!showUnverified)}
            data-e2e="email-domain-joining-toggle-unverified">
            {showUnverified
              ? 'Hide unverified domains'
              : `Show ${unverified.length} unverified ${unverified.length === 1 ? 'domain' : 'domains'}`}
          </Button>
          {showUnverified && (
            <ul className="border-border divide-border divide-y rounded-md border border-dashed">
              {unverified.map((domain) => {
                const [firstProject] = domain.projects;
                return (
                  <li key={domain.domainName} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Text as="span" size="sm" textColor="muted" ellipsis>
                        {domain.domainName}
                      </Text>
                      <Text as="span" size="xs" textColor="muted" ellipsis>
                        {projectLabel(domain)}
                      </Text>
                    </div>
                    <Link
                      to={getPathWithParams(paths.project.detail.domains.detail.overview, {
                        projectId: firstProject.id,
                        domainId: firstProject.domainId,
                      })}
                      className="text-primary shrink-0 text-xs hover:underline">
                      Finish verifying
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {atLimit && (
        <Text as="p" size="xs" textColor="muted">
          You can choose up to {MAX_EMAIL_DOMAINS} domains.
        </Text>
      )}
      {failedProjects.length > 0 && (
        <Text as="p" size="xs" textColor="muted">
          Couldn&apos;t load domains from{' '}
          {failedProjects.length === 1 ? '1 project' : `${failedProjects.length} projects`}, so some
          may be missing.
        </Text>
      )}
    </div>
  );
};

function projectLabel(domain: OrganizationDomain): string {
  const [first] = domain.projects;
  return domain.projects.length > 1
    ? `${first.displayName} and ${domain.projects.length - 1} more`
    : first.displayName;
}

function DomainRow({
  domainName,
  detail,
  checked,
  disabled,
  onCheckedChange,
  verified,
}: {
  domainName: string;
  detail: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  verified: boolean;
}) {
  const id = `email-domain-${domainName}`;
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onCheckedChange(next === true)}
        className="size-4 shrink-0"
      />
      <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col">
        <Text as="span" size="sm" weight="medium" ellipsis>
          {domainName}
        </Text>
        <Text as="span" size="xs" textColor="muted" ellipsis>
          {detail}
        </Text>
      </label>
      {/* Same small badge as the Domains list in a project. */}
      <BadgeStatus
        status={verified ? 'success' : 'error'}
        label={verified ? 'Verified' : 'Unverified'}
      />
    </li>
  );
}
