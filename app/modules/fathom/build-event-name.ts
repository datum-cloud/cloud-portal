export function buildEventName(
  action: string,
  sub: string,
  orgId?: string,
  projectId?: string
): string {
  const parts = [action, `sub:${sub}`];
  if (orgId) parts.push(`org:${orgId}`);
  if (projectId) parts.push(`proj:${projectId}`);
  return parts.join(' | ');
}
