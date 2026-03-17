import { BoldToolbar } from './toolbar/bold-toolbar';
import { ItalicToolbar } from './toolbar/italic-toolbar';
import { LinkToolbar } from './toolbar/link-toolbar';
import { StrikeToolbar } from './toolbar/strike-toolbar';
import { Toolbar, ToolbarSeparator } from './toolbar/toolbar';
import { UnderlineToolbar } from './toolbar/underline-toolbar';
import type { RichTextEditorContextValue, RichTextEditorProps } from './types';
import { cn } from '@shadcn/lib/utils';
import CharacterCount from '@tiptap/extension-character-count';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { createContext, useContext } from 'react';

const RichTextEditorContext = createContext<RichTextEditorContextValue>({ editor: null });

export function useRichTextEditor() {
  return useContext(RichTextEditorContext);
}

function RichTextEditorRoot({
  content,
  onChange,
  onBlur,
  autoFocus = false,
  placeholder,
  disabled = false,
  children,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        autolink: true,
        openOnClick: false,
        validate: (url: string) => /^https?:\/\/|^mailto:/.test(url),
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write something...' }),
      // CharacterCount always included — tracks text chars for the visual counter.
      // The hard limit is enforced pre-submit by checking editor.getHTML().length.
      CharacterCount.configure({ limit: undefined }),
    ],
    content: content ?? '',
    editable: !disabled,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor: ed }) => {
      // Normalize empty editor state — Tiptap returns <p></p> when empty,
      // which breaks string validation. Return empty string if no text content.
      const text = ed.getText().trim();
      onChange?.(text ? ed.getHTML() : '');
    },
    onBlur: () => {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none',
          'min-h-[100px] px-3 py-2 text-sm',
          'focus:outline-none',
          '[&_p]:my-1 [&_a]:text-primary [&_a]:underline'
        ),
      },
    },
  });

  return (
    <RichTextEditorContext.Provider value={{ editor }}>
      <div
        className={cn(
          'rounded-lg',
          'bg-input-background/50',
          'text-input-foreground',
          'border-input-border border',
          'placeholder:text-input-placeholder',

          className
        )}>
        {children}
      </div>
    </RichTextEditorContext.Provider>
  );
}

function Content({ className }: { className?: string }) {
  const { editor } = useRichTextEditor();
  return <EditorContent editor={editor} className={cn('rich-text-content', className)} />;
}

function CharCount({ maxLength }: { maxLength?: number }) {
  const { editor } = useRichTextEditor();
  if (!editor) return null;

  const count = editor.storage.characterCount?.characters() ?? 0;

  return (
    <div className="flex justify-end px-3 py-1">
      <span
        className={cn(
          'text-muted-foreground text-xs',
          maxLength && count > maxLength && 'text-destructive'
        )}>
        {count}
        {maxLength ? ` / ${maxLength}` : ''}
      </span>
    </div>
  );
}

// Compound component assembly
export const RichTextEditor = Object.assign(RichTextEditorRoot, {
  Toolbar,
  Content,
  CharacterCount: CharCount,
  Bold: BoldToolbar,
  Italic: ItalicToolbar,
  Underline: UnderlineToolbar,
  Strike: StrikeToolbar,
  Link: LinkToolbar,
  Separator: ToolbarSeparator,
});
