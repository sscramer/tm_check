function parseClock(value) {
  const match = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error(`Invalid time value: ${value}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error(`Invalid time value: ${value}`);
  return hours * 60 + minutes;
}

export function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);

  return Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
}

export function isoInTimeZone(date, timeZone) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+09:00`;
}

export function todayForPayload(date, timeZone) {
  const p = zonedParts(date, timeZone);
  return { year: p.year, month: p.month, day: p.day };
}

export function isWithinWindow(date, timeZone, start, end) {
  const p = zonedParts(date, timeZone);
  const current = Number(p.hour) * 60 + Number(p.minute);
  const startMinutes = parseClock(start);
  const endMinutes = parseClock(end);

  if (startMinutes <= endMinutes) {
    return current >= startMinutes && current <= endMinutes;
  }
  return current >= startMinutes || current <= endMinutes;
}
