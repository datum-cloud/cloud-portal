import type { RowAction } from '../types';
import { Button } from '@datum-cloud/datum-ui/button';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { isValidElement, createElement, type ComponentType, type ReactNode } from 'react';

/**
 * Renders inline row-action buttons — ported from the fork's
 * `DataTableInlineActions`. Each visible action becomes a compact button
 * (icon-only by default, with optional label when `showLabel` is true).
 * `tooltip` accepts a string, a ReactNode, or a `(row) => ...` function.
 *
 * Behavioral parity with the fork:
 * - `hidden(row)` filters the action out
 * - `disabled(row)` OR parent `disabled` disables the button
 * - Click always calls `onClick(row)`; the `triggerInlineEdit` marker is
 *   preserved on the type for consumers that need to drive inline-content
 *   state from their own onClick handler (the wrapper owns `inline`
 *   state via controlled props, not via an internal method).
 */
export function InlineActions<TData>({
  row,
  actions,
  disabled = false,
}: {
  row: TData;
  actions: RowAction<TData>[];
  disabled?: boolean;
}) {
  const visibleActions = actions.filter((action) => !resolveHidden(action.hidden, row));
  if (visibleActions.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {visibleActions.map((action, index) => {
        const actionKey = action.key ?? `${action.label}-${index}`;
        const isActionDisabled = disabled || resolveDisabled(action.disabled, row);
        const showLabel = action.showLabel ?? true;

        const handleClick = (event: React.MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          if (isActionDisabled) return;
          action.onClick(row);
        };

        const button = (
          <Button
            type={action.variant === 'destructive' ? 'danger' : 'quaternary'}
            theme="outline"
            size={showLabel ? 'small' : 'icon'}
            onClick={handleClick}
            disabled={isActionDisabled}
            data-e2e={action['data-e2e']}
            className={cn('h-7 px-2', action.className)}>
            {renderIcon(action.icon)}
            {showLabel && <span className="text-xs">{action.label}</span>}
          </Button>
        );

        const tooltipContent = resolveTooltip(action.tooltip, row);
        if (tooltipContent) {
          return (
            <div key={actionKey} className="pointer-events-auto">
              <Tooltip message={tooltipContent}>
                <span className="inline-block">{button}</span>
              </Tooltip>
            </div>
          );
        }

        return <div key={actionKey}>{button}</div>;
      })}
    </div>
  );
}

function resolveHidden<TData>(hidden: RowAction<TData>['hidden'], row: TData): boolean {
  if (typeof hidden === 'function') return hidden(row);
  return hidden ?? false;
}

function resolveDisabled<TData>(disabled: RowAction<TData>['disabled'], row: TData): boolean {
  if (typeof disabled === 'function') return disabled(row);
  return disabled ?? false;
}

function resolveTooltip<TData>(
  tooltip: RowAction<TData>['tooltip'],
  row: TData
): ReactNode | undefined {
  if (tooltip === undefined) return undefined;
  if (typeof tooltip === 'function') return tooltip(row) ?? undefined;
  return tooltip;
}

/** Accept ReactNode OR a ComponentType (for parity with ActionItem.icon). */
function renderIcon(icon: RowAction<unknown>['icon']): ReactNode {
  if (icon === undefined || icon === null) return null;
  if (isValidElement(icon)) return icon;
  if (typeof icon === 'function') {
    return createElement(icon as ComponentType<{ className?: string }>, {
      className: 'size-3.5',
    });
  }
  return icon as ReactNode;
}
