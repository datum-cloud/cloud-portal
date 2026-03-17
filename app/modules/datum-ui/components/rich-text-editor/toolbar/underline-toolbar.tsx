import { useRichTextEditor } from '../rich-text-editor';
import { ToolbarButton } from './toolbar-button';
import { UnderlineIcon } from 'lucide-react';

export function UnderlineToolbar() {
  const { editor } = useRichTextEditor();
  return (
    <ToolbarButton
      active={editor?.isActive('underline')}
      disabled={!editor?.can().toggleUnderline()}
      onClick={() => editor?.chain().focus().toggleUnderline().run()}
      tooltip="Underline"
      shortcut="&#8984;U">
      <UnderlineIcon className="h-4 w-4" />
    </ToolbarButton>
  );
}
