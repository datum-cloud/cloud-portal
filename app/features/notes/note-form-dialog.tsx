import { NoteMeta } from './note-meta';
import { useCreateNote, useUpdateNote } from '@/resources/notes/note.queries';
import type { Note, SubjectRef } from '@/resources/notes/note.schema';
import {
  createNoteSchema,
  updateNoteSchema,
  NOTE_MAX_HTML_LENGTH,
  NOTE_MAX_TEXT_LENGTH,
} from '@/resources/notes/note.schema';
import { Form } from '@datum-cloud/datum-ui/form';
import { RichTextEditor } from '@datum-cloud/datum-ui/rich-text-editor';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useCallback } from 'react';

interface NoteFormDialogProps {
  projectId: string;
  subjectRef: SubjectRef;
  note?: Note;
  creatorDisplay?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteFormDialog({
  projectId,
  subjectRef,
  note,
  creatorDisplay,
  open,
  onOpenChange,
}: NoteFormDialogProps) {
  const isEdit = !!note;

  const createNote = useCreateNote(projectId, subjectRef, {
    onSuccess: () => {
      toast.success('Note', { description: 'Note created successfully' });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Note', { description: error.message });
    },
  });

  const updateNote = useUpdateNote(projectId, subjectRef, {
    onSuccess: () => {
      toast.success('Note', { description: 'Note updated successfully' });
      onOpenChange(false);
    },
    onError: (error) => {
      if (error.message.includes('409') || error.message.includes('Conflict')) {
        toast.error('Note', {
          description: 'This note was modified by someone else. Please close and try again.',
        });
        onOpenChange(false);
        return;
      }
      toast.error('Note', { description: error.message });
    },
  });

  const isPending = isEdit ? updateNote.isPending : createNote.isPending;

  const handleSubmit = useCallback(
    async (data: { content: string }) => {
      const html = data.content;
      if (!html || html.length > NOTE_MAX_HTML_LENGTH) {
        toast.error('Note', {
          description: 'Content is too long — try removing some formatting.',
        });
        return;
      }

      if (isEdit && note) {
        updateNote.mutate({ noteName: note.name, content: html });
      } else {
        createNote.mutate(html);
      }
    },
    [isEdit, note, createNote, updateNote]
  );

  const schema = isEdit ? updateNoteSchema : createNoteSchema;
  const displayName = creatorDisplay ?? note?.creatorName ?? 'Unknown';

  return (
    <Form.Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Note' : 'Add Note'}
      schema={schema}
      defaultValues={{ content: note?.content ?? '' }}
      onSubmit={handleSubmit}
      submitText={isEdit ? 'Save' : 'Add Note'}
      submitTextLoading={isEdit ? 'Saving...' : 'Adding...'}
      loading={isPending}
      className="w-full sm:max-w-2xl">
      {() => (
        <>
          <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
            <div>
              <Form.Field name="content">
                {({ control }) => (
                  <RichTextEditor
                    content={typeof control.value === 'string' ? control.value : ''}
                    onChange={(html) => control.change(html)}
                    onBlur={() => control.blur()}
                    autoFocus
                    maxLength={NOTE_MAX_TEXT_LENGTH}
                    placeholder="Write your note here..."
                    className="mb-4 min-h-[100px]">
                    <RichTextEditor.Toolbar>
                      <RichTextEditor.Bold />
                      <RichTextEditor.Italic />
                      <RichTextEditor.Underline />
                      <RichTextEditor.Strike />
                      <RichTextEditor.Separator />
                      <RichTextEditor.Link />
                    </RichTextEditor.Toolbar>
                    <RichTextEditor.Content />
                    <RichTextEditor.CharacterCount maxLength={NOTE_MAX_TEXT_LENGTH} />
                  </RichTextEditor>
                )}
              </Form.Field>

              {isEdit && note && (
                <NoteMeta creatorDisplay={displayName} createdAt={note.createdAt} />
              )}
            </div>
          </div>
        </>
      )}
    </Form.Dialog>
  );
}
