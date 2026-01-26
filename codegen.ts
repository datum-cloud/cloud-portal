import type { CodegenConfig } from '@graphql-codegen/cli';
import * as dotenv from 'dotenv';

dotenv.config();

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_URL ?? '';

const config: CodegenConfig = {
  overwrite: true,
  // Point schema to the gateway to fetch the latest schema introspection
  schema: {
    [GRAPHQL_ENDPOINT]: {
      headers: {},
    },
  },
  // Paths to your GraphQL operation files
  documents: ['./app/resources/**/*.graphql'],
  generates: {
    './app/modules/graphql/gen/': {
      preset: 'client',
      config: {
        // Map custom scalars to TypeScript types
        scalars: {
          DateTime: 'string',
          Date: 'string',
          Time: 'string',
          JSON: 'Record<string, any>',
        },
        enumsAsTypes: true,
        skipTypename: true,
        documentMode: 'string', // recommended for smaller bundles
      },
    },
  },
};

export default config;
