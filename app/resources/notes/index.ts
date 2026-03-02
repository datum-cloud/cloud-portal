// Schema exports
export {
  noteResourceSchema,
  createNoteInputSchema,
  type Note,
  type CreateNoteInput,
} from './note.schema';

// Adapter exports
export { toNote, toNoteList, toCreateNotePayload } from './note.adapter';

// Service exports
export { createNoteService, noteKeys, type NoteService } from './note.service';

// Query hook exports
export { useNotes, useCreateNote, useDeleteNote } from './note.queries';
