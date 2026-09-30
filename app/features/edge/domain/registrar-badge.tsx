import type { DomainRegistration } from '@/resources/domains';
import { toExternalHref } from '@/utils/helpers/url.helper';
import { Badge, type BadgeProps } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ExternalLinkIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface RegistrarBadgeProps {
  registration?: DomainRegistration | null;
  className?: string;
  badgeType?: BadgeProps['type'];
  badgeTheme?: BadgeProps['theme'];
  /** Rendered when the registration has no registrar at all. Defaults to "-". */
  fallback?: ReactNode;
}

/**
 * Registrar name as reported by the domain's registration data.
 *
 * When the registrar record carries a usable website, the badge becomes an
 * outbound link so the operator can jump straight to where nameservers are
 * changed. A registration with no registrar name but with other registration
 * data means WHOIS privacy is hiding it, so the badge says "Private".
 *
 * Every state renders inside `data-e2e="domain-registrar"`; the linked state
 * additionally exposes the anchor as `data-e2e="domain-registrar-link"`.
 */
export function RegistrarBadge({
  registration,
  className,
  badgeType = 'quaternary',
  badgeTheme = 'outline',
  fallback = '-',
}: RegistrarBadgeProps) {
  const name = registration?.registrar?.name;
  const href = toExternalHref(registration?.registrar?.url);

  return (
    <span data-e2e="domain-registrar" className="inline-flex">
      <RegistrarContent
        name={name}
        href={href}
        hasRegistration={!!registration}
        className={className}
        badgeType={badgeType}
        badgeTheme={badgeTheme}
        fallback={fallback}
      />
    </span>
  );
}

interface RegistrarContentProps extends Omit<RegistrarBadgeProps, 'registration'> {
  name?: string;
  href: string | null;
  hasRegistration: boolean;
}

function RegistrarContent({
  name,
  href,
  hasRegistration,
  className,
  badgeType,
  badgeTheme,
  fallback,
}: RegistrarContentProps) {
  if (!name) {
    if (!hasRegistration) return <>{fallback}</>;
    return (
      <Tooltip message="Registrar information is not publicly available. This is common when WHOIS privacy protection is enabled.">
        <Badge type={badgeType} theme={badgeTheme} className={className}>
          Private
        </Badge>
      </Tooltip>
    );
  }

  if (!href) {
    return (
      <Badge type={badgeType} theme={badgeTheme} className={className}>
        {name}
      </Badge>
    );
  }

  return (
    <Tooltip message={`Open ${name} in a new tab`}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={`${name} (opens in new tab)`}
        className="focus-visible:ring-ring inline-flex rounded-xl focus-visible:ring-2 focus-visible:outline-none"
        data-e2e="domain-registrar-link">
        <Badge
          type={badgeType}
          theme={badgeTheme}
          className={cn('inline-flex items-center gap-1.5 hover:underline', className)}>
          {name}
          <Icon icon={ExternalLinkIcon} size={12} aria-hidden="true" />
        </Badge>
      </a>
    </Tooltip>
  );
}
