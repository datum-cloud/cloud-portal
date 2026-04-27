import { Equalizer } from './equalizer';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { Editor } from '@tiptap/react';
import { EditorContent } from '@tiptap/react';
import { Mic, MicOff, RotateCw, SendHorizonal, Square } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface ChatInputProps {
  editor: Editor | null;
  isReady: boolean;
  canRetry: boolean;
  onSend: () => void;
  onStop: () => void;
  onRetry: () => void;
  speechSupported?: boolean;
  isListening?: boolean;
  frequencyData?: number[];
  onMicToggle?: () => void;
}

export function ChatInput({
  editor,
  isReady,
  canRetry,
  onSend,
  onStop,
  onRetry,
  speechSupported,
  isListening,
  frequencyData,
  onMicToggle,
}: ChatInputProps) {
  return (
    <div className="absolute right-0 bottom-0 left-0 z-10 px-2 pb-2">
      <div className="ring-border focus-within:ring-primary bg-card dark:bg-accent mx-auto flex w-full items-end gap-1 rounded-[28px] p-2 ring-1 transition-shadow sm:w-1/2">
        <EditorContent editor={editor} className="min-w-0 flex-1" />
        {speechSupported && (
          <Tooltip message={isListening ? 'Stop dictating' : 'Dictate'} side="top">
            <button
              type="button"
              onClick={onMicToggle}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              className={cn(
                'mb-1.5 shrink-0 rounded p-1.5 transition-colors',
                isListening
                  ? 'text-destructive hover:text-destructive/80'
                  : 'text-muted-foreground hover:text-foreground'
              )}>
              {isListening ? (
                frequencyData ? (
                  <Equalizer frequencyData={frequencyData} />
                ) : (
                  <Icon icon={MicOff} className="size-4" />
                )
              ) : (
                <Icon icon={Mic} className="size-4" />
              )}
            </button>
          </Tooltip>
        )}
        <AnimatePresence mode="popLayout">
          {canRetry && (
            <motion.div
              key="retry"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
              <Tooltip message="Retry last message" side="top">
                <button
                  onClick={onRetry}
                  aria-label="Retry last message"
                  className="text-muted-foreground hover:text-foreground mb-1.5 shrink-0 rounded p-1.5 transition-colors">
                  <Icon icon={RotateCw} className="size-4" />
                </button>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
        {isReady ? (
          <Tooltip message="Send message" side="top">
            <button
              onClick={onSend}
              aria-label="Send message"
              className="text-muted-foreground hover:text-foreground mr-1.5 mb-1.5 shrink-0 rounded p-1.5 transition-colors">
              <Icon icon={SendHorizonal} className="text-primary size-4" />
            </button>
          </Tooltip>
        ) : (
          <Tooltip message="Stop generating" side="top">
            <button
              onClick={onStop}
              aria-label="Stop generating"
              className="text-muted-foreground hover:text-destructive mr-1.5 mb-1.5 shrink-0 rounded p-1.5 transition-colors">
              <Icon icon={Square} className="size-4 fill-current" />
            </button>
          </Tooltip>
        )}
      </div>
      <p className="text-muted-foreground/30 mt-1 text-center text-[10px] select-none">
        Patch is in beta and may make mistakes
      </p>
    </div>
  );
}
