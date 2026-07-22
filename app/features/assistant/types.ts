import type { UIMessage } from 'ai';

// Shared assistant types now live in datum-ui; re-export them so local
// `../types` imports keep resolving. StoredChat below is cloud-specific.
export type {
  AssistantConfig,
  EffortId,
  EffortOption,
  LinkRenderProps,
  ModelOption,
  ModelSelectorConfig,
  Turn,
} from '@datum-cloud/datum-ui/assistant';

/**
 * A locally-persisted chat (localStorage), scoped per project. Cloud-specific
 * superset of datum-ui's `ChatSummary` — adds the fields needed to restore a
 * conversation exactly (per-message Tiptap HTML, timestamps). Cloud has no
 * model/effort picker, so those fields are absent (unlike staff-portal's).
 */
export interface StoredChat {
  id: string;
  title: string;
  messages: UIMessage[];
  /** Tiptap HTML for each user message, indexed by position in the user-message sub-array. */
  userHtml?: string[];
  createdAt: number;
  updatedAt: number;
}
