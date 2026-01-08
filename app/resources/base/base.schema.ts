import { z } from 'zod';

export const paginationParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationParamsSchema>;

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullish(),
    hasMore: z.boolean(),
  });

export type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export const resourceMetadataSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string().optional(),
  displayName: z.string(),
  description: z.string().optional(),
  resourceVersion: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
});

export type ResourceMetadata = z.infer<typeof resourceMetadataSchema>;
