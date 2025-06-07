import '@tanstack/react-table';

// Enable absolute imports from the root directory
declare module '@/*';

declare module '@tanstack/react-table' {
  interface ColumnMeta {
    className?: string;
  }
}
