import { NoteCard } from './note-card';
import { NoteFormDialog } from './note-form-dialog';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { useApp } from '@/providers/app.provider';
import { useDeleteNote, useNotes } from '@/resources/notes/note.queries';
import type { Note, SubjectRef } from '@/resources/notes/note.schema';
import { createUserService, userKeys } from '@/resources/users';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { LoaderOverlay } from '@datum-cloud/datum-ui/loader-overlay';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useQueries } from '@tanstack/react-query';
import { NotepadText, PlusIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

interface NotesSectionProps {
  projectId: string;
  subjectRef: SubjectRef;
}

export function NotesSection({ projectId, subjectRef }: NotesSectionProps) {
  const { user } = useApp();
  const { data: notes, isLoading, error } = useNotes(projectId, subjectRef);
  const { confirm } = useConfirmationDialog();

  const [formOpen, setFormOpen] = useState(false);
  const [editNote, setEditNote] = useState<Note | undefined>();

  const deleteNote = useDeleteNote(projectId, subjectRef, {
    onSuccess: () => {
      toast.success('Note', { description: 'Note deleted successfully' });
    },
    onError: (error) => {
      toast.error('Note', { description: error.message });
    },
  });

  const creatorIds = useMemo(
    () => [...new Set((notes ?? []).map((n) => n.creatorName).filter((id): id is string => !!id))],
    [notes]
  );

  const userQueries = useQueries({
    queries: creatorIds.map((id) => ({
      queryKey: userKeys.detail(id),
      queryFn: () => createUserService().get(id),
    })),
  });

  const creatorNames = useMemo(() => {
    return Object.fromEntries(
      creatorIds.map((id, i) => {
        const user = userQueries[i]?.data;
        return [id, user?.fullName ?? user?.email ?? id];
      })
    );
  }, [creatorIds, userQueries]);

  const sorted = [...(notes ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleEdit = (n: Note) => {
    setEditNote(n);
    setFormOpen(true);
  };

  const handleDelete = async (n: Note) => {
    await confirm({
      title: 'Delete Note',
      description: 'Are you sure you want to delete this note? This action cannot be undone.',
      submitText: 'Delete',
      variant: 'destructive',
      showConfirmInput: false,
      onSubmit: async () => {
        await deleteNote.mutateAsync(n.name);
      },
    });
  };

  const handleCreateOpen = () => {
    setEditNote(undefined);
    setFormOpen(true);
  };

  return (
    <>
      <Card className="relative h-full w-full overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
        <CardContent className="flex flex-col gap-4 p-0 sm:px-6 sm:pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Icon icon={NotepadText} size={20} className="text-secondary stroke-2" />
              <span className="text-base font-semibold">Notes</span>
            </div>
            <Button
              type="primary"
              size="xs"
              onClick={handleCreateOpen}
              icon={<PlusIcon className="size-3" />}
              aria-label="Add note"
              iconPosition="left">
              Add Note
            </Button>
          </div>

          {isLoading ? (
            <div className="relative flex min-h-[120px] items-center justify-center">
              <LoaderOverlay message="Loading notes..." className="relative inset-auto" />
            </div>
          ) : error ? (
            <p className="text-muted-foreground flex min-h-[120px] items-center justify-center text-center text-sm">
              Failed to load notes. Please refresh the page to try again.
            </p>
          ) : (sorted ?? []).length === 0 ? (
            <p className="text-muted-foreground flex min-h-[120px] items-center justify-center text-center text-sm">
              No notes yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {sorted.map((n) => (
                <NoteCard
                  key={n.uid || n.name}
                  note={n}
                  creatorDisplay={
                    n.creatorName ? (creatorNames[n.creatorName] ?? n.creatorName) : 'Unknown'
                  }
                  isOwner={n.creatorName === user?.sub}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NoteFormDialog
        projectId={projectId}
        subjectRef={subjectRef}
        note={editNote}
        creatorDisplay={
          editNote?.creatorName
            ? (creatorNames[editNote.creatorName] ?? editNote.creatorName)
            : undefined
        }
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </>
  );
}
