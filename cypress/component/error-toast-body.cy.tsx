import { ErrorToastBody } from '@/components/error/error-toast-body';
import { toastApiError } from '@/components/error/toast-api-error';
import { AppError } from '@/utils/errors/app-error';
import { PERMISSION_DENIED_MESSAGE } from '@/utils/errors/authorization-message';
import { rbacDenial } from '@/utils/errors/rbac-denial.fixture';
import { Toaster } from '@datum-cloud/datum-ui/toast';
import { toast as sonnerToast } from 'sonner';

const RAW = rbacDenial({
  verb: 'patch',
  resource: 'dnsrecordsets',
  group: 'dns.networking.miloapis.com',
  name: 'www',
});
const MESSAGE = 'Permission denied for changes to DNS. Ask an administrator for access.';

function stubClipboard(writes: string[]) {
  cy.window().then((win) => {
    Object.defineProperty(win.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          writes.push(text);
          return Promise.resolve();
        },
      },
    });
  });
}

describe('ErrorToastBody', () => {
  it('starts closed and opens to the raw text', () => {
    cy.mount(<ErrorToastBody message={MESSAGE} detail={RAW} requestId="req-1" />);

    cy.contains(MESSAGE).should('be.visible');
    cy.contains('button', 'Show details').should('have.attr', 'aria-expanded', 'false');
    cy.get('[data-e2e=error-toast-detail]').should('not.be.visible');

    cy.contains('button', 'Show details').click();
    cy.contains('button', 'Hide details').should('have.attr', 'aria-expanded', 'true');
    cy.get('[data-e2e=error-toast-detail]').should('have.text', RAW);
    cy.contains('Request ID req-1').should('be.visible');
  });

  it('copies the details', () => {
    const writes: string[] = [];
    stubClipboard(writes);
    cy.mount(<ErrorToastBody message={MESSAGE} detail={RAW} requestId="req-1" />);

    cy.contains('button', 'Show details').click();
    cy.contains('button', 'Copy details').click();
    cy.contains('button', 'Copied').should('be.visible');
    cy.wrap(writes).should('deep.equal', [`${RAW}\nRequest ID req-1`]);
  });

  it('shows only the message when there is nothing more', () => {
    cy.mount(<ErrorToastBody message="Name is too long" />);

    cy.contains('Name is too long').should('be.visible');
    cy.contains('Show details').should('not.exist');
  });

  it('keeps the open panel inside a 320px toast', () => {
    cy.viewport(320, 640);
    cy.mount(
      <div data-cy="toast" className="w-90 max-w-[calc(100vw-2rem)] px-5 py-4">
        <ErrorToastBody message={MESSAGE} detail={RAW} requestId="req-1" />
      </div>
    );

    cy.contains('button', 'Show details').click();
    cy.get('[data-cy=toast]').then(($toast) => {
      const toast = $toast[0].getBoundingClientRect();
      cy.get('[data-e2e=error-toast-detail]').should(($panel) => {
        const panel = $panel[0].getBoundingClientRect();
        expect(panel.left, 'panel left edge').to.be.at.least(toast.left);
        expect(panel.right, 'panel right edge').to.be.at.most(toast.right);
      });
    });
  });
});

describe('ErrorToastBody accessibility and feedback', () => {
  it('points the toggle at a panel that exists while closed', () => {
    cy.mount(<ErrorToastBody message={MESSAGE} detail={RAW} requestId="req-1" />);

    cy.contains('button', 'Show details')
      .invoke('attr', 'aria-controls')
      .then((id) => {
        cy.get(`[id="${id}"]`).should('exist').and('not.be.visible');
      });
  });

  it('keeps the details text at full strength on the toast colour', () => {
    cy.mount(<ErrorToastBody message={MESSAGE} detail={RAW} requestId="req-1" />);

    cy.contains('button', 'Show details').should('have.css', 'opacity', '1').click();
    cy.contains('Request ID req-1').should('have.css', 'opacity', '1');
    // No tint behind the raw text: a tint lightens the red and lowers contrast.
    cy.get('[data-e2e=error-toast-detail]').should(
      'have.css',
      'background-color',
      'rgba(0, 0, 0, 0)'
    );
  });

  it("says so when the details can't be copied", () => {
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'clipboard', { configurable: true, value: undefined });
    });
    cy.mount(<ErrorToastBody message={MESSAGE} detail={RAW} requestId="req-1" />);

    cy.contains('button', 'Show details').click();
    cy.contains('button', 'Copy details').click();
    cy.contains('button', "Couldn't copy").should('be.visible');
  });
});

describe('toastApiError', () => {
  // Sonner keeps its queue in module state, which survives cy.mount remounts.
  beforeEach(() => {
    sonnerToast.dismiss();
  });

  it('shows a labelled denial as a toast with details', () => {
    cy.mount(<Toaster />);
    cy.then(() => {
      toastApiError(
        new AppError(PERMISSION_DENIED_MESSAGE, {
          status: 403,
          originalMessage: RAW,
          requestId: 'req-1',
        }),
        { title: 'Could not update DNS record' }
      );
    });

    cy.contains('Could not update DNS record').should('be.visible');
    cy.contains(MESSAGE).should('be.visible');
    cy.contains('button', 'Show details').should('be.visible');
  });

  it('grows the toast to show the opened details', () => {
    cy.mount(<Toaster />);
    cy.then(() => {
      toastApiError(
        new AppError(PERMISSION_DENIED_MESSAGE, {
          status: 403,
          originalMessage: RAW,
          requestId: 'req-1',
        }),
        { title: 'Could not update DNS record' }
      );
    });

    // Hovering the toaster expands it, which is when sonner pins each toast
    // to its measured height. That is the state a person clicking is in.
    cy.get('[data-sonner-toast]').trigger('mouseover');
    cy.get('[data-sonner-toast]').should('have.attr', 'data-expanded', 'true');
    cy.contains('button', 'Show details').click();

    cy.get('[data-sonner-toast]').then(($toast) => {
      cy.contains('button', 'Copy details').should(($button) => {
        const toast = $toast[0].getBoundingClientRect();
        const button = $button[0].getBoundingClientRect();
        expect(button.bottom, 'Copy details bottom edge').to.be.at.most(toast.bottom);
      });
    });
  });
});
