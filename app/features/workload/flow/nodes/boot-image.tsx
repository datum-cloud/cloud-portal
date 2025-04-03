import { List } from '@/components/list/list'
import { Handle, Position } from '@xyflow/react'
import { useMemo } from 'react'

export interface IBootImageNode {
  label: string
  bootImage: string
  isCompact?: boolean
  [key: string]: unknown
}

export const BootImageNode = ({ data }: { data: IBootImageNode }) => {
  const baseClass =
    'relative rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 shadow-md'
  const sizeClass = data.isCompact ? 'w-[220px]' : 'w-[250px]'

  const listItems = useMemo(() => {
    return [{ label: 'Image', content: data.bootImage }]
  }, [data])

  return (
    <div className={`${baseClass} ${sizeClass}`}>
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="h-4 w-4 bg-blue-500"
      />
      <div className="flex flex-col gap-2">
        <div className="text-primary dark:text-primary-foreground text-lg font-semibold">
          {data.label}
        </div>
        <List
          items={listItems}
          className="text-primary dark:text-primary-foreground"
          itemClassName="justify-between px-0 text-base border-none py-0 [&:not(:first-child)]:pt-1.5"
          labelClassName="min-w-20"
        />
      </div>
    </div>
  )
}
