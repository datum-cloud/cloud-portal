export interface Toast {
  description: string;
  id: string;
  title?: string;
  type: 'message' | 'success' | 'error';
}
