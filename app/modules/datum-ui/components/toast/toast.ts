import { toast as sonnerToast, type ExternalToast } from 'sonner';

const defaultOptions = {
  message: { duration: 5000 },
  success: { duration: 5000 },
  error: { duration: Infinity },
  info: { duration: 5000 },
  warning: { duration: 5000 },
};

export const toast = {
  message: (title: string, options?: ExternalToast) => {
    return sonnerToast.message(title, { ...defaultOptions.message, ...options });
  },
  success: (title: string, options?: ExternalToast) => {
    return sonnerToast.success(title, { ...defaultOptions.success, ...options });
  },
  error: (title: string, options?: ExternalToast) => {
    return sonnerToast.error(title, { ...defaultOptions.error, ...options });
  },
  info: (title: string, options?: ExternalToast) => {
    return sonnerToast.info(title, { ...defaultOptions.info, ...options });
  },
  warning: (title: string, options?: ExternalToast) => {
    return sonnerToast.warning(title, { ...defaultOptions.warning, ...options });
  },
};
