import { DropzoneContent } from '@datum-cloud/datum-ui/dropzone';
import { Icon, SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { TriangleAlert } from 'lucide-react';

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
        icon={<SpinnerIcon size="xl" aria-hidden="true" />}
        description={
          <p className="text-muted-foreground text-xs font-normal">Parsing zone file...</p>
        }
      />
    );
  }

  if (state === 'error') {
    return (
      <DropzoneContent
        icon={
          <Icon icon={TriangleAlert} className="text-destructive mb-3 size-9! stroke-1" size={36} />
        }
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
