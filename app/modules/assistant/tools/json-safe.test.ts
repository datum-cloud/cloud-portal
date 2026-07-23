import { toJsonSafe, withJsonSafeOutput } from './json-safe';
import type { Tool } from 'ai';
import { describe, expect, it } from 'bun:test';

describe('toJsonSafe', () => {
  it('converts a top-level Date to an ISO string', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');
    expect(toJsonSafe(date)).toBe('2024-01-01T00:00:00.000Z');
  });

  it('converts nested Dates — the activity-log tool-output shape that broke chat', () => {
    const output = {
      items: [
        { verb: 'create', timestamp: new Date('2024-01-01T00:00:00.000Z') },
        { verb: 'delete', timestamp: new Date('2024-01-02T12:30:00.000Z') },
      ],
      hasMore: false,
      window: '24h',
    };

    expect(toJsonSafe(output)).toEqual({
      items: [
        { verb: 'create', timestamp: '2024-01-01T00:00:00.000Z' },
        { verb: 'delete', timestamp: '2024-01-02T12:30:00.000Z' },
      ],
      hasMore: false,
      window: '24h',
    });
  });

  it('leaves already-JSON values unchanged', () => {
    const value = { a: 1, b: 'two', c: [true, null], d: { e: 3 } };
    expect(toJsonSafe(value)).toEqual(value);
  });

  it('drops undefined object properties (matches what the model receives)', () => {
    expect(toJsonSafe({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it('passes through a bare undefined', () => {
    expect(toJsonSafe(undefined)).toBeUndefined();
  });
});

// Minimal tool stubs — withJsonSafeOutput only touches `.execute` structurally.
function fakeTool(execute?: (...args: unknown[]) => unknown): Tool {
  return { execute } as unknown as Tool;
}

// Invoke a stub tool's (wrapped) execute without wrestling the AI SDK's Tool type.
function runTool(t: Tool, ...args: unknown[]): Promise<unknown> {
  const execute = (t as unknown as { execute: (...a: unknown[]) => Promise<unknown> }).execute;
  return execute(...args);
}

describe('withJsonSafeOutput', () => {
  it('normalizes a tool output containing a Date to an ISO string', async () => {
    const tools = withJsonSafeOutput({
      queryActivityLogs: fakeTool(async () => ({
        items: [{ verb: 'update', timestamp: new Date('2024-03-04T05:06:07.000Z') }],
      })),
    });

    const result = await runTool(tools.queryActivityLogs);
    expect(result).toEqual({
      items: [{ verb: 'update', timestamp: '2024-03-04T05:06:07.000Z' }],
    });
  });

  it('passes plain JSON output through unchanged (does not break existing tools)', async () => {
    const payload = { enabled: true, accounts: ['a', 'b'] };
    const tools = withJsonSafeOutput({ getBilling: fakeTool(async () => payload) });

    const result = await runTool(tools.getBilling);
    expect(result).toEqual(payload);
  });

  it('forwards arguments to the wrapped execute', async () => {
    const tools = withJsonSafeOutput({
      echo: fakeTool(async (input: unknown) => ({ received: input })),
    });

    const result = await runTool(tools.echo, { projectId: 'proj-1' });
    expect(result).toEqual({ received: { projectId: 'proj-1' } });
  });

  it('leaves a tool without an execute function untouched', () => {
    const noExec = fakeTool(undefined);
    const tools = withJsonSafeOutput({ noExec });
    expect(tools.noExec).toBe(noExec);
    expect((tools.noExec as { execute?: unknown }).execute).toBeUndefined();
  });

  it('returns the same tools object it was given (mutates in place)', () => {
    const input = { t: fakeTool(async () => ({})) };
    expect(withJsonSafeOutput(input)).toBe(input);
  });
});
