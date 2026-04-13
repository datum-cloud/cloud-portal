import { tool } from 'ai';
import { z } from 'zod';

export function createUtilityTools() {
  return {
    getDesktopAppInfo: tool({
      description:
        'Get download and installation instructions for the Datum Desktop app. Call this when the user asks how to install or download the Datum Desktop app.',
      inputSchema: z.object({
        os: z
          .enum(['macos', 'windows', 'linux', 'unknown'])
          .describe("The user's operating system"),
      }),
      execute: async ({ os }: { os: 'macos' | 'windows' | 'linux' | 'unknown' }) => {
        const platforms = {
          macos: {
            os: 'macOS',
            brew: 'brew install --cask datum-cloud/tap/desktop',
            directDownload: 'https://github.com/datum-cloud/app/releases/latest/download/Datum.dmg',
            downloadPage: 'https://www.datum.net/download/mac-os/',
            instructions:
              'Install via Homebrew (recommended) or download the .dmg installer directly.',
          },
          windows: {
            os: 'Windows',
            directDownload:
              'https://github.com/datum-cloud/app/releases/latest/download/Datum-setup.exe',
            downloadPage: 'https://www.datum.net/download/windows/',
            instructions: 'Download and run the .exe installer.',
          },
          linux: {
            os: 'Linux',
            directDownload:
              'https://github.com/datum-cloud/app/releases/latest/download/Datum.AppImage',
            downloadPage: 'https://www.datum.net/download/linux/',
            instructions:
              'Download the AppImage, make it executable with `chmod +x Datum.AppImage`, then run it.',
          },
        };

        if (os === 'unknown') {
          return {
            description:
              'Datum Desktop exposes local environments to the internet using QUIC-based tunnels.',
            platforms: Object.values(platforms),
            downloadPage: 'https://www.datum.net/download/',
          };
        }

        return {
          description:
            'Datum Desktop exposes local environments to the internet using QUIC-based tunnels.',
          ...platforms[os],
        };
      },
    }),

    getDatumPlatformDocs: tool({
      description:
        'Fetch the full Datum platform documentation including CLI command syntax and usage. Call this before suggesting any datumctl CLI commands to ensure accuracy.',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const res = await fetch('https://www.datum.net/docs/llms-full.txt', {
            signal: AbortSignal.timeout(10_000),
          });
          if (!res.ok) return { error: `Failed to fetch docs: ${res.status}` };
          const text = await res.text();
          return { docs: text };
        } catch (err) {
          return {
            error: `Failed to fetch docs: ${err instanceof Error ? err.message : 'unknown'}`,
          };
        }
      },
    }),

    openSupportTicket: tool({
      description:
        'Offer the user a pre-filled HelpScout support ticket when you cannot answer their question or they need human support. Use this when the question is outside your knowledge, you are unsure, or the user asks to contact support.',
      inputSchema: z.object({
        subject: z.string().describe('A concise subject line for the support ticket'),
        message: z.string().describe("The pre-filled message body, based on the user's question"),
      }),
      execute: async ({ subject, message }: { subject: string; message: string }) => ({
        subject,
        message,
      }),
    }),
  };
}
