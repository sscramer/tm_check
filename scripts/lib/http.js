export function cookieHeader(cookies) {
  return Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join("; ");
}

export function mergeSetCookies(cookies, response) {
  const setCookie = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  for (const item of setCookie) {
    const firstPart = item.split(";")[0];
    const separator = firstPart.indexOf("=");
    if (separator > 0) {
      cookies[firstPart.slice(0, separator)] = firstPart.slice(separator + 1);
    }
  }
  return cookies;
}

export async function request(url, options = {}, cookies = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(options.headers || {});
  if (Object.keys(cookies).length > 0) {
    headers.set("Cookie", cookieHeader(cookies));
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      redirect: options.redirect || "follow",
      signal: controller.signal
    });
    const body = await response.text();
    mergeSetCookies(cookies, response);
    return {
      code: response.status,
      ok: response.ok,
      url: response.url,
      headers: response.headers,
      body,
      cookies
    };
  } finally {
    clearTimeout(timeout);
  }
}
