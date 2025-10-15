import { PolicyBinding } from './policy-binding.types';
import { DateTime } from '@/components/date-time';
import { StatusBadge } from '@/components/status-badge/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { Users } from 'lucide-react';

export type ResourceTooltipProps = {
  resourceRef: NonNullable<PolicyBinding['resourceSelector']>['resourceRef'];
};

export const ResourceRefTooltip = ({ resourceRef }: ResourceTooltipProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="cursor-help break-words whitespace-normal">{resourceRef?.name}</span>
    </TooltipTrigger>
    <TooltipContent>
      <div className="space-y-1">
        {resourceRef?.apiGroup && (
          <div>
            <strong>API Group:</strong> {resourceRef.apiGroup}
          </div>
        )}
        <div>
          <strong>Kind:</strong> {resourceRef?.kind}
        </div>
        {resourceRef?.namespace && (
          <div>
            <strong>Namespace:</strong> {resourceRef.namespace}
          </div>
        )}
      </div>
    </TooltipContent>
  </Tooltip>
);

export type ResourceKindTooltipProps = {
  resourceKind: NonNullable<PolicyBinding['resourceSelector']>['resourceKind'];
};

export const ResourceKindTooltip = ({ resourceKind }: ResourceKindTooltipProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="cursor-help break-words whitespace-normal">{resourceKind?.kind}</span>
    </TooltipTrigger>
    <TooltipContent>
      <div className="space-y-1">
        {resourceKind?.apiGroup && (
          <div>
            <strong>API Group:</strong> {resourceKind.apiGroup}
          </div>
        )}
        <div>
          <strong>Kind:</strong> {resourceKind?.kind}
        </div>
        <div className="text-muted-foreground text-sm">Applies to all resources of this kind</div>
      </div>
    </TooltipContent>
  </Tooltip>
);

export const renderResourceCell = (resourceSelector: PolicyBinding['resourceSelector']) => {
  if (resourceSelector?.resourceRef) {
    return <ResourceRefTooltip resourceRef={resourceSelector.resourceRef} />;
  }

  if (resourceSelector?.resourceKind) {
    return <ResourceKindTooltip resourceKind={resourceSelector.resourceKind} />;
  }

  return '-';
};

export const renderSubjectsCell = (subjects: PolicyBinding['subjects']) => {
  if (!subjects || subjects.length === 0) {
    return '-';
  }

  const users = subjects.filter((subject) => subject.kind === 'User');
  const groups = subjects.filter((subject) => subject.kind === 'Group');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          className="flex size-8 items-center gap-1 focus:ring-0">
          <Users className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[300px]">
        <div className="space-y-4">
          {users.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold">Users ({users.length})</div>
              <ul className="ml-6 list-disc space-y-1 text-sm">
                {users.map((user) => (
                  <li key={`user-${user.name}`}>
                    <div className="flex items-center justify-between gap-1">
                      <span>{user.name}</span>
                      {user.namespace && (
                        <Badge variant="outline" className="text-muted-foreground text-xs">
                          {user.namespace}
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {groups.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold">Groups ({groups.length})</div>
              <ul className="ml-6 list-disc space-y-1 text-sm">
                {groups.map((group) => (
                  <li key={`group-${group.name}`}>
                    <div className="flex items-center justify-between gap-1">
                      <span>{group.name}</span>
                      {group.namespace && (
                        <Badge variant="outline" className="text-muted-foreground text-xs">
                          {group.namespace}
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const renderStatusCell = (status: PolicyBinding['status']) => {
  if (!status) {
    return '-';
  }

  return (
    <StatusBadge status={transformControlPlaneStatus(status)} type="badge" readyText="Active" />
  );
};

export const renderCreatedAtCell = (createdAt: PolicyBinding['createdAt']) => {
  if (!createdAt) {
    return '-';
  }

  return <DateTime date={createdAt} />;
};
