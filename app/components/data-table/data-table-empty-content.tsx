import { DataTableEmptyContentProps } from './data-table.types';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/misc';
import { Link } from 'react-router';
import { Theme, useTheme } from 'remix-themes';

export const DataTableEmptyContent = ({
  title = 'No data found',
  subtitle = 'There is no data to display.',
  image,
  size = 'md',
  actions = [],
}: DataTableEmptyContentProps) => {
  const [theme] = useTheme();

  // Size-based styling configurations
  const sizeConfig = {
    sm: {
      container: 'gap-3',
      image: 'size-32',
      titleContainer: 'mb-2',
      title: 'text-lg font-semibold',
      subtitle: 'text-sm text-muted-foreground',
      actionsContainer: 'gap-1.5',
      buttonSize: 'sm' as const,
      buttonStyle: 'text-sm',
    },
    md: {
      container: 'gap-5',
      image: 'size-40',
      titleContainer: 'mb-2',
      title: 'text-xl font-semibold',
      subtitle: 'text-base text-muted-foreground',
      actionsContainer: 'gap-3',
      buttonSize: 'default' as const,
      buttonStyle: 'text-sm',
    },
    lg: {
      container: 'gap-6',
      image: 'size-56',
      titleContainer: 'mb-2',
      title: 'text-2xl font-semibold',
      subtitle: 'text-base text-muted-foreground',
      actionsContainer: 'gap-3',
      buttonSize: 'lg' as const,
      buttonStyle: 'text-base',
    },
  };

  const styles = sizeConfig[size];

  return (
    <div className={`flex h-full flex-col items-center justify-center ${styles.container}`}>
      <img src={image || `/images/empty-data-${theme}.svg`} alt="Datum" className={styles.image} />
      <div className={`flex flex-col items-center ${styles.titleContainer}`}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      {actions.length > 0 && (
        <div className={`flex items-center ${styles.actionsContainer}`}>
          {actions.map((action) => {
            return action.type === 'link' || action.type === 'external-link' ? (
              <Link
                key={action.label}
                to={action.to ?? ''}
                target={action.type === 'external-link' ? '_blank' : '_self'}>
                <Button
                  size={styles.buttonSize}
                  variant={action.variant}
                  className={cn('flex items-center gap-2', styles.buttonStyle)}>
                  {action.icon}
                  <span>{action.label}</span>
                </Button>
              </Link>
            ) : (
              <Button
                size={styles.buttonSize}
                key={action.label}
                onClick={action.onClick}
                variant={action.variant}
                className={cn('flex items-center gap-2', styles.buttonStyle)}>
                {action.icon}
                <span>{action.label}</span>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
};
