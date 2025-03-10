describe('Log in', () => {
  beforeEach(() => {
    // Reset any previous login state
    cy.clearCookies()
    cy.clearLocalStorage()

    cy.visit('/log-in')
  })

  it('should render the log in page', () => {
    cy.url().should('include', '/log-in')

    cy.contains('p', 'Welcome to Datum Cloud').should('be.visible')

    cy.contains('button', 'Sign in with Google').should('be.visible')

    cy.contains('button', 'Sign in with GitHub').should('be.visible')
  })
})
