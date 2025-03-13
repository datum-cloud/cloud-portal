/* eslint-disable @typescript-eslint/no-explicit-any */
import Login from '@/routes/_public+/log-in'

const mockModule = {
  path: '/log-in',
  initialEntries: ['/log-in'],
  remixStubProps: {
    // Provide root loader data that includes request info
    rootLoaderData: {
      requestInfo: {
        url: 'http://localhost:3000/log-in',
        method: 'GET',
        headers: {},
        clientAddress: '127.0.0.1',
        userPrefs: { theme: 'light' },
      },
    },
    // Mock request object
    request: new Request('http://localhost:3000/log-in'),
    // Add auth-related context that might be needed
    context: {
      session: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        get: (key: string) => null,
        set: () => {},
        commit: async () => 'session-cookie',
      },
      authenticator: {
        isAuthenticated: async () => null,
      },
    },
  },
}
describe('LogIn Component', () => {
  it('renders login page with all elements', () => {
    cy.mountRemixRoute(<Login />, mockModule)

    // Check if the card and main elements are present
    cy.findByText('Welcome to Datum Cloud').should('be.visible')
    cy.findByText('Unlock your networking superpowers').should('be.visible')

    // Check if both auth buttons are rendered
    cy.findByText('Sign in with Google').should('be.visible')
    cy.findByText('Sign in with GitHub').should('be.visible')

    // Check if signup link is present
    cy.findByText(/Don't have an account?/).should('be.visible')
    cy.findByText('Sign up').should('be.visible')

    // Verify the image is present
    cy.get('img[src*="abstract-1-light.png"]').should('exist')
  })

  it('displays correct theme-based image', () => {
    // Test with light theme
    cy.mountRemixRoute(<Login />, mockModule)
    cy.get('img[src*="abstract-1-light.png"]').should('exist')

    // Test with dark theme
    const darkThemeMock = {
      ...mockModule,
      remixStubProps: {
        ...mockModule.remixStubProps,
        rootLoaderData: {
          requestInfo: {
            ...mockModule.remixStubProps.rootLoaderData.requestInfo,
            userPrefs: { theme: 'dark' },
          },
        },
      },
    }

    cy.mountRemixRoute(<Login />, darkThemeMock)
    cy.get('img[src*="abstract-1-dark.png"]').should('exist')
  })
})
