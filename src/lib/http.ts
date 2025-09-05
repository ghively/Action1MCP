import { endpoints } from "../endpoints.js";
import { log } from "./logger.js";

const RETRY_STATUS = new Set([429, 502, 503, 504]);

function resolveBaseUrl(): string {
  const fromEnv = process.env.API_BASE;
  if (fromEnv && /^https?:\/\//.test(fromEnv)) return fromEnv.replace(/\/+$/, "");
  return endpoints.baseUrl.replace(/\/+$/, "");
}

let CACHED_BEARER: string | undefined;
let CACHED_BEARER_TS: number | undefined;

async function getAccessToken(baseUrl: string): Promise<string | undefined> {
  // 1) Explicit token envs
  const explicit = process.env.BEARER_TOKEN || process.env.API_TOKEN || process.env.ACTION1_TOKEN;
  if (explicit) return explicit.trim();

  // 2) Cached token from prior client_credentials exchange
  if (CACHED_BEARER) return CACHED_BEARER;

  // 3) Exchange client credentials if available
  const clientId = process.env.ACTION1_CLIENT_ID;
  const clientSecret = process.env.ACTION1_CLIENT_SECRET;
  if (!clientId || !clientSecret) return undefined;

  const tokenUrl = `${baseUrl}/oauth2/token`;
  try {
    log("info", "oauth:exchange_start", { url: tokenUrl });
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }).toString()
    });
    const text = await res.text();
    if (!res.ok) {
      log("error", "oauth:exchange_failed", { status: res.status, snippet: text.slice(0, 200) });
      return undefined;
    }
    const data = text ? JSON.parse(text) : {};
    const token = data?.access_token as string | undefined;
    if (token) {
      CACHED_BEARER = token;
      CACHED_BEARER_TS = Date.now();
      log("info", "oauth:exchange_success", { cached: true });
      return token;
    }
    log("error", "oauth:no_access_token", {});
    return undefined;
  } catch (e: any) {
    log("error", "oauth:exchange_error", { message: e?.message || String(e) });
    return undefined;
  }
}

async function applyAuthHeaders(headers: Headers): Promise<void> {
  const scheme = endpoints.auth.scheme;
  if (scheme === "oauth2" || scheme === "bearer") {
    const base = resolveBaseUrl();
    const token = await getAccessToken(base);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  } else if (scheme === "apiKey") {
    if (endpoints.auth.header) {
      const key = process.env.API_KEY;
      if (key) headers.set(endpoints.auth.header, key);
    }
  } else if (scheme === "basic") {
    const user = process.env.BASIC_USER;
    const pass = process.env.BASIC_PASS;
    if (user && pass) {
      const creds = Buffer.from(`${user}:${pass}`).toString("base64");
      headers.set("Authorization", `Basic ${creds}`);
    }
  }
}

export async function hx(path: string, init: RequestInit = {}): Promise<any> {
  const base = resolveBaseUrl();
  const url = `${base}${path}`;
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  await applyAuthHeaders(headers);
  const finalInit: RequestInit = {
    ...init,
    headers
  };
  log("debug", "http:request", { url, method: init.method || "GET" });

  const res = await fetch(url, finalInit);
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  const snippet = text.slice(0, 500);

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText}`);
    (err as any).status = res.status;
    (err as any).snippet = snippet;
    log("warn", "http:error", { status: res.status, url });
    throw err;
  }

  if (ct.includes("application/json")) {
    try {
      return text ? JSON.parse(text) : {};
    } catch (e) {
      const err = new Error("Failed to parse JSON response");
      (err as any).status = res.status;
      (err as any).snippet = snippet;
      throw err;
    }
  }
  return text;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getWithRetry(path: string, maxAttempts = 4): Promise<any> {
  let attempt = 0;
  let lastError: any;
  let delay = 250;
  while (attempt < maxAttempts) {
    try {
      return await hx(path, { method: "GET" });
    } catch (e: any) {
      const status = e?.status;
      if (!RETRY_STATUS.has(status)) throw e;
      lastError = e;
      attempt++;
      const jitter = Math.floor(Math.random() * 100);
      await sleep(delay + jitter);
      delay *= 2;
      log("warn", "http:retry", { attempt, status });
    }
  }
  throw lastError;
}

export async function postAction(
  name: string,
  path: string,
  body: unknown,
  init: RequestInit = {}
): Promise<any> {
  return hx(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    ...init
  });
}
