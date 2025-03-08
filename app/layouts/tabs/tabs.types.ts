import { LucideIcon } from 'lucide-react'

export interface TabsProps {
  children: React.ReactNode
  className?: string
  widthClassName?: string
  tabsTitle?: TabsTitleProps
  navs?: TabsNavProps[]
}

export interface TabsNavProps {
  value: string
  label: string
  to: string
  icon?: LucideIcon
}

export interface TabsTitleProps {
  title?: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}
