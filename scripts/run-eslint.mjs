import { ESLint } from "eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslint = new ESLint({
  concurrency: "off",
  overrideConfigFile: true,
  overrideConfig: defineConfig([
    ...nextVitals,
    ...nextTs,
    globalIgnores([
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ]),
  ]),
});

const results = await eslint.lintFiles([
  "app",
  "src",
  "tests",
  "next.config.ts",
  "vitest.config.ts",
]);

const formatter = await eslint.loadFormatter("stylish");
const output = formatter.format(results);

if (output) {
  process.stdout.write(output);
}

const hasErrors = results.some(
  (result) => result.errorCount > 0 || result.fatalErrorCount > 0,
);

process.exit(hasErrors ? 1 : 0);
