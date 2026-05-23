import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const OLD_SNIPPET = "import('${splitUrl}')";
const NEW_SNIPPET = "import(${JSON.stringify(splitUrl)})";

const files = [
  "node_modules/@tanstack/router-plugin/dist/esm/core/code-splitter/compilers.js",
  "node_modules/@tanstack/router-plugin/dist/cjs/core/code-splitter/compilers.cjs",
  "node_modules/@tanstack/router-plugin/src/core/code-splitter/compilers.ts",
];

let patchedFiles = 0;
let alreadyPatchedFiles = 0;

for (const relativeFile of files) {
  const absoluteFile = path.resolve(relativeFile);

  if (!existsSync(absoluteFile)) {
    continue;
  }

  const source = readFileSync(absoluteFile, "utf8");

  if (source.includes(NEW_SNIPPET)) {
    alreadyPatchedFiles += 1;
    continue;
  }

  if (!source.includes(OLD_SNIPPET)) {
    continue;
  }

  writeFileSync(absoluteFile, source.replaceAll(OLD_SNIPPET, NEW_SNIPPET), "utf8");
  patchedFiles += 1;
}

console.log(
  `[patch-tanstack-router-plugin] patched=${patchedFiles} already=${alreadyPatchedFiles}`,
);
