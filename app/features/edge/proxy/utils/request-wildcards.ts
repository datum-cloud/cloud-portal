import { openSupportMessage } from '@/utils/open-support-message';

/** Opens a support message asking Datum to enable wildcard hostnames for a project. */
export function requestWildcardHostnames(projectId: string | undefined, hostnames: string[]) {
  openSupportMessage({
    subject: 'Enable wildcard hostnames',
    text: [
      `Please enable wildcard hostnames for project ${projectId ?? '(unknown)'}.`,
      hostnames.length > 0 ? `Hostnames: ${hostnames.join(', ')}` : undefined,
    ]
      .filter(Boolean)
      .join('\n'),
  });
}
