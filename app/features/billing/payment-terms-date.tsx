import { DateTime } from '@/components/date-time';

/**
 * A day on the payment terms pages, such as "October 2, 2026", in the
 * user's timezone like the rest of the app.
 */
export function PaymentTermsDate({ date }: { date: string }) {
  return <DateTime date={date} variant="absolute" format="MMMM d, yyyy" tooltip={false} />;
}
