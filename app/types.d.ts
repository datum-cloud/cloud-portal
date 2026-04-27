/* eslint-disable unused-imports/no-unused-vars */
// Import required types
import type { Logger } from '@/modules/logger';
import type { IAccessTokenSession } from '@/utils/auth/auth.types';
import 'react-router';

// Enable absolute imports from the root directory
declare module '@/*';

/**
 * Extend the React Router AppLoadContext interface to include our custom properties.
 *
 * Services now use global axios clients configured via AsyncLocalStorage.
 */
declare module 'react-router' {
  interface AppLoadContext {
    requestId: string;
    cspNonce: string;
    session: IAccessTokenSession | null;
    logger?: Logger;
  }
}

declare module '@tanstack/table-core' {
  interface ColumnMeta<TData extends RowData, TValue> {
    // Styling
    className?: string;

    // Header tooltip — string or rich config consumed by the data-table column header
    tooltip?:
      | string
      | {
          content: string | import('react').ReactNode;
          side?: 'top' | 'bottom' | 'left' | 'right';
          align?: 'start' | 'center' | 'end';
          delayDuration?: number;
          disabled?: boolean;
        };

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

declare module '@tanstack/react-table' {
  interface FilterFns {
    /**
     * Custom filter that supports OR logic for multi-select arrays.
     * Runtime registration is owned by the data-table consumer
     * (typically passed through customFilterFns).
     */
    arrayOr: import('@tanstack/react-table').FilterFn<unknown>;
  }
}

export type {};

declare global {
  interface Window {
    [key: string]: any;
  }
}
