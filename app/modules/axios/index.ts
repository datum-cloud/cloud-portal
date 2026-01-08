// Re-export client-side axios (for use in browser)
export { httpClient, PROXY_URL } from './axios.client';

// Re-export request context helpers
export { getRequestContext, withRequestContext, type RequestContext } from './request-context';
