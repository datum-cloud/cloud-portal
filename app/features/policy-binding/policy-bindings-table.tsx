import { DataTable } from '@/components/data-table/data-table';
import { DateFormat } from '@/components/date-format/date-format';
import { StatusBadge } from '@/components/status-badge/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import { IPolicyBindingControlResponse } from '@/resources/interfaces/policy-binding.interface';
import { ColumnDef } from '@tanstack/react-table';
import { Users } from 'lucide-react';
import { useMemo } from 'react';

interface PolicyBindingsTableProps {
  data: IPolicyBindingControlResponse[];
  emptyTitle?: string;
}

// Helper component for resource reference tooltip
const ResourceRefTooltip = ({
  resourceRef,
}: {
  resourceRef: NonNullable<IPolicyBindingControlResponse['resourceSelector']>['resourceRef'];
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="cursor-help">{resourceRef?.name}</span>
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

// Helper component for resource kind tooltip
const ResourceKindTooltip = ({
  resourceKind,
}: {
  resourceKind: NonNullable<IPolicyBindingControlResponse['resourceSelector']>['resourceKind'];
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="cursor-help">{resourceKind?.kind}</span>
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

// Helper function to render resource cell content
const renderResourceCell = (
  resourceSelector: IPolicyBindingControlResponse['resourceSelector']
) => {
  if (resourceSelector?.resourceRef) {
    return <ResourceRefTooltip resourceRef={resourceSelector.resourceRef} />;
  }

  if (resourceSelector?.resourceKind) {
    return <ResourceKindTooltip resourceKind={resourceSelector.resourceKind} />;
  }

  return '-';
};

export const PolicyBindingsTable = ({
  data,
  emptyTitle = 'No Policy Binding found.',
}: PolicyBindingsTableProps) => {
  const columns: ColumnDef<IPolicyBindingControlResponse>[] = useMemo(() => {
    return [
      {
        header: 'Resource Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return <span className="text-primary font-semibold">{row.original.name}</span>;
        },
      },
      {
        header: 'Role',
        accessorKey: 'roleRef',
        cell: ({ row }) => {
          return row.original.roleRef?.name;
        },
      },
      {
        header: 'Resource',
        accessorKey: 'resourceSelector',
        cell: ({ row }) => renderResourceCell(row.original.resourceSelector),
      },
      {
        header: 'Subjects',
        accessorKey: 'subjects',
        enableSorting: false,
        meta: {
          className: 'w-[80px] flex items-center justify-center',
        },
        cell: ({ row }) => {
          if (row.original.subjects.length === 0) {
            return '-';
          }

          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="flex size-8 items-center gap-1 focus:ring-0">
                  <Users className="size-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="min-w-[300px]">
                <div className="space-y-4">
                  {(() => {
                    const subjects = row.original.subjects;
                    const users = subjects?.filter((s) => s.kind === 'User') || [];
                    const groups = subjects?.filter((s) => s.kind === 'Group') || [];

                    return (
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
                                      <Badge
                                        variant="outline"
                                        className="text-muted-foreground text-xs">
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
                            <div className="mb-2 text-sm font-semibold">
                              Groups ({groups.length})
                            </div>
                            <ul className="ml-6 list-disc space-y-1 text-sm">
                              {groups.map((group) => (
                                <li key={`group-${group.name}`}>
                                  <div className="flex items-center justify-between gap-1">
                                    <span>{group.name}</span>
                                    {group.namespace && (
                                      <Badge
                                        variant="outline"
                                        className="text-muted-foreground text-xs">
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
                    );
                  })()}
                </div>
              </PopoverContent>
            </Popover>
          );
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          return (
            row.original.status && (
              <StatusBadge
                status={transformControlPlaneStatus(row.original.status)}
                type="badge"
                readyText="Active"
              />
            )
          );
        },
      },
      {
        header: 'Created At',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateFormat date={row.original.createdAt} />;
        },
      },
    ];
  }, []);

  return <DataTable columns={columns} data={data ?? []} emptyContent={{ title: emptyTitle }} />;
};
