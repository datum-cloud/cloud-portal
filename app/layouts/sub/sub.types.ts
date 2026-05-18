import { type SubNavigationTab } from '@/components/sub-navigation';
import { ReactNode } from 'react';

export interface SubLayoutProps {
  children: ReactNode;
  navItems: SubNavigationTab[];

  /** Page title, rendered via `<PageTitle>`. */
  title?: string;
  /** Description rendered below the title via `<PageTitle>`'s description slot. */
  status?: ReactNode;
  /** Header-level actions, rendered via `<PageTitle>`'s actions slot. */
  actions?: ReactNode;

  className?: string;
  containerClassName?: string;
  contentClassName?: string;
}
