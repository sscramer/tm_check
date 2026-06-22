import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { loadConfig } from "./lib/config.js";
import { readHistory } from "./lib/history.js";
import { isoInTimeZone, isWithinWindow } from "./lib/time.js";

const config = loadConfig();
const force = process.argv.includes("--force");

function summarize(history) {
  const successCount = history.filter((entry) => entry.status === "success").length;
  const failCount = history.filter((entry) => entry.status === "fail").length;
  return {
    windowStart: config.windowStart,
    windowEnd: config.windowEnd,
    checkIntervalSeconds: 60,
    outsideCheckIntervalMinutes: 60,
    outsideRetryIntervalMinutes: config.outsideRetryIntervalMinutes,
    outsideRetryAttempts: config.outsideRetryAttempts,
    publishIntervalMinutes: 10,
    successCount,
    failCount
  };
}

function readCurrentPublishedStatus() {
  if (!fs.existsSync(config.statusFile)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(config.statusFile, "utf8"));
}

function git(args) {
  return execFileSync("git", args, {
    cwd: config.repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function commitAndPush() {
  git(["add", "docs/status.json"]);
  const diff = git(["diff", "--cached", "--name-only"]);
  if (!diff) return "no changes";

  git(["commit", "-m", "Update public monitoring status"]);
  if (config.gitPush) {
    git(["push"]);
    return "committed and pushed";
  }
  return "committed";
}

const now = new Date();
const history = readHistory(config.historyFile);
const publicHistory = history.slice(-config.publicHistoryLimit).reverse();
const current = history.length > 0 ? history[history.length - 1] : {
  checkedAt: null,
  status: "unknown",
  latencyMs: null,
  message: "監視ログがまだありません"
};
const existing = readCurrentPublishedStatus();
const hasUnpublishedCheck = (existing?.current?.checkedAt || null) !== (current.checkedAt || null);
const inPublishWindow = isWithinWindow(now, config.timeZone, config.publishStart, config.publishEnd);

if (!force && !inPublishWindow && !hasUnpublishedCheck) {
  console.log("outside publish window and no unpublished checks");
  process.exit(0);
}

const payload = {
  generatedAt: isoInTimeZone(now, config.timeZone),
  current,
  summary: summarize(history),
  history: publicHistory
};

fs.mkdirSync(config.docsDir, { recursive: true });
fs.writeFileSync(config.statusFile, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`wrote ${config.statusFile}`);

if (process.argv.includes("--commit") || config.gitPush) {
  console.log(commitAndPush());
}
