import { useCreateTicket, useMarkTicketRead } from '@/resources/support';
import { MarkdownEditor } from '@/components/markdown-editor';
import { useApp } from '@/providers/app.provider';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { toast } from '@datum-cloud/datum-ui/toast';
import { MetaFunction, useNavigate, useParams } from 'react-router';
import { useState } from 'react';

export const handle = {
  breadcrumb: () => <span>New Ticket</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('New Support Ticket'));

export default function NewTicketPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user } = useApp();

  const createTicket = useCreateTicket(orgId ?? '');
  const markRead = useMarkTicketRead(orgId ?? '');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [submitting, setSubmitting] = useState(false);

  const reporterRef = {
    name: user?.sub ?? user?.email ?? 'unknown',
    displayName: user?.fullName ?? ([user?.givenName, user?.familyName].filter(Boolean).join(' ') || undefined),
    email: user?.email,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await createTicket.mutateAsync({
        input: { title: title.trim(), description: description.trim(), priority },
        reporterRef,
      });
      const principalId = user?.sub ?? user?.email;
      if (principalId) markRead.mutate({ ticketName: ticket.name, principalId });
      toast.success('Ticket created', { description: ticket.title });
      navigate(
        getPathWithParams(paths.org.detail.support.detail, {
          orgId: orgId ?? '',
          ticketName: ticket.name,
        })
      );
    } catch {
      toast.error('Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-xl font-semibold">Open a Support Ticket</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Briefly describe your issue"
            required
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <MarkdownEditor
            value={description}
            onChange={setDescription}
            placeholder="Describe the problem in detail..."
            rows={6}
          />
        </div>
        <div>
          <label htmlFor="priority" className="block text-sm font-medium mb-1">
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit ticket'}
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(getPathWithParams(paths.org.detail.support.root, { orgId: orgId ?? '' }))
            }
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
