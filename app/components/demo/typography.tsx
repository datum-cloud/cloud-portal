import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import {
  Blockquote,
  Code,
  Link,
  List,
  ListItem,
  Paragraph,
  Text,
  Title,
} from '@datum-cloud/datum-ui/typography';
import { useEffect, useRef, useState } from 'react';

export const typographyDemoSections = [
  { id: 'type-titles', label: 'Titles' },
  { id: 'type-tailwind', label: 'Tailwind Sizes' },
  { id: 'type-weights', label: 'Weights & Colors' },
  { id: 'type-inline', label: 'Inline' },
  { id: 'type-blocks', label: 'Paragraph & Blocks' },
];

const TITLE_LEVELS = [1, 2, 3, 4, 5, 6] as const;
const TAILWIND_SIZES = [
  'text-xs',
  'text-sm',
  'text-base',
  'text-lg',
  'text-xl',
  'text-2xl',
  'text-3xl',
  'text-4xl',
  'text-5xl',
] as const;
const WEIGHTS = ['normal', 'medium', 'semibold', 'bold', 'extrabold'] as const;
const COLORS = [
  'default',
  'secondary',
  'muted',
  'primary',
  'success',
  'info',
  'warning',
  'destructive',
] as const;

/**
 * Reports an element's computed `font-size / line-height` — read live from the
 * DOM (post-cascade, so it reflects any theme override), re-measured on resize
 * because some scales (e.g. Title levels) are responsive at breakpoints.
 */
function useTypeMetrics<T extends HTMLElement>(measureChild = false) {
  const ref = useRef<T>(null);
  const [metrics, setMetrics] = useState('');

  useEffect(() => {
    const measure = () => {
      const host = ref.current;
      const target = measureChild ? host?.firstElementChild : host;
      if (!target) return;
      const { fontSize, lineHeight } = getComputedStyle(target);
      setMetrics(`${fontSize} / ${lineHeight}`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measureChild]);

  return { ref, metrics };
}

/** Muted mono readout of computed type metrics. */
function Metrics({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground w-28 shrink-0 font-mono text-xs">{children}</span>;
}

/** Left-aligned muted label so specimens read as a reference table. */
function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="text-muted-foreground w-20 shrink-0 font-mono text-xs">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Renders one `text-*` utility and reports its computed size. */
function TailwindSizeRow({ cls }: { cls: string }) {
  const { ref, metrics } = useTypeMetrics<HTMLSpanElement>();
  return (
    <div className="flex items-baseline gap-4">
      <span className="text-muted-foreground w-24 shrink-0 font-mono text-xs">{cls}</span>
      <Metrics>{metrics}</Metrics>
      <span ref={ref} className={cls}>
        The quick brown fox
      </span>
    </div>
  );
}

/** Renders one Title level and reports the heading's computed size (responsive). */
function TitleRow({ level }: { level: (typeof TITLE_LEVELS)[number] }) {
  const { ref, metrics } = useTypeMetrics<HTMLDivElement>(true);
  return (
    <div className="flex items-baseline gap-4">
      <span className="text-muted-foreground w-24 shrink-0 font-mono text-xs">{`level ${level}`}</span>
      <Metrics>{metrics}</Metrics>
      <div ref={ref} className="min-w-0">
        <Title level={level}>The quick brown fox</Title>
      </div>
    </div>
  );
}

export default function TypographyDemo() {
  return (
    <div className="space-y-8 p-6">
      <Card id="type-titles">
        <CardHeader>
          <CardTitle>Titles</CardTitle>
          <CardDescription>
            Semantic heading scale (Title level 1–6) with computed font-size / line-height. Levels
            are responsive — resize the window to see them change at breakpoints.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {TITLE_LEVELS.map((level) => (
            <TitleRow key={level} level={level} />
          ))}
        </CardContent>
      </Card>

      <Card id="type-tailwind">
        <CardHeader>
          <CardTitle>Tailwind Sizes</CardTitle>
          <CardDescription>
            Raw text-* utilities (driven by the theme&rsquo;s --text-* tokens), with computed
            font-size / line-height.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {TAILWIND_SIZES.map((cls) => (
            <TailwindSizeRow key={cls} cls={cls} />
          ))}
        </CardContent>
      </Card>

      <Card id="type-weights">
        <CardHeader>
          <CardTitle>Weights &amp; Colors</CardTitle>
          <CardDescription>Font weights and semantic text colors.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {WEIGHTS.map((weight) => (
            <Spec key={weight} label={weight}>
              <Text size="lg" weight={weight}>
                The quick brown fox
              </Text>
            </Spec>
          ))}
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
            {COLORS.map((textColor) => (
              <Text key={textColor} textColor={textColor} weight="medium">
                {textColor}
              </Text>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card id="type-inline">
        <CardHeader>
          <CardTitle>Inline</CardTitle>
          <CardDescription>Inline text types plus inline Code and Link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Text type="strong">strong</Text>
            <Text type="italic">italic</Text>
            <Text type="underline">underline</Text>
            <Text type="delete">deleted</Text>
            <Text type="mark">highlighted</Text>
            <Text type="code">inline code</Text>
          </div>
          <Text>
            A line with an inline <Code>token</Code> and a <Link href="#type-inline">Link</Link>,
            plus an external{' '}
            <Link href="https://datum.net" target="_blank">
              link
            </Link>
            .
          </Text>
        </CardContent>
      </Card>

      <Card id="type-blocks">
        <CardHeader>
          <CardTitle>Paragraph &amp; Blocks</CardTitle>
          <CardDescription>
            Paragraph (with spacing), ordered / unordered lists, a code block, and Blockquote.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {(['tight', 'normal', 'loose'] as const).map((spacing) => (
              <Spec key={spacing} label={spacing}>
                <Paragraph spacing={spacing} className="max-w-prose">
                  Datum Cloud is a network cloud that connects your services across providers and
                  regions. This paragraph shows the {spacing} line spacing.
                </Paragraph>
              </Spec>
            ))}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <span className="text-muted-foreground font-mono text-xs">unordered</span>
              <List>
                <ListItem>First item</ListItem>
                <ListItem>Second item</ListItem>
                <ListItem>Third item</ListItem>
              </List>
            </div>
            <div className="space-y-2">
              <span className="text-muted-foreground font-mono text-xs">ordered</span>
              <List listType="ordered" as="ol">
                <ListItem>First step</ListItem>
                <ListItem>Second step</ListItem>
                <ListItem>Third step</ListItem>
              </List>
            </div>
          </div>

          <Code as="pre">{`export function greet(name: string) {
  return \`Hello, \${name}\`;
}`}</Code>

          <Blockquote>
            &ldquo;Design is not just what it looks like and feels like. Design is how it
            works.&rdquo;
          </Blockquote>
        </CardContent>
      </Card>
    </div>
  );
}
