// Import required types
import { ControlPlaneFactory } from '@/resources/control-plane/control.factory';
import { Client } from '@hey-api/client-axios';
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
    controlPlaneClient: Client;
    iamResourceClient: Client;
  }
}

declare module '@tanstack/table-core' {
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}
