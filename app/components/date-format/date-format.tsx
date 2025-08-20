import { cn } from '@/utils/common';
import { format as _format } from 'date-fns';

export const DATE_FORMAT = `MMMM d, yyyy HH:mm`;
export const DateFormat = ({
  date,
  format = DATE_FORMAT,
  className,
}: {
  date: string | Date;
  format?: string;
  className?: string;
}) => {
  const parsedDate = date instanceof Date ? date : new Date(date);

  if (!date || isNaN(parsedDate.getTime())) {
    return null;
  }

  return <span className={cn(className)}>{_format(parsedDate, format)}</span>;
};
