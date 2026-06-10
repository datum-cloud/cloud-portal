import { DateTime } from '@/components/date-time';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { cn } from '@datum-cloud/datum-ui/utils';
import { FolderRoot } from 'lucide-react';
import { Link } from 'react-router';

// Match the inset and header dividers used by `PastInvoicesCard` so all of
// the tables on the billing detail page line up visually.
const ROW_INSET =
  '[&_th:first-child]:pl-5 [&_th:last-child]:pr-5 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5';
const HEADER_DIVIDERS = '[&_th:not(:last-child)]:border-r [&_th]:border-border';

/**
 * Flattened binding shape the card renders. Built by route loaders by
 * joining `BillingAccountBinding` resources with project metadata
 * (display name etc.) — the card itself stays presentation-only and
 * doesn't reach into either API directly.
 */
export interface ProjectBillingBinding {
  /** `Project.metadata.name` — also the project URL slug. */
  projectName: string;
  /** Best human label for the project (annotation `kubernetes.io/description` → metadata.name). */
  projectDisplayName: string;
  /** Owning `BillingAccount.metadata.name`. */
  billingAccountName: string;
  /** Org id this binding (and its project) lives under. */
  orgName: string;
  /** `BillingAccountBinding.status.billingResponsibility.establishedAt`, or the resource creation time. */
  linkedAt: string;
}

interface LinkedProjectsCardProps {
  bindings: ProjectBillingBinding[];
}

/**
 * Read-only listing of projects currently billed against the account
 * shown on this page. The binding is owned by the project — clicking a
 * row drops the user into that project so they can change or remove the
 * link from its own settings page. We deliberately don't expose an
 * "unlink" action here to avoid two write paths for the same state.
 */
export const LinkedProjectsCard = ({ bindings }: LinkedProjectsCardProps) => {
  if (bindings.length === 0) {
    return (
      <Card className="gap-0 rounded-xl py-0 shadow-none">
        <CardContent className="border-border bg-muted/30 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-5 py-10 text-center">
          <Icon icon={FolderRoot} className="text-muted-foreground size-5" />
          <p className="text-foreground text-sm font-medium">No projects linked yet</p>
          <p className="text-muted-foreground max-w-md text-xs">
            Open a project&apos;s settings and pick this billing account to start funnelling its
            usage and invoices here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden rounded-xl py-0 shadow-none">
      <CardContent className="p-0">
        <Table className={cn(ROW_INSET, HEADER_DIVIDERS)}>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="text-foreground text-xs font-medium">Project</TableHead>
              <TableHead className="text-foreground text-xs font-medium">Resource ID</TableHead>
              <TableHead className="text-foreground text-xs font-medium">Linked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bindings.map((binding) => (
              <TableRow key={binding.projectName} className="group">
                <TableCell className="text-sm">
                  <Link
                    to={getPathWithParams(paths.project.detail.home, {
                      projectId: binding.projectName,
                    })}
                    className="text-foreground hover:text-primary inline-flex items-center gap-2 font-medium transition-colors">
                    <Icon icon={FolderRoot} className="text-icon-primary size-3.5" />
                    {binding.projectDisplayName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {binding.projectName}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  <DateTime date={binding.linkedAt} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
