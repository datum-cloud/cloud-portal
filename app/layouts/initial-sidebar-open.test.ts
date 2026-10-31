import { resolveInitialSidebarOpen } from './initial-sidebar-open';
import { describe, expect, it } from 'bun:test';

describe('resolveInitialSidebarOpen', () => {
  it('opens the nav on desktop when the user has no preference', () => {
    expect(resolveInitialSidebarOpen({ breakpoint: 'desktop' })).toBe(true);
  });

  it('follows the persisted pin on desktop', () => {
    expect(resolveInitialSidebarOpen({ breakpoint: 'desktop', persisted: false })).toBe(false);
    expect(resolveInitialSidebarOpen({ breakpoint: 'desktop', persisted: true })).toBe(true);
  });

  it('lets ?sidebar=false collapse the nav over a persisted pin', () => {
    expect(
      resolveInitialSidebarOpen({ breakpoint: 'desktop', persisted: true, sidebarParam: 'false' })
    ).toBe(false);
  });

  it("lets the caller's explicit prop win over the param and the pin", () => {
    expect(
      resolveInitialSidebarOpen({
        breakpoint: 'desktop',
        explicit: true,
        persisted: false,
        sidebarParam: 'false',
      })
    ).toBe(true);
  });

  // The client collapses the nav below desktop on mount. Rendering it collapsed
  // on the server too is what keeps the content from jumping 12rem left.
  it('collapses below desktop whatever the pin or prop says', () => {
    expect(resolveInitialSidebarOpen({ breakpoint: 'tablet', persisted: true })).toBe(false);
    expect(resolveInitialSidebarOpen({ breakpoint: 'tablet', explicit: true })).toBe(false);
    expect(resolveInitialSidebarOpen({ breakpoint: 'mobile' })).toBe(false);
  });
});
