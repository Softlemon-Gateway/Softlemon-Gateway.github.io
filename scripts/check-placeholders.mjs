// Fails the build when a drafting placeholder is still in the published pages.
// TODO-FACT marks a fact that was unknown when a page was written; it must be
// resolved or reworded before the page ships. Runs as part of `npm run build`
// (prebuild), so it blocks both local builds and the deploy-pages workflow.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const PAGES = join(ROOT, "pages");
const MARKER = /TODO-FACT/;

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const hits = [];
for (const file of walk(PAGES)) {
  if (!/\.(md|mdx)$/.test(file)) continue;
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (MARKER.test(line)) hits.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
    });
}

if (hits.length) {
  console.error("Unresolved TODO-FACT placeholders in pages/ — resolve or reword before publishing:");
  for (const hit of hits) console.error(`  ${hit}`);
  process.exit(1);
}

console.log("No TODO-FACT placeholders in pages/.");
