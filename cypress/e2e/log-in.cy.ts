import { routes } from '@/constants/routes'

describe('Log in', () => {
  beforeEach(() => {
    // Reset any previous login state
    cy.clearCookies()
    cy.clearLocalStorage()

    cy.visit(routes.auth.logIn)
  })

  it('should render the log in page', () => {
    cy.url().should('include', routes.auth.logIn)

    cy.contains('p', 'Welcome to Datum Cloud').should('be.visible')

    cy.contains('button', 'Sign in with Google').should('be.visible')

    cy.contains('button', 'Sign in with GitHub').should('be.visible')
  })
})
