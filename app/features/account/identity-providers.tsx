// Presentation shared by the two cards that render identity rows: the General
// tab's AccountIdentitySettingsCard and the Security tab's Sign-in Methods card.
// Both render the same identities by design (see the spec's "Duplication with
// identity-card.tsx") — this module is what stops their content from drifting.
// Labels live in sign-in-methods.ts so the tested row builder stays React-free.
import { GitHubLineIcon } from '@/components/icon/github-line';
import GoogleIcon from '@/components/icon/google';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import {
  CircleAlertIcon,
  KeyRoundIcon,
  LockOpenIcon,
  MailIcon,
  type LucideIcon,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

type SvgIcon = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Brand marks that ship as bare SVG components.
 *
 * `github` uses the OUTLINE mark. That changed the General tab's appearance,
 * which is worth calling out in the PR — but it is the direction of least
 * surprise: the outline variant is what every other identity surface uses
 * (onboarding's account-identity-summary, project home, export policies),
 * while the filled variant had no other caller.
 */
const BRAND_ICONS: Record<string, SvgIcon> = {
  google: GoogleIcon,
  github: GitHubLineIcon,
};

/** Everything else renders through datum-ui's <Icon> wrapper. */
const LUCIDE_ICONS: Record<string, LucideIcon> = {
  email: MailIcon,
  passkeys: KeyRoundIcon,
  totp: LockOpenIcon,
  recoveryCodes: KeyRoundIcon,
};

interface ProviderIconProps {
  providerKey: string;
  /**
   * The 2FA card's accent treatment (larger, primary-tinted). It lives here
   * rather than inlined at that call site so both cards resolve their marks
   * from this one module — which is the whole point of the module.
   */
  emphasis?: boolean;
}

/** Icon for a provider row. Unknown providers fall back to the mail mark. */
export const ProviderIcon = ({ providerKey, emphasis = false }: ProviderIconProps) => {
  const Brand = BRAND_ICONS[providerKey];
  if (Brand) {
    return <Brand className={emphasis ? 'size-4' : 'size-3.5'} />;
  }

  return (
    <Icon
      icon={LUCIDE_ICONS[providerKey] ?? MailIcon}
      className={emphasis ? 'text-primary size-4' : 'size-3.5'}
    />
  );
};

/**
 * GitHub email addresses are owned by GitHub, not us — this explains the
 * log-out/change/log-back-in dance. Rendered beside GitHub identity rows only.
 */
export const GithubEmailTooltip = () => (
  <Tooltip
    message={
      <div className="flex flex-col gap-3.5 p-7">
        <h4 className="text-foreground text-sm font-semibold">
          Updating email addresses for GitHub identities
        </h4>
        <p className="text-foreground/80 text-xs text-wrap">
          Email addresses for GitHub identities should be updated through GitHub
        </p>
        <ul className="text-foreground/80 list-outside list-decimal space-y-3.5 pl-4 text-xs text-wrap">
          <li>Log out of Datum</li>
          <li>Change your Primary Email in GitHub (your primary email)</li>
          <li>Log out of GitHub</li>
          <li>Log back into GitHub (with the new, desired email set as primary)</li>
          <li>Log back into Datum</li>
        </ul>
      </div>
    }
    contentClassName="bg-card rounded-xl shadow-tooltip text-foreground max-w-[380px] border p-0"
    arrowClassName="fill-card">
    <div className="pointer flex cursor-pointer items-center gap-2.5">
      <Icon icon={CircleAlertIcon} size={12} className="text-primary" />
      <span className="text-primary text-xs underline">How to update your GitHub email</span>
    </div>
  </Tooltip>
);
