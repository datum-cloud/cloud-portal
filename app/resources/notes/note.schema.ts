import { resourceMetadataSchema } from '@/resources/base/base.schema';
import { z } from 'zod';

// Domain Note type (after adapter transformation)
export const noteResourceSchema = resourceMetadataSchema.omit({ displayName: true }).extend({
  content: z.string(),
  creatorName: z.string().optional(),
  subjectRefName: z.string().optional(),
  subjectRefKind: z.string().optional(),
});

export type Note = z.infer<typeof noteResourceSchema>;

// Input for creating a note
export const createNoteInputSchema = z.object({
  content: z.string().min(1).max(1000),
  domainName: z.string(),
});

export type CreateNoteInput = z.infer<typeof createNoteInputSchema>;
