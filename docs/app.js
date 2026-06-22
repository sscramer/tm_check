const statusText = {
  success: "正常",
  fail: "異常",
  unknown: "未確認"
};

function formatDate(value) {
  if (!value) return "-";
  return value.replace("T", " ").replace("+09:00", "");
}

function setStatusClass(status) {
  document.body.classList.remove("is-success", "is-fail", "is-unknown");
  document.body.classList.add(`is-${status || "unknown"}`);
}

function renderHistory(history) {
  const tbody = document.querySelector("#history");
  tbody.innerHTML = "";

  if (!history.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="4">表示できるログがありません</td>';
    tbody.append(row);
    return;
  }

  for (const entry of history) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(entry.checkedAt)}</td>
      <td><span class="badge ${entry.status}">${statusText[entry.status] || entry.status}</span></td>
      <td>${entry.latencyMs === null ? "-" : `${entry.latencyMs}ms`}</td>
      <td>${entry.message || ""}</td>
    `;
    tbody.append(row);
  }
}

async function loadStatus() {
  const response = await fetch(`./status.json?ts=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`status load failed: ${response.status}`);
  return response.json();
}

async function main() {
  try {
    const data = await loadStatus();
    const current = data.current || {};
    const summary = data.summary || {};

    setStatusClass(current.status || "unknown");
    document.querySelector("#current-status").textContent = statusText[current.status] || "未確認";
    document.querySelector("#checked-at").textContent = formatDate(current.checkedAt);
    document.querySelector("#latency").textContent = current.latencyMs === null ? "-" : `${current.latencyMs}ms`;
    document.querySelector("#generated-at").textContent = formatDate(data.generatedAt);
    document.querySelector("#window").textContent = `${summary.windowStart || "-"}-${summary.windowEnd || "-"}`;
    document.querySelector("#message").textContent = current.message || "";
    document.querySelector("#success-count").textContent = summary.successCount || 0;
    document.querySelector("#fail-count").textContent = summary.failCount || 0;
    renderHistory(data.history || []);
  } catch (error) {
    setStatusClass("unknown");
    document.querySelector("#current-status").textContent = "読込失敗";
    document.querySelector("#message").textContent = "公開ログを読み込めませんでした";
  }
}

main();
