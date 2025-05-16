// TODO: for now login test is disabled because of new auth flowdock

// /* eslint-disable @typescript-eslint/no-explicit-any */
// import AuthCard from '@/features/auth/auth'

// const mockModule = {
//   path: '/login',
//   initialEntries: ['/login'],
//   remixStubProps: {
//     // Provide root loader data that includes request info
//     rootLoaderData: {
//       requestInfo: {
//         url: 'http://localhost:3000/login',
//         method: 'GET',
//         headers: {},
//         clientAddress: '127.0.0.1',
//         userPrefs: { theme: 'light' },
//       },
//     },
//     // Mock request object
//     request: new Request('http://localhost:3000/login'),
//     // Add auth-related context that might be needed
//     context: {
//       session: {
//         // eslint-disable-next-line @typescript-eslint/no-unused-vars
//         get: (key: string) => null,
//         set: () => {},
//         commit: async () => 'session-cookie',
//       },
//       authenticator: {
//         isAuthenticated: async () => false,
//       },
//     },
//   },
// }
// describe('LogIn Component', () => {
//   it('renders login page with all elements when not authenticated', () => {
//     cy.mountRemixRoute(<AuthCard mode="login" />, mockModule)

//     // Check if the card and main elements are present
//     cy.findByText('Welcome to Datum Cloud').should('be.visible')
//     cy.findByText('Unlock your networking superpowers').should('be.visible')

//     // Check if sign in button is rendered
//     cy.findByText('Sign in').should('be.visible')

//     // Check if signup link is present
//     cy.findByText(/Don't have an account?/).should('be.visible')
//     cy.findByText('Sign up').should('be.visible')

//     // Verify the image is present
//     cy.get('img[src*="abstract-1-light.png"]').should('exist')
//   })

//   it('displays correct theme-based image', () => {
//     // Test with light theme
//     cy.mountRemixRoute(<AuthCard mode="login" />, mockModule)
//     cy.get('img[src*="abstract-1-light.png"]').should('exist')

//     // Test with dark theme
//     const darkThemeMock = {
//       ...mockModule,
//       remixStubProps: {
//         ...mockModule.remixStubProps,
//         rootLoaderData: {
//           requestInfo: {
//             ...mockModule.remixStubProps.rootLoaderData.requestInfo,
//             userPrefs: { theme: 'dark' },
//           },
//         },
//       },
//     }

//     cy.mountRemixRoute(<AuthCard mode="login" />, darkThemeMock)
//     cy.get('img[src*="abstract-1-dark.png"]').should('exist')
//   })
// })
