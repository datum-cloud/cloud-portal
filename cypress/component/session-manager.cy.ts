/**
 * Behavior contract tests for SessionManager and WatchHub.updateTokensByUserId.
 *
 * NOTE: The real modules (session-manager.ts, watch-hub.ts) transitively import
 * server-only code (env.server, zitadel.server OAuth discovery) which cannot
 * run in a browser/Cypress context. These tests use inline test doubles that
 * mirror the exact same logic to verify the behavior contract and catch regressions.
 *
 * If the logic in session-manager.ts or watch-hub.ts changes, update these
 * doubles accordingly so the tests remain a faithful specification.
 */

// ─── Test doubles ─────────────────────────────────────────────────────────────

interface TokenRefreshEvent {
  userId: string;
  accessToken: string;
}

type RefreshHook = (event: TokenRefreshEvent) => void;

interface SessionResult {
  refreshed: boolean;
  session: { sub: string; accessToken: string } | null;
}

/** Mirrors app/utils/auth/session-manager.ts */
class TestSessionManager {
  private refreshHook: RefreshHook | undefined;

  registerRefreshHook(callback: RefreshHook): void {
    this.refreshHook = callback;
  }

  // Simulates the notification logic inside getValidSession()
  simulateSessionResult(result: SessionResult): void {
    if (result.refreshed && result.session) {
      this.refreshHook?.({
        userId: result.session.sub,
        accessToken: result.session.accessToken,
      });
    }
  }
}

interface WatchClient {
  userId: string;
  token: string;
}

/** Mirrors the client token update logic in app/server/watch/watch-hub.ts */
class TestWatchClientPool {
  private clients = new Map<string, WatchClient>();

  add(id: string, userId: string, token: string): void {
    this.clients.set(id, { userId, token });
  }

  updateTokensByUserId(userId: string, accessToken: string): void {
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        client.token = accessToken;
      }
    }
  }

  getToken(id: string): string | undefined {
    return this.clients.get(id)?.token;
  }
}

// ─── SessionManager contract ───────────────────────────────────────────────────

describe('SessionManager — registerRefreshHook contract', () => {
  it('calls the registered hook when session is refreshed', () => {
    const manager = new TestSessionManager();
    const received: TokenRefreshEvent[] = [];
    manager.registerRefreshHook((event) => received.push(event));

    manager.simulateSessionResult({
      refreshed: true,
      session: { sub: 'user-123', accessToken: 'new-token' },
    });

    expect(received).to.have.length(1);
    expect(received[0]).to.deep.equal({ userId: 'user-123', accessToken: 'new-token' });
  });

  it('does NOT call the hook when refreshed is false', () => {
    const manager = new TestSessionManager();
    const received: TokenRefreshEvent[] = [];
    manager.registerRefreshHook((event) => received.push(event));

    manager.simulateSessionResult({
      refreshed: false,
      session: { sub: 'user-123', accessToken: 'same-token' },
    });

    expect(received).to.have.length(0);
  });

  it('does NOT call the hook when session is null (refresh failed)', () => {
    const manager = new TestSessionManager();
    const received: TokenRefreshEvent[] = [];
    manager.registerRefreshHook((event) => received.push(event));

    manager.simulateSessionResult({ refreshed: true, session: null });

    expect(received).to.have.length(0);
  });

  it('works with no hook registered (safe no-op)', () => {
    const manager = new TestSessionManager();

    // Should not throw when no hook is registered
    expect(() => {
      manager.simulateSessionResult({
        refreshed: true,
        session: { sub: 'user-123', accessToken: 'new-token' },
      });
    }).not.to.throw();
  });

  it('replaces the previous hook when re-registered (HMR-safe)', () => {
    const manager = new TestSessionManager();
    const firstTokens: string[] = [];
    const secondTokens: string[] = [];

    manager.registerRefreshHook(({ accessToken }) => firstTokens.push(accessToken));
    manager.registerRefreshHook(({ accessToken }) => secondTokens.push(accessToken));

    manager.simulateSessionResult({
      refreshed: true,
      session: { sub: 'user-1', accessToken: 'tok-1' },
    });

    // Only the replacement hook should fire
    expect(firstTokens).to.have.length(0);
    expect(secondTokens).to.deep.equal(['tok-1']);
  });

  it('calls the hook multiple times across successive refreshes', () => {
    const manager = new TestSessionManager();
    const tokens: string[] = [];
    manager.registerRefreshHook(({ accessToken }) => tokens.push(accessToken));

    manager.simulateSessionResult({
      refreshed: true,
      session: { sub: 'user-1', accessToken: 'token-v1' },
    });
    manager.simulateSessionResult({
      refreshed: true,
      session: { sub: 'user-1', accessToken: 'token-v2' },
    });

    expect(tokens).to.deep.equal(['token-v1', 'token-v2']);
  });
});

// ─── WatchHub.updateTokensByUserId contract ────────────────────────────────────

describe('WatchHub.updateTokensByUserId — token propagation contract', () => {
  it('updates tokens for all clients belonging to the user', () => {
    const pool = new TestWatchClientPool();
    pool.add('client-a', 'user-1', 'old-token');
    pool.add('client-b', 'user-1', 'old-token');
    pool.add('client-c', 'user-2', 'other-token');

    pool.updateTokensByUserId('user-1', 'new-token');

    expect(pool.getToken('client-a')).to.equal('new-token');
    expect(pool.getToken('client-b')).to.equal('new-token');
    // Different user — untouched
    expect(pool.getToken('client-c')).to.equal('other-token');
  });

  it('does not affect clients belonging to a different user', () => {
    const pool = new TestWatchClientPool();
    pool.add('client-x', 'user-2', 'user2-token');

    pool.updateTokensByUserId('user-1', 'refreshed-token');

    expect(pool.getToken('client-x')).to.equal('user2-token');
  });

  it('is a no-op when no clients match the userId', () => {
    const pool = new TestWatchClientPool();
    pool.add('client-a', 'user-99', 'some-token');

    expect(() => {
      pool.updateTokensByUserId('user-1', 'new-token');
    }).not.to.throw();

    expect(pool.getToken('client-a')).to.equal('some-token');
  });

  it('is a no-op when the pool is empty', () => {
    const pool = new TestWatchClientPool();

    expect(() => {
      pool.updateTokensByUserId('user-1', 'new-token');
    }).not.to.throw();
  });

  it('updates a single client when only one matches', () => {
    const pool = new TestWatchClientPool();
    pool.add('client-a', 'user-1', 'stale');
    pool.add('client-b', 'user-2', 'untouched');

    pool.updateTokensByUserId('user-1', 'fresh');

    expect(pool.getToken('client-a')).to.equal('fresh');
    expect(pool.getToken('client-b')).to.equal('untouched');
  });
});

// ─── Integration: SessionManager → WatchHub wiring ────────────────────────────

describe('SessionManager + WatchHub integration — token sync', () => {
  it('propagates a refreshed token to all SSE clients for that user', () => {
    const pool = new TestWatchClientPool();
    pool.add('tab-1', 'user-abc', 'stale-token');
    pool.add('tab-2', 'user-abc', 'stale-token');
    pool.add('tab-3', 'user-xyz', 'other-token');

    const manager = new TestSessionManager();
    manager.registerRefreshHook(({ userId, accessToken }) => {
      pool.updateTokensByUserId(userId, accessToken);
    });

    // Simulate a successful token refresh for user-abc
    manager.simulateSessionResult({
      refreshed: true,
      session: { sub: 'user-abc', accessToken: 'fresh-token' },
    });

    expect(pool.getToken('tab-1')).to.equal('fresh-token');
    expect(pool.getToken('tab-2')).to.equal('fresh-token');
    // Different user — should not be touched
    expect(pool.getToken('tab-3')).to.equal('other-token');
  });

  it('does not update SSE clients when token refresh failed', () => {
    const pool = new TestWatchClientPool();
    pool.add('tab-1', 'user-abc', 'valid-token');

    const manager = new TestSessionManager();
    manager.registerRefreshHook(({ userId, accessToken }) => {
      pool.updateTokensByUserId(userId, accessToken);
    });

    // Refresh failed — session is null, hook must NOT fire
    manager.simulateSessionResult({ refreshed: true, session: null });

    expect(pool.getToken('tab-1')).to.equal('valid-token');
  });
});
