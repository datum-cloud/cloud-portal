import prettierConfig from './prettier.config.mjs';
import { fixupPluginRules } from '@eslint/compat';
import eslintPluginJsxA11y from 'eslint-plugin-jsx-a11y';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

export default [
  // Global ignores (must be separate config object)
  {
    // Generated code: @hey-api/openapi-ts writes the control-plane *.gen.ts
    // files, so a hand fix there is lost on the next `bun run openapi`.
    ignores: ['app/modules/gqlts/generated/**', 'app/modules/control-plane/**/*.gen.ts'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: [
      '!**/.server',
      '!**/.client',
      'remix.init/*',
      'public/js/elk-worker.min.js',
      'node_modules/*',
      'react-router/*',
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
        ecmaVersion: 'latest',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      react: fixupPluginRules(eslintPluginReact),
      'react-hooks': fixupPluginRules(eslintPluginReactHooks),
      'jsx-a11y': fixupPluginRules(eslintPluginJsxA11y),
      prettier: eslintPluginPrettier,
      'unused-imports': unusedImports,
    },
    rules: {
      // recommendedTypeChecked is an array of config objects and only some of
      // them carry rules. Merge every entry's rules rather than picking by
      // index: spreading [0] alone once left all of them off without a sign.
      ...Object.assign({}, ...tseslint.configs.recommendedTypeChecked.map((c) => c.rules ?? {})),
      ...eslintPluginReact.configs.recommended.rules,
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginPrettier.configs.recommended.rules,
      'prettier/prettier': ['error', prettierConfig],
      'react/react-in-jsx-scope': 'off',
      'react-hooks/exhaustive-deps': 'warn',

      // Disable React Compiler rules (React 19) - not using React Compiler yet
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',

      // Keep text sizes on the datum-ui type scale (Storybook → Docs/Type
      // Scale). An arbitrary size can't be retuned with the scale, and a raw
      // size class on a plain element is body text that belongs in <Text>.
      // Size overrides on components (CardTitle, Badge, TableCell, …) are
      // that component's own scale and stay allowed.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name="className"] Literal[value=/text-\\[[0-9.]+(px|rem)\\]/]',
          message:
            'Arbitrary text size. Use a named step from the type scale (text-5xs … text-8xl) so a change to the scale reaches this too.',
        },
        {
          selector:
            'JSXOpeningElement[name.name=/^(span|p|div|h[1-6])$/] > JSXAttribute[name.name="className"] Literal[value=/(^|\\s)text-(5xs|4xs|3xs|2xs|xs|sm|base|lg|xl|[2-9]xl)($|\\s)/]',
          message:
            'Raw text size on a plain element. Render body text with <Text> / <Paragraph> / <Title> from @datum-cloud/datum-ui/typography, which takes the size as a prop.',
        },
      ],

      // Promise safety: unawaited and misused promises are bugs, so these fail
      // the build. JSX attributes are exempt because React ignores a
      // handler's return value (typescript-eslint's documented React setting).
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],

      // The rest of recommendedTypeChecked is baselined at warn and burned
      // down over time. Counts are the hits when the rule was turned on.
      '@typescript-eslint/no-unsafe-member-access': 'warn', // 788
      '@typescript-eslint/no-unsafe-assignment': 'warn', // 448
      '@typescript-eslint/no-explicit-any': 'warn', // 405
      '@typescript-eslint/require-await': 'warn', // 374
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn', // 235
      '@typescript-eslint/no-unsafe-return': 'warn', // 195
      '@typescript-eslint/no-unsafe-argument': 'warn', // 181
      '@typescript-eslint/no-unsafe-call': 'warn', // 93
      '@typescript-eslint/await-thenable': 'warn', // 46
      '@typescript-eslint/no-redundant-type-constituents': 'warn', // 32
      '@typescript-eslint/restrict-template-expressions': 'warn', // 21
      '@typescript-eslint/only-throw-error': 'warn', // 17
      '@typescript-eslint/no-base-to-string': 'warn', // 16
      '@typescript-eslint/no-duplicate-type-constituents': 'warn', // 11
      '@typescript-eslint/unbound-method': 'warn', // 11
      '@typescript-eslint/no-unsafe-enum-comparison': 'warn', // 7
      '@typescript-eslint/no-empty-object-type': 'warn', // 7
      '@typescript-eslint/prefer-promise-reject-errors': 'warn', // 3
      '@typescript-eslint/no-implied-eval': 'warn', // 1
      '@typescript-eslint/ban-ts-comment': 'warn', // 1
      '@typescript-eslint/no-require-imports': 'warn', // 1

      // Use the logger module (app/modules/logger) instead of console.
      'no-console': 'warn',

      // unused-imports/no-unused-vars below covers this and can autofix
      // imports, so the base and typescript-eslint versions stay off.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    // The logger is the one place allowed to write to the console.
    files: ['app/modules/logger/**'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Bun tests call mock.module() without awaiting it; those suites are being
    // rewritten in the Node migration (#1755), so warn here instead of editing them.
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'warn',
    },
  },
  {
    // Auth, RBAC and server code are being reworked separately; their promise
    // hits stay visible as warnings until that work lands.
    files: [
      'app/routes/auth/**',
      'app/utils/auth/**',
      'app/modules/auth/**',
      'app/modules/rbac/**',
      'app/server/**',
    ],
    rules: {
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': [
        'warn',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    // GraphQL operations are built only inside runGqlQuery / runGqlMutation
    // (app/modules/graphql/client.ts), which name every op via a required
    // argument — so none can go out as `Anonymous` and lose slow-query tracing.
    // Everything else calls those helpers, never the raw genql builder. See #1590.
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['app/modules/graphql/client.ts', 'app/modules/graphql/generated/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/modules/graphql/generated',
              importNames: ['generateQueryOp', 'generateMutationOp'],
              message:
                'Build GraphQL operations with runGqlQuery / runGqlMutation (they name every op); do not call the raw genql builder. See #1590.',
            },
          ],
        },
      ],
    },
  },
];
