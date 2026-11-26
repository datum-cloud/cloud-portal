import { Icon } from '@datum-cloud/datum-ui/icons';
import { ExternalLinkIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Link that opens in a new tab, with an icon and a screen-reader hint. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-medium underline underline-offset-2">
      {children}
      <Icon icon={ExternalLinkIcon} size={12} aria-hidden="true" />
      <span className="sr-only">(opens in new tab)</span>
    </a>
  );
}
