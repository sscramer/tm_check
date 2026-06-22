import fs from "node:fs";
import { loadConfig } from "./lib/config.js";

const config = loadConfig();

const required = [
  "package.json",
  "scripts/check.js",
  "scripts/publish.js",
  "docs/index.html",
  "docs/app.js",
  "docs/styles.css"
];

for (const file of required) {
  const fullPath = new URL(`../${file}`, import.meta.url);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing ${file}`);
  }
}

JSON.stringify({
  baseUrl: config.baseUrl,
  timeZone: config.timeZone,
  windowStart: config.windowStart,
  windowEnd: config.windowEnd
});

console.log("validation passed");
