import { EmptyContent, EmptyContentProps } from '@/components/empty-content/empty-content';

// Keep the old interface for backward compatibility
export interface DataTableEmptyContentProps {
  title?: string;
  subtitle?: string;
  image?: string;
  size?: 'sm' | 'md' | 'lg';
  actions?: Array<{
    type: 'button' | 'link' | 'external-link';
    label: string;
    onClick?: () => void;
    to?: string;
    variant?: 'default' | 'destructive';
    icon?: React.ReactNode;
  }>;
}

/**
 * @deprecated Use EmptyContent from @/components/empty-content/empty-content instead
 * This component is kept for backward compatibility
 */
export const DataTableEmptyContent = (props: DataTableEmptyContentProps) => {
  // Map old props to new EmptyContent props
  const emptyContentProps: EmptyContentProps = {
    ...props,
    variant: 'dashed', // DataTable always used dashed variant
  };

  return <EmptyContent {...emptyContentProps} />;
};
