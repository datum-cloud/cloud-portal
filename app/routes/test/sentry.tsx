import { logger } from '@/modules/logger';
import {
  setSentryUser,
  clearSentryUser,
  setLoggerContext,
} from '@/modules/logger/integrations/sentry';
import * as Sentry from '@sentry/react-router';
import { useState } from 'react';
import { Form, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';

// Toggle these to test server-side errors
const ENABLE_LOADER_ERROR = false;
const ENABLE_ACTION_ERROR = false;

export async function loader({ context }: LoaderFunctionArgs) {
  const reqLogger = context.logger;

  // Test logger with context
  reqLogger.info('Sentry test page loaded', {
    feature: 'sentry-test',
    timestamp: new Date().toISOString(),
  });

  if (ENABLE_LOADER_ERROR) {
    reqLogger.error('Test loader error about to be thrown');
    throw new Error('🔥 Test server error from loader - Check Sentry for OTEL correlation!');
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
    throw new Error('🔥 Test server error from action - Check Sentry for OTEL correlation!');
  }

  // Test successful action with logger
  reqLogger.info('Test action executed successfully', {
    feature: 'sentry-test',
    action: 'form-submit',
  });

  return { success: true, message: 'Action completed - Check server logs and Sentry!' };
}

export default function TestSentryPage() {
  const [clientError, setClientError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const triggerClientError = () => {
    try {
      // Add breadcrumb before error
      Sentry.addBreadcrumb({
        message: 'About to trigger client error',
        category: 'test',
        level: 'info',
      });

      // Log before throwing
      logger.error('Test client error about to be thrown', { source: 'test-page' });

      throw new Error('💥 Test client-side error - Check Sentry for stack trace!');
    } catch (error) {
      setClientError(error instanceof Error ? error.message : String(error));
      Sentry.captureException(error);
    }
  };

  const triggerApiError = async () => {
    try {
      setSuccessMessage(null);
      setClientError(null);

      // Add breadcrumb
      Sentry.addBreadcrumb({
        message: 'Making API call to non-existent endpoint',
        category: 'api',
        level: 'info',
      });

      const response = await fetch('/api/nonexistent-endpoint');
      if (!response.ok) {
        throw new Error(
          `🌐 API Error: ${response.status} ${response.statusText} - Check Sentry for request data!`
        );
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { test_type: 'api_error' },
        contexts: {
          api: {
            endpoint: '/api/nonexistent-endpoint',
            method: 'GET',
          },
        },
      });
      setClientError(error instanceof Error ? error.message : String(error));
    }
  };

  const triggerLoggerError = () => {
    // Test logger with Sentry integration
    logger.error('Test error via logger module', {
      test_type: 'logger_integration',
      error_code: 'TEST_ERROR',
      timestamp: new Date().toISOString(),
    });

    setSuccessMessage(
      '✅ Error logged via logger module - Check Sentry for breadcrumb and context!'
    );
  };

  const sendTestMessage = () => {
    Sentry.captureMessage('📨 Test message from Sentry test page', {
      level: 'info',
      tags: { test_type: 'message' },
    });

    logger.info('Test info message via logger', { test_type: 'logger_message' });

    setSuccessMessage('✅ Test message sent to Sentry - Check dashboard!');
  };

  const setUserContextTest = () => {
    // Use logger integration for consistency
    setSentryUser({
      uid: 'test-user-123',
      email: 'test@example.com',
      sub: 'testuser',
    });

    setLoggerContext({
      userId: 'test-user-123',
      organizationId: 'test-org-456',
      requestId: 'test-request-789',
    });

    setSuccessMessage('✅ User context set - All subsequent errors will include user info!');
  };

  const clearUserContextTest = () => {
    clearSentryUser();
    setSuccessMessage('✅ User context cleared!');
  };

  const addBreadcrumbTest = () => {
    // Add multiple breadcrumbs with different categories
    Sentry.addBreadcrumb({
      message: 'User navigation event',
      category: 'navigation',
      level: 'info',
    });

    Sentry.addBreadcrumb({
      message: 'User action performed',
      category: 'user',
      level: 'info',
      data: { action: 'click', target: 'test-button' },
    });

    logger.debug('Test breadcrumb via logger', { breadcrumb_test: true });

    setSuccessMessage('✅ Breadcrumbs added - Trigger an error to see them in Sentry!');
  };

  const testOtelCorrelation = async () => {
    try {
      // Make an API call that will have OTEL trace context
      await fetch('/api/proxy/healthz');

      // Capture this as an event to see OTEL correlation
      Sentry.captureMessage('🔗 Testing OTEL correlation', {
        level: 'info',
        tags: { test_type: 'otel_correlation' },
      });

      setSuccessMessage(
        '✅ OTEL correlation test sent - Check Sentry event for trace.trace_id and trace.span_id!'
      );
    } catch (error) {
      Sentry.captureException(error);
      setClientError('Failed to test OTEL correlation');
    }
  };

  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: '1000px',
        margin: '0 auto',
        fontFamily: 'system-ui, sans-serif',
      }}>
      <h1 style={{ marginBottom: '0.5rem' }}>🧪 Sentry Integration Test Suite</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Comprehensive testing for Sentry + OTEL + Logger integration
      </p>

      {/* Success/Error Messages */}
      {successMessage && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            color: '#155724',
          }}>
          {successMessage}
        </div>
      )}

      {clientError && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            color: '#721c24',
          }}>
          <strong>Error:</strong> {clientError}
        </div>
      )}

      {/* Server-Side Error Tests */}
      <section
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
        }}>
        <h2 style={{ marginTop: 0 }}>🖥️ Server-Side Error Tests</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Tests server-side error capture with OTEL correlation, logger integration, and request
          context.
        </p>

        <Form method="post" style={{ marginBottom: '1rem' }}>
          <button
            type="submit"
            disabled={!ENABLE_ACTION_ERROR}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: ENABLE_ACTION_ERROR ? '#dc3545' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: ENABLE_ACTION_ERROR ? 'pointer' : 'not-allowed',
              fontSize: '1rem',
            }}>
            🔥 Trigger Server Action Error
          </button>
        </Form>

        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            fontSize: '0.85rem',
          }}>
          <strong>⚙️ Configuration:</strong> Set <code>ENABLE_LOADER_ERROR</code> or{' '}
          <code>ENABLE_ACTION_ERROR</code> to <code>true</code> in the source code, then
          refresh/submit.
          <br />
          <br />
          <strong>✅ What to verify in Sentry:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.25rem', paddingLeft: 0 }}>
            <li>
              Event has <code>trace.trace_id</code> and <code>trace.span_id</code>
            </li>
            <li>Request data includes headers, IP, query string, URL</li>
            <li>Breadcrumbs from logger are present</li>
            <li>Authorization/Cookie headers are redacted</li>
          </ul>
        </div>
      </section>

      {/* Client-Side Error Tests */}
      <section
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
        }}>
        <h2 style={{ marginTop: 0 }}>💻 Client-Side Error Tests</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Tests client-side error capture, API errors, and logger integration.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button
            onClick={triggerClientError}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}>
            💥 Trigger Client Error
          </button>

          <button
            onClick={triggerApiError}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#fd7e14',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}>
            🌐 Trigger API Error
          </button>

          <button
            onClick={triggerLoggerError}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#e83e8c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}>
            📝 Trigger Logger Error
          </button>
        </div>

        <div
          style={{
            padding: '1rem',
            backgroundColor: '#d1ecf1',
            border: '1px solid #bee5eb',
            borderRadius: '4px',
            fontSize: '0.85rem',
          }}>
          <strong>✅ What to verify in Sentry:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.25rem', paddingLeft: 0 }}>
            <li>Stack traces with source maps</li>
            <li>Breadcrumbs leading up to error</li>
            <li>Logger integration breadcrumbs</li>
            <li>Custom tags and context data</li>
          </ul>
        </div>
      </section>

      {/* OTEL Correlation Tests */}
      <section
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
        }}>
        <h2 style={{ marginTop: 0 }}>🔗 OTEL Correlation Tests</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Tests OpenTelemetry trace correlation with Sentry events.
        </p>

        <button
          onClick={testOtelCorrelation}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            marginBottom: '1rem',
          }}>
          🔗 Test OTEL Correlation
        </button>

        <div
          style={{
            padding: '1rem',
            backgroundColor: '#e7f3ff',
            border: '1px solid #b3d9ff',
            borderRadius: '4px',
            fontSize: '0.85rem',
          }}>
          <strong>✅ What to verify in Sentry:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.25rem', paddingLeft: 0 }}>
            <li>Open event in Sentry dashboard</li>
            <li>Go to &quot;Additional Data&quot; or &quot;Context&quot; tab</li>
            <li>
              Look for <code>trace.trace_id</code> and <code>trace.span_id</code>
            </li>
            <li>Use these IDs to find the corresponding trace in Grafana Tempo/Jaeger</li>
            <li>Verify the trace shows the same request flow</li>
          </ul>
        </div>
      </section>

      {/* Sentry Features Tests */}
      <section
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
        }}>
        <h2 style={{ marginTop: 0 }}>🎯 Sentry Features Tests</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Tests Sentry features like messages, user context, breadcrumbs, and context enrichment.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button
            onClick={sendTestMessage}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}>
            📨 Send Test Message
          </button>

          <button
            onClick={setUserContextTest}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}>
            👤 Set User Context
          </button>

          <button
            onClick={clearUserContextTest}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}>
            🚫 Clear User Context
          </button>

          <button
            onClick={addBreadcrumbTest}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}>
            🍞 Add Breadcrumbs
          </button>
        </div>

        <div
          style={{
            padding: '1rem',
            backgroundColor: '#f8d7f8',
            border: '1px solid #e7b3e7',
            borderRadius: '4px',
            fontSize: '0.85rem',
          }}>
          <strong>✅ What to verify in Sentry:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.25rem', paddingLeft: 0 }}>
            <li>Messages appear with correct severity level</li>
            <li>User context persists across subsequent events</li>
            <li>Breadcrumbs show user journey chronologically</li>
            <li>Custom tags and context appear in event details</li>
          </ul>
        </div>
      </section>

      {/* Testing Guide */}
      <section style={{ padding: '1.5rem', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0 }}>📋 Complete Testing Checklist</h3>

        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>1. Environment Setup</h4>
          <ul style={{ fontSize: '0.9rem' }}>
            <li>
              Ensure <code>SENTRY_DSN</code> is configured in <code>.env</code>
            </li>
            <li>
              Ensure <code>OTEL_ENABLED=true</code> and OTEL endpoint is configured
            </li>
            <li>
              Start the app: <code>bun run dev</code>
            </li>
            <li>
              Navigate to <code>http://localhost:3000/test/sentry</code>
            </li>
          </ul>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>2. Test Each Category</h4>
          <ul style={{ fontSize: '0.9rem' }}>
            <li>✅ Server-side errors (loader/action)</li>
            <li>✅ Client-side errors</li>
            <li>✅ API errors</li>
            <li>✅ Logger integration</li>
            <li>✅ OTEL correlation</li>
            <li>✅ User context</li>
            <li>✅ Breadcrumbs</li>
            <li>✅ Custom messages</li>
          </ul>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>3. Verify in Sentry Dashboard</h4>
          <ul style={{ fontSize: '0.9rem' }}>
            <li>
              Go to <code>https://sentry.io/organizations/datum/issues/</code>
            </li>
            <li>Find your test events (filter by environment if needed)</li>
            <li>Check event details for OTEL correlation data</li>
            <li>Verify breadcrumbs, user context, and custom tags</li>
            <li>Confirm sensitive headers are redacted</li>
          </ul>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>4. Verify OTEL Correlation</h4>
          <ul style={{ fontSize: '0.9rem' }}>
            <li>
              Copy <code>trace_id</code> from Sentry event
            </li>
            <li>Go to Grafana Tempo/Jaeger</li>
            <li>Search by trace ID</li>
            <li>Verify the trace shows the complete request flow</li>
            <li>Confirm timing data matches</li>
          </ul>
        </div>

        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fff',
            border: '2px solid #28a745',
            borderRadius: '4px',
            fontSize: '0.9rem',
          }}>
          <strong>🎉 Success Criteria:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.25rem', paddingLeft: 0 }}>
            <li>All events appear in Sentry with full context</li>
            <li>OTEL trace IDs present in server-side events</li>
            <li>Breadcrumbs from logger appear in events</li>
            <li>User context persists across events</li>
            <li>Sensitive headers are redacted</li>
            <li>Events can be correlated to OTEL traces</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
