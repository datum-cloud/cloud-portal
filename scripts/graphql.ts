#!/usr/bin/env bun
// scripts/graphql.ts
/**
 * GraphQL Schema Generation Script
 *
 * Generates Gqlts typed client from a filtered GraphQL schema.
 * Only generates types for selected queries/mutations to keep output small.
 * Saves selections to config file for incremental updates.
 *
 * Usage:
 *   bun run graphql              # Generate from config (or interactive if no config)
 *   bun run graphql -i           # Interactive mode to modify selections
 *   bun run graphql --interactive
 *   bun run graphql --reset      # Clear config and start fresh
 *
 * Workflow:
 *   1. Edit graphql.config.json to add queries/mutations you need
 *   2. Run `bun run graphql` to generate
 */
import { checkbox, confirm, input } from '@inquirer/prompts';
import {
  buildClientSchema,
  getIntrospectionQuery,
  printSchema,
  parse,
  visit,
  print,
  Kind,
  type DocumentNode,
  type IntrospectionQuery,
  type GraphQLSchema,
  type DefinitionNode,
  type TypeDefinitionNode,
} from 'graphql';
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const OUTPUT_DIR = 'app/modules/gqlts/generated';
const TEMP_SCHEMA_FILE = 'temp-filtered-schema.graphql';
const CONFIG_FILE = 'graphql.config.json';

interface GraphQLConfig {
  url?: string;
  queries: string[];
  mutations: string[];
}

/**
 * Loads config from file, returns empty config if not found
 */
async function loadConfig(): Promise<GraphQLConfig> {
  try {
    if (existsSync(CONFIG_FILE)) {
      const content = await readFile(CONFIG_FILE, 'utf-8');
      return JSON.parse(content) as GraphQLConfig;
    }
  } catch {
    // Ignore parse errors, return empty config
  }
  return { queries: [], mutations: [] };
}

/**
 * Saves config to file
 */
async function saveConfig(config: GraphQLConfig): Promise<void> {
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

/**
 * Executes a shell command and returns a promise
 */
function exec(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

/**
 * Fetches the GraphQL schema via introspection (uses curl for large schemas)
 */
async function fetchSchema(url: string): Promise<GraphQLSchema> {
  console.log(`Fetching full schema (this may take a moment)...`);

  const query = getIntrospectionQuery();

  try {
    // Write query to temp file to avoid shell escaping issues
    const tempQueryFile = '/tmp/graphql-introspection-query.json';
    await writeFile(tempQueryFile, JSON.stringify({ query }));

    // Use curl with file input for reliable large response handling
    const result = execSync(
      `curl -s -X POST "${url}" -H "Content-Type: application/json" -d @${tempQueryFile}`,
      {
        maxBuffer: 100 * 1024 * 1024, // 100MB buffer
        timeout: 300000, // 5 minute timeout
      }
    ).toString();

    await rm(tempQueryFile, { force: true });

    const data = JSON.parse(result) as { data: IntrospectionQuery };
    if (!data.data) {
      throw new Error('Invalid introspection response');
    }
    return buildClientSchema(data.data);
  } catch (error) {
    throw new Error(`Failed to fetch schema: ${error}`);
  }
}

/**
 * Gets all query and mutation field names from schema
 */
function getOperations(schema: GraphQLSchema): { queries: string[]; mutations: string[] } {
  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();

  const queries = queryType ? Object.keys(queryType.getFields()) : [];
  const mutations = mutationType ? Object.keys(mutationType.getFields()) : [];

  return { queries, mutations };
}

/**
 * Extracts all type names referenced by a type (recursively)
 */
function extractReferencedTypes(
  schema: GraphQLSchema,
  typeName: string,
  collected: Set<string>
): void {
  if (collected.has(typeName)) return;

  // Skip built-in scalars
  const builtInScalars = ['String', 'Int', 'Float', 'Boolean', 'ID'];
  if (builtInScalars.includes(typeName)) return;

  const type = schema.getType(typeName);
  if (!type) return;

  collected.add(typeName);

  // Get the underlying type name (unwrap NonNull and List)
  const getNamedType = (t: any): string | null => {
    if (t.ofType) return getNamedType(t.ofType);
    return t.name || null;
  };

  // Handle different type kinds
  if ('getFields' in type && typeof type.getFields === 'function') {
    // Object types, Interface types, Input types
    const fields = type.getFields();
    for (const field of Object.values(fields)) {
      const fieldTypeName = getNamedType(field.type);
      if (fieldTypeName) {
        extractReferencedTypes(schema, fieldTypeName, collected);
      }

      // Also check field arguments
      if ('args' in field && field.args) {
        for (const arg of field.args) {
          const argTypeName = getNamedType(arg.type);
          if (argTypeName) {
            extractReferencedTypes(schema, argTypeName, collected);
          }
        }
      }
    }
  }

  if ('getTypes' in type && typeof type.getTypes === 'function') {
    // Union types
    for (const memberType of type.getTypes()) {
      extractReferencedTypes(schema, memberType.name, collected);
    }
  }

  if ('getInterfaces' in type && typeof type.getInterfaces === 'function') {
    // Types implementing interfaces
    for (const iface of type.getInterfaces()) {
      extractReferencedTypes(schema, iface.name, collected);
    }
  }

  if ('getValues' in type && typeof type.getValues === 'function') {
    // Enum types - already added, no further deps
  }
}

/**
 * Collects all types needed for selected operations
 */
function collectRequiredTypes(
  schema: GraphQLSchema,
  selectedQueries: string[],
  selectedMutations: string[]
): Set<string> {
  const requiredTypes = new Set<string>();

  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();

  // Process selected queries
  if (queryType && selectedQueries.length > 0) {
    requiredTypes.add(queryType.name);
    const fields = queryType.getFields();
    for (const queryName of selectedQueries) {
      const field = fields[queryName];
      if (field) {
        // Get return type
        const getNamedType = (t: any): string | null => {
          if (t.ofType) return getNamedType(t.ofType);
          return t.name || null;
        };
        const returnTypeName = getNamedType(field.type);
        if (returnTypeName) {
          extractReferencedTypes(schema, returnTypeName, requiredTypes);
        }
        // Get argument types
        for (const arg of field.args) {
          const argTypeName = getNamedType(arg.type);
          if (argTypeName) {
            extractReferencedTypes(schema, argTypeName, requiredTypes);
          }
        }
      }
    }
  }

  // Process selected mutations
  if (mutationType && selectedMutations.length > 0) {
    requiredTypes.add(mutationType.name);
    const fields = mutationType.getFields();
    for (const mutationName of selectedMutations) {
      const field = fields[mutationName];
      if (field) {
        const getNamedType = (t: any): string | null => {
          if (t.ofType) return getNamedType(t.ofType);
          return t.name || null;
        };
        const returnTypeName = getNamedType(field.type);
        if (returnTypeName) {
          extractReferencedTypes(schema, returnTypeName, requiredTypes);
        }
        for (const arg of field.args) {
          const argTypeName = getNamedType(arg.type);
          if (argTypeName) {
            extractReferencedTypes(schema, argTypeName, requiredTypes);
          }
        }
      }
    }
  }

  return requiredTypes;
}

/**
 * Filters the schema SDL to only include required types and selected operations
 */
function filterSchema(
  schema: GraphQLSchema,
  requiredTypes: Set<string>,
  selectedQueries: string[],
  selectedMutations: string[]
): string {
  const fullSdl = printSchema(schema);
  const ast = parse(fullSdl);

  const filteredDefinitions: DefinitionNode[] = [];

  visit(ast, {
    enter(node) {
      if (node.kind === 'Document') return;

      // Handle schema definition
      if (node.kind === 'SchemaDefinition') {
        filteredDefinitions.push(node);
        return false;
      }

      // Handle type definitions - only include if in requiredTypes
      if (
        node.kind === 'ObjectTypeDefinition' ||
        node.kind === 'InputObjectTypeDefinition' ||
        node.kind === 'InterfaceTypeDefinition' ||
        node.kind === 'UnionTypeDefinition' ||
        node.kind === 'EnumTypeDefinition' ||
        node.kind === 'ScalarTypeDefinition'
      ) {
        const typeDef = node as TypeDefinitionNode;
        const typeName = typeDef.name.value;

        // Only include if it's a required type
        if (requiredTypes.has(typeName)) {
          // For Query/Mutation types, filter to only selected fields
          if (typeName === 'Query' && node.kind === 'ObjectTypeDefinition') {
            const filteredNode = {
              ...node,
              fields: node.fields?.filter((f) => selectedQueries.includes(f.name.value)),
            };
            filteredDefinitions.push(filteredNode as DefinitionNode);
            return false;
          }

          if (typeName === 'Mutation' && node.kind === 'ObjectTypeDefinition') {
            const filteredNode = {
              ...node,
              fields: node.fields?.filter((f) => selectedMutations.includes(f.name.value)),
            };
            filteredDefinitions.push(filteredNode as DefinitionNode);
            return false;
          }

          filteredDefinitions.push(node);
          return false;
        }
      }

      // Skip directive definitions - they reference types we may not include
      // and aren't needed for the typed client
      if (node.kind === 'DirectiveDefinition') {
        return false;
      }

      return false;
    },
  });

  const filteredAst: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions: filteredDefinitions,
  };

  return print(filteredAst);
}

/**
 * Cleanup temporary files
 */
async function cleanup(): Promise<void> {
  if (existsSync(TEMP_SCHEMA_FILE)) {
    await rm(TEMP_SCHEMA_FILE);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isReset = args.includes('--reset');
  const isInteractive = args.includes('-i') || args.includes('--interactive') || isReset;

  console.log('GraphQL Schema Generator (Filtered)');

  try {
    // 1. Load existing config
    const existingConfig = isReset ? { queries: [], mutations: [] } : await loadConfig();
    const hasExistingSelections =
      existingConfig.queries.length > 0 || existingConfig.mutations.length > 0;

    // Determine mode
    const useInteractive = isInteractive || !hasExistingSelections;

    if (isReset) {
      console.log('(Reset mode: starting fresh)\n');
    } else if (useInteractive && hasExistingSelections) {
      console.log('(Interactive mode: modify selections)\n');
      console.log(
        `Existing config: ${existingConfig.queries.length} queries, ${existingConfig.mutations.length} mutations`
      );
    } else if (!hasExistingSelections) {
      console.log('(No config found, entering interactive mode)\n');
      console.log(`Tip: Edit ${CONFIG_FILE} directly to add queries/mutations, then run again.`);
    } else {
      console.log('(Generating from config)\n');
      console.log(
        `Config: ${existingConfig.queries.length} queries, ${existingConfig.mutations.length} mutations`
      );
      console.log(`Tip: Use -i flag to modify selections interactively.\n`);
    }

    // 2. Get GraphQL URL
    const defaultUrl =
      existingConfig.url || process.env.GRAPHQL_URL || 'http://localhost:8080/graphql';
    let graphqlUrl: string;

    if (useInteractive) {
      graphqlUrl = await input({
        message: 'Enter GraphQL URL:',
        default: defaultUrl,
      });
    } else {
      graphqlUrl = defaultUrl;
      console.log(`Using URL: ${graphqlUrl}`);
    }

    // 3. Fetch and introspect schema
    const schema = await fetchSchema(graphqlUrl);
    const { queries, mutations } = getOperations(schema);

    console.log(`Found ${queries.length} queries and ${mutations.length} mutations.\n`);

    let selectedQueries: string[];
    let selectedMutations: string[];

    if (useInteractive) {
      // 4. Interactive: Select queries (pre-check existing selections)
      selectedQueries = await checkbox<string>({
        message: 'Select queries to include (space to select, enter to confirm):',
        choices: queries.map((q) => ({
          name: q,
          value: q,
          checked: existingConfig.queries.includes(q),
        })),
        pageSize: 20,
      });

      // 5. Interactive: Select mutations (pre-check existing selections)
      selectedMutations = await checkbox<string>({
        message: 'Select mutations to include (space to select, enter to confirm):',
        choices: mutations.map((m) => ({
          name: m,
          value: m,
          checked: existingConfig.mutations.includes(m),
        })),
        pageSize: 20,
      });

      if (selectedQueries.length === 0 && selectedMutations.length === 0) {
        console.log('\nNo operations selected. Exiting.');
        return;
      }

      // Save updated config
      const newConfig: GraphQLConfig = {
        url: graphqlUrl,
        queries: selectedQueries,
        mutations: selectedMutations,
      };
      await saveConfig(newConfig);
      console.log(`Saved selections to ${CONFIG_FILE}`);
    } else {
      // Non-interactive: Use config directly
      selectedQueries = existingConfig.queries.filter((q) => queries.includes(q));
      selectedMutations = existingConfig.mutations.filter((m) => mutations.includes(m));

      // Warn about removed operations
      const removedQueries = existingConfig.queries.filter((q) => !queries.includes(q));
      const removedMutations = existingConfig.mutations.filter((m) => !mutations.includes(m));

      if (removedQueries.length > 0 || removedMutations.length > 0) {
        console.log('⚠ Some operations in config no longer exist in schema:');
        removedQueries.forEach((q) => console.log(`  - Query: ${q}`));
        removedMutations.forEach((m) => console.log(`  - Mutation: ${m}`));
        console.log('');
      }

      if (selectedQueries.length === 0 && selectedMutations.length === 0) {
        console.log('No valid operations in config. Run with -i flag to select operations.');
        return;
      }
    }

    console.log(
      `\nSelected ${selectedQueries.length} queries and ${selectedMutations.length} mutations.`
    );

    // 8. Collect required types
    console.log('Analyzing type dependencies...');
    const requiredTypes = collectRequiredTypes(schema, selectedQueries, selectedMutations);
    console.log(`Found ${requiredTypes.size} required types.`);

    // 9. Filter schema
    console.log('Filtering schema...');
    const filteredSdl = filterSchema(schema, requiredTypes, selectedQueries, selectedMutations);

    // 10. Write filtered schema to temp file
    await writeFile(TEMP_SCHEMA_FILE, filteredSdl);
    const sizeKb = (Buffer.byteLength(filteredSdl) / 1024).toFixed(1);
    console.log(`Filtered schema size: ${sizeKb} KB`);

    // 11. Confirm generation (only in interactive mode)
    if (useInteractive) {
      const shouldGenerate = await confirm({
        message: `Generate Gqlts client from filtered schema?`,
        default: true,
      });

      if (!shouldGenerate) {
        console.log('\nCancelled.');
        await cleanup();
        return;
      }
    }

    // 12. Ensure output directory exists
    if (existsSync(OUTPUT_DIR)) {
      await rm(OUTPUT_DIR, { recursive: true });
    }
    await mkdir(OUTPUT_DIR, { recursive: true });

    // 13. Run Gqlts CLI
    console.log(`\nGenerating Gqlts client...`);
    await exec('bunx', ['gqlts', '--schema', TEMP_SCHEMA_FILE, '--output', OUTPUT_DIR, '--esm']);

    // 14. Cleanup
    await cleanup();

    console.log(`\n✓ Generated at ${OUTPUT_DIR}/`);
    console.log('\nIncluded operations:');
    if (selectedQueries.length > 0) {
      console.log('  Queries:');
      selectedQueries.forEach((q) => console.log(`    - ${q}`));
    }
    if (selectedMutations.length > 0) {
      console.log('  Mutations:');
      selectedMutations.forEach((m) => console.log(`    - ${m}`));
    }
  } catch (error) {
    await cleanup();
    if (error instanceof Error && error.message.includes('User force closed')) {
      console.log('\n\nCancelled.');
      process.exit(0);
    }
    console.error('\n✗ Schema generation failed:', error);
    process.exit(1);
  }
}

main();
