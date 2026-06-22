import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defaults } from "../../config/defaults.js";

dotenv.config();

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readBoolean(value, fallback) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function readNumber(value, fallback) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig() {
  const logsDir = process.env.LOGS_DIR || defaults.logsDir;
  const docsDir = process.env.DOCS_DIR || defaults.docsDir;

  return {
    repoRoot,
    loginId: process.env.LOGIN_ID || "",
    loginPass: process.env.LOGIN_PASS || "",
    baseUrl: process.env.BASE_URL || defaults.baseUrl,
    loginPath: process.env.LOGIN_PATH || defaults.loginPath,
    authPath: process.env.AUTH_PATH || defaults.authPath,
    checkPath: process.env.CHECK_PATH || defaults.checkPath,
    groupId: process.env.GROUP_ID || defaults.groupId,
    perPage: process.env.PER_PAGE || defaults.perPage,
    timeZone: process.env.TIME_ZONE || defaults.timeZone,
    windowStart: process.env.WINDOW_START || defaults.windowStart,
    windowEnd: process.env.WINDOW_END || defaults.windowEnd,
    publishStart: process.env.PUBLISH_START || defaults.publishStart,
    publishEnd: process.env.PUBLISH_END || defaults.publishEnd,
    outsideCheckMinute: readNumber(process.env.OUTSIDE_CHECK_MINUTE, defaults.outsideCheckMinute),
    outsideRetryIntervalMinutes: readNumber(process.env.OUTSIDE_RETRY_INTERVAL_MINUTES, defaults.outsideRetryIntervalMinutes),
    outsideRetryAttempts: readNumber(process.env.OUTSIDE_RETRY_ATTEMPTS, defaults.outsideRetryAttempts),
    requestTimeoutMs: readNumber(process.env.REQUEST_TIMEOUT_MS, defaults.requestTimeoutMs),
    historyLimit: readNumber(process.env.HISTORY_LIMIT, defaults.historyLimit),
    publicHistoryLimit: readNumber(process.env.PUBLIC_HISTORY_LIMIT, defaults.publicHistoryLimit),
    logsDir: path.resolve(repoRoot, logsDir),
    historyFile: path.resolve(repoRoot, logsDir, "check-history.jsonl"),
    stateFile: path.resolve(repoRoot, logsDir, "monitor-state.json"),
    docsDir: path.resolve(repoRoot, docsDir),
    statusFile: path.resolve(repoRoot, docsDir, "status.json"),
    gitPush: readBoolean(process.env.GIT_PUSH, defaults.gitPush)
  };
}
