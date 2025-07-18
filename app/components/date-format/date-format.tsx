import { cn } from '@/utils/misc';
import { format as _format } from 'date-fns';

export const DATE_FORMAT = `MMMM d, yyyy 'at' h:mm`;
export const DateFormat = ({
  date,
  format = DATE_FORMAT,
  showAmPm = false,
  className,
}: {
  date: string | Date;
  format?: string;
  showAmPm?: boolean;
  className?: string;
}) => {
  const parsedDate = date instanceof Date ? date : new Date(date);

  if (!date || isNaN(parsedDate.getTime())) {
    return null;
  }

  const formattedDate = _format(parsedDate, format);
  const amPm = showAmPm ? _format(parsedDate, 'a').toLowerCase() : '';

  return (
    <div className={cn(className)}>
      {formattedDate} {amPm}
    </div>
  );
};
