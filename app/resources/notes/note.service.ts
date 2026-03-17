import { toNote, toNoteList, toCreateNotePayload } from './note.adapter';
import type { Note, SubjectRef } from './note.schema';
import {
  listNotesMiloapisComV1Alpha1NamespacedNote,
  createNotesMiloapisComV1Alpha1NamespacedNote,
  readNotesMiloapisComV1Alpha1NamespacedNote,
  patchNotesMiloapisComV1Alpha1NamespacedNote,
  deleteNotesMiloapisComV1Alpha1NamespacedNote,
  type ComMiloapisNotesV1Alpha1NoteList,
} from '@/modules/control-plane/notes';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

const SERVICE_NAME = 'NoteService';
const NAMESPACE = 'default';

export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  bySubject: (projectId: string, apiGroup: string, kind: string, name: string) =>
    [...noteKeys.lists(), projectId, apiGroup, kind, name] as const,
  detail: (projectId: string, noteName: string) =>
    [...noteKeys.all, 'detail', projectId, noteName] as const,
};

export function createNoteService() {
  return {
    async list(projectId: string, subjectRef: SubjectRef): Promise<Note[]> {
      const startTime = Date.now();
      try {
        const response = await listNotesMiloapisComV1Alpha1NamespacedNote({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: NAMESPACE },
          query: {
            fieldSelector: `spec.subjectRef.name=${subjectRef.name},spec.subjectRef.kind=${subjectRef.kind}`,
          },
        });
        const data = response.data as ComMiloapisNotesV1Alpha1NoteList;
        const result = toNoteList(data?.items ?? []);
        logger.service(SERVICE_NAME, 'list', {
          input: { projectId, kind: subjectRef.kind, name: subjectRef.name },
          duration: Date.now() - startTime,
        });
        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async get(projectId: string, noteName: string): Promise<Note> {
      const startTime = Date.now();
      try {
        const response = await readNotesMiloapisComV1Alpha1NamespacedNote({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: NAMESPACE, name: noteName },
        });
        if (!response.data) {
          throw new Error('Note not found');
        }
        const note = toNote(response.data);
        logger.service(SERVICE_NAME, 'get', {
          input: { projectId, noteName },
          duration: Date.now() - startTime,
        });
        return note;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async create(projectId: string, subjectRef: SubjectRef, content: string): Promise<Note> {
      const startTime = Date.now();
      try {
        const payload = toCreateNotePayload(subjectRef, content, NAMESPACE);
        const response = await createNotesMiloapisComV1Alpha1NamespacedNote({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: NAMESPACE },
          body: payload,
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.data) {
          throw new Error('Failed to create note');
        }
        const note = toNote(response.data);
        logger.service(SERVICE_NAME, 'create', {
          input: { projectId, kind: subjectRef.kind, name: subjectRef.name },
          duration: Date.now() - startTime,
        });
        return note;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async update(projectId: string, noteName: string, content: string): Promise<Note> {
      const startTime = Date.now();
      try {
        const response = await patchNotesMiloapisComV1Alpha1NamespacedNote({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: NAMESPACE, name: noteName },
          body: { spec: { content } },
        });
        if (!response.data) {
          throw new Error('Failed to update note');
        }
        const note = toNote(response.data);
        logger.service(SERVICE_NAME, 'update', {
          input: { projectId, noteName },
          duration: Date.now() - startTime,
        });
        return note;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async delete(projectId: string, noteName: string): Promise<void> {
      const startTime = Date.now();
      try {
        await deleteNotesMiloapisComV1Alpha1NamespacedNote({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: NAMESPACE, name: noteName },
        });
        logger.service(SERVICE_NAME, 'delete', {
          input: { projectId, noteName },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type NoteService = ReturnType<typeof createNoteService>;
