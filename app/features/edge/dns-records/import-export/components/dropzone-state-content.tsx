import { DropzoneContent } from '@datum-ui/components/dropzone/dropzone';
import { Loader2, TriangleAlert } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export type DropzoneState = 'idle' | 'loading' | 'error' | 'success';

interface DropzoneStateContentProps {
  state: DropzoneState;
  errorMessage: string | null;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Dropzone state content for loading and error states
 */
export const DropzoneStateContent = ({ state, errorMessage }: DropzoneStateContentProps) => {
  if (state === 'loading') {
    return (
      <DropzoneContent
        icon={<Loader2 className="text-primary mb-3 size-9! animate-spin stroke-1" size={36} />}
        description={
          <p className="text-muted-foreground text-xs font-normal">Parsing zone file...</p>
        }
      />
    );
  }

  if (state === 'error') {
    return (
      <DropzoneContent
        icon={<TriangleAlert className="text-destructive mb-3 size-9! stroke-1" size={36} />}
        description={
          <p className="text-destructive text-xs font-normal">
            {errorMessage || 'Failed to parse file'}
          </p>
        }
      />
    );
  }

  return null;
};
