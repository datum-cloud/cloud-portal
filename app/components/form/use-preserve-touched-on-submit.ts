import { useFormContext } from '@datum-cloud/datum-ui/form';
import { useEffect, useRef } from 'react';

/**
 * Workaround for the package's `markAllFieldsTouched` reset on submit.
 *
 * Background: `Form.Root` calls `instance.markAllFieldsTouched()` on every user
 * submit. That helper extracts top-level keys via `getFieldConstraints(schema)`,
 * which calls `getObjectShape(schema)`. `getObjectShape` only handles `object`,
 * `intersection`, and `pipe` — for a `z.discriminatedUnion(...)` it returns
 * `null` and the touched set is reset to **empty**. Any field name that was
 * previously in the set (added by individual blur events) gets wiped, so the
 * package's per-field error filter (`isDisplayTouched = displayTouchedFields.includes(name)`)
 * collapses errors back to `[]` — producing a visible flicker on the very
 * fields that just got blurred and submitted.
 *
 * This hook attaches a native `submit` listener (bubble phase) on the form
 * element belonging to the current `Form.Root`. The listener runs *after* the
 * package's React `onSubmit` handler (also bubble phase) and uses the package's
 * `markFieldTouched` (which uses functional `setState` and so reads the
 * just-emptied set) to re-add the requested names. React 18+ batches both
 * setStates within the same event tick: the value setState (`new Set([])`)
 * and the functional setState (`prev => prev + name`) collapse to a single
 * render with the names present.
 *
 * Pass the static list of field names that must remain touched after every
 * submit attempt (typically every renderable field name in the form).
 */
export function usePreserveTouchedOnSubmit(names: readonly string[]): void {
  const { formId, displayTouchedFields, markFieldTouched } = useFormContext();
  const submittedRef = useRef(false);
  const prevSizeRef = useRef(displayTouchedFields.length);

  // 1. On submit, mark all field names + flag that we've submitted
  useEffect(() => {
    const formEl = document.getElementById(formId);
    if (!formEl || formEl.tagName !== 'FORM') return;

    const handleSubmit = () => {
      submittedRef.current = true;
      for (const fieldName of names) {
        markFieldTouched(fieldName);
      }
    };

    formEl.addEventListener('submit', handleSubmit);
    return () => formEl.removeEventListener('submit', handleSubmit);
  }, [formId, markFieldTouched, names]);

  // 2. Safety net: if the touched set ever transitions from non-empty back to
  // empty after we've submitted, re-pin. This catches a second wipe that
  // happens asynchronously after our submit listener (likely a Conform
  // autofocus side effect or re-validation cycle that re-runs the package's
  // markAllFieldsTouched on the discriminated-union schema, producing []).
  useEffect(() => {
    const wasNonEmpty = prevSizeRef.current > 0;
    const isNowEmpty = displayTouchedFields.length === 0;
    if (submittedRef.current && wasNonEmpty && isNowEmpty) {
      for (const fieldName of names) {
        markFieldTouched(fieldName);
      }
    }
    prevSizeRef.current = displayTouchedFields.length;
  }, [displayTouchedFields, markFieldTouched, names]);
}
