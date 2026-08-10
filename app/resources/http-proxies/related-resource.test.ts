import { getRelatedResourceErrorStatus, resolveRelatedResource } from './related-resource';
import { AppError, AuthorizationError, NotFoundError } from '@/utils/errors/app-error';
import { describe, expect, test } from 'bun:test';

const axios404 = { response: { status: 404 } };
const axios403 = { response: { status: 403 } };

describe('getRelatedResourceErrorStatus', () => {
  test('reads status from AppError instances', () => {
    expect(getRelatedResourceErrorStatus(new NotFoundError('SecurityPolicy', 'my-proxy'))).toBe(
      404
    );
    expect(getRelatedResourceErrorStatus(new AuthorizationError())).toBe(403);
    expect(getRelatedResourceErrorStatus(new AppError('boom', { status: 500 }))).toBe(500);
  });

  test('reads status from AxiosError-shaped objects', () => {
    expect(getRelatedResourceErrorStatus(axios404)).toBe(404);
    expect(getRelatedResourceErrorStatus(axios403)).toBe(403);
  });

  test('prefers a numeric top-level status over response.status', () => {
    expect(getRelatedResourceErrorStatus({ status: 404, response: { status: 500 } })).toBe(404);
  });

  test('returns undefined for statusless errors', () => {
    expect(getRelatedResourceErrorStatus(new Error('network down'))).toBeUndefined();
    expect(getRelatedResourceErrorStatus(null)).toBeUndefined();
    expect(getRelatedResourceErrorStatus(undefined)).toBeUndefined();
    expect(getRelatedResourceErrorStatus({ status: 'not-a-number' })).toBeUndefined();
  });
});

describe('resolveRelatedResource', () => {
  test('wraps a successful fetch as ok with its data', async () => {
    const result = await resolveRelatedResource(async () => ({ items: [1, 2] }));
    expect(result).toEqual({ state: 'ok', data: { items: [1, 2] } });
  });

  test('404 resolves to absent with null data (renders "not configured")', async () => {
    const result = await resolveRelatedResource(async () => {
      throw new NotFoundError('SecurityPolicy', 'my-proxy');
    });
    expect(result).toEqual({ state: 'absent', data: null });
  });

  test('403 resolves to forbidden with null data (renders permission state)', async () => {
    const result = await resolveRelatedResource(async () => {
      throw new AuthorizationError();
    });
    expect(result).toEqual({ state: 'forbidden', data: null });
  });

  test('handles raw AxiosError-shaped rejections the same way', async () => {
    await expect(
      resolveRelatedResource(async () => {
        throw axios404;
      })
    ).resolves.toEqual({ state: 'absent', data: null });
    await expect(
      resolveRelatedResource(async () => {
        throw axios403;
      })
    ).resolves.toEqual({ state: 'forbidden', data: null });
  });

  test('rethrows unexpected errors by default', async () => {
    const boom = new AppError('boom', { status: 500 });
    await expect(
      resolveRelatedResource(async () => {
        throw boom;
      })
    ).rejects.toBe(boom);

    const networkError = new Error('network down');
    await expect(
      resolveRelatedResource(async () => {
        throw networkError;
      })
    ).rejects.toBe(networkError);
  });

  test('absorbs unexpected errors when onUnexpected is absorb, preserving the error', async () => {
    const boom = new AppError('boom', { status: 500 });
    const result = await resolveRelatedResource(
      async () => {
        throw boom;
      },
      { onUnexpected: 'absorb' }
    );
    expect(result.state).toBe('error');
    expect(result.data).toBeNull();
    expect(result.error).toBe(boom);
  });

  test('404/403 win over the absorb option (state stays specific)', async () => {
    const result = await resolveRelatedResource(
      async () => {
        throw axios403;
      },
      { onUnexpected: 'absorb' }
    );
    expect(result).toEqual({ state: 'forbidden', data: null });
  });
});
