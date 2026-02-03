const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
});

module.exports = [
    ...compat.extends("next/core-web-vitals", "turbo", "prettier"),
    {
        rules: {
            "@next/next/no-html-link-for-pages": "off",
            "react/jsx-key": "off",
        },
    },
];
