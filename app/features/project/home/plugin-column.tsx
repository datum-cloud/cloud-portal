import { ResourceColumnFrame, ResourceColumnSkeleton } from './resource-column';
import { LazyPluginComponent } from '@/modules/plugins/client/lazy-plugin-component';
import type { HomeColumn } from '@/modules/plugins/client/plugin-columns';
import { PluginErrorBoundary } from '@/modules/plugins/client/plugin-error-boundary';
import { pluginHref } from '@/modules/project-nav/merge-plugin-nav';

/** One plugin-contributed column inside the shared home column frame. */
export function ProjectHomePluginColumn({
  projectId,
  column: { plugin, pluginRef, column },
}: {
  projectId: string;
  column: HomeColumn;
}) {
  const { title, path, component } = column.properties;
  const href = path === undefined ? undefined : pluginHref(projectId, plugin.slug, path);

  return (
    <ResourceColumnFrame
      title={title}
      href={href}
      testId={`project-home-plugin-${plugin.slug}`}
      // Plugin bodies set their own height, so they scroll inside the fixed-height card.
      bodyClassName="overflow-y-auto">
      <PluginErrorBoundary
        slug={plugin.slug}
        displayName={plugin.displayName}
        resetKey={component.$codeRef}>
        <LazyPluginComponent
          pluginRef={pluginRef}
          codeRef={component.$codeRef}
          fallback={<ResourceColumnSkeleton label={title} />}
        />
      </PluginErrorBoundary>
    </ResourceColumnFrame>
  );
}
