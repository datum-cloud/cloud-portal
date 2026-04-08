import { cn } from '@shadcn/lib/utils';
import type { Editor } from '@tiptap/react';
import { EditorContent } from '@tiptap/react';
import { Loader2, SendHorizonal } from 'lucide-react';

interface ChatInputProps {
  editor: Editor | null;
  isReady: boolean;
  onSend: () => void;
}

export function ChatInput({ editor, isReady, onSend }: ChatInputProps) {
  return (
    <div className="absolute right-0 bottom-0 left-0 z-10 px-2 pb-2">
      <div className="ring-border focus-within:ring-primary bg-card mx-auto flex w-full items-end gap-1 rounded-[28px] p-2 ring-1 transition-shadow sm:w-1/2">
        <EditorContent editor={editor} className="min-w-0 flex-1" />
        <button
          onClick={onSend}
          disabled={!isReady}
          aria-label="Send message"
          className={cn(
            'text-muted-foreground hover:text-foreground mr-1.5 mb-1.5 shrink-0 rounded p-1.5 transition-colors',
            'disabled:cursor-not-allowed'
          )}>
          {isReady ? (
            <SendHorizonal className="text-primary size-4" />
          ) : (
            <Loader2 className="text-primary size-4 animate-spin" />
          )}
        </button>
      </div>
    </div>
  );
}
