// TODO: for now login test is disabled because of new auth flow
import { routes } from '@/constants/routes'

describe('Log in', () => {
  beforeEach(() => {
    // Reset any previous login state
    cy.clearCookies()
    cy.clearLocalStorage()

    cy.request(routes.auth.logIn, {
      failOnStatusCode: false,
      headers: {
        cookie: '',
      },
    }).then(() => {
      cy.visit(routes.auth.logIn, {
        failOnStatusCode: false,
        headers: {
          cookie: '',
        },
      })
    })
  })

  it('should render the log in page', () => {
    // Check if we're redirected to the OIDC provider
    cy.url().should('include', Cypress.env('AUTH_OIDC_ISSUER'))

    cy.contains('.provider-name', 'Google').should('be.visible')
    cy.contains('.provider-name', 'GitHub').should('be.visible')
  })
})
