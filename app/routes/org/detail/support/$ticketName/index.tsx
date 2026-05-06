import {
  useTicket,
  useTickets,
  useMessages,
  useCreateMessage,
  useUpdateMessage,
  useMarkTicketRead,
  useUpdateTicketLastActivity,
} from '@/resources/support';
import { useApp } from '@/providers/app.provider';
import { MarkdownBody } from '@/components/markdown-body';
import { MarkdownEditor } from '@/components/markdown-editor';
import { DateTime } from '@/components/date-time';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { cn } from '@datum-cloud/datum-ui/utils';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, MetaFunction, useParams } from 'react-router';
import { useEffect, useState } from 'react';

type BadgeType = 'primary' | 'secondary' | 'tertiary' | 'warning' | 'success' | 'danger' | 'muted';
type BadgeTheme = 'solid' | 'outline' | 'light';

const STATUS_BADGE: Record<string, { label: string; type: BadgeType; theme: BadgeTheme }> = {
  open: { label: 'Open', type: 'primary', theme: 'light' },
  'in-progress': { label: 'In Progress', type: 'secondary', theme: 'light' },
  'waiting-on-customer': { label: 'Waiting on Us', type: 'warning', theme: 'light' },
  resolved: { label: 'Resolved', type: 'success', theme: 'light' },
  closed: { label: 'Closed', type: 'muted', theme: 'light' },
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Ticket Details'));

function EditableMessage({
  name,
  body,
  ticketName,
}: {
  name: string;
  body: string;
  ticketName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const updateMessage = useUpdateMessage(ticketName);

  const save = async () => {
    if (!draft.trim()) return;
    try {
      await updateMessage.mutateAsync({ name, body: draft.trim() });
      setEditing(false);
    } catch {
      toast.error('Failed to save edit');
    }
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <MarkdownEditor value={draft} onChange={setDraft} onSubmit={save} rows={4} />
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={updateMessage.isPending || !draft.trim()}
            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
            {updateMessage.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => {
              setDraft(body);
              setEditing(false);
            }}
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/body relative">
      <MarkdownBody content={body} />
      <button
        onClick={() => {
          setDraft(body);
          setEditing(true);
        }}
        className="absolute right-0 top-0 hidden rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground group-hover/body:block"
        title="Edit message">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
    </div>
  );
}

function useTicketNav(orgId: string, ticketName: string) {
  const { data: tickets = [] } = useTickets(orgId);
  const sorted = [...tickets].sort((a, b) => {
    const ta = a.lastActivity ?? (a.createdAt ? a.createdAt.toISOString() : '');
    const tb = b.lastActivity ?? (b.createdAt ? b.createdAt.toISOString() : '');
    return ta < tb ? 1 : ta > tb ? -1 : 0;
  });
  const idx = sorted.findIndex((t) => t.name === ticketName);
  return {
    prev: idx > 0 ? sorted[idx - 1] : null,
    next: idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null,
  };
}

export default function TicketDetailPage() {
  const { orgId, ticketName } = useParams<{ orgId: string; ticketName: string }>();
  const { user } = useApp();

  const { prev: prevTicket, next: nextTicket } = useTicketNav(orgId ?? '', ticketName ?? '');

  const { data: ticket, isLoading: ticketLoading } = useTicket(ticketName ?? '');
  const { data: rawMessages = [], isLoading: messagesLoading } = useMessages(ticketName ?? '');
  const messages = [...rawMessages].sort((a, b) => {
    const ta = a.createdAt ?? '';
    const tb = b.createdAt ?? '';
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
  const createMessage = useCreateMessage(ticketName ?? '');
  const markRead = useMarkTicketRead(orgId ?? '');
  const updateLastActivity = useUpdateTicketLastActivity(orgId ?? '');

  const principalId = user?.sub ?? user?.email;

  useEffect(() => {
    if (ticketName && principalId) {
      markRead.mutate({ ticketName, principalId });
    }
    // Only run on mount or when the ticket changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketName]);

  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const authorRef = {
    name: principalId ?? 'customer',
    displayName:
      user?.fullName ??
      ([user?.givenName, user?.familyName].filter(Boolean).join(' ') || undefined),
  };

  const doSubmit = async () => {
    if (!body.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    setSubmitting(true);
    try {
      await createMessage.mutateAsync({ body: body.trim(), authorRef });
      if (ticketName) updateLastActivity.mutate(ticketName);
      toast.success('Reply sent');
      setBody('');
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSubmit();
  };

  if (ticketLoading) return <p className="text-muted-foreground text-sm p-4">Loading...</p>;
  if (!ticket) return <p className="text-destructive text-sm p-4">Ticket not found.</p>;

  const badge = STATUS_BADGE[ticket.status] ?? { label: ticket.status, type: 'muted' as BadgeType, theme: 'outline' as BadgeTheme };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold">{ticket.title}</h1>
          <p className="text-muted-foreground mt-1 text-xs">#{ticket.name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge type={badge.type} theme={badge.theme}>{badge.label}</Badge>
          {ticket.priority && (
            <span className="text-muted-foreground text-xs">
              {PRIORITY_LABEL[ticket.priority] ?? ticket.priority}
            </span>
          )}
          <div className="flex items-center gap-1 ml-1">
            {prevTicket ? (
              <LinkButton
                as={Link}
                href={`/org/${orgId}/support/${prevTicket.name}`}
                type="secondary"
                theme="outline"
                size="icon"
                title={prevTicket.title}>
                <ChevronLeft className="h-4 w-4" />
              </LinkButton>
            ) : (
              <Button type="secondary" theme="outline" size="icon" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {nextTicket ? (
              <LinkButton
                as={Link}
                href={`/org/${orgId}/support/${nextTicket.name}`}
                type="secondary"
                theme="outline"
                size="icon"
                title={nextTicket.title}>
                <ChevronRight className="h-4 w-4" />
              </LinkButton>
            ) : (
              <Button type="secondary" theme="outline" size="icon" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {ticket.description && (
        <div className="rounded-lg border p-4">
          <h2 className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
            Description
          </h2>
          <MarkdownBody content={ticket.description} />
        </div>
      )}

      {/* Messages */}
      <div className="flex flex-col gap-1">
        <h2 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Messages
        </h2>

        {messagesLoading && (
          <p className="text-muted-foreground text-sm py-2">Loading messages...</p>
        )}

        {!messagesLoading && messages.length === 0 && (
          <p className="text-muted-foreground text-sm py-2">
            No messages yet. Send the first reply below.
          </p>
        )}

        {messages.length > 0 && (
          <div className="mt-2 flex flex-col gap-3">
            {messages.map((msg) => {
              const isStaff = msg.authorType === 'staff';
              const canEdit = msg.authorRef.name === principalId;
              return (
                <div
                  key={msg.name}
                  className={cn(
                    'rounded-lg border p-4 text-sm',
                    isStaff ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
                  )}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold">
                      {msg.authorRef.displayName || msg.authorRef.name}
                      {isStaff && (
                        <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                          Support
                        </span>
                      )}
                    </span>
                    {msg.createdAt && (
                      <DateTime
                        date={msg.createdAt}
                        className="text-muted-foreground text-xs"
                      />
                    )}
                  </div>
                  {canEdit ? (
                    <EditableMessage
                      name={msg.name}
                      body={msg.body}
                      ticketName={ticketName ?? ''}
                    />
                  ) : (
                    <MarkdownBody content={msg.body} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply form */}
      <div className="border-t pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <MarkdownEditor
            value={body}
            onChange={setBody}
            onSubmit={doSubmit}
            disabled={submitting}
            placeholder="Write a reply…"
          />
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
            {submitting ? 'Sending…' : 'Send reply'}
          </button>
        </form>
      </div>
    </div>
  );
}
