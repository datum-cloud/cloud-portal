import { NoteMeta } from './note-meta';
import type { Note } from '@/resources/notes/note.schema';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { RichTextContent } from '@datum-cloud/datum-ui/rich-text-editor';
import { PencilIcon, Trash2Icon } from 'lucide-react';

interface NoteCardProps {
  note: Note;
  creatorDisplay: string;
  isOwner: boolean;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

export function NoteCard({ note, creatorDisplay, isOwner, onEdit, onDelete }: NoteCardProps) {
  return (
    <div className="border-border bg-card rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="line-clamp-3 flex min-w-0 flex-1 items-start text-sm">
          <RichTextContent content={note.content} />
        </div>
        {isOwner && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="quaternary"
              theme="outline"
              size="xs"
              onClick={() => onEdit(note)}
              aria-label="Edit note">
              <Icon icon={PencilIcon} className="size-3" />
            </Button>
            <Button
              type="danger"
              theme="outline"
              size="xs"
              onClick={() => onDelete(note)}
              aria-label="Delete note">
              <Icon icon={Trash2Icon} className="size-3" />
            </Button>
          </div>
        )}
      </div>
      <div className="mt-1">
        <NoteMeta creatorDisplay={creatorDisplay} createdAt={note.createdAt} />
      </div>
    </div>
  );
}
