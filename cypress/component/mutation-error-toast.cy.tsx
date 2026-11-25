import { showMutationErrorToast } from '@/modules/quota/quota-toast';
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

const labelled403 = () =>
  new AppError(PERMISSION_DENIED_MESSAGE, {
    status: 403,
    originalMessage: RAW,
    requestId: 'req-1',
  });

describe('showMutationErrorToast', () => {
  // Sonner keeps its queue in module state, which survives cy.mount remounts.
  beforeEach(() => {
    sonnerToast.dismiss();
    cy.mount(<Toaster />);
  });

  it('explains a permission denial', () => {
    cy.then(() => {
      showMutationErrorToast(labelled403(), {
        scope: 'project',
        projectId: 'p',
        fallbackTitle: 'Could not update DNS record',
      });
    });

    cy.contains('Could not update DNS record').should('be.visible');
    cy.contains('Permission denied for changes to DNS.').should('be.visible');
    cy.contains('button', 'Show details').should('be.visible');
  });

  it("keeps the caller's own description", () => {
    cy.then(() => {
      showMutationErrorToast(labelled403(), {
        scope: 'project',
        projectId: 'p',
        fallbackTitle: 'Could not update DNS record',
        fallbackDescription: 'Record name is taken',
      });
    });

    cy.contains('Record name is taken').should('be.visible');
    cy.contains('button', 'Show details').should('be.visible');
  });
});
