import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**/*',
      'dist-electron/**/*',
      'dist-minimal/**/*',
      'node_modules/**/*',
      'coverage/**/*',
      'build/**/*',
      '*.config.js',
      '*.config.ts',
      // Exclude test/debug files that use console statements
      'test-*.js',
      'debug-*.js',
      'capture-*.js',
      'detailed-*.js',
      'module-*.js',
      'analyze-*.js',
      'simple-test.js',
      // Exclude additional vite configs that aren't in tsconfig
      'vite.config.*.ts',
      // Exclude build scripts
      'build-*.js',
      'prepare-*.js',
      'release.js',
      // Exclude backup and test server files
      'server/index-backup.js',
      'server/index-with-logging.js',
      'server/test-*.js',
      'server/minimal-server.js',
      // Exclude test files
      'src/test/**/*',
      'src/tests/**/*',
      '**/*.test.ts',
      '**/*.test.tsx'
    ]
  },
  {
    // TypeScript files with type checking
    extends: [
      js.configs.recommended, 
      ...tseslint.configs.recommended,
      ...tseslint.configs.strict,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
      },
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React Hooks rules
      ...reactHooks.configs.recommended.rules,
      
      // React Refresh rules
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // TypeScript strict rules (relaxed for CI)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' }
      ],
      '@typescript-eslint/consistent-type-exports': 'error',

      // Code quality rules (relaxed for CI)
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'warn',
      'no-var': 'warn',
      'prefer-const': 'warn',
      'prefer-arrow-callback': 'warn',
      'arrow-body-style': 'warn',
      'object-shorthand': 'warn',
      'prefer-template': 'warn',
      'template-curly-spacing': ['error', 'never'],
      'no-useless-concat': 'warn',
      'no-useless-escape': 'warn',
      'no-duplicate-imports': 'warn',
      'no-unused-vars': 'warn',
      'no-undef': 'warn',

      // Code style rules
      'indent': ['error', 2, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
      'keyword-spacing': 'error',
      'space-infix-ops': 'error',
      'eol-last': 'error',
      'no-trailing-spaces': 'error',
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],

      // Import/Export rules
      'sort-imports': ['error', {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        allowSeparatedGroups: true,
      }],

      // Performance rules
      'react-hooks/exhaustive-deps': 'warn',

      // Error handling
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    // JavaScript files (no type checking)
    extends: [js.configs.recommended],
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React Hooks rules
      ...reactHooks.configs.recommended.rules,
      
      // React Refresh rules
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Basic rules for JS files
      'no-unused-vars': [
        'error',
        { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_'
        }
      ],

      // Code quality rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'template-curly-spacing': ['error', 'never'],
      'no-useless-concat': 'error',
      'no-useless-escape': 'error',
      'no-duplicate-imports': 'error',

      // Code style rules
      'indent': ['error', 2, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
      'keyword-spacing': 'error',
      'space-infix-ops': 'error',
      'eol-last': 'error',
      'no-trailing-spaces': 'error',
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],

      // Import/Export rules
      'sort-imports': ['error', {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        allowSeparatedGroups: true,
      }],

      // Performance rules
      'react-hooks/exhaustive-deps': 'warn',

      // Error handling
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    // Test files configuration
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests for mocking
      'no-console': 'off', // Allow console in tests
    },
  },
  {
    // Node.js files configuration
    files: ['electron/**/*.{js,ts}', 'server/**/*.{js,ts}', 'scripts/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off', // Allow console in Node.js files
      '@typescript-eslint/no-require-imports': 'off', // Allow require in Node.js files where needed
    },
  }
);
