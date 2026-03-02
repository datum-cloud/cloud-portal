import type { Note, CreateNoteInput } from './note.schema';
import type { ComMiloapisNotesV1Alpha1Note } from '@/modules/control-plane/notes';

/**
 * Transform raw API Note to domain Note type
 */
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
    subjectRefName: raw.spec?.subjectRef?.name,
    subjectRefKind: raw.spec?.subjectRef?.kind,
  };
}

/**
 * Transform raw API list items to domain Note array
 */
export function toNoteList(items: ComMiloapisNotesV1Alpha1Note[]): Note[] {
  return items.map(toNote);
}

/**
 * Transform CreateNoteInput to API payload
 */
export function toCreateNotePayload(
  input: CreateNoteInput,
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
        apiGroup: 'networking.datumapis.com',
        kind: 'Domain',
        name: input.domainName,
        namespace,
      },
      content: input.content,
    },
  };
}
