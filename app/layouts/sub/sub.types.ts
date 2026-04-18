import { NavItem } from '@datum-cloud/datum-ui/app-navigation';
import { ReactNode } from 'react';

export interface SubLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  sidebarHeader?: string | ReactNode;
  className?: string;
  containerClassName?: string;
  contentClassName?: string;
}
