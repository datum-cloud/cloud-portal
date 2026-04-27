import { cn } from '@datum-cloud/datum-ui/utils';
import { CheckIcon, CircleDotIcon, MinusIcon, XIcon } from 'lucide-react';

export type PermissionsPanelProps = {
  permissions: string[];
  losingPermissions?: string[];
  // Permissions the user already holds — used in add-role preview to distinguish new vs existing
  existingPermissions?: string[];
  className?: string;
};

// "core.miloapis.com/secrets.create" → "secrets.create"
function stripDomain(permission: string): string {
  const slashIndex = permission.indexOf('/');
  return slashIndex !== -1 ? permission.slice(slashIndex + 1) : permission;
}

// "secrets.create" → { resource: "secrets", verb: "create" }
function parse(permission: string): { resource: string; verb: string } {
  const normalized = stripDomain(permission.trim());
  const dot = normalized.lastIndexOf('.');
  if (dot === -1) return { resource: normalized, verb: '' };
  return { resource: normalized.slice(0, dot), verb: normalized.slice(dot + 1) };
}

// Preferred verb ordering — unknown verbs appended alphabetically after
const VERB_ORDER = ['get', 'list', 'create', 'update', 'patch', 'delete'];

function sortVerbs(verbs: string[]): string[] {
  const known = VERB_ORDER.filter((v) => verbs.includes(v));
  const unknown = verbs.filter((v) => !VERB_ORDER.includes(v)).sort();
  return [...known, ...unknown];
}

// 'new'      — will be granted, user doesn't already have it
// 'existing' — already held by the user (shown muted in add-role preview)
// 'granted'  — has permission (effective permissions view, no existing context)
// 'losing'   — being removed
// 'none'     — not granted
type CellState = 'new' | 'existing' | 'granted' | 'losing' | 'none';

export function PermissionsPanel({
  permissions,
  losingPermissions = [],
  existingPermissions,
  className,
}: PermissionsPanelProps) {
  const hasContent = permissions.length > 0 || losingPermissions.length > 0;

  if (!hasContent) {
    return (
      <div
        className={cn(
          'text-muted-foreground flex h-full flex-col items-center justify-center gap-2 px-6 py-12 text-center text-sm',
          className
        )}
        aria-live="polite">
        <p>No permissions assigned.</p>
      </div>
    );
  }

  const grantedSet = new Set(permissions.map((p) => stripDomain(p.trim())));
  const losingSet = new Set(losingPermissions.map((p) => stripDomain(p.trim())));
  const existingSet = existingPermissions
    ? new Set(existingPermissions.map((p) => stripDomain(p.trim())))
    : null;

  // Collect all unique resources and verbs across all permission lists
  const allPerms = [...permissions, ...losingPermissions];
  const resourceSet = new Set<string>();
  const verbSet = new Set<string>();

  for (const p of allPerms) {
    const { resource, verb } = parse(p);
    if (resource) resourceSet.add(resource);
    if (verb) verbSet.add(verb);
  }

  const resources = [...resourceSet].sort();
  const verbs = sortVerbs([...verbSet]);

  const loseCount = losingPermissions.length;
  const newCount = existingSet
    ? permissions.filter((p) => !existingSet.has(stripDomain(p.trim()))).length
    : null;

  return (
    <div className={cn('flex flex-col gap-4 px-4 py-4', className)} aria-label="Role permissions">
      <p className="text-muted-foreground text-xs">
        <span className="text-foreground font-semibold tabular-nums">{permissions.length}</span>{' '}
        {permissions.length === 1 ? 'permission' : 'permissions'}
        {newCount !== null && newCount > 0 && (
          <span className="ml-1 text-green-600 dark:text-green-400">({newCount} new)</span>
        )}
        {loseCount > 0 && (
          <span className="text-destructive ml-1">({loseCount} being removed)</span>
        )}
      </p>

      {existingSet && (
        <div className="text-muted-foreground flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <CheckIcon className="size-3 stroke-[2.5] text-green-600 dark:text-green-400" />
            New
          </span>
          <span className="flex items-center gap-1">
            <CircleDotIcon className="size-3 stroke-[2]" />
            Already have
          </span>
          <span className="flex items-center gap-1">
            <MinusIcon className="text-border size-3 stroke-[1.5]" />
            Not granted
          </span>
        </div>
      )}

      <div className="min-w-0 overflow-x-auto">
        <table
          className="w-full border-collapse text-xs"
          role="grid"
          aria-label="Permissions matrix">
          <thead>
            <tr className="whitespace-nowrap">
              <th className="text-muted-foreground w-40 py-1.5 pr-3 text-left font-medium">
                Resource
              </th>
              {verbs.map((verb) => (
                <th
                  key={verb}
                  className="text-muted-foreground min-w-[3rem] px-1 py-1.5 text-center font-mono font-medium">
                  {verb}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource} className="border-border border-t">
                <td className="text-foreground py-2 pr-3 font-mono font-medium">{resource}</td>
                {verbs.map((verb) => {
                  const key = `${resource}.${verb}`;
                  let state: CellState;
                  if (losingSet.has(key)) {
                    state = 'losing';
                  } else if (grantedSet.has(key)) {
                    state = existingSet ? (existingSet.has(key) ? 'existing' : 'new') : 'granted';
                  } else {
                    state = 'none';
                  }

                  return (
                    <td key={verb} className="px-1 py-2 text-center">
                      <MatrixCell state={state} resource={resource} verb={verb} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatrixCell({
  state,
  resource,
  verb,
}: {
  state: CellState;
  resource: string;
  verb: string;
}) {
  if (state === 'new') {
    return (
      <span
        aria-label={`${resource}.${verb} new`}
        className="inline-flex items-center justify-center text-green-600 dark:text-green-400">
        <CheckIcon className="size-3.5 stroke-[2.5]" />
      </span>
    );
  }
  if (state === 'existing') {
    return (
      <span
        aria-label={`${resource}.${verb} already granted`}
        className="text-muted-foreground inline-flex items-center justify-center">
        <CircleDotIcon className="size-3.5 stroke-[2]" />
      </span>
    );
  }
  if (state === 'granted') {
    return (
      <span
        aria-label={`${resource}.${verb} granted`}
        className="inline-flex items-center justify-center text-green-600 dark:text-green-400">
        <CheckIcon className="size-3.5 stroke-[2.5]" />
      </span>
    );
  }
  if (state === 'losing') {
    return (
      <span
        aria-label={`${resource}.${verb} being removed`}
        className="text-destructive inline-flex items-center justify-center">
        <XIcon className="size-3.5 stroke-[2.5]" />
      </span>
    );
  }
  return (
    <span
      aria-label={`${resource}.${verb} not granted`}
      className="text-border inline-flex items-center justify-center">
      <MinusIcon className="size-3 stroke-[1.5]" />
    </span>
  );
}
