import { toActivityLog, toActivityLogList } from './activity-log.adapter';
import { describe, expect, it } from 'bun:test';

describe('toActivityLog', () => {
  it('maps an audit event to an ActivityLog with a Date timestamp', () => {
    const event = {
      auditID: 'evt-1',
      verb: 'create',
      requestReceivedTimestamp: '2024-01-01T00:00:00.000Z',
      user: { username: 'ada@acme.com', uid: 'u-1' },
      objectRef: { resource: 'secrets', name: 'db-creds', namespace: 'proj-1' },
      responseStatus: { code: 201 },
    };
    const log = toActivityLog(event as never);

    expect(log.id).toBe('evt-1');
    expect(log.verb).toBe('create');
    expect(log.user).toBe('ada@acme.com');
    expect(log.userId).toBe('u-1');
    expect(log.resource).toBe('secrets');
    expect(log.resourceName).toBe('db-creds');
    expect(log.resourceNamespace).toBe('proj-1');
    expect(log.statusCode).toBe(201);
    expect(log.timestamp).toBeInstanceOf(Date);
    expect(typeof log.action).toBe('string');
    expect(log.action.length).toBeGreaterThan(0);
  });

  it('defaults verb/resource/user to "unknown" and statusCode to 0', () => {
    const log = toActivityLog({ auditID: 'evt-2' } as never);
    expect(log.verb).toBe('unknown');
    expect(log.resource).toBe('unknown');
    expect(log.user).toBe('unknown');
    expect(log.userId).toBeUndefined();
    expect(log.statusCode).toBe(0);
  });
});

describe('toActivityLogList', () => {
  it('maps results and surfaces the continue cursor + effective window', () => {
    const response = {
      status: {
        results: [{ auditID: 'a' }, { auditID: 'b' }],
        continue: 'next',
        effectiveStartTime: '2024-01-01T00:00:00Z',
        effectiveEndTime: '2024-01-02T00:00:00Z',
      },
    };
    const list = toActivityLogList(response as never);

    expect(list.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(list.nextCursor).toBe('next');
    expect(list.hasMore).toBe(true);
    expect(list.effectiveStartTime).toBe('2024-01-01T00:00:00Z');
    expect(list.effectiveEndTime).toBe('2024-01-02T00:00:00Z');
  });

  it('returns an empty list with null cursor when status is absent', () => {
    const list = toActivityLogList({} as never);
    expect(list.items).toEqual([]);
    expect(list.nextCursor).toBeNull();
    expect(list.hasMore).toBe(false);
    expect(list.effectiveStartTime).toBe('');
  });
});
