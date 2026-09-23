import { DateTime } from '@/components/date-time';
import { ProfileIdentity } from '@/components/profile-identity';
import type { Organization } from '@/resources/organizations';
import { getInitials } from '@/utils/helpers/text.helper';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Building2, ChevronRight, UserRound } from 'lucide-react';

export const OrganizationListCard = ({ org }: { org: Organization }) => {
  const displayName = org?.displayName ?? org?.name ?? '';
  const initials = getInitials(displayName);
  const fallbackIcon = org?.type === 'Personal' ? UserRound : Building2;
  return (
    <Card className="hover:bg-accent/50 cursor-pointer py-4 transition-all">
      <CardContent className="flex flex-row items-center justify-between gap-4 px-4">
        {/* Left Side */}
        <div className="flex flex-row items-center gap-4">
          {/* Avatar */}
          <ProfileIdentity
            name={displayName}
            fallbackText={initials}
            fallbackIcon={!initials ? fallbackIcon : undefined}
            size="lg"
          />
          {/* Organization Info */}
          <div className="flex flex-col gap-1">
            <div className="flex flex-row items-center gap-2">
              <Text as="h3" size="lg" weight="semibold" textColor="default" className="leading-5">
                {org?.displayName ?? org?.name ?? ''}
              </Text>
            </div>
            <Text as="p" textColor="muted">
              {org?.name}
            </Text>
            {org?.createdAt && (
              <Text as="div" size="xs" textColor="muted" className="flex items-center gap-1">
                <span>Created on</span> <DateTime date={org?.createdAt} format="MMM do, yyyy" />
              </Text>
            )}
          </div>
        </div>

        <Icon icon={ChevronRight} size={24} className="text-muted-foreground" />
      </CardContent>
    </Card>
  );
};
