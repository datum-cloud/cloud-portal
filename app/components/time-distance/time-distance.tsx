import { useApp } from '@/providers/app.provider';
import { formatDistanceToNowStrict } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useEffect, useState } from 'react';

interface TimeDistanceProps {
  date: string | Date;
  addSuffix?: boolean;
  className?: string;
  timezone?: string;
  disableTimezone?: boolean;
}

/**
 * Client-side component to prevent hydration mismatches with time-based formatting
 */
export const TimeDistance = ({
  date,
  addSuffix = true,
  className,
  timezone,
  disableTimezone = false,
}: TimeDistanceProps) => {
  const { userPreferences } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className={className}>...</span>;
  }

  const parsedDate = date instanceof Date ? date : new Date(date);

  if (!date || isNaN(parsedDate.getTime())) {
    return null;
  }

  // Use timezone-aware date if timezone is enabled
  let dateToCompare = parsedDate;
  if (!disableTimezone) {
    const timeZone = timezone ?? userPreferences?.timezone ?? 'Etc/GMT';
    dateToCompare = toZonedTime(parsedDate, timeZone);
  }

  return (
    <span className={className}>{formatDistanceToNowStrict(dateToCompare, { addSuffix })}</span>
  );
};
