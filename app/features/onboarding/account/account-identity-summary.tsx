import { GitHubLineIcon } from '@/components/icon/github-line';
import GoogleIcon from '@/components/icon/google';
import type { LastLoginProviderValue } from '@/resources/users';
import { getInitials } from '@/utils/helpers/text.helper';
import { Avatar, AvatarFallback, AvatarImage } from '@datum-cloud/datum-ui/avatar';

export interface AccountIdentitySummaryProps {
  fullName: string;
  email: string;
  avatarUrl?: string;
  lastLoginProvider?: LastLoginProviderValue;
}

const ProviderBadge = ({ provider }: { provider?: LastLoginProviderValue }) => {
  if (provider === 'google') {
    return <GoogleIcon className="size-3" aria-hidden />;
  }
  if (provider === 'github') {
    return <GitHubLineIcon className="size-3" aria-hidden />;
  }
  return null;
};

export const AccountIdentitySummary = ({
  fullName,
  email,
  avatarUrl,
  lastLoginProvider,
}: AccountIdentitySummaryProps) => (
  <div className="border-border bg-muted/50 flex w-full items-center gap-4 rounded-md border px-3 py-2">
    <div className="relative shrink-0">
      <Avatar className="size-9 rounded-lg">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
          {getInitials(fullName || email)}
        </AvatarFallback>
      </Avatar>
      {lastLoginProvider ? (
        <span className="bg-card absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full p-0.5 shadow-sm">
          <ProviderBadge provider={lastLoginProvider} />
        </span>
      ) : null}
    </div>
    <div className="flex min-w-0 flex-1 flex-col gap-1 text-left">
      <p className="text-foreground truncate text-[13px] leading-[18px] font-medium">{fullName}</p>
      <p className="text-foreground truncate text-xs leading-4 opacity-60">{email}</p>
    </div>
  </div>
);
