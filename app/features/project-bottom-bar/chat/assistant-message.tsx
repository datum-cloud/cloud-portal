import { ThinkingBlock } from './thinking-block';
import { openSupportMessage } from '@/utils/open-support-message';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { code } from '@streamdown/code';
import { getToolName, isReasoningUIPart, isTextUIPart, isToolUIPart, type UIMessage } from 'ai';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { type ExtraProps, Streamdown } from 'streamdown';
import 'streamdown/styles.css';

const TOOL_LABELS: Record<string, string> = {
  listDomains: 'Loading domains…',
  listDnsZones: 'Loading DNS zones…',
  listDnsRecords: 'Loading DNS records…',
  listHttpProxies: 'Loading AI edge resources…',
  listSecrets: 'Loading secrets…',
  listConnectors: 'Loading connectors…',
  listExportPolicies: 'Loading export policies…',
  getDomain: 'Fetching domain details…',
  getHttpProxy: 'Fetching AI edge details…',
  getConnector: 'Fetching connector details…',
  getProjectMetrics: 'Fetching metrics…',
  queryActivityLogs: 'Loading activity logs…',
  listQuotas: 'Loading quotas…',
  getDesktopAppInfo: 'Getting app info…',
  getDatumPlatformDocs: 'Reading docs…',
  openSupportTicket: 'Preparing support ticket…',
};

interface AssistantMessageProps {
  msg: UIMessage;
  isLastMessage: boolean;
  status: string;
}

export function AssistantMessage({ msg, isLastMessage, status }: AssistantMessageProps) {
  const isStreaming = isLastMessage && status === 'streaming';
  const hasText = msg.parts.some((p) => isTextUIPart(p) && p.text);
  // Tools execute server-side, so client sees 'input-streaming' (args being generated) but
  // typically skips straight to 'output-available' — check both streaming states.
  const activeToolPart = msg.parts.find(
    (p) => isToolUIPart(p) && (p.state === 'input-streaming' || p.state === 'input-available')
  );
  const showInitialLoading = isStreaming && !hasText && !activeToolPart;
  const showToolIndicator = isLastMessage && activeToolPart != null;

  return (
    <div className="flex w-full justify-start">
      <div className="bg-muted text-foreground w-full rounded-xl px-3 py-2 text-sm">
        {msg.parts.map((part, i) => {
          if (isReasoningUIPart(part)) {
            const isThinkingStreaming = isStreaming && i === msg.parts.length - 1;
            return <ThinkingBlock key={i} text={part.text} isStreaming={isThinkingStreaming} />;
          }

          if (isTextUIPart(part) && part.text) {
            return (
              <Streamdown
                key={i}
                className={cn(
                  "**:data-[streamdown='code-block-body']:bg-card **:data-[streamdown='inline-code']:bg-card dark:**:data-[streamdown='inline-code']:bg-accent **:data-[streamdown='inline-code']:border [&_h2]:text-xl [&_h3]:text-lg",
                  isStreaming &&
                    "**:data-[streamdown='inline-code']:animate-[sd-blurIn_300ms_ease-out_both]"
                )}
                isAnimating={isStreaming}
                plugins={{ code }}
                animated={{
                  animation: 'blurIn',
                  duration: 300,
                  easing: 'ease-out',
                  sep: 'word',
                  stagger: 30,
                }}
                components={{
                  a: ({
                    href,
                    children,
                  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & ExtraProps) => {
                    return href?.startsWith('/') ? (
                      <Link className="underline" to={href}>
                        {children}
                      </Link>
                    ) : (
                      <a
                        href={href}
                        className="underline"
                        target="_blank"
                        rel="noopener noreferrer">
                        {children}
                      </a>
                    );
                  },
                }}>
                {part.text}
              </Streamdown>
            );
          }

          if (
            isToolUIPart(part) &&
            getToolName(part) === 'openSupportTicket' &&
            part.state === 'output-available'
          ) {
            const result = part.output as { subject: string; message: string };
            return (
              <div key={i} className="mt-2">
                <Button
                  onClick={() =>
                    openSupportMessage({ subject: result.subject, text: result.message })
                  }
                  className="mb-2">
                  Open Support Ticket
                  <Icon icon={ArrowRight} className="size-4" />
                </Button>
              </div>
            );
          }

          return null;
        })}

        {showInitialLoading && (
          <div className="py-1">
            <LoadingDots />
          </div>
        )}

        {showToolIndicator && (
          <div className="text-muted-foreground flex items-center gap-1.5 py-1 text-xs">
            <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
            <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
            <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full" />
            <span>{TOOL_LABELS[getToolName(activeToolPart)] ?? 'Working…'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-1', className)}>
      <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
      <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
      <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full" />
    </div>
  );
}
