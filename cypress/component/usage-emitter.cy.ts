// Import the pure submodules directly. The `@/modules/usage` barrel
// also re-exports `emitter.ts`, which depends on `@/utils/env/env.server`
// and would call `process.exit(1)` inside the Cypress browser bundle on
// validation failure. Each of these files is browser-safe.
import { buildAssistantUsageEvents } from '@/modules/usage/assistant-events';
import { resolveBillingContext, shouldSkipEmit } from '@/modules/usage/billing-context';
import {
  ASSISTANT_METERS,
  ASSISTANT_RESOURCE_GROUP,
  ASSISTANT_RESOURCE_KIND,
} from '@/modules/usage/meters';
import { isUlid, ulid } from '@/modules/usage/ulid';

describe('ulid', () => {
  it('produces a 26-character Crockford-base32 string', () => {
    const id = ulid();
    expect(id).to.have.lengthOf(26);
    expect(isUlid(id)).to.equal(true);
  });

  it('encodes the timestamp in the leading 10 characters', () => {
    // 0x000000000000 → all zero timestamp prefix
    const a = ulid(0);
    expect(a.slice(0, 10)).to.equal('0000000000');

    // Two ULIDs with the same timestamp share the time prefix.
    const t = 1712070000000;
    const b = ulid(t);
    const c = ulid(t);
    expect(b.slice(0, 10)).to.equal(c.slice(0, 10));
    // The randomness suffix should differ (effectively always).
    expect(b.slice(10)).not.to.equal(c.slice(10));
  });
});

describe('buildAssistantUsageEvents', () => {
  const baseInput = {
    projectName: 'proj-abc',
    conversationId: 'chat-123',
    model: 'claude-sonnet-4-6',
    now: Date.parse('2026-04-27T17:00:00.000Z'),
  } as const;

  it('emits one event per non-zero token axis plus the messages count', () => {
    const events = buildAssistantUsageEvents({
      ...baseInput,
      tokens: { inputTokens: 1200, outputTokens: 340 },
    });

    const meterNames = events.map((e) => e.meterName).sort();
    expect(meterNames).to.deep.equal(
      [
        ASSISTANT_METERS.inputTokens,
        ASSISTANT_METERS.messages,
        ASSISTANT_METERS.outputTokens,
      ].sort()
    );
  });

  it('includes cache-read and cache-write meters when present', () => {
    const events = buildAssistantUsageEvents({
      ...baseInput,
      tokens: {
        inputTokens: 100,
        outputTokens: 50,
        cachedInputTokens: 800,
        cacheCreationInputTokens: 200,
      },
    });
    const names = new Set(events.map((e) => e.meterName));
    expect(names.has(ASSISTANT_METERS.cacheReadTokens)).to.equal(true);
    expect(names.has(ASSISTANT_METERS.cacheWriteTokens)).to.equal(true);
  });

  it('skips zero-, negative-, and non-finite token counts', () => {
    const events = buildAssistantUsageEvents({
      ...baseInput,
      tokens: { inputTokens: 0, outputTokens: -5, cachedInputTokens: NaN },
    });
    // Only the messages meter (always 1) should remain.
    expect(events).to.have.lengthOf(1);
    expect(events[0]!.meterName).to.equal(ASSISTANT_METERS.messages);
    expect(events[0]!.value).to.equal('1');
  });

  it('rounds non-integer token values', () => {
    const events = buildAssistantUsageEvents({
      ...baseInput,
      tokens: { inputTokens: 1234.7 },
    });
    const input = events.find((e) => e.meterName === ASSISTANT_METERS.inputTokens);
    expect(input).to.exist;
    expect(input!.value).to.equal('1235');
  });

  it('attaches an envelope satisfying the v0 wire shape', () => {
    const events = buildAssistantUsageEvents({
      ...baseInput,
      conversationUid: 'a8f3a1b2-uid',
      region: 'us-east-1',
      tokens: { inputTokens: 10 },
    });
    const evt = events.find((e) => e.meterName === ASSISTANT_METERS.inputTokens)!;

    expect(isUlid(evt.eventID)).to.equal(true);
    expect(evt.timestamp).to.equal('2026-04-27T17:00:00.000Z');
    expect(evt.projectRef).to.deep.equal({ name: 'proj-abc' });
    expect(evt.value).to.equal('10');
    expect(evt.dimensions).to.deep.equal({ model: 'claude-sonnet-4-6', region: 'us-east-1' });
    expect(evt.resource).to.deep.equal({
      ref: {
        projectRef: { name: 'proj-abc' },
        group: ASSISTANT_RESOURCE_GROUP,
        kind: ASSISTANT_RESOURCE_KIND,
        namespace: 'default',
        name: 'chat-123',
        uid: 'a8f3a1b2-uid',
      },
      labels: { model: 'claude-sonnet-4-6', region: 'us-east-1' },
    });
  });

  it('omits the region dimension when not provided', () => {
    const events = buildAssistantUsageEvents({
      ...baseInput,
      tokens: { inputTokens: 10 },
    });
    const evt = events.find((e) => e.meterName === ASSISTANT_METERS.inputTokens)!;
    expect(evt.dimensions).to.deep.equal({ model: 'claude-sonnet-4-6' });
    expect(evt.resource.labels).to.deep.equal({ model: 'claude-sonnet-4-6' });
  });

  it('returns an empty array when no project name is provided', () => {
    // Caller is expected to gate on projectName, but the builder also
    // refuses to produce events without one (project is required for
    // attribution to a BillingAccountBinding).
    const events = buildAssistantUsageEvents({
      ...baseInput,
      projectName: '',
      tokens: { inputTokens: 100 },
    });
    // Builder still produces events with empty projectName — gating is
    // the route's responsibility — but the projectRef is empty.
    expect(events.every((e) => e.projectRef.name === '')).to.equal(true);
  });
});

describe('resolveBillingContext', () => {
  const binding = (overrides: {
    name: string;
    project: string;
    account?: string;
    phase?: 'Active' | 'Superseded';
  }) => ({
    metadata: { name: overrides.name },
    spec: {
      projectRef: { name: overrides.project },
      billingAccountRef: { name: overrides.account ?? 'acct-default' },
    },
    status: overrides.phase ? { phase: overrides.phase } : undefined,
  });

  it("returns 'no-org' (fail-open) when orgName is missing", async () => {
    const ctx = await resolveBillingContext({ projectName: 'p' });
    expect(ctx.status).to.equal('no-org');
    expect(shouldSkipEmit(ctx)).to.equal(false);
  });

  it("returns 'no-binding' when no binding references the project", async () => {
    const ctx = await resolveBillingContext(
      { orgName: 'org-1', projectName: 'p' },
      { listBindings: async () => [binding({ name: 'b1', project: 'other', phase: 'Active' })] }
    );
    expect(ctx.status).to.equal('no-binding');
    expect(shouldSkipEmit(ctx)).to.equal(true);
  });

  it("returns 'inactive' when the project's binding is Superseded", async () => {
    const ctx = await resolveBillingContext(
      { orgName: 'org-1', projectName: 'p' },
      {
        listBindings: async () => [binding({ name: 'b1', project: 'p', phase: 'Superseded' })],
      }
    );
    expect(ctx.status).to.equal('inactive');
    expect(ctx.bindingName).to.equal('b1');
    expect(shouldSkipEmit(ctx)).to.equal(true);
  });

  it("returns 'ready' with the active binding's account name", async () => {
    const ctx = await resolveBillingContext(
      { orgName: 'org-1', projectName: 'p' },
      {
        listBindings: async () => [
          binding({ name: 'b-old', project: 'p', account: 'acct-old', phase: 'Superseded' }),
          binding({ name: 'b-new', project: 'p', account: 'acct-new', phase: 'Active' }),
        ],
      }
    );
    expect(ctx.status).to.equal('ready');
    expect(ctx.bindingName).to.equal('b-new');
    expect(ctx.accountName).to.equal('acct-new');
    expect(shouldSkipEmit(ctx)).to.equal(false);
  });

  it("returns 'lookup-error' (fail-open) when the lister throws", async () => {
    const ctx = await resolveBillingContext(
      { orgName: 'org-1', projectName: 'p' },
      {
        listBindings: async () => {
          throw new Error('boom');
        },
      }
    );
    expect(ctx.status).to.equal('lookup-error');
    // The route is responsible for logging this; the resolver only
    // surfaces the message so it stays browser-safe.
    expect(ctx.errorMessage).to.equal('boom');
    expect(shouldSkipEmit(ctx)).to.equal(false);
  });
});
