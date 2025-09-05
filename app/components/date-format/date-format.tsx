import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useApp } from '@/providers/app.provider';
import { cn } from '@/utils/common';
import { format as dateFormat } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { enUS } from 'date-fns/locale/en-US';

export const DATE_FORMAT = `MMMM d, yyyy hh:mmaaa`;
export const DateFormat = ({
  date,
  format = DATE_FORMAT,
  className,
  showTooltip = true,
  timezone,
  disableTimezone = false,
}: {
  date: string | Date;
  format?: string;
  className?: string;
  showTooltip?: boolean;
  timezone?: string;
  disableTimezone?: boolean;
}) => {
  const { userPreferences } = useApp();
  const parsedDate = date instanceof Date ? date : new Date(date);

  if (!date || isNaN(parsedDate.getTime())) {
    return null;
  }

  if (disableTimezone) {
    return (
      <span className={cn(className)}>{dateFormat(parsedDate, format, { locale: enUS })}</span>
    );
  }

  const timeZone = timezone ?? userPreferences?.timezone ?? 'Etc/GMT';
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(showTooltip ? 'cursor-pointer' : 'pointer-events-none cursor-default')}
        asChild>
        <span className={cn(className)}>
          {formatInTimeZone(parsedDate, timeZone, format, { locale: enUS })}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {timeZone.replace('_', ' ')}&nbsp; (
          {formatInTimeZone(parsedDate, timeZone, 'zzz', { locale: enUS })})
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
