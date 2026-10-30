/// <reference types="bun-types/test" />
import {
  executePrometheusRequest,
  shouldRetryMetricsQuery,
  toPrometheusError,
  type PrometheusRequestService,
} from './prometheus-request';
import type {
  FormattedMetricData,
  MetricCardData,
  PrometheusInstantResponse,
  PrometheusRangeResponse,
} from '@/modules/prometheus';
import { PrometheusError } from '@/modules/prometheus';
import { AppError, AuthorizationError, ValidationError } from '@/utils/errors';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

const querySpy = mock();
const queryRangeSpy = mock();
const labelValuesSpy = mock();

const service: PrometheusRequestService = {
  query: querySpy,
  queryRange: queryRangeSpy,
  labelValues: labelValuesSpy,
};

beforeEach(() => {
  querySpy.mockReset();
  queryRangeSpy.mockReset();
  labelValuesSpy.mockReset();
});

const START = new Date('2024-01-01T00:00:00.000Z');
const END = new Date('2024-01-01T01:00:00.000Z');
const START_S = Math.floor(START.getTime() / 1000);
const END_S = Math.floor(END.getTime() / 1000);

const matrixResponse: PrometheusRangeResponse = {
  status: 'success',
  data: {
    resultType: 'matrix',
    result: [
      {
        metric: { region: 'us-east' },
        values: [
          [START_S, '1'],
          [START_S + 60, '2'],
        ],
      },
    ],
  },
};

const vectorResponse: PrometheusInstantResponse = {
  status: 'success',
  data: {
    resultType: 'vector',
    result: [{ metric: {}, value: [END_S, '42'] }],
  },
};

describe('executePrometheusRequest: chart', () => {
  it('runs a range query for the project and formats the series', async () => {
    queryRangeSpy.mockResolvedValueOnce(matrixResponse);

    const data = await executePrometheusRequest<FormattedMetricData>(
      {
        type: 'chart',
        projectId: 'proj-a',
        query: 'up',
        timeRange: { start: START, end: END },
        step: '1m',
      },
      service
    );

    expect(queryRangeSpy).toHaveBeenCalledWith({
      projectId: 'proj-a',
      query: 'up',
      start: START_S,
      end: END_S,
      step: '1m',
    });
    expect(data.series).toHaveLength(1);
    expect(data.series[0]?.data.map((p) => p.value)).toEqual([1, 2]);
    expect(data.timeRange).toEqual({ start: START_S, end: END_S });
  });

  it('accepts a time range already in unix seconds', async () => {
    queryRangeSpy.mockResolvedValueOnce(matrixResponse);

    await executePrometheusRequest(
      {
        type: 'chart',
        projectId: 'proj-a',
        query: 'up',
        timeRange: { start: START_S, end: END_S },
        step: '5m',
      },
      service
    );

    expect(queryRangeSpy.mock.calls[0][0]).toMatchObject({ start: START_S, end: END_S });
  });

  it('picks a step from the range when none is given', async () => {
    queryRangeSpy.mockResolvedValueOnce(matrixResponse);

    await executePrometheusRequest(
      { type: 'chart', projectId: 'proj-a', query: 'up', timeRange: { start: START, end: END } },
      service
    );

    const { step } = queryRangeSpy.mock.calls[0][0] as { step: string };
    expect(step).toMatch(/^\d+[smhd]$/);
  });

  it('runs an instant query when there is no time range', async () => {
    querySpy.mockResolvedValueOnce(vectorResponse);

    await executePrometheusRequest({ type: 'chart', projectId: 'proj-a', query: 'up' }, service);

    expect(querySpy).toHaveBeenCalledWith({ projectId: 'proj-a', query: 'up' });
    expect(queryRangeSpy).not.toHaveBeenCalled();
  });
});

describe('executePrometheusRequest: card', () => {
  it('runs an instant query at the end of the range and formats the value', async () => {
    querySpy.mockResolvedValueOnce(vectorResponse);

    const data = await executePrometheusRequest<MetricCardData>(
      {
        type: 'card',
        projectId: 'proj-a',
        query: 'sum(up)',
        timeRange: { start: START, end: END },
        metricFormat: 'number',
      },
      service
    );

    expect(querySpy).toHaveBeenCalledWith({ projectId: 'proj-a', query: 'sum(up)', time: END_S });
    expect(data.value).toBe(42);
  });
});

describe('executePrometheusRequest: labels', () => {
  it('reads label values for the project with the selector', async () => {
    labelValuesSpy.mockResolvedValueOnce(['eu-west', 'us-east']);

    const values = await executePrometheusRequest<string[]>(
      { type: 'labels', projectId: 'proj-a', label: 'region', match: '{job="envoy"}' },
      service
    );

    expect(labelValuesSpy).toHaveBeenCalledWith({
      projectId: 'proj-a',
      label: 'region',
      match: '{job="envoy"}',
    });
    expect(values).toEqual(['eu-west', 'us-east']);
  });
});

describe('executePrometheusRequest: errors', () => {
  it('turns an invalid query into a query PrometheusError without calling queryapi', async () => {
    const error = await executePrometheusRequest(
      { type: 'chart', projectId: 'proj-a', query: '' },
      service
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PrometheusError);
    expect((error as PrometheusError).type).toBe('query');
    expect(querySpy).not.toHaveBeenCalled();
  });

  it('keeps the status of a service failure', async () => {
    queryRangeSpy.mockRejectedValueOnce(new AuthorizationError('forbidden'));

    const error = await executePrometheusRequest(
      {
        type: 'chart',
        projectId: 'proj-a',
        query: 'up',
        timeRange: { start: START, end: END },
        step: '1m',
      },
      service
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PrometheusError);
    expect((error as PrometheusError).statusCode).toBe(403);
  });
});

describe('toPrometheusError', () => {
  it('passes a PrometheusError through', () => {
    const original = PrometheusError.timeout('slow');
    expect(toPrometheusError(original)).toBe(original);
  });

  it('maps 422 to a query error that keeps the status', () => {
    const error = toPrometheusError(new AppError('too large', { status: 422 }));
    expect(error.type).toBe('query');
    expect(error.statusCode).toBe(422);
  });

  it('maps 503 to a timeout that keeps the status', () => {
    const error = toPrometheusError(new AppError('unavailable', { status: 503 }));
    expect(error.type).toBe('timeout');
    expect(error.statusCode).toBe(503);
  });

  it('maps a queryapi 400 (bad_data) to a query error that keeps the status', () => {
    const error = toPrometheusError(new AppError('parse error at 1:5', { status: 400 }));
    expect(error.type).toBe('query');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('parse error at 1:5');
  });

  it('maps a Prometheus error envelope to a query error', () => {
    const error = toPrometheusError(new ValidationError('parse error'));
    expect(error.type).toBe('query');
    expect(error.message).toBe('parse error');
  });

  it('maps other statuses to network errors', () => {
    const error = toPrometheusError(new AppError('bad gateway', { status: 502 }));
    expect(error.type).toBe('network');
    expect(error.statusCode).toBe(502);
  });

  it('maps anything else to unknown', () => {
    expect(toPrometheusError(new Error('boom')).type).toBe('unknown');
    expect(toPrometheusError('boom').type).toBe('unknown');
  });
});

describe('shouldRetryMetricsQuery', () => {
  it.each([
    ['a bad query', new PrometheusError('bad', 'query', 400)],
    ['a response too large', new PrometheusError('big', 'query', 422)],
    ['a timeout', new PrometheusError('slow', 'timeout', 503)],
    ['a 401', PrometheusError.network('unauthorized', 401)],
    ['a 403', PrometheusError.network('forbidden', 403)],
  ])('does not retry %s', (_label, error) => {
    expect(shouldRetryMetricsQuery(0, error)).toBe(false);
  });

  it('retries network errors up to three times', () => {
    const error = PrometheusError.network('bad gateway', 502);
    expect(shouldRetryMetricsQuery(0, error)).toBe(true);
    expect(shouldRetryMetricsQuery(2, error)).toBe(true);
    expect(shouldRetryMetricsQuery(3, error)).toBe(false);
  });
});
