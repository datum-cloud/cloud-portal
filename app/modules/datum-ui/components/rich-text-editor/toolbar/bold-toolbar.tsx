import { useRichTextEditor } from '../rich-text-editor';
import { ToolbarButton } from './toolbar-button';
import { BoldIcon } from 'lucide-react';

export function BoldToolbar() {
  const { editor } = useRichTextEditor();
  return (
    <ToolbarButton
      active={editor?.isActive('bold')}
      disabled={!editor?.can().toggleBold()}
      onClick={() => editor?.chain().focus().toggleBold().run()}
      tooltip="Bold"
      shortcut="&#8984;B">
      <BoldIcon className="h-4 w-4" />
    </ToolbarButton>
  );
}
