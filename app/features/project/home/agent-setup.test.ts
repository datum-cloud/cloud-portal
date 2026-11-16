import { agentSetupPrompt } from './agent-setup';
import { describe, expect, it } from 'vitest';

describe('agentSetupPrompt', () => {
  const base =
    'Fetch and execute the appropriate instructions to set me up for Datum Cloud from https://agents.datum.net/setup/prompt.md.';

  it('names the organization and project', () => {
    expect(agentSetupPrompt('acme', 'acme-web')).toBe(
      `${base} Use organization \`acme\` and project \`acme-web\`.`
    );
  });

  it('names just the project when the organization is unknown', () => {
    expect(agentSetupPrompt('', 'acme-web')).toBe(`${base} Use project \`acme-web\`.`);
  });

  it('falls back to the bare instruction', () => {
    expect(agentSetupPrompt()).toBe(base);
  });
});
