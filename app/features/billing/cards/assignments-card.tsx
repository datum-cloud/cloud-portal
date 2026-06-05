import { DateTime } from '@/components/date-time';
import type { ProjectBillingBinding } from '@/features/billing/cards/linked-projects-card';
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
import { Building, FolderRoot } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

// Match the inset and header dividers used by `PastInvoicesCard` /
// `LinkedProjectsCard` so all the tables on the detail page line up.
const ROW_INSET =
  '[&_th:first-child]:pl-5 [&_th:last-child]:pr-5 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5';
const HEADER_DIVIDERS = '[&_th:not(:last-child)]:border-r [&_th]:border-border';

/**
 * "Where is this billing account being used" tree. Each row groups the
 * projects that fund themselves through this account by the org that
 * owns them. Built by the account-detail route loader by joining
 * `BillingAccountBinding` resources with their projects + the user's
 * org membership list.
 */
export interface BillingAccountAssignment {
  org: {
    /** Org id (`Organization.metadata.name`). */
    name: string;
    /** Best human label for the org. */
    displayName: string;
  };
  projects: ProjectBillingBinding[];
}

interface AssignmentsCardProps {
  assignments: BillingAccountAssignment[];
}

// Flattened shape consumed by the table — every project row carries the
// org it belongs to so the table itself can stay grouping-agnostic.
interface AssignmentRow {
  orgName: string;
  orgDisplayName: string;
  projectName: string;
  projectDisplayName: string;
  linkedAt: string;
}

/**
 * Cross-org "where is this billing account being used" view. Renders as a
 * single flat table with an Organization column so the visual treatment
 * matches the cross-org list page; we used to render a SHOUTY full-width
 * uppercase group header per org, which competed with the section title
 * above and felt heavier than the data warranted.
 *
 * The binding itself is owned by the *project* — clicking a project drops
 * the user into that project's billing settings so they can change or
 * remove the link from its own page. Deliberately no inline "unbind"
 * action here to avoid two write paths for the same state.
 */
export const AssignmentsCard = ({ assignments }: AssignmentsCardProps) => {
  // Project the `{ org, projects[] }` tree into a flat row list once per
  // render. Stable order: orgs in the order the loader returned them,
  // projects in the order they appear under each org.
  const rows = useMemo<AssignmentRow[]>(
    () =>
      assignments.flatMap((assignment) =>
        assignment.projects.map((binding) => ({
          orgName: assignment.org.name,
          orgDisplayName: assignment.org.displayName,
          projectName: binding.projectName,
          projectDisplayName: binding.projectDisplayName,
          linkedAt: binding.linkedAt,
        }))
      ),
    [assignments]
  );

  if (rows.length === 0) {
    return (
      <Card className="gap-0 rounded-xl py-0 shadow-none">
        <CardContent className="border-border bg-muted/30 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-5 py-10 text-center">
          <Icon icon={FolderRoot} className="text-muted-foreground size-5" />
          <p className="text-foreground text-sm font-medium">No assignments yet</p>
          <p className="text-muted-foreground max-w-md text-xs">
            Open a project&apos;s billing settings and pick this account to start funnelling its
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
              <TableHead className="text-foreground text-xs font-medium">Organization</TableHead>
              <TableHead className="text-foreground text-xs font-medium">Resource ID</TableHead>
              <TableHead className="text-foreground text-xs font-medium">Linked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.orgName}/${row.projectName}`} className="group">
                <TableCell className="text-sm">
                  <Link
                    to={getPathWithParams(paths.project.detail.settings.billing, {
                      projectId: row.projectName,
                    })}
                    className="text-foreground hover:text-primary inline-flex items-center gap-2 font-medium transition-colors">
                    <Icon icon={FolderRoot} className="text-icon-primary size-3.5" />
                    {row.projectDisplayName}
                  </Link>
                </TableCell>
                <TableCell className="text-sm">
                  <Link
                    to={getPathWithParams(paths.org.detail.billing.root, { orgId: row.orgName })}
                    className="text-foreground hover:text-primary inline-flex items-center gap-2 transition-colors">
                    <Icon icon={Building} className="text-icon-primary size-3.5" />
                    {row.orgDisplayName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{row.projectName}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  <DateTime date={row.linkedAt} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
