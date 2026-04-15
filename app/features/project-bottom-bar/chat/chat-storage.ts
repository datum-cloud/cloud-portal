import type { UIMessage } from 'ai';

const KEY_PREFIX = 'datum:chats:';
const MAX_CHATS = 50;

export interface StoredChat {
  id: string;
  title: string;
  messages: UIMessage[];
  /** Tiptap HTML for each user message, indexed by position in the user-message sub-array. */
  userHtml?: string[];
  createdAt: number;
  updatedAt: number;
}

function storageKey(projectId: string): string {
  return `${KEY_PREFIX}${projectId}`;
}

export function listChats(projectId: string): StoredChat[] {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    return raw ? (JSON.parse(raw) as StoredChat[]) : [];
  } catch {
    return [];
  }
}

export function saveChat(projectId: string, chat: StoredChat): void {
  try {
    const rest = listChats(projectId).filter((c) => c.id !== chat.id);
    rest.unshift(chat); // most recent first
    localStorage.setItem(storageKey(projectId), JSON.stringify(rest.slice(0, MAX_CHATS)));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function deleteChat(projectId: string, chatId: string): void {
  try {
    const chats = listChats(projectId).filter((c) => c.id !== chatId);
    localStorage.setItem(storageKey(projectId), JSON.stringify(chats));
  } catch {}
}

export function deriveTitle(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return 'New chat';
  const text = first.parts.find((p) => p.type === 'text')?.text ?? '';
  return text.length > 42 ? text.slice(0, 42) + '…' : text || 'New chat';
}

export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
