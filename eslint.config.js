import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist', '**/.next/**', '**/.next-*/**', '**/node_modules/**', '**/next-env.d.ts'] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_'
                }
            ],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unused-expressions': 'warn',
            '@typescript-eslint/no-namespace': 'warn',
            '@typescript-eslint/triple-slash-reference': 'off',
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/incompatible-library': 'warn',
            'no-empty': 'warn',
            'prefer-const': 'warn',
            '@typescript-eslint/no-empty-object-type': 'warn',
            'react-hooks/immutability': 'warn',
            'react-hooks/preserve-manual-memoization': 'warn',
            'react-hooks/purity': 'warn',
            'react-hooks/refs': 'warn',
            },
    },
);






