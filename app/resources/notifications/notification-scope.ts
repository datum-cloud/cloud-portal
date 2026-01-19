import { getOrgScopedBase, getProjectScopedBase, getUserScopedBase } from '@/resources/base/utils';

export type NotificationScope =
  | {
      type: 'user';
      userId?: string;
    }
  | {
      type: 'organization';
      organizationId: string;
    }
  | {
      type: 'project';
      projectId: string;
    };

export const DEFAULT_NOTIFICATION_NAMESPACE = 'default';

export function getNotificationScopedBase(scope: NotificationScope): string {
  switch (scope.type) {
    case 'user':
      return getUserScopedBase(scope.userId ?? 'me');
    case 'organization':
      return getOrgScopedBase(scope.organizationId);
    case 'project':
      return getProjectScopedBase(scope.projectId);
    default:
      // Exhaustiveness guard
      throw new Error(`Unknown notification scope type: ${(scope as any).type}`);
  }
}

export function notificationScopeKey(scope: NotificationScope): string {
  switch (scope.type) {
    case 'user':
      return `user:${scope.userId ?? 'me'}`;
    case 'organization':
      return `organization:${scope.organizationId}`;
    case 'project':
      return `project:${scope.projectId}`;
    default:
      // Exhaustiveness guard
      return `unknown:${String((scope as any)?.type)}`;
  }
}
