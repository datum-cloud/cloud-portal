#!/usr/bin/env bun
/**
 * OpenAPI Generation Script
 *
 * Interactive script to generate control-plane SDK modules from OpenAPI specs.
 *
 * Usage: bun run openapi
 */
import { createClient, defaultPlugins } from '@hey-api/openapi-ts';
import { input, checkbox, confirm } from '@inquirer/prompts';
import { existsSync } from 'node:fs';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const CONTROL_PLANE_DIR = 'app/modules/control-plane';
const TEMP_SPEC_FILE = 'temp-openapi-spec.json';

interface ResourceSelection {
  resource: string;
  folder: string;
  serverRelativeURL: string;
}

interface ResourceInfo {
  path: string;
  serverRelativeURL: string;
}

/**
 * Fetch the list of available OpenAPI resources from the API
 */
async function fetchResourceList(apiUrl: string, token: string): Promise<ResourceInfo[]> {
  const url = `${apiUrl}/openapi/v3`;

  console.log(`\nFetching available resources from ${url}...`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch resources: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Extract paths that look like OpenAPI resource paths
  // Format: "apis/{group}/{version}" -> has a serverRelativeURL with hash
  const resources: ResourceInfo[] = [];

  if (data.paths) {
    for (const [path, value] of Object.entries(data.paths)) {
      // Only include paths that:
      // 1. Start with "apis/"
      // 2. Have a version (v1, v1alpha1, etc.) - indicated by containing a "/"
      // 3. Have a serverRelativeURL
      if (path.startsWith('apis/') && typeof value === 'object' && value !== null) {
        const pathObj = value as Record<string, unknown>;
        // Check if it has a version segment (e.g., apis/iam.miloapis.com/v1alpha1)
        const segments = path.split('/');
        if (segments.length >= 3 && pathObj.serverRelativeURL) {
          resources.push({
            path,
            serverRelativeURL: pathObj.serverRelativeURL as string,
          });
        }
      }
    }
  }

  return resources.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Fetch the OpenAPI spec using the serverRelativeURL
 */
async function fetchSpec(
  apiUrl: string,
  token: string,
  serverRelativeURL: string
): Promise<object> {
  // serverRelativeURL is like "/openapi/v3/apis/iam.miloapis.com/v1alpha1?hash=..."
  const url = `${apiUrl}${serverRelativeURL}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch spec: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Extract folder name suggestion from resource path
 * "apis/iam.miloapis.com/v1alpha1" -> "iam"
 * "apis/dns-networking.miloapis.com/v1alpha1" -> "dns-networking"
 */
function extractFolderName(resource: string): string {
  const match = resource.match(/apis\/([^.]+)/);
  return match?.[1] ?? 'unknown';
}

/**
 * Fix imports in sdk.gen.ts to use shared client
 */
async function fixImports(filePath: string): Promise<void> {
  let content = await readFile(filePath, 'utf-8');

  // Fix import patterns to use shared client
  content = content
    // Fix: import { client } from './client.gen' -> '../shared/client.gen'
    .replace(/from ['"]\.\/client\.gen['"]/g, "from '../shared/client.gen'")
    // Fix: import type { ... } from './client' -> '../shared/client'
    .replace(/from ['"]\.\/client['"]/g, "from '../shared/client'")
    // Fix any ../client patterns
    .replace(/from ['"]\.\.\/client\.gen['"]/g, "from '../shared/client.gen'")
    .replace(/from ['"]\.\.\/client['"]/g, "from '../shared/client'")
    // Fix core imports if any
    .replace(/from ['"]\.\/core\//g, "from '../shared/core/")
    .replace(/from ['"]\.\.\/core\//g, "from '../shared/core/");

  await writeFile(filePath, content);
}

/**
 * Generate a single control-plane module
 */
async function generateModule(
  apiUrl: string,
  token: string,
  serverRelativeURL: string,
  folder: string
): Promise<boolean> {
  const outputDir = join(CONTROL_PLANE_DIR, folder);

  console.log(`\nGenerating ${folder}...`);

  try {
    // Check if folder exists
    if (existsSync(outputDir)) {
      const overwrite = await confirm({
        message: `  ${folder}/ already exists. Overwrite?`,
        default: false,
      });
      if (!overwrite) {
        console.log(`  Skipped ${folder}`);
        return false;
      }
    }

    // 1. Fetch the spec
    console.log(`  Fetching spec...`);
    const spec = await fetchSpec(apiUrl, token, serverRelativeURL);

    // 2. Write temp spec file (hey-api needs a file path)
    await writeFile(TEMP_SPEC_FILE, JSON.stringify(spec, null, 2));

    // 3. Run hey-api programmatically
    console.log(`  Running hey-api/openapi-ts...`);
    await createClient({
      input: TEMP_SPEC_FILE,
      output: outputDir,
      plugins: [
        ...defaultPlugins,
        '@hey-api/schemas',
        {
          enums: 'javascript',
          name: '@hey-api/typescript',
        },
      ],
    });

    // 5. Remove client/, core/, client.gen.ts (we use shared)
    console.log(`  Cleaning up generated client files...`);
    const clientDir = join(outputDir, 'client');
    const coreDir = join(outputDir, 'core');
    const clientGenFile = join(outputDir, 'client.gen.ts');

    if (existsSync(clientDir)) {
      await rm(clientDir, { recursive: true });
    }
    if (existsSync(coreDir)) {
      await rm(coreDir, { recursive: true });
    }
    if (existsSync(clientGenFile)) {
      await rm(clientGenFile);
    }

    // 6. Fix imports in sdk.gen.ts
    console.log(`  Fixing imports...`);
    const sdkGenFile = join(outputDir, 'sdk.gen.ts');
    if (existsSync(sdkGenFile)) {
      await fixImports(sdkGenFile);
    }

    console.log(`  ✓ Generated → ${outputDir}/`);
    return true;
  } catch (error) {
    console.error(`  ✗ Failed to generate ${folder}:`, error);
    return false;
  }
}

/**
 * Cleanup temporary files
 */
async function cleanup(): Promise<void> {
  if (existsSync(TEMP_SPEC_FILE)) {
    await rm(TEMP_SPEC_FILE);
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('OpenAPI Control-Plane Generator\n');

  try {
    // 1. Get credentials
    const apiUrl = await input({
      message: 'Enter API URL:',
      default: process.env.API_URL || 'https://api.datum.net',
    });

    const token = await input({
      message: 'Enter Bearer Token:',
      default: process.env.API_TOKEN,
      transformer: (value) =>
        value.length > 20 ? `${value.slice(0, 20)}...${value.slice(-4)}` : value,
    });

    if (!token) {
      console.error('Token is required');
      process.exit(1);
    }

    // 2. Fetch available resources
    let resources: ResourceInfo[];
    try {
      resources = await fetchResourceList(apiUrl, token);
    } catch (error) {
      console.error('\nFailed to fetch resources:', error);
      process.exit(1);
    }

    if (resources.length === 0) {
      console.log('\nNo OpenAPI resources found.');
      process.exit(0);
    }

    console.log(`\nFound ${resources.length} available resources.\n`);

    // 3. Select resources to generate
    const selected = await checkbox<ResourceInfo>({
      message: 'Select resources to generate (space to select, enter to confirm):',
      choices: resources.map((r, i) => ({
        name: `${String(i + 1).padStart(2)}. ${r.path}`,
        value: r,
      })),
      pageSize: 15,
    });

    if (selected.length === 0) {
      console.log('\nNo resources selected. Exiting.');
      process.exit(0);
    }

    // 4. Get folder names for each selected resource
    console.log('\nConfigure output folders:\n');
    const toGenerate: ResourceSelection[] = [];

    for (const resource of selected) {
      const suggested = extractFolderName(resource.path);
      const folder = await input({
        message: `Folder name for ${resource.path}:`,
        default: suggested,
        validate: (value) => {
          if (!value.match(/^[a-z0-9-]+$/)) {
            return 'Folder name must be lowercase letters, numbers, and hyphens only';
          }
          return true;
        },
      });
      toGenerate.push({
        resource: resource.path,
        folder,
        serverRelativeURL: resource.serverRelativeURL,
      });
    }

    // 5. Generate each module
    console.log('\n' + '─'.repeat(50));

    let successCount = 0;
    for (const { serverRelativeURL, folder } of toGenerate) {
      const success = await generateModule(apiUrl, token, serverRelativeURL, folder);
      if (success) successCount++;
    }

    // 6. Cleanup
    await cleanup();

    // 7. Summary
    console.log('\n' + '─'.repeat(50));
    console.log(`\nDone! Generated ${successCount}/${toGenerate.length} modules.`);

    if (successCount > 0) {
      console.log('\nGenerated modules:');
      for (const { folder } of toGenerate) {
        console.log(`  - ${CONTROL_PLANE_DIR}/${folder}/`);
      }
    }
  } catch (error) {
    // Handle user cancellation (Ctrl+C)
    if (error instanceof Error && error.message.includes('User force closed')) {
      console.log('\n\nCancelled.');
      process.exit(0);
    }
    throw error;
  } finally {
    await cleanup();
  }
}

// Run
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
