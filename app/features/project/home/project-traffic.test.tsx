// @vitest-environment jsdom
import { ProjectTraffic } from './project-traffic';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { proxiesMock, queryMock } = vi.hoisted(() => ({
  proxiesMock: vi.fn(),
  queryMock: vi.fn(),
}));

vi.mock('@/resources/http-proxies', () => ({ useHttpProxies: proxiesMock }));
vi.mock('@/modules/metrics/hooks', () => ({ usePrometheusAPIQuery: queryMock }));
vi.mock('./nlb-traffic', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./nlb-traffic')>()),
  useNlbListHref: (projectId: string) => `/project/${projectId}/services/networking/nlb`,
}));
vi.mock('@/features/edge/proxy/overview/sparkline-stat-card', () => ({
  SparklineStatCard: ({ title, href }: { title: string; href?: string }) => (
    <div data-tile={title} data-href={href ?? ''} />
  ),
}));

/** What each card query returns: ALB requests, NLB count and NLB bytes over the day. */
function serve({
  requests,
  nlbs,
  nlbBytes,
}: {
  requests?: number;
  nlbs?: number;
  nlbBytes?: number;
}) {
  queryMock.mockImplementation((key: readonly unknown[], request: { query: string }) => {
    if (key[0] === 'nlb-count') return { data: { value: nlbs ?? 0 }, isLoading: false };
    if (request.query.includes('datum_nlb_listener_receive_bytes_total')) {
      return { data: nlbBytes === undefined ? undefined : { value: nlbBytes }, isLoading: false };
    }
    return { data: requests === undefined ? undefined : { value: requests }, isLoading: false };
  });
}

let container: HTMLDivElement;
let root: Root;

function renderTraffic() {
  act(() => {
    root.render(
      <MemoryRouter>
        <ProjectTraffic projectId="demo" />
      </MemoryRouter>
    );
  });
}

const tiles = () =>
  [...container.querySelectorAll('[data-tile]')].map((el) => el.getAttribute('data-tile'));
const description = () => container.querySelector('p')?.textContent;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

describe('ProjectTraffic', () => {
  it('shows only the ALB tiles for a project with only ALBs, as before', () => {
    proxiesMock.mockReturnValue({ data: [{ name: 'a' }, { name: 'b' }], isLoading: false });
    serve({ requests: 120 });
    renderTraffic();

    expect(tiles()).toEqual(['Requests served', 'Error rate (4xx + 5xx)', 'Blocked by WAF']);
    expect(description()).toBe(
      "Traffic across all 2 of this project's load balancers over the last 24 hours."
    );
  });

  it('keeps the ALB wording for a quiet ALB-only project', () => {
    proxiesMock.mockReturnValue({ data: [{ name: 'a' }], isLoading: false });
    serve({ requests: 0 });
    renderTraffic();

    expect(tiles()).toEqual([]);
    expect(description()).toBe(
      "No requests to this project's load balancers in the last 24 hours."
    );
  });

  it('shows NLB inbound traffic for a project with only an NLB', () => {
    proxiesMock.mockReturnValue({ data: [], isLoading: false });
    serve({ nlbs: 1, nlbBytes: 5_000 });
    renderTraffic();

    expect(tiles()).toEqual(['NLB data received', 'NLB packets received', 'NLB dropped packets']);
    expect(
      container.querySelector('[data-tile="NLB data received"]')?.getAttribute('data-href')
    ).toBe('/project/demo/services/networking/nlb');
    expect(description()).toBe(
      "Traffic across this project's load balancers over the last 24 hours."
    );
  });

  it('counts both kinds and shows both rows when both saw traffic', () => {
    proxiesMock.mockReturnValue({ data: [{ name: 'a' }], isLoading: false });
    serve({ requests: 10, nlbs: 2, nlbBytes: 5_000 });
    renderTraffic();

    expect(tiles()).toHaveLength(6);
    expect(description()).toBe(
      "Traffic across all 3 of this project's load balancers over the last 24 hours."
    );
  });

  it('drops the NLB row when the NLBs were quiet but the ALBs were not', () => {
    proxiesMock.mockReturnValue({ data: [{ name: 'a' }], isLoading: false });
    serve({ requests: 10, nlbs: 1, nlbBytes: 0 });
    renderTraffic();

    expect(tiles()).toEqual(['Requests served', 'Error rate (4xx + 5xx)', 'Blocked by WAF']);
  });

  it('says there was no traffic when only quiet NLBs exist', () => {
    proxiesMock.mockReturnValue({ data: [], isLoading: false });
    serve({ nlbs: 1, nlbBytes: 0 });
    renderTraffic();

    expect(tiles()).toEqual([]);
    expect(description()).toBe("No traffic to this project's load balancers in the last 24 hours.");
  });

  it('asks for a load balancer when the project has neither', () => {
    proxiesMock.mockReturnValue({ data: [], isLoading: false });
    serve({});
    renderTraffic();

    expect(tiles()).toEqual([]);
    expect(description()).toBe('Add a load balancer to see its traffic here.');
  });
});
