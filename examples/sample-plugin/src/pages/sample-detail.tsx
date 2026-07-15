import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Link, useParams } from 'react-router';

/**
 * Second `portal.page/project` extension, exposed as `SampleDetail` and
 * referenced by the manifest as `$codeRef: "SampleDetail.DetailView"` — i.e. a
 * NAMED export, not the default. This exercises the host's `parseCodeRef`
 * "Module.export" path (vs. the bare "Module" default-export path used by the
 * home page), and the `:itemId` route param resolving through the shared
 * react-router singleton. Styled with the host-shared datum-ui components.
 *
 * Reached at /project/:projectId/services/sample/items/:itemId.
 */
export function DetailView() {
  const params = useParams();

  return (
    <div data-testid="sample-plugin-detail" className="flex flex-col gap-4 p-6">
      <div>
        <h1
          data-testid="sample-plugin-detail-heading"
          className="text-2xl font-semibold tracking-tight">
          Sample Item Detail
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          This page is a second <code>portal.page/project</code> extension, resolved from a{' '}
          <strong>named export</strong> (<code>SampleDetail.DetailView</code>) at a parameterized
          path.
        </p>
      </div>

      <Card className="max-w-md">
        <CardContent>
          {/* Plain text ("itemId: 42") — the e2e suite asserts this exact string. */}
          <p data-testid="sample-plugin-detail-param" className="text-sm">
            <span className="text-muted-foreground font-medium">itemId: </span>
            <strong>{params.itemId ?? 'n/a'}</strong>
          </p>
        </CardContent>
      </Card>

      <p className="text-sm">
        <Link
          data-testid="sample-plugin-detail-back"
          className="text-primary font-medium hover:underline"
          to={`/project/${params.projectId ?? ''}/services/${params.serviceSlug ?? 'sample'}/home`}>
          ← back to Sample Plugin home
        </Link>
      </p>
    </div>
  );
}
