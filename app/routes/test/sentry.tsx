import { httpClient } from '@/modules/axios/axios.client';
import { logger } from '@/modules/logger';
import {
  // Context
  setSentryUser,
  clearSentryUser,
  setSentryOrgContext,
  clearSentryOrgContext,
  setSentryProjectContext,
  clearSentryProjectContext,
  setSentryResourceContext,
  clearSentryResourceContext,
  // Breadcrumbs
  trackFormSubmit,
  trackFormSuccess,
  trackFormValidationError,
  trackFormError,
  trackApiCall,
  trackApiError,
  // Capture
  addBreadcrumb,
  captureError,
  captureMessage,
  setTag,
  setContext,
} from '@/modules/sentry';
import * as Sentry from '@sentry/react-router';
import { useState } from 'react';
import { Form, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';

// Toggle these to test server-side errors
const ENABLE_LOADER_ERROR = false;
const ENABLE_ACTION_ERROR = false;

export async function loader({ context }: LoaderFunctionArgs) {
  const reqLogger = context.logger;

  reqLogger.info('Sentry test page loaded', {
    feature: 'sentry-test',
    timestamp: new Date().toISOString(),
  });

  if (ENABLE_LOADER_ERROR) {
    reqLogger.error('Test loader error about to be thrown');
    throw new Error('Test server error from loader - Check Sentry for OTEL correlation!');
  }

  return {
    message: 'Loader executed successfully',
    requestId: context.requestId,
  };
}

export async function action({ context }: ActionFunctionArgs) {
  const reqLogger = context.logger;

  if (ENABLE_ACTION_ERROR) {
    reqLogger.error('Test action error about to be thrown');
    throw new Error('Test server error from action - Check Sentry for OTEL correlation!');
  }

  reqLogger.info('Test action executed successfully', {
    feature: 'sentry-test',
    action: 'form-submit',
  });

  return { success: true, message: 'Action completed - Check server logs and Sentry!' };
}

export default function TestSentryPage() {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // ============================================================================
  // Context Tests
  // ============================================================================

  const testUserContext = () => {
    setSentryUser({
      id: 'test-user-123',
      email: 'test@example.com',
      username: '33221123123',
      name: 'Test User',
    });
    showMessage('success', 'User context set (user.id tag + user context)');
  };

  const testOrgContext = () => {
    setSentryOrgContext({
      name: 'test-org-456',
      uid: 'org-uid-abc',
    });
    showMessage('success', 'Organization context set (org.id tag + organization context)');
  };

  const testProjectContext = () => {
    setSentryProjectContext({
      name: 'test-project-789',
      uid: 'project-uid-def',
      namespace: 'test-namespace',
      organizationId: 'test-org-456',
    });
    showMessage('success', 'Project context set (project.id tag + project context)');
  };

  const testResourceContext = () => {
    setSentryResourceContext({
      kind: 'HTTPProxy',
      apiVersion: 'networking.datumapis.com/v1alpha',
      metadata: {
        name: 'my-proxy',
        namespace: 'default',
        uid: 'resource-uid-ghi',
      },
    });
    showMessage(
      'success',
      'Resource context set (resource.kind, resource.apiGroup, resource.name, resource.namespace tags)'
    );
  };

  const testFullHierarchy = () => {
    setSentryUser({ id: 'user-001', email: 'user@example.com', username: '33221123123' });
    setSentryOrgContext({ name: 'acme-corp', uid: 'org-001' });
    setSentryProjectContext({
      name: 'web-app',
      uid: 'proj-001',
      namespace: 'production',
      organizationId: 'acme-corp',
    });
    setSentryResourceContext({
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      metadata: { name: 'frontend', namespace: 'production', uid: 'deploy-001' },
    });
    showMessage('success', 'Full hierarchy set: User → Org → Project → Resource');
  };

  const clearAllContext = () => {
    clearSentryUser();
    clearSentryOrgContext();
    clearSentryProjectContext();
    clearSentryResourceContext();
    showMessage('success', 'All context cleared');
  };

  // ============================================================================
  // Breadcrumb Tests
  // ============================================================================

  const testFormBreadcrumbs = () => {
    trackFormSubmit({ formName: 'test-form', formId: 'form-123' });
    trackFormSuccess({ formName: 'test-form', formId: 'form-123' });
    showMessage('success', 'Form submit + success breadcrumbs added');
  };

  const testFormValidationError = () => {
    trackFormSubmit({ formName: 'test-form', formId: 'form-123' });
    trackFormValidationError({
      formName: 'test-form',
      formId: 'form-123',
      fieldErrors: { email: ['Invalid email'], password: ['Too short'] },
    });
    showMessage('success', 'Form validation error breadcrumb added (2 fields failed)');
  };

  const testFormError = () => {
    trackFormSubmit({ formName: 'test-form', formId: 'form-123' });
    trackFormError({
      formName: 'test-form',
      formId: 'form-123',
      error: new Error('Network timeout'),
    });
    showMessage('success', 'Form error breadcrumb added');
  };

  const testApiBreadcrumbs = () => {
    trackApiCall({ method: 'GET', url: '/api/users', status: 200, duration: 150 });
    trackApiCall({ method: 'POST', url: '/api/users', status: 201, duration: 300 });
    trackApiError({
      method: 'DELETE',
      url: '/api/users/123',
      status: 403,
      duration: 50,
      error: 'Forbidden',
    });
    showMessage('success', 'API breadcrumbs added: 2 success + 1 error');
  };

  const testCustomBreadcrumb = () => {
    addBreadcrumb('info', 'User navigated to settings', 'navigation', { from: '/home' });
    addBreadcrumb('warn', 'Feature flag disabled', 'feature', { flag: 'new-ui' });
    showMessage('success', 'Custom breadcrumbs added (info + warn levels)');
  };

  // ============================================================================
  // Capture Tests
  // ============================================================================

  const testCaptureError = () => {
    const error = new Error('Test error for Sentry');
    captureError(error, {
      message: 'This is a test error capture',
      tags: { test_type: 'manual_capture' },
      extra: { timestamp: new Date().toISOString() },
    });
    showMessage('success', 'Error captured to Sentry with tags and extra context');
  };

  const testCaptureMessage = () => {
    captureMessage('Test info message from Sentry test page', 'info', {
      source: 'test-page',
      timestamp: new Date().toISOString(),
    });
    showMessage('success', 'Info message captured to Sentry');
  };

  const testCustomTagsAndContext = () => {
    setTag('custom.feature', 'sentry-test');
    setTag('custom.version', '2.0');
    setContext('test-metadata', {
      testRun: Date.now(),
      browser: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
    });
    showMessage('success', 'Custom tags and context set');
  };

  // ============================================================================
  // Integration Tests
  // ============================================================================

  const testLoggerIntegration = () => {
    logger.info('Test info via logger', { source: 'test-page' });
    logger.warn('Test warning via logger', { level: 'warn' });
    logger.error('Test error via logger', new Error('Logger error test'));
    showMessage('success', 'Logger messages sent (info + warn + error with Sentry capture)');
  };

  const triggerClientError = () => {
    try {
      addBreadcrumb('info', 'About to trigger client error', 'test');
      throw new Error('Test client-side error - Check Sentry for full context!');
    } catch (error) {
      Sentry.captureException(error);
      showMessage('error', error instanceof Error ? error.message : String(error));
    }
  };

  const triggerApiError = async () => {
    try {
      trackApiCall({ method: 'GET', url: '/api/nonexistent', status: 0, duration: 0 });
      const response = await fetch('/api/nonexistent-endpoint');
      if (!response.ok) {
        trackApiError({
          method: 'GET',
          url: '/api/nonexistent-endpoint',
          status: response.status,
          error: response.statusText,
        });
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      captureError(error as Error, { tags: { test_type: 'api_error' } });
      showMessage('error', error instanceof Error ? error.message : String(error));
    }
  };

  const triggerDnsZoneApiError = async () => {
    try {
      // This will trigger a 404 error through the axios interceptor
      // The interceptor will parse the URL and set resource context:
      // - resource.apiGroup: dns.networking.miloapis.com
      // - resource.type: dnszones
      // - resource.name: nonexistent-zone
      // - resource.namespace: test-namespace
      await httpClient.get(
        '/apis/dns.networking.miloapis.com/v1alpha1/namespaces/test-namespace/dnszones/nonexistent-zone'
      );
    } catch {
      showMessage(
        'error',
        `DNS Zone API error captured! Check Sentry for resource tags parsed from URL.`
      );
    }
  };

  const triggerHttpProxyApiError = async () => {
    try {
      // This will trigger a 404 error through the axios interceptor
      // The interceptor will parse the URL and set resource context:
      // - resource.apiGroup: networking.datumapis.com
      // - resource.type: httpproxies
      // - resource.name: nonexistent-proxy
      // - resource.namespace: test-namespace
      await httpClient.get(
        '/apis/networking.datumapis.com/v1alpha/namespaces/test-namespace/httpproxies/nonexistent-proxy'
      );
    } catch {
      showMessage(
        'error',
        `HTTPProxy API error captured! Check Sentry for resource tags parsed from URL.`
      );
    }
  };

  const triggerUserApiError = async () => {
    try {
      // This will trigger a 401/404 error through the axios interceptor
      // The interceptor will parse the URL and set resource context:
      // - resource.apiGroup: iam.miloapis.com
      // - resource.type: useridentities
      await httpClient.get('/apis/iam.miloapis.com/v1alpha1/users/test-user/useridentities');
    } catch {
      showMessage(
        'error',
        `User API error captured! Check Sentry for resource tags parsed from URL.`
      );
    }
  };

  const testResourceTags = () => {
    // Set resource context (this sets the tags)
    setSentryResourceContext({
      kind: 'HTTPProxy',
      apiVersion: 'networking.datumapis.com/v1alpha',
      metadata: {
        name: 'test-proxy',
        namespace: 'production',
        uid: 'proxy-uid-123',
      },
    });

    // Capture an event so tags are sent to Sentry
    captureMessage('Test resource tags - check Tags section in Sentry', 'info', {
      test_type: 'resource_tags_test',
    });

    showMessage(
      'success',
      'Event captured with resource tags: resource.kind=HTTPProxy, resource.apiGroup=networking.datumapis.com, resource.name=test-proxy, resource.namespace=production'
    );
  };

  const testFullWorkflow = async () => {
    // 1. Set full context hierarchy (including resource)
    setSentryUser({ id: 'workflow-user', email: 'workflow@test.com' });
    setSentryOrgContext({ name: 'workflow-org' });
    setSentryProjectContext({ name: 'workflow-project', organizationId: 'workflow-org' });
    setSentryResourceContext({
      kind: 'DNSZone',
      apiVersion: 'dns.networking.miloapis.com/v1alpha1',
      metadata: { name: 'example-zone', namespace: 'production', uid: 'dns-001' },
    });

    // 2. Simulate user journey with breadcrumbs
    addBreadcrumb('info', 'User started workflow test', 'test');
    trackApiCall({ method: 'GET', url: '/api/config', status: 200, duration: 100 });
    trackFormSubmit({ formName: 'workflow-form' });

    // 3. Simulate an error
    trackFormError({ formName: 'workflow-form', error: new Error('Simulated workflow error') });

    // 4. Capture the error
    captureError(new Error('Workflow test completed with simulated error'), {
      message: 'Full workflow test',
      tags: { test_type: 'full_workflow' },
    });

    showMessage(
      'success',
      'Full workflow captured - Check Sentry for tags: user.id, org.id, project.id, resource.kind, resource.apiGroup, resource.name, resource.namespace'
    );
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Sentry Integration Test Suite</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Comprehensive testing for all Sentry module features
      </p>

      {message && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px',
            color: message.type === 'success' ? '#155724' : '#721c24',
          }}>
          {message.text}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '1.5rem',
        }}>
        {/* Context Section */}
        <section style={{ padding: '1.5rem', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, color: '#1565c0' }}>Context (Hierarchical)</h2>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
            Set context at different levels for filtering in Sentry
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Button onClick={testUserContext} color="#1976d2">
              Set User Context
            </Button>
            <Button onClick={testOrgContext} color="#1976d2">
              Set Org Context
            </Button>
            <Button onClick={testProjectContext} color="#1976d2">
              Set Project Context
            </Button>
            <Button onClick={testResourceContext} color="#1976d2">
              Set Resource Context
            </Button>
            <Button onClick={testFullHierarchy} color="#0d47a1">
              Set Full Hierarchy
            </Button>
            <Button onClick={testResourceTags} color="#0d47a1">
              Test Resource Tags (+ Capture)
            </Button>
            <Button onClick={clearAllContext} color="#757575">
              Clear All Context
            </Button>
          </div>
        </section>

        {/* Breadcrumbs Section */}
        <section style={{ padding: '1.5rem', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, color: '#e65100' }}>Breadcrumbs</h2>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
            Track user journey through form and API interactions
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Button onClick={testFormBreadcrumbs} color="#f57c00">
              Form Submit + Success
            </Button>
            <Button onClick={testFormValidationError} color="#f57c00">
              Form Validation Error
            </Button>
            <Button onClick={testFormError} color="#f57c00">
              Form API Error
            </Button>
            <Button onClick={testApiBreadcrumbs} color="#f57c00">
              API Breadcrumbs
            </Button>
            <Button onClick={testCustomBreadcrumb} color="#e65100">
              Custom Breadcrumbs
            </Button>
          </div>
        </section>

        {/* Capture Section */}
        <section style={{ padding: '1.5rem', backgroundColor: '#fce4ec', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, color: '#c2185b' }}>Capture</h2>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
            Capture errors and messages to Sentry
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Button onClick={testCaptureError} color="#d81b60">
              Capture Error
            </Button>
            <Button onClick={testCaptureMessage} color="#d81b60">
              Capture Message
            </Button>
            <Button onClick={testCustomTagsAndContext} color="#d81b60">
              Set Custom Tags
            </Button>
          </div>
        </section>

        {/* Integration Section */}
        <section style={{ padding: '1.5rem', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, color: '#2e7d32' }}>Integration Tests</h2>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
            Test logger integration and real errors
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Button onClick={testLoggerIntegration} color="#43a047">
              Logger Integration
            </Button>
            <Button onClick={triggerClientError} color="#c62828">
              Trigger Client Error
            </Button>
            <Button onClick={triggerApiError} color="#c62828">
              Trigger API Error
            </Button>
            <Button onClick={testFullWorkflow} color="#1b5e20">
              Full Workflow Test
            </Button>
          </div>
        </section>

        {/* Real API Error Tests */}
        <section style={{ padding: '1.5rem', backgroundColor: '#ffebee', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, color: '#b71c1c' }}>Real API Errors (URL Parsing)</h2>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
            Trigger real API errors to test URL-based resource context
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Button onClick={triggerDnsZoneApiError} color="#c62828">
              DNS Zone 404 Error
            </Button>
            <Button onClick={triggerHttpProxyApiError} color="#c62828">
              HTTPProxy 404 Error
            </Button>
            <Button onClick={triggerUserApiError} color="#c62828">
              User API 401/404 Error
            </Button>
          </div>
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#fff',
              borderRadius: '4px',
              fontSize: '0.8rem',
            }}>
            <strong>Expected resource tags from URL:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
              <li>
                <code>resource.apiGroup</code> (e.g., dns.networking.miloapis.com)
              </li>
              <li>
                <code>resource.type</code> (e.g., dnszones, httpproxies)
              </li>
              <li>
                <code>resource.name</code> (e.g., nonexistent-zone)
              </li>
              <li>
                <code>resource.namespace</code> (e.g., test-namespace)
              </li>
            </ul>
          </div>
        </section>
      </div>

      {/* Server-Side Tests */}
      <section
        style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          backgroundColor: '#f3e5f5',
          borderRadius: '8px',
        }}>
        <h2 style={{ marginTop: 0, color: '#7b1fa2' }}>Server-Side Tests</h2>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
          Set <code>ENABLE_LOADER_ERROR</code> or <code>ENABLE_ACTION_ERROR</code> to{' '}
          <code>true</code> in source code
        </p>
        <Form method="post">
          <Button
            type="submit"
            color={ENABLE_ACTION_ERROR ? '#7b1fa2' : '#bdbdbd'}
            disabled={!ENABLE_ACTION_ERROR}>
            Trigger Server Action Error
          </Button>
        </Form>
      </section>

      {/* Verification Guide */}
      <section
        style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          backgroundColor: '#eceff1',
          borderRadius: '8px',
        }}>
        <h3 style={{ marginTop: 0 }}>Verification in Sentry Dashboard</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            fontSize: '0.85rem',
          }}>
          <div>
            <strong>Tags to filter by:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
              <li>
                <code>user.id</code>
              </li>
              <li>
                <code>org.id</code>
              </li>
              <li>
                <code>project.id</code>
              </li>
              <li>
                <code>resource.kind</code> (from response)
              </li>
              <li>
                <code>resource.type</code> (from URL)
              </li>
              <li>
                <code>resource.apiGroup</code>
              </li>
            </ul>
          </div>
          <div>
            <strong>Context sections:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
              <li>user (id, email, name)</li>
              <li>organization (id, uid)</li>
              <li>project (id, uid, namespace)</li>
              <li>resource (kind, apiGroup, name)</li>
            </ul>
          </div>
          <div>
            <strong>Breadcrumb categories:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
              <li>
                <code>form</code> - form interactions
              </li>
              <li>
                <code>api</code> - API calls
              </li>
              <li>
                <code>navigation</code> - user navigation
              </li>
              <li>
                <code>log</code> - logger output
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function Button({
  children,
  onClick,
  color,
  type = 'button',
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '0.5rem 1rem',
        backgroundColor: disabled ? '#bdbdbd' : color,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '0.875rem',
        textAlign: 'left',
      }}>
      {children}
    </button>
  );
}
