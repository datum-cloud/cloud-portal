/**
 * Test fixture: a Kubernetes RBAC denial in the exact form Milo IAM returns,
 * so error tests share one format instead of hand-copying it.
 */
export function rbacDenial({
  verb,
  resource,
  group,
  name,
}: {
  verb: string;
  resource: string;
  group: string;
  name?: string;
}): string {
  const target = `${resource}.${group}${name ? ` "${name}"` : ''}`;
  return `${target} is forbidden: User "jane@example.com" cannot ${verb} resource "${resource}" in API group "${group}" in the namespace "default"`;
}
