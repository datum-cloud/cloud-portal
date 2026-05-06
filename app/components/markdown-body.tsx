import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';
import { useMemo } from 'react';

marked.use({ breaks: true, gfm: true } as any);

export function MarkdownBody({ content }: { content: string }) {
  const html = useMemo(() => {
    const raw = marked(content || '') as string;
    return DOMPurify.sanitize(raw, {
      ADD_TAGS: ['img'],
      ADD_ATTR: ['src', 'alt', 'title'],
      // allow relative /api/uploads/ paths and https URLs
      ALLOWED_URI_REGEXP: /^(https?:\/\/|\/api\/uploads\/)/,
    });
  }, [content]);

  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
}
