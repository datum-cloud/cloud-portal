import { AuthService } from './auth.service';
import type { SessionValidationResult } from './auth.types';

export interface TokenRefreshEvent {
  userId: string;
  accessToken: string;
}

type RefreshHook = (event: TokenRefreshEvent) => void;

/**
 * SessionManager wraps AuthService.getValidSession() and notifies
 * a single registered hook whenever a token is successfully refreshed.
 *
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
  private refreshHook: RefreshHook | undefined;

  /**
   * Register a callback to be called after every successful token refresh.
   * Only one hook is active at a time; calling again replaces the previous hook
   * (e.g. in dev when the server module is re-executed, or with Vite HMR).
   */
  registerRefreshHook(callback: RefreshHook): void {
    this.refreshHook = callback;
  }

  async getValidSession(cookieHeader: string | null): Promise<SessionValidationResult> {
    const result = await AuthService.getValidSession(cookieHeader);

    if (result.refreshed && result.session) {
      this.refreshHook?.({
        userId: result.session.sub,
        accessToken: result.session.accessToken,
      });
    }

    return result;
  }
}

/**
 * Singleton SessionManager instance.
 * Initialized once at server start; wired to WatchHub in `app/server/entry.ts`.
 */
export const sessionManager = new SessionManager();
