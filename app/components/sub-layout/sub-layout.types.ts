import { NavItem } from '@datum-ui/components/sidebar';
import { ReactNode } from 'react';

export interface SubLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  sidebarHeader?: string | ReactNode;
  className?: string;
  containerClassName?: string;
  contentClassName?: string;
}
