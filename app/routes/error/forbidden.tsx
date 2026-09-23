import { Button } from '@datum-cloud/datum-ui/button';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Link } from 'react-router';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <Text as="h1" size="2xl" weight="semibold">
        403 — Access denied
      </Text>
      <p className="text-muted-foreground max-w-md">
        You don&apos;t have permission to view this page. If you believe this is a mistake, contact
        an organization administrator.
      </p>
      <Link to="/">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}
