// Removes the cdn.zudoku.dev preconnect hint from every built HTML page.
// Nothing is ever fetched from that host (the favicon fallback is overridden),
// so the hint is the only remaining vendor reference in the output.
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const NEEDLE = '<link rel="preconnect" href="https://cdn.zudoku.dev/">';

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path);
    } else if (name.endsWith(".html")) {
      const html = readFileSync(path, "utf8");
      if (html.includes(NEEDLE)) {
        writeFileSync(path, html.replaceAll(NEEDLE, ""));
      }
    }
  }
}

walk("dist");
console.log("stripped cdn.zudoku.dev preconnect from dist html");
