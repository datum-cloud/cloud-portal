import { usePermissionCheck, type PermissionCheckInput } from './hooks/usePermissionCheck';
import { SUB_RESOURCE_VERB_PREFIX, type UseResourcePermissionsInput } from './types';
import { useMemo } from 'react';

/** Capitalize the first character of a string. */
function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

interface FlagNameForPrimary {
  scope: 'primary';
  verb: string;
}

interface FlagNameForSub {
  scope: 'sub';
  verb: string;
  alias: string;
}

/**
 * Compute the JS property name for a permission flag.
 *
 * Primary verb → `can<Capitalize(verb)>` (e.g. `canList`, `canPatch`).
 * Sub-resource verb → `can<Prefix><Capitalize(alias)>` where Prefix comes
 * from {@link SUB_RESOURCE_VERB_PREFIX} (defaulting to `capitalize(verb)`
 * when no mapping is registered — see the `watch` fallback test case).
 *
 * Note: callers are responsible for ensuring sub-resource `alias` values
 * are non-empty and unique within a single `useResourcePermissions` call.
 * An empty alias produces a degenerate flag name (`canView`); two
 * sub-resources sharing the same `resource:verb` will collide in the
 * underlying SSAR result map.
 */
export function flagNameFor(input: FlagNameForPrimary | FlagNameForSub): string {
  if (input.scope === 'primary') {
    return `can${capitalize(input.verb)}`;
  }
  const mapped = SUB_RESOURCE_VERB_PREFIX[input.verb] ?? capitalize(input.verb);
  return `can${mapped}${capitalize(input.alias)}`;
}

/** Expand the input shape into the flat array of `PermissionCheckInput` rows that `usePermissionCheck` expects. */
export function buildChecks(input: UseResourcePermissionsInput): PermissionCheckInput[] {
  const primary: PermissionCheckInput[] = input.verbs.map((verb) => ({
    resource: input.resource,
    verb,
    group: input.group,
    namespace: input.namespace,
    scope: input.scope,
  }));

  const sub: PermissionCheckInput[] = (input.subResources ?? []).flatMap((sr) =>
    sr.verbs.map((verb) => ({
      resource: sr.resource,
      verb,
      group: sr.group,
      namespace: sr.namespace,
      scope: sr.scope,
    }))
  );

  return [...primary, ...sub];
}

/**
 * Batched permission check that returns named flag properties.
 *
 * `verbs: ['list', 'create']` returns `{ canList, canCreate, isLoading }`.
 * Sub-resources alias the result names — see `flagNameFor`.
 *
 * Architecture: every verb and sub-resource share a single React Query
 * call (via {@link usePermissionCheck}). Per-verb / per-sub-resource
 * React Query options (`staleTime`, `refetchOnMount`, etc.) on
 * {@link ResourcePermissionSubResource.options} are NOT honored by this
 * implementation — they only have meaning on the top-level input today.
 * If you need a per-check freshness policy (e.g. `staleTime: 0` to force
 * re-validation on every mount), use a separate {@link usePermission}
 * call for that one check instead.
 *
 * Permissions are keyed internally by `${resource}:${verb}`. Two
 * sub-resources sharing the same resource string would silently collide
 * in the result map; ensure sub-resource `resource` values are distinct.
 */
export function useResourcePermissions<TInput extends UseResourcePermissionsInput>(
  input: TInput
): Record<string, boolean> & { isLoading: boolean } {
  // Stable string keys so the dep arrays contain only simple expressions
  // (react-hooks/use-memo disallows arbitrary call expressions in deps).
  // Inputs are typically literals from the caller, so JSON.stringify is fine.
  const verbsKey = JSON.stringify(input.verbs);
  const subResourcesKey = JSON.stringify(input.subResources);

  // Sub-resource per-verb options are not honored by the single-batched
  // query implementation. Warn if a caller supplied them so the silent-drop
  // surfaces in dev/test rather than producing stale data.
  if (process.env.NODE_ENV !== 'production') {
    for (const sr of input.subResources ?? []) {
      if (sr.options && Object.keys(sr.options).length > 0) {
        console.warn(
          `[useResourcePermissions] Sub-resource '${sr.alias}' supplied 'options' (${Object.keys(sr.options).join(', ')}) which are not honored. Use a separate usePermission() call for per-check freshness — see app/modules/rbac/CONVENTIONS.md.`
        );
      }
    }
  }

  const checks = useMemo(
    () => buildChecks(input),

    [input.resource, input.group, input.namespace, input.scope, verbsKey, subResourcesKey]
  );

  const { permissions, isLoading } = usePermissionCheck(checks);

  return useMemo(() => {
    const flags: Record<string, boolean> = {};

    for (const verb of input.verbs) {
      const key = `${input.resource}:${verb}`;
      flags[flagNameFor({ scope: 'primary', verb })] = permissions[key]?.allowed ?? false;
    }

    for (const sr of input.subResources ?? []) {
      for (const verb of sr.verbs) {
        const key = `${sr.resource}:${verb}`;
        flags[flagNameFor({ scope: 'sub', verb, alias: sr.alias })] =
          permissions[key]?.allowed ?? false;
      }
    }

    return { ...flags, isLoading };
    // Deps note: input.group / input.namespace / input.scope are not in this
    // list because this closure does not read them — only input.resource,
    // input.verbs (via verbsKey), and input.subResources (via subResourcesKey)
    // are referenced inside. If you start reading group/namespace/scope here,
    // add them to the deps.
  }, [permissions, isLoading, input.resource, verbsKey, subResourcesKey]);
}
