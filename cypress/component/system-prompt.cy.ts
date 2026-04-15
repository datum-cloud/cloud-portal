import { buildSystemPrompt } from '@/modules/assistant/system-prompt';

describe('buildSystemPrompt', () => {
  it('always returns two system messages', () => {
    const result = buildSystemPrompt();
    expect(result).to.have.length(2);
    expect(result[0].role).to.equal('system');
    expect(result[1].role).to.equal('system');
  });

  it('first message contains the static identity prompt', () => {
    const [staticMsg] = buildSystemPrompt();
    expect(staticMsg.content).to.include('You are Patch');
  });

  it('first message has Anthropic cache-control hint', () => {
    const [staticMsg] = buildSystemPrompt();
    const opts = staticMsg.providerOptions as Record<string, unknown> | undefined;
    expect(opts).to.have.nested.property('anthropic.cacheControl.type', 'ephemeral');
  });

  // ── org / project combinations ──────────────────────────────────────────

  it('includes project and org when both are provided', () => {
    const [, dynamic] = buildSystemPrompt('proj-123', 'org-456', 'My Project', 'My Org');
    expect(dynamic.content).to.include('project "My Project" (ID: proj-123)');
    expect(dynamic.content).to.include('organization "My Org" (ID: org-456)');
  });

  it('includes only project when org is omitted', () => {
    const [, dynamic] = buildSystemPrompt('proj-123', undefined, 'My Project');
    expect(dynamic.content).to.include('project "My Project" (ID: proj-123)');
    expect(dynamic.content).not.to.include('organization');
  });

  it('includes only org when project is omitted', () => {
    const [, dynamic] = buildSystemPrompt(undefined, 'org-456', undefined, 'My Org');
    expect(dynamic.content).to.include('organization "My Org" (ID: org-456)');
    expect(dynamic.content).not.to.include('project');
  });

  it('falls back to name when displayName is missing', () => {
    const [, dynamic] = buildSystemPrompt('proj-123', 'org-456');
    expect(dynamic.content).to.include('project "proj-123"');
    expect(dynamic.content).to.include('organization "org-456"');
  });

  it('omits project/org context when both are undefined', () => {
    const [, dynamic] = buildSystemPrompt();
    expect(dynamic.content).not.to.include('project');
    expect(dynamic.content).not.to.include('organization');
  });

  // ── clientOs ────────────────────────────────────────────────────────────

  it('includes the client OS when provided', () => {
    const [, dynamic] = buildSystemPrompt(undefined, undefined, undefined, undefined, 'macos');
    expect(dynamic.content).to.include("user's operating system is macos");
  });

  it('omits OS line when clientOs is undefined', () => {
    const [, dynamic] = buildSystemPrompt();
    expect(dynamic.content).not.to.include('operating system');
  });

  // ── date ────────────────────────────────────────────────────────────────

  it("includes today's date in ISO format", () => {
    const today = new Date().toISOString().slice(0, 10);
    const [, dynamic] = buildSystemPrompt();
    expect(dynamic.content).to.include(`Today is ${today}`);
  });

  // ── create URLs ─────────────────────────────────────────────────────────

  it('includes create URLs when projectName is provided', () => {
    const [, dynamic] = buildSystemPrompt('proj-123');
    expect(dynamic.content).to.include('/project/proj-123/domains?action=create');
    expect(dynamic.content).to.include('/project/proj-123/dns-zones?action=create');
    expect(dynamic.content).to.include('/project/proj-123/edge?action=create');
    expect(dynamic.content).to.include('/project/proj-123/secrets');
    expect(dynamic.content).to.include('/project/proj-123/connectors');
  });

  it('omits create URLs when projectName is undefined', () => {
    const [, dynamic] = buildSystemPrompt();
    expect(dynamic.content).not.to.include('/project/');
  });
});
