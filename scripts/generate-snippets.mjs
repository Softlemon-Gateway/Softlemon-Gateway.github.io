// Regenerates the multi-language request snippets in pages/guides/*.mdx.
//
// Each guide step is defined once in scripts/snippets/requests.mjs. This script
// renders it through the same @scalar/snippetz plugins Zudoku uses for the API
// reference sidecar, so guide snippets and reference snippets always match.
// Content between {/* snippet:<guide>:<step> */} and {/* /snippet */} markers
// is replaced wholesale. Run with: npm run snippets

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { csharpHttpclient } from "@scalar/snippetz/plugins/csharp/httpclient";
import { goNative } from "@scalar/snippetz/plugins/go/native";
import { javaOkhttp } from "@scalar/snippetz/plugins/java/okhttp";
import { jsFetch } from "@scalar/snippetz/plugins/js/fetch";
import { kotlinOkhttp } from "@scalar/snippetz/plugins/kotlin/okhttp";
import { objcNsurlsession } from "@scalar/snippetz/plugins/objc/nsurlsession";
import { phpCurl } from "@scalar/snippetz/plugins/php/curl";
import { pythonRequests } from "@scalar/snippetz/plugins/python/requests";
import { rubyNative } from "@scalar/snippetz/plugins/ruby/native";
import { shellCurl } from "@scalar/snippetz/plugins/shell/curl";
import { swiftNsurlsession } from "@scalar/snippetz/plugins/swift/nsurlsession";
import { BASE_URL, guides } from "./snippets/requests.mjs";

const GUIDES_DIR = new URL("../pages/guides/", import.meta.url).pathname;

// Same set and order as the reference sidecar (EXAMPLE_LANGUAGES in Zudoku).
const LANGUAGES = [
  { fence: "shell", title: "cURL", plugin: shellCurl },
  { fence: "js", title: "JavaScript", plugin: jsFetch },
  { fence: "python", title: "Python", plugin: pythonRequests },
  { fence: "java", title: "Java", plugin: javaOkhttp },
  { fence: "go", title: "Go", plugin: goNative },
  { fence: "csharp", title: "C#", plugin: csharpHttpclient },
  { fence: "kotlin", title: "Kotlin", plugin: kotlinOkhttp },
  { fence: "objc", title: "Objective-C", plugin: objcNsurlsession },
  { fence: "php", title: "PHP", plugin: phpCurl },
  { fence: "ruby", title: "Ruby", plugin: rubyNative },
  { fence: "swift", title: "Swift", plugin: swiftNsurlsession },
];

const toHar = (step) => {
  const url = new URL(step.path, BASE_URL);
  for (const [name, value] of Object.entries(step.query ?? {})) {
    url.searchParams.set(name, value);
  }
  const headers = [{ name: "Authorization", value: "Bearer {YOUR_API_KEY}" }];
  // Opt-in extra headers (e.g. Idempotency-Key), never added to GET steps.
  for (const [name, value] of Object.entries(step.headers ?? {})) {
    headers.push({ name, value });
  }
  const har = {
    url: url.toString(),
    method: step.method,
    httpVersion: "HTTP/1.1",
    headers,
    queryString: [],
    cookies: [],
    headersSize: -1,
    bodySize: -1,
  };
  if (step.body !== undefined) {
    headers.unshift({ name: "Content-Type", value: "application/json" });
    har.postData = {
      mimeType: "application/json",
      text: JSON.stringify(step.body, null, 2),
    };
  }
  return har;
};

const renderTabs = (guide, stepId, step) => {
  const har = toHar(step);
  const blocks = LANGUAGES.map(({ fence, title, plugin }) => {
    const source = plugin.generate(har).trimEnd();
    return `\`\`\`${fence} title="${title}"\n${source}\n\`\`\``;
  });
  return [
    `{/* snippet:${guide}:${stepId} */}`,
    `<CodeTabs syncKey="request-lang">`,
    "",
    blocks.join("\n\n"),
    "",
    `</CodeTabs>`,
    `{/* /snippet */}`,
  ].join("\n");
};

let failed = false;
for (const [guide, steps] of Object.entries(guides)) {
  const file = join(GUIDES_DIR, `${guide}.mdx`);
  if (!existsSync(file)) {
    console.error(`missing guide file: ${file}`);
    failed = true;
    continue;
  }
  let content = readFileSync(file, "utf8");
  for (const [stepId, step] of Object.entries(steps)) {
    const marker = new RegExp(
      `\\{\\/\\* snippet:${guide}:${stepId} \\*\\/\\}[\\s\\S]*?\\{\\/\\* \\/snippet \\*\\/\\}`,
    );
    if (!marker.test(content)) {
      console.error(`missing marker snippet:${guide}:${stepId} in ${file}`);
      failed = true;
      continue;
    }
    content = content.replace(marker, renderTabs(guide, stepId, step));
    console.log(`updated ${guide}:${stepId}`);
  }
  writeFileSync(file, content);
}
process.exit(failed ? 1 : 0);
