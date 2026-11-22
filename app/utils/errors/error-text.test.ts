import { AppError } from './app-error';
import { errorOwnMessage, errorRawText } from './error-text';
import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

describe('errorOwnMessage', () => {
  it("reads an Error's message, a thrown string and a serialized body", () => {
    expect(errorOwnMessage(new Error('boom'))).toBe('boom');
    expect(errorOwnMessage('boom')).toBe('boom');
    expect(errorOwnMessage({ status: 403, message: 'boom' })).toBe('boom');
  });

  it('has nothing for empty or message-less values', () => {
    expect(errorOwnMessage(new Error(''))).toBeUndefined();
    expect(errorOwnMessage(undefined)).toBeUndefined();
    expect(errorOwnMessage({ status: 403 })).toBeUndefined();
  });
});

describe('errorRawText', () => {
  it('prefers the raw text the server sent', () => {
    expect(errorRawText({ message: 'plain', originalMessage: 'raw' })).toBe('raw');
  });

  it("falls back to the error's own message, never the HTTP client's", () => {
    const error = new AppError('The server said this.', {
      status: 409,
      cause: new AxiosError('Request failed with status code 409'),
    });
    expect(errorRawText(error)).toBe('The server said this.');
  });
});
