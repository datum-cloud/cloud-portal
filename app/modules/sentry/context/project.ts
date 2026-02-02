/**
 * Sentry Project Context
 *
 * Sets project context in Sentry for project-level filtering.
 * Call setSentryProjectContext from project layout when project is loaded.
 */
import * as Sentry from '@sentry/react-router';

export interface ProjectContext {
  name: string;
  uid?: string;
  namespace?: string;
  organizationId?: string;
}

/**
 * Set project context in Sentry.
 */
export function setSentryProjectContext(project: ProjectContext): void {
  Sentry.setTag('project.id', project.name);
  Sentry.setContext('project', {
    id: project.name,
    uid: project.uid,
    namespace: project.namespace,
    organizationId: project.organizationId,
  });
}

/**
 * Clear project context from Sentry.
 */
export function clearSentryProjectContext(): void {
  Sentry.setTag('project.id', undefined);
  Sentry.setContext('project', null);
}
