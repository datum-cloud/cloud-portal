/**
 * Minimal semver-range satisfaction for plugin SDK compatibility checks.
 *
 * Implemented in-repo with no new dependency (the host already ships without a
 * semver library). It supports the range forms a `plugin-manifest.json`'s
 * `sdk.range` is expected to use: exact (`1.2.3`), caret (`^1.2.3`), tilde
 * (`~1.2.3`), comparators (`>=1.0.0`, `<2.0.0`, …), the `*`/`x` wildcard,
 * partial versions (`1`, `1.2`, `1.x`), space-separated intersections
 * (`>=1.0.0 <2.0.0`), and `||` unions.
 *
 * It is deliberately a subset of the npm semver grammar: no pre-release
 * ordering, build metadata, or hyphen ranges. The host SDK version is a plain
 * `MAJOR.MINOR.PATCH`, which keeps comparison tractable and predictable.
 */
import { HOST_SDK_VERSION } from './types';

interface Version {
  major: number;
  minor: number;
  patch: number;
}

type Op = '<' | '<=' | '>' | '>=' | '=';

interface Comparator {
  op: Op;
  version: Version;
}

/** A partially-specified version; `undefined` components are wildcards. */
interface PartialVersion {
  major?: number;
  minor?: number;
  patch?: number;
}

function parseVersion(raw: string): Version | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(raw.trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function parsePartial(raw: string): PartialVersion | null {
  const s = raw.trim().replace(/^v/, '');
  if (s === '' || s === '*' || s === 'x' || s === 'X') return {};

  const parts = s.split('.');
  const out: PartialVersion = {};
  const keys: (keyof PartialVersion)[] = ['major', 'minor', 'patch'];

  for (let i = 0; i < parts.length && i < 3; i++) {
    const p = parts[i];
    if (p === 'x' || p === 'X' || p === '*') break; // wildcard truncates the rest
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0) return null;
    out[keys[i]] = n;
  }
  return out;
}

/** Fill unspecified components with 0 to form a concrete lower-bound version. */
function fill(p: PartialVersion): Version {
  return { major: p.major ?? 0, minor: p.minor ?? 0, patch: p.patch ?? 0 };
}

function compare(a: Version, b: Version): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function satisfiesComparator(v: Version, c: Comparator): boolean {
  const cmp = compare(v, c.version);
  switch (c.op) {
    case '<':
      return cmp < 0;
    case '<=':
      return cmp <= 0;
    case '>':
      return cmp > 0;
    case '>=':
      return cmp >= 0;
    case '=':
      return cmp === 0;
  }
}

/** `^` bounds: pin up to the left-most non-zero component. */
function caretComparators(p: PartialVersion): Comparator[] {
  const lower = fill(p);
  let upper: Version;
  if ((p.major ?? 0) > 0 || p.major === undefined) {
    upper = { major: lower.major + 1, minor: 0, patch: 0 };
  } else if ((p.minor ?? 0) > 0 || p.minor === undefined) {
    upper = { major: 0, minor: lower.minor + 1, patch: 0 };
  } else {
    upper = { major: 0, minor: 0, patch: lower.patch + 1 };
  }
  return [
    { op: '>=', version: lower },
    { op: '<', version: upper },
  ];
}

/** `~` bounds: allow patch-level changes (or minor when only major is given). */
function tildeComparators(p: PartialVersion): Comparator[] {
  const lower = fill(p);
  const upper: Version =
    p.minor === undefined
      ? { major: lower.major + 1, minor: 0, patch: 0 }
      : { major: lower.major, minor: lower.minor + 1, patch: 0 };
  return [
    { op: '>=', version: lower },
    { op: '<', version: upper },
  ];
}

/** A bare partial (`1`, `1.2`, `1.x`, `*`) expands to an inclusive range. */
function partialComparators(p: PartialVersion): Comparator[] {
  if (p.major === undefined) return []; // '*' — matches anything
  const lower = fill(p);
  if (p.minor === undefined) {
    return [
      { op: '>=', version: lower },
      { op: '<', version: { major: lower.major + 1, minor: 0, patch: 0 } },
    ];
  }
  if (p.patch === undefined) {
    return [
      { op: '>=', version: lower },
      { op: '<', version: { major: lower.major, minor: lower.minor + 1, patch: 0 } },
    ];
  }
  return [{ op: '=', version: lower }];
}

function parseToken(token: string): Comparator[] | null {
  if (token.startsWith('^')) {
    const p = parsePartial(token.slice(1));
    return p ? caretComparators(p) : null;
  }
  if (token.startsWith('~')) {
    const p = parsePartial(token.slice(1));
    return p ? tildeComparators(p) : null;
  }

  const opMatch = /^(>=|<=|>|<|=)/.exec(token);
  if (opMatch) {
    const op = opMatch[1] as Op;
    const p = parsePartial(token.slice(op.length));
    if (!p) return null;
    return [{ op, version: fill(p) }];
  }

  const p = parsePartial(token);
  return p ? partialComparators(p) : null;
}

/** One comparator set is a whitespace-separated intersection (logical AND). */
function parseComparatorSet(setStr: string): Comparator[] | null {
  const tokens = setStr.trim().split(/\s+/).filter(Boolean);
  const comparators: Comparator[] = [];
  for (const token of tokens) {
    const parsed = parseToken(token);
    if (parsed === null) return null;
    comparators.push(...parsed);
  }
  return comparators;
}

/**
 * Returns whether `version` satisfies `range`. Unparseable input fails closed
 * (returns `false`) — an unreadable range must never mark a plugin compatible.
 */
export function satisfies(version: string, range: string): boolean {
  const v = parseVersion(version);
  if (!v) return false;

  const trimmed = range.trim();
  if (trimmed === '') return false;

  // `||` unions: satisfied if any set matches.
  const sets = trimmed.split('||');
  for (const set of sets) {
    const comparators = parseComparatorSet(set);
    if (comparators === null) continue; // skip an unparseable set, try the others
    if (comparators.every((c) => satisfiesComparator(v, c))) return true;
  }
  return false;
}

/** Whether the host SDK ({@link HOST_SDK_VERSION}) satisfies a manifest range. */
export function isSdkCompatible(sdkRange: string): boolean {
  return satisfies(HOST_SDK_VERSION, sdkRange);
}
