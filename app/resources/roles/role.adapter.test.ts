import { toRole, toRoleList } from './role.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toRole', () => {
  it('maps annotations to displayName/description and flattens inherited role names', () => {
    const raw = {
      metadata: rawMetadata({
        uid: 'r-1',
        name: 'project-admin',
        annotations: {
          'kubernetes.io/display-name': 'Project Admin',
          'kubernetes.io/description': 'Full project access',
        },
      }),
      spec: {
        includedPermissions: ['projects.get', 'projects.update'],
        inheritedRoles: [{ name: 'project-viewer' }, { name: 'project-editor' }],
        launchStage: 'GA',
      },
      status: {
        effectivePermissions: ['projects.get', 'projects.update', 'projects.list'],
      },
    };
    const role = toRole(raw as never);

    expect(role.uid).toBe('r-1');
    expect(role.displayName).toBe('Project Admin');
    expect(role.description).toBe('Full project access');
    expect(role.includedPermissions).toEqual(['projects.get', 'projects.update']);
    expect(role.inheritedRoles).toEqual(['project-viewer', 'project-editor']);
    expect(role.effectivePermissions).toEqual(['projects.get', 'projects.update', 'projects.list']);
    expect(role.launchStage).toBe('GA');
  });

  it('leaves optional fields undefined when spec/annotations are absent', () => {
    const role = toRole({ metadata: { name: 'bare' } } as never);
    expect(role.displayName).toBeUndefined();
    expect(role.description).toBeUndefined();
    expect(role.includedPermissions).toBeUndefined();
    expect(role.inheritedRoles).toBeUndefined();
    expect(role.effectivePermissions).toBeUndefined();
    expect(role.createdAt).toBe('');
  });
});

describe('toRoleList', () => {
  it('maps items and surfaces pagination', () => {
    const list = toRoleList([{ metadata: { uid: 'a' }, spec: {} }] as never, 'tok');
    expect(list.items[0].uid).toBe('a');
    expect(list.nextCursor).toBe('tok');
    expect(list.hasMore).toBe(true);
  });
});
