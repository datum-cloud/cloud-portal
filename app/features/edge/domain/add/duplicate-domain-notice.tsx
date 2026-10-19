import { DOMAIN_VERIFICATION_STATUS, type SiblingDomainMatch } from '@/resources/domains';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { TriangleAlertIcon } from 'lucide-react';

export interface DuplicateDomainNoticeProps {
  domainName: string;
  matches: SiblingDomainMatch[];
  onOpenExisting: (match: SiblingDomainMatch) => void;
  onAddAnyway: () => void;
  onCancel: () => void;
  /** True while the "add anyway" create is in flight: disables every action. */
  isAdding?: boolean;
}

const REVERIFY_NOTE = "If you add it here, you'll need to verify it again.";

const statusLabel = (match: SiblingDomainMatch) =>
  DOMAIN_VERIFICATION_STATUS[match.verificationStatus].label;

interface InlineLinkProps {
  children: string;
  disabled: boolean;
  ariaLabel?: string;
  onClick: () => void;
}

// A button that reads as link text inside the alert, since it calls back rather than navigating.
const InlineLink = ({ children, disabled, ariaLabel, onClick }: InlineLinkProps) => (
  <button
    type="button"
    className="cursor-pointer underline disabled:cursor-not-allowed disabled:opacity-50"
    disabled={disabled}
    aria-label={ariaLabel}
    data-e2e="add-domains-open-existing"
    onClick={onClick}>
    {children}
  </button>
);

/** Warns that a domain already exists in other projects and offers open, add-anyway and cancel. */
export function DuplicateDomainNotice({
  domainName,
  matches,
  onOpenExisting,
  onAddAnyway,
  onCancel,
  isAdding = false,
}: DuplicateDomainNoticeProps) {
  if (matches.length === 0) return null;

  const [first] = matches;
  const isSingle = matches.length === 1;

  return (
    <Alert
      variant="warning"
      role="status"
      aria-live="polite"
      data-e2e="add-domains-duplicate-notice">
      <Icon icon={TriangleAlertIcon} className="size-3.5" />
      <AlertTitle className="text-xs font-medium">
        {isSingle
          ? `${domainName} is already in ${first.projectDisplayName}`
          : `${domainName} is already in ${matches.length} other projects`}
      </AlertTitle>
      <AlertDescription className="text-xs">
        {isSingle ? (
          <p>
            It&apos;s {statusLabel(first).toLowerCase()} there. {REVERIFY_NOTE}{' '}
            <InlineLink disabled={isAdding} onClick={() => onOpenExisting(first)}>
              {`Open in ${first.projectDisplayName}`}
            </InlineLink>
          </p>
        ) : (
          <>
            <p>{REVERIFY_NOTE}</p>
            <ul className="mt-1 space-y-0.5">
              {matches.map((match) => (
                <li key={`${match.projectId}/${match.domainId}`}>
                  {match.projectDisplayName} ({statusLabel(match)}) ·{' '}
                  <InlineLink
                    disabled={isAdding}
                    ariaLabel={`Open in ${match.projectDisplayName}`}
                    onClick={() => onOpenExisting(match)}>
                    Open
                  </InlineLink>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-3 flex items-center gap-2">
          <Button
            htmlType="button"
            type="secondary"
            size="xs"
            loading={isAdding}
            data-e2e="add-domains-add-anyway"
            onClick={onAddAnyway}>
            Add here anyway
          </Button>
          <Button
            htmlType="button"
            type="quaternary"
            theme="outline"
            size="xs"
            disabled={isAdding}
            data-e2e="add-domains-cancel"
            onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
