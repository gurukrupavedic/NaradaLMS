import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    '.test-dist/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // .draft-frontend is its own nested workspace with its own config.
    '.draft-frontend/**',
  ]),
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_.*',
          varsIgnorePattern: '^_.*',
          caughtErrorsIgnorePattern: '^_.*',
        },
      ],
    }
  }
])

export default eslintConfig
