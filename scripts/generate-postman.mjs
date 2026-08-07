// Generates Postman collections from the OpenAPI specs into public/collections/
// so they are served at /collections/<name>.postman_collection.json.
// Run with: npm run postman

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const converter = require("openapi-to-postmanv2");

const ROOT = new URL("../", import.meta.url).pathname;
const OUT_DIR = `${ROOT}public/collections/`;

const SPECS = [
  {
    input: `${ROOT}specs/merchant/openapi.yaml`,
    output: `${OUT_DIR}softlemon-merchant-api.postman_collection.json`,
    name: "Softlemon Merchant API",
  },
  {
    input: `${ROOT}specs/partner/openapi.yaml`,
    output: `${OUT_DIR}softlemon-partner-api.postman_collection.json`,
    name: "Softlemon Partner API",
  },
];

const convert = (data) =>
  new Promise((resolve, reject) => {
    converter.convert(
      { type: "string", data },
      { folderStrategy: "Tags", requestParametersResolution: "Example" },
      (err, result) => {
        if (err) return reject(err);
        if (!result.result) return reject(new Error(result.reason));
        resolve(result.output[0].data);
      },
    );
  });

mkdirSync(OUT_DIR, { recursive: true });

for (const spec of SPECS) {
  const collection = await convert(readFileSync(spec.input, "utf8"));
  collection.info.name = spec.name;
  writeFileSync(spec.output, JSON.stringify(collection, null, 2) + "\n");
  const requests = JSON.stringify(collection).match(/"request"/g)?.length ?? 0;
  console.log(`${spec.output.replace(ROOT, "")} (${requests} requests)`);
}
