/* eslint-disable unused-imports/no-unused-vars */
// Import required types
import { ControlPlaneClient } from '@/modules/control-plane/control-plane.factory';
import { Client } from '@hey-api/client-axios';
import 'react-router';
import { Storage } from 'unstorage';

// Enable absolute imports from the root directory
declare module '@/*';

/**
 * Extend the React Router AppLoadContext interface to include our custom factories
 */
declare module 'react-router' {
  interface AppLoadContext extends ControlPlaneClient {
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

export type {};

declare global {
  interface Window {
    [key: string]: any;
  }
}
