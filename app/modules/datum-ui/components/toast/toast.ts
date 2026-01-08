import { HeadlessToast, type HeadlessToastVariant } from './headless-toast';
import { createElement } from 'react';
import { toast as sonnerToast, type ExternalToast } from 'sonner';

const defaultOptions = {
  message: { duration: 5000 },
  success: { duration: 5000 },
  error: { duration: Infinity },
  info: { duration: 5000 },
  warning: { duration: 5000 },
};

function show(variant: HeadlessToastVariant, title: string, options?: ExternalToast) {
  const merged = { ...defaultOptions[variant], ...options };
  const {
    description,
    action: _action,
    cancel: _cancel,
    ...sonnerOptions
  } = merged as ExternalToast;
  const resolvedDescription = typeof description === 'function' ? description() : description;

  return sonnerToast.custom(
    (t) =>
      createElement(HeadlessToast, {
        variant,
        title,
        description: resolvedDescription,
        onDismiss: () => sonnerToast.dismiss(t),
      }),
    sonnerOptions
  );
}

export const toast = {
  message: (title: string, options?: ExternalToast) => {
    return show('message', title, options);
  },
  success: (title: string, options?: ExternalToast) => {
    return show('success', title, options);
  },
  error: (title: string, options?: ExternalToast) => {
    return show('error', title, options);
  },
  info: (title: string, options?: ExternalToast) => {
    return show('info', title, options);
  },
  warning: (title: string, options?: ExternalToast) => {
    return show('warning', title, options);
  },
};
