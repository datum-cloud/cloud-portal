import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { TriangleAlert } from 'lucide-react';
import { Component, type ReactNode } from 'react';

interface PluginErrorBoundaryProps {
  /** Plugin slug, shown in the fallback so the failing plugin is identifiable. */
  slug: string;
  displayName?: string;
  /**
   * Bumped by the parent (e.g. on navigation) to reset the boundary after a
   * crash, so moving to another plugin page re-attempts rendering.
   */
  resetKey?: string;
  children: ReactNode;
}

interface PluginErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Isolates a plugin's rendered subtree: any error thrown while rendering plugin
 * code is caught here and replaced with a friendly card, so a misbehaving
 * plugin degrades to an error state within its mount instead of taking down the
 * portal shell. Unlike {@link ChunkErrorBoundary}, this catches *all* errors —
 * a plugin is untrusted-enough code that nothing it throws should escape.
 */
export class PluginErrorBoundary extends Component<
  PluginErrorBoundaryProps,
  PluginErrorBoundaryState
> {
  constructor(props: PluginErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): PluginErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidUpdate(prev: PluginErrorBoundaryProps) {
    // Reset when the parent signals a new render target (path change) so the
    // user isn't stuck on the error card after navigating elsewhere.
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const name = this.props.displayName ?? this.props.slug;
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="bg-warning/10 text-warning flex size-12 items-center justify-center rounded-full">
              <Icon icon={TriangleAlert} className="size-6" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold">This plugin ran into a problem</p>
              <p className="text-muted-foreground text-sm">
                The {name} plugin failed to render. The rest of the portal is unaffected.
              </p>
            </div>
            <Button
              htmlType="button"
              type="primary"
              theme="solid"
              size="small"
              onClick={() => this.setState({ hasError: false, error: undefined })}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}
