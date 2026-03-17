import { z } from 'zod';

// Generic subject reference — works for any K8s resource
export const subjectRefSchema = z.object({
  apiGroup: z.string(),
  kind: z.string(),
  name: z.string(),
  namespace: z.string().optional(),
});

export type SubjectRef = z.infer<typeof subjectRefSchema>;

// Domain Note type (after adapter transformation)
export const noteSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string(),
  resourceVersion: z.string(),
  createdAt: z.coerce.date(),
  content: z.string(),
  creatorName: z.string().optional(),
  subjectRef: subjectRefSchema,
});

export type Note = z.infer<typeof noteSchema>;

/** Max HTML string length allowed by the K8s CRD */
export const NOTE_MAX_HTML_LENGTH = 1000;

/** Max text characters shown in the UX counter (500 text + formatting overhead fits within 1000 CRD limit) */
export const NOTE_MAX_TEXT_LENGTH = 500;

// Input schemas — validate text content presence; HTML length checked pre-submit
export const createNoteSchema = z.object({
  content: z
    .string({ error: 'Please write a note before submitting' })
    .min(1, 'Please write a note before submitting'),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = z.object({
  content: z
    .string({ error: 'Note content cannot be empty' })
    .min(1, 'Note content cannot be empty'),
});

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
