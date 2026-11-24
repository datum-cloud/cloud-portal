// @vitest-environment jsdom
import type { UsageSummaryRow } from '../usage.types';
import { SpendBreakdown } from './spend-breakdown';
import { UsageSummaryTable } from './usage-summary-table';
import type { UsageSpend } from '@/modules/billing/usage.types';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./usage-sparkline', () => ({ UsageSparkline: () => null }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const row = (id: string, spend?: UsageSpend): UsageSummaryRow => ({
  id,
  apiName: id,
  label: id,
  unit: { kind: 'count', scale: 1 },
  used: 10,
  limit: 0,
  spend,
  series: [],
  group: 'Compute',
  groupId: 'compute.miloapis.com',
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

// The column headers; group header rows are table headers too, but empty.
const headers = () =>
  [...container.querySelectorAll('th')].map((th) => th.textContent?.trim()).filter(Boolean);

describe('UsageSummaryTable', () => {
  it('shows only the cost when nothing is discounted', () => {
    act(() =>
      root.render(
        <UsageSummaryTable
          rows={[row('cpu', { amount: 20, beforeDiscounts: 20, discount: 0, currency: 'USD' })]}
        />
      )
    );
    expect(headers()).toEqual(['Product', 'Trend', 'Usage', 'Cost']);
  });

  it('shows the cost before discount and the discount when something is discounted', () => {
    act(() =>
      root.render(
        <UsageSummaryTable
          rows={[
            row('cpu', { amount: 0, beforeDiscounts: 40, discount: 40, currency: 'USD' }),
            row('egress', { amount: 20, beforeDiscounts: 20, discount: 0, currency: 'USD' }),
          ]}
        />
      )
    );
    expect(headers()).toEqual(['Product', 'Trend', 'Usage', 'Before discount', 'Discount', 'Cost']);
    expect(container.textContent).toContain('$40.00');
    expect(container.textContent).toContain('−$40.00100%');
  });
});

describe('SpendBreakdown', () => {
  it('shows what a discount took off', () => {
    act(() =>
      root.render(
        <SpendBreakdown
          spend={{ amount: 0, beforeDiscounts: 412.3, discount: 412.3, currency: 'USD' }}
        />
      )
    );
    expect(container.textContent).toBe('$412.30 before discount · −$412.30 (100% off)');
  });

  it('renders nothing without a discount', () => {
    act(() => root.render(<SpendBreakdown spend={{ amount: 12, currency: 'USD' }} />));
    expect(container.textContent).toBe('');
  });
});
