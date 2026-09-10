export type SeriesLegendModifiers = {
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
};

/**
 * Grafana-style legend clicks:
 * - click isolates the series (click again to show all)
 * - shift/ctrl/cmd-click toggles that series (never hides the last one)
 */
export function nextHiddenSeries(
  names: string[],
  hidden: ReadonlySet<string>,
  clicked: string,
  modifiers: SeriesLegendModifiers = {}
): Set<string> {
  if (!names.includes(clicked)) return new Set(hidden);

  const negate = Boolean(modifiers.shiftKey || modifiers.metaKey || modifiers.ctrlKey);
  if (negate) {
    const next = new Set(hidden);
    if (next.has(clicked)) {
      next.delete(clicked);
      return next;
    }
    const visibleCount = names.reduce((count, name) => count + (next.has(name) ? 0 : 1), 0);
    if (visibleCount > 1) next.add(clicked);
    return next;
  }

  const onlyThisVisible = names.every((name) => name === clicked || hidden.has(name));
  if (onlyThisVisible) return new Set();
  return new Set(names.filter((name) => name !== clicked));
}
