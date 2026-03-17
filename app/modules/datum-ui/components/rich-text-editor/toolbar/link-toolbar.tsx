import { useRichTextEditor } from '../rich-text-editor';
import { ToolbarButton } from './toolbar-button';
import { Button, Icon, Input } from '@datum-ui/components';
import { Popover, PopoverContent, PopoverAnchor } from '@shadcn/ui/popover';
import { LinkIcon, UnlinkIcon } from 'lucide-react';
import { useCallback, useState } from 'react';

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\/|^mailto:/i.test(trimmed)) return trimmed;
  if (trimmed.includes('@') && !trimmed.includes(' ')) return `mailto:${trimmed}`;
  return `https://${trimmed}`;
}

export function LinkToolbar() {
  const { editor } = useRichTextEditor();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  const isActive = editor?.isActive('link');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const href = normalizeUrl(url);
      if (!href) return;
      editor?.chain().focus().extendMarkRange('link').setLink({ href }).run();
      setUrl('');
      setOpen(false);
    },
    [editor, url]
  );

  const handleUnlink = useCallback(() => {
    editor?.chain().focus().unsetLink().run();
  }, [editor]);

  if (isActive) {
    return (
      <ToolbarButton active onClick={handleUnlink} tooltip="Remove link">
        <Icon icon={UnlinkIcon} className="size-4" />
      </ToolbarButton>
    );
  }

  // Use PopoverAnchor + manual open toggle instead of PopoverTrigger,
  // because ToolbarButton uses onMouseDown+preventDefault which blocks
  // Radix's click-based trigger mechanism.
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <ToolbarButton
          tooltip="Add link"
          shortcut="&#8984;K"
          onClick={() => setOpen((prev) => !prev)}>
          <Icon icon={LinkIcon} className="size-4" />
        </ToolbarButton>
      </PopoverAnchor>
      <PopoverContent className="w-80 p-3" side="bottom" align="start">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="h-7 flex-1"
            autoFocus
          />
          <Button type="primary" size="xs" className="h-7" onClick={handleSubmit}>
            Add
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
