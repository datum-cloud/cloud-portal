import { IGroupNode } from '../types';
import { List } from '@/components/list/list';
import { STORAGE_TYPES } from '@/features/workload/constants';
import { Button } from '@datum-ui/components';
import { Handle, Position } from '@xyflow/react';
import { SquarePlusIcon, SquareMinusIcon } from 'lucide-react';
import { useMemo } from 'react';

export interface IStorageNode {
  label: string;
  name: string;
  type: string;
  size: number;
  isCompact?: boolean;
}

export const StorageNode = ({ data }: { data: IStorageNode }) => {
  const baseClass = 'relative rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 shadow-md';
  const sizeClass = data.isCompact ? 'w-[250px]' : 'w-[280px]';

  const listItems = useMemo(() => {
    return [
      {
        label: 'Type',
        content: STORAGE_TYPES[data.type as keyof typeof STORAGE_TYPES].label,
      },
      { label: 'Size', content: `${data.size} Gi` },
    ];
  }, [data]);

  return (
    <div className={`${baseClass} ${sizeClass}`}>
      <Handle type="target" position={Position.Top} id="target" className="h-4 w-4 bg-blue-500" />
      <div className="flex flex-col gap-2">
        <div className="text-primary dark:text-primary-foreground text-lg font-semibold">
          {data.name}
        </div>
        <List
          items={listItems}
          itemClassName="text-primary dark:text-primary-foreground justify-between px-0 text-base border-none py-0 [&:not(:first-child)]:pt-1.5"
          labelClassName="min-w-20"
        />
      </div>
    </div>
  );
};

export const StorageGroupNode = ({ data }: { data: IGroupNode }) => {
  const baseClass =
    'relative rounded-lg border border-yellow-500 bg-yellow-50 px-4 py-2  shadow-md';
  const sizeClass = data.isCompact ? 'w-[220px]' : 'w-[280px]';
  const fontClass = data.isCompact ? 'text-sm' : 'text-lg';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node selection
    if (data.onToggle) data.onToggle();
  };

  return (
    <div className={`${baseClass} ${sizeClass}`}>
      <Handle type="target" position={Position.Top} id="target" className="h-4 w-4 bg-yellow-500" />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        className="h-4 w-4 bg-yellow-500"
      />
      <div className="flex items-center justify-between">
        <div className={`font-bold ${fontClass} text-center text-yellow-700`}>{data.label}</div>

        <Button
          type="quaternary"
          theme="borderless"
          size="icon"
          onClick={(e) => handleToggle(e)}
          className="size-6 bg-transparent hover:bg-transparent">
          {data.isCollapsed ? (
            <SquarePlusIcon className="size-4 text-yellow-700" />
          ) : (
            <SquareMinusIcon className="size-4 text-yellow-700" />
          )}
        </Button>
      </div>
    </div>
  );
};
