import { DataTableTitleProps } from './data-table.types'

export const DataTableTitle = ({ title, description, actions }: DataTableTitleProps) => {
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex flex-col justify-start gap-2">
        {title && <h1 className="text-2xl font-bold">{title}</h1>}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex justify-end gap-2">{actions}</div>}
    </div>
  )
}
