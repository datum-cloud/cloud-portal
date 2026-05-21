import { useEffect, useState } from 'react';

export type OS = 'undetermined' | 'macos' | 'ios' | 'windows' | 'android' | 'linux';

// Modern Chromium browsers expose navigator.userAgentData.platform with a
// stable, low-entropy string. Chrome is progressively freezing the legacy
// userAgent header, so userAgentData is the future-safe signal where it
// exists. Non-Chromium browsers (Safari, Firefox) fall through to the UA
// regex below.
type NavigatorUAData = { platform: string };

function getOS(): OS {
  if (typeof window === 'undefined') {
    return 'undetermined';
  }

  const navigatorWithUAData = window.navigator as Navigator & {
    userAgentData?: NavigatorUAData;
  };
  const platform = navigatorWithUAData.userAgentData?.platform?.toLowerCase();

  if (platform === 'macos') return 'macos';
  if (platform === 'windows') return 'windows';
  if (platform === 'linux') return 'linux';
  if (platform === 'android') return 'android';
  // userAgentData doesn't currently report iOS — fall through to UA regex.

  const { userAgent } = window.navigator;
  const macosPlatforms = /(Macintosh)|(MacIntel)|(MacPPC)|(Mac68K)/i;
  const windowsPlatforms = /(Win32)|(Win64)|(Windows)|(WinCE)/i;
  const iosPlatforms = /(iPhone)|(iPad)|(iPod)/i;

  if (macosPlatforms.test(userAgent)) {
    return 'macos';
  }

  if (iosPlatforms.test(userAgent)) {
    return 'ios';
  }

  if (windowsPlatforms.test(userAgent)) {
    return 'windows';
  }

  if (/Android/i.test(userAgent)) {
    return 'android';
  }

  if (/Linux/i.test(userAgent)) {
    return 'linux';
  }

  return 'undetermined';
}

interface UseOsOptions {
  getValueInEffect: boolean;
}

export function useOs(options: UseOsOptions = { getValueInEffect: true }): OS {
  const [value, setValue] = useState<OS>(options.getValueInEffect ? 'undetermined' : getOS());

  useEffect(() => {
    if (options.getValueInEffect) {
      setValue(getOS);
    }
  }, []);

  return value;
}
