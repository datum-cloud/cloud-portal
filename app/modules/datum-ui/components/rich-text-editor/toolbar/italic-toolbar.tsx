import { useRichTextEditor } from '../rich-text-editor';
import { ToolbarButton } from './toolbar-button';
import { ItalicIcon } from 'lucide-react';

export function ItalicToolbar() {
  const { editor } = useRichTextEditor();
  return (
    <ToolbarButton
      active={editor?.isActive('italic')}
      disabled={!editor?.can().toggleItalic()}
      onClick={() => editor?.chain().focus().toggleItalic().run()}
      tooltip="Italic"
      shortcut="&#8984;I">
      <ItalicIcon className="h-4 w-4" />
    </ToolbarButton>
  );
}
