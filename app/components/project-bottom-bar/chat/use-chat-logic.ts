import { deleteChat, deriveTitle, listChats, saveChat, type StoredChat } from './chat-storage';
import { useProjectContext } from '@/providers/project.provider';
import { useChat } from '@ai-sdk/react';
import { cn } from '@shadcn/lib/utils';
import Placeholder from '@tiptap/extension-placeholder';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { DefaultChatTransport } from 'ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function detectOs(): 'macos' | 'windows' | 'linux' | 'unknown' {
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua)) return 'macos';
  if (/Win/i.test(ua)) return 'windows';
  if (/Linux/i.test(ua)) return 'linux';
  return 'unknown';
}

export function useChatLogic() {
  const { project, org } = useProjectContext();
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Chat history (localStorage) ──────────────────────────────────────────────
  const [currentChatId, setCurrentChatId] = useState<string>(() => crypto.randomUUID());
  const currentChatIdRef = useRef(currentChatId);
  currentChatIdRef.current = currentChatId;

  const chatCreatedAtRef = useRef(Date.now());
  const [chatList, setChatList] = useState<StoredChat[]>([]);

  useEffect(() => {
    setChatList(project?.name ? listChats(project.name) : []);
  }, [project?.name]);

  const refreshChatList = useCallback(() => {
    if (project?.name) setChatList(listChats(project.name));
  }, [project?.name]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────────
  const userScrolledUp = useRef(false);

  const messagesContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new MutationObserver(() => {
      if (userScrolledUp.current) return;
      node.scrollTop = node.scrollHeight;
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
      htmlByUserMsgIndex.current = chat.messages
        .filter((m) => m.role === 'user')
        .map((m) => {
          const text = m.parts.find((p) => p.type === 'text')?.text ?? '';
          return `<p>${text}</p>`;
        });
      setMessages(chat.messages);
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
      Placeholder.configure({ placeholder: 'Ask about your resources…' }),
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

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return {
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
  };
}
