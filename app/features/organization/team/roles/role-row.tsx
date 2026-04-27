import type { UserRoleAssignment } from './roles-editor.types';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { XIcon } from 'lucide-react';

type RoleRowProps = {
  assignment: UserRoleAssignment;
  isPendingRemove: boolean;
  canManageRoles: boolean;
  onRemove: () => void;
};

export function RoleRow({ assignment, isPendingRemove, canManageRoles, onRemove }: RoleRowProps) {
  const roleDisplayName = assignment.role.displayName ?? assignment.role.name;
  const description = assignment.role.description;

  return (
    <div
      className={cn(
        'flex w-full items-center justify-between gap-3 border-b px-6 py-2.5 pl-10',
        isPendingRemove && 'bg-destructive/5 opacity-70'
      )}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={cn(
            'text-foreground text-sm font-semibold',
            isPendingRemove && 'text-destructive'
          )}>
          {roleDisplayName}
        </span>
        {description && !isPendingRemove && (
          <span className="text-muted-foreground truncate text-xs">{description}</span>
        )}
        {isPendingRemove && (
          <Badge type="danger" theme="light" className="text-[10px] font-bold uppercase">
            Removed
          </Badge>
        )}
      </div>

      {canManageRoles && (
        <>
          {isPendingRemove ? (
            <Button
              type="quaternary"
              theme="outline"
              size="xs"
              aria-label={`Undo remove ${roleDisplayName}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}>
              Undo
            </Button>
          ) : (
            <Tooltip message={`Remove ${roleDisplayName}`} side="left">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground shrink-0 p-1 transition-colors"
                aria-label={`Remove role ${roleDisplayName}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}>
                <Icon icon={XIcon} className="size-4" />
              </button>
            </Tooltip>
          )}
        </>
      )}
    </div>
  );
}
