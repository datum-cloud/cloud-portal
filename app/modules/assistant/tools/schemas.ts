import { z } from 'zod';

export const projectIdParam = z.object({
  projectId: z.string().describe('The project k8s name (e.g. "my-project-abc123")'),
});
