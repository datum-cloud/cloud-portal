import {
  type HttpProxy,
  type HttpProxyBackend,
  type UpdateHttpProxyInput,
  isServiceBackend,
} from '@/resources/http-proxies';
import { isIPAddress } from '@/utils/helpers/validation.helper';
import { z } from 'zod';

/** Gateway API's ceiling for a backend weight. */
export const MAX_BACKEND_WEIGHT = 1_000_000;

/** API defaults for passive health checking, used to prefill the form. */
export const PASSIVE_HEALTH_CHECK_DEFAULTS = {
  consecutive5xxErrors: 5,
  baseEjectionTime: '30s',
  maxEjectionPercent: 50,
} as const;

export const LOAD_BALANCER_OPTIONS = [
  { value: 'default', label: 'Default', description: "Envoy's default algorithm." },
  { value: 'RoundRobin', label: 'Round robin', description: 'Cycle through backends in order.' },
  { value: 'Random', label: 'Random', description: 'Pick a backend at random.' },
  {
    value: 'LeastRequest',
    label: 'Least request',
    description: 'Pick the backend with the fewest active requests.',
  },
  {
    value: 'ConsistentHash',
    label: 'Consistent hash',
    description: 'Send requests that hash the same way to the same backend.',
  },
] as const;

type LoadBalancerChoice = (typeof LOAD_BALANCER_OPTIONS)[number]['value'];

// RFC 9110 token characters, which is what a header name may contain.
const HEADER_NAME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;
// Go duration, which is what the API parses (e.g. 30s, 1m30s, 500ms). Go
// accepts both the micro sign (U+00B5) and Greek mu (U+03BC) for µs.
const GO_DURATION = /^(\d+(\.\d+)?(ns|us|\u00b5s|\u03bcs|ms|s|m|h))+$/;

/** True for a Go duration longer than zero. */
function isPositiveDuration(value: string): boolean {
  return GO_DURATION.test(value) && /[1-9]/.test(value);
}

/** Host part of `host[:port][/path]`, for IP detection. Handles `[ipv6]:port`. */
export function backendHost(endpointHost: string): string {
  const value = endpointHost.trim();
  if (value.startsWith('[')) {
    const end = value.indexOf(']');
    return end === -1 ? value.slice(1) : value.slice(1, end);
  }
  return value.split(/[:/]/)[0] ?? '';
}

// Conform parses FormData, so empty inputs arrive as undefined and fields that
// aren't rendered are missing. Inputs that are always submitted (weight goes
// out as a hidden input with one backend) are required, so clearing one shows
// an error instead of quietly using a default. Fields in sections that can be
// hidden are optional here and required in superRefine when shown.
// Each row is a URL or a NetworkService; the other kind's inputs aren't
// rendered, so every kind-specific field defaults and is checked in superRefine.
const backendRowSchema = z.object({
  kind: z.enum(['url', 'service']).default('url'),
  protocol: z.enum(['http', 'https']).default('https'),
  endpointHost: z.string().trim().default(''),
  serviceName: z.string().trim().default(''),
  servicePort: z.string().trim().default(''),
  weight: z
    .number({ error: 'Enter a weight' })
    .int('Weight must be a whole number')
    .min(0, 'Weight cannot be negative')
    .max(MAX_BACKEND_WEIGHT, `Weight can be at most ${MAX_BACKEND_WEIGHT.toLocaleString()}`),
  tlsHostname: z
    .string()
    .trim()
    .max(253)
    .refine((value) => !/\s/.test(value), 'Hostnames cannot contain spaces')
    .default(''),
});

export const backendsFormSchema = z
  .object({
    backends: z.array(backendRowSchema).min(1, 'Add at least one backend'),
    loadBalancer: z.enum(['default', 'RoundRobin', 'Random', 'LeastRequest', 'ConsistentHash']),
    hashOn: z.enum(['SourceIP', 'Header']).default('SourceIP'),
    hashHeader: z.string().trim().default(''),
    healthCheckEnabled: z.boolean().default(false),
    consecutive5xxErrors: z.number({ error: 'Enter a number' }).optional(),
    baseEjectionTime: z.string().trim().optional(),
    maxEjectionPercent: z.number({ error: 'Enter a number' }).optional(),
  })
  .superRefine((values, ctx) => {
    const seen = new Set<string>();
    values.backends.forEach((row, index) => {
      const issue = (field: string, message: string) =>
        ctx.addIssue({ code: 'custom', path: ['backends', index, field], message });

      if (row.kind === 'service') {
        if (!row.serviceName) issue('serviceName', 'Choose a service');
        else if (!row.servicePort) issue('servicePort', 'Choose a port');
        const key = `service:${row.serviceName}:${row.servicePort}`;
        if (row.serviceName && row.servicePort && seen.has(key)) {
          issue('serviceName', 'This backend is already in the list');
        }
        seen.add(key);
        return;
      }

      if (!row.endpointHost) {
        issue('endpointHost', 'Origin is required');
        return;
      }
      if (/\s/.test(row.endpointHost)) issue('endpointHost', 'Origins cannot contain spaces');
      else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(row.endpointHost)) {
        issue('endpointHost', 'Leave out the http(s):// prefix');
      }
      const key = `${row.protocol}://${row.endpointHost.toLowerCase()}`;
      if (seen.has(key)) issue('endpointHost', 'This backend is already in the list');
      seen.add(key);

      if (
        row.protocol === 'https' &&
        isIPAddress(backendHost(row.endpointHost)) &&
        !row.tlsHostname
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['backends', index, 'tlsHostname'],
          message: 'Required when the origin is an HTTPS IP address',
        });
      }
    });

    if (values.backends.length > 1 && values.backends.every((row) => row.weight === 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['backends', 0, 'weight'],
        message: 'At least one backend needs a weight above 0, or no traffic is served',
      });
    }

    if (values.loadBalancer === 'ConsistentHash' && values.hashOn === 'Header') {
      if (!values.hashHeader) {
        ctx.addIssue({ code: 'custom', path: ['hashHeader'], message: 'Header name is required' });
      } else if (!HEADER_NAME.test(values.hashHeader)) {
        ctx.addIssue({ code: 'custom', path: ['hashHeader'], message: 'Not a valid header name' });
      }
    }

    if (values.healthCheckEnabled) {
      const errors = values.consecutive5xxErrors;
      if (errors === undefined || !Number.isInteger(errors) || errors < 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['consecutive5xxErrors'],
          message: 'Use a whole number of at least 1',
        });
      }
      if (!isPositiveDuration(values.baseEjectionTime ?? '')) {
        ctx.addIssue({
          code: 'custom',
          path: ['baseEjectionTime'],
          message: 'Use a duration such as 30s, 2m, or 1m30s',
        });
      }
      const percent = values.maxEjectionPercent;
      if (percent === undefined || !Number.isInteger(percent) || percent < 1 || percent > 100) {
        ctx.addIssue({
          code: 'custom',
          path: ['maxEjectionPercent'],
          message: 'Use a whole number from 1 to 100',
        });
      }
    }
  });

export type BackendsFormValues = z.infer<typeof backendsFormSchema>;
type BackendRowValues = BackendsFormValues['backends'][number];

/** Split an endpoint URL into protocol and the rest, keeping any port and path. */
function splitEndpoint(endpoint: string): Pick<BackendRowValues, 'protocol' | 'endpointHost'> {
  const match = /^(https?):\/\/(.*)$/i.exec(endpoint.trim());
  if (!match) return { protocol: 'https', endpointHost: endpoint.trim() };
  return {
    protocol: match[1].toLowerCase() === 'http' ? 'http' : 'https',
    endpointHost: match[2],
  };
}

export function emptyBackendRow(kind: BackendRowValues['kind'] = 'url'): BackendRowValues {
  return {
    kind,
    protocol: 'https',
    endpointHost: '',
    serviceName: '',
    servicePort: '',
    weight: 1,
    tlsHostname: '',
  };
}

/** Form values for the proxy as it is now. */
export function toBackendsFormValues(proxy: HttpProxy): BackendsFormValues {
  const current: HttpProxyBackend[] =
    proxy.backends && proxy.backends.length > 0
      ? proxy.backends
      : proxy.endpoint
        ? [{ endpoint: proxy.endpoint, tlsHostname: proxy.tlsHostname }]
        : [];
  const passive = proxy.healthCheck?.passive;
  const hash = proxy.loadBalancer?.consistentHash;

  return {
    backends:
      current.length > 0
        ? current.map((backend) => {
            const weight = backend.weight ?? 1;
            if (isServiceBackend(backend)) {
              return {
                ...emptyBackendRow('service'),
                serviceName: backend.networkService.name,
                servicePort: backend.networkService.port,
                weight,
              };
            }
            return {
              ...emptyBackendRow('url'),
              ...splitEndpoint(backend.endpoint),
              weight,
              tlsHostname: backend.tlsHostname ?? '',
            };
          })
        : [emptyBackendRow()],
    loadBalancer: (proxy.loadBalancer?.type ?? 'default') as LoadBalancerChoice,
    hashOn: hash?.type ?? 'SourceIP',
    hashHeader: hash?.header ?? '',
    healthCheckEnabled: !!passive,
    consecutive5xxErrors:
      passive?.consecutive5xxErrors ?? PASSIVE_HEALTH_CHECK_DEFAULTS.consecutive5xxErrors,
    baseEjectionTime: passive?.baseEjectionTime ?? PASSIVE_HEALTH_CHECK_DEFAULTS.baseEjectionTime,
    maxEjectionPercent:
      passive?.maxEjectionPercent ?? PASSIVE_HEALTH_CHECK_DEFAULTS.maxEjectionPercent,
  };
}

/**
 * The update for a saved form. Weights are written only when there is more
 * than one backend, where they mean something. Load balancing and health
 * checks are removed with `null` when they were set and now are not.
 */
export function toBackendsUpdateInput(
  values: BackendsFormValues,
  proxy: HttpProxy
): UpdateHttpProxyInput {
  const several = values.backends.length > 1;
  const input: UpdateHttpProxyInput = {
    backends: values.backends.map((row) => {
      const weight = several ? { weight: row.weight } : {};
      if (row.kind === 'service') {
        return { networkService: { name: row.serviceName, port: row.servicePort }, ...weight };
      }
      return {
        endpoint: `${row.protocol}://${row.endpointHost.trim()}`,
        ...weight,
        tlsHostname: row.tlsHostname.trim(),
      };
    }),
  };

  // A merge patch keeps fields it isn't told to remove, and the API forbids
  // `consistentHash` off ConsistentHash and `header` off Header hashing, so
  // stale ones are nulled explicitly.
  const currentHash = proxy.loadBalancer?.consistentHash;
  if (values.loadBalancer === 'default') {
    if (proxy.loadBalancer) input.loadBalancer = null;
  } else if (values.loadBalancer === 'ConsistentHash') {
    input.loadBalancer = {
      type: 'ConsistentHash',
      consistentHash:
        values.hashOn === 'Header'
          ? { type: 'Header', header: values.hashHeader.trim() }
          : { type: 'SourceIP', ...(currentHash?.header && { header: null }) },
    };
  } else {
    input.loadBalancer = {
      type: values.loadBalancer,
      ...(currentHash && { consistentHash: null }),
    };
  }

  if (values.healthCheckEnabled) {
    input.healthCheck = {
      passive: {
        consecutive5xxErrors:
          values.consecutive5xxErrors ?? PASSIVE_HEALTH_CHECK_DEFAULTS.consecutive5xxErrors,
        baseEjectionTime:
          values.baseEjectionTime?.trim() || PASSIVE_HEALTH_CHECK_DEFAULTS.baseEjectionTime,
        maxEjectionPercent:
          values.maxEjectionPercent ?? PASSIVE_HEALTH_CHECK_DEFAULTS.maxEjectionPercent,
      },
    };
  } else if (proxy.healthCheck) {
    input.healthCheck = null;
  }

  return input;
}
