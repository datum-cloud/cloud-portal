import type { Editor } from '@tiptap/react';

export interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export interface RichTextContentProps {
  content: string;
  className?: string;
}

export interface RichTextEditorContextValue {
  editor: Editor | null;
}
