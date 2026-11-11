import type { NoteEditorProps } from './note-editor';
import { lazyWithRetry } from '@/utils/helpers/lazy-with-retry';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Suspense } from 'react';

const NoteEditor = lazyWithRetry(() => import('./note-editor'), 'note-editor');

/**
 * The note editor, loaded the first time it renders. Notes are only edited
 * after a click, so pages that show notes don't download the editor up front.
 * A chunk that went missing after a deploy reloads the page once.
 */
export function LazyNoteEditor(props: NoteEditorProps) {
  return (
    <Suspense
      fallback={
        <div className={cn('flex items-center justify-center', props.className)}>
          <SpinnerIcon size="xs" aria-label="Loading editor" />
        </div>
      }>
      <NoteEditor {...props} />
    </Suspense>
  );
}
