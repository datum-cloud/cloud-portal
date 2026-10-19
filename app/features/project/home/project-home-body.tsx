import { HomeColumns } from './home-columns';
import { ProjectHealth } from './project-health';
import { SetupProgress } from './setup-progress';
import { useProjectSetup } from './use-project-setup';
import {
  ProjectHomePluginHero,
  useProjectHomePluginHero,
} from '@/modules/plugins/client/plugin-hero';
import { AnalyticsAction, useAnalytics } from '@/modules/rybbit';
import { Button } from '@datum-cloud/datum-ui/button';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useEffect, useRef } from 'react';

/**
 * The part of the project home page that changes with first-run setup. An
 * empty project leads with the network hero a plugin contributes; once there
 * is a network, the setup strip sits above the usual resource columns. With
 * no hero plugin installed the page is the same as before.
 *
 * The health line is left out while the project has nothing in it: "everything
 * looks healthy" says nothing when nothing is running.
 */
export function ProjectHomeBody({ projectId }: { projectId: string }) {
  const setup = useProjectSetup(projectId);
  const { hero, isLoading: heroLoading } = useProjectHomePluginHero(projectId);
  const { trackAction } = useAnalytics();

  const showHero = setup.showNetworkHero && !!hero;

  // A network appearing while the hero is up means the hero created it.
  const heroShownRef = useRef(false);
  const createTrackedRef = useRef(false);
  useEffect(() => {
    if (showHero) heroShownRef.current = true;
  }, [showHero]);
  useEffect(() => {
    if (!heroShownRef.current || !setup.hasNetwork || createTrackedRef.current) return;
    createTrackedRef.current = true;
    trackAction(AnalyticsAction.CreateNetworkFirstRun);
  }, [setup.hasNetwork, trackAction]);

  const showHealth = !setup.isLoading && !setup.isEmpty;

  // Until setup and plugins load, the columns render as they always have (with
  // their own skeletons), so existing projects never wait on the setup reads.
  const body =
    showHero && hero && !heroLoading ? (
      <div className="flex flex-col gap-4">
        <ProjectHomePluginHero hero={hero} />
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
          <Text size="sm" textColor="muted">
            Only need a load balancer for an existing site, or a domain?
          </Text>
          <Button
            type="quaternary"
            theme="borderless"
            size="xs"
            className="text-btn-primary"
            onClick={() => {
              trackAction(AnalyticsAction.SkipNetworkFirstRun);
              setup.skipNetwork();
            }}>
            Skip this step
          </Button>
        </div>
      </div>
    ) : (
      <div className="flex flex-col gap-8">
        {setup.showProgress && (
          <SetupProgress
            projectId={projectId}
            steps={setup.steps}
            currentStep={setup.currentStep}
            isComplete={setup.isComplete}
            onHide={setup.hideProgress}
          />
        )}
        <HomeColumns projectId={projectId} />
      </div>
    );

  return (
    <div className="flex flex-col gap-8">
      {showHealth && <ProjectHealth projectId={projectId} />}
      {body}
    </div>
  );
}
