import { List } from '@/components/list/list';
import { RUNTIME_TYPES } from '@/constants/options';
import { RuntimeType } from '@/resources/interfaces/workload.interface';
import { Handle, Position } from '@xyflow/react';
import { useMemo } from 'react';

export interface IRuntimeNode {
  label: string;
  instanceType: string;
  runtimeType: string;
  // VM-specific fields
  sshKey?: string;
  vmPorts?: string;
  isCompact?: boolean;
  [key: string]: unknown;
}

export const RuntimeNode = ({ data }: { data: IRuntimeNode }) => {
  const baseClass = 'relative rounded-lg border border-pink-200 bg-pink-50 px-4 py-2 shadow-md';
  const sizeClass = data.isCompact ? 'w-[280px]' : 'w-[300px]';

  // Determine if this is a VM runtime
  const isVM = data.runtimeType === RuntimeType.VM;

  const listItems = useMemo(() => {
    return [
      { label: 'Instance Type', content: data.instanceType },
      {
        label: 'Runtime Type',
        content: RUNTIME_TYPES[data.runtimeType as keyof typeof RUNTIME_TYPES].label,
      },
    ];
  }, [data]);

  return (
    <div className={`${baseClass} ${sizeClass}`}>
      <Handle type="target" position={Position.Top} id="target" className="h-4 w-4 bg-blue-500" />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="h-4 w-4 bg-blue-500"
      />
      {isVM && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="source-bottom"
          className="h-4 w-4 bg-blue-500"
        />
      )}

      <div className="flex flex-col gap-2">
        <div className="text-primary dark:text-primary-foreground text-lg font-semibold">
          {data.label}
        </div>
        <List
          items={listItems}
          itemClassName="text-primary dark:text-primary-foreground justify-between px-0 text-sm border-none py-0 [&:not(:first-child)]:pt-1.5"
        />
      </div>
    </div>
  );
};
