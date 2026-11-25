import { toastApiError } from './toast-api-error';
import { AppError } from '@/utils/errors/app-error';
import { PERMISSION_DENIED_MESSAGE } from '@/utils/errors/authorization-message';
import { toast } from '@datum-cloud/datum-ui/toast';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@datum-cloud/datum-ui/toast', () => ({ toast: { error: vi.fn(() => 'toast-1') } }));

type ToastOptions = { id?: string | number; onDismiss?: () => void; description: ReactElement };
type BodyProps = { onOpenChange: (open: boolean) => void };

const denial = () =>
  new AppError(PERMISSION_DENIED_MESSAGE, {
    status: 403,
    originalMessage: 'User "a" cannot list resource "x"',
  });

function lastOptions(): ToastOptions {
  const calls = vi.mocked(toast.error).mock.calls;
  return calls[calls.length - 1][1] as unknown as ToastOptions;
}

describe('toastApiError', () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear();
  });

  it('updates the same toast when the details toggle', () => {
    toastApiError(denial(), { title: 'Could not save' });
    (lastOptions().description.props as BodyProps).onOpenChange(true);

    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(lastOptions().id).toBe('toast-1');
  });

  it('does not bring back a toast that was dismissed', () => {
    toastApiError(denial(), { title: 'Could not save' });
    const first = lastOptions();
    first.onDismiss?.();
    (first.description.props as BodyProps).onOpenChange(true);

    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});
