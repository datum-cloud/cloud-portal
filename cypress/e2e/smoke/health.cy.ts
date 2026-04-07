describe('Health check', () => {
  it('GET /_healthz should return 200', () => {
    cy.request('/_healthz').then((response) => {
      expect(response.status).to.eq(200);
    });
  });
});
