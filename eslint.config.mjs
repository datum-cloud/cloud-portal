import { fixupPluginRules } from '@eslint/compat';
import prettierConfig from './prettier.config.mjs';
import eslintPluginJsxA11y from 'eslint-plugin-jsx-a11y';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

export default [
  // Global ignores (must be separate config object)
  {
    ignores: ['app/modules/gqlts/generated/**', 'app/modules/control-plane/**/client.gen.ts'],
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
      ...tseslint.configs.recommendedTypeChecked[0].rules,
      ...eslintPluginReact.configs.recommended.rules,
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginPrettier.configs.recommended.rules,
      'prettier/prettier': ['error', prettierConfig],
      'react/react-in-jsx-scope': 'off',
      'react-hooks/exhaustive-deps': 'off',

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

      'no-unused-vars': 'off', // or "@typescript-eslint/no-unused-vars": "off",
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
];
