import { useRef, useState } from 'react';
import { MarkdownBody } from './markdown-body';

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  uploadUrl?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  onSubmit,
  placeholder = 'Write a reply…',
  disabled,
  rows = 5,
  uploadUrl = '/api/uploads/image',
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [uploading, setUploading] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const insertAround = (before: string, after: string, defaultSel: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end) || defaultSel;
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + sel.length;
    }, 0);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imgItem = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith('image/')
    );
    if (!imgItem) return;
    e.preventDefault();

    const file = imgItem.getAsFile();
    if (!file) return;

    const ta = taRef.current!;
    const pos = ta.selectionStart;
    const placeholder = '![Uploading…]()';
    const withPlaceholder = value.slice(0, pos) + placeholder + value.slice(pos);
    onChange(withPlaceholder);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append('file', file, `paste-${Date.now()}.png`);
      const res = await fetch(uploadUrl, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = (await res.json()) as { url: string };
      onChange(withPlaceholder.replace(placeholder, `![image](${url})`));
    } catch {
      onChange(withPlaceholder.replace(placeholder, ''));
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
    if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      insertAround('**', '**', 'bold text');
    }
    if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      insertAround('_', '_', 'italic text');
    }
  };

  const tabCls = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium transition-colors ${
      active
        ? 'border-b-2 border-primary text-foreground'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  const toolbarButtons = [
    { label: 'B', title: 'Bold (Ctrl+B)', before: '**', after: '**', def: 'bold text', cls: 'font-bold' },
    { label: 'I', title: 'Italic (Ctrl+I)', before: '_', after: '_', def: 'italic text', cls: 'italic' },
    { label: '`', title: 'Inline code', before: '`', after: '`', def: 'code', cls: 'font-mono' },
    { label: '```', title: 'Code block', before: '```\n', after: '\n```', def: 'code block', cls: 'font-mono text-[10px]' },
    { label: '~~', title: 'Strikethrough', before: '~~', after: '~~', def: 'strikethrough', cls: 'line-through' },
  ] as const;

  return (
    <div className="overflow-hidden rounded-md border border-input bg-background">
      {/* Tab bar + toolbar */}
      <div className="flex items-center border-b bg-muted/30">
        <button type="button" onClick={() => setTab('write')} className={tabCls(tab === 'write')}>
          Write
        </button>
        <button type="button" onClick={() => setTab('preview')} className={tabCls(tab === 'preview')}>
          Preview
        </button>
        <div className="ml-auto flex items-center gap-0.5 px-2 py-1">
          {toolbarButtons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              title={btn.title}
              disabled={tab !== 'write' || disabled}
              onClick={() => insertAround(btn.before, btn.after, btn.def)}
              className={`rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 ${btn.cls}`}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Write / Preview */}
      {tab === 'write' ? (
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder={uploading ? 'Uploading image…' : placeholder}
          disabled={disabled || uploading}
          rows={rows}
          className="block w-full resize-y bg-background p-3 text-sm leading-relaxed focus:outline-none disabled:opacity-60 font-mono"
        />
      ) : (
        <div className="min-h-[7.5rem] p-3">
          {value.trim() ? (
            <MarkdownBody content={value} />
          ) : (
            <span className="text-sm italic text-muted-foreground">Nothing to preview</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-3 py-1 text-[11px] text-muted-foreground">
        <span>Markdown supported</span>
        <span>Paste or drag images to attach · Ctrl+Enter to submit</span>
      </div>
    </div>
  );
}
