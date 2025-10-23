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
    // Styling
    className?: string;

    // Sorting configuration
    sortable?: boolean | 'auto'; // false = disable, true/auto = enable with auto-detection
    sortPath?: string; // dot-notation path for nested fields (e.g., 'status.registration.registrar.name')
    sortType?: 'text' | 'number' | 'date' | 'boolean' | 'array'; // explicit sort type
    sortArrayBy?: 'length' | string; // 'length' = count items, or property path within array items (e.g., 'registrantName')
    sortLabels?: { asc?: string; desc?: string }; // custom labels for sort menu (e.g., { asc: 'Oldest', desc: 'Newest' })

    // Global search configuration
    searchable?: boolean; // Enable/disable for global search (default: auto-detect)
    searchPath?: string | string[]; // Custom path for nested field search (e.g., 'company.name' or ['name', 'email'])
    searchTransform?: (value: any) => string; // Custom value transformer for search (e.g., lowercase, format)
    searchWeight?: number; // Priority in search results (future enhancement)
    searchAliases?: string[]; // Alternative search terms (future enhancement)
  }
}

export type {};

declare global {
  interface Window {
    [key: string]: any;
  }
}
