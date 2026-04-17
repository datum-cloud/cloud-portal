/**
 * Tracks the lifecycle of the embedded `datumctl` terminal session and gates
 * UI actions that would disrupt it behind a confirmation prompt.
 *
 * Why this exists:
 *   The terminal is pinned at spawn time to a specific org/project via env
 *   vars on the backend. There's no way to rebind those without tearing the
 *   WebSocket down, so any action that would change the active org/project
 *   (header switchers, logout, leaving the project layout) or close the
 *   Developer Tools panel outright silently invalidates the session. This
 *   provider lets the terminal publish an "I am active" signal plus a
 *   closer, and exposes hooks that callers use to prompt the user before
 *   performing a destructive action.
 *
 * Scope:
 *   Deliberately minimal — this provider owns only the boolean flag and
 *   the closer ref. The confirmation dialog itself is borrowed from
 *   ConfirmationDialogProvider at the hook layer so the dialog contract
 *   stays in one place.
 */
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

interface TerminalSessionContextValue {
  /** True while the datumctl WebSocket session is open. */
  isActive: boolean;
  /** Called by the terminal panel as the socket opens / closes. */
  setActive: (active: boolean) => void;
  /**
   * Terminal panels call this on mount to register a "close the socket now"
   * callback, and clear it (pass null) on unmount. `closeSession()` below
   * invokes it.
   */
  registerCloser: (closer: (() => void) | null) => void;
  /**
   * Immediately tears the current session down (if any). Safe to call when
   * no session exists — resolves to a no-op.
   */
  closeSession: () => void;
}

const TerminalSessionContext = createContext<TerminalSessionContextValue | null>(null);

export function TerminalSessionProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setActive] = useState(false);
  const closerRef = useRef<(() => void) | null>(null);

  const registerCloser = useCallback((closer: (() => void) | null) => {
    closerRef.current = closer;
  }, []);

  const closeSession = useCallback(() => {
    closerRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ isActive, setActive, registerCloser, closeSession }),
    [isActive, registerCloser, closeSession]
  );

  return (
    <TerminalSessionContext.Provider value={value}>{children}</TerminalSessionContext.Provider>
  );
}

export function useTerminalSession() {
  const ctx = useContext(TerminalSessionContext);
  if (!ctx) {
    throw new Error('useTerminalSession must be used inside <TerminalSessionProvider>');
  }
  return ctx;
}

/**
 * Async guard for actions that *reset* the terminal to a new context —
 * org/project switchers. The terminal will disconnect and reconnect
 * against the new context; we don't explicitly tear it down here because
 * the terminal panel's own context-change effect handles the reset.
 *
 * Resolves `true` if the caller may proceed, `false` if the user opted to
 * keep the current session. Resolves `true` synchronously when no session
 * is active.
 */
export function useConfirmContextSwitch() {
  const { isActive } = useTerminalSession();
  const { confirm } = useConfirmationDialog();

  return useCallback(async (): Promise<boolean> => {
    if (!isActive) return true;
    return await confirm({
      title: 'Reset terminal session?',
      description:
        'A datumctl terminal is running in Developer Tools. Continuing will disconnect the session, interrupt any command that is still executing, and reconnect against the new context.',
      submitText: 'Continue',
      cancelText: 'Keep terminal',
      variant: 'destructive',
    });
  }, [isActive, confirm]);
}

/**
 * Async guard for actions that *end* the terminal outright — closing the
 * Developer Tools panel, logging out, or navigating away from the project
 * layout (e.g. Account Settings). On confirm, the session is explicitly
 * torn down so the socket doesn't linger while React unmounts the panel.
 *
 * Resolves `true` if the caller may proceed, `false` if the user opted to
 * keep the current session. Resolves `true` synchronously when no session
 * is active.
 */
export function useConfirmTerminalExit() {
  const { isActive, closeSession } = useTerminalSession();
  const { confirm } = useConfirmationDialog();

  return useCallback(async (): Promise<boolean> => {
    if (!isActive) return true;
    const ok = await confirm({
      title: 'End terminal session?',
      description:
        'A datumctl terminal is running in Developer Tools. Continuing will close the terminal and interrupt any command that is still executing.',
      submitText: 'Continue and close terminal',
      cancelText: 'Keep terminal',
      variant: 'destructive',
    });
    if (ok) closeSession();
    return ok;
  }, [isActive, closeSession, confirm]);
}
