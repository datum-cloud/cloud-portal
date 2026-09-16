import { getBrowser, getIsIpad, getIsStandalone, type PwaBrowser } from '@/features/pwa/detect';
import { useOs, type OS } from '@/hooks/useOs';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type { PwaBrowser };

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __deferredInstallPrompt?: BeforeInstallPromptEvent;
  }
}

const PROMPT_EVENT = 'datum:pwa-installprompt';
const INSTALLED_EVENT = 'datum:pwa-appinstalled';

let captureInitialized = false;

async function getIsInstalledRelatedApp(): Promise<boolean> {
  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<Array<{ platform: string }>>;
  };
  if (typeof nav.getInstalledRelatedApps !== 'function') return false;
  try {
    const apps = await nav.getInstalledRelatedApps();
    return apps.some((app) => app.platform === 'webapp');
  } catch {
    return false;
  }
}

/**
 * Capture `beforeinstallprompt` at module scope so the event is not missed
 * if Chromium fires it before React hydrates.
 */
export function capturePwaInstallEvents() {
  if (typeof window === 'undefined' || captureInitialized) return;
  captureInitialized = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window.__deferredInstallPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event(PROMPT_EVENT));
  });

  window.addEventListener('appinstalled', () => {
    window.__deferredInstallPrompt = undefined;
    window.dispatchEvent(new Event(INSTALLED_EVENT));
  });
}

export function usePwaInstall(): {
  canPromptInstall: boolean;
  promptInstall: () => Promise<boolean>;
  isStandalone: boolean;
  isInstalled: boolean;
  os: OS;
  browser: PwaBrowser;
} {
  const detectedOs = useOs();
  const [canPromptInstall, setCanPromptInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [browser, setBrowser] = useState<PwaBrowser>('other');

  const os = useMemo<OS>(
    () => (detectedOs === 'macos' && getIsIpad() ? 'ios' : detectedOs),
    [detectedOs]
  );

  useEffect(() => {
    capturePwaInstallEvents();
    setCanPromptInstall(Boolean(window.__deferredInstallPrompt));
    setIsStandalone(getIsStandalone());
    setBrowser(getBrowser());
    void getIsInstalledRelatedApp().then(setIsInstalled);

    const onPrompt = () => setCanPromptInstall(true);
    const onInstalled = () => {
      setCanPromptInstall(false);
      setIsStandalone(true);
      setIsInstalled(true);
    };
    const displayModes = [
      window.matchMedia('(display-mode: standalone)'),
      window.matchMedia('(display-mode: window-controls-overlay)'),
      window.matchMedia('(display-mode: minimal-ui)'),
    ];
    const onDisplayMode = () => setIsStandalone(getIsStandalone());

    window.addEventListener(PROMPT_EVENT, onPrompt);
    window.addEventListener(INSTALLED_EVENT, onInstalled);
    for (const mq of displayModes) mq.addEventListener('change', onDisplayMode);

    return () => {
      window.removeEventListener(PROMPT_EVENT, onPrompt);
      window.removeEventListener(INSTALLED_EVENT, onInstalled);
      for (const mq of displayModes) mq.removeEventListener('change', onDisplayMode);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const deferred = window.__deferredInstallPrompt;
    if (!deferred) return false;

    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      return choice.outcome === 'accepted';
    } catch {
      return false;
    } finally {
      window.__deferredInstallPrompt = undefined;
      setCanPromptInstall(false);
    }
  }, []);

  return { canPromptInstall, promptInstall, isStandalone, isInstalled, os, browser };
}
