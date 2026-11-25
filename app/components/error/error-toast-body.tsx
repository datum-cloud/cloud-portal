import type { ToastErrorDescription } from './describe-toast-error';
import { COPY_FEEDBACK_MS, useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronRightIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

type ErrorDetails = Pick<ToastErrorDescription, 'detail' | 'requestId'>;

type ErrorToastBodyProps = Omit<ToastErrorDescription, 'title'> & {
  /** Controlled open state; `toastApiError` owns it so the toast can resize. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * The body of an error toast: the plain message, then a "Show details"
 * toggle that opens the raw text and request ID with a copy button. Colours
 * come from the toast's own text colour, so it fits every toast variant and
 * both themes. Error toasts stay until dismissed, so the toggle is usable.
 */
export function ErrorToastBody({
  message,
  detail,
  requestId,
  open: openProp,
  onOpenChange,
}: ErrorToastBodyProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const panelId = useId();

  const toggle = () => {
    if (openProp === undefined) setOpenState(!open);
    onOpenChange?.(!open);
  };

  return (
    <div className="flex flex-col gap-1">
      {message ? <div>{message}</div> : null}
      {detail || requestId ? (
        <div className="flex flex-col">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={toggle}
            className="inline-flex w-fit items-center gap-1 font-medium underline-offset-2 hover:underline">
            <ChevronRightIcon
              aria-hidden
              className={cn('size-3 transition-transform', open && 'rotate-90')}
            />
            {open ? 'Hide details' : 'Show details'}
          </button>
          <ErrorToastDetails id={panelId} open={open} detail={detail} requestId={requestId} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * The panel behind "Show details". It stays in the page while closed so the
 * toggle's aria-controls always points at it.
 */
function ErrorToastDetails({
  id,
  open,
  detail,
  requestId,
}: ErrorDetails & { id: string; open: boolean }) {
  const [isCopied, copy] = useCopyToClipboard();
  const copyFailed = useCopyFailure();
  const copyText = [detail, requestId ? `Request ID ${requestId}` : undefined]
    .filter(Boolean)
    .join('\n');

  return (
    <div id={id} hidden={!open} className="mt-2 min-w-0 flex-col gap-1.5 [&:not([hidden])]:flex">
      {detail ? (
        <Text
          as="div"
          size="3xs"
          data-e2e="error-toast-detail"
          className="max-h-24 overflow-auto rounded-md border border-current/40 px-2.5 py-2 font-mono leading-normal [overflow-wrap:anywhere]">
          {detail}
        </Text>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        {requestId ? (
          <Text as="span" size="3xs">
            Request ID {requestId}
          </Text>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => {
            void copy(copyText).then((copied) => copyFailed.set(!copied));
          }}
          className="rounded-md bg-current/10 px-2.5 py-1 font-medium transition-opacity hover:opacity-80">
          {isCopied ? 'Copied' : copyFailed.value ? "Couldn't copy" : 'Copy details'}
        </button>
      </div>
    </div>
  );
}

/** A copy failure flag that clears itself after the copy feedback window. */
function useCopyFailure() {
  const [value, set] = useState(false);
  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(() => set(false), COPY_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return { value, set };
}
