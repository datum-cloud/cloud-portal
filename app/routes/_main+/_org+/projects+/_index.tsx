import { PlusIcon, CircleArrowOutUpRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Link } from 'react-router'
import { routes } from '@/constants/routes'
export default function OrgProjects() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-screen-lg flex-col items-center gap-4">
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col justify-start gap-2">
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Use projects to organize resources deployed to Datum Cloud
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Link to={routes.projects.new}>
              <Button>
                <PlusIcon className="h-4 w-4" />
                New Project
              </Button>
            </Link>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Creation Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>My Project</TableCell>
              <TableCell>my-project-123</TableCell>
              <TableCell>January 15th, 2025</TableCell>
              <TableCell className="flex justify-end">
                <Link to={routes.projects.detail('my-project-123')}>
                  <Button variant="secondary" size="sm">
                    <CircleArrowOutUpRightIcon className="size-4" />
                    Open Project
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>My Project</TableCell>
              <TableCell>my-project-123</TableCell>
              <TableCell>January 15th, 2025</TableCell>
              <TableCell className="flex justify-end">
                <Link to={routes.projects.detail('my-project-123')}>
                  <Button variant="secondary" size="sm">
                    <CircleArrowOutUpRightIcon className="size-4" />
                    Open Project
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
