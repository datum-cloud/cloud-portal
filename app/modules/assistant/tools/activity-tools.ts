import { createActivityLogService } from '@/resources/activity-logs';
import { tool } from 'ai';
import { z } from 'zod';

export function createActivityTools() {
  return {
    queryActivityLogs: tool({
      description:
        'Query recent activity logs for a project — shows who did what and when.' +
        ' Call this when the user asks about recent changes, audit trail, or project history.',
      inputSchema: z.object({
        projectId: z.string().describe('The project k8s name'),
        hoursBack: z
          .number()
          .int()
          .min(1)
          .max(720)
          .default(24)
          .describe('How many hours back to search (default 24)'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe('Max number of entries to return (default 20)'),
      }),
      execute: async ({
        projectId,
        hoursBack,
        limit,
      }: {
        projectId: string;
        hoursBack: number;
        limit: number;
      }) => {
        const now = new Date();
        const start = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
        const result = await createActivityLogService().query({
          scope: { type: 'project', projectId },
          startTime: start.toISOString(),
          endTime: now.toISOString(),
          limit,
        });
        return {
          items: result.items.map(({ id: _id, userId: _uid, ...rest }) => rest),
          hasMore: result.hasMore,
          window: `${hoursBack}h`,
        };
      },
    }),
  };
}
