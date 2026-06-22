import { load } from "cheerio";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./lib/config.js";
import { appendHistory } from "./lib/history.js";
import { request } from "./lib/http.js";
import { isoInTimeZone, isWithinWindow, todayForPayload, zonedHourKey, zonedMinute } from "./lib/time.js";

const config = loadConfig();
const force = process.argv.includes("--force");

function buildUrl(path) {
  return new URL(path, config.baseUrl).toString();
}

function publicError(error) {
  if (error.name === "AbortError") return "request timeout";
  const message = String(error.message || error);
  if (message.includes("missing credentials")) return "missing credentials";
  if (message.includes("token not found")) return "login token not found";
  if (message.includes("auth redirect to login")) return "authentication failed";
  if (message.includes("login page returned")) return "protected page returned login";
  if (message.includes("check page not detected")) return "protected page check failed";
  return "monitor check failed";
}

function readState() {
  if (!fs.existsSync(config.stateFile)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(config.stateFile, "utf8"));
}

function writeState(state) {
  fs.mkdirSync(path.dirname(config.stateFile), { recursive: true });
  fs.writeFileSync(config.stateFile, `${JSON.stringify(state, null, 2)}\n`);
}

function planCheck(now, state) {
  if (force) {
    return { shouldRun: true, checkType: "forced" };
  }

  if (isWithinWindow(now, config.timeZone, config.windowStart, config.windowEnd)) {
    return { shouldRun: true, checkType: "primary-window" };
  }

  const hourKey = zonedHourKey(now, config.timeZone);
  if (zonedMinute(now, config.timeZone) === config.outsideCheckMinute && state.lastOutsideHourlyKey !== hourKey) {
    return { shouldRun: true, checkType: "outside-hourly", hourKey };
  }

  if ((state.outsideRetryRemaining || 0) > 0 && now.getTime() >= (state.nextOutsideRetryAtEpochMs || 0)) {
    return { shouldRun: true, checkType: "outside-retry" };
  }

  return { shouldRun: false };
}

function updateStateAfterCheck(state, plan, result, now) {
  if (plan.hourKey) {
    state.lastOutsideHourlyKey = plan.hourKey;
  }

  if (plan.checkType === "primary-window" || plan.checkType === "forced") {
    state.outsideRetryRemaining = 0;
    delete state.nextOutsideRetryAtEpochMs;
    writeState(state);
    return;
  }

  if (!plan.checkType || !plan.checkType.startsWith("outside-")) {
    writeState(state);
    return;
  }

  if (result.status === "success") {
    state.outsideRetryRemaining = 0;
    delete state.nextOutsideRetryAtEpochMs;
    writeState(state);
    return;
  }

  if (plan.checkType === "outside-hourly") {
    state.outsideRetryRemaining = config.outsideRetryAttempts;
  } else {
    state.outsideRetryRemaining = Math.max((state.outsideRetryRemaining || 1) - 1, 0);
  }

  if (state.outsideRetryRemaining > 0) {
    state.nextOutsideRetryAtEpochMs = now.getTime() + config.outsideRetryIntervalMinutes * 60 * 1000;
  } else {
    delete state.nextOutsideRetryAtEpochMs;
  }

  writeState(state);
}

async function runCheck() {
  const now = new Date();
  const state = readState();
  const plan = planCheck(now, state);
  if (!plan.shouldRun) {
    return null;
  }

  const started = performance.now();
  const checkedAt = isoInTimeZone(now, config.timeZone);
  let result;

  try {
    if (!config.loginId || !config.loginPass) {
      throw new Error("missing credentials");
    }

    const cookies = {};
    const loginRes = await request(buildUrl(config.loginPath), { method: "GET" }, cookies, config.requestTimeoutMs);
    if (loginRes.code >= 400) throw new Error(`login page failed: ${loginRes.code}`);

    const $login = load(loginRes.body);
    const token = $login('input[name="token"]').attr("value");
    if (!token) throw new Error("token not found");

    const authPayload = new URLSearchParams({
      loginId: config.loginId,
      loginPass: config.loginPass,
      token
    });

    const authRes = await request(buildUrl(config.authPath), {
      method: "POST",
      body: authPayload,
      redirect: "manual",
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    }, cookies, config.requestTimeoutMs);

    const location = authRes.headers.get("location") || "";
    if (location.includes(config.loginPath)) {
      throw new Error("auth redirect to login");
    }

    const today = todayForPayload(now, config.timeZone);
    const checkPayload = new URLSearchParams({
      stabsyear: today.year,
      stabsmonth: today.month,
      stabsday: today.day,
      edabsyear: today.year,
      edabsmonth: today.month,
      edabsday: today.day,
      perPage: config.perPage,
      sort: "",
      groupId: config.groupId,
      type: "single"
    });

    const checkRes = await request(buildUrl(config.checkPath), {
      method: "POST",
      body: checkPayload,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    }, cookies, config.requestTimeoutMs);

    if (checkRes.code >= 400) throw new Error(`check page failed: ${checkRes.code}`);
    if (checkRes.body.includes('name="loginId"')) throw new Error("login page returned");
    if (!checkRes.body.includes("欠席遅刻届け一覧")) throw new Error("check page not detected");

    result = {
      checkedAt,
      status: "success",
      latencyMs: Math.round(performance.now() - started),
      message: "ログイン確認成功",
      checkType: plan.checkType
    };
  } catch (error) {
    result = {
      checkedAt,
      status: "fail",
      latencyMs: Math.round(performance.now() - started),
      message: publicError(error),
      checkType: plan.checkType
    };
  }

  updateStateAfterCheck(state, plan, result, now);
  return result;
}

const result = await runCheck();
if (result) {
  appendHistory(config.historyFile, result, config.historyLimit);
  console.log(JSON.stringify(result));
} else {
  console.log("no check scheduled");
}
