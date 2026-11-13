import { AGENT_SETUP_PROMPT_URL } from '@/utils/config/query.config';

/**
 * The sentence a user pastes into their coding agent (Claude Code, Codex,
 * Cursor, Copilot...). The agent fetches the setup instructions and follows
 * them. Naming the organization and project lets it switch datumctl to this
 * project without asking.
 */
export function agentSetupPrompt(organizationId?: string, projectId?: string): string {
  const base = `Fetch and execute the appropriate instructions to set me up for Datum Cloud from ${AGENT_SETUP_PROMPT_URL}.`;
  if (organizationId && projectId) {
    return `${base} Use organization \`${organizationId}\` and project \`${projectId}\`.`;
  }
  if (projectId) {
    return `${base} Use project \`${projectId}\`.`;
  }
  return base;
}

export const AGENT_SETUP_COPIED_TOAST = 'Setup prompt copied. Paste it into your coding agent.';
