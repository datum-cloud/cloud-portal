import type { ReactNode } from 'react';

import { EmptyContent } from '@datum-ui/components/empty-content';

export interface EmptyContentConfig {
  title?: string;
  description?: string;
  actions?: Array<{
    label: string;
    type: 'button' | 'link' | 'external-link';
    onClick?: () => void;
    href?: string;
    icon?: ReactNode;
  }>;
}

/**
 * Converts a consumer-friendly `emptyContent` prop into a ReactNode
 * suitable for use as the `emptyMessage` prop on `DataTable.Content`.
 *
 * - `undefined`            → `undefined`
 * - `string`               → the string as-is
 * - `EmptyContentConfig`   → `<EmptyContent ... />`
 */
export function resolveEmptyContent(
  emptyContent: string | EmptyContentConfig | undefined,
): ReactNode {
  if (emptyContent === undefined) {
    return undefined;
  }

  if (typeof emptyContent === 'string') {
    return emptyContent;
  }

  const { title, description, actions } = emptyContent;

  return EmptyContent({
    title,
    subtitle: description,
    actions: actions?.map(({ label, type, onClick, href, icon }) => ({
      label,
      type,
      onClick,
      to: href,
      icon,
    })),
  });
}
