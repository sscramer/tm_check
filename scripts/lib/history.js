import fs from "node:fs";
import path from "node:path";

export function appendHistory(file, entry, limit) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`);
  trimHistory(file, limit);
}

export function readHistory(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function trimHistory(file, limit) {
  const history = readHistory(file);
  if (history.length <= limit) return;
  const trimmed = history.slice(-limit).map((entry) => JSON.stringify(entry)).join("\n");
  fs.writeFileSync(file, `${trimmed}\n`);
}
