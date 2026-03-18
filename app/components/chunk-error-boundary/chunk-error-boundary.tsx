import { Component, type ReactNode } from 'react';

interface ChunkErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error boundary that catches chunk load failures (stale deployments, network issues).
 * Shows a fallback UI instead of crashing the entire page.
 */
export class ChunkErrorBoundary extends Component<
  ChunkErrorBoundaryProps,
  ChunkErrorBoundaryState
> {
  constructor(props: ChunkErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ChunkErrorBoundaryState {
    // Catch chunk load failures (dynamic import errors)
    if (
      error.message.includes('Importing a module script failed') ||
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Loading CSS chunk')
    ) {
      return { hasError: true };
    }
    // Re-throw non-chunk errors to parent error boundaries
    throw error;
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="bg-muted flex h-64 w-full items-center justify-center rounded-lg border">
            <div className="flex flex-col items-center gap-2">
              <p className="text-muted-foreground text-sm">Failed to load component.</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-primary text-sm underline">
                Reload page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
