import { BadgeCopy } from '@/components/badge/badge-copy';
import { FieldLabel } from '@/components/card/field-label';
import { DateTime } from '@/components/date-time/date-time';
import { showMutationErrorToast } from '@/modules/quota';
import { useResourcePermissions } from '@/modules/rbac';
import { type HttpProxy, useUpdateHttpProxy } from '@/resources/http-proxies';
import {
  useCreateNote,
  useDeleteNote,
  useNotes,
  useUpdateNote,
} from '@/resources/notes/note.queries';
import {
  NOTE_MAX_HTML_LENGTH,
  NOTE_MAX_TEXT_LENGTH,
  type Note,
  type SubjectRef,
} from '@/resources/notes/note.schema';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardField,
  CardFieldValue,
  CardHeader,
  CardSaveBar,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Icon, SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import { RichTextContent, RichTextEditor } from '@datum-cloud/datum-ui/rich-text-editor';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { PencilIcon, SquareLibrary } from 'lucide-react';
import { useMemo, useState } from 'react';

/**
 * Text content of a note for emptiness checks only. Never parses the HTML into
 * a live DOM: the note body is untrusted and this is not the render path
 * (`RichTextContent` sanitises what is displayed).
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNoteHtml(html: string): string {
  return stripHtml(html) === '' ? '' : html;
}

/**
 * Identity settings for an ALB: display name, a single description note, and
 * the immutable resource name. Labels are not supported on HTTPProxy yet.
 */
export function HttpProxyGeneralCard({
  proxy,
  projectId,
}: {
  proxy: HttpProxy;
  projectId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  const subjectRef = useMemo<SubjectRef>(
    () => ({
      apiGroup: 'networking.datumapis.com',
      kind: 'HTTPProxy',
      name: proxy.name ?? '',
    }),
    [proxy.name]
  );

  const { canPatch, isLoading: patchPermLoading } = useResourcePermissions({
    resource: 'httpproxies',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['patch'],
  });

  const {
    canList: canViewNotes,
    canCreate,
    canUpdate,
    canDelete: canDeleteNotes,
    isLoading: notesPermLoading,
  } = useResourcePermissions({
    resource: 'notes',
    group: 'notes.miloapis.com',
    scope: 'project',
    verbs: ['list', 'create', 'update', 'delete'],
  });
  const canEditNotes = canCreate && canUpdate;
  const canEditCard = canPatch || canEditNotes;

  const notesEnabled = !!projectId && !!proxy.name && !!canViewNotes;
  const { data: notes, isLoading: notesLoading } = useNotes(projectId, subjectRef, {
    enabled: notesEnabled,
  });

  const updateProxy = useUpdateHttpProxy(projectId, proxy.name);
  const createNote = useCreateNote(projectId, subjectRef);
  const updateNote = useUpdateNote(projectId, subjectRef);
  const deleteNote = useDeleteNote(projectId, subjectRef);

  // Notes only expose createdAt; pick the newest as the single description.
  const descriptionNote = useMemo<Note | undefined>(() => {
    if (!notes?.length) return undefined;
    return [...notes].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }, [notes]);

  const descriptionPreview = descriptionNote ? stripHtml(descriptionNote.content) : null;
  const currentName = proxy.chosenName || proxy.name || '';
  const notesReady = !notesPermLoading && (!notesEnabled || !notesLoading);

  const trimmedName = draftName.trim();
  const nameDirty = canPatch && trimmedName !== currentName;
  const descriptionDirty =
    canEditNotes &&
    normalizeNoteHtml(draftDescription) !== normalizeNoteHtml(descriptionNote?.content ?? '');
  const changeCount = (nameDirty ? 1 : 0) + (descriptionDirty ? 1 : 0);
  const nameError =
    editing && canPatch
      ? !trimmedName
        ? 'Display name is required'
        : trimmedName.length > 50
          ? 'Display name must be less than 50 characters'
          : undefined
      : undefined;
  const errorCount = nameError ? 1 : 0;

  const startEdit = () => {
    setDraftName(currentName);
    setDraftDescription(descriptionNote?.content ?? '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    const nextName = trimmedName;
    if (nameError) return;

    const nextDescription = normalizeNoteHtml(draftDescription);
    if (nextDescription.length > NOTE_MAX_HTML_LENGTH) {
      toast.error('Description', {
        description: 'Content is too long — try removing some formatting.',
      });
      return;
    }
    if (canEditNotes && !nextDescription && descriptionNote && !canDeleteNotes) {
      toast.error('Description', {
        description: "You don't have permission to remove this description",
      });
      return;
    }

    setSaving(true);
    try {
      const tasks: Promise<unknown>[] = [];
      if (nameDirty) {
        tasks.push(updateProxy.mutateAsync({ chosenName: nextName }));
      }
      if (descriptionDirty) {
        if (!nextDescription && descriptionNote) {
          tasks.push(deleteNote.mutateAsync(descriptionNote.name));
        } else if (nextDescription && descriptionNote) {
          tasks.push(
            updateNote.mutateAsync({
              noteName: descriptionNote.name,
              content: nextDescription,
            })
          );
        } else if (nextDescription) {
          tasks.push(createNote.mutateAsync(nextDescription));
        }
      }
      await Promise.all(tasks);
      toast.success('Application Load Balancer', {
        description: 'General settings saved',
      });
      setEditing(false);
    } catch (error) {
      showMutationErrorToast(error, {
        fallbackTitle: 'Application Load Balancer',
        fallbackDescription: (error as Error).message || 'Failed to save general settings',
        scope: 'project',
        projectId,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card size="sm" sectioned className="w-full overflow-hidden" data-e2e="alb-general-card">
      <CardHeader size="sm" bordered>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={SquareLibrary} size={16} className="text-secondary" />
          General
        </CardTitle>
        {canEditCard ? (
          <CardAction>
            <Button
              type="secondary"
              theme="outline"
              size="xs"
              className={`shrink-0 ${editing ? 'invisible' : ''}`}
              disabled={editing || patchPermLoading || !notesReady}
              aria-hidden={editing}
              tabIndex={editing ? -1 : undefined}
              onClick={startEdit}>
              <Icon icon={PencilIcon} size={12} />
              Edit
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent padding="none">
        <CardField>
          <FieldLabel hint="Friendly name shown in the portal">Display name</FieldLabel>
          <CardFieldValue>
            {editing && canPatch ? (
              <div className="flex w-full flex-col gap-1">
                <Input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  maxLength={50}
                  aria-invalid={!!nameError}
                  aria-label="Display name"
                  autoFocus
                />
                {nameError ? <p className="text-destructive text-xs">{nameError}</p> : null}
              </div>
            ) : (
              <span className="truncate">{currentName}</span>
            )}
          </CardFieldValue>
        </CardField>

        <CardField className="sm:items-start">
          <FieldLabel hint="A short note about this load balancer. Stored as a project note.">
            Description
          </FieldLabel>
          <CardFieldValue>
            {editing && canEditNotes ? (
              <RichTextEditor
                content={draftDescription}
                onChange={setDraftDescription}
                maxLength={NOTE_MAX_TEXT_LENGTH}
                placeholder="Add a description"
                className="min-h-[100px] w-full">
                <RichTextEditor.Toolbar>
                  <RichTextEditor.Bold />
                  <RichTextEditor.Italic />
                  <RichTextEditor.Underline />
                  <RichTextEditor.Strike />
                  <RichTextEditor.Separator />
                  <RichTextEditor.Link />
                </RichTextEditor.Toolbar>
                <RichTextEditor.Content />
                <RichTextEditor.CharacterCount maxLength={NOTE_MAX_TEXT_LENGTH} />
              </RichTextEditor>
            ) : notesPermLoading || (notesEnabled && notesLoading) ? (
              <SpinnerIcon size="xs" aria-label="Loading description" />
            ) : !canViewNotes ? (
              <Tooltip message="You don't have permission to view notes for this load balancer">
                <span className="text-muted-foreground">&mdash;</span>
              </Tooltip>
            ) : descriptionNote?.content && descriptionPreview ? (
              <div className="line-clamp-3">
                <RichTextContent content={descriptionNote.content} />
              </div>
            ) : (
              <span className="text-muted-foreground">&mdash;</span>
            )}
          </CardFieldValue>
        </CardField>

        <CardField>
          <FieldLabel hint="Immutable identifier used by the API and CLI.">
            Resource name
          </FieldLabel>
          <CardFieldValue>
            <BadgeCopy
              value={proxy.name ?? ''}
              text={proxy.name}
              badgeType="muted"
              badgeTheme="solid"
            />
          </CardFieldValue>
        </CardField>

        <CardField>
          <FieldLabel>Created</FieldLabel>
          <CardFieldValue>
            <DateTime date={proxy.createdAt} variant="detailed" className="text-sm" />
          </CardFieldValue>
        </CardField>

        <CardField>
          <FieldLabel hint="Most recent write to this load balancer's spec or metadata. Status reported by the platform isn't counted.">
            Last updated
          </FieldLabel>
          <CardFieldValue>
            {proxy.updatedAt ? (
              <DateTime date={proxy.updatedAt} variant="relative" className="text-sm" />
            ) : (
              <span className="text-muted-foreground">&mdash;</span>
            )}
          </CardFieldValue>
        </CardField>
      </CardContent>
      {editing ? (
        <CardSaveBar
          changeCount={changeCount}
          errorCount={errorCount}
          saving={saving}
          onCancel={cancelEdit}
          onSave={() => void handleSave()}
        />
      ) : null}
    </Card>
  );
}
