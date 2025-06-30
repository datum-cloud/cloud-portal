// Import required types
import { ControlPlaneFactory } from '@/resources/control-plane/control.factory';
import 'react-router';
import { Storage } from 'unstorage';

// Enable absolute imports from the root directory
declare module '@/*';

/**
 * Extend the React Router AppLoadContext interface to include our custom factories
 */
declare module 'react-router' {
  interface AppLoadContext extends ControlPlaneFactory {
    // Add any additional context properties here
    cache: Storage;
  }
}

declare module '@tanstack/table-core' {
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}
