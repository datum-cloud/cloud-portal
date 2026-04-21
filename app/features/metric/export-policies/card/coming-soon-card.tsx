import { GitHubLineIcon } from '@/components/icon/github-line';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';

export const ExportPolicyComingSoonCard = () => {
  return (
    <Card className="dark:border-card h-full items-center justify-center bg-white/50 p-6 shadow sm:p-8 dark:bg-[#18273A]">
      <CardContent className="flex flex-col items-center justify-center gap-4 px-0 text-center">
        <h4 className="text-lg font-medium">Looking for other export destinations?</h4>
        <p className="dark:text-card-quaternary text-foreground/60 max-w-[340px] text-sm font-normal">
          We&apos;re happy to have your feedback and help expanding our list of supported providers.
          Please drop a note in our GitHub discussions with some details.
        </p>

        <a
          href="https://github.com/datum-cloud"
          target="_blank"
          rel="noreferrer"
          className="bg-card border-card-quaternary dark:border-quaternary shadow-tooltip group mt-3 flex items-center gap-3.5 rounded-lg border px-6 py-4">
          <GitHubLineIcon className="dark:text-icon-tertiary text-icon-primary size-5" />
          <span className="text-xs transition-all group-hover:underline">
            Share feedback on GitHub
          </span>
        </a>
      </CardContent>
    </Card>
  );
};
