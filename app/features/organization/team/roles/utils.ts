import type { Role } from '@/resources/roles';

export function resolveAllPermissions(
  role: Role,
  allRoles: Role[],
  visited = new Set<string>()
): string[] {
  if (visited.has(role.name)) return [];
  visited.add(role.name);
  const own = role.includedPermissions ?? [];
  const inherited = (role.inheritedRoles ?? []).flatMap((name) => {
    const parent = allRoles.find((r) => r.name === name);
    if (!parent) return [];
    return resolveAllPermissions(parent, allRoles, visited);
  });
  return [...new Set([...own, ...inherited])];
}
