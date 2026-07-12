import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(tseslint.configs.recommended, eslintConfigPrettier, {
  languageOptions: {
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    'linebreak-style': ['error', 'unix'],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_.*',
        varsIgnorePattern: '^_.*',
        caughtErrorsIgnorePattern: '^_.*',
      },
    ],
  },
})
