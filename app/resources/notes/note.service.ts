import { toNote, toNoteList, toCreateNotePayload } from './note.adapter';
import type { Note, CreateNoteInput } from './note.schema';
import {
  listNotesMiloapisComV1Alpha1NamespacedNote,
  createNotesMiloapisComV1Alpha1NamespacedNote,
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
  byDomain: (projectId: string, domainName: string) =>
    [...noteKeys.lists(), projectId, domainName] as const,
};

export function createNoteService() {
  return {
    /**
     * List all notes for a domain
     */
    async listByDomain(projectId: string, domainName: string): Promise<Note[]> {
      const startTime = Date.now();

      try {
        const response = await listNotesMiloapisComV1Alpha1NamespacedNote({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: NAMESPACE },
          query: {
            fieldSelector: `spec.subjectRef.name=${domainName},spec.subjectRef.kind=Domain`,
          },
        });

        const data = response.data as ComMiloapisNotesV1Alpha1NoteList;
        const result = toNoteList(data?.items ?? []);

        logger.service(SERVICE_NAME, 'listByDomain', {
          input: { projectId, domainName },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.listByDomain failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Create a new note
     */
    async create(projectId: string, input: CreateNoteInput): Promise<Note> {
      const startTime = Date.now();

      try {
        const payload = toCreateNotePayload(input, NAMESPACE);

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
          input: { projectId, domainName: input.domainName },
          duration: Date.now() - startTime,
        });

        return note;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Delete a note by name
     */
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
