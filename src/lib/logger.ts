type LogLevel = "debug" | "info" | "warn" | "error";

const REDACT_KEYS = [
  "authorization",
  "api_key",
  "apikey",
  "token",
  "access_token",
  "bearer",
  "secret",
  "client_secret",
  "basic"
];

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => redact(v));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lower = k.toLowerCase();
      if (REDACT_KEYS.some((rk) => lower.includes(rk))) {
        out[k] = "[REDACTED]";
      } else if (typeof v === "object") {
        out[k] = redact(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return value;
}

export function log(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta ? { meta: redact(meta) } : {})
  };
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : "log"](JSON.stringify(entry));
}
