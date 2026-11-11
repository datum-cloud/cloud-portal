/** The headline every permission denial shows, in place of the raw upstream text. */
export const PERMISSION_DENIED_MESSAGE = "You don't have permission to do this.";

/**
 * The apiserver's RBAC denial, as Milo IAM returns it:
 * `User "jane@example.com" cannot list resource "projects" in API group "..."`.
 * Also matches the unquoted form and `cannot get path "/..."`.
 */
const RBAC_DENIAL = /\buser\s+"?[^\s"]+"?\s+cannot\s+\w+/i;
const RBAC_VERB_ON_RESOURCE = /\bcannot\s+\w+\s+(?:resource|path)\s+"/i;

/** Bare status words carry nothing the user can act on. */
const GENERIC_DENIAL = /^\s*(?:forbidden|permission denied|access denied|not authorized)\.?\s*$/i;

/**
 * True when a 403 message is machine text that should not reach the user:
 * empty, a bare status word, or an RBAC denial naming users, verbs and API
 * groups.
 *
 * Policy denials written for people (quota, project suspension, a domain still
 * used by a DNS zone, app-authored copy) do not match and keep their own text.
 */
export function isRawAuthorizationMessage(message: string | undefined): boolean {
  if (!message?.trim()) return true;
  return (
    GENERIC_DENIAL.test(message) || RBAC_DENIAL.test(message) || RBAC_VERB_ON_RESOURCE.test(message)
  );
}

export interface PlainAuthorizationMessage {
  /** What the user sees. */
  message: string;
  /** The upstream text the headline replaced, kept for debugging. */
  originalMessage?: string;
}

/**
 * Swaps raw 403 text for the plain headline. Keeps the raw text in
 * `originalMessage` unless the caller already holds a fuller original (the
 * unparsed K8s Status message).
 */
export function toPlainAuthorizationMessage(
  message: string,
  originalMessage?: string
): PlainAuthorizationMessage {
  if (!isRawAuthorizationMessage(message)) return { message, originalMessage };
  return {
    message: PERMISSION_DENIED_MESSAGE,
    originalMessage: originalMessage ?? (message.trim() ? message : undefined),
  };
}
