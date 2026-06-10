import { toCreateNotePayload, toNote, toNoteList } from './note.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toNote', () => {
  it('maps content, creator and subject ref, coercing createdAt to a Date', () => {
    const raw = {
      metadata: rawMetadata({ uid: 'n-1', name: 'note-1', namespace: 'proj-1' }),
      spec: {
        content: 'hello world',
        creatorRef: { name: 'user-a' },
        subjectRef: {
          apiGroup: 'resourcemanager.miloapis.com',
          kind: 'Project',
          name: 'proj-1',
          namespace: 'proj-1',
        },
      },
    };
    const note = toNote(raw as never);

    expect(note.content).toBe('hello world');
    expect(note.creatorName).toBe('user-a');
    expect(note.subjectRef).toEqual({
      apiGroup: 'resourcemanager.miloapis.com',
      kind: 'Project',
      name: 'proj-1',
      namespace: 'proj-1',
    });
    expect(note.createdAt).toBeInstanceOf(Date);
  });

  it('defaults content/subjectRef fields when spec is empty', () => {
    const note = toNote({ metadata: { name: 'bare' } } as never);
    expect(note.content).toBe('');
    expect(note.creatorName).toBeUndefined();
    expect(note.subjectRef).toEqual({
      apiGroup: '',
      kind: '',
      name: '',
      namespace: undefined,
    });
  });

  it('maps a list of notes', () => {
    const list = toNoteList([{ metadata: { uid: 'a' }, spec: { content: 'x' } }] as never);
    expect(list).toHaveLength(1);
    expect(list[0].content).toBe('x');
  });
});

describe('toCreateNotePayload', () => {
  const subjectRef = {
    apiGroup: 'resourcemanager.miloapis.com',
    kind: 'Project',
    name: 'proj-1',
  };

  it('uses generateName and defaults the namespace to "default"', () => {
    const payload = toCreateNotePayload(subjectRef as never, 'my note');
    expect(payload.apiVersion).toBe('notes.miloapis.com/v1alpha1');
    expect(payload.metadata?.generateName).toBe('note-');
    expect(payload.metadata?.namespace).toBe('default');
    expect(payload.spec?.content).toBe('my note');
    // subjectRef.namespace falls back to the note namespace.
    expect(payload.spec?.subjectRef?.namespace).toBe('default');
  });

  it('honors an explicit namespace for both metadata and subjectRef fallback', () => {
    const payload = toCreateNotePayload(subjectRef as never, 'n', 'proj-ns');
    expect(payload.metadata?.namespace).toBe('proj-ns');
    expect(payload.spec?.subjectRef?.namespace).toBe('proj-ns');
  });
});
