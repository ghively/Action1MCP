import { endpoints, interpolatePath } from "../endpoints.js";
import { qs } from "./qs.js";
import { getWithRetry } from "./http.js";

export interface ResolveQuery {
  resource: string;
  orgId?: string | number;
  names?: string[];
  emails?: string[];
  labels?: string[];
}

export interface ResolvedEntity {
  id: string | number;
  name?: string;
  email?: string;
  raw?: any;
}

export async function resolveToIds(q: ResolveQuery): Promise<ResolvedEntity[]> {
  const resDesc = endpoints.resources[q.resource];
  if (!resDesc?.list) {
    throw new Error(`Resource ${q.resource} does not support listing for resolution.`);
  }
  let path = resDesc.list.path;
  const needsOrg = path.includes("{orgId}");
  if (needsOrg && q.orgId == null) {
    throw new Error(`Resource ${q.resource} requires 'orgId' to resolve.`);
  }
  if (needsOrg) {
    path = interpolatePath(path, { orgId: q.orgId! });
  }

  const url = `${path}${qs({})}`;

  const data = await getWithRetry(url);
  const items: any[] = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
  const matches = items.filter((it) => {
    const name = (it.name || it.displayName || it.hostname || it.id || "").toString().toLowerCase();
    const email = (it.email || it.userEmail || "").toString().toLowerCase();
    const label = (it.label || it.title || "").toString().toLowerCase();
    const wantName = (q.names || []).some((n) => name.includes(n.toLowerCase()));
    const wantEmail = (q.emails || []).some((e) => email === e.toLowerCase());
    const wantLabel = (q.labels || []).some((l) => label.includes(l.toLowerCase()));
    return (
      (q.names?.length ? wantName : false) ||
      (q.emails?.length ? wantEmail : false) ||
      (q.labels?.length ? wantLabel : false)
    );
  });

  return matches.map((m) => ({
    id: m.id ?? m.endpointId ?? m.groupId ?? m.uuid,
    name: m.name || m.displayName || m.hostname,
    email: m.email || m.userEmail,
    raw: m
  }));
}

