import type { Role } from '@/resources/roles';

// The controller flattens spec.includedPermissions + all inheritedRoles (transitively,
// across namespaces) into status.effectivePermissions — that's the source of truth.
// Falling back to includedPermissions covers roles the controller hasn't reconciled yet.
export function resolveAllPermissions(role: Role): string[] {
  return role.effectivePermissions ?? role.includedPermissions ?? [];
}
