import { GitHubLineIcon } from '@/components/icon/github-line';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';

export const ExportPolicyComingSoonCard = () => {
  return (
    <Card className="dark:border-card h-full items-center justify-center bg-white/50 p-6 sm:p-8 dark:bg-[#18273A]">
      <CardContent className="flex flex-col items-center justify-center gap-4 px-0 text-center">
        <Text as="h4" size="lg" weight="medium">
          Looking for other export destinations?
        </Text>
        <Text
          as="p"
          weight="normal"
          className="dark:text-card-quaternary text-foreground/60 max-w-[340px]">
          We&apos;re happy to have your feedback and help expanding our list of supported providers.
          Please drop a note in our GitHub discussions with some details.
        </Text>

        <a
          href="https://github.com/datum-cloud"
          target="_blank"
          rel="noreferrer"
          className="bg-card border-card-quaternary dark:border-quaternary shadow-tooltip group mt-3 flex items-center gap-3.5 rounded-lg border px-6 py-4">
          <GitHubLineIcon className="dark:text-icon-tertiary text-icon-primary size-5" />
          <Text size="xs" className="transition-all group-hover:underline">
            Share feedback on GitHub
          </Text>
        </a>
      </CardContent>
    </Card>
  );
};
