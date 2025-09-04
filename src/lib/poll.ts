import { endpoints, interpolatePath } from "../endpoints.js";
import { getWithRetry } from "./http.js";

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

export async function pollJob(
  jobParams: Record<string, string | number>,
  opts: PollOptions = {}
): Promise<any> {
  if (!endpoints.jobStatus) {
    throw new Error(
      "Job polling is not configured for this API. TODO: add jobStatus in endpoints.ts if applicable."
    );
  }
  const { intervalMs = 1500, timeoutMs = 300_000 } = opts;
  const started = Date.now();
  const { pathTemplate, labelField, statusField, successValues, failureValues } = endpoints.jobStatus;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const path = interpolatePath(pathTemplate, jobParams);
    const data = await getWithRetry(path);
    const status = data?.[statusField];
    const label = labelField ? data?.[labelField] : undefined;

    if (successValues.includes(status)) {
      return { status, label, data };
    }
    if (failureValues.includes(status)) {
      const err = new Error(`Job failed with status=${status}`);
      (err as any).data = data;
      throw err;
    }
    if (Date.now() - started > timeoutMs) {
      const err = new Error("Polling timeout exceeded");
      (err as any).data = data;
      throw err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

