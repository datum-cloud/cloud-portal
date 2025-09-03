import NProgress from 'nprogress';

let timeout: ReturnType<typeof setTimeout> | null = null;

export function startProgress() {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    NProgress.start();
  }, 150);
}

export function stopProgress() {
  if (timeout) {
    clearTimeout(timeout);
    timeout = null;
  }
  NProgress.done();
}

export function configureProgress() {
  NProgress.configure({
    showSpinner: false,
    trickleSpeed: 100,
  });
}
