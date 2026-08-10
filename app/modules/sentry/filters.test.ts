import {
  isKnownSystemEvent,
  isRouteMethodNotAllowedEvent,
  shouldDropSentryEvent,
  shouldDropSentryEventClient,
} from './filters';
import { AppError } from '@/utils/errors/app-error';
import type { Event, EventHint } from '@sentry/react-router';
import { afterAll, beforeEach, describe, expect, spyOn, test } from 'bun:test';

const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});

beforeEach(() => {
  warnSpy.mockClear();
});

afterAll(() => {
  warnSpy.mockRestore();
});

const systemActorEvent: Event = {
  exception: {
    values: [{ type: 'Error', value: 'the server rejected our request: user system:anonymous' }],
  },
};

const route405Event: Event = {
  message: 'Invalid request method "POST"',
};

const genericEvent: Event = {
  exception: {
    values: [{ type: 'TypeError', value: 'Cannot read properties of undefined' }],
  },
};

const hintFor = (originalException: unknown): EventHint => ({ originalException });

const appError404Hint = hintFor(new AppError('not found', { status: 404, captureToSentry: false }));

const axios429Hint = hintFor({
  isAxiosError: true,
  message: 'Request failed with status code 429',
  response: { status: 429 },
});

const networkFailureHint = hintFor({
  isAxiosError: true,
  message: 'Network Error',
  code: 'ECONNABORTED',
});

// The shape the client interceptor actually rejects with for a no-response
// failure: appErrorFromRaw wraps the AxiosError as AppError(status 500)
// with the original failure only in `cause`.
const wrappedNetworkFailureHint = hintFor(
  new AppError('Network Error', {
    status: 500,
    cause: { isAxiosError: true, message: 'Network Error', code: 'ECONNABORTED' },
    captureToSentry: false,
  })
);

const plainErrorHint = hintFor(new Error('boom'));

describe('shouldDropSentryEvent (base / server policy)', () => {
  test('no hint → existing filters unchanged', () => {
    expect(shouldDropSentryEvent(systemActorEvent)).toBe(true);
    expect(shouldDropSentryEvent(route405Event)).toBe(true);
    expect(shouldDropSentryEvent(genericEvent)).toBe(false);
  });

  test('hint with AppError 404 → dropped', () => {
    expect(shouldDropSentryEvent(genericEvent, appError404Hint)).toBe(true);
  });

  test('hint with AxiosError 429 → dropped', () => {
    expect(shouldDropSentryEvent(genericEvent, axios429Hint)).toBe(true);
  });

  test('hint with plain Error → kept', () => {
    expect(shouldDropSentryEvent(genericEvent, plainErrorHint)).toBe(false);
  });

  test('hint with network failure → kept (infra signal on the server)', () => {
    expect(shouldDropSentryEvent(genericEvent, networkFailureHint)).toBe(false);
  });

  test('hint without originalException → kept', () => {
    expect(shouldDropSentryEvent(genericEvent, {})).toBe(false);
  });

  test('leaked expected error warns outside production telemetry', () => {
    shouldDropSentryEvent(genericEvent, appError404Hint);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('[sentry-policy]');
  });

  test('kept events do not warn', () => {
    shouldDropSentryEvent(genericEvent, plainErrorHint);
    shouldDropSentryEvent(genericEvent, networkFailureHint);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('shouldDropSentryEventClient (client policy)', () => {
  test('drops everything the base filter drops', () => {
    expect(shouldDropSentryEventClient(systemActorEvent)).toBe(true);
    expect(shouldDropSentryEventClient(route405Event)).toBe(true);
    expect(shouldDropSentryEventClient(genericEvent, appError404Hint)).toBe(true);
  });

  test('hint with network failure → dropped (base keeps it)', () => {
    expect(shouldDropSentryEventClient(genericEvent, networkFailureHint)).toBe(true);
    expect(shouldDropSentryEvent(genericEvent, networkFailureHint)).toBe(false);
  });

  test('hint with interceptor-wrapped network failure → dropped (base keeps it)', () => {
    expect(shouldDropSentryEventClient(genericEvent, wrappedNetworkFailureHint)).toBe(true);
    expect(shouldDropSentryEvent(genericEvent, wrappedNetworkFailureHint)).toBe(false);
  });

  test('hint with plain Error → kept', () => {
    expect(shouldDropSentryEventClient(genericEvent, plainErrorHint)).toBe(false);
  });

  test('no hint → generic events kept', () => {
    expect(shouldDropSentryEventClient(genericEvent)).toBe(false);
  });
});

describe('individual filters still exported', () => {
  test('isKnownSystemEvent', () => {
    expect(isKnownSystemEvent(systemActorEvent)).toBe(true);
    expect(isKnownSystemEvent(genericEvent)).toBe(false);
  });

  test('isRouteMethodNotAllowedEvent', () => {
    expect(isRouteMethodNotAllowedEvent(route405Event)).toBe(true);
    expect(isRouteMethodNotAllowedEvent(genericEvent)).toBe(false);
  });
});
