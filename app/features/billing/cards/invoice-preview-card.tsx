import { BILLING_COUNTRIES, BUSINESS_TAX_ID_TYPES } from '@/features/billing/constants';
import { SITE_CONFIG } from '@/utils/config/site.config';
import { toObjectArray } from '@/utils/helpers/form-value.helper';
import { Card } from '@datum-cloud/datum-ui/card';
import { useWatchAll } from '@datum-cloud/datum-ui/form';
import { type CSSProperties, useMemo } from 'react';

/**
 * Force the invoice panel to render with light-mode design tokens
 * regardless of the surrounding theme.
 *
 * The panel is intentionally `bg-white` (invoices are always white
 * paper) but every text/border inside it uses theme-driven Tailwind
 * tokens (`text-foreground`, `text-muted-foreground`, `border-border`)
 * which flip to near-white in dark mode — unreadable on the white
 * panel. The shadcn `--foreground` family is theme-driven; the
 * Figma-token primitives (`--midnight-fjord`, `--glacier-mist-900`)
 * have fixed values, so we re-pin the semantic variables to those
 * primitives at this scope only. Everything below keeps using its
 * usual `text-foreground` / `border-border` classes — no need to
 * sprinkle hardcoded colors through the JSX.
 */
const LIGHT_TOKEN_OVERRIDES = {
  '--foreground': 'var(--midnight-fjord)',
  // Mid-grey for secondary copy. Matches the shadcn light-mode
  // `--muted-foreground` value verbatim so labels read identically
  // to a freshly themed light page.
  '--muted-foreground': 'oklch(0.556 0 0)',
  '--border': 'var(--glacier-mist-900)',
} as CSSProperties;

const SELLER = {
  legalName: 'Datum Technology, Inc.',
  website: SITE_CONFIG.siteUrl.replace(/^https?:\/\//, ''),
  email: 'support@datum.net',
} as const;

/**
 * Lookup tables built once at module load. We pre-build maps (instead
 * of `find()`-ing on every render) because `useWatchAll` re-runs on
 * every keystroke and the country / tax-ID lists are 250+ items.
 */
const COUNTRY_LABELS = new Map(BILLING_COUNTRIES.map((c) => [c.value, c.label]));
const TAX_ID_LABELS = new Map(BUSINESS_TAX_ID_TYPES.map((t) => [t.value, t.label]));

/**
 * Shape of the form fields that drive the preview. Matches the
 * `billingAddressSchema` in `billing-address-card.tsx` (plus the tax-ID
 * row shape). Stays loose (`?`) on every key because `useWatchAll`
 * returns `Partial<T>` and individual fields can be empty strings
 * while the user is mid-typing.
 *
 * The trailing index signature is to satisfy `useWatchAll`'s
 * `T extends Record<string, unknown>` constraint — the form adapter
 * needs a permissive lookup type to deal with arbitrary field names.
 */
type InvoicePreviewValues = {
  name?: string;
  businessName?: string;
  country?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  taxIds?: Array<{ type?: string; value?: string }>;
} & Record<string, unknown>;

/**
 * Sample line items + totals shown in the preview. Static — the goal
 * here is to surface how the user's *contact* info would land on a
 * real invoice, not to mock the billing engine.
 *
 * Split into two sections that mirror how Datum actually bills:
 * a recurring `Subscription` line (the platform tier the customer is
 * on) and a list of metered `Usage` items consumed during the period.
 * Each section gets its own subtotal so the breakdown looks like a
 * real Stripe/SaaS invoice rather than a flat list of charges.
 *
 * The optional `meta` line is rendered as a secondary descriptor
 * underneath the description — handy for subscription periods
 * ("May 1 – May 31") without polluting the main description column.
 */
type InvoiceSection = {
  title: string;
  items: ReadonlyArray<{
    description: string;
    meta?: string;
    qty: number;
    amount: number;
  }>;
};

const SAMPLE_INVOICE_SECTIONS: readonly InvoiceSection[] = [
  {
    title: 'Subscription',
    items: [
      {
        description: 'Datum Platform — Scaler',
        meta: 'Monthly · May 1 – May 31',
        qty: 1,
        amount: 20.0,
      },
    ],
  },
  {
    title: 'Usage',
    items: [
      { description: 'AI Edge requests', qty: 1_200_000, amount: 24.0 },
      { description: 'Compute (GB-hours)', qty: 5_000, amount: 5.0 },
      { description: 'Bandwidth (GB)', qty: 1_000, amount: 10.0 },
    ],
  },
];

const SECTION_SUBTOTALS = SAMPLE_INVOICE_SECTIONS.map((section) =>
  section.items.reduce((sum, item) => sum + item.amount, 0)
);

const SAMPLE_SUBTOTAL = SECTION_SUBTOTALS.reduce((sum, amount) => sum + amount, 0);
const SAMPLE_TAX = SAMPLE_SUBTOTAL * 0.0; // Real engine computes per-region; preview is illustrative.
const SAMPLE_TOTAL = SAMPLE_SUBTOTAL + SAMPLE_TAX;

const currency = (amount: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

/**
 * Format integer quantities with thousands separators. Usage line
 * items can run into the millions (`1,200,000` API requests), so we
 * apply locale formatting unconditionally — subscription qty of `1`
 * just renders as `1`, no special-casing needed.
 */
const formatQty = (qty: number): string => new Intl.NumberFormat('en-US').format(qty);

/** Stable mock invoice metadata so the preview doesn't churn on re-renders. */
const PREVIEW_INVOICE_NUMBER = 'INV-PREVIEW-0001';
const PREVIEW_ISSUE_DATE = 'Today';
const PREVIEW_DUE_DATE = 'In 30 days';

/**
 * Live preview of how the customer block on an invoice would look,
 * driven by the surrounding `BillingAddressCard` form via
 * `useWatchAll`. Must be rendered inside that form's `<Form.Root>` —
 * outside the form context `useWatchAll` returns an empty object and
 * the preview shows a permanent placeholder.
 *
 * Designed to stand in for an actual rendered invoice header: it
 * deliberately includes a "From"/"Bill To" two-column block, a
 * sample line-items table, and a totals row so the user sees the
 * relative size and prominence of their contact info on a real
 * document, not just a context-free echo of what they typed.
 */
export const InvoicePreviewCard = () => {
  const values =
    useWatchAll<InvoicePreviewValues>([
      'name',
      'businessName',
      'country',
      'line1',
      'line2',
      'city',
      'region',
      'postalCode',
      'taxIds',
    ]) ?? {};

  // Pre-compute the rendered address lines so the JSX stays simple. We
  // resolve the country code → label here too because the form stores
  // the raw ISO code (e.g. "GB") but invoices want the full name.
  const addressLines = useMemo(() => {
    const lines: string[] = [];
    if (values.line1) lines.push(values.line1);
    if (values.line2) lines.push(values.line2);
    const cityRegion = [values.city, values.region].filter(Boolean).join(', ');
    const cityRegionPostal = [cityRegion, values.postalCode].filter(Boolean).join(' ');
    if (cityRegionPostal) lines.push(cityRegionPostal);
    if (values.country) lines.push(COUNTRY_LABELS.get(values.country) ?? values.country);
    return lines;
  }, [values.line1, values.line2, values.city, values.region, values.postalCode, values.country]);

  // Drop the half-filled rows that `BillingAddressCard` lets the user
  // sit on temporarily — they show as empty pills in the preview
  // otherwise, which feels broken. `toObjectArray` un-stringifies the
  // Conform-serialized array so this stays an array even when the
  // adapter hands us the JSON-string round-trip form.
  const taxIdRows = useMemo(
    () =>
      toObjectArray<{ type?: string; value?: string }>(values.taxIds)
        .filter((row): row is { type: string; value: string } => Boolean(row?.type && row?.value))
        .map((row) => ({
          label: TAX_ID_LABELS.get(row.type) ?? row.type,
          value: row.value,
        })),
    [values.taxIds]
  );

  const hasBillTo =
    Boolean(values.businessName) ||
    Boolean(values.name) ||
    addressLines.length > 0 ||
    taxIdRows.length > 0;

  return (
    <Card className="bg-muted/30 relative gap-0 overflow-hidden rounded-xl py-0 shadow-none">
      {/* Diagonal "PREVIEW" watermark. Positioned absolutely above
          the white panel so it reads as if printed across the
          document; `pointer-events-none` keeps it out of the way of
          form interactions; `select-none` stops accidental text
          selection (since this isn't real content); low opacity +
          black keeps it subtle on the always-white inner panel.
          `whitespace-nowrap` + a single huge font size ensures the
          word stays on one line at any preview width — the `Card`'s
          `overflow-hidden` clips the corners. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 flex rotate-[-24deg] items-center justify-center text-7xl font-black tracking-[0.3em] text-black/6 uppercase select-none">
        Preview
      </span>
      <div
        className="flex flex-col gap-6 bg-white px-6 py-6"
        // See `LIGHT_TOKEN_OVERRIDES` — force the semantic shadcn
        // variables to their light-mode equivalents at this scope
        // only, so text/borders stay legible on the always-white
        // panel even when the surrounding portal is in dark mode.
        style={LIGHT_TOKEN_OVERRIDES}>
        {/* Top: brand + invoice meta. Both static so the preview
            reads as a "real" document rather than a context-free
            echo of the form. */}
        <div className="flex items-start justify-between gap-4">
          <span className="text-foreground text-xl font-semibold tracking-tight">Invoice</span>
          {/* The inner panel is intentionally `bg-white` regardless of
              theme — invoices are always white paper — so the navy
              brand wordmark stays legible on both light and dark
              modes without an `invert` filter. Source: the same
              `SITE_CONFIG.siteImage` asset the rest of the portal
              uses, so a brand refresh propagates here automatically. */}
          <img
            src={SITE_CONFIG.siteImage}
            alt={`${SELLER.legalName} logo`}
            // 5:1 SVG aspect ratio (742×148) → renders ~140×28 at
            // h-7. Keeps the wordmark readable without dominating
            // the header row.
            className="h-7 w-auto shrink-0"
          />
        </div>

        {/* From / Bill To. The Bill To column is the live half — every
            line here comes from the form via `useWatchAll`. The From
            block is intentionally minimal: only what Datum publishes
            today (legal entity, jurisdiction, contact email). We
            don't invent a street address — VAT-registered customers
            compare invoice previews against their bookkeeping and
            stale fake addresses would be worse than nothing. */}
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-2xs font-semibold tracking-[0.16em] uppercase">
              From
            </span>
            <div className="text-foreground text-[11px] leading-relaxed">
              <p className="font-medium">{SELLER.legalName}</p>
              <p className="text-muted-foreground pt-1">{SELLER.email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-2xs font-semibold tracking-[0.16em] uppercase">
              Bill to
            </span>
            {hasBillTo ? (
              <div className="text-foreground text-[11px] leading-relaxed">
                {values.businessName && <p className="font-medium">{values.businessName}</p>}
                {values.name && (
                  <p className={values.businessName ? 'text-muted-foreground' : 'font-medium'}>
                    {values.businessName ? `ATTN: ${values.name}` : values.name}
                  </p>
                )}
                {addressLines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                {taxIdRows.length > 0 && (
                  <div className="mt-2 flex flex-col gap-0.5">
                    {taxIdRows.map((row, i) => (
                      <p key={i} className="text-muted-foreground">
                        <span className="font-medium">{row.label}:</span> {row.value}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-[11px] italic">
                Fill in the form to see how your details will appear on invoices.
              </p>
            )}
          </div>
        </div>

        {/* Invoice meta. Static so the preview communicates "here's a
            full document"; the line items and totals below are
            illustrative rather than authoritative. */}
        <div className="border-border grid grid-cols-3 gap-4 border-t pt-4 text-[11px]">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-2xs font-semibold tracking-[0.16em] uppercase">
              Invoice #
            </span>
            <span className="text-foreground text-2xs">{PREVIEW_INVOICE_NUMBER}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-2xs font-semibold tracking-[0.16em] uppercase">
              Issued
            </span>
            <span className="text-foreground text-2xs">{PREVIEW_ISSUE_DATE}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-2xs font-semibold tracking-[0.16em] uppercase">
              Due
            </span>
            <span className="text-foreground text-2xs">{PREVIEW_DUE_DATE}</span>
          </div>
        </div>

        {/* Sample line items, grouped by section (Subscription vs
            Usage). Intentionally static — the goal is to anchor the
            contact block in something that reads like a real invoice
            rather than to model the billing engine. The grouping
            mirrors how Datum bills: a single recurring subscription
            line plus a list of metered usage items, each with its
            own subtotal before rolling up into the grand totals. */}
        <div className="flex flex-col gap-4">
          <div className="text-muted-foreground text-2xs grid grid-cols-[1fr_auto_auto] gap-4 font-semibold tracking-[0.16em] uppercase">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="w-20 text-right">Amount</span>
          </div>
          {SAMPLE_INVOICE_SECTIONS.map((section, sectionIdx) => (
            <div key={section.title} className="flex flex-col gap-2">
              <span className="text-foreground text-2xs font-semibold tracking-[0.16em] uppercase">
                {section.title}
              </span>
              <div className="border-border flex flex-col divide-y border-y">
                {section.items.map((item) => (
                  <div
                    key={item.description}
                    className="grid grid-cols-[1fr_auto_auto] items-start gap-4 py-2 text-[11px]">
                    <div className="flex flex-col">
                      <span className="text-foreground">{item.description}</span>
                      {item.meta && (
                        <span className="text-muted-foreground text-2xs">{item.meta}</span>
                      )}
                    </div>
                    <span className="text-muted-foreground text-right tabular-nums">
                      {formatQty(item.qty)}
                    </span>
                    <span className="text-foreground w-20 text-right tabular-nums">
                      {currency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 text-[11px]">
                <span />
                <span className="text-muted-foreground text-right">Subtotal</span>
                <span className="text-foreground w-20 text-right tabular-nums">
                  {currency(SECTION_SUBTOTALS[sectionIdx])}
                </span>
              </div>
            </div>
          ))}
          <div className="border-border flex flex-col gap-1 border-t pt-3 text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground tabular-nums">{currency(SAMPLE_SUBTOTAL)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="text-foreground tabular-nums">{currency(SAMPLE_TAX)}</span>
            </div>
            <div className="border-border mt-1 flex justify-between border-t pt-2 text-xs font-semibold">
              <span className="text-foreground">Total due</span>
              <span className="text-foreground tabular-nums">{currency(SAMPLE_TOTAL)}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
