import { DataTableEmptyContentProps } from './data-table.types';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';
import { Theme, useTheme } from 'remix-themes';

export const DataTableEmptyContent = ({
  title = 'No data found',
  subtitle = 'There is no data to display.',
  image,
  actions = [],
}: DataTableEmptyContentProps) => {
  const [theme] = useTheme();
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <img src={`/images/empty-data-${theme}.svg`} alt="Datum" className="size-50" />
      <div className="my-5 flex flex-col items-center gap-4">
        <h2 className="text-2xl leading-2 font-semibold">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      {actions.length > 0 && (
        <div className="flex items-center gap-2">
          {actions.map((action) => {
            return action.type === 'link' || action.type === 'external-link' ? (
              <Link
                key={action.label}
                to={action.to ?? ''}
                target={action.type === 'external-link' ? '_blank' : '_self'}>
                <Button size="sm" variant={action.variant} className="flex items-center gap-2">
                  {action.icon}
                  <span>{action.label}</span>
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                key={action.label}
                onClick={action.onClick}
                variant={action.variant}
                className="flex items-center gap-2">
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
