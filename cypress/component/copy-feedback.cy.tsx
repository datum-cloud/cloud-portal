import { BadgeCopy } from '@/components/badge/badge-copy';
import { TextCopy } from '@/components/text-copy/text-copy';
import { TextCopyBox } from '@/components/text-copy/text-copy-box';
import { Toaster } from '@datum-cloud/datum-ui/toast';
import { toast as sonnerToast } from 'sonner';

const SUCCESS = 'Copied to clipboard';
const FAILURE = 'Could not copy to clipboard';

function stubClipboard(writeText?: (text: string) => Promise<void>) {
  cy.window().then((win) => {
    Object.defineProperty(win.navigator, 'clipboard', {
      configurable: true,
      value: writeText ? { writeText } : undefined,
    });
  });
}

function mountWithToaster(component: React.ReactNode) {
  cy.mount(
    <>
      {component}
      <Toaster />
    </>
  );
}

describe('Copy feedback', () => {
  // Sonner keeps its toast queue in module state, which survives cy.mount
  // remounts. A toast from the previous test would otherwise still be on screen.
  beforeEach(() => {
    sonnerToast.dismiss();
  });

  describe('TextCopy', () => {
    it('confirms a copy that worked', () => {
      const writes: string[] = [];
      stubClipboard((text) => {
        writes.push(text);
        return Promise.resolve();
      });
      mountWithToaster(<TextCopy value="node-1" />);

      cy.get('button').first().click();

      cy.contains(SUCCESS).should('exist');
      cy.contains(FAILURE).should('not.exist');
      cy.wrap(writes).should('deep.equal', ['node-1']);
    });

    it('reports a failing clipboard write instead of confirming it', () => {
      stubClipboard(() => Promise.reject(new Error('denied')));
      mountWithToaster(<TextCopy value="node-1" />);

      cy.get('button').first().click();

      cy.contains(FAILURE).should('exist');
      cy.contains(SUCCESS).should('not.exist');
    });

    it('reports when the clipboard is unavailable', () => {
      stubClipboard();
      mountWithToaster(<TextCopy value="node-1" />);

      cy.get('button').first().click();

      cy.contains(FAILURE).should('exist');
      cy.contains(SUCCESS).should('not.exist');
    });
  });

  describe('TextCopyBox', () => {
    it('confirms a copy that worked', () => {
      stubClipboard(() => Promise.resolve());
      mountWithToaster(<TextCopyBox value="https://example.com" />);

      cy.contains('button', 'Copy').click();

      cy.contains('button', 'Copied').should('exist');
      cy.contains(SUCCESS).should('exist');
      cy.contains(FAILURE).should('not.exist');
    });

    it('reports a failing clipboard write instead of confirming it', () => {
      stubClipboard(() => Promise.reject(new Error('denied')));
      mountWithToaster(<TextCopyBox value="https://example.com" />);

      cy.contains('button', 'Copy').click();

      cy.contains(FAILURE).should('exist');
      cy.contains(SUCCESS).should('not.exist');
      cy.contains('button', 'Copy').should('exist');
      cy.contains('button', 'Copied').should('not.exist');
    });
  });

  describe('BadgeCopy', () => {
    it('confirms a copy that worked', () => {
      stubClipboard(() => Promise.resolve());
      mountWithToaster(<BadgeCopy value="project-1" />);

      cy.get('[aria-label="Copy to clipboard"]').click();

      cy.get('[aria-label="Copied!"]').should('exist');
      cy.contains(SUCCESS).should('exist');
      cy.contains(FAILURE).should('not.exist');
    });

    it('reports a failing clipboard write instead of confirming it', () => {
      stubClipboard(() => Promise.reject(new Error('denied')));
      mountWithToaster(<BadgeCopy value="project-1" />);

      cy.get('[aria-label="Copy to clipboard"]').click();

      cy.contains(FAILURE).should('exist');
      cy.contains(SUCCESS).should('not.exist');
      cy.get('[aria-label="Copied!"]').should('not.exist');
    });
  });
});
