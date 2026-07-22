'use client';

import { CLOUD_ASSISTANT_CONFIG } from '../cloud-config';
import { DEFAULT_EFFORT_ID, DEFAULT_MODEL_ID } from '../constants';
import { useChatLogic } from '../hooks';
import { deriveTitle } from '../lib';
import { AssistantWorkspace as SharedAssistantWorkspace } from '@datum-cloud/datum-ui/assistant';

/**
 * Cloud-portal's host wrapper around the shared, props-driven
 * `@datum-cloud/datum-ui/assistant` workspace. Owns state + transport (the
 * `useChatLogic` hook, per-project localStorage, tiptap editor, speech input)
 * and feeds it into the presentational layer. staff-portal has its own
 * equivalent wrapper. Cloud hides the model picker (`modelSelector: false`), so
 * the model/effort props are inert placeholders.
 */
export function AssistantWorkspace() {
  const {
    project,
    messages,
    status,
    error,
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
    sendSuggestion,
    handleRetry,
    stop,
    historyOpen,
    setHistoryOpen,
    speech,
  } = useChatLogic();

  const hasMessages = messages.length > 0;
  const currentChat = chatList.find((c) => c.id === currentChatId);
  const title = currentChat?.title ?? (hasMessages ? deriveTitle(messages) : 'New chat');

  return (
    <SharedAssistantWorkspace
      config={CLOUD_ASSISTANT_CONFIG}
      title={title}
      messages={messages}
      status={status}
      error={error}
      isReady={isReady}
      chatList={chatList}
      currentChatId={currentChatId}
      // Names which project these chats belong to (cloud scopes chats per project).
      sidebarHeader={
        project ? (
          <div className="min-w-0">
            <p className="text-muted-foreground/50 text-1xs truncate">Project</p>
            <p className="text-foreground truncate text-xs font-medium">
              {project.displayName ?? project.name}
            </p>
          </div>
        ) : undefined
      }
      editor={editor}
      htmlByUserMsgIndex={htmlByUserMsgIndex}
      bottomRef={bottomRef}
      containerRef={messagesContainerRef}
      userScrolledUpRef={userScrolledUp}
      onSend={handleSendClick}
      onStop={stop}
      onRetry={handleRetry}
      onNewChat={startNewChat}
      // The shared list is typed as ChatSummary; re-resolve the full StoredChat
      // (with userHtml) from our own list before loading.
      onLoadChat={(chat) => {
        const full = chatList.find((c) => c.id === chat.id);
        if (full) loadChat(full);
      }}
      onDeleteChat={handleDeleteChat}
      onSuggestion={sendSuggestion}
      // Model picker is hidden for cloud — these are inert.
      modelId={DEFAULT_MODEL_ID}
      effortId={DEFAULT_EFFORT_ID}
      onModelChange={() => {}}
      onEffortChange={() => {}}
      micSupported={speech.isSupported}
      micListening={speech.isListening}
      micFrequencyData={speech.frequencyData}
      onMicToggle={speech.isListening ? speech.stopListening : speech.startListening}
      historyOpen={historyOpen}
      onToggleHistory={() => setHistoryOpen((o) => !o)}
    />
  );
}
