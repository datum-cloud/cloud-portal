import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Button } from '@datum-cloud/datum-ui/button';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import type { ReactNode } from 'react';

/**
 * A section of a billing tab with more than one: a heading and a line of
 * supporting copy above full-width card(s). A tab with a single section
 * needs neither; the tab names it.
 */
export const BillingSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-4">
    <div className="flex flex-col gap-1">
      <Title as="h2" level={6} weight="medium" textColor="default">
        {title}
      </Title>
      {description ? (
        <Text as="p" size="sm" textColor="muted" className="leading-relaxed">
          {description}
        </Text>
      ) : null}
    </div>
    <div className="flex flex-col gap-4">{children}</div>
  </section>
);

/**
 * Where a list the page couldn't read goes, instead of a card saying there
 * are none: loading in the browser, then an error with a retry.
 */
export const BillingListUnloaded = ({
  what,
  isError,
  onRetry,
}: {
  what: string;
  isError: boolean;
  onRetry: () => void;
}) =>
  isError ? (
    <Alert variant="destructive" data-e2e="billing-load-error">
      <AlertTitle className="text-sm">Couldn&apos;t load {what}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        <span>Billing didn&apos;t answer. Your {what} are unchanged.</span>
        <Button htmlType="button" type="quaternary" theme="outline" size="xs" onClick={onRetry}>
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  ) : (
    <Text as="p" size="sm" textColor="muted">
      Loading {what}…
    </Text>
  );
