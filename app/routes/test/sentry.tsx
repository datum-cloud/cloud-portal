import * as Sentry from '@sentry/react-router';
import { useState } from 'react';
import { Form } from 'react-router';

// Uncomment one of these to test server-side errors:
// export async function loader() {
//   throw new Error('Test server error from loader');
// }

// export async function action() {
//   throw new Error('Test server error from action');
// }

export default function TestSentryPage() {
  const [clientError, setClientError] = useState<string | null>(null);

  const triggerClientError = () => {
    try {
      // Trigger a client-side error
      throw new Error('Test client-side error');
    } catch (error) {
      setClientError(error instanceof Error ? error.message : String(error));
      // This will be captured by Sentry automatically since it's in the component
      throw error;
    }
  };

  const triggerApiError = async () => {
    try {
      // Simulate an API call that fails
      const response = await fetch('/api/nonexistent-endpoint');
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      // Manually capture API errors
      Sentry.captureException(error);
      setClientError(error instanceof Error ? error.message : String(error));
    }
  };

  const sendTestMessage = () => {
    // Send a test message to Sentry
    Sentry.captureMessage('Test message from React Router app', 'info');
    alert('Test message sent to Sentry!');
  };

  const setUserContext = () => {
    // Set user context
    Sentry.setUser({
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'testuser',
    });
    alert('User context set!');
  };

  const addBreadcrumb = () => {
    // Add breadcrumb
    Sentry.addBreadcrumb({
      message: 'User clicked test button',
      category: 'user',
      level: 'info',
    });
    alert('Breadcrumb added!');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🧪 Sentry Integration Test</h1>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Server-Side Error Tests</h2>
        <p>Uncomment loader/action functions in the source code to test server errors.</p>

        <Form method="post" style={{ marginBottom: '1rem' }}>
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}>
            🔥 Trigger Server Action Error
          </button>
        </Form>

        <p style={{ fontSize: '0.9rem', color: '#666' }}>
          Server errors are automatically captured by Sentry when they occur in loaders/actions.
        </p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Client-Side Error Tests</h2>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button
            onClick={triggerClientError}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}>
            💥 Trigger Client Error
          </button>

          <button
            onClick={triggerApiError}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#fd7e14',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}>
            🌐 Trigger API Error
          </button>
        </div>

        {clientError && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              color: '#721c24',
            }}>
            <strong>Error:</strong> {clientError}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Sentry Features Test</h2>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={sendTestMessage}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}>
            📨 Send Test Message
          </button>

          <button
            onClick={setUserContext}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}>
            👤 Set User Context
          </button>

          <button
            onClick={addBreadcrumb}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}>
            🍞 Add Breadcrumb
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#e9ecef',
          borderRadius: '4px',
        }}>
        <h3>📋 Testing Instructions</h3>
        <ol>
          <li>
            <strong>Server Errors:</strong> Uncomment the loader/action functions and refresh the
            page
          </li>
          <li>
            <strong>Client Errors:</strong> Click the &quot;Trigger Client Error&quot; button
          </li>
          <li>
            <strong>API Errors:</strong> Click the &quot;Trigger API Error&quot; button
          </li>
          <li>
            <strong>Messages:</strong> Use other buttons to test Sentry features
          </li>
          <li>
            <strong>Check Sentry:</strong> Go to your Sentry project to see captured events
          </li>
        </ol>

        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
          All errors should appear in your Sentry dashboard with full context, stack traces, and
          user information.
        </p>
      </div>
    </div>
  );
}
