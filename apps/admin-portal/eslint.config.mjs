/** @type {import("eslint").Linter.Config} */
import sharedConfig from "@narada/eslint-config";

const config = [
  { ignores: [".next/**", "dist/**"] },
  ...sharedConfig,
];

export default config;
