import { List } from '@/components/list/list';
import { TextCopy } from '@/components/text-copy/text-copy';
import { MetadataSchema } from '@/resources/schemas/metadata.schema';
import { getShortId } from '@/utils/misc';
import { Handle, Position } from '@xyflow/react';
import { useMemo } from 'react';

export interface IWorkloadNode extends MetadataSchema {
  label: string;
  name: string;
  isCompact?: boolean;
  [key: string]: unknown;
}

export const WorkloadNode = ({ data }: { data: IWorkloadNode }) => {
  const { isCompact } = data;

  const baseClass = 'relative rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-md';
  const sizeClass = isCompact ? 'w-[300px]' : 'w-[350px]';

  const listItems = useMemo(() => {
    return [
      {
        label: 'UID',
        content: (
          <TextCopy
            className="text-primary dark:text-primary-foreground text-sm"
            buttonClassName="text-primary dark:text-primary-foreground dark:hover:bg-transparent"
            value={(data.uid ?? '') as string}
            text={getShortId((data.uid ?? '') as string)}
          />
        ),
        hidden: !data.uid,
      },
      /* {
        label: 'Annotations',
        content: (
          <div className="flex flex-wrap justify-end gap-1">
            {(data.annotations ?? []).map((annotation) => (
              <Badge key={annotation} variant="outline">
                {annotation}
              </Badge>
            ))}
          </div>
        ),
        hidden: (data.annotations ?? []).length === 0,
      },
      {
        label: 'Labels',
        content: (
          <div className="flex flex-wrap justify-end gap-1">
            {(data.labels ?? []).map((label) => (
              <Badge key={label} variant="outline">
                {label}
              </Badge>
            ))}
          </div>
        ),
        hidden: (data.labels ?? []).length === 0,
      }, */
    ];
  }, [data]);

  return (
    <div className={`${baseClass} ${sizeClass}`}>
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="h-4 w-4 bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        className="h-4 w-4 bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="h-4 w-4 bg-blue-500"
      />
      <div className="flex flex-col gap-2">
        <div className="text-primary dark:text-primary-foreground text-lg font-semibold">
          {data.name}
        </div>
        <List
          items={listItems}
          itemClassName="text-primary dark:text-primary-foreground justify-between px-0 text-base border-none py-0 [&:not(:first-child)]:pt-1.5 "
        />
      </div>
    </div>
  );
};
