import { describeToastError, type ToastErrorOptions } from './describe-toast-error';
import { ErrorToastBody } from './error-toast-body';
import { toast } from '@datum-cloud/datum-ui/toast';

/**
 * Show an error toast for an API error: the call site's title (or a plain
 * headline), a plain explanation that names the product area for a
 * permission denial, and the raw text behind "Show details". A plain
 * function, so it works in mutation callbacks. Returns the toast id.
 *
 * Sonner measures a toast's height only when the toast itself changes, and
 * pins it there while the stack is hovered. Opening the details therefore
 * re-issues the toast under the same id, so sonner measures it again.
 */
export function toastApiError(error: unknown, options?: ToastErrorOptions): string | number {
  const { title, ...body } = describeToastError(error, options);
  // The first show() fills the id; later calls update that same toast. Once
  // dismissed, a late toggle must not bring the toast back.
  const current: { id?: string | number; dismissed: boolean } = { dismissed: false };
  const show = (open: boolean): string | number => {
    if (current.dismissed && current.id !== undefined) return current.id;
    return toast.error(title, {
      ...(current.id === undefined ? {} : { id: current.id }),
      onDismiss: () => {
        current.dismissed = true;
      },
      description: <ErrorToastBody {...body} open={open} onOpenChange={show} />,
    });
  };
  current.id = show(false);
  return current.id;
}
