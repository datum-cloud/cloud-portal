import { Table } from '@/components/table';
import type { ColumnDef } from '@/components/table';
import { LiveUpdatesChip } from '@/components/table/components/live-updates-chip';
import { LiveUpdatesToggle } from '@/components/table/components/live-updates-toggle';
import { LiveUpdatesResumeAllControl } from '@/features/project-bottom-bar/project-bottom-bar';
import { liveUpdatesStore, LIVE_UPDATES_STORAGE_KEY } from '@/modules/watch';
import { QueryClient, QueryClientProvider, hashKey } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v8';

const KEY = ['dns-records', 'proj-1', 'zone-1'] as const;
// A second table's key — used throughout to prove pausing one table leaves
// another untouched, now that the pause is per query key rather than a
// single global preference.
const OTHER = ['dns-records', 'proj-1', 'zone-2'] as const;

function withQueryClient(client: QueryClient, children: React.ReactNode) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

type Row = { id: string; name: string };
const columns: ColumnDef<Row>[] = [{ accessorKey: 'name', header: 'Name' }];

/**
 * Wait until the mounted control has registered its query key.
 *
 * `useLiveUpdates` registers in a mount effect, and the store only holds
 * updates for keys that have a control — so nothing can be tallied until
 * React has flushed that effect. Retries rather than assuming a tick.
 */
function afterControlMounted(key: readonly unknown[] = KEY) {
  return cy.wrap(null, { log: false }).should(() => {
    expect(liveUpdatesStore.hasControl(key)).to.equal(true);
  });
}

function table(rows: Row[], options: { loading?: boolean } = {}) {
  // NuqsAdapter is required to mount Table.Client at all — see
  // cypress/component/table-page-preservation.cy.tsx for why.
  return withQueryClient(
    new QueryClient(),
    <NuqsAdapter>
      <Table.Client<Row>
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        urlSync={false}
        empty="No DNS records found"
        liveUpdates={{ queryKey: KEY }}
        // Real consumers (e.g. the DNS records table) always pair
        // `liveUpdates` with `search` — this exercises the toggle's actual
        // "immediately after the search input" placement rather than the
        // degenerate no-search layout.
        search
        loading={options.loading}
      />
    </NuqsAdapter>
  );
}

describe('LiveUpdatesControls', () => {
  beforeEach(() => {
    // `cy.window().then(...)` only enqueues a Cypress command; it does not
    // run synchronously. `liveUpdatesStore.__resetForTests()` must run inside the
    // callback, AFTER localStorage is actually cleared — otherwise reset()
    // runs first (on the previous test's still-present localStorage) and a
    // leaked pause bleeds into the next test.
    cy.window().then((win) => {
      win.localStorage.clear();
      liveUpdatesStore.__resetForTests();
    });
  });

  it('chip stays hidden while live', () => {
    cy.mount(withQueryClient(new QueryClient(), <LiveUpdatesChip queryKey={KEY} />));
    cy.get('[data-e2e="live-updates-chip"]').should('not.exist');
  });

  it('chip stays hidden when paused with nothing pending', () => {
    liveUpdatesStore.pause(KEY);
    cy.mount(withQueryClient(new QueryClient(), <LiveUpdatesChip queryKey={KEY} />));
    cy.get('[data-e2e="live-updates-chip"]').should('not.exist');
  });

  it('chip appears with a count once updates are held', () => {
    liveUpdatesStore.pause(KEY);
    cy.mount(withQueryClient(new QueryClient(), <LiveUpdatesChip queryKey={KEY} />));
    afterControlMounted().then(() => {
      liveUpdatesStore.gate(KEY);
      liveUpdatesStore.gate(KEY);
      liveUpdatesStore.gate(KEY);
    });
    cy.get('[data-e2e="live-updates-chip"]')
      .should('be.visible')
      .and('contain.text', '3 updates')
      .and('have.attr', 'aria-label', '3 updates available — refresh without resuming');
  });

  it('chip uses singular wording for one held update', () => {
    liveUpdatesStore.pause(KEY);
    cy.mount(withQueryClient(new QueryClient(), <LiveUpdatesChip queryKey={KEY} />));
    afterControlMounted().then(() => liveUpdatesStore.gate(KEY));
    cy.get('[data-e2e="live-updates-chip"]')
      .should('contain.text', '1 update')
      .and('not.contain.text', '1 updates')
      .and('have.attr', 'aria-label', '1 update available — refresh without resuming');
  });

  it('caps the displayed count at 99+ for a large tally', () => {
    // A session left paused for a long time can tally into the thousands;
    // the chip must stay readable instead of rendering the raw number.
    liveUpdatesStore.pause(KEY);
    cy.mount(withQueryClient(new QueryClient(), <LiveUpdatesChip queryKey={KEY} />));
    afterControlMounted().then(() => {
      for (let i = 0; i < 150; i++) {
        liveUpdatesStore.gate(KEY);
      }
    });
    cy.get('[data-e2e="live-updates-chip"]')
      .should('contain.text', '99+ updates')
      .and('have.attr', 'aria-label', '99+ updates available — refresh without resuming');
  });

  it('clicking the chip clears the pending tally', () => {
    liveUpdatesStore.pause(KEY);
    cy.mount(withQueryClient(new QueryClient(), <LiveUpdatesChip queryKey={KEY} />));
    afterControlMounted().then(() => liveUpdatesStore.gate(KEY));
    cy.get('[data-e2e="live-updates-chip"]').click();
    cy.get('[data-e2e="live-updates-chip"]').should('not.exist');
  });

  it("clicking the chip invalidates this table's query and leaves it paused", () => {
    // Catching up means "show me what I'm missing", not "turn live updates
    // back on". This asserts both halves of that: the refetch actually
    // fires (with the right query key), and this table's pause is
    // untouched — the chip must not touch the preference.
    liveUpdatesStore.pause(KEY);
    const queryClient = new QueryClient();
    cy.spy(queryClient, 'invalidateQueries').as('invalidate');
    cy.mount(withQueryClient(queryClient, <LiveUpdatesChip queryKey={KEY} />));
    afterControlMounted().then(() => liveUpdatesStore.gate(KEY));
    cy.get('[data-e2e="live-updates-chip"]').click();
    cy.get('@invalidate').should('have.been.calledWith', { queryKey: [...KEY] });
    cy.then(() => {
      expect(liveUpdatesStore.isPaused(KEY)).to.equal(true);
    });
  });

  it('chip reappears if more updates land while still paused after catching up', () => {
    // Direct consequence of catching up not unpausing: the reader is still
    // paused, so a further held event must tally and the chip must return.
    liveUpdatesStore.pause(KEY);
    cy.mount(withQueryClient(new QueryClient(), <LiveUpdatesChip queryKey={KEY} />));
    afterControlMounted().then(() => liveUpdatesStore.gate(KEY));
    cy.get('[data-e2e="live-updates-chip"]').click();
    cy.get('[data-e2e="live-updates-chip"]').should('not.exist');
    cy.then(() => liveUpdatesStore.gate(KEY));
    cy.get('[data-e2e="live-updates-chip"]')
      .should('be.visible')
      .and('have.attr', 'aria-label', '1 update available — refresh without resuming');
  });

  it('toggle persists only this key as paused, as a JSON array of hashes', () => {
    cy.mount(withQueryClient(new QueryClient(), <LiveUpdatesToggle queryKey={KEY} />));
    cy.get('[data-e2e="live-updates-toggle"]').click();
    cy.window()
      .its('localStorage')
      .invoke('getItem', LIVE_UPDATES_STORAGE_KEY)
      .then((raw) => {
        expect(JSON.parse(raw as unknown as string)).to.deep.equal([hashKey(KEY)]);
      });
  });

  it("resume invalidates this table's query and marks only this key live", () => {
    // Unlike catching up via the chip, resume (from the toggle) both
    // catches this table up AND un-pauses it.
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.pause(OTHER);
    const queryClient = new QueryClient();
    cy.spy(queryClient, 'invalidateQueries').as('invalidate');
    cy.mount(withQueryClient(queryClient, <LiveUpdatesToggle queryKey={KEY} />));
    cy.get('[data-e2e="live-updates-toggle"]').click();
    cy.get('@invalidate').should('have.been.calledWith', { queryKey: [...KEY] });
    cy.then(() => {
      expect(liveUpdatesStore.isPaused(KEY)).to.equal(false);
      // The other table's pause must survive this table's resume.
      expect(liveUpdatesStore.isPaused(OTHER)).to.equal(true);
    });
  });

  it('toggle states the pause scope in the accessible label', () => {
    cy.mount(withQueryClient(new QueryClient(), <LiveUpdatesToggle queryKey={KEY} />));
    cy.get('[data-e2e="live-updates-toggle"]')
      .should('have.attr', 'aria-label')
      .and('contain', 'this table only');
  });

  it('toggle shows a short state label alongside the icon', () => {
    cy.mount(withQueryClient(new QueryClient(), <LiveUpdatesToggle queryKey={KEY} />));
    cy.get('[data-e2e="live-updates-toggle"]').should('contain.text', 'Live');
    cy.get('[data-e2e="live-updates-toggle"]').click();
    cy.get('[data-e2e="live-updates-toggle"]').should('contain.text', 'Paused');
  });

  it('toggle has no aria-pressed — the dynamic label carries the state instead', () => {
    cy.mount(withQueryClient(new QueryClient(), <LiveUpdatesToggle queryKey={KEY} />));
    cy.get('[data-e2e="live-updates-toggle"]').should('not.have.attr', 'aria-pressed');
  });
});

describe('LiveUpdatesControls cross-table isolation', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear();
      liveUpdatesStore.__resetForTests();
    });
  });

  it("pausing one table's toggle does not pause another table's", () => {
    cy.mount(
      withQueryClient(
        new QueryClient(),
        <div>
          <div data-testid="table-a">
            <LiveUpdatesToggle queryKey={KEY} />
          </div>
          <div data-testid="table-b">
            <LiveUpdatesToggle queryKey={OTHER} />
          </div>
        </div>
      )
    );
    cy.get('[data-testid="table-a"] [data-e2e="live-updates-toggle"]').click();
    cy.then(() => {
      expect(liveUpdatesStore.isPaused(KEY)).to.equal(true);
      expect(liveUpdatesStore.isPaused(OTHER)).to.equal(false);
    });
    // Table B's own toggle must still read (and offer) the live state.
    cy.get('[data-testid="table-b"] [data-e2e="live-updates-toggle"]')
      .should('have.attr', 'aria-label')
      .and('contain', 'Pause live updates');
  });

  it("a held update for one table's chip does not appear on another table's chip", () => {
    cy.mount(
      withQueryClient(
        new QueryClient(),
        <div>
          <LiveUpdatesChip queryKey={KEY} />
          <LiveUpdatesChip queryKey={OTHER} />
        </div>
      )
    );
    liveUpdatesStore.pause(KEY);
    afterControlMounted(KEY).then(() => liveUpdatesStore.gate(KEY));
    cy.get('[data-e2e="live-updates-chip"]').should('have.length', 1);
    cy.then(() => {
      expect(liveUpdatesStore.pendingFor(OTHER)).to.equal(0);
    });
  });
});

describe('LiveUpdatesControls inside Table.Client', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear();
      liveUpdatesStore.__resetForTests();
    });
  });

  it('renders the toggle and the chip together once there are rows', () => {
    liveUpdatesStore.pause(KEY);
    cy.mount(table([{ id: '1', name: 'Row 1' }]));
    cy.get('[data-e2e="live-updates-toggle"]').should('exist');
    afterControlMounted().then(() => liveUpdatesStore.gate(KEY));
    cy.get('[data-e2e="live-updates-chip"]')
      .should('be.visible')
      .and('contain.text', '1 update')
      .and('have.attr', 'aria-label', '1 update available — refresh without resuming');
  });

  it('positions the toggle immediately after the search input, and the chip immediately after the toggle', () => {
    liveUpdatesStore.pause(KEY);
    cy.mount(table([{ id: '1', name: 'Row 1' }]));
    // The toggle's nearest preceding sibling (through its Tooltip wrapper)
    // is the search input's container — adjacency to search, per the
    // redesign's left-group placement.
    cy.get('[data-e2e="live-updates-toggle"]').parent().prev().find('input').should('exist');
    afterControlMounted().then(() => liveUpdatesStore.gate(KEY));
    // The chip's nearest preceding sibling is the toggle itself — adjacency
    // by construction, not by two independently-gated render sites.
    cy.get('[data-e2e="live-updates-chip"]')
      .parent()
      .prev()
      .find('[data-e2e="live-updates-toggle"]')
      .should('exist');
  });

  it('renders neither the toggle nor the chip in the standalone-empty state', () => {
    // The toolbar's tools row is suppressed when the table is
    // standalone-empty, taking the toggle with it. A chip rendered
    // independently of the toggle would survive that and offer "N updates
    // available" above the empty card with no pause/resume control anywhere.
    liveUpdatesStore.pause(KEY);
    cy.mount(table([]));
    cy.contains('No DNS records found').should('be.visible');
    cy.get('[data-e2e="live-updates-toggle"]').should('not.exist');
    cy.get('[data-e2e="live-updates-chip"]').should('not.exist');
  });

  it('renders neither the toggle nor the chip during the initial-loading skeleton', () => {
    // Same adjacency guarantee as the standalone-empty case: the real tools
    // row (and both live-updates pieces with it) is swapped for
    // `SkeletonTools` while `loading` is still true on first mount.
    liveUpdatesStore.pause(KEY);
    cy.mount(table([{ id: '1', name: 'Row 1' }], { loading: true }));
    cy.get('[data-e2e="live-updates-toggle"]').should('not.exist');
    cy.get('[data-e2e="live-updates-chip"]').should('not.exist');
  });
});

describe('LiveUpdatesResumeAllControl (footer)', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear();
      liveUpdatesStore.__resetForTests();
    });
  });

  it('renders, disabled, with a zero-state tooltip when no table is paused', () => {
    cy.mount(withQueryClient(new QueryClient(), <LiveUpdatesResumeAllControl />));
    cy.get('[data-e2e="live-updates-resume-all"]')
      .should('exist')
      .and('be.disabled')
      .and('have.attr', 'aria-label', 'Live updates — no tables paused');
  });

  it('appears enabled with a count once a table is paused', () => {
    cy.mount(withQueryClient(new QueryClient(), <LiveUpdatesResumeAllControl />));
    cy.get('[data-e2e="live-updates-resume-all"]').should('be.disabled');
    cy.then(() => liveUpdatesStore.pause(KEY));
    cy.get('[data-e2e="live-updates-resume-all"]')
      .should('not.be.disabled')
      .and('have.attr', 'aria-label')
      .and('contain', '1 table paused, click to resume all');
    cy.get('[data-testid="live-updates-resume-all-badge"]').should('contain.text', '1');
  });

  it('pluralizes once more than one table is paused', () => {
    cy.mount(withQueryClient(new QueryClient(), <LiveUpdatesResumeAllControl />));
    cy.then(() => {
      liveUpdatesStore.pause(KEY);
      liveUpdatesStore.pause(OTHER);
    });
    cy.get('[data-e2e="live-updates-resume-all"]')
      .should('have.attr', 'aria-label')
      .and('contain', '2 tables paused, click to resume all');
    cy.get('[data-testid="live-updates-resume-all-badge"]').should('contain.text', '2');
  });

  it('goes back to disabled, with no badge, once every paused table is resumed', () => {
    cy.mount(withQueryClient(new QueryClient(), <LiveUpdatesResumeAllControl />));
    cy.then(() => liveUpdatesStore.pause(KEY));
    cy.get('[data-e2e="live-updates-resume-all"]').should('not.be.disabled');
    cy.then(() => liveUpdatesStore.resume(KEY));
    cy.get('[data-e2e="live-updates-resume-all"]')
      .should('be.disabled')
      .and('have.attr', 'aria-label', 'Live updates — no tables paused');
    cy.get('[data-testid="live-updates-resume-all-badge"]').should('not.exist');
  });

  it('clicking resumes every paused table and invalidates only the currently-mounted ones', () => {
    const queryClient = new QueryClient();
    cy.spy(queryClient, 'invalidateQueries').as('invalidate');
    cy.mount(withQueryClient(queryClient, <LiveUpdatesResumeAllControl />));
    cy.then(() => {
      // KEY is "on screen" (a control is registered for it); OTHER was
      // paused earlier and the reader has since navigated away from it.
      liveUpdatesStore.registerControl(KEY);
      liveUpdatesStore.pause(KEY);
      liveUpdatesStore.pause(OTHER);
    });
    cy.get('[data-e2e="live-updates-resume-all"]').click();
    cy.get('@invalidate').should('have.been.calledOnce');
    cy.get('@invalidate').should('have.been.calledWith', { queryKey: [...KEY] });
    cy.then(() => {
      expect(liveUpdatesStore.pausedCount()).to.equal(0);
      expect(liveUpdatesStore.isPaused(KEY)).to.equal(false);
      expect(liveUpdatesStore.isPaused(OTHER)).to.equal(false);
    });
    cy.get('[data-e2e="live-updates-resume-all"]').should('be.disabled');
  });
});
