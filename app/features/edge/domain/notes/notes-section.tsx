import { CreateNoteForm } from './create-note-form';
import { NoteCard } from './note-card';
import { useNotes } from '@/resources/notes';
import { createUserService, userKeys } from '@/resources/users';
import { Card, CardContent } from '@datum-ui/components';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

interface NotesSectionProps {
  projectId: string;
  domainName: string;
}

export const NotesSection = ({ projectId, domainName }: NotesSectionProps) => {
  const { data: notes, isLoading, error } = useNotes(projectId, domainName);

  // Collect unique creator IDs from notes
  const creatorIds = useMemo(
    () => [...new Set((notes ?? []).map((n) => n.creatorName).filter((id): id is string => !!id))],
    [notes]
  );

  // Fetch user details for each creator ID in parallel
  const userQueries = useQueries({
    queries: creatorIds.map((id) => ({
      queryKey: userKeys.detail(id),
      queryFn: () => createUserService().get(id),
    })),
  });

  // Build a map from user ID to display name
  const creatorNames = useMemo(() => {
    return Object.fromEntries(
      creatorIds.map((id, i) => {
        const user = userQueries[i]?.data;
        return [id, user?.fullName ?? user?.email ?? id];
      })
    );
  }, [creatorIds, userQueries]);

  // Sort newest-first by createdAt
  const sorted = [...(notes ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
      <CardContent className="p-0 sm:px-6 sm:pb-4">
        <h3 className="mb-4 text-sm font-semibold">Notes</h3>

        {isLoading ? (
          <p className="text-muted-foreground mb-4 text-sm">Loading notes...</p>
        ) : error ? (
          <p className="text-muted-foreground mb-4 text-sm">
            Failed to load notes. Please refresh the page to try again.
          </p>
        ) : sorted.length === 0 ? (
          <p className="text-muted-foreground mb-4 text-sm">
            No notes yet. Use the form below to add the first note.
          </p>
        ) : (
          <div className="mb-4 flex flex-col gap-3">
            {sorted.map((note) => (
              <NoteCard
                key={note.uid || note.name}
                note={note}
                projectId={projectId}
                domainName={domainName}
                creatorDisplay={note.creatorName ? creatorNames[note.creatorName] : undefined}
              />
            ))}
          </div>
        )}

        <CreateNoteForm projectId={projectId} domainName={domainName} />
      </CardContent>
    </Card>
  );
};
