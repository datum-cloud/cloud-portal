import { DateTime } from '@/components/date-time';
import type { Note } from '@/resources/notes';
import { useDeleteNote } from '@/resources/notes';
import { Button, toast } from '@datum-ui/components';

interface NoteCardProps {
  note: Note;
  projectId: string;
  domainName: string;
  creatorDisplay?: string;
}

export const NoteCard = ({ note, projectId, domainName, creatorDisplay }: NoteCardProps) => {
  const { mutate: deleteNote, isPending: isDeleting } = useDeleteNote(projectId, domainName, {
    onSuccess: () => {
      toast.success('Note deleted');
    },
  });

  return (
    <article className="border-border bg-muted/30 rounded-lg border p-4">
      <p className="text-foreground text-sm break-words whitespace-pre-wrap">{note.content}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs">
          {note.creatorName && (
            <span className="truncate">
              Added by <span className="font-medium">{creatorDisplay ?? note.creatorName}</span>
            </span>
          )}
          {note.creatorName && <span aria-hidden="true">·</span>}
          <DateTime date={note.createdAt} variant="relative" className="shrink-0" />
        </div>
        <Button
          type="tertiary"
          theme="outline"
          size="small"
          onClick={() => deleteNote(note.name)}
          disabled={isDeleting}
          aria-label={isDeleting ? 'Deleting note...' : 'Delete note'}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </article>
  );
};
