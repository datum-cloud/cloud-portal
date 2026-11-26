import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { DomainExpiration } from '@/features/edge/domain/expiration';
import { ExternalLink } from '@/features/edge/domain/external-link';
import { RegistrarBadge } from '@/features/edge/domain/registrar-badge';
import {
  type Domain,
  type DomainRegistration,
  describeRegistrationStatus,
  registrationCheckedAt,
} from '@/resources/domains';
import { type DnssecRisk, isDnssecOn } from '@/utils/helpers/dns';
import { toExternalHref } from '@/utils/helpers/url.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useMemo } from 'react';

export interface DomainRegistrationCardProps {
  domain: Domain;
  risk: DnssecRisk;
}

function DnssecContent({ domain, risk }: DomainRegistrationCardProps) {
  const registration: DomainRegistration | undefined = domain.status?.registration;
  const ds = registration?.dnssec?.ds ?? [];
  const parentName = registration?.domain
    ? registration.domain.trim().toLowerCase().replace(/\.$/, '')
    : 'the parent domain';

  const dsList = ds.length ? (
    <ul className="mt-2 space-y-1.5" data-e2e="domain-registration-ds-records">
      {ds.map((record, index) => (
        <li
          key={`${record.keyTag}-${record.digest}-${index}`}
          className="text-muted-foreground text-xs break-all">
          Key tag {record.keyTag} · Algorithm {record.algorithm} · Digest type {record.digestType} ·{' '}
          <span className="font-mono">{record.digest}</span>
        </li>
      ))}
    </ul>
  ) : null;

  switch (risk) {
    case 'off':
      return <Text size="sm">Off</Text>;
    case 'unknown':
      return (
        <Tooltip message="We'll show DNSSEC here once we've looked up this domain's registration.">
          {/* Focusable so keyboard and screen-reader users can reach the explanation. */}
          <Text
            size="sm"
            textColor="muted"
            tabIndex={0}
            className="w-fit cursor-help underline decoration-dotted underline-offset-2">
            Unknown
          </Text>
        </Tooltip>
      );
    case 'on-not-hosted':
      return (
        <div>
          <Text size="sm">
            <span className="font-medium">On.</span> If you move this domain&apos;s DNS to Datum
            later, remove the DS record at your registrar first.
          </Text>
          {dsList}
        </div>
      );
    case 'parent': {
      const on = isDnssecOn(registration);
      return (
        <div>
          <Text size="sm">
            <span className="font-medium">{on === null ? 'Unknown' : on ? 'On' : 'Off'}.</span> This
            is DNSSEC for {parentName}, the parent domain. It doesn&apos;t affect this subdomain on
            Datum.
          </Text>
          {dsList}
        </div>
      );
    }
    default:
      return (
        <div>
          <Text size="sm">On</Text>
          {dsList}
        </div>
      );
  }
}

export const DomainRegistrationCard = ({ domain, risk }: DomainRegistrationCardProps) => {
  const listItems: ListItem[] = useMemo(() => {
    const registration: DomainRegistration | undefined = domain.status?.registration;
    if (!registration) return [];

    // Client/server status pairs share a label; show one badge per label.
    const statusBadges = new Map<string, { label: string; codes: string[]; isWarning: boolean }>();
    for (const code of (registration.statuses ?? []).filter((c) => c.trim() !== '')) {
      const status = describeRegistrationStatus(code);
      const existing = statusBadges.get(status.label);
      statusBadges.set(status.label, {
        label: status.label,
        codes: [...(existing?.codes ?? []), status.code],
        isWarning: (existing?.isWarning ?? false) || status.tone === 'warning',
      });
    }
    const statuses = [...statusBadges.values()];
    const checkedAt = registrationCheckedAt(registration);
    const registryUrl = registration.registry?.url
      ? toExternalHref(registration.registry.url)
      : undefined;

    return [
      {
        label: 'Registrar',
        hidden: !registration.registrar?.name && !registration.registrar?.ianaID,
        content: (
          <div className="flex flex-wrap items-center gap-2">
            <RegistrarBadge
              registration={registration}
              className="rounded-xl text-sm font-normal"
            />
            {registration.registrar?.ianaID && (
              <Text size="sm" textColor="muted">
                IANA ID {registration.registrar.ianaID}
              </Text>
            )}
          </div>
        ),
      },
      {
        label: 'Registry',
        hidden: !registration.registry?.name,
        content: registryUrl ? (
          <ExternalLink href={registryUrl}>{registration.registry?.name}</ExternalLink>
        ) : (
          <Text size="sm">{registration.registry?.name}</Text>
        ),
      },
      {
        label: 'Registered',
        hidden: !registration.createdAt,
        content: (
          <DateTime
            className="text-sm"
            variant="relative"
            addSuffix
            date={registration.createdAt ?? ''}
          />
        ),
      },
      {
        label: 'Last updated',
        hidden: !registration.updatedAt,
        content: (
          <DateTime
            className="text-sm"
            variant="relative"
            addSuffix
            date={registration.updatedAt ?? ''}
          />
        ),
      },
      {
        label: 'Expires',
        hidden: !registration.expiresAt,
        content: <DomainExpiration expiresAt={registration.expiresAt} />,
      },
      {
        label: 'Status',
        hidden: statuses.length === 0,
        content: (
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((status) => (
              <Tooltip key={status.label} message={status.codes.join(', ')}>
                <Badge
                  type={status.isWarning ? 'warning' : 'quaternary'}
                  className="rounded-xl text-sm font-normal">
                  {status.label}
                </Badge>
              </Tooltip>
            ))}
          </div>
        ),
        className: 'sm:items-start',
      },
      {
        label: 'DNSSEC',
        content: <DnssecContent domain={domain} risk={risk} />,
        className: 'sm:items-start',
      },
      {
        label: 'Source',
        hidden: !registration.source,
        content: (
          <Text size="sm">
            <span className="uppercase">{registration.source}</span>
            {checkedAt && (
              <>
                {' · checked '}
                <DateTime className="text-sm" variant="relative" addSuffix date={checkedAt} />
              </>
            )}
          </Text>
        ),
      },
    ];
  }, [domain, risk]);

  if (!listItems.length) return null;

  return (
    <Card
      size="sm"
      sectioned
      className="w-full overflow-hidden"
      data-e2e="domain-registration-card">
      <CardContent padding="none">
        <div className="px-4 pt-3 pb-1">
          <Text size="sm" weight="semibold">
            Registration
          </Text>
        </div>
        <List
          items={listItems}
          itemClassName="py-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-x-4"
          labelClassName="text-muted-foreground font-normal"
        />
      </CardContent>
    </Card>
  );
};
