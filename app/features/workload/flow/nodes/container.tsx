import { IGroupNode } from '../types'
import { List } from '@/components/list/list'
import { Button } from '@/components/ui/button'
import { Handle, Position } from '@xyflow/react'
import { SquarePlusIcon, SquareMinusIcon } from 'lucide-react'
import { useMemo } from 'react'

export interface IContainerNode {
  label: string
  name: string
  image: string
  ports: string
  isCompact?: boolean
  [key: string]: unknown
}

export const ContainerNode = ({ data }: { data: IContainerNode }) => {
  const baseClass =
    'relative rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 shadow-md'
  const sizeClass = data.isCompact ? 'w-[280px]' : 'w-[300px]'

  const listItems = useMemo(() => {
    return [
      { label: 'Image', content: data.image },
      { label: 'Ports', content: data.ports, hidden: !data.ports },
    ]
  }, [data])

  return (
    <div className={`${baseClass} ${sizeClass}`}>
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="h-4 w-4 bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="h-4 w-4 bg-blue-500"
      />
      <div className="flex flex-col gap-2">
        <div className="text-primary dark:text-primary-foreground text-lg font-semibold">
          {data.name}
        </div>
        <List
          items={listItems}
          itemClassName="text-primary dark:text-primary-foreground justify-between px-0 text-sm border-none py-0 [&:not(:first-child)]:pt-1.5"
        />
      </div>
    </div>
  )
}

export const ContainerGroupNode = ({ data }: { data: IGroupNode }) => {
  const baseClass =
    'relative rounded-lg border border-purple-500 bg-purple-50 px-4 py-2 shadow-md'
  const sizeClass = data.isCompact ? 'w-[220px]' : 'w-[280px]'
  const fontClass = data.isCompact ? 'text-sm' : 'text-lg'

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent node selection
    if (data.onToggle) data.onToggle()
  }

  return (
    <div className={`${baseClass} ${sizeClass}`}>
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="h-4 w-4 bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        className="h-4 w-4 bg-purple-500"
      />
      <div className="flex items-center justify-between">
        <div className={`font-bold ${fontClass} text-center text-purple-700`}>
          {data.label}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => handleToggle(e)}
          className="size-6 bg-transparent hover:bg-transparent">
          {data.isCollapsed ? (
            <SquarePlusIcon className="size-4 text-purple-700" />
          ) : (
            <SquareMinusIcon className="size-4 text-purple-700" />
          )}
        </Button>
      </div>
    </div>
  )
}
