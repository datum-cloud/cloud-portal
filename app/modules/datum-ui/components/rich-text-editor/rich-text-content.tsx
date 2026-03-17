import type { RichTextContentProps } from './types';
import { cn } from '@shadcn/lib/utils';
import DOMPurify from 'isomorphic-dompurify';

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['strong', 'em', 'u', 's', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
};

/**
 * Post-sanitization: normalizes link hrefs and ensures safe attributes.
 * Applied AFTER DOMPurify so we only touch already-clean HTML.
 */
function normalizeLinks(html: string): string {
  return html.replace(/<a\s([^>]*)>/g, (_match, attrs: string) => {
    let normalized = attrs;

    // Fix bare-domain hrefs (no protocol)
    normalized = normalized.replace(/href="(?!https?:\/\/|mailto:)([^"]+)"/, 'href="https://$1"');

    // Ensure target and rel for safe external links
    if (!normalized.includes('target=')) {
      normalized += ' target="_blank"';
    }
    if (!normalized.includes('rel=')) {
      normalized += ' rel="noopener noreferrer"';
    }

    return `<a ${normalized}>`;
  });
}

export function RichTextContent({ content, className }: RichTextContentProps) {
  if (!content) return null;

  // Sanitize first, then normalize links on clean output
  const sanitized = DOMPurify.sanitize(content, SANITIZE_CONFIG);
  const withSafeLinks = normalizeLinks(sanitized);

  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        '[&_a]:text-primary text-sm [&_a]:underline [&_p]:my-1 [&_p:empty]:min-h-[1em]',
        className
      )}
      dangerouslySetInnerHTML={{ __html: withSafeLinks }}
    />
  );
}
