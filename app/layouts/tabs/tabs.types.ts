import { LucideIcon } from 'lucide-react';

export interface TabsProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  tabsTitle?: TabsTitleProps;
  navItems?: TabsNavProps[];
}

export interface TabsNavProps {
  value: string;
  label: string;
  to: string;
  icon?: LucideIcon;
  hidden?: boolean;
}

export interface TabsTitleProps {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}
