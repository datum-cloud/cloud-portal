import type { StoredChat } from '../types';
import type { UIMessage } from 'ai';

/**
 * Local chat history, scoped per project — cloud-portal keys chats by
 * `project.name` so each project keeps its own conversation list.
 */
const KEY_PREFIX = 'datum:chats:';
const MAX_CHATS = 50;

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
