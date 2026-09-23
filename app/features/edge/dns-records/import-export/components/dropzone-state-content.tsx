import { DropzoneContent } from '@datum-cloud/datum-ui/dropzone';
import { Icon, SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
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
          <Text as="p" size="xs" weight="normal" textColor="muted">
            Parsing zone file...
          </Text>
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
          <Text as="p" size="xs" weight="normal" textColor="destructive">
            {errorMessage || 'Failed to parse file'}
          </Text>
        }
      />
    );
  }

  return null;
};
