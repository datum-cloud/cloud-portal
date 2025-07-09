import { DateFormat } from '@/components/date-format/date-format';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { routes } from '@/constants/routes';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { cn, getInitials } from '@/utils/misc';
import { getPathWithParams } from '@/utils/path';
import { Building2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';

export const OrganizationListCard = ({ org }: { org: IOrganization }) => {
  const navigate = useNavigate();
  return (
    <Card
      className="hover:bg-accent/50 cursor-pointer py-4 transition-all"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        navigate(getPathWithParams(routes.org.projects.root, { orgId: org.name }));
      }}>
      <CardContent className="flex flex-row items-center justify-between gap-4 px-4">
        {/* Left Side */}
        <div className="flex flex-row items-center gap-4">
          {/* Avatar */}
          <Avatar className="size-12 !rounded-md">
            <AvatarFallback
              className={cn(
                'rounded-md',
                org.type === OrganizationType.Personal
                  ? 'bg-accent-foreground text-background'
                  : 'bg-sunglow-300 text-sunglow-foreground'
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
                <Badge variant="butter" className="rounded-full text-xs font-normal">
                  Personal
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{org?.name}</p>
            {org?.createdAt && (
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <span>Created on</span> <DateFormat date={org?.createdAt} format="MMM dd, yyyy" />
              </div>
            )}
          </div>
        </div>

        <ChevronRight size={24} className="text-muted-foreground" />
      </CardContent>
    </Card>
  );
};
