/**
 * Permission Testing & Debug Route
 * Development tool for testing RBAC permissions
 */
import { RbacProvider, useHasPermission, usePermissionCheck, PERMISSIONS } from '@/modules/rbac';
import type { PermissionVerb } from '@/modules/rbac';
import { useState } from 'react';
import { LoaderFunctionArgs, data } from 'react-router';
import { useLoaderData } from 'react-router';

export const ROUTE_PATH = '/test/permissions' as const;

interface ILoaderData {
  isDevelopment: boolean;
  organizationId: string | null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Only allow in development
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Extract org ID from query params for testing
  const url = new URL(request.url);
  const organizationId = url.searchParams.get('orgId');

  return data<ILoaderData>({
    isDevelopment,
    organizationId,
  });
};

/**
 * Single Permission Tester Component
 */
function SinglePermissionTester() {
  const [resource, setResource] = useState('workloads');
  const [verb, setVerb] = useState<PermissionVerb>('list');
  const [namespace, setNamespace] = useState('');
  const [group, setGroup] = useState('apps');
  const [name, setName] = useState('');

  const { hasPermission, isLoading, error } = useHasPermission(resource, verb, {
    namespace: namespace || undefined,
    group: group || undefined,
    name: name || undefined,
  });

  return (
    <div className="space-y-4 rounded-lg border border-gray-300 p-6">
      <h2 className="text-xl font-semibold">Single Permission Test</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Resource</label>
          <input
            type="text"
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="e.g., workloads, secrets"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Verb</label>
          <select
            value={verb}
            onChange={(e) => setVerb(e.target.value as PermissionVerb)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
            <option value="get">get</option>
            <option value="list">list</option>
            <option value="watch">watch</option>
            <option value="create">create</option>
            <option value="update">update</option>
            <option value="patch">patch</option>
            <option value="delete">delete</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Group (optional)</label>
          <input
            type="text"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="e.g., apps, core"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Namespace (optional)</label>
          <input
            type="text"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="e.g., default"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="Resource name"
          />
        </div>
      </div>

      <div className="rounded-md bg-gray-50 p-4">
        <h3 className="font-medium text-gray-900">Result:</h3>
        {isLoading && <p className="text-gray-600">Loading...</p>}
        {error && <p className="text-red-600">Error: {error.message}</p>}
        {!isLoading && !error && (
          <div className="mt-2">
            <div
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                hasPermission ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
              {hasPermission ? '✓ Allowed' : '✗ Denied'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Bulk Permission Tester Component
 */
function BulkPermissionTester() {
  const checks = [
    { resource: 'workloads', verb: 'list' as PermissionVerb, group: 'apps' },
    { resource: 'workloads', verb: 'create' as PermissionVerb, group: 'apps' },
    { resource: 'workloads', verb: 'update' as PermissionVerb, group: 'apps' },
    { resource: 'workloads', verb: 'delete' as PermissionVerb, group: 'apps' },
    { resource: 'secrets', verb: 'list' as PermissionVerb },
    { resource: 'secrets', verb: 'create' as PermissionVerb },
    { resource: 'configmaps', verb: 'list' as PermissionVerb },
    { resource: 'configmaps', verb: 'create' as PermissionVerb },
  ];

  const { permissions, isLoading, error } = usePermissionCheck(checks);

  return (
    <div className="space-y-4 rounded-lg border border-gray-300 p-6">
      <h2 className="text-xl font-semibold">Bulk Permission Test</h2>
      <p className="text-sm text-gray-600">Testing common resource permissions</p>

      {isLoading && <p className="text-gray-600">Loading...</p>}
      {error && <p className="text-red-600">Error: {error.message}</p>}

      {!isLoading && !error && (
        <div className="space-y-2">
          {checks.map((check) => {
            const key = `${check.resource}:${check.verb}`;
            const permission = permissions[key];

            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border border-gray-200 p-3">
                <div>
                  <span className="font-medium">{check.resource}</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="font-mono text-sm">{check.verb}</span>
                  {check.group && (
                    <span className="ml-2 text-xs text-gray-500">({check.group})</span>
                  )}
                </div>
                <div
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    permission?.allowed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {permission?.allowed ? '✓ Allowed' : '✗ Denied'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Predefined Permissions Display
 */
function PredefinedPermissions() {
  return (
    <div className="space-y-4 rounded-lg border border-gray-300 p-6">
      <h2 className="text-xl font-semibold">Predefined Permissions</h2>
      <p className="text-sm text-gray-600">Available permission constants</p>

      <div className="space-y-4">
        {Object.entries(PERMISSIONS).map(([resourceType, verbs]) => (
          <div key={resourceType}>
            <h3 className="font-medium text-gray-900">{resourceType}</h3>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {Object.entries(verbs).map(([verbName, config]) => (
                <div key={verbName} className="rounded bg-gray-100 p-2 text-sm">
                  <div className="font-mono text-xs">{verbName}</div>
                  <div className="text-xs text-gray-600">
                    {config.resource}:{config.verb}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Main Permission Debug Page
 */
export default function PermissionsDebugPage() {
  const { isDevelopment, organizationId } = useLoaderData<ILoaderData>();

  if (!isDevelopment) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border border-red-300 bg-red-50 p-6">
          <h1 className="text-xl font-semibold text-red-800">Access Denied</h1>
          <p className="mt-2 text-red-600">This route is only available in development mode.</p>
        </div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-6">
          <h1 className="text-xl font-semibold text-yellow-800">Organization ID Required</h1>
          <p className="mt-2 text-yellow-600">
            Please provide an organization ID in the query string:
          </p>
          <code className="mt-2 block rounded bg-yellow-100 p-2 text-sm">
            /test/permissions?orgId=YOUR_ORG_ID
          </code>
        </div>
      </div>
    );
  }

  return (
    <RbacProvider organizationId={organizationId}>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">RBAC Permission Debugger</h1>
            <p className="mt-2 text-gray-600">
              Test and debug permission checks in development mode
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Organization ID:{' '}
              <code className="rounded bg-gray-200 px-2 py-1">{organizationId}</code>
            </p>
          </div>

          <SinglePermissionTester />
          <BulkPermissionTester />
          <PredefinedPermissions />
        </div>
      </div>
    </RbacProvider>
  );
}
