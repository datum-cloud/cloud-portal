import type { FeedbackInput, FeedbackSink } from './feedback-sink';

/** Default until enhancements#889 lands: records the submission in the server log. */
export function createLogFeedbackSink(
  log: (message: string, fields: Record<string, unknown>) => void
): FeedbackSink {
  return {
    async submit(input: FeedbackInput) {
      const id = crypto.randomUUID();
      log('website feedback received', {
        id,
        userId: input.userId,
        pageUrl: input.pageUrl,
        title: input.title,
      });
      return { id };
    },
  };
}
