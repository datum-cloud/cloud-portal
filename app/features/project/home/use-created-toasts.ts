import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';

/**
 * What the home page does after something is created from it: stay put and
 * say so, with a way to open the new resource. Jumping straight to it would
 * lose the person's place on the page they were working from.
 */
export function useCreatedToasts(projectId: string) {
  const navigate = useNavigate();

  const loadBalancerCreated = useCallback(
    (proxy: { name: string; chosenName?: string }) =>
      toast.success('Load balancer created', {
        description: proxy.chosenName || proxy.name,
        action: {
          label: 'Open',
          onClick: () =>
            navigate(
              getPathWithParams(paths.project.detail.proxy.detail.root, {
                projectId,
                proxyId: proxy.name,
              })
            ),
        },
      }),
    [navigate, projectId]
  );

  const domainCreated = useCallback(
    (domain: { name: string; domainName?: string }) =>
      toast.success('Domain added', {
        description: domain.domainName || domain.name,
        action: {
          label: 'Open',
          onClick: () =>
            navigate(
              getPathWithParams(paths.project.detail.domains.detail.overview, {
                projectId,
                domainId: domain.name,
              })
            ),
        },
      }),
    [navigate, projectId]
  );

  return { loadBalancerCreated, domainCreated };
}
