import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // Disallow passing raw response to logFetchResponse (must use .clone())
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='logFetchResponse'] > Identifier.arguments:first-child[name='response']",
          message: "You must use response.clone() when passing to logFetchResponse to avoid locking the body stream."
        }
      ]
    },
  },
];

export default eslintConfig;
