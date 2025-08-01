import { Button } from '@/components/ui/button';

export interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  image?: string;
  size?: 'sm' | 'md' | 'lg';
  actions?: Array<{
    type: 'button' | 'link' | 'external-link';
    label: string;
    onClick?: () => void;
    to?: string;
    variant?: React.ComponentProps<typeof Button>['variant'];
    icon?: React.ReactNode;
  }>;
}
