/**
 * Error classification — single source of truth for Sentry capture policy.
 *
 * Duck-types every error shape that occurs in this codebase (AppError,
 * AxiosError, React Router ErrorResponse, plain objects carrying a numeric
 * `status` — AppError's status survives React Router serialization as a
 * plain object) and resolves it to a class. Wrappers are unwrapped one
 * level: the axios interceptors rethrow no-response failures as AppErrors
 * with a fallback 500 status and the original AxiosError in `cause`, so a
 * no-response axios `cause` classifies as 'network-failure' before the
 * wrapper's status is consulted.
 *
 * Callers decide policy per environment: the client drops both
 * 'expected-user-state' and 'network-failure' (user connectivity is not a
 * bug); the server drops only 'expected-user-state' — server-side upstream
 * network failures are infra signals and stay captured.
 */
import { isUserFacingErrorStatus } from '@/utils/errors/app-error';
import { isAxiosError } from 'axios';
import { isRouteErrorResponse } from 'react-router';

export type ErrorClass = 'expected-user-state' | 'network-failure' | 'unknown-failure';

function classifyStatus(status: number | undefined): ErrorClass {
  return isUserFacingErrorStatus(status) ? 'expected-user-state' : 'unknown-failure';
}

function resolveStatus(error: unknown): number | undefined {
  if (isRouteErrorResponse(error)) return error.status;
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return undefined;
}

function resolveCause(error: unknown): unknown {
  if (typeof error === 'object' && error !== null && 'cause' in error) {
    return (error as { cause?: unknown }).cause;
  }
  return undefined;
}

export function classifyError(error: unknown): ErrorClass {
  if (isAxiosError(error)) {
    // No response: request never completed (network/timeout/DNS).
    if (!error.response) return 'network-failure';
    return classifyStatus(error.response.status);
  }
  // Interceptor-wrapped network failure: AppError carries a fallback 500
  // status but the original no-response AxiosError in `cause`.
  const cause = resolveCause(error);
  if (isAxiosError(cause) && !cause.response) return 'network-failure';
  return classifyStatus(resolveStatus(error));
}

export function isExpectedUserError(error: unknown): boolean {
  return classifyError(error) === 'expected-user-state';
}
