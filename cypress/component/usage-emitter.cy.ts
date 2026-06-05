// Import the pure submodules directly. The `@/modules/usage` barrel
// also re-exports `emitter.ts`, which depends on `@/utils/env/env.server`
// and would call `process.exit(1)` inside the Cypress browser bundle on
// validation failure. Each of these files is browser-safe.
import { buildAssistantUsageEvents } from '@/modules/usage/assistant-events';
import {
  ASSISTANT_METERS,
  ASSISTANT_RESOURCE_GROUP,
  ASSISTANT_RESOURCE_KIND,
} from '@/modules/usage/meters';
import { toCloudEvent } from '@/modules/usage/to-cloud-event';
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
      tokens: { inputTokens: 10 },
    });
    const evt = events.find((e) => e.meterName === ASSISTANT_METERS.inputTokens)!;

    expect(isUlid(evt.eventID)).to.equal(true);
    expect(evt.timestamp).to.equal('2026-04-27T17:00:00.000Z');
    expect(evt.projectRef).to.deep.equal({ name: 'proj-abc' });
    expect(evt.value).to.equal('10');
    // `model` is a resource label, not a meter dimension: the assistant
    // MeterDefinitions declare no dimensions, so the central validator
    // quarantines any event that carries one.
    expect(evt.dimensions).to.deep.equal({});
    expect(evt.resource).to.deep.equal({
      ref: {
        projectRef: { name: 'proj-abc' },
        group: ASSISTANT_RESOURCE_GROUP,
        kind: ASSISTANT_RESOURCE_KIND,
        namespace: 'default',
        name: 'chat-123',
        uid: 'a8f3a1b2-uid',
      },
      labels: { model: 'claude-sonnet-4-6' },
    });
  });

  it('returns events with empty projectRef when projectName is empty', () => {
    // Caller is expected to gate on projectName, but the builder still
    // produces events — gating is the route's responsibility.
    const events = buildAssistantUsageEvents({
      ...baseInput,
      projectName: '',
      tokens: { inputTokens: 100 },
    });
    expect(events.every((e) => e.projectRef.name === '')).to.equal(true);
  });
});

describe('toCloudEvent', () => {
  const baseInput = {
    projectName: 'proj-abc',
    conversationId: 'chat-123',
    model: 'claude-sonnet-4-6',
    now: Date.parse('2026-04-27T17:00:00.000Z'),
  } as const;
  const source = 'https://cloud.staging.env.datum.net/api/assistant';

  it('produces a structurally valid CloudEvents v1.0 envelope', () => {
    const [evt] = buildAssistantUsageEvents({
      ...baseInput,
      tokens: { inputTokens: 1200 },
    }).filter((e) => e.meterName === ASSISTANT_METERS.inputTokens);
    const ce = toCloudEvent(evt!, { source });

    expect(isUlid(ce.id)).to.equal(true);
    expect(ce.specversion).to.equal('1.0');
    expect(ce.type).to.equal(ASSISTANT_METERS.inputTokens);
    expect(ce.source).to.equal(source);
    expect(ce.subject).to.equal('projects/proj-abc');
    expect(ce.datacontenttype).to.equal('application/json');
    expect(ce.time).to.equal('2026-04-27T17:00:00.000Z');
    expect(ce.data.value).to.equal('1200');
    // Builder emits empty dimensions (model is a resource label), so the
    // envelope drops the key entirely rather than sending `{}`.
    expect(ce.data.dimensions).to.equal(undefined);
    expect(ce.data.resource).to.deep.equal({
      group: ASSISTANT_RESOURCE_GROUP,
      kind: ASSISTANT_RESOURCE_KIND,
      namespace: 'default',
      name: 'chat-123',
    });
  });

  it('includes resource.uid when the source event carries one', () => {
    const [evt] = buildAssistantUsageEvents({
      ...baseInput,
      conversationUid: 'a8f3a1b2-uid',
      tokens: { inputTokens: 10 },
    });
    const ce = toCloudEvent(evt!, { source });
    expect(ce.data.resource?.uid).to.equal('a8f3a1b2-uid');
  });

  it('omits dimensions when empty rather than emitting `{}`', () => {
    // Manual UsageEvent with no dimensions. Empty dimensions confuse
    // gateway log analysis, so we drop the key.
    const ce = toCloudEvent(
      {
        eventID: ulid(baseInput.now),
        meterName: ASSISTANT_METERS.messages,
        timestamp: '2026-04-27T17:00:00.000Z',
        projectRef: { name: 'p' },
        value: '1',
        dimensions: {},
        resource: {
          ref: {
            projectRef: { name: 'p' },
            group: ASSISTANT_RESOURCE_GROUP,
            kind: ASSISTANT_RESOURCE_KIND,
            namespace: 'default',
            name: 'c',
          },
          labels: {},
        },
      },
      { source }
    );
    expect(ce.data.dimensions).to.equal(undefined);
  });
});
