/**
 * The text an error carries itself: an Error's message, a thrown string, or
 * the `message` of a serialized error body. Empty text counts as none.
 */
export function errorOwnMessage(error: unknown): string | undefined {
  if (typeof error === 'string') return error || undefined;
  const message = (error as { message?: unknown } | null | undefined)?.message;
  return typeof message === 'string' && message ? message : undefined;
}

/**
 * The raw text to show under "Error details": the denial the server sent
 * (`originalMessage`), else the error's own message. Never the HTTP client's
 * "Request failed with status code N", which datum-ui's describeApiError
 * falls back to through `cause` and which would bury the server's sentence.
 */
export function errorRawText(error: unknown): string | undefined {
  const original = (error as { originalMessage?: unknown } | null | undefined)?.originalMessage;
  return typeof original === 'string' && original ? original : errorOwnMessage(error);
}
