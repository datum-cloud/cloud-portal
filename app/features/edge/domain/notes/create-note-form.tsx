import type { CreateNoteInput } from '@/resources/notes';
import { useCreateNote } from '@/resources/notes';
import { Button, toast } from '@datum-ui/components';
import { useState } from 'react';

interface CreateNoteFormProps {
  projectId: string;
  domainName: string;
}

const MAX_LENGTH = 1000;

export const CreateNoteForm = ({ projectId, domainName }: CreateNoteFormProps) => {
  const [content, setContent] = useState('');

  const { mutate: createNote, isPending } = useCreateNote(projectId, domainName, {
    onSuccess: () => {
      setContent('');
      toast.success('Note added');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.length > MAX_LENGTH) return;
    const input: CreateNoteInput = { content: content.trim(), domainName };
    createNote(input);
  };

  const isOverLimit = content.length > MAX_LENGTH;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a note..."
        rows={3}
        maxLength={MAX_LENGTH + 1}
        aria-label="Note content"
        aria-describedby="note-char-count"
        className="border-input bg-background placeholder:text-muted-foreground focus:ring-ring w-full resize-none rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="flex items-center justify-between">
        <span
          id="note-char-count"
          className={`text-xs ${isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
          aria-live="polite">
          {content.length}/{MAX_LENGTH}
        </span>
        <Button type="primary" theme="solid" size="small" htmlType="submit" disabled={!canSubmit}>
          {isPending ? 'Saving...' : 'Add Note'}
        </Button>
      </div>
    </form>
  );
};
