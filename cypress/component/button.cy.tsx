import { Button } from '@datum-ui/components';

describe('Button', () => {
  it('renders with correct text', () => {
    cy.mount(<Button>Click Me</Button>);
    cy.get('button').should('have.text', 'Click Me');
  });
});
