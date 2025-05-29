/* eslint-disable @typescript-eslint/no-explicit-any */
// cypress/support/RemixStub.tsx
import React from 'react';
import { createMemoryRouter, RouterProvider, RouteObject } from 'react-router';

// Create a request object creator
const createRequest = (url: string = 'http://localhost:3000', init: RequestInit = {}) => {
  return new Request(url, init);
};

// Define types for the RemixStub props
interface RemixStubProps {
  children: React.ReactNode;
  initialEntries?: string[];
  initialIndex?: number;
  path?: string;
  remixStubProps?: {
    data?: Record<string, any>;
    loaderData?: Record<string, any>;
    actionData?: Record<string, any> | null;
    errors?: Record<string, Error>;
    navigation?: {
      state: 'idle' | 'loading' | 'submitting';
      location?: any;
      formAction?: string;
      formMethod?: string;
      formEncType?: string;
      formData?: FormData;
    };
    fetchers?: Record<string, any>;
    navigate?: (...args: any[]) => void;
    request?: Request;
    [key: string]: any;
  };
}

// Mock for DataFunctionArgs (loader/action args)
const createDataFunctionArgs = (remixStubProps: any) => {
  const request = remixStubProps.request || createRequest();
  return {
    request,
    params: remixStubProps.params || {},
    context: remixStubProps.context || {},
  };
};

/**
 * Root context for Remix - this is necessary because React Router v7 with Remix
 * expects certain context values to be present
 */
const RootContext = React.createContext({
  requestInfo: {
    url: 'http://localhost:3000',
    method: 'GET',
    headers: new Headers(),
    clientAddress: '127.0.0.1',
  },
  serverHandoff: {
    url: 'http://localhost:3000',
    state: {},
  },
});

/**
 * A stub component for testing Remix routes with React Router v7
 */
export const RemixStub: React.FC<RemixStubProps> = ({
  children,
  initialEntries = ['/'],
  initialIndex = 0,
  path = '/',
  remixStubProps = {},
}) => {
  // Mock session storage
  React.useEffect(() => {
    const mockStorage: Record<string, string> = {
      APP_URL: Cypress.env('APP_URL') || 'http://localhost:3000',
    };

    // Mock sessionStorage
    const sessionStorageMock = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
      },
      length: Object.keys(mockStorage).length,
      key: (index: number) => Object.keys(mockStorage)[index] || null,
    };

    cy.stub(window, 'sessionStorage').value(sessionStorageMock);

    // Mock navigate function if provided
    if (remixStubProps.navigate) {
      cy.stub(window as any, 'navigate').callsFake(remixStubProps.navigate);
    }
  }, [remixStubProps.navigate]);

  // Create route loader and action with request info
  const dataFunctionArgs = createDataFunctionArgs(remixStubProps);

  // Create a route object for the router
  const routes: RouteObject[] = [
    {
      id: 'root',
      path: '/',
      loader: async () => ({
        requestInfo: {
          url: dataFunctionArgs.request.url,
          method: dataFunctionArgs.request.method,
          headers: Object.fromEntries([...dataFunctionArgs.request.headers.entries()]),
          clientAddress: '127.0.0.1',
        },
        ...remixStubProps.rootLoaderData,
      }),
      children: [
        {
          path,
          element: children,
          loader: async () => remixStubProps.loaderData || {},
          action: async () => remixStubProps.actionData || null,
          errorElement: remixStubProps.errorElement,
        },
      ],
    },
  ];

  // Create a memory router with the routes
  const router = createMemoryRouter(routes, {
    initialEntries,
    initialIndex,
  });

  // Apply mock navigation state if provided
  if (remixStubProps.navigation) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Accessing internal properties for testing
    router.state.navigation = remixStubProps.navigation;
  }

  // Create the request info context value
  const requestInfoValue = {
    requestInfo: {
      url: dataFunctionArgs.request.url,
      method: dataFunctionArgs.request.method,
      headers: dataFunctionArgs.request.headers,
      clientAddress: '127.0.0.1',
    },
    serverHandoff: {
      url: dataFunctionArgs.request.url,
      state: remixStubProps.handoffState || {},
    },
  };

  return (
    <RootContext.Provider value={requestInfoValue}>
      <RouterProvider router={router} />
    </RootContext.Provider>
  );
};

/**
 * Create a wrapper for mounting with cypress
 */
export const createRemixStubWrapper = (remixStubOptions: Omit<RemixStubProps, 'children'> = {}) => {
  // eslint-disable-next-line react/display-name
  return (ui: React.ReactNode) => <RemixStub {...remixStubOptions}>{ui}</RemixStub>;
};
