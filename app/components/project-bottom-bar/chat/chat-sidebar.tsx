import { formatRelativeTime, type StoredChat } from './chat-storage';
import type { Project } from '@/resources/projects';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { MessageSquarePlus, Trash2 } from 'lucide-react';

interface ChatSidebarProps {
  project: Project | undefined;
  chatList: StoredChat[];
  currentChatId: string;
  isOpen: boolean;
  style?: React.CSSProperties;
  onNewChat: () => void;
  onLoadChat: (chat: StoredChat) => void;
  onDeleteChat: (e: React.MouseEvent, chatId: string) => void;
}

export function ChatSidebar({
  project,
  chatList,
  currentChatId,
  isOpen,
  style,
  onNewChat,
  onLoadChat,
  onDeleteChat,
}: ChatSidebarProps) {
  return (
    <div
      style={style}
      className={cn(
        'bg-card border-muted-foreground/10 flex shrink-0 flex-col border-r',
        'sm:relative sm:flex',
        'max-sm:absolute max-sm:inset-y-0 max-sm:left-0 max-sm:z-20',
        !isOpen && 'max-sm:hidden'
      )}>
      {project && (
        <div className="border-muted-foreground/10 border-b px-3 py-2">
          <p className="text-muted-foreground/50 text-1xs truncate">Project</p>
          <p className="text-foreground truncate text-xs font-medium">
            {project.displayName ?? project.name}
          </p>
        </div>
      )}

      <div className="p-2">
        <Button theme="outline" type="secondary" size="xs" onClick={onNewChat} className="w-full">
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
              onClick={() => onLoadChat(chat)}
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
                  onClick={(e) => onDeleteChat(e, chat.id)}
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
  );
}
