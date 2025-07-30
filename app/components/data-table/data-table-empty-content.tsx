import { DataTableEmptyContentProps } from './data-table.types';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/misc';
import { Link } from 'react-router';

// Common styles that don't change across sizes
const BASE_STYLES = {
  container:
    'flex h-full max-h-72 flex-col items-center justify-center rounded-lg border-2 border-dashed gap-3',
  titleContainer: 'flex flex-col items-center mb-2',
  title: 'text-lg font-semibold',
  subtitle: 'text-sm text-muted-foreground',
  actionsContainer: 'flex items-center',
  button: 'flex items-center gap-1 text-sm',
} as const;

// Size-specific configurations (only what changes)
const SIZE_CONFIG = {
  sm: {
    image: 'size-32',
    actionsGap: 'gap-1.5',
  },
  md: {
    image: 'size-40',
    actionsGap: 'gap-3',
  },
  lg: {
    image: 'size-56',
    actionsGap: 'gap-3',
  },
} as const;

type DataTableEmptyContentSize = keyof typeof SIZE_CONFIG;

export const DataTableEmptyContent = ({
  title = 'No data found',
  subtitle = 'There is no data to display.',
  size = 'md',
  actions = [],
}: DataTableEmptyContentProps) => {
  const sizeStyles = SIZE_CONFIG[size as DataTableEmptyContentSize];

  const renderAction = (action: NonNullable<DataTableEmptyContentProps['actions']>[0]) => {
    const buttonContent = (
      <Button size="sm" variant={action.variant} className={cn(BASE_STYLES.button)}>
        {action.icon}
        <span>{action.label}</span>
      </Button>
    );

    if (action.type === 'link' || action.type === 'external-link') {
      return (
        <Link
          key={action.label}
          to={action.to ?? ''}
          target={action.type === 'external-link' ? '_blank' : '_self'}>
          {buttonContent}
        </Link>
      );
    }

    return (
      <Button
        key={action.label}
        size="sm"
        onClick={action.onClick}
        variant={action.variant}
        className={cn(BASE_STYLES.button)}>
        {action.icon}
        <span>{action.label}</span>
      </Button>
    );
  };

  return (
    <div className={BASE_STYLES.container}>
      <div className={BASE_STYLES.titleContainer}>
        <h2 className={BASE_STYLES.title}>{title}</h2>
        <p className={BASE_STYLES.subtitle}>{subtitle}</p>
      </div>

      {actions.length > 0 && (
        <div className={cn(BASE_STYLES.actionsContainer, sizeStyles.actionsGap)}>
          {actions.map(renderAction)}
        </div>
      )}
    </div>
  );
};
