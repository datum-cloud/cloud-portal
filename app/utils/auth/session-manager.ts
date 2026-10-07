import { AuthService } from './auth.service';
import type { SessionValidationResult } from './auth.types';

export interface TokenRefreshEvent {
  userId: string;
  accessToken: string;
}

type RefreshHook = (event: TokenRefreshEvent) => void;

/**
 * SessionManager wraps AuthService.getValidSession() and lets the server
 * register a single hook that runs after every successful token refresh.
 *
 * AuthService fires the hook itself, so it also covers refreshes that do not
 * go through getValidSession (a session found through a rotation link).
 * Only one hook is active at a time; calling registerRefreshHook again
 * replaces the previous hook (e.g. in dev when the server module is re-executed).
 *
 * Usage:
 * ```ts
 * sessionManager.registerRefreshHook(({ userId, accessToken }) => {
 *   watchHub.updateTokensByUserId(userId, accessToken);
 * });
 * ```
 */
class SessionManager {
  /**
   * Register a callback to be called after every successful token refresh.
   * Only one hook is active at a time; calling again replaces the previous hook
   * (e.g. in dev when the server module is re-executed, or with Vite HMR).
   */
  registerRefreshHook(callback: RefreshHook): void {
    AuthService.registerRefreshHook(callback);
  }

  getValidSession(cookieHeader: string | null): Promise<SessionValidationResult> {
    return AuthService.getValidSession(cookieHeader);
  }
}

/**
 * Singleton SessionManager instance.
 * Initialized once at server start; wired to WatchHub in `app/server/entry.ts`.
 */
export const sessionManager = new SessionManager();
