import type { Task } from '../types';
import { Tooltip } from '@datum-ui/components';
import { Badge } from '@datum-ui/components/badge';
import { Button } from '@datum-ui/components/button';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import { ListTodo } from 'lucide-react';
import { forwardRef, useEffect, useRef, useState } from 'react';

interface TaskQueueTriggerProps {
  tasks: Task[];
}

export const TaskQueueTrigger = forwardRef<HTMLButtonElement, TaskQueueTriggerProps>(
  function TaskQueueTrigger({ tasks, ...props }, ref) {
    const runningCount = tasks.filter((t) => t.status === 'running').length;
    const pendingCount = tasks.filter((t) => t.status === 'pending').length;
    const activeCount = runningCount + pendingCount;
    const hasRunning = runningCount > 0;
    const isAllComplete =
      tasks.length > 0 &&
      activeCount === 0 &&
      tasks.every(
        (t) => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
      );

    // Completion flash: detect transition to all-complete
    const [flash, setFlash] = useState(false);
    const prevAllComplete = useRef(false);

    useEffect(() => {
      if (isAllComplete && !prevAllComplete.current) {
        prevAllComplete.current = true;
        setFlash(true);
        const timer = setTimeout(() => setFlash(false), 5000);
        return () => clearTimeout(timer);
      }
      if (!isAllComplete) {
        prevAllComplete.current = false;
      }
    }, [isAllComplete]);

    // Reset flash when tasks are cleared
    useEffect(() => {
      if (tasks.length === 0) {
        setFlash(false);
        prevAllComplete.current = false;
      }
    }, [tasks.length]);

    return (
      <Tooltip message="Tasks">
        <Button
          ref={ref}
          type="quaternary"
          theme="borderless"
          size="small"
          className={cn(
            'hover:bg-sidebar-accent relative h-7 w-7 rounded-lg p-0 transition-colors duration-300',
            flash && 'bg-primary/10'
          )}
          aria-label={`Tasks${activeCount > 0 ? ` (${activeCount} active)` : ''}`}
          {...props}>
          <Icon
            icon={ListTodo}
            className={cn('text-icon-header size-4', flash ? 'text-primary' : 'text-icon-header')}
          />

          {/* Spinning ring when tasks are running */}
          {hasRunning && (
            <span className="border-t-primary pointer-events-none absolute inset-[-3px] animate-spin rounded-full border-2 border-transparent" />
          )}

          {/* Active task count badge */}
          {activeCount > 0 && (
            <Badge
              type="tertiary"
              theme="solid"
              className="bg-primary text-primary-foreground text-2xs absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full p-0 leading-0">
              {activeCount > 99 ? '99+' : activeCount}
            </Badge>
          )}
        </Button>
      </Tooltip>
    );
  }
);
