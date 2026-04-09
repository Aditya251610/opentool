import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [
  {
    files: ['src/**/*.ts', 'tools/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-debugger': 'error',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.*'],
  },
]
