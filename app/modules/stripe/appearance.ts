import type { Appearance, CustomFontSource } from '@stripe/stripe-js';

/**
 * Stripe Elements appearance config that mirrors the datum-ui form input
 * styling.
 *
 * Strategy: read CSS custom properties from `:root` at call time and hand
 * Stripe a resolved snapshot. The `.dark` class on `<html>` already swaps
 * the variables, so light/dark falls out for free — we just rebuild the
 * appearance whenever the resolved theme flips (the calling component
 * keys `<Elements>` on `resolvedTheme` for exactly this reason).
 *
 * Stripe's iframes can't read the parent's CSS variables (cross-origin),
 * and the design tokens are defined in `oklch(…)` which some Stripe
 * versions reject as an invalid colour. The Canvas 2D API normalises
 * any valid CSS colour string back to `#rrggbb` or `rgba(…)`, so we use
 * it as a tiny built-in colour converter instead of pulling in `culori`.
 *
 * Token mapping (see `node_modules/@datum-cloud/datum-ui/dist/styles/`):
 *   surface          ← --popover  (the datum-ui `Dialog.Body` renders
 *                       `bg-white` in light mode and `dark:bg-muted` in
 *                       dark — both of which match `--popover`. Not
 *                       `--background`; that's the page surface, two
 *                       shades darker than the dialog in dark mode.)
 *   colorText        ← --input-foreground
 *   colorPrimary     ← --primary
 *   colorDanger      ← --destructive
 *   .Input bg        ← bg-input-background/50, flattened against the
 *                       surface (since Stripe iframes can't alpha-blend
 *                       against the parent page).
 *   .Input border    ← --input-border / --input-focus-border on focus
 *   .Input shadow    ← --input-focus-shadow on focus
 *   .Label           ← --foreground at text-xs font-semibold (80% alpha)
 *   borderRadius     ← --radius-lg (0.5625rem ≈ 9px)
 *   fontFamily       ← --font-sans (we keep our own fallback chain)
 */

// ─── CSS variable readers ────────────────────────────────────────────

/**
 * Read a CSS custom property from `:root`. Returns an empty string when
 * called server-side or when the variable isn't defined (e.g. during the
 * initial render before stylesheets are wired up).
 */
function readVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Convert any CSS colour string the browser might hand us into `#rrggbb`.
 *
 * The fast path matches `rgb(R, G, B)` / `rgba(R, G, B, A)` directly with
 * a regex — Chrome serialises `getComputedStyle(probe).backgroundColor`
 * as `rgb(…)` for any sRGB-compatible input (even when the source was
 * `oklch(…)` or `color(srgb …)`), so this covers ~all real cases without
 * the silent-failure risk of `canvas.fillStyle`.
 *
 * The slow path leans on Canvas 2D as a built-in colour parser for
 * anything else (e.g. explicit `color(display-p3 …)`), again returning
 * `#rrggbb` for opaque colours.
 *
 * Returns the original string when called server-side or when parsing
 * fails entirely.
 */
function toSRGB(color: string): string {
  if (!color || typeof document === 'undefined') return color;
  const rgbMatch = color.match(/^rgba?\(\s*([\d.]+)[\s,/]+([\d.]+)[\s,/]+([\d.]+)/);
  if (rgbMatch) {
    const r = Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[1]))));
    const g = Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[2]))));
    const b = Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[3]))));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return color;
  // Reset to a sentinel first so an invalid `color` doesn't silently
  // leave the canvas with whatever the previous fillStyle resolved to —
  // canvas just keeps the last valid value on parse failure.
  ctx.fillStyle = '#000';
  ctx.fillStyle = color;
  return typeof ctx.fillStyle === 'string' ? ctx.fillStyle : color;
}

/**
 * Read a CSS custom property as a fully-resolved sRGB colour string.
 *
 * Why a DOM probe instead of just `toSRGB(readVar(name))`?
 *
 * `getComputedStyle().getPropertyValue('--popover')` is allowed by the
 * spec to return *either* the specified value (`var(--app-dark-utility-1)`)
 * *or* the resolved value (`oklch(0.308 0.038 253.5)`). Browsers don't
 * agree, and a `var()` reference can't be parsed by canvas — `fillStyle`
 * silently keeps its previous value and we'd hand Stripe `#000000`.
 *
 * Setting the variable as a real `background-color` on a hidden element
 * forces the browser to resolve it through the full var/`oklch` chain
 * before we read it back, so we always get a concrete `rgb(…)` string.
 *
 * Falls back to the table when called server-side or when the lookup
 * doesn't produce a valid colour.
 */
function readColor(name: string, fallback: string): string {
  return readResolvedBackground(`var(${name})`, fallback);
}

/**
 * Internal helper for `readColor` and `readMixedColor` — applies a CSS
 * `background-color` value to a hidden probe and returns the browser's
 * resolved `rgb(…)` string converted to `#rrggbb`. Putting the value
 * through a real CSS property is what makes `var()` and `color-mix()`
 * resolve before we read it back.
 */
function readResolvedBackground(cssValue: string, fallback: string): string {
  if (typeof document === 'undefined' || !document.body) return fallback;
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.left = '-9999px';
  probe.style.width = '1px';
  probe.style.height = '1px';
  probe.style.backgroundColor = cssValue;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).backgroundColor;
  document.body.removeChild(probe);
  if (!resolved || resolved === 'rgba(0, 0, 0, 0)' || resolved === 'transparent') {
    return fallback;
  }
  return toSRGB(resolved) || fallback;
}

/**
 * Read two CSS custom properties and return the result of mixing them
 * in sRGB at the given percentage of the first colour. Delegates the
 * actual maths to the browser via `color-mix(in srgb, …)` so we don't
 * have to round-trip through canvas parsing for either input — this
 * is the value Tailwind paints for `bg-input-background/50` (modulo
 * compositing space) and any drift from doing the mix ourselves shows
 * up as the Stripe input not matching the live datum-ui input.
 */
function readMixedColor(
  fgName: string,
  bgName: string,
  fgPercent: number,
  fallback: string
): string {
  return readResolvedBackground(
    `color-mix(in srgb, var(${fgName}) ${fgPercent}%, var(${bgName}))`,
    fallback
  );
}

/**
 * Collect the `--font-sans` (Alliance No1) `@font-face` rules from the
 * page's own stylesheets and hand them to Stripe's `fonts` option so the
 * cross-origin Elements iframe renders labels/inputs in the same family
 * as datum-ui. The `src` URLs are resolved to absolute against the owning
 * stylesheet — relative `url(./fonts/…)` would otherwise resolve against
 * Stripe's origin inside the iframe and 404.
 */
export function getStripeFontFaces(): CustomFontSource[] {
  if (typeof document === 'undefined') return [];

  const faces: CustomFontSource[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      // Cross-origin stylesheet — can't read its rules.
      continue;
    }

    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;

      const family = rule.style.fontFamily?.replace(/^["']|["']$/g, '');
      if (!family || !family.includes('Alliance')) continue;

      const rawSrc = rule.style.getPropertyValue('src');
      const urlMatch = rawSrc.match(/url\(\s*["']?([^"')]+)["']?\s*\)/);
      if (!urlMatch) continue;

      let url = urlMatch[1];
      try {
        url = new URL(url, sheet.href ?? document.baseURI).href;
      } catch {
        continue;
      }

      const styleValue = rule.style.fontStyle;
      const style =
        styleValue === 'italic' || styleValue === 'oblique' ? styleValue : ('normal' as const);

      faces.push({
        family,
        src: `url(${url})`,
        weight: rule.style.fontWeight || '400',
        style,
      });
    }
  }

  return faces;
}

/**
 * Parse a `#rrggbb` string into an `[r, g, b]` tuple, or `null` if the
 * string isn't a 6-char hex. Used by the colour mixer below to flatten
 * Tailwind's alpha utilities (the live datum-ui Input uses
 * `bg-input-background/50` — a translucent layer over the surface — and
 * Stripe iframes can't composite against the parent page).
 */
function parseHex(color: string): [number, number, number] | null {
  if (!color.startsWith('#') || color.length !== 7) return null;
  return [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
  ];
}

/**
 * Composite `fg` over `bg` at the given alpha and return the resulting
 * opaque `#rrggbb`. Both inputs must already be sRGB hex (run through
 * `toSRGB()` first). If parsing fails — e.g. on the server, or when the
 * canvas returns `rgba(…)` for a non-opaque value — we fall back to the
 * foreground colour, which matches Stripe's behaviour for translucent
 * inputs (it just paints the raw colour).
 */
function blend(fg: string, bg: string, alpha: number): string {
  const f = parseHex(fg);
  const b = parseHex(bg);
  if (!f || !b) return fg;
  const mix = (a: number, b: number) => Math.round(a * alpha + b * (1 - alpha));
  const r = mix(f[0], b[0]).toString(16).padStart(2, '0');
  const g = mix(f[1], b[1]).toString(16).padStart(2, '0');
  const bl = mix(f[2], b[2]).toString(16).padStart(2, '0');
  return `#${r}${g}${bl}`;
}

// ─── Fallbacks ───────────────────────────────────────────────────────

/**
 * Resolved snapshots of the alpha-theme tokens. Used only when CSS
 * variables aren't readable yet — Stripe is client-only so this is
 * effectively a pre-hydration safety net. Pre-flattened from
 * `node_modules/@datum-cloud/datum-ui/dist/styles/themes/alpha.css`.
 */
const LIGHT_FALLBACK = {
  surface: '#ffffff', // --popover → white (matches Dialog.Body `bg-white`)
  // Raw `--input-background` (--glacier-mist-700). The 50% blend
  // against `surface` happens at render time so SSR and runtime go
  // through the same code path.
  inputBackground: '#fcfdf7',
  foreground: '#0c1d31', // --input-foreground → --midnight-fjord
  // `--foreground` at 80% flattened over `--popover` (white) — the opaque
  // equivalent of datum-ui's `text-foreground/80` label colour.
  labelColor: '#3d4a5a',
  border: '#e6ede0', // --input-border → --app-dark-utility-5
  placeholder: '#aab4d2', // --input-placeholder → --app-dark-utility-4
  focusBorder: '#707ca7', // --input-focus-border → --app-dark-utility-3
  focusShadow: '0px 0px 0px 3px rgba(12, 29, 49, 0.08)',
  danger: '#e15853', // --destructive → --alert-red-light
  mutedForeground: '#707ca7', // --muted-foreground
  primary: '#707ca7',
} as const;

const DARK_FALLBACK = {
  surface: '#2c3454', // --popover dark → --app-dark-utility-1 (= --muted)
  // Raw `--input-background` (--midnight-fjord). Blended at render time
  // to (12+44)/2, (29+52)/2, (49+84)/2 ≈ #1c2942 against the surface.
  inputBackground: '#0c1d31',
  foreground: '#fcfdf7',
  // `--foreground` at 80% flattened over the dark `--popover` surface.
  labelColor: '#d2d5d6',
  border: '#394367', // --app-dark-utility-2
  placeholder: '#707ca7', // --app-dark-utility-3
  focusBorder: '#e6f59e', // --aurora-moss
  focusShadow: '0px 0px 0px 3px rgba(236, 249, 192, 0.08)',
  danger: '#e15853',
  mutedForeground: '#aab4d2',
  primary: '#e6f59e',
} as const;

/**
 * Font stack copied from `--font-sans` in the alpha theme. Stripe expects
 * a full CSS font-family string. The fallback chain matters: if Alliance
 * No1 isn't available inside the Stripe iframe (it isn't preloaded
 * there), we want the system sans-serif rather than Stripe's default.
 */
const FONT_FAMILY =
  '"Alliance No1", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// ─── Builder ─────────────────────────────────────────────────────────

/**
 * Build a Stripe Elements `Appearance` config from the live datum-ui
 * design tokens. Pass the active theme so the right fallback table is
 * used during SSR / first paint; runtime values come from
 * `getComputedStyle(document.documentElement)` and reflect whatever the
 * `.dark` class on `<html>` currently resolves to.
 */
export const buildStripeAppearance = (theme: 'light' | 'dark'): Appearance => {
  const f = theme === 'dark' ? DARK_FALLBACK : LIGHT_FALLBACK;

  // The datum-ui `Dialog.Body` we render inside resolves to `bg-white`
  // in light mode and `dark:bg-muted` in dark — both of which line up
  // with `--popover` (light: hsl(0 0% 100%); dark: --app-dark-utility-1
  // = --muted). `--background` is the *page* surface and is two shades
  // darker in dark mode, so reading it leaves the Stripe inputs visibly
  // darker than the dialog body.
  const surface = readColor('--popover', f.surface);
  const foreground = readColor('--input-foreground', f.foreground);
  const border = readColor('--input-border', f.border);
  const placeholder = readColor('--input-placeholder', f.placeholder);
  const focusBorder = readColor('--input-focus-border', f.focusBorder);
  const danger = readColor('--destructive', f.danger);
  const mutedForeground = readColor('--muted-foreground', f.mutedForeground);
  const primary = readColor('--primary', f.primary);
  // datum-ui's `Input` uses `bg-input-background/50` — a translucent
  // layer over whatever sits beneath. Stripe Elements render inside
  // their own iframe and can't composite against the parent page, so
  // we ask the browser to flatten the 50% alpha against the dialog
  // surface via `color-mix(in srgb, …)` and hand Stripe the resulting
  // opaque colour. Doing the mix browser-side avoids any drift from
  // parsing modern colour formats (oklch, color(srgb …)) ourselves.
  const inputBackground = readMixedColor(
    '--input-background',
    '--popover',
    50,
    blend(readColor('--input-background', f.inputBackground), surface, 0.5)
  );

  // `--input-focus-shadow` is a multi-value box-shadow declaration, not a
  // colour, so we hand it over verbatim without sRGB normalisation.
  const focusShadow = readVar('--input-focus-shadow') || f.focusShadow;
  const borderRadius = readVar('--radius');
  // datum-ui `FieldLabel` uses `text-foreground/80`. Stripe Elements run
  // in a cross-origin iframe and don't honour a translucent label colour
  // the way the page composites `/80` against its surface — they paint the
  // colour at full strength, so the labels read too dark (light) / too
  // bright (dark) next to ours. Flatten `--foreground` at 80% over the
  // form surface (`--popover`) and hand Stripe an opaque colour. This is
  // still var-driven and rebuilt on theme toggle, so dark mode works.
  const labelColor = readMixedColor('--foreground', '--popover', 80, f.labelColor);

  // Spacing variables that the installed `@stripe/stripe-js` types don't
  // yet list but the runtime appearance API supports. Spread (not added as
  // literal props) so TS's excess-property check doesn't reject them.
  //   labelSpacing      → label↔input gap, matches `space-y-2` (8px)
  //   gridRowSpacing     → field↔field gap and terms-text top margin (16px)
  //   gridColumnSpacing  → Expiry↔CVC column gap
  const spacingVariables: Record<string, string> = {
    labelSpacing: '8px',
    gridRowSpacing: '16px',
    gridColumnSpacing: '16px',
  };

  return {
    // 'flat' is the most neutral built-in theme — no Stripe-branded
    // gradients, shadows or accent backgrounds. We use it for both light
    // and dark and lean entirely on `variables` + `rules` to drive
    // colours from datum-ui's tokens. (The 'stripe'/'night' defaults
    // each apply their own opinionated surface treatment that overrides
    // `.Block` / `.AccordionItem` styling.)
    theme: 'flat',
    variables: {
      colorPrimary: primary,
      // `colorBackground` is the base Stripe darkens/lightens to derive
      // all wrapper colours (the `.Block`, `.AccordionItem`, and Link
      // CTA tile). Anchor it to the dialog surface so derived colours
      // never read as a separate panel.
      colorBackground: surface,
      colorText: foreground,
      colorTextPlaceholder: placeholder,
      colorTextSecondary: mutedForeground,
      colorDanger: danger,
      fontFamily: FONT_FAMILY,
      fontSizeBase: '0.875rem', // text-sm
      fontWeightNormal: '400',
      fontWeightMedium: '500',
      spacingUnit: '4px',
      borderRadius: '9px', // --radius-lg ≈ 0.5625rem
      focusBoxShadow: focusShadow,
      focusOutline: 'none',
      ...spacingVariables,
    },
    rules: {
      // Base text input. The shadcn primitive is
      //   `h-10 px-3 py-2 rounded-lg border border-input-border bg-input-background/50`
      // Math for the 40px target: 1px (top border) + 7px (top padding) +
      // 24px (line-height 1.5 × 16px) + 7px (bottom padding) + 1px
      // (bottom border) = 40px. `backgroundColor` is the pre-blended
      // 50% mix of `--input-background` over the dialog surface — Stripe
      // iframes can't alpha-composite against the parent, so we hand
      // them the already-flat colour.
      '.Input': {
        backgroundColor: inputBackground,
        border: `1px solid ${border}`,
        borderRadius: borderRadius,
        padding: '7px 12px',
        lineHeight: '24px',
        fontSize: '0.875rem',
        color: foreground,
        boxShadow: 'none',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
      },
      '.Input:focus': {
        borderColor: border,
        boxShadow: focusShadow,
        outline: `1px solid ${focusBorder}`,
      },
      '.Input:hover': {
        borderColor: border,
      },
      '.Input--invalid': {
        borderColor: danger,
        boxShadow: 'none',
      },
      '.Input--invalid:focus': {
        borderColor: danger,
        boxShadow: `0px 0px 0px 3px ${danger}1A`, // 1A = ~10% alpha
      },
      '.Input:disabled': {
        opacity: '0.5',
      },
      // Stripe wraps the card method (and the Link CTA) in `.Block` and
      // `.Accordion*` containers. By default those carry a Stripe accent
      // colour. Flattening them to the dialog surface gets us a plain
      // stack of fields with no boxed wrapper.
      '.Block': {
        backgroundColor: surface,
        border: 'none',
        boxShadow: 'none',
      },
      '.AccordionItem': {
        backgroundColor: surface,
        border: 'none',
        boxShadow: 'none',
        padding: '0',
      },
      '.AccordionItem--selected': {
        backgroundColor: surface,
      },
      // Field labels above the input — mirror datum-ui `FieldLabel`:
      //   `text-foreground/80 gap-0 text-xs font-semibold leading-none`
      // wrapped in a `Form.Field` with `space-y-2` (8px) to its input.
      // `text-xs` = 12px and `leading-none` = line-height 1; both as
      // absolute px so they don't scale with Stripe's iframe root size.
      // Colour is the flattened opaque form of `--foreground/80`.
      '.Label': {
        color: labelColor,
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        lineHeight: '12px',
        fontWeight: '600',
      },
      // Inline validation message under a field.
      '.Error': {
        color: danger,
        fontSize: '0.75rem',
        marginTop: '4px',
      },
      // Tabs are only visible when multiple payment methods are
      // configured — kept consistent so a future expansion stays
      // on-brand.
      '.Tab': {
        backgroundColor: surface,
        border: `1px solid ${border}`,
        borderRadius: '9px',
        color: foreground,
      },
      '.Tab--selected': {
        borderColor: focusBorder,
        color: foreground,
      },
      '.Tab:hover': {
        borderColor: focusBorder,
      },
    },
  };
};
