import { deleteChat, deriveTitle, listChats, saveChat, type StoredChat } from './chat-storage';
import { useSpeechInput } from './use-speech-input';
import { useProjectContext } from '@/providers/project.provider';
import { useChat } from '@ai-sdk/react';
import { cn } from '@datum-cloud/datum-ui/utils';
import Placeholder from '@tiptap/extension-placeholder';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { DefaultChatTransport } from 'ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPE_MAP[c]!);
}

const ALLOWED_TAGS = new Set(['p', 'strong', 'em', 'u', 's', 'br']);

/**
 * Sanitises user-authored HTML by walking the DOM tree and keeping only
 * the Tiptap-safe tags (p, strong, em, u, s, br). Text nodes are escaped.
 * Plain text (no tags) is wrapped in a `<p>` so the bubble renders correctly.
 */
export function sanitizeUserHtml(raw: string): string {
  const doc = new DOMParser().parseFromString(raw, 'text/html');

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent ?? '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map(walk).join('');

    if (ALLOWED_TAGS.has(tag)) {
      return tag === 'br' ? '<br>' : `<${tag}>${children}</${tag}>`;
    }
    return children;
  }

  const result = Array.from(doc.body.childNodes).map(walk).join('');
  return result.startsWith('<p>') ? result : `<p>${result}</p>`;
}

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
  const scrollRaf = useRef(0);

  const messagesContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new MutationObserver(() => {
      if (userScrolledUp.current) return;
      cancelAnimationFrame(scrollRaf.current);
      scrollRaf.current = requestAnimationFrame(() => {
        node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
      });
    });
    observer.observe(node, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(scrollRaf.current);
    };
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
      userHtml: [...htmlByUserMsgIndex.current],
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

  const { messages, setMessages, sendMessage, stop, status, error, clearError } = useChat({
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
    clearError();
  }, [setMessages, clearError]);

  const loadChat = useCallback(
    (chat: StoredChat) => {
      setCurrentChatId(chat.id);
      chatCreatedAtRef.current = chat.createdAt;
      htmlByUserMsgIndex.current = chat.userHtml
        ? chat.userHtml.map(sanitizeUserHtml)
        : chat.messages
            .filter((m) => m.role === 'user')
            .map((m) => {
              const text = m.parts.find((p) => p.type === 'text')?.text ?? '';
              return sanitizeUserHtml(text);
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

  const speech = useSpeechInput(editor);

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

  const handleRetry = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    const text = lastUserMsg.parts.find((p) => p.type === 'text')?.text;
    if (!text) return;

    const lastUserIdx = messages.lastIndexOf(lastUserMsg);
    const retainedHtml = htmlByUserMsgIndex.current.slice(0, -1);

    setMessages(messages.slice(0, lastUserIdx));
    htmlByUserMsgIndex.current = retainedHtml;
    clearError();

    requestAnimationFrame(() => {
      htmlByUserMsgIndex.current.push(retainedHtml[retainedHtml.length] ?? `<p>${text}</p>`);
      void sendMessage({ text });
    });
  }, [messages, setMessages, clearError, sendMessage]);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  return {
    project,
    messages,
    status,
    error,
    clearError,
    sendMessage,
    stop,
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
    handleRetry,
    sidebarOpen,
    setSidebarOpen,
    speech,
  };
}
