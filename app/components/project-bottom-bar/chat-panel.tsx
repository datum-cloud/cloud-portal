import {
  deleteChat,
  deriveTitle,
  formatRelativeTime,
  listChats,
  saveChat,
  type StoredChat,
} from './chat-storage';
import { useProjectContext } from '@/providers/project.provider';
import { openSupportMessage } from '@/utils/open-support-message';
import { useChat } from '@ai-sdk/react';
import { Button, Icon } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { code } from '@streamdown/code';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  DefaultChatTransport,
  getToolName,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
} from 'ai';
import {
  ArrowRight,
  Brain,
  ChevronDown,
  Loader2,
  MessageSquarePlus,
  SendHorizonal,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { type ExtraProps, Streamdown } from 'streamdown';
import 'streamdown/styles.css';

// ─── OS detection ──────────────────────────────────────────────────────────────

function detectOs(): 'macos' | 'windows' | 'linux' | 'unknown' {
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua)) return 'macos';
  if (/Win/i.test(ua)) return 'windows';
  if (/Linux/i.test(ua)) return 'linux';
  return 'unknown';
}

// ─── Thinking block ────────────────────────────────────────────────────────────

function ThinkingBlock({ text, isStreaming = false }: { text: string; isStreaming?: boolean }) {
  const [open, setOpen] = useState(false);
  const startedAt = useRef<number | null>(null);
  const duration = useRef<number | null>(null);

  // Compute timing inline — no useEffect needed
  if (isStreaming && startedAt.current === null) {
    startedAt.current = Date.now();
  }
  if (!isStreaming && startedAt.current !== null && duration.current === null) {
    duration.current = Math.round((Date.now() - startedAt.current) / 1000);
  }

  const label = isStreaming
    ? 'Thinking…'
    : duration.current !== null
      ? duration.current < 1
        ? 'Thought for less than 1 second'
        : `Thought for ${duration.current}s`
      : 'Thought';

  return (
    <div className="mb-3">
      <button
        onClick={() => !isStreaming && setOpen((o) => !o)}
        disabled={isStreaming}
        className={cn(
          'text-muted-foreground flex items-center gap-1.5 text-xs transition-colors',
          !isStreaming && 'hover:text-foreground cursor-pointer',
          isStreaming && 'cursor-default'
        )}>
        <Brain className={cn('size-3.5 shrink-0', isStreaming && 'animate-pulse')} />
        <span>{label}</span>
        {!isStreaming && (
          <ChevronDown
            className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-180')}
          />
        )}
      </button>

      {/* Smooth expand / collapse via CSS grid */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200',
          open && !isStreaming ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}>
        <div className="overflow-hidden">
          <div className="text-muted-foreground/75 border-muted-foreground/20 mt-2 border-l-2 pl-3 text-xs leading-relaxed whitespace-pre-wrap">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Chat panel ────────────────────────────────────────────────────────────────

export function ChatPanel() {
  const { project, org } = useProjectContext();
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Chat history (localStorage) ──────────────────────────────────────────────
  const [currentChatId, setCurrentChatId] = useState<string>(() => crypto.randomUUID());
  const currentChatIdRef = useRef(currentChatId);
  currentChatIdRef.current = currentChatId;

  const chatCreatedAtRef = useRef(Date.now());

  const [chatList, setChatList] = useState<StoredChat[]>([]);

  // Reload chat list when project changes
  useEffect(() => {
    setChatList(project?.name ? listChats(project.name) : []);
  }, [project?.name]);

  const refreshChatList = useCallback(() => {
    if (project?.name) setChatList(listChats(project.name));
  }, [project?.name]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────────
  const messagesContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new MutationObserver(() => {
      const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 150;
      if (nearBottom) node.scrollTop = node.scrollHeight;
    });
    observer.observe(node, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  // ── Refs for latest values inside callbacks ───────────────────────────────────
  const projectRef = useRef(project);
  projectRef.current = project;
  const orgRef = useRef(org);
  orgRef.current = org;

  // Track Tiptap HTML per user message by position in the user-message array.
  const htmlByUserMsgIndex = useRef<string[]>([]);

  // ── onFinish: save chat to localStorage after each complete response ──────────
  const onFinishRef = useRef<(messages: ReturnType<typeof listChats>[number]['messages']) => void>(
    () => {}
  );
  onFinishRef.current = (finishedMessages) => {
    const projectId = projectRef.current?.name;
    if (!projectId) return;
    const toSave = finishedMessages.filter((m) => m.role !== 'system');
    if (toSave.length === 0) return;
    saveChat(projectId, {
      id: currentChatIdRef.current,
      title: deriveTitle(toSave),
      messages: toSave,
      createdAt: chatCreatedAtRef.current,
      updatedAt: Date.now(),
    });
    refreshChatList();
  };

  // ── Transport ─────────────────────────────────────────────────────────────────
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/assistant',
        prepareSendMessagesRequest: ({ messages, id, body }) => ({
          body: {
            id,
            messages: messages.filter((m) => m.role !== 'system'),
            ...body,
            projectName: projectRef.current?.name,
            projectDisplayName: projectRef.current?.displayName,
            orgName: orgRef.current?.name,
            orgDisplayName: orgRef.current?.displayName,
            clientOs: detectOs(),
          },
        }),
      }),
    []
  );

  const { messages, setMessages, sendMessage, status, error, clearError } = useChat({
    transport,
    onFinish: ({ messages: finished }) => onFinishRef.current(finished),
  });
  const isReady = status === 'ready' || status === 'error';

  // ── Chat switching ────────────────────────────────────────────────────────────
  const startNewChat = useCallback(() => {
    const id = crypto.randomUUID();
    setCurrentChatId(id);
    chatCreatedAtRef.current = Date.now();
    htmlByUserMsgIndex.current = [];
    setMessages([]);
  }, [setMessages]);

  const loadChat = useCallback(
    (chat: StoredChat) => {
      setCurrentChatId(chat.id);
      chatCreatedAtRef.current = chat.createdAt;
      // Pre-populate HTML for stored user messages so they render as plain text
      htmlByUserMsgIndex.current = chat.messages
        .filter((m) => m.role === 'user')
        .map((m) => {
          const text = m.parts.find((p) => p.type === 'text')?.text ?? '';
          return `<p>${text}</p>`;
        });
      setMessages(chat.messages);
      // Scroll to bottom after messages render — use instant so it doesn't animate through history
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 50);
    },
    [setMessages]
  );

  const handleDeleteChat = useCallback(
    (e: React.MouseEvent, chatId: string) => {
      e.stopPropagation();
      const projectId = project?.name;
      if (!projectId) return;
      deleteChat(projectId, chatId);
      setChatList(listChats(projectId));
      // If deleting the active chat, start fresh
      if (chatId === currentChatId) startNewChat();
    },
    [project?.name, currentChatId, startNewChat]
  );

  // ── Editor ────────────────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: 'Ask about your resources…',
      }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none',
          'px-3 py-2 text-sm focus:outline-none',
          '[&_p]:my-0.5'
        ),
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          const text = view.state.doc.textContent.trim();
          if (text && isReady) {
            clearError();
            htmlByUserMsgIndex.current.push(editor?.getHTML() ?? `<p>${text}</p>`);
            void sendMessage({ text });
            const { state } = view;
            view.dispatch(
              state.tr.replaceWith(0, state.doc.content.size, state.schema.nodes.paragraph.create())
            );
          }
          return true;
        }
        return false;
      },
    },
  });

  const handleSendClick = () => {
    if (!editor || !isReady) return;
    const text = editor.getText().trim();
    if (text) {
      clearError();
      htmlByUserMsgIndex.current.push(editor.getHTML());
      void sendMessage({ text });
      editor.commands.clearContent();
      editor.commands.focus();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  let userMsgIdx = 0;

  return (
    <div className="flex h-full">
      {/* ── Sidebar ── */}
      <div className="bg-card border-muted-foreground/10 flex w-44 shrink-0 flex-col border-r">
        {project && (
          <div className="border-muted-foreground/10 border-b px-3 py-2">
            <p className="text-muted-foreground/50 text-1xs truncate">Project</p>
            <p className="text-foreground truncate text-xs font-medium">
              {project.displayName ?? project.name}
            </p>
          </div>
        )}
        <div className="p-2">
          <Button
            theme="outline"
            type="secondary"
            size="xs"
            onClick={startNewChat}
            className="w-full">
            <MessageSquarePlus className="size-3.5 shrink-0" />
            New chat
          </Button>
        </div>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2">
          {chatList.length === 0 ? (
            <p className="text-muted-foreground/50 px-2 py-1 text-xs">No saved chats</p>
          ) : (
            chatList.map((chat) => (
              <button
                key={chat.id}
                onClick={() => loadChat(chat)}
                className={cn(
                  'group w-full rounded-lg px-2 py-1.5 text-left transition-colors',
                  chat.id === currentChatId
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}>
                <span className="flex items-center gap-1">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{chat.title}</span>
                  <span
                    role="button"
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    aria-label="Delete chat"
                    className="text-muted-foreground/40 hover:text-destructive shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Trash2 className="size-3" />
                  </span>
                </span>
                <span className="text-muted-foreground/60 text-[10px]">
                  {formatRelativeTime(chat.updatedAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className="bg-muted relative min-w-0 flex-1">
        {/* Message list */}
        <div
          ref={messagesContainerRef}
          className="absolute inset-0 space-y-4 overflow-y-auto p-4 pb-20">
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
                  <div className="bg-primary text-primary-foreground max-w-[80%] rounded-xl px-3 py-2 text-sm">
                    <div
                      className="[&_em]:italic [&_p]:my-0.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_s]:line-through [&_strong]:font-semibold [&_u]:underline"
                      dangerouslySetInnerHTML={{
                        __html: html ?? `<p>${fallbackText}</p>`,
                      }}
                    />
                  </div>
                </div>
              );
            }

            // Assistant message
            return (
              <div key={msg.id} className="flex w-full justify-start">
                <div className="bg-muted text-foreground w-full rounded-xl px-3 py-2 text-sm">
                  {msg.parts.map((part, i) => {
                    if (isReasoningUIPart(part)) {
                      const isThinkingStreaming =
                        isLastMessage && status === 'streaming' && i === msg.parts.length - 1;
                      return (
                        <ThinkingBlock key={i} text={part.text} isStreaming={isThinkingStreaming} />
                      );
                    }
                    if (isTextUIPart(part) && part.text) {
                      return (
                        <Streamdown
                          key={i}
                          isAnimating={isLastMessage && status === 'streaming'}
                          className="**:data-[streamdown='code-block-actions']:bg-background w-full max-w-full [&_[data-streamdown='code-block-header'][data-language='']]:hidden [&_h2]:text-xl [&_pre]:my-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                          plugins={{ code }}
                          components={{
                            a: ({
                              href,
                              children,
                            }: React.AnchorHTMLAttributes<HTMLAnchorElement> & ExtraProps) => {
                              return href?.startsWith('/') ? (
                                <Link className="underline" to={href}>
                                  {children}
                                </Link>
                              ) : (
                                <a
                                  href={href}
                                  className="underline"
                                  target="_blank"
                                  rel="noopener noreferrer">
                                  {children}
                                </a>
                              );
                            },
                          }}>
                          {part.text}
                        </Streamdown>
                      );
                    }
                    if (
                      isToolUIPart(part) &&
                      getToolName(part) === 'openSupportTicket' &&
                      part.state === 'output-available'
                    ) {
                      const result = part.output as {
                        subject: string;
                        message: string;
                      };
                      return (
                        <div key={i} className="mt-2">
                          <Button
                            onClick={() => {
                              openSupportMessage({
                                subject: result.subject,
                                text: result.message,
                              });
                            }}
                            className="mb-2">
                            Open Support Ticket
                            <Icon icon={ArrowRight} className="size-4" />
                          </Button>
                        </div>
                      );
                    }
                    return null;
                  })}
                  {/* Streaming indicator while assistant message is empty */}
                  {msg.parts.every((p) => !isTextUIPart(p) || !p.text) && (
                    <div className="flex gap-1">
                      <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
                      <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
                      <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full" />
                    </div>
                  )}
                </div>
              </div>
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
              <div className="bg-muted flex gap-1 rounded-xl px-3 py-3">
                <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
                <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
                <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Floating input */}
        <div className="absolute right-0 bottom-0 left-0 z-10 px-2 pb-2">
          <div className="ring-border bg-card mx-auto flex w-1/2 items-end gap-1 rounded-[28px] p-2 ring-1">
            <EditorContent editor={editor} className="min-w-0 flex-1" />
            <button
              onClick={handleSendClick}
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
      </div>
    </div>
  );
}
