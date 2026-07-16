// cypress/component/modules/rybbit/rybbit-provider.cy.tsx
//
// window.rybbit is stubbed directly as a plain browser global — Rybbit has no npm package.
// The SUT (RybbitProvider's identify/clearUserId effect) runs for real; cy.mount flushes
// effects (act), so calls are observable in the .then()/.should() after mount.
import { RybbitProvider } from '@/modules/rybbit';

interface RybbitCall {
  fn: 'event' | 'identify' | 'pageview' | 'clearUserId';
  args: unknown[];
}

const rybbitCalls = (): RybbitCall[] =>
  (window as unknown as { __rybbitCalls: RybbitCall[] }).__rybbitCalls;

beforeEach(() => {
  (window as unknown as { __rybbitCalls: RybbitCall[] }).__rybbitCalls = [];
  window.rybbit = {
    event: (...args) => rybbitCalls().push({ fn: 'event', args }),
    identify: (...args) => rybbitCalls().push({ fn: 'identify', args }),
    clearUserId: (...args) => rybbitCalls().push({ fn: 'clearUserId', args }),
    pageview: (...args) => rybbitCalls().push({ fn: 'pageview', args }),
  };
});

describe('RybbitProvider', () => {
  it('identifies with just the sub when no traits are known', () => {
    cy.mount(
      <RybbitProvider siteId="997f89789d8f" identity={{ sub: 'user-42' }}>
        <div />
      </RybbitProvider>
    );
    cy.wrap(null).should(() => {
      expect(rybbitCalls().find((c) => c.fn === 'identify')?.args).to.deep.equal(['user-42']);
    });
  });

  it('identifies with email/name traits when available', () => {
    cy.mount(
      <RybbitProvider
        siteId="997f89789d8f"
        identity={{ sub: 'user-42', email: 'user@example.com', name: 'User Example' }}>
        <div />
      </RybbitProvider>
    );
    cy.wrap(null).should(() => {
      expect(rybbitCalls().find((c) => c.fn === 'identify')?.args).to.deep.equal([
        'user-42',
        { email: 'user@example.com', name: 'User Example' },
      ]);
    });
  });

  it('clears the identified user when identity is null', () => {
    cy.mount(
      <RybbitProvider siteId="997f89789d8f" identity={null}>
        <div />
      </RybbitProvider>
    );
    cy.wrap(null).should(() => {
      expect(rybbitCalls().filter((c) => c.fn === 'clearUserId')).to.have.length(1);
      expect(rybbitCalls().filter((c) => c.fn === 'identify')).to.have.length(0);
    });
  });
});
