import {
  deleteChat,
  deriveTitle,
  formatRelativeTime,
  listChats,
  saveChat,
  type StoredChat,
} from '@/features/project-bottom-bar/chat/chat-storage';
import type { UIMessage } from 'ai';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROJECT = 'proj-abc';
const STORAGE_KEY = `datum:chats:${PROJECT}`;

function makeMessage(role: 'user' | 'assistant', text: string): UIMessage {
  return {
    id: crypto.randomUUID(),
    role,
    parts: [{ type: 'text', text }],
  } as UIMessage;
}

function makeChat(overrides: Partial<StoredChat> = {}): StoredChat {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? 'Test chat',
    messages: overrides.messages ?? [makeMessage('user', 'hello')],
    createdAt: overrides.createdAt ?? Date.now(),
    updatedAt: overrides.updatedAt ?? Date.now(),
  };
}

// ─── deriveTitle (pure) ───────────────────────────────────────────────────────

describe('deriveTitle', () => {
  it('returns the first user message text', () => {
    const msgs = [makeMessage('assistant', 'Hi!'), makeMessage('user', 'What is DNS?')];
    expect(deriveTitle(msgs)).to.equal('What is DNS?');
  });

  it('truncates at 42 characters with ellipsis', () => {
    const long = 'a'.repeat(60);
    const msgs = [makeMessage('user', long)];
    expect(deriveTitle(msgs)).to.equal('a'.repeat(42) + '…');
  });

  it('returns "New chat" when no user message exists', () => {
    const msgs = [makeMessage('assistant', 'Hi!')];
    expect(deriveTitle(msgs)).to.equal('New chat');
  });

  it('returns "New chat" for an empty array', () => {
    expect(deriveTitle([])).to.equal('New chat');
  });

  it('returns "New chat" when user text part is empty', () => {
    const msg: UIMessage = {
      id: '1',
      role: 'user',
      parts: [{ type: 'text', text: '' }],
    } as UIMessage;
    expect(deriveTitle([msg])).to.equal('New chat');
  });

  it('keeps text that is exactly 42 characters', () => {
    const exact = 'b'.repeat(42);
    const msgs = [makeMessage('user', exact)];
    expect(deriveTitle(msgs)).to.equal(exact);
  });
});

// ─── formatRelativeTime (pure) ────────────────────────────────────────────────

describe('formatRelativeTime', () => {
  it('returns "just now" for timestamps < 60s ago', () => {
    expect(formatRelativeTime(Date.now() - 10_000)).to.equal('just now');
  });

  it('returns minutes ago', () => {
    expect(formatRelativeTime(Date.now() - 5 * 60_000)).to.equal('5m ago');
  });

  it('returns hours ago', () => {
    expect(formatRelativeTime(Date.now() - 3 * 3_600_000)).to.equal('3h ago');
  });

  it('returns "Yesterday" for 1 day ago', () => {
    expect(formatRelativeTime(Date.now() - 24 * 3_600_000)).to.equal('Yesterday');
  });

  it('returns days ago for 2–6 days', () => {
    expect(formatRelativeTime(Date.now() - 4 * 24 * 3_600_000)).to.equal('4d ago');
  });

  it('returns a locale date string for 7+ days ago', () => {
    const ts = Date.now() - 10 * 24 * 3_600_000;
    const result = formatRelativeTime(ts);
    expect(result).to.equal(new Date(ts).toLocaleDateString());
  });
});

// ─── localStorage-backed CRUD ─────────────────────────────────────────────────

describe('chat-storage CRUD', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  // ── listChats ─────────────────────────────────────────────────────────────

  it('listChats returns empty array when nothing stored', () => {
    expect(listChats(PROJECT)).to.deep.equal([]);
  });

  it('listChats returns empty array on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '%%%not-json%%%');
    expect(listChats(PROJECT)).to.deep.equal([]);
  });

  // ── saveChat ──────────────────────────────────────────────────────────────

  it('saveChat persists a chat that listChats retrieves', () => {
    const chat = makeChat({ id: 'c1' });
    saveChat(PROJECT, chat);

    const result = listChats(PROJECT);
    expect(result).to.have.length(1);
    expect(result[0].id).to.equal('c1');
  });

  it('saveChat puts the newest chat first', () => {
    saveChat(PROJECT, makeChat({ id: 'old' }));
    saveChat(PROJECT, makeChat({ id: 'new' }));

    const ids = listChats(PROJECT).map((c) => c.id);
    expect(ids).to.deep.equal(['new', 'old']);
  });

  it('saveChat replaces an existing chat with the same id', () => {
    saveChat(PROJECT, makeChat({ id: 'c1', title: 'v1' }));
    saveChat(PROJECT, makeChat({ id: 'c1', title: 'v2' }));

    const result = listChats(PROJECT);
    expect(result).to.have.length(1);
    expect(result[0].title).to.equal('v2');
  });

  it('saveChat caps storage at 50 chats', () => {
    for (let i = 0; i < 55; i++) {
      saveChat(PROJECT, makeChat({ id: `c-${i}` }));
    }
    expect(listChats(PROJECT)).to.have.length(50);
  });

  // ── deleteChat ────────────────────────────────────────────────────────────

  it('deleteChat removes the target chat', () => {
    saveChat(PROJECT, makeChat({ id: 'keep' }));
    saveChat(PROJECT, makeChat({ id: 'remove' }));

    deleteChat(PROJECT, 'remove');

    const ids = listChats(PROJECT).map((c) => c.id);
    expect(ids).to.deep.equal(['keep']);
  });

  it('deleteChat is a no-op for a non-existent id', () => {
    saveChat(PROJECT, makeChat({ id: 'c1' }));
    deleteChat(PROJECT, 'no-such-id');
    expect(listChats(PROJECT)).to.have.length(1);
  });
});
