import { DateTime } from '@/components/date-time';
import { ProfileIdentity } from '@/components/profile-identity';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { getInitials } from '@/utils/helpers/text.helper';
import { Badge } from '@datum-ui/components';
import { Card, CardContent } from '@shadcn/ui/card';
import { Building2, ChevronRight, UserRound } from 'lucide-react';

export const OrganizationListCard = ({ org }: { org: IOrganization }) => {
  const displayName = org?.displayName ?? org?.name ?? '';
  const initials = getInitials(displayName);
  const fallbackIcon = org?.type === OrganizationType.Personal ? UserRound : Building2;
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
              <h3 className="text-foreground text-lg leading-5 font-semibold">
                {org?.displayName ?? org?.name ?? ''}
              </h3>
              {org.type === OrganizationType.Personal && (
                <Badge variant="secondary" className="rounded-full text-xs font-normal">
                  Personal
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{org?.name}</p>
            {org?.createdAt && (
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <span>Created on</span> <DateTime date={org?.createdAt} format="MMM do, yyyy" />
              </div>
            )}
          </div>
        </div>

        <ChevronRight size={24} className="text-muted-foreground" />
      </CardContent>
    </Card>
  );
};
