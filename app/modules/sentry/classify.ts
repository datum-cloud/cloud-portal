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

/**
 * Walk the `cause` chain (bounded — wrappers may nest, e.g. a route-level
 * AppError wrapping the interceptor's AppError wrapping the AxiosError)
 * looking for a no-response AxiosError. Stops at the first AxiosError found:
 * one WITH a response is a real upstream reply, so the wrapper's own status
 * decides the class.
 */
const MAX_CAUSE_DEPTH = 4;

function hasNoResponseAxiosCause(error: unknown): boolean {
  let current = resolveCause(error);
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current != null; depth++) {
    if (isAxiosError(current)) return !current.response;
    current = resolveCause(current);
  }
  return false;
}

export function classifyError(error: unknown): ErrorClass {
  if (isAxiosError(error)) {
    // No response: request never completed (network/timeout/DNS).
    if (!error.response) return 'network-failure';
    return classifyStatus(error.response.status);
  }
  // Interceptor-wrapped network failure: AppError carries a fallback 500
  // status but the original no-response AxiosError somewhere in `cause`.
  if (hasNoResponseAxiosCause(error)) return 'network-failure';
  return classifyStatus(resolveStatus(error));
}

export function isExpectedUserError(error: unknown): boolean {
  return classifyError(error) === 'expected-user-state';
}
