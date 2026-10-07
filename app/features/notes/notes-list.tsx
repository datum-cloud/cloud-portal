import { NoteCard } from './note-card';
import { NoteFormDialog } from './note-form-dialog';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { useApp } from '@/providers/app.provider';
import { useDeleteNote, useNotes } from '@/resources/notes/note.queries';
import type { Note, SubjectRef } from '@/resources/notes/note.schema';
import { createUserService, userKeys } from '@/resources/users';
import { Button } from '@datum-cloud/datum-ui/button';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useQueries } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

interface NotesListProps {
  projectId: string;
  subjectRef: SubjectRef;
}

/**
 * A resource's notes, newest first, with an Add Note button. Renders inline
 * with no card around it so it can sit in a details table row.
 */
export function NotesList({ projectId, subjectRef }: NotesListProps) {
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
      <div className="flex flex-col items-start gap-2">
        {isLoading ? (
          <Text size="sm" textColor="muted" className="animate-pulse">
            Loading notes...
          </Text>
        ) : error ? (
          <Text size="sm" textColor="muted">
            Failed to load notes. Refresh the page to try again.
          </Text>
        ) : (
          sorted.length > 0 && (
            <div className="flex w-full flex-col gap-2">
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
          )
        )}
        {!isLoading && !error && (
          <Button
            type="quaternary"
            theme="outline"
            size="xs"
            onClick={handleCreateOpen}
            icon={<PlusIcon className="size-3" />}
            iconPosition="left">
            Add Note
          </Button>
        )}
      </div>

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
