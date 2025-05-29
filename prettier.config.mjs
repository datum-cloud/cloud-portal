/** @type {import("prettier").Config} */
const config = {
  // Core formatting
  printWidth: 100, // Modern screens are wider, allows for better readability
  tabWidth: 2, // Standard in React community
  useTabs: false, // Spaces are more consistent across editors
  semi: true, // Explicit semicolons reduce potential ASI issues
  singleQuote: true, // Single quotes are more common in React
  jsxSingleQuote: false,
  trailingComma: 'es5', // Helps with cleaner git diffs

  // JSX specific
  bracketSpacing: true, // Spaces in object literals
  bracketSameLine: true, // Keep closing bracket on same line
  singleAttributePerLine: false, // Keep attributes on same line unless too long
  arrowParens: 'always', // Consistent arrow function parentheses

  // React specific
  endOfLine: 'lf', // Consistent line endings across platforms
  quoteProps: 'as-needed', // Only quote object properties when necessary

  // Plugins
  plugins: [
    '@trivago/prettier-plugin-sort-imports', // Keep imports organized
    'prettier-plugin-tailwindcss', // Tailwind class sorting
  ],
};

export { config as default };
