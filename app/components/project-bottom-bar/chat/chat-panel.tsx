import { AssistantMessage, LoadingDots } from './assistant-message';
import { ChatInput } from './chat-input';
import { ChatSidebar } from './chat-sidebar';
import { useChatLogic } from './use-chat-logic';
import { Icon } from '@datum-ui/components';
import { isTextUIPart } from 'ai';
import { ArrowDown, Menu, MessageSquarePlus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

const SIDEBAR_MIN = 120;
const SIDEBAR_MAX = 320;
const SIDEBAR_DEFAULT = 176;

export function ChatPanel() {
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMove = (e: MouseEvent) => {
      setSidebarWidth(
        Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startWidth + e.clientX - startX))
      );
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleResizeTouchStart = (e: React.TouchEvent) => {
    const startX = e.touches[0].clientX;
    const startWidth = sidebarWidth;
    const onMove = (e: TouchEvent) => {
      setSidebarWidth(
        Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startWidth + e.touches[0].clientX - startX))
      );
    };
    const onEnd = () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  };

  const {
    project,
    messages,
    status,
    error,
    clearError,
    sendMessage,
    isReady,
    currentChatId,
    chatList,
    startNewChat,
    loadChat,
    handleDeleteChat,
    htmlByUserMsgIndex,
    bottomRef,
    messagesContainerRef,
    userScrolledUp,
    editor,
    handleSendClick,
    sidebarOpen,
    setSidebarOpen,
  } = useChatLogic();

  const resetScrollState = () => {
    userScrolledUp.current = false;
    setShowScrollButton(false);
  };

  let userMsgIdx = 0;

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="animate-in fade-in-0 bg-dialog-overlay/50 absolute inset-0 z-20 backdrop-blur-[2px] sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <ChatSidebar
        project={project}
        chatList={chatList}
        currentChatId={currentChatId}
        isOpen={sidebarOpen}
        style={{ width: sidebarWidth }}
        onNewChat={() => {
          resetScrollState();
          startNewChat();
        }}
        onLoadChat={(chat) => {
          resetScrollState();
          loadChat(chat);
          setSidebarOpen(false);
        }}
        onDeleteChat={handleDeleteChat}
      />

      {/* Resize handle — desktop only */}
      <div
        className="border-muted-foreground/10 group bg-muted relative z-10 hidden w-4 shrink-0 cursor-col-resize items-center justify-center sm:flex"
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeTouchStart}>
        <div className="bg-muted-foreground/30 group-hover:bg-muted-foreground/60 h-8 w-1 rounded-full transition-colors" />
      </div>

      {/* Chat area */}
      <div className="bg-muted flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <div className="border-muted-foreground/10 flex shrink-0 items-center gap-2 border-b px-3 py-1.5 sm:hidden">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle chat history"
            className="text-muted-foreground hover:text-foreground shrink-0 rounded p-0.5 transition-colors">
            <Menu className="size-4" />
          </button>
          <span className="text-foreground min-w-0 flex-1 truncate text-xs font-medium">
            {project?.displayName ?? 'AI Chat'}
          </span>
          <button
            onClick={() => {
              resetScrollState();
              startNewChat();
            }}
            aria-label="New chat"
            className="text-muted-foreground hover:text-foreground shrink-0 rounded p-0.5 transition-colors">
            <MessageSquarePlus className="size-4" />
          </button>
        </div>

        {/* Scrollable message area */}
        <div className="relative min-h-0 flex-1">
          <div
            ref={messagesContainerRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const scrolledUp = el.scrollHeight - el.scrollTop - el.clientHeight > 50;
              userScrolledUp.current = scrolledUp;
              setShowScrollButton(scrolledUp);
            }}
            className="absolute inset-0 space-y-4 overflow-y-auto scroll-smooth mask-[linear-gradient(to_bottom,black_calc(100%-80px),transparent)] p-4 pb-20">
            {/* Empty state suggestions */}
            {messages.length === 0 && (
              <div className="mt-2 flex flex-col gap-2">
                <p className="text-muted-foreground/60 px-1 text-xs">Try asking…</p>
                {[
                  'How do I create a new DNS zone?',
                  'How do i install the Datum Desktop app?',
                  'Can you help me with a support ticket?',
                  'What CLI command do I use to manage domains?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    disabled={!isReady}
                    onClick={() => {
                      clearError();
                      htmlByUserMsgIndex.current.push(`<p>${suggestion}</p>`);
                      void sendMessage({ text: suggestion });
                    }}
                    className="bg-card hover:bg-accent text-foreground border-muted-foreground/15 w-fit rounded-xl border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, msgIdx) => {
              const isLastMessage = msgIdx === messages.length - 1;

              if (msg.role === 'system') {
                const label = msg.parts.find(isTextUIPart)?.text ?? 'Unknown project';
                return (
                  <div key={msg.id} className="flex items-center gap-2 py-1">
                    <div className="bg-muted-foreground/20 h-px flex-1" />
                    <span className="text-muted-foreground/60 text-xs">Switched to {label}</span>
                    <div className="bg-muted-foreground/20 h-px flex-1" />
                  </div>
                );
              }

              if (msg.role === 'user') {
                const html = htmlByUserMsgIndex.current[userMsgIdx++];
                const fallbackText = msg.parts.find(isTextUIPart)?.text ?? '';
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-primary text-primary-foreground max-w-[80%] rounded-2xl rounded-br-xs px-3 py-2 text-sm">
                      <div
                        className="[&_em]:italic [&_p]:my-0.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_s]:line-through [&_strong]:font-semibold [&_u]:underline"
                        dangerouslySetInnerHTML={{ __html: html ?? `<p>${fallbackText}</p>` }}
                      />
                    </div>
                  </div>
                );
              }

              return (
                <AssistantMessage
                  key={msg.id}
                  msg={msg}
                  isLastMessage={isLastMessage}
                  status={status}
                />
              );
            })}

            {error && (
              <div className="text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-sm">
                {error.message.includes('503') || error.message.includes('not configured')
                  ? 'AI assistant is not configured.'
                  : `Error: ${error.message}`}
              </div>
            )}

            {status === 'submitted' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-3 py-3">
                  <LoadingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <AnimatePresence>
            {showScrollButton && messages.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                onClick={() => {
                  userScrolledUp.current = false;
                  setShowScrollButton(false);
                  bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                aria-label="Scroll to bottom"
                className="ring-border bg-card text-muted-foreground hover:text-foreground absolute bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-full p-1.5 ring-1 transition-colors">
                <Icon icon={ArrowDown} className="size-3.5" />
              </motion.button>
            )}
          </AnimatePresence>

          <ChatInput editor={editor} isReady={isReady} onSend={handleSendClick} />
        </div>
      </div>
    </div>
  );
}
