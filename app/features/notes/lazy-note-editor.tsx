import type { NoteEditorProps } from './note-editor';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Suspense, lazy } from 'react';

const NoteEditor = lazy(() => import('./note-editor'));

/**
 * The note editor, loaded the first time it renders. Notes are only edited
 * after a click, so pages that show notes don't download the editor up front.
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
