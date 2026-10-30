import { ContentWrapper } from '@/components/content-wrapper';

// The dashboard shell is fixed to the window and only the content pane
// scrolls. An absolutely positioned element below the fold, like the hidden
// native <select> behind each Form.Select, must stay inside that pane rather
// than stretch the document and make the whole layout scroll.
describe('ContentWrapper', () => {
  it('keeps absolutely positioned content inside the scroll pane', () => {
    cy.viewport(1000, 600);
    cy.mountRemixRoute(
      <div className="flex h-svh w-full flex-col overflow-hidden">
        <div className="min-h-0 flex-1">
          <ContentWrapper containerClassName="overflow-y-auto">
            <div style={{ height: 2000 }}>Tall page</div>
            <div>
              <select aria-hidden style={{ position: 'absolute', width: 1, height: 1 }}>
                <option>US</option>
              </select>
            </div>
          </ContentWrapper>
        </div>
      </div>
    );

    cy.contains('Tall page').should('exist');
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollHeight).to.be.at.most(doc.documentElement.clientHeight);
    });
  });
});
