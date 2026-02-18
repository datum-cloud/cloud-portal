// ***********************************************************
// This example support/component.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************
// Import commands.js using ES2015 syntax:
// Ensure global app styles are loaded:
import { RemixStub } from './remixStub';
import '@/styles/root.css';
import '@testing-library/cypress/add-commands';
import { mount, MountOptions, MountReturn } from 'cypress/react';
import React from 'react';
import { MemoryRouter, MemoryRouterProps, Route, Routes } from 'react-router';

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Mounts a React node
       * @param component React Node to mount
       * @param options Additional options to pass into mount
       */
      mount(
        component: React.ReactNode,
        options?: MountOptions & MemoryRouterProps & { path?: string }
      ): Cypress.Chainable<MountReturn>;

      mountRemixRoute(
        component: React.ReactNode,
        options?: {
          initialEntries?: string[];
          initialIndex?: number;
          path?: string;
          remixStubProps?: Record<string, any>;
          [key: string]: any;
        }
      ): Chainable<any>;
    }
  }
}

Cypress.Commands.add('mount', (component, options = {}) => {
  const {
    initialEntries = ['/login'],
    initialIndex = 0,
    path = '/login',
    ...mountOptions
  } = options as any;

  const wrapped = (
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <Routes>
        <Route path={path} element={component} />
      </Routes>
    </MemoryRouter>
  );

  return mount(wrapped, mountOptions);
});
Cypress.Commands.add(
  'mountRemixRoute',
  (
    component: React.ReactNode,
    options: MountOptions &
      MemoryRouterProps & {
        path?: string;
        remixStubProps?: Record<string, unknown>;
      } = {}
  ) => {
    const {
      initialEntries = ['/'],
      initialIndex = 0,
      path = '/',
      remixStubProps = {},
      ...mountOptions
    } = options;

    return mount(
      <RemixStub
        initialEntries={initialEntries.map((entry) =>
          typeof entry === 'string' ? entry : entry.pathname || '/'
        )}
        initialIndex={initialIndex}
        path={path}
        remixStubProps={remixStubProps}>
        {component}
      </RemixStub>,
      mountOptions
    );
  }
);
