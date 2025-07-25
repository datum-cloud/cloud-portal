import prettierConfig from './prettier.config.mjs';
import eslintPluginJsxA11y from 'eslint-plugin-jsx-a11y';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['!**/.server', '!**/.client', 'remix.init/*', 'public/js/elk-worker.min.js'],
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
      react: eslintPluginReact,
      'react-hooks': eslintPluginReactHooks,
      // import: eslintPluginImport,
      'jsx-a11y': eslintPluginJsxA11y,
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
      // 'import/order': [
      //   'warn',
      //   {
      //     groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      //     'newlines-between': 'never',
      //   },
      // ],
      'react-hooks/exhaustive-deps': 'off',

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
