import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

/**
 * `portal.page/project` extension component, exposed as `SamplePage`.
 *
 * Rendered by the host inside the catch-all mount
 * `/project/:projectId/services/:serviceSlug/*`. Because the host provides
 * react-router as a shared singleton, `useParams()` reads the host's route
 * params directly — the same hooks the built-in pages use. Styled with the
 * host-shared `@datum-cloud/datum-ui` components.
 *
 * data-testid attributes are stable hooks for the Playwright e2e suite.
 */
export default function SamplePage() {
  const [count, setCount] = useState(0);
  const params = useParams();

  return (
    <div data-testid="sample-plugin-page" className="flex flex-col gap-4 p-6">
      <div>
        <h1 data-testid="sample-plugin-heading" className="text-2xl font-semibold tracking-tight">
          Sample Plugin
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          This page is served by the <code>sample.miloapis.com</code> Module Federation remote and
          rendered inside the portal host through the plugin mount, styled with the host&apos;s
          shared <code>@datum-cloud/datum-ui</code> components.
        </p>
      </div>

      <p data-testid="sample-plugin-params" className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">project:</span>
        <Badge type="secondary" theme="light">
          {params.projectId ?? 'n/a'}
        </Badge>
        <span className="text-muted-foreground">service:</span>
        <Badge type="secondary" theme="light">
          {params.serviceSlug ?? 'n/a'}
        </Badge>
        <span className="text-muted-foreground">sub-path:</span>
        <Badge type="secondary" theme="light">
          {params['*'] || 'home'}
        </Badge>
      </p>

      <div>
        <Button
          htmlType="button"
          type="secondary"
          theme="outline"
          size="small"
          data-testid="sample-plugin-counter"
          onClick={() => setCount((c) => c + 1)}>
          Clicked <strong>{count}</strong> {count === 1 ? 'time' : 'times'}
        </Button>
      </div>

      <p className="text-sm">
        <Link
          data-testid="sample-plugin-detail-link"
          className="text-primary font-medium hover:underline"
          to={`/project/${params.projectId ?? ''}/services/${params.serviceSlug ?? 'sample'}/items/42`}>
          Open item 42 →
        </Link>
      </p>
    </div>
  );
}
