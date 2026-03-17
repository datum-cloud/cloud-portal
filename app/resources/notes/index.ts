// Schema exports
export {
  subjectRefSchema,
  noteSchema,
  createNoteSchema,
  updateNoteSchema,
  NOTE_MAX_HTML_LENGTH,
  NOTE_MAX_TEXT_LENGTH,
  type SubjectRef,
  type Note,
  type CreateNoteInput,
  type UpdateNoteInput,
} from './note.schema';

// Adapter exports
export { toNote, toNoteList, toCreateNotePayload } from './note.adapter';

// Service exports
export { createNoteService, noteKeys, type NoteService } from './note.service';

// Query hook exports
export { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from './note.queries';
