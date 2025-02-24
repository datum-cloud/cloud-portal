export const PageTitle = ({
  title,
  description,
  actions,
}: {
  title?: string
  description?: string
  actions?: React.ReactNode
}) => {
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex flex-col justify-start gap-1">
        {title && <h1 className="text-2xl font-bold">{title}</h1>}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex justify-end gap-1 pl-2">{actions}</div>}
    </div>
  )
}
