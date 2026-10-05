import { NOTE_MAX_TEXT_LENGTH } from '@/resources/notes/note.schema';
import { RichTextEditor } from '@datum-cloud/datum-ui/rich-text-editor';

export interface NoteEditorProps {
  content: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Rich-text editor for notes. Pulls in tiptap and prosemirror (about 185KB
 * gzipped), so load it through `LazyNoteEditor` rather than importing it.
 */
export default function NoteEditor({
  content,
  onChange,
  onBlur,
  autoFocus,
  placeholder,
  className,
}: NoteEditorProps) {
  return (
    <RichTextEditor
      content={content}
      onChange={onChange}
      onBlur={onBlur}
      autoFocus={autoFocus}
      maxLength={NOTE_MAX_TEXT_LENGTH}
      placeholder={placeholder}
      className={className}>
      <RichTextEditor.Toolbar>
        <RichTextEditor.Bold />
        <RichTextEditor.Italic />
        <RichTextEditor.Underline />
        <RichTextEditor.Strike />
        <RichTextEditor.Separator />
        <RichTextEditor.Link />
      </RichTextEditor.Toolbar>
      <RichTextEditor.Content />
      <RichTextEditor.CharacterCount maxLength={NOTE_MAX_TEXT_LENGTH} />
    </RichTextEditor>
  );
}
