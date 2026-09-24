export interface FeedbackInput {
  userId: string;
  title: string;
  body: string;
  pageUrl: string;
}

export interface FeedbackSink {
  submit(input: FeedbackInput): Promise<{ id: string }>;
}
