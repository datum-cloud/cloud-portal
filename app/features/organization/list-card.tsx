import { DateFormat } from '@/components/date-format/date-format';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { cn } from '@/utils/common';
import { getInitials } from '@/utils/text';
import { Building2, ChevronRight } from 'lucide-react';

export const OrganizationListCard = ({ org }: { org: IOrganization }) => {
  return (
    <Card className="hover:bg-accent/50 cursor-pointer py-4 transition-all">
      <CardContent className="flex flex-row items-center justify-between gap-4 px-4">
        {/* Left Side */}
        <div className="flex flex-row items-center gap-4">
          {/* Avatar */}
          <Avatar className="size-12 !rounded-md">
            <AvatarFallback
              className={cn(
                'rounded-md',
                org.type === OrganizationType.Personal
                  ? 'bg-navy text-cream'
                  : 'bg-orange text-cream'
              )}>
              {org.type === OrganizationType.Personal ? (
                <Building2 size={24} />
              ) : (
                <span className="text-lg">{getInitials(org?.displayName ?? org?.name ?? '')}</span>
              )}
            </AvatarFallback>
          </Avatar>
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
                <span>Created on</span> <DateFormat date={org?.createdAt} format="MMM do, yyyy" />
              </div>
            )}
          </div>
        </div>

        <ChevronRight size={24} className="text-muted-foreground" />
      </CardContent>
    </Card>
  );
};
