import { NotificationBell } from '@/components/notification/notification-bell';

describe('NotificationBell', () => {
  it('shows no badge when pendingCount is 0', () => {
    cy.mount(<NotificationBell pendingCount={0} />);
    cy.get('[data-testid="notification-badge"]').should('not.exist');
  });

  it('shows numeric badge when pendingCount > 0', () => {
    cy.mount(<NotificationBell pendingCount={3} />);
    cy.get('[data-testid="notification-badge"]').should('contain', '3');
  });

  it('caps badge display at 99+ when pendingCount > 99', () => {
    cy.mount(<NotificationBell pendingCount={150} />);
    cy.get('[data-testid="notification-badge"]').should('contain', '99+');
  });

  it('sets correct aria-label when pendingCount > 99', () => {
    cy.mount(<NotificationBell pendingCount={150} />);
    cy.get('button').should('have.attr', 'aria-label', 'Notifications (99+ pending)');
  });
});
