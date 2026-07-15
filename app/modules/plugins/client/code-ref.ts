/**
 * `$codeRef` resolution — CLIENT-SAFE, pure.
 *
 * A `$codeRef` names a lazily-loaded module from the manifest's
 * `exposedModules`, in the form `"Module"` or `"Module.exportName"`. This
 * module parses that reference and picks the right export off a loaded Module
 * Federation container namespace. Kept free of the federation runtime so the
 * parsing rules are unit-testable in isolation.
 */

export interface ParsedCodeRef {
  /** Key into `exposedModules`; the Module Federation expose name. */
  module: string;
  /** Named export to pick, or `undefined` for the default export. */
  exportName?: string;
}

/**
 * Parse a `$codeRef` string. `"InstanceList"` targets the module's default
 * export; `"InstanceList.Foo"` targets its named `Foo` export. Only the first
 * dot separates module from export, so module names themselves cannot contain
 * dots (matching the manifest contract).
 */
export function parseCodeRef(codeRef: string): ParsedCodeRef {
  const dot = codeRef.indexOf('.');
  if (dot === -1) {
    return { module: codeRef };
  }
  return {
    module: codeRef.slice(0, dot),
    exportName: codeRef.slice(dot + 1),
  };
}

/**
 * Given a loaded module namespace, pick the export named by a parsed
 * `$codeRef`. Falls back to the default export, then the namespace itself, so a
 * plugin authored with either `export default` or a named export resolves.
 * Returns `undefined` when the named export is genuinely absent so callers can
 * surface a friendly error rather than rendering `undefined`.
 */
export function pickCodeRefExport<T = unknown>(
  loaded: Record<string, unknown> | null | undefined,
  parsed: ParsedCodeRef
): T | undefined {
  if (loaded == null) return undefined;

  if (parsed.exportName) {
    return loaded[parsed.exportName] as T | undefined;
  }

  const defaultExport = (loaded as { default?: unknown }).default;
  if (defaultExport !== undefined) {
    return defaultExport as T;
  }

  return loaded as unknown as T;
}
