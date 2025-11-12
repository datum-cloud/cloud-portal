import { ReactNode } from 'react';

export interface ContentWrapperProps {
  children: ReactNode;
  /**
   * Container wrapper className (applied to outer div)
   */
  containerClassName?: string;
  /**
   * Content area className (applied to inner div)
   */
  contentClassName?: string;
}
