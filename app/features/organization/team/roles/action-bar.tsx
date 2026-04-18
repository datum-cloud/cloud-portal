import { Button } from '@datum-cloud/datum-ui/button';

type ActionBarProps = {
  pendingCount: number;
  addCount: number;
  removeCount: number;
  isSaving: boolean;
  onDiscard: () => void;
  onSave: () => void;
};

export function ActionBar({
  pendingCount,
  addCount,
  removeCount,
  isSaving,
  onDiscard,
  onSave,
}: ActionBarProps) {
  if (pendingCount === 0) return null;

  return (
    <div
      className="bg-muted/50 border-border flex items-center justify-between border-t px-6 py-3"
      role="region"
      aria-label="Pending changes"
      data-testid="action-bar">
      <p className="text-muted-foreground text-sm">
        <span className="text-foreground font-medium">{pendingCount}</span> pending change
        {pendingCount !== 1 ? 's' : ''}:
        {addCount > 0 && (
          <span className="ml-2 font-medium text-green-600 dark:text-green-400">
            +{addCount} role{addCount !== 1 ? 's' : ''}
          </span>
        )}
        {removeCount > 0 && (
          <span className="text-destructive ml-2 font-medium">
            -{removeCount} role{removeCount !== 1 ? 's' : ''}
          </span>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="secondary"
          size="small"
          onClick={onDiscard}
          disabled={isSaving}
          aria-label="Discard pending changes">
          Discard
        </Button>
        <Button
          type="primary"
          size="small"
          onClick={onSave}
          disabled={isSaving}
          aria-label={isSaving ? 'Saving changes' : 'Save changes'}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
