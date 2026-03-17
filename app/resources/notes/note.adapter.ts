import type { Note, SubjectRef } from './note.schema';
import type { ComMiloapisNotesV1Alpha1Note } from '@/modules/control-plane/notes';

export function toNote(raw: ComMiloapisNotesV1Alpha1Note): Note {
  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace ?? '',
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp
      ? new Date(raw.metadata.creationTimestamp)
      : new Date(),
    content: raw.spec?.content ?? '',
    creatorName: raw.spec?.creatorRef?.name,
    subjectRef: {
      apiGroup: raw.spec?.subjectRef?.apiGroup ?? '',
      kind: raw.spec?.subjectRef?.kind ?? '',
      name: raw.spec?.subjectRef?.name ?? '',
      namespace: raw.spec?.subjectRef?.namespace,
    },
  };
}

export function toNoteList(items: ComMiloapisNotesV1Alpha1Note[]): Note[] {
  return items.map(toNote);
}

export function toCreateNotePayload(
  subjectRef: SubjectRef,
  content: string,
  namespace: string = 'default'
): ComMiloapisNotesV1Alpha1Note {
  return {
    apiVersion: 'notes.miloapis.com/v1alpha1',
    kind: 'Note',
    metadata: {
      generateName: 'note-',
      namespace,
    },
    spec: {
      subjectRef: {
        apiGroup: subjectRef.apiGroup,
        kind: subjectRef.kind,
        name: subjectRef.name,
        namespace: subjectRef.namespace ?? namespace,
      },
      content,
    },
  };
}
