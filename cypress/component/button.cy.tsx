import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders with correct text', () => {
    cy.mount(<Button>Click Me</Button>);
    cy.get('button').should('have.text', 'Click Me');
  });
});
